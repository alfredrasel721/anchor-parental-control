import React, { useEffect, useState, useCallback } from 'react';
import {
  auth,
  db,
  doc,
  googleProvider,
  handleFirestoreError,
  onAuthStateChanged,
  onSnapshot,
  OperationType,
  setDoc,
  signInWithPopup,
  testFirestoreConnection,
  User,
} from './firebase';
import {
  AnchorHouseholdState,
  GuardianRole,
  transitionLiveSession,
} from './utils/anchorLogic';
import { createInitialHouseholdState } from './data/initialHouseholdState';
import {
  ParentAppViewport,
  ParentScreenId,
  PARENT_SCREENS,
} from './components/ParentAppViewport';
import {
  ChildAppViewport,
  ChildScreenId,
  CHILD_SCREENS,
} from './components/ChildAppViewport';
import { ANDROID_NATIVE_SOURCE_FILES } from './data/androidKotlinProject';

type ApkWorkspaceMode = 'DUAL_SYNC' | 'PARENT_APK_ONLY' | 'CHILD_APK_ONLY';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [firestoreConnected, setFirestoreConnected] = useState<boolean>(true);
  const [syncLog, setSyncLog] = useState<string>('Firebase Firestore Real-Time Channel Ready');

  const [household, setHousehold] = useState<AnchorHouseholdState>(() =>
    createInitialHouseholdState('jenkins-household')
  );

  const [workspaceMode, setWorkspaceMode] = useState<ApkWorkspaceMode>('DUAL_SYNC');
  const [parentScreen, setParentScreen] = useState<ParentScreenId>('P-04');
  const [childScreen, setChildScreen] = useState<ChildScreenId>('C-03');
  const [activeGuardianRole, setActiveGuardianRole] = useState<GuardianRole>('PRIMARY_ADMIN');

  const [showStitchModal, setShowStitchModal] = useState<boolean>(false);
  const [selectedStitchUrl, setSelectedStitchUrl] = useState<string>(PARENT_SCREENS[3].stitchFile);
  const [showKotlinModal, setShowKotlinModal] = useState<boolean>(false);
  const [selectedKotlinIdx, setSelectedKotlinIdx] = useState<number>(0);

  // Verify Firestore connection on mount
  useEffect(() => {
    testFirestoreConnection().then((ok) => setFirestoreConnected(ok));
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Real-time Firestore listener when signed in
  useEffect(() => {
    if (!authReady || !user) return;
    const familyDocId = `family-${user.uid}`;
    const docRef = doc(db, 'families', familyDocId);

    const unsubscribe = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data && typeof data.payloadJson === 'string') {
            try {
              const parsed = JSON.parse(data.payloadJson) as AnchorHouseholdState;
              setHousehold(parsed);
              setSyncLog(`Synced from Firestore (${new Date().toLocaleTimeString()})`);
            } catch (e) {
              console.error('Failed to parse household payloadJson', e);
            }
          }
        } else {
          // Bootstrap initial family document for this authenticated user
          const initial = createInitialHouseholdState(familyDocId);
          setDoc(docRef, {
            id: familyDocId,
            householdName: initial.householdName,
            primaryGuardianUid: user.uid,
            primaryGuardianEmail: user.email || 'guardian@anchorfamily.org',
            memberUids: [user.uid],
            subscriptionTier: initial.subscriptionTier,
            pairingCode: initial.pairingCode,
            pairingExpiresAt: initial.pairingExpiresAt,
            selectedChildId: initial.selectedChildId,
            deviceBatteryLevel: initial.deviceBatteryLevel,
            lastKnownBatterySync: initial.lastKnownBatterySync,
            payloadJson: JSON.stringify(initial),
            updatedAt: new Date().toISOString(),
          }).catch((err) => handleFirestoreError(err, OperationType.CREATE, `families/${familyDocId}`));
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, `families/${familyDocId}`);
      }
    );

    return () => unsubscribe();
  }, [authReady, user]);

  // Persist state changes to Firestore (when authenticated) and local state immediately
  const updateHouseholdState = useCallback(
    (updater: (prev: AnchorHouseholdState) => AnchorHouseholdState, actionNote?: string) => {
      setHousehold((prev) => {
        const next = updater(prev);
        if (actionNote) {
          setSyncLog(`${actionNote} • Synced across Parent & Child APKs`);
        }
        if (user) {
          const familyDocId = `family-${user.uid}`;
          const docRef = doc(db, 'families', familyDocId);
          setDoc(
            docRef,
            {
              id: familyDocId,
              householdName: next.householdName,
              primaryGuardianUid: user.uid,
              primaryGuardianEmail: user.email || 'guardian@anchorfamily.org',
              memberUids: [user.uid],
              subscriptionTier: next.subscriptionTier,
              pairingCode: next.pairingCode,
              pairingExpiresAt: next.pairingExpiresAt,
              selectedChildId: next.selectedChildId,
              deviceBatteryLevel: next.deviceBatteryLevel,
              lastKnownBatterySync: next.lastKnownBatterySync,
              payloadJson: JSON.stringify(next),
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          ).catch((err) => handleFirestoreError(err, OperationType.UPDATE, `families/${familyDocId}`));
        }
        return next;
      });
    },
    [user]
  );

  // Live Session 1-second countdown timer
  useEffect(() => {
    if (household.liveSession.status !== 'ACTIVE_CONSENTED') return;
    const interval = setInterval(() => {
      setHousehold((prev) => ({
        ...prev,
        liveSession: transitionLiveSession(prev.liveSession, { type: 'TICK_SECOND' }).next,
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, [household.liveSession.status]);

  // Auto-open C-13 on Child App when Parent initiates a Live Safety Check
  useEffect(() => {
    if (household.liveSession.status === 'PENDING_CHILD_CONSENT') {
      setChildScreen('C-13');
    }
  }, [household.liveSession.status]);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setSyncLog('Authenticated with Google SSO & linked to Firebase Firestore');
    } catch (err) {
      console.warn('Popup sign-in blocked or cancelled in preview iframe:', err);
      setSyncLog('Using Active Guardian Session (Sarah Jenkins • Primary Admin)');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Master Platform Control Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-[#0F766E] flex items-center justify-center text-white font-extrabold shadow-xs">
            <span className="material-symbols-outlined text-xl">anchor</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                Anchor Parental Control Platform
              </h1>
              <span className="hidden md:inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {firestoreConnected ? 'Firebase Project: gen-lang-client-0963224775' : 'Offline Cache'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-xl">{syncLog}</p>
          </div>
        </div>

        {/* APK Build Mode Switcher & Native Code / Stitch Design Inspectors */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-slate-800 p-1 border border-slate-700">
            {(
              [
                { id: 'DUAL_SYNC', label: 'Dual-APK Live Sync' },
                { id: 'PARENT_APK_ONLY', label: 'Parent APK (20 Screens)' },
                { id: 'CHILD_APK_ONLY', label: 'Child APK (15 Screens)' },
              ] as { id: ApkWorkspaceMode; label: string }[]
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setWorkspaceMode(m.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  workspaceMode === m.id
                    ? 'bg-[#0F766E] text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              const currParent = PARENT_SCREENS.find((s) => s.id === parentScreen);
              if (currParent) setSelectedStitchUrl(currParent.stitchFile);
              setShowStitchModal(true);
            }}
            className="rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-teal-300 inline-flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">design_services</span>
            Stitch Reference (35)
          </button>

          <button
            type="button"
            onClick={() => setShowKotlinModal(true)}
            className="rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-sky-300 inline-flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">android</span>
            Kotlin APKs
          </button>
        </div>
      </header>

      {/* Main Synchronized APK Workspace */}
      <main className="flex-1 p-3 sm:p-5 max-w-[1600px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Parent App APK Container */}
        {(workspaceMode === 'DUAL_SYNC' || workspaceMode === 'PARENT_APK_ONLY') && (
          <section
            aria-label="Anchor Parent Android Application"
            className={`${
              workspaceMode === 'DUAL_SYNC' ? 'lg:col-span-6' : 'lg:col-span-8 lg:col-start-3'
            } flex flex-col rounded-3xl overflow-hidden border-2 border-teal-700/60 bg-white shadow-2xl h-[calc(100vh-88px)] min-h-[620px] max-h-[790px]`}
          >
            <ParentAppViewport
              state={household}
              activeScreen={parentScreen}
              onSelectScreen={setParentScreen}
              onUpdateState={updateHouseholdState}
              onGoogleSignIn={handleGoogleSignIn}
              currentUserEmail={user?.email || null}
              activeGuardianRole={activeGuardianRole}
              onChangeGuardianRole={setActiveGuardianRole}
            />
          </section>
        )}

        {/* Child App APK Container */}
        {(workspaceMode === 'DUAL_SYNC' || workspaceMode === 'CHILD_APK_ONLY') && (
          <section
            aria-label="Anchor Child Android Application"
            className={`${
              workspaceMode === 'DUAL_SYNC' ? 'lg:col-span-6' : 'lg:col-span-8 lg:col-start-3'
            } flex flex-col rounded-3xl overflow-hidden border-2 border-sky-600/60 bg-white shadow-2xl h-[calc(100vh-88px)] min-h-[620px] max-h-[790px]`}
          >
            <ChildAppViewport
              state={household}
              activeScreen={childScreen}
              onSelectScreen={setChildScreen}
              onUpdateState={updateHouseholdState}
            />
          </section>
        )}
      </main>

      {/* Modal 1: Original 35 Stitch HTML Screen Reference Inspector */}
      {showStitchModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-5xl w-full h-[88vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-extrabold text-white">
                  Original Imported Google Stitch Design Inspector (All 35 Screens)
                </h2>
                <p className="text-xs text-slate-400">
                  Select any of the 20 Parent screens or 15 Child screens below to inspect the original Stitch HTML design side-by-side.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowStitchModal(false)}
                className="rounded-xl bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-1.5 text-xs font-bold"
              >
                Close Inspector ✕
              </button>
            </div>

            <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 flex gap-1.5 overflow-x-auto no-scrollbar">
              {PARENT_SCREENS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedStitchUrl(s.stitchFile)}
                  className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                    selectedStitchUrl === s.stitchFile
                      ? 'bg-[#0F766E] text-white'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {s.id} {s.shortTitle}
                </button>
              ))}
              {CHILD_SCREENS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedStitchUrl(s.stitchFile)}
                  className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                    selectedStitchUrl === s.stitchFile
                      ? 'bg-[#0284C7] text-white'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {s.id} {s.shortTitle}
                </button>
              ))}
            </div>

            <div className="flex-1 bg-slate-950 p-3 flex justify-center overflow-hidden">
              <iframe
                title="Stitch Original Screen Preview"
                src={selectedStitchUrl}
                className="w-full max-w-[440px] h-full rounded-2xl border border-slate-700 bg-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Native Android Kotlin + Jetpack Compose Dual-APK Architecture */}
      {showKotlinModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-extrabold text-white">
                  Native Android Kotlin + Jetpack Compose Architecture (Two Independent APKs)
                </h2>
                <p className="text-xs text-slate-400">
                  Separate application IDs: <code className="text-teal-300">com.anchor.parent</code> and{' '}
                  <code className="text-sky-300">com.anchor.child</code> sharing Firebase project{' '}
                  <code className="text-emerald-300">gen-lang-client-0963224775</code>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowKotlinModal(false)}
                className="rounded-xl bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-1.5 text-xs font-bold"
              >
                Close ✕
              </button>
            </div>

            <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 flex gap-2 overflow-x-auto">
              {ANDROID_NATIVE_SOURCE_FILES.map((file, idx) => (
                <button
                  key={file.path}
                  type="button"
                  onClick={() => setSelectedKotlinIdx(idx)}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold ${
                    selectedKotlinIdx === idx
                      ? 'bg-[#0F766E] text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {file.title}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-950">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-mono text-teal-300">
                  {ANDROID_NATIVE_SOURCE_FILES[selectedKotlinIdx].path}
                </span>
                <span>{ANDROID_NATIVE_SOURCE_FILES[selectedKotlinIdx].description}</span>
              </div>
              <pre className="rounded-2xl bg-slate-900 border border-slate-800 p-4 text-xs font-mono text-slate-100 overflow-x-auto leading-relaxed">
                {ANDROID_NATIVE_SOURCE_FILES[selectedKotlinIdx].code}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
