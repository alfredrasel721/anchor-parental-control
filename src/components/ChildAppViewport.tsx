import React, { useEffect, useRef, useState } from 'react';
import {
  AnchorHouseholdState,
  ChildProfile,
  calculateScreenTimeMetrics,
  createConsentHistoryEntry,
  evaluateBatteryTelemetry,
  formatMinutesHuman,
  transitionLiveSession,
  validatePairingCodeInput,
} from '../utils/anchorLogic';

export type ChildScreenId =
  | 'C-01' | 'C-02' | 'C-03' | 'C-04' | 'C-05'
  | 'C-06' | 'C-07' | 'C-08' | 'C-09' | 'C-10'
  | 'C-11' | 'C-12' | 'C-13' | 'C-14' | 'C-15';

export const CHILD_SCREENS: {
  id: ChildScreenId;
  shortTitle: string;
  fullTitle: string;
  isPremium?: boolean;
  stitchFile: string;
}[] = [
  { id: 'C-01', shortTitle: 'Pairing', fullTitle: 'C-01 • Welcome & 6-Digit Pairing', stitchFile: '/assets/aistudio/1_child_code_130ebcea.html' },
  { id: 'C-02', shortTitle: 'Permissions', fullTitle: 'C-02 • Android System Permissions', stitchFile: '/assets/aistudio/2_child_code_94b0bab9.html' },
  { id: 'C-03', shortTitle: 'Today', fullTitle: "C-03 • Today's Screen Time Dashboard", stitchFile: '/assets/aistudio/3_child_code_b5582a83.html' },
  { id: 'C-04', shortTitle: 'Apps', fullTitle: 'C-04 • Allowed Apps & Schedules', stitchFile: '/assets/aistudio/4_child_code_ce0d0472.html' },
  { id: 'C-05', shortTitle: 'Lockout', fullTitle: 'C-05 • Friendly App Lockout Screen', stitchFile: '/assets/aistudio/5_child_code_fe68fbee.html' },
  { id: 'C-06', shortTitle: 'Ask Time', fullTitle: 'C-06 • Request Extra Time', stitchFile: '/assets/aistudio/6_child_code_9656a32b.html' },
  { id: 'C-07', shortTitle: 'Decisions', fullTitle: 'C-07 • Parent Decision Inbox', stitchFile: '/assets/aistudio/7_child_code_807321f2.html' },
  { id: 'C-08', shortTitle: 'SOS & Safe', fullTitle: 'C-08 • Emergency SOS & Check-In', stitchFile: '/assets/aistudio/8_child_code_781f6f4b.html' },
  { id: 'C-09', shortTitle: 'Chat & Chores', fullTitle: 'C-09 • Family Chat & Shared Tasks', stitchFile: '/assets/aistudio/9_child_code_3298e7fb.html' },
  { id: 'C-10', shortTitle: 'Wellbeing', fullTitle: 'C-10 • My Activity & Balance Wellbeing', stitchFile: '/assets/aistudio/10_child_code_f1d84423.html' },
  { id: 'C-11', shortTitle: 'Privacy Pact', fullTitle: 'C-11 • Privacy & Sharing Dashboard', stitchFile: '/assets/aistudio/11_child_code_d3433ec6.html' },
  { id: 'C-12', shortTitle: 'Web Rules', fullTitle: 'C-12 • Filter & Content Disclosures', stitchFile: '/assets/aistudio/12_child_code_c9d9b8f3.html' },
  { id: 'C-13', shortTitle: 'Live Consent', fullTitle: 'C-13 • Incoming Live Consent Prompt', isPremium: true, stitchFile: '/assets/aistudio/13_child_code_558d5bbf.html' },
  { id: 'C-14', shortTitle: 'Live Active', fullTitle: 'C-14 • Active Live Session Child View', isPremium: true, stitchFile: '/assets/aistudio/14_child_code_4dc9bf54.html' },
  { id: 'C-15', shortTitle: 'Offline Sync', fullTitle: 'C-15 • Offline Mode & Safe Reconnection', stitchFile: '/assets/aistudio/15_child_code_da62228e.html' },
];

interface ChildAppViewportProps {
  state: AnchorHouseholdState;
  activeScreen: ChildScreenId;
  onSelectScreen: (screen: ChildScreenId) => void;
  onUpdateState: (updater: (prev: AnchorHouseholdState) => AnchorHouseholdState, actionNote?: string) => void;
}

const MOM_AVATAR_URL =
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=160&q=80';
const DAD_AVATAR_URL =
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80';
const LEO_AVATAR_URL =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80';

const WEEKLY_WELLBEING_INSIGHTS: Record<
  string,
  { day: string; title: string; desc: string; learn: string; play: string; create: string }
> = {
  Mon: {
    day: 'Mon',
    title: 'Monday Summary',
    desc: 'Strong start to the week! You finished math early and built a cool logic gate in Scratch.',
    learn: '50m',
    play: '45m',
    create: '30m',
  },
  Tue: {
    day: 'Tue',
    title: 'Tuesday Summary',
    desc: 'Great focus session before soccer practice. Zero late-night screen usage!',
    learn: '60m',
    play: '40m',
    create: '20m',
  },
  Wed: {
    day: 'Wed',
    title: 'Wednesday Summary',
    desc: 'A bit more gaming on rainy Wednesday, balanced out with 45m of Khan Academy.',
    learn: '45m',
    play: '70m',
    create: '25m',
  },
  Thu: {
    day: 'Thu',
    title: 'Thursday Summary (Today)',
    desc: 'You spent 41% of your screen time learning and building today, plus 3h 10m playing outside!',
    learn: '55m',
    play: '50m',
    create: '30m',
  },
  Fri: {
    day: 'Fri',
    title: 'Friday Plan',
    desc: 'Upcoming Weekend Bonus! Extra 45m unlocked automatically once weekly reading goal is met.',
    learn: 'Goal: 30m',
    play: 'Bonus +45m',
    create: 'Open',
  },
  Sat: {
    day: 'Sat',
    title: 'Saturday Rhythm',
    desc: 'Weekend family movie night & outdoor soccer tournament.',
    learn: 'Optional',
    play: '2h Cap',
    create: 'Unlimited',
  },
  Sun: {
    day: 'Sun',
    title: 'Sunday Family Check-In',
    desc: '6:00 PM Sunday Chat with Mom & Dad — redeem your Trust Tokens!',
    learn: 'Review',
    play: '1h 30m',
    create: 'Unlimited',
  },
};

export const ChildAppViewport: React.FC<ChildAppViewportProps> = ({
  state,
  activeScreen,
  onSelectScreen,
  onUpdateState,
}) => {
  const selectedChild: ChildProfile =
    state.children.find((c) => c.id === state.selectedChildId) || state.children[0];

  const metrics = calculateScreenTimeMetrics(
    selectedChild.usedMinutesToday,
    selectedChild.dailyAllowanceMinutes
  );

  const currentBatteryLevel =
    selectedChild.deviceBatteryLevel ??
    state.deviceBatteryLevel ??
    selectedChild.batteryPercent;
  const currentBatterySync =
    selectedChild.lastKnownBatterySync ??
    state.lastKnownBatterySync ??
    selectedChild.lastSyncLabel;
  const batteryTelemetry = evaluateBatteryTelemetry(
    currentBatteryLevel,
    currentBatterySync,
    selectedChild.isCharging
  );

  const handleChildBatterySync = (deltaPercent = -5) => {
    const nextLevel =
      deltaPercent === 0
        ? currentBatteryLevel
        : currentBatteryLevel <= 15
        ? 85
        : Math.max(10, Math.min(100, currentBatteryLevel + deltaPercent));
    const nextCharging = nextLevel >= 85 ? true : selectedChild.isCharging;
    const syncTimestamp = 'Synced just now';

    onUpdateState(
      (prev) => ({
        ...prev,
        deviceBatteryLevel: nextLevel,
        lastKnownBatterySync: syncTimestamp,
        children: prev.children.map((c) =>
          c.id === selectedChild.id
            ? {
                ...c,
                batteryPercent: nextLevel,
                deviceBatteryLevel: nextLevel,
                lastKnownBatterySync: syncTimestamp,
                lastSyncLabel: syncTimestamp,
                isCharging: nextCharging,
              }
            : c
        ),
      }),
      `Child APK reported battery ${nextLevel}% (${syncTimestamp})`
    );
    notifyChild(
      `Battery telemetry (${nextLevel}% • ${syncTimestamp}) synced to Parent APK header!`
    );
  };

  // Toast notifications
  const [childToast, setChildToast] = useState<string | null>(null);
  const notifyChild = (msg: string) => {
    setChildToast(msg);
    setTimeout(() => setChildToast((prev) => (prev === msg ? null : prev)), 4000);
  };

  // C-01 Pairing 6-box state
  const initialDigits = (state.pairingCode || '842915').replace(/\D/g, '').padEnd(6, '0').slice(0, 6).split('');
  const [pairDigits, setPairDigits] = useState<string[]>(initialDigits);
  const [qrScannerSimulated, setQrScannerSimulated] = useState(false);
  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const clean = (state.pairingCode || '842915').replace(/\D/g, '');
    if (clean.length === 6) {
      setPairDigits(clean.split(''));
    }
  }, [state.pairingCode]);

  // C-02 Review with Mom & Dad Modal
  const [showPermParentModal, setShowPermParentModal] = useState(false);

  // C-04 Request New App Modal
  const [showAppReqModal, setShowAppReqModal] = useState(false);
  const [newAppReqName, setNewAppReqName] = useState('Scratch Jr • Coding');
  const [newAppReqNote, setNewAppReqNote] = useState(
    'Needed for 6th grade robotics club project with Mr. Davis.'
  );

  // C-05 Friendly Lockout Request Modal
  const [showLockoutReqModal, setShowLockoutReqModal] = useState(false);
  const [lockoutDuration, setLockoutDuration] = useState<number>(15);
  const [lockoutReason, setLockoutReason] = useState('Finishing a level / save point');
  const [lockoutNote, setLockoutNote] = useState('');

  // C-06 Request Extra Time state
  const [reqScope, setReqScope] = useState<'app' | 'device'>('app');
  const [reqTargetApp, setReqTargetApp] = useState('Minecraft');
  const [reqDurationMins, setReqDurationMins] = useState<number>(15);
  const [reqReason, setReqReason] = useState('Finishing a realm build');
  const [reqNote, setReqNote] = useState(
    'Just need 15 more mins to finish saving our coop castle build with Sam!'
  );

  // C-07 Parent Decision Inbox state
  const [sundayAgendaAdded, setSundayAgendaAdded] = useState(false);

  // C-08 Emergency SOS & Hold 3s state
  const [sosHoldProgress, setSosHoldProgress] = useState(0); // 0 to 100
  const [isHoldingSos, setIsHoldingSos] = useState(false);
  const [showSosCountdownModal, setShowSosCountdownModal] = useState(false);
  const [sosCountdownSec, setSosCountdownSec] = useState(5);
  const [sosDispatchedBanner, setSosDispatchedBanner] = useState(false);
  const [checkInDoneBanner, setCheckInDoneBanner] = useState<string | null>(null);

  useEffect(() => {
    if (!isHoldingSos) {
      setSosHoldProgress(0);
      return;
    }
    const start = Date.now();
    const duration = 1600; // responsive 1.6s hold in interactive preview
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setSosHoldProgress(pct);
      if (pct >= 100) {
        clearInterval(timer);
        setIsHoldingSos(false);
        setSosCountdownSec(5);
        setShowSosCountdownModal(true);
      }
    }, 30);
    return () => clearInterval(timer);
  }, [isHoldingSos]);

  useEffect(() => {
    if (!showSosCountdownModal) return;
    if (sosCountdownSec <= 0) {
      dispatchEmergencySos(false);
      setShowSosCountdownModal(false);
      setSosDispatchedBanner(true);
      return;
    }
    const t = setTimeout(() => setSosCountdownSec((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [showSosCountdownModal, sosCountdownSec]);

  // C-09 Family Chat & Tasks tab filter + composer
  const [chatTabFilter, setChatTabFilter] = useState<'ALL' | 'TASKS' | 'AGENDA'>('ALL');
  const [chatInput, setChatInput] = useState('');

  // C-10 Wellbeing state
  const [selectedWellbeingDay, setSelectedWellbeingDay] = useState<string>('Thu');
  const [habitChecks, setHabitChecks] = useState<{ dinner: boolean; eyes: boolean; reading: boolean }>({
    dinner: true,
    eyes: true,
    reading: false,
  });

  // C-11 Privacy Matrix tab & explainer drawer
  const [privacyMatrixTab, setPrivacyMatrixTab] = useState<'SHARED' | 'PRIVATE'>('SHARED');
  const [openPermExplainer, setOpenPermExplainer] = useState<string | null>(null);
  const [showSundayTopicModal, setShowSundayTopicModal] = useState(false);
  const [sundayTopicInput, setSundayTopicInput] = useState(
    'Can we extend bedtime to 9:00 PM on Friday nights?'
  );

  // C-12 Filter Disclosures & Appeal state
  const [showDadPactNote, setShowDadPactNote] = useState(false);
  const [websiteAppealDomain, setWebsiteAppealDomain] = useState('');
  const [websiteAppealReason, setWebsiteAppealReason] = useState('school');

  // C-14 Active Live Session timer formatting
  const liveSecs = state.liveSession.remainingSeconds || 522;
  const liveMinsFormatted = `${String(Math.floor(liveSecs / 60)).padStart(2, '0')}:${String(
    liveSecs % 60
  ).padStart(2, '0')}`;
  const [audioOnlyRequested, setAudioOnlyRequested] = useState(false);

  // C-15 Offline Mode Reconnection state
  const [isCheckingWifi, setIsCheckingWifi] = useState(false);
  const [showOfflineSosModal, setShowOfflineSosModal] = useState(false);

  // Shared helper actions
  const submitExtraTimeRequest = (appName: string, mins: number, reasonLabel: string, noteText: string) => {
    onUpdateState(
      (prev) => ({
        ...prev,
        requests: [
          {
            id: `req-${Date.now()}`,
            childId: selectedChild.id,
            childName: selectedChild.name,
            type: 'EXTRA_TIME',
            targetName: appName,
            targetCategory: appName === 'Entire Device' ? 'Whole Device' : 'Games & Entertainment',
            requestedMinutes: mins,
            reasonCategory: reasonLabel,
            childNote: noteText,
            createdAtLabel: 'Just now',
            status: 'PENDING',
            decidedBy: null,
            parentNote: null,
          },
          ...prev.requests,
        ],
      }),
      `${selectedChild.name} requested +${mins}m for ${appName}`
    );
    notifyChild(`Sent +${mins}m request for ${appName} to Sarah & Mark!`);
  };

  const dispatchEmergencySos = (isDrill: boolean) => {
    onUpdateState(
      (prev) => ({
        ...prev,
        alerts: [
          {
            id: `sos-${Date.now()}`,
            childId: selectedChild.id,
            category: 'EMERGENCY_SOS',
            title: isDrill
              ? `${selectedChild.name} triggered an SOS Test Drill`
              : `URGENT: ${selectedChild.name} triggered Emergency SOS`,
            description: `High-accuracy GPS beacon (±${selectedChild.gpsAccuracyMeters}m) + 78% battery telemetry dispatched to Tier-1 & Tier-2 Guardians.`,
            timestampLabel: 'Just now',
            locationLabel: selectedChild.currentLocationName,
            acknowledgedBy: null,
            isDrill,
          },
          ...prev.alerts,
        ],
      }),
      `${selectedChild.name} triggered ${isDrill ? 'SOS Drill' : 'Emergency SOS'}`
    );
    notifyChild(
      isDrill
        ? 'Practice SOS drill sent to Parent App!'
        : 'EMERGENCY SOS broadcast active! Sarah & Mark notified.'
    );
  };

  const sendSafeCheckIn = (label: string) => {
    onUpdateState(
      (prev) => ({
        ...prev,
        alerts: [
          {
            id: `chk-${Date.now()}`,
            childId: selectedChild.id,
            category: 'CHECK_IN',
            title: `${selectedChild.name}: "${label}"`,
            description: `Verified GPS check-in at ${selectedChild.currentLocationName} (±${selectedChild.gpsAccuracyMeters}m).`,
            timestampLabel: 'Just now',
            locationLabel: selectedChild.currentLocationName,
            acknowledgedBy: null,
            isDrill: false,
          },
          ...prev.alerts,
        ],
      }),
      `${selectedChild.name} checked in: ${label}`
    );
    setCheckInDoneBanner(`Check-in sent to Mom & Dad ("${label}") with GPS location!`);
    notifyChild(`Check-in "${label}" sent to Sarah & Mark!`);
  };

  const handleDigitChange = (idx: number, val: string) => {
    const clean = val.replace(/\D/g, '').slice(-1);
    const next = [...pairDigits];
    next[idx] = clean;
    setPairDigits(next);
    if (clean && idx < 5) {
      digitRefs.current[idx + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pairDigits[idx] && idx > 0) {
      const next = [...pairDigits];
      next[idx - 1] = '';
      setPairDigits(next);
      digitRefs.current[idx - 1]?.focus();
    }
  };

  const isStackHeaderScreen = ['C-01', 'C-02', 'C-05', 'C-13', 'C-14'].includes(activeScreen);

  const grantedPermCount = Object.values(selectedChild.permissionsGranted).filter(Boolean).length;

  return (
    <div className="bg-surface text-on-surface font-body flex flex-col h-full select-none relative overflow-hidden">
      {/* Top App Bar matching Stitch Child App */}
      <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur-xl border-b border-outline-variant/15 px-4 h-16 flex items-center justify-between shrink-0">
        {isStackHeaderScreen ? (
          <>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => onSelectScreen('C-03')}
                aria-label="Back to Today Dashboard"
                className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center text-on-surface hover:bg-surface-bright transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {activeScreen === 'C-05' || activeScreen === 'C-13' ? 'close' : 'arrow_back'}
                </span>
              </button>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-secondary-container/20 border border-secondary-container/40 flex items-center justify-center text-secondary">
                  <span
                    className="material-symbols-outlined text-base"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    anchor
                  </span>
                </div>
                <span className="font-headline font-bold text-sm tracking-tight text-on-surface">
                  {activeScreen === 'C-01'
                    ? 'Anchor Setup'
                    : activeScreen === 'C-02'
                    ? 'Device Safety Setup'
                    : activeScreen === 'C-05'
                    ? 'Rest Time Lockout'
                    : activeScreen === 'C-13'
                    ? 'Transparency Consent'
                    : 'Live Check Active'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-container-high border border-outline-variant/20 text-[11px] font-mono text-secondary">
                <span className="w-1.5 h-1.5 rounded-full bg-status-enforced animate-pulse" />
                Kid Safe Sync
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-status-enforced/15 border border-status-enforced/30 flex items-center justify-center text-status-enforced shadow-inner">
                <span
                  className="material-symbols-outlined text-[22px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  anchor
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-headline font-bold text-base tracking-tight text-on-surface leading-none">
                    {selectedChild.name}, {selectedChild.age}
                  </h1>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      activeScreen === 'C-15' || !selectedChild.online
                        ? 'bg-status-pending'
                        : 'bg-status-enforced animate-pulse'
                    }`}
                  />
                </div>
                <p className="text-xs text-on-surface-variant font-medium mt-0.5 flex items-center gap-1">
                  <span>{selectedChild.deviceModel.replace('Samsung ', '')}</span>
                  <span>•</span>
                  <span className="text-status-enforced flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[13px]">verified_user</span>
                    Protected
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {/* Child Battery Telemetry Sync Button */}
              <button
                type="button"
                aria-label={`Child Battery ${batteryTelemetry.shortLabel} (${batteryTelemetry.lastKnownBatterySync})`}
                onClick={() => handleChildBatterySync(-8)}
                title={`Tap to broadcast battery telemetry update to Parent View (${batteryTelemetry.lastKnownBatterySync})`}
                className="flex items-center gap-1 bg-surface-container-high px-2 py-1.5 rounded-lg border border-outline-variant/15 hover:bg-surface-bright transition-colors cursor-pointer"
              >
                <span
                  className={`material-symbols-outlined text-[15px] ${
                    batteryTelemetry.status === 'CRITICAL'
                      ? 'text-error'
                      : batteryTelemetry.status === 'LOW'
                      ? 'text-status-pending'
                      : 'text-status-enforced'
                  }`}
                >
                  {batteryTelemetry.iconName}
                </span>
                <span className="font-mono text-[11px] font-bold text-on-surface">
                  {batteryTelemetry.shortLabel}
                </span>
                <span className="hidden sm:inline font-mono text-[10px] text-on-surface-variant">
                  • {batteryTelemetry.lastKnownBatterySync}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleChildBatterySync(0)}
                className="flex items-center gap-1 bg-surface-container-high px-2 py-1.5 rounded-lg border border-outline-variant/15 hover:bg-surface-bright transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-status-enforced text-[15px]">
                  {activeScreen === 'C-15' ? 'cloud_off' : 'sync'}
                </span>
                <span className="font-mono text-[11px] text-on-surface-variant">
                  {activeScreen === 'C-15' ? 'Offline' : 'Sync'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onSelectScreen('C-11')}
                aria-label="Privacy & Sharing Settings"
                className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[19px]">shield_lock</span>
              </button>
            </div>
          </>
        )}
      </header>

      {/* Quick 15-Screen Stitch Switcher Ribbon */}
      <div className="bg-surface-container-low/90 border-b border-outline-variant/15 px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
        {CHILD_SCREENS.map((scr) => {
          const active = scr.id === activeScreen;
          return (
            <button
              key={scr.id}
              type="button"
              onClick={() => onSelectScreen(scr.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
                active
                  ? 'bg-status-enforced text-on-secondary font-bold shadow-sm'
                  : 'bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
              }`}
            >
              <span className="font-mono text-[10px] opacity-80">{scr.id}</span>
              <span>{scr.shortTitle}</span>
            </button>
          );
        })}
      </div>

      {/* Toast Feedback Banner */}
      {childToast && (
        <div className="mx-4 mt-2.5 px-3.5 py-2.5 rounded-xl bg-status-enforced/20 border border-status-enforced/40 text-xs text-secondary flex items-center justify-between gap-2 shadow-lg shrink-0 z-20">
          <div className="flex items-center gap-2">
            <span
              className="material-symbols-outlined text-base text-status-enforced"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
            <span className="font-medium text-on-surface">{childToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setChildToast(null)}
            className="text-[11px] text-secondary underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Scrollable Screen Container */}
      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-6 space-y-5">
        {/* =====================================================================
            C-01: WELCOME & 6-DIGIT PAIRING (1 child code.html)
           ===================================================================== */}
        {activeScreen === 'C-01' && (
          <div className="space-y-5">
            {/* Hero Wave Illustration & Greeting */}
            <section className="relative rounded-2xl bg-surface-container p-5 border border-outline-variant/15 overflow-hidden">
              <div className="absolute -top-12 -right-12 w-36 h-36 bg-secondary-container/15 rounded-full blur-2xl pointer-events-none" />
              <div className="relative z-10 flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-secondary-container/15 text-secondary text-xs font-semibold tracking-wide uppercase">
                    <span className="material-symbols-outlined text-[14px]">waving_hand</span>
                    Hello, {selectedChild.name}
                  </div>
                  <h2 className="font-headline font-bold text-2xl text-on-surface tracking-tight leading-tight">
                    Welcome to Anchor 👋
                  </h2>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    Your family&apos;s shared space for healthy screen habits, clear boundaries, and staying safe on the go.
                  </p>
                </div>
                <div className="shrink-0 flex flex-col items-center gap-1.5">
                  <div className="w-16 h-16 rounded-2xl bg-surface-container-high border border-outline-variant/20 flex items-center justify-center relative shadow-lg">
                    <span
                      className="material-symbols-outlined text-4xl text-secondary"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      tsunami
                    </span>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shadow">
                      <span
                        className="material-symbols-outlined text-[14px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        verified_user
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-on-surface-variant bg-surface-container-lowest px-2 py-0.5 rounded border border-outline-variant/15">
                    Galaxy A34
                  </span>
                </div>
              </div>

              {/* Anchor Transparency Pledge */}
              <div className="mt-4 pt-3.5 border-t border-outline-variant/15 flex items-start gap-2.5">
                <span className="material-symbols-outlined text-secondary text-lg shrink-0 mt-0.5">
                  shield_with_heart
                </span>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  <strong className="text-on-surface font-medium">Anchor Transparency Pledge:</strong> There is no secret spying here. You will always see the exact same rules, timers, and safety alerts that Mom &amp; Dad see.
                </p>
              </div>
            </section>

            {/* Step 1 of 2 • 6-Digit Pairing Code Input Card */}
            <section className="rounded-2xl bg-surface-container-low p-5 border border-outline-variant/15 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-primary font-semibold">
                    Step 1 of 2 • Device Link
                  </span>
                  <h3 className="font-headline font-bold text-lg text-on-surface mt-0.5">
                    Enter 6-Digit Family Code
                  </h3>
                </div>
                <div className="flex items-center gap-1 text-xs font-mono text-tertiary bg-tertiary-container/15 px-2.5 py-1 rounded-md border border-tertiary/20">
                  <span className="material-symbols-outlined text-[14px]">timer</span>
                  <span>14:52</span>
                </div>
              </div>

              <p className="text-xs text-on-surface-variant leading-relaxed">
                Ask Sarah or Mark to open the <span className="text-on-surface font-medium">Anchor Parent App</span> and tap <span className="text-primary font-medium">&quot;Pair Kid&apos;s Device&quot;</span> to get your 6-digit code.
              </p>

              {/* 6-Digit OTP Input Grid */}
              <div className="py-1">
                <div className="grid grid-cols-6 gap-2">
                  {pairDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        digitRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      aria-label={`Pairing digit ${idx + 1}`}
                      value={digit}
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                      className={`w-full h-13 text-center font-mono text-xl font-bold rounded-xl bg-surface-container-highest text-on-surface border-2 outline-none transition-all ${
                        digit
                          ? 'border-secondary/60 text-secondary shadow-inner'
                          : 'border-outline-variant/30 focus:border-primary'
                      }`}
                    />
                  ))}
                </div>

                {/* Quick Fill Helper Bar */}
                <div className="mt-3 flex items-center justify-between px-1">
                  <button
                    type="button"
                    onClick={() => {
                      const code = (state.pairingCode || '842915').replace(/\D/g, '').slice(0, 6);
                      setPairDigits(code.split(''));
                      notifyChild(`Pasted family pairing code ${code.slice(0, 3)}-${code.slice(3)}!`);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">content_paste_go</span>
                    <span>
                      Paste code from clipboard:{' '}
                      <strong className="font-mono">{state.pairingCode || '842915'}</strong>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPairDigits(['', '', '', '', '', ''])}
                    className="text-xs text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Divider with OR */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-outline-variant/20" />
                <span className="flex-shrink mx-3 text-[11px] font-mono uppercase text-on-surface-variant">
                  or pair with camera
                </span>
                <div className="flex-grow border-t border-outline-variant/20" />
              </div>

              {/* Scan QR Button */}
              <button
                type="button"
                onClick={() => {
                  setQrScannerSimulated(true);
                  const code = (state.pairingCode || '842915').replace(/\D/g, '').slice(0, 6);
                  setPairDigits(code.split(''));
                  notifyChild('Scanned Parent QR Code! Matched The Jenkins Family.');
                }}
                className="w-full py-3 px-4 rounded-xl bg-surface-container-high hover:bg-surface-bright border border-outline-variant/25 flex items-center justify-center gap-2.5 text-sm font-semibold text-on-surface transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-primary text-xl">qr_code_scanner</span>
                <span>
                  {qrScannerSimulated ? 'QR Code Scanned (The Jenkins Family)' : "Scan Parent's QR Code Instead"}
                </span>
              </button>
            </section>

            {/* Target Family Preview Card */}
            <section className="rounded-xl bg-surface-container p-4 border border-secondary-container/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary-container/20 border border-secondary-container/40 flex items-center justify-center text-secondary shrink-0">
                  <span
                    className="material-symbols-outlined text-xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    family_restroom
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-on-surface">
                      Target Household: {state.householdName}
                    </span>
                    <span
                      className="material-symbols-outlined text-secondary text-[15px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      verified
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant">
                    Guardians: Sarah Jenkins &amp; Mark Jenkins • Ready to link
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded bg-secondary-container/20 text-secondary font-mono text-[10px] font-semibold">
                READY
              </span>
            </section>

            {/* What Happens Next Preview List */}
            <section className="space-y-2.5">
              <h3 className="text-xs font-mono uppercase tracking-wider text-on-surface-variant px-1">
                What happens next (Takes 1 minute)
              </h3>
              <div className="space-y-2">
                <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/10 flex items-center gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-primary-container/25 text-primary flex items-center justify-center font-mono text-xs font-bold shrink-0">
                    01
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-on-surface">Link with Mom &amp; Dad</h4>
                    <p className="text-[11px] text-on-surface-variant truncate">
                      Connects your Galaxy A34 to the Jenkins Family group.
                    </p>
                  </div>
                  <span
                    className="material-symbols-outlined text-secondary text-lg"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/10 flex items-center gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-surface-container-high text-on-surface-variant flex items-center justify-center font-mono text-xs font-bold shrink-0">
                    02
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-on-surface">Review Shared Safety Permissions</h4>
                    <p className="text-[11px] text-on-surface-variant truncate">
                      See how app timers, safe zones, and SOS work clearly.
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant/50 text-lg">
                    arrow_forward
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/10 flex items-center gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-surface-container-high text-on-surface-variant flex items-center justify-center font-mono text-xs font-bold shrink-0">
                    03
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-on-surface">View Your Daily Screen Schedule</h4>
                    <p className="text-[11px] text-on-surface-variant truncate">
                      Check your free time, bonus tasks, and ask for extra time anytime.
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant/50 text-lg">
                    schedule
                  </span>
                </div>
              </div>
            </section>

            {/* Primary Connect CTA */}
            <button
              type="button"
              onClick={() => {
                const entered = pairDigits.join('');
                const res = validatePairingCodeInput(
                  entered,
                  state.pairingCode,
                  state.pairingExpiresAt,
                  Date.now()
                );
                if (res.valid || entered.length === 6) {
                  notifyChild('Device paired with The Jenkins Family! Proceeding to Step 2...');
                  onSelectScreen('C-02');
                } else {
                  notifyChild(res.error || 'Please enter all 6 digits.');
                }
              }}
              className="w-full py-3.5 px-5 rounded-xl bg-secondary-container text-on-secondary-container font-headline font-bold text-sm tracking-wide shadow-lg flex items-center justify-center gap-2 hover:brightness-110 transition-all cursor-pointer"
            >
              <span>Connect to Family</span>
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </button>
          </div>
        )}

        {/* =====================================================================
            C-02: ANDROID SYSTEM PERMISSIONS (2 child code.html)
           ===================================================================== */}
        {activeScreen === 'C-02' && (
          <div className="space-y-5">
            {/* Step Progress & Connected Family Card */}
            <section className="space-y-3">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/15">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-container/30 border border-primary/40 flex items-center justify-center text-primary font-headline font-bold text-sm">
                    JF
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono uppercase tracking-wider text-status-enforced font-semibold">
                        Connected to Jenkins Family
                      </span>
                      <span
                        className="material-symbols-outlined text-status-enforced text-sm"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        verified
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      Sarah &amp; Mark (Parents) • {selectedChild.name}&apos;s {selectedChild.deviceModel.replace('Samsung ', '')}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono text-primary bg-primary-container/20 px-2.5 py-1 rounded-md border border-primary/20">
                  Step 2 of 2
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary-container/15 border border-secondary-container/30 text-secondary text-xs font-medium">
                  <span className="material-symbols-outlined text-sm">handshake</span>
                  <span>Android System Permissions</span>
                </div>
                <h2 className="font-headline font-bold text-2xl text-on-surface tracking-tight">
                  Setting Up Your Safe Device
                </h2>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Hey {selectedChild.name}! To keep your daily game timers fair and help Mom &amp; Dad know you&apos;re safe when walking home, Anchor needs <strong className="text-on-surface font-semibold">4 Android permissions</strong>. Here is our promise on what each one does—and what stays strictly private to you.
                </p>
              </div>
            </section>

            {/* Transparent & Collaborative Guardian Pledge */}
            <section className="p-4 rounded-xl bg-gradient-to-br from-surface-container to-surface-container-high border border-outline-variant/20 relative overflow-hidden">
              <div className="flex items-start gap-3.5 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-secondary-container/20 border border-secondary/30 flex items-center justify-center shrink-0 text-secondary">
                  <span
                    className="material-symbols-outlined text-xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    visibility
                  </span>
                </div>
                <div className="space-y-1">
                  <h3 className="font-headline font-semibold text-sm text-on-surface">
                    Zero Secret Monitoring Guarantee
                  </h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Anchor never hides in the background. Whenever a timer, location check, or live help session is active, your phone will always show a clear notification banner so you are never surprised.
                  </p>
                </div>
              </div>
            </section>

            {/* 4 Permission Cards */}
            <section className="space-y-3.5">
              {[
                {
                  key: 'usageStats' as const,
                  num: 1,
                  title: 'App Usage & Timers',
                  apiName: 'PACKAGE_USAGE_STATS',
                  icon: 'bar_chart_4_bars',
                  does: 'Counts daily screen time for games & apps so you can track your 2h 30m daily goal and earn bonus time.',
                  neverDoes: 'NEVER reads inside your apps, private notes, photos, or typed messages.',
                  btnLabel: 'Enable App Limits',
                },
                {
                  key: 'locationAlways' as const,
                  num: 2,
                  title: 'Location & Safe Zones',
                  apiName: 'ACCESS_FINE_LOCATION',
                  icon: 'location_on',
                  does: 'Shares your map location for School & Home Safe Zones and powers your 1-tap Emergency SOS button.',
                  neverDoes: 'NEVER shares your location with strangers, advertisers, or anyone outside Sarah & Mark.',
                  btnLabel: 'Enable Safe Zones',
                },
                {
                  key: 'knoxDeviceAdmin' as const,
                  num: 3,
                  title: 'Knox Shield Administration',
                  apiName: 'BIND_DEVICE_ADMIN • KNOX',
                  icon: 'admin_panel_settings',
                  does: 'Keeps your agreed bedtime schedule and app rules active so Anchor cannot be accidentally deleted.',
                  neverDoes: 'NEVER erases your photos, game saves, or personal files on your Galaxy A34.',
                  btnLabel: 'Enable Knox Shield',
                },
                {
                  key: 'liveTransparencyOverlay' as const,
                  num: 4,
                  title: 'Live Transparency Banner',
                  apiName: 'SYSTEM_ALERT_WINDOW',
                  icon: 'layers',
                  does: 'Displays a friendly 5-minute heads-up before bedtime and guarantees a visible badge if a parent requests a live check-in.',
                  neverDoes: 'NEVER turns on your screen share, camera, or microphone without a big glowing alert banner.',
                  btnLabel: 'Enable Transparency Banner',
                },
              ].map((perm) => {
                const granted = selectedChild.permissionsGranted[perm.key];
                return (
                  <article
                    key={perm.key}
                    className={`p-4 rounded-xl bg-surface-container border transition-all ${
                      granted ? 'border-status-enforced/30' : 'border-outline-variant/25'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            granted
                              ? 'bg-status-enforced/15 border border-status-enforced/30 text-status-enforced'
                              : 'bg-primary-container/25 border border-primary/30 text-primary'
                          }`}
                        >
                          <span
                            className="material-symbols-outlined text-xl"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            {perm.icon}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-headline font-semibold text-sm text-on-surface">
                              {perm.num}. {perm.title}
                            </h4>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-semibold ${
                                granted
                                  ? 'bg-status-enforced/15 text-status-enforced border border-status-enforced/30'
                                  : 'bg-status-pending/15 text-status-pending border border-status-pending/30'
                              }`}
                            >
                              {granted ? 'Granted' : 'Action Needed'}
                            </span>
                          </div>
                          <p className="text-[11px] font-mono text-on-surface-variant mt-0.5">
                            Android API: {perm.apiName}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateState(
                            (prev) => ({
                              ...prev,
                              children: prev.children.map((c) =>
                                c.id === selectedChild.id
                                  ? {
                                      ...c,
                                      permissionsGranted: {
                                        ...c.permissionsGranted,
                                        [perm.key]: !granted,
                                      },
                                    }
                                  : c
                              ),
                            }),
                            `${selectedChild.name} ${!granted ? 'granted' : 'revoked'} ${perm.title}`
                          );
                          notifyChild(
                            `${perm.title} ${!granted ? 'Granted' : 'Set to Pending'}!`
                          );
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer transition-all ${
                          granted
                            ? 'bg-surface-container-high border border-outline-variant/20 text-on-surface hover:bg-surface-bright'
                            : 'bg-primary text-on-primary shadow-md hover:brightness-110'
                        }`}
                      >
                        <span
                          className="material-symbols-outlined text-sm"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          {granted ? 'check_circle' : 'bolt'}
                        </span>
                        <span>{granted ? 'Active' : perm.btnLabel}</span>
                      </button>
                    </div>

                    {/* What it does vs What it NEVER does */}
                    <div className="mt-3.5 pt-3 border-t border-outline-variant/15 grid grid-cols-1 gap-2 text-xs">
                      <div className="flex items-start gap-2 text-on-surface-variant">
                        <span className="material-symbols-outlined text-status-enforced text-sm shrink-0 mt-0.5">
                          check
                        </span>
                        <span>
                          <strong className="text-on-surface font-medium">What it does:</strong>{' '}
                          {perm.does}
                        </span>
                      </div>
                      <div className="flex items-start gap-2 text-on-surface-variant">
                        <span className="material-symbols-outlined text-status-failed text-sm shrink-0 mt-0.5">
                          block
                        </span>
                        <span>
                          <strong className="text-on-surface font-medium">What it NEVER does:</strong>{' '}
                          {perm.neverDoes}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>

            {/* Bottom Progress & Actions */}
            <section className="rounded-2xl bg-surface-container-low p-4 border border-outline-variant/20 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-on-surface">
                    {grantedPermCount} of 4 permissions granted
                  </span>
                </div>
                <span className="font-mono text-secondary font-bold">
                  {Math.round((grantedPermCount / 4) * 100)}%
                </span>
              </div>
              <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-status-enforced rounded-full transition-all duration-500"
                  style={{ width: `${(grantedPermCount / 4) * 100}%` }}
                />
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPermParentModal(true)}
                  className="px-3.5 py-3 rounded-xl bg-surface-container-high hover:bg-surface-bright text-on-surface text-xs font-medium border border-outline-variant/20 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base text-tertiary">
                    supervisor_account
                  </span>
                  <span>Review with Mom &amp; Dad</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (grantedPermCount < 4) {
                      onUpdateState(
                        (prev) => ({
                          ...prev,
                          children: prev.children.map((c) =>
                            c.id === selectedChild.id
                              ? {
                                  ...c,
                                  permissionsGranted: {
                                    usageStats: true,
                                    locationAlways: true,
                                    knoxDeviceAdmin: true,
                                    liveTransparencyOverlay: true,
                                  },
                                }
                              : c
                          ),
                        }),
                        `Granted all 4 Android permissions on ${selectedChild.name}'s device`
                      );
                      notifyChild('All 4 permissions verified! Opening Today Dashboard...');
                    }
                    onSelectScreen('C-03');
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-status-enforced text-on-secondary font-headline font-bold text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                >
                  <span>
                    {grantedPermCount === 4
                      ? 'Finish Setup & View My Dashboard'
                      : 'Grant All & Continue to Dashboard'}
                  </span>
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </button>
              </div>
            </section>

            {/* Review with Mom & Dad Modal */}
            {showPermParentModal && (
              <div className="fixed inset-0 z-50 bg-surface-container-lowest/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="w-full max-w-md rounded-2xl bg-surface-container-high border border-outline-variant/30 p-5 shadow-2xl space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-tertiary-container/20 border border-tertiary/30 flex items-center justify-center text-tertiary">
                        <span className="material-symbols-outlined text-xl">family_restroom</span>
                      </div>
                      <div>
                        <h3 className="font-headline font-bold text-base text-on-surface">
                          Review Together with Sarah &amp; Mark
                        </h3>
                        <p className="text-xs text-on-surface-variant">
                          Shared Family Agreement • Jenkins Household
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPermParentModal(false)}
                      className="text-on-surface-variant hover:text-on-surface cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/15 space-y-2 text-xs text-on-surface-variant">
                    <p className="text-on-surface font-medium">
                      👋 Hi Sarah or Mark! Tap below to approve all 4 safety permissions together with {selectedChild.name}:
                    </p>
                    <ul className="space-y-1.5 pl-1">
                      <li className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-status-enforced text-sm">
                          check_circle
                        </span>
                        <span>2h 30m Daily Play Allowance + Unmetered School Apps</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-status-enforced text-sm">
                          check_circle
                        </span>
                        <span>School &amp; Home Safe Zone Arrival Alerts + SOS Button</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-status-enforced text-sm">
                          check_circle
                        </span>
                        <span>Mutual Transparency Pact (Zero covert monitoring)</span>
                      </li>
                    </ul>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setShowPermParentModal(false)}
                      className="flex-1 py-2.5 rounded-xl bg-surface-container text-on-surface-variant text-xs font-semibold border border-outline-variant/20 cursor-pointer"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateState(
                          (prev) => ({
                            ...prev,
                            children: prev.children.map((c) =>
                              c.id === selectedChild.id
                                ? {
                                    ...c,
                                    permissionsGranted: {
                                      usageStats: true,
                                      locationAlways: true,
                                      knoxDeviceAdmin: true,
                                      liveTransparencyOverlay: true,
                                    },
                                  }
                                : c
                            ),
                          }),
                          `Parent verified all 4 permissions with ${selectedChild.name}`
                        );
                        setShowPermParentModal(false);
                        notifyChild("Verified with Mom's Approval! All 4 permissions active.");
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-status-enforced text-on-secondary text-xs font-bold cursor-pointer"
                    >
                      Verify with Mom&apos;s Approval
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            C-03: TODAY'S SCREEN TIME DASHBOARD (3 child code.html)
           ===================================================================== */}
        {activeScreen === 'C-03' && (
          <div className="space-y-5">
            {/* Friendly Hero Greeting Card */}
            <section className="relative overflow-hidden rounded-2xl bg-surface-container-low p-5 border border-status-enforced/25 shadow-sm">
              <div className="relative z-10 flex items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-status-enforced/15 border border-status-enforced/30 text-status-enforced text-xs font-semibold">
                    <span
                      className="material-symbols-outlined text-[14px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      sunny
                    </span>
                    <span>Great Rhythm Today!</span>
                  </div>
                  <h2 className="font-headline font-bold text-xl text-on-surface tracking-tight">
                    Hey {selectedChild.name}! 👋 You&apos;ve got{' '}
                    <span className="text-status-enforced">
                      {formatMinutesHuman(metrics.remainingMinutes)}
                    </span>{' '}
                    of playtime left today.
                  </h2>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Your educational apps like <strong className="text-on-surface">Khan Academy</strong> and{' '}
                    <strong className="text-on-surface">Duolingo</strong> are always free and don&apos;t use up your timer!
                  </p>
                </div>
              </div>

              {/* Next Schedule Transition Inner Pill */}
              <div className="mt-4 p-2.5 rounded-xl bg-surface border border-outline-variant/20 flex items-center justify-between text-xs shadow-xs">
                <div className="flex items-center gap-2 text-on-surface">
                  <span className="material-symbols-outlined text-primary text-[18px]">
                    bedtime
                  </span>
                  <span>
                    Wind-Down starts at <strong className="font-mono text-primary">8:30 PM</strong>
                  </span>
                </div>
                <span className="font-mono text-[11px] text-on-surface-variant bg-surface-container px-2 py-0.5 rounded">
                  In 3h 45m
                </span>
              </div>
            </section>

            {/* Daily Screen Balance Card with 3-Ring SVG Gauge */}
            <section className="rounded-2xl bg-surface-container p-5 border border-outline-variant/15 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-headline font-bold text-base text-on-surface">
                    Daily Screen Balance
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    Allowance: {formatMinutesHuman(selectedChild.dailyAllowanceMinutes)} Total • Resets at 6:00 AM
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-md bg-status-enforced/15 border border-status-enforced/30 text-status-enforced font-mono text-xs font-semibold">
                  {100 - metrics.usagePercent}% Left
                </span>
              </div>

              {/* Circular SVG Progress Ring + Metrics */}
              <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
                <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                    <circle
                      cx="80"
                      cy="80"
                      r="66"
                      fill="none"
                      stroke="rgba(67, 70, 85, 0.35)"
                      strokeWidth="14"
                    />
                    {/* Games & Fun Segment (Indigo/Primary) */}
                    <circle
                      cx="80"
                      cy="80"
                      r="66"
                      fill="none"
                      stroke="#b8c4ff"
                      strokeWidth="14"
                      strokeDasharray="414.69"
                      strokeDashoffset="220"
                      strokeLinecap="round"
                    />
                    {/* Remaining Emerald Arc */}
                    <circle
                      cx="80"
                      cy="80"
                      r="66"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="14"
                      strokeDasharray="150 414.69"
                      strokeDashoffset="-205"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">
                      Time Used
                    </span>
                    <span className="font-mono font-bold text-2xl text-on-surface tracking-tight mt-0.5">
                      {formatMinutesHuman(selectedChild.usedMinutesToday)}
                    </span>
                    <span className="text-[11px] font-mono text-status-enforced font-semibold mt-0.5">
                      {formatMinutesHuman(metrics.remainingMinutes)} left
                    </span>
                  </div>
                </div>

                {/* Category Breakdown Bars */}
                <div className="flex-1 w-full space-y-3.5">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-medium text-on-surface">
                        <span className="w-2.5 h-2.5 rounded-sm bg-primary" />
                        Games &amp; Fun (Minecraft, Roblox)
                      </span>
                      <span className="font-mono text-on-surface font-semibold">1h 10m</span>
                    </div>
                    <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: '58%' }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-medium text-on-surface">
                        <span className="w-2.5 h-2.5 rounded-sm bg-status-enforced" />
                        Learning &amp; School (Khan, Duolingo)
                      </span>
                      <span className="font-mono text-status-enforced font-semibold">
                        45m • Bonus Unmetered
                      </span>
                    </div>
                    <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
                      <div className="h-full bg-status-enforced rounded-full" style={{ width: '38%' }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-medium text-on-surface">
                        <span className="w-2.5 h-2.5 rounded-sm bg-tertiary" />
                        Family &amp; Creative
                      </span>
                      <span className="font-mono text-on-surface font-semibold">20m</span>
                    </div>
                    <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
                      <div className="h-full bg-tertiary rounded-full" style={{ width: '20%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Quick Actions Section */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-mono uppercase tracking-wider text-on-surface-variant font-semibold">
                  Quick Actions
                </h3>
                <span className="text-[11px] text-on-surface-variant">Instant family sync</span>
              </div>

              {/* Full-Width Emerald CTA: Ask for Extra Time */}
              <button
                type="button"
                onClick={() => onSelectScreen('C-06')}
                className="w-full p-4 rounded-2xl bg-status-enforced text-on-secondary font-headline font-bold flex items-center justify-between shadow-lg hover:brightness-105 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-black/15 flex items-center justify-center">
                    <span
                      className="material-symbols-outlined text-2xl"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      more_time
                    </span>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold">Ask Mom or Dad for Extra Time</div>
                    <div className="text-xs opacity-85 font-normal">
                      Request +15m or +30m for Minecraft, Roblox, or homework
                    </div>
                  </div>
                </div>
                <span className="material-symbols-outlined text-xl">chevron_right</span>
              </button>

              {/* 2-Column Check In & Emergency SOS */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => sendSafeCheckIn("I'm Safe at School / Home")}
                  className="p-3.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 flex items-center gap-3 text-left transition-all cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary-container/25 border border-primary/30 text-primary flex items-center justify-center shrink-0">
                    <span
                      className="material-symbols-outlined text-xl"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      where_to_vote
                    </span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-on-surface">Check In Safe</div>
                    <div className="text-[11px] text-on-surface-variant">Send GPS ping</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectScreen('C-08')}
                  className="p-3.5 rounded-xl bg-error-container/20 hover:bg-error-container/30 border border-status-failed/30 flex items-center gap-3 text-left transition-all cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-status-failed/20 text-status-failed flex items-center justify-center shrink-0">
                    <span
                      className="material-symbols-outlined text-xl"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      sos
                    </span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-error">Emergency SOS</div>
                    <div className="text-[11px] text-on-surface-variant">Alert parents</div>
                  </div>
                </button>
              </div>
            </section>

            {/* Your Active House Rules (Transparency Card) */}
            <section className="rounded-2xl bg-surface-container p-4 border border-outline-variant/15 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-lg">
                    fact_check
                  </span>
                  <h3 className="font-headline font-bold text-sm text-on-surface">
                    Your Active House Rules
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectScreen('C-04')}
                  className="text-xs text-primary hover:underline font-medium cursor-pointer"
                >
                  See All Apps →
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/10 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-tertiary text-lg">bedtime</span>
                    <div>
                      <div className="text-xs font-semibold text-on-surface">Bedtime Rest</div>
                      <div className="text-[11px] text-on-surface-variant">8:30 PM – 7:00 AM</div>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant">
                    Sun–Thu
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/10 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-primary text-lg">school</span>
                    <div>
                      <div className="text-xs font-semibold text-on-surface">School Focus Mode</div>
                      <div className="text-[11px] text-on-surface-variant">8:00 AM – 3:15 PM</div>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-status-enforced/15 text-status-enforced">
                    Done Today
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/10 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-status-enforced text-lg">
                      location_on
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-on-surface">Safe Zones Active</div>
                      <div className="text-[11px] text-on-surface-variant">Home &amp; Oakridge Middle</div>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-status-enforced/15 text-status-enforced">
                    Inside
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/10 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-secondary text-lg">
                      auto_awesome
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-on-surface">Learning Apps</div>
                      <div className="text-[11px] text-on-surface-variant">Khan, Duolingo, Scratch</div>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-secondary-container/20 text-secondary">
                    Always Free
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSelectScreen('C-11')}
                className="w-full pt-2 border-t border-outline-variant/15 flex items-center justify-between text-xs text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-secondary text-sm">
                    shield_lock
                  </span>
                  <span>Why transparency matters: See exactly what Mom &amp; Dad see</span>
                </span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </section>

            {/* Focus Tip for Leo */}
            <section className="rounded-xl bg-surface-container-low p-3.5 border border-outline-variant/15 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-tertiary-container/20 text-tertiary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-lg">emoji_events</span>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-on-surface">
                    Focus Tip for {selectedChild.name}: Earn +15m Bonus Time!
                  </h4>
                  <p className="text-[11px] text-on-surface-variant">
                    Complete &quot;Walk Daisy (15 mins)&quot; in Family Chores to unlock +15m gaming time.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onSelectScreen('C-09')}
                className="px-2.5 py-1.5 rounded-lg bg-surface-container-high text-xs font-semibold text-tertiary shrink-0 cursor-pointer"
              >
                Open Chores
              </button>
            </section>
          </div>
        )}

        {/* =====================================================================
            C-04: ALLOWED APPS & SCHEDULES (4 child code.html)
           ===================================================================== */}
        {activeScreen === 'C-04' && (
          <div className="space-y-5">
            {/* Active Schedule Window Hero Banner */}
            <section className="relative overflow-hidden rounded-2xl bg-surface-container-low p-5 border border-status-enforced/30 shadow-sm">
              <div className="relative z-10 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-status-enforced/15 border border-status-enforced/30 text-status-enforced text-[11px] font-mono uppercase font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-status-enforced animate-pulse" />
                    Active Window • Until 8:30 PM
                  </div>
                  <h2 className="font-headline font-bold text-xl text-on-surface tracking-tight pt-1">
                    Free Play &amp; Homework Window
                  </h2>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    All approved games, creative tools, and family chat are unlocked right now.
                  </p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-status-enforced/15 border border-status-enforced/30 flex items-center justify-center text-status-enforced shrink-0">
                  <span
                    className="material-symbols-outlined text-2xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    sports_esports
                  </span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2.5 pt-3 border-t border-outline-variant/20">
                <div className="bg-surface rounded-xl p-2.5 border border-outline-variant/20">
                  <span className="text-[10px] font-mono uppercase text-on-surface-variant block">
                    Entertainment Timer
                  </span>
                  <span className="font-mono font-bold text-sm text-on-surface">
                    {formatMinutesHuman(metrics.remainingMinutes)} left today
                  </span>
                </div>
                <div className="bg-surface rounded-xl p-2.5 border border-outline-variant/20">
                  <span className="text-[10px] font-mono uppercase text-on-surface-variant block">
                    Learning Apps
                  </span>
                  <span className="font-mono font-bold text-sm text-status-enforced">
                    Unmetered 🌟
                  </span>
                </div>
              </div>
            </section>

            {/* Today's Schedule Rhythm 4-Segment Timeline */}
            <section className="rounded-2xl bg-surface-container p-4 border border-outline-variant/15 space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="font-headline font-bold text-sm text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-lg">schedule</span>
                  <span>Today&apos;s Schedule Rhythm</span>
                </h3>
                <span className="font-mono text-[11px] text-on-surface-variant">Thursday</span>
              </div>

              {/* 4-Segment Bar */}
              <div className="space-y-1.5">
                <div className="grid grid-cols-12 gap-1 h-3 rounded-full overflow-hidden bg-surface-container-highest p-0.5">
                  <div className="col-span-2 bg-primary/60 rounded-l-full" title="Morning Prep" />
                  <div className="col-span-4 bg-tertiary/70" title="School Focus" />
                  <div
                    className="col-span-4 bg-status-enforced relative"
                    title="Free Play & Homework (Now)"
                  />
                  <div className="col-span-2 bg-indigo-900 rounded-r-full" title="Bedtime Rest" />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-on-surface-variant px-0.5">
                  <span>7 AM</span>
                  <span>8 AM (School)</span>
                  <span className="text-status-enforced font-bold">3:30 PM (Now)</span>
                  <span>8:30 PM (Bed)</span>
                </div>
              </div>

              {/* 4 Schedule Stage Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/10 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-on-surface">1. Morning Prep</div>
                    <div className="text-[11px] text-on-surface-variant">7:00 AM – 8:00 AM</div>
                  </div>
                  <span className="text-[10px] font-mono text-on-surface-variant">Completed</span>
                </div>
                <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/10 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-on-surface">2. School Hours</div>
                    <div className="text-[11px] text-on-surface-variant">8:00 AM – 3:15 PM</div>
                  </div>
                  <span className="text-[10px] font-mono text-on-surface-variant">Completed</span>
                </div>
                <div className="p-2.5 rounded-xl bg-status-enforced/10 border border-status-enforced/30 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-on-surface">3. Free Play &amp; Homework</div>
                    <div className="text-[11px] text-secondary">3:15 PM – 8:30 PM</div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-status-enforced text-on-secondary text-[10px] font-mono font-bold">
                    CURRENT
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/10 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-on-surface">4. Bedtime Wind-Down</div>
                    <div className="text-[11px] text-on-surface-variant">8:30 PM – 7:00 AM</div>
                  </div>
                  <span className="text-[10px] font-mono text-tertiary">Starts 8:30 PM</span>
                </div>
              </div>
            </section>

            {/* App Allowances for Leo across Categories */}
            <section className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-headline font-bold text-sm text-on-surface">
                  App Allowances for {selectedChild.name}
                </h3>
                <span className="text-[11px] font-mono text-on-surface-variant">
                  Synced with Sarah
                </span>
              </div>

              {/* Category 1: Games & Entertainment */}
              <div className="rounded-2xl bg-surface-container p-4 border border-outline-variant/15 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-primary font-semibold">
                    🎮 Games &amp; Entertainment (Daily Cap)
                  </span>
                  <button
                    type="button"
                    onClick={() => onSelectScreen('C-05')}
                    className="text-[11px] text-tertiary hover:underline font-mono cursor-pointer"
                  >
                    Preview Lockout Screen →
                  </button>
                </div>

                {state.apps
                  .filter((a) => a.childId === selectedChild.id && a.category === 'Games & Entertainment')
                  .map((app) => {
                    const cap = app.dailyLimitMinutes || 60;
                    const rem = Math.max(0, cap - app.usedMinutesToday);
                    const pct = Math.min(100, Math.round((app.usedMinutesToday / cap) * 100));
                    return (
                      <div
                        key={app.id}
                        className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/15 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-primary-container/30 text-primary flex items-center justify-center font-bold text-xs">
                              {app.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-on-surface">{app.name}</div>
                              <div className="text-[11px] font-mono text-on-surface-variant">
                                Used {app.usedMinutesToday}m of {cap}m limit
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded font-mono text-[10px] font-semibold ${
                                app.blocked || rem === 0
                                  ? 'bg-status-failed/15 text-status-failed'
                                  : 'bg-status-enforced/15 text-status-enforced'
                              }`}
                            >
                              {app.blocked ? 'Paused' : `${rem}m left`}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setReqTargetApp(app.name);
                                onSelectScreen('C-06');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-surface-bright text-[11px] font-semibold text-primary cursor-pointer"
                            >
                              +Time
                            </button>
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              pct >= 90 ? 'bg-status-pending' : 'bg-primary'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Category 2: Learning & School 🌟 Bonus */}
              <div className="rounded-2xl bg-surface-container p-4 border border-status-enforced/25 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-status-enforced font-semibold">
                    🌟 Learning &amp; School (Always Unmetered)
                  </span>
                  <span className="text-[11px] font-mono text-secondary">0 timer drain</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { name: 'Khan Academy', used: '30m today', badge: 'Unlimited' },
                    { name: 'Duolingo: French', used: '15m today', badge: 'Unlimited' },
                    { name: 'Google Classroom', used: '25m today', badge: 'Unlimited' },
                    { name: 'Wikipedia Reader', used: '10m today', badge: 'Unlimited' },
                  ].map((item) => (
                    <div
                      key={item.name}
                      className="p-3 rounded-xl bg-surface-container-low border border-status-enforced/20 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-semibold text-on-surface">{item.name}</div>
                        <div className="text-[11px] text-on-surface-variant">{item.used}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-status-enforced/15 text-status-enforced font-mono text-[10px] font-bold">
                        {item.badge}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category 3: Everyday Utilities (4-Col Grid) */}
              <div className="rounded-2xl bg-surface-container p-4 border border-outline-variant/15 space-y-2.5">
                <span className="text-xs font-mono uppercase tracking-wider text-on-surface-variant font-semibold block">
                  🛠️ Everyday Utilities &amp; Family Calls (Always Allowed)
                </span>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { icon: 'call', label: 'Phone' },
                    { icon: 'Calculate', label: 'Calculator' },
                    { icon: 'photo_camera', label: 'Camera' },
                    { icon: 'alarm', label: 'Clock' },
                  ].map((u) => (
                    <div
                      key={u.label}
                      className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/10 flex flex-col items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-secondary text-lg">
                        {u.icon.toLowerCase()}
                      </span>
                      <span className="text-[11px] text-on-surface font-medium">{u.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Need an App for a School Project? CTA */}
            <section className="rounded-2xl bg-surface-container-low p-4 border border-primary/25 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-on-surface">
                  Need a new app for school or a club project?
                </h4>
                <p className="text-[11px] text-on-surface-variant">
                  Ask Sarah or Mark to review and unlock a new app on your Galaxy A34.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAppReqModal(true)}
                className="px-3.5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shrink-0 cursor-pointer"
              >
                Ask Sarah for an App
              </button>
            </section>

            {/* Request App Permission Modal */}
            {showAppReqModal && (
              <div className="fixed inset-0 z-50 bg-surface-container-lowest/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="w-full max-w-md rounded-2xl bg-surface-container-high border border-outline-variant/30 p-5 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-headline font-bold text-base text-on-surface">
                      Request App Permission from Sarah
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowAppReqModal(false)}
                      className="text-on-surface-variant hover:text-on-surface cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-on-surface-variant block mb-1">
                        App Name
                      </label>
                      <input
                        type="text"
                        value={newAppReqName}
                        onChange={(e) => setNewAppReqName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/30 text-xs text-on-surface outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-on-surface-variant block mb-1">
                        Why do you need it?
                      </label>
                      <textarea
                        rows={2}
                        value={newAppReqNote}
                        onChange={(e) => setNewAppReqNote(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/30 text-xs text-on-surface outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setShowAppReqModal(false)}
                      className="flex-1 py-2.5 rounded-xl bg-surface-container text-xs font-semibold text-on-surface-variant cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateState(
                          (prev) => ({
                            ...prev,
                            requests: [
                              {
                                id: `req-app-${Date.now()}`,
                                childId: selectedChild.id,
                                childName: selectedChild.name,
                                type: 'NEW_APP_INSTALL',
                                targetName: newAppReqName,
                                targetCategory: 'Learning & School',
                                requestedMinutes: 0,
                                reasonCategory: 'School project app',
                                childNote: newAppReqNote,
                                createdAtLabel: 'Just now',
                                status: 'PENDING',
                                decidedBy: null,
                                parentNote: null,
                              },
                              ...prev.requests,
                            ],
                          }),
                          `${selectedChild.name} requested app install: ${newAppReqName}`
                        );
                        setShowAppReqModal(false);
                        notifyChild(`Sent app request for "${newAppReqName}" to Sarah!`);
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-status-enforced text-on-secondary text-xs font-bold cursor-pointer"
                    >
                      Send Request 🚀
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            C-05: FRIENDLY APP LOCKOUT SCREEN (5 child code.html)
           ===================================================================== */}
        {activeScreen === 'C-05' && (
          <div className="space-y-5">
            {/* Friendly Lockout Hero Card with Minecraft Grass Block Icon */}
            <section className="relative overflow-hidden rounded-2xl bg-surface-container p-6 border border-outline-variant/15 text-center shadow-xl">
              <div
                className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full pointer-events-none"
                style={{
                  background:
                    'radial-gradient(circle, rgba(245, 158, 11, 0.14) 0%, rgba(16, 185, 129, 0.05) 50%, rgba(11, 19, 38, 0) 70%)',
                }}
              />

              {/* Minecraft Grass-Block Styled App Icon + Moon Badge */}
              <div className="relative mx-auto w-20 h-20 mb-4">
                <div className="w-20 h-20 rounded-2xl bg-[#2e6f40] border-2 border-[#4ade80]/30 shadow-lg flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="w-full h-5 bg-[#4a9632] absolute top-0 inset-x-0 border-b-2 border-[#1e4620]" />
                  <span
                    className="material-symbols-outlined text-white text-4xl mt-2"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    view_in_ar
                  </span>
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-xl bg-surface-container-highest border border-tertiary/40 flex items-center justify-center text-tertiary shadow-md">
                  <span
                    className="material-symbols-outlined text-lg"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    bedtime
                  </span>
                </div>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-tertiary-container/15 border border-tertiary/30 text-tertiary text-xs font-semibold mb-2.5">
                <span
                  className="material-symbols-outlined text-sm"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  nights_stay
                </span>
                <span>Resting until morning</span>
              </div>

              <h2 className="font-headline font-bold text-2xl text-on-surface tracking-tight mb-2">
                Minecraft is Paused for Today
              </h2>
              <p className="text-sm text-on-surface-variant max-w-md mx-auto leading-relaxed">
                Great session today, {selectedChild.name}! You&apos;ve completed your{' '}
                <span className="text-on-surface font-medium">1h 30m daily gaming goal</span> and your evening wind-down schedule is now active.
              </p>

              {/* Daily Gaming Budget Bar */}
              <div className="mt-5 pt-4 border-t border-outline-variant/15 flex flex-col gap-2 text-left">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-on-surface-variant font-medium">
                    Today&apos;s Gaming Budget
                  </span>
                  <span className="font-mono text-tertiary font-semibold">
                    1h 30m / 1h 30m used
                  </span>
                </div>
                <div className="w-full h-2.5 bg-surface-container-lowest rounded-full overflow-hidden p-0.5 border border-outline-variant/15">
                  <div className="h-full w-full rounded-full bg-gradient-to-r from-status-enforced via-primary to-tertiary" />
                </div>
              </div>
            </section>

            {/* Transparent Rule Explanation + Next Unlock Countdown */}
            <section className="grid grid-cols-1 gap-3">
              <div className="rounded-xl bg-surface-container-low p-4 border border-outline-variant/15 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-primary-container/20 border border-primary/25 flex items-center justify-center text-primary shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-xl">verified_user</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="font-headline font-semibold text-sm text-on-surface">
                      Daily Gaming &amp; Entertainment Cap
                    </h3>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant">
                      House Rule
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed mb-2.5">
                    Set together with <span className="text-on-surface font-medium">Mom (Sarah)</span> so there&apos;s plenty of time for sleep, soccer, and school focus.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container text-on-surface-variant">
                      <span className="material-symbols-outlined text-xs text-secondary">
                        check_circle
                      </span>
                      Agreed With: Sarah &amp; Mark
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-mono">
                      <span className="material-symbols-outlined text-xs text-primary">
                        schedule
                      </span>
                      Window: 3:30 PM – 8:00 PM
                    </span>
                  </div>
                </div>
              </div>

              {/* Next Unlock Time Banner */}
              <div className="rounded-xl bg-surface-container-low p-4 border border-outline-variant/15 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-secondary-container/15 border border-secondary/30 flex items-center justify-center text-secondary shrink-0">
                    <span className="material-symbols-outlined text-xl">wb_twilight</span>
                  </div>
                  <div>
                    <div className="text-xs text-on-surface-variant font-medium">
                      Unlocks Tomorrow
                    </div>
                    <div className="font-headline font-bold text-base text-on-surface">
                      6:00 AM Sharp
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-on-surface-variant">Time Remaining</div>
                  <div className="font-mono font-semibold text-sm text-secondary">
                    9h 45m remaining
                  </div>
                </div>
              </div>
            </section>

            {/* Ready to Use Right Now (Positive Framing List) */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-headline font-semibold text-xs uppercase tracking-wider text-on-surface-variant">
                  Ready to Use Right Now (Unmetered)
                </h3>
                <span className="text-xs text-secondary font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary" />4 Apps Always Open
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {[
                  {
                    icon: 'school',
                    title: 'Khan Academy',
                    sub: 'Learning & Math',
                    color: 'text-secondary bg-secondary-container/15 border-secondary/25',
                  },
                  {
                    icon: 'call',
                    title: 'Calls to Mom & Dad',
                    sub: 'Family Phone & SMS',
                    color: 'text-primary bg-primary-container/20 border-primary/25',
                  },
                  {
                    icon: 'headphones',
                    title: 'Spotify & Stories',
                    sub: 'Sleep Casts & Music',
                    color: 'text-tertiary bg-tertiary-container/15 border-tertiary/25',
                  },
                  {
                    icon: 'brush',
                    title: 'Camera & Sketch',
                    sub: 'Offline Creativity',
                    color: 'text-secondary bg-secondary-container/15 border-secondary/25',
                  },
                ].map((item) => (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => notifyChild(`Launching ${item.title} (Always Unlocked)...`)}
                    className="p-3 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/15 flex items-center gap-2.5 text-left transition-all cursor-pointer"
                  >
                    <div
                      className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${item.color}`}
                    >
                      <span className="material-symbols-outlined text-lg">{item.icon}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-on-surface truncate">
                        {item.title}
                      </div>
                      <div className="text-[10px] text-on-surface-variant truncate">
                        {item.sub}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Primary CTA: Ask for 15 or 30 Extra Minutes */}
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowLockoutReqModal(true)}
                className="w-full py-3.5 px-5 rounded-xl bg-status-enforced text-on-secondary font-headline font-bold text-sm shadow-lg flex items-center justify-center gap-2 hover:brightness-105 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">add_alarm</span>
                <span>Ask for 15 or 30 Extra Minutes</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectScreen('C-03')}
                className="w-full py-2.5 rounded-xl bg-surface-container-low text-on-surface-variant hover:text-on-surface text-xs font-semibold cursor-pointer"
              >
                Okay, I&apos;m Done for Today (Back to Home)
              </button>
            </div>

            {/* Lockout Extra Time Bottom Sheet Modal */}
            {showLockoutReqModal && (
              <div className="fixed inset-0 z-50 bg-surface-container-lowest/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
                <div className="w-full max-w-md rounded-2xl bg-surface-container-high border border-outline-variant/30 p-5 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-headline font-bold text-base text-on-surface">
                      Ask Sarah for Extra Minecraft Time
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowLockoutReqModal(false)}
                      className="text-on-surface-variant hover:text-on-surface cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {[15, 30].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setLockoutDuration(m)}
                        className={`py-2.5 px-3 rounded-xl font-mono text-xs font-bold border cursor-pointer ${
                          lockoutDuration === m
                            ? 'bg-status-enforced/20 border-status-enforced text-secondary'
                            : 'bg-surface-container border-outline-variant/20 text-on-surface-variant'
                        }`}
                      >
                        +{m} Minutes
                      </button>
                    ))}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-on-surface-variant font-medium block">
                      Reason for Mom &amp; Dad
                    </label>
                    <select
                      value={lockoutReason}
                      onChange={(e) => setLockoutReason(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/30 text-xs text-on-surface outline-none"
                    >
                      <option value="Finishing a level / save point">
                        Finishing a level / save point
                      </option>
                      <option value="Homework is finished">Homework is finished</option>
                      <option value="Playing coop with school friends">
                        Playing coop with school friends
                      </option>
                    </select>
                  </div>

                  <input
                    type="text"
                    placeholder="Optional note for Mom..."
                    value={lockoutNote}
                    onChange={(e) => setLockoutNote(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/30 text-xs text-on-surface outline-none"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      submitExtraTimeRequest(
                        'Minecraft',
                        lockoutDuration,
                        lockoutReason,
                        lockoutNote || `${lockoutReason} (+${lockoutDuration}m)`
                      );
                      setShowLockoutReqModal(false);
                      onSelectScreen('C-07');
                    }}
                    className="w-full py-3 rounded-xl bg-status-enforced text-on-secondary font-headline font-bold text-xs cursor-pointer"
                  >
                    Send +{lockoutDuration}m Request to Sarah 🚀
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            C-06: REQUEST EXTRA TIME (6 child code.html)
           ===================================================================== */}
        {activeScreen === 'C-06' && (
          <div className="space-y-5">
            {/* Hero Context Banner */}
            <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface-container-high via-surface-container to-surface-container-low p-5 border border-outline-variant/15">
              <div className="relative z-10 flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-container/15 border border-secondary-container/30 text-secondary text-xs font-medium">
                    <span
                      className="material-symbols-outlined text-[14px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      schedule_send
                    </span>
                    <span>Quick Parent Approval</span>
                  </div>
                  <h2 className="font-headline font-bold text-xl text-on-surface tracking-tight">
                    Need more time, {selectedChild.name}?
                  </h2>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Pick how much time you need and let Mom or Dad know why. They&apos;ll get an instant notification on their phone.
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-primary-container/20 border border-primary/25 flex items-center justify-center shrink-0 text-primary">
                  <span
                    className="material-symbols-outlined text-2xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    hourglass_top
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-outline-variant/15 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[16px] text-tertiary">
                    timelapse
                  </span>
                  <span>Today&apos;s Screen Time Remaining</span>
                </div>
                <span className="font-mono font-semibold text-on-surface bg-surface-container-highest px-2.5 py-1 rounded-md">
                  {formatMinutesHuman(metrics.remainingMinutes)} left (until 7:30 PM)
                </span>
              </div>
            </section>

            {/* Step 1: What do you need access for? */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="font-headline font-semibold text-xs uppercase tracking-wider text-on-surface-variant">
                  1. What do you need access for?
                </h3>
                <span className="text-xs font-mono text-secondary">Step 1 of 3</span>
              </div>

              <div className="grid grid-cols-2 gap-2 p-1 bg-surface-container-lowest rounded-xl border border-outline-variant/15">
                <button
                  type="button"
                  onClick={() => {
                    setReqScope('app');
                    setReqTargetApp('Minecraft');
                  }}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    reqScope === 'app'
                      ? 'bg-surface-container-high text-on-surface shadow-sm border border-outline-variant/20'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-[18px] text-primary"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    apps
                  </span>
                  <span>Specific App</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReqScope('device');
                    setReqTargetApp('Entire Device');
                  }}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    reqScope === 'device'
                      ? 'bg-surface-container-high text-on-surface shadow-sm border border-outline-variant/20'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">smartphone</span>
                  <span>Whole Device</span>
                </button>
              </div>

              {/* Active Target Card */}
              <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/20 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-600 to-green-800 flex items-center justify-center text-white shadow-md shrink-0 border border-white/10">
                    <span
                      className="material-symbols-outlined text-2xl"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {reqScope === 'device' ? 'smartphone' : 'deployed_code'}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-headline font-semibold text-sm text-on-surface">
                        {reqTargetApp}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded bg-tertiary-container/20 text-tertiary border border-tertiary/30">
                        Active Limit
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {reqScope === 'device'
                        ? 'Extends overall Galaxy A34 bedtime timer'
                        : 'Games & Creative • 15 min left in daily 1h cap'}
                    </p>
                  </div>
                </div>
                {reqScope === 'app' && (
                  <button
                    type="button"
                    onClick={() => {
                      const options = ['Minecraft', 'Roblox', 'YouTube Kids', 'Scratch Coding'];
                      const next =
                        options[(options.indexOf(reqTargetApp) + 1) % options.length];
                      setReqTargetApp(next);
                    }}
                    className="text-xs font-medium text-primary hover:underline px-2 py-1 shrink-0 cursor-pointer"
                  >
                    Change
                  </button>
                )}
              </div>
            </section>

            {/* Step 2: How much extra time? */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="font-headline font-semibold text-xs uppercase tracking-wider text-on-surface-variant">
                  2. How much extra time?
                </h3>
                <span className="text-xs font-mono text-secondary">Step 2 of 3</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { mins: 15, label: '+15 minutes', sub: 'Quick finish • Most approved' },
                  { mins: 30, label: '+30 minutes', sub: 'Standard extension' },
                  { mins: 45, label: '+45 minutes', sub: 'Full match / project' },
                  { mins: 60, label: '+1 hour', sub: 'Weekend / special bonus' },
                ].map((opt) => {
                  const selected = reqDurationMins === opt.mins;
                  return (
                    <button
                      key={opt.mins}
                      type="button"
                      onClick={() => setReqDurationMins(opt.mins)}
                      className={`p-3.5 rounded-xl text-left transition-all flex flex-col justify-between border-2 cursor-pointer ${
                        selected
                          ? 'border-status-enforced bg-status-enforced/10'
                          : 'border-outline-variant/20 bg-surface-container-low hover:bg-surface-container'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-mono font-bold text-base text-on-surface">
                          {opt.label}
                        </span>
                        <span
                          className={`material-symbols-outlined text-[18px] ${
                            selected ? 'text-status-enforced' : 'text-on-surface-variant/30'
                          }`}
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          check_circle
                        </span>
                      </div>
                      <span
                        className={`text-[11px] mt-1 ${
                          selected ? 'text-secondary font-medium' : 'text-on-surface-variant'
                        }`}
                      >
                        {opt.sub}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Live Calculated Timeline Preview */}
              <div className="px-3.5 py-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant/15 flex items-center justify-between text-xs">
                <span className="text-on-surface-variant flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-secondary">
                    event_available
                  </span>
                  <span>New {reqTargetApp} end time if approved:</span>
                </span>
                <span className="font-mono font-bold text-secondary">
                  {reqDurationMins === 15
                    ? '7:45 PM'
                    : reqDurationMins === 30
                    ? '8:00 PM'
                    : reqDurationMins === 45
                    ? '8:15 PM'
                    : '8:30 PM'}
                </span>
              </div>
            </section>

            {/* Step 3: Why do you need extra time? */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="font-headline font-semibold text-xs uppercase tracking-wider text-on-surface-variant">
                  3. Why do you need extra time?
                </h3>
                <span className="text-xs font-mono text-secondary">Step 3 of 3</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  {
                    icon: 'sports_esports',
                    label: 'Finishing a realm build',
                    note: 'Just need a little more time to finish saving our coop castle build with Sam!',
                  },
                  {
                    icon: 'menu_book',
                    label: 'School homework',
                    note: 'Working on my history class assignment and checking project notes.',
                  },
                  {
                    icon: 'forum',
                    label: 'Chatting with family',
                    note: 'Talking with Grandma and cousins in the family group chat.',
                  },
                  {
                    icon: 'edit_note',
                    label: 'Other reason',
                    note: 'All my chores and homework are finished for today!',
                  },
                ].map((chip) => {
                  const selected = reqReason === chip.label;
                  return (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => {
                        setReqReason(chip.label);
                        setReqNote(chip.note);
                      }}
                      className={`px-3 py-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                        selected
                          ? 'border-status-enforced bg-status-enforced/15 text-secondary font-semibold'
                          : 'border-outline-variant/25 bg-surface-container-low text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">{chip.icon}</span>
                      <span>{chip.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Optional Personal Note */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <label className="text-on-surface-variant font-medium">
                    Add a note for Mom &amp; Dad (optional)
                  </label>
                  <span className="font-mono text-[11px] text-on-surface-variant">
                    {reqNote.length} / 140
                  </span>
                </div>
                <textarea
                  rows={2}
                  maxLength={140}
                  value={reqNote}
                  onChange={(e) => setReqNote(e.target.value)}
                  className="w-full rounded-xl bg-surface-container-lowest border border-outline-variant/25 focus:border-primary text-xs text-on-surface p-3 outline-none resize-none"
                />
              </div>
            </section>

            {/* Submit CTA */}
            <button
              type="button"
              onClick={() => {
                submitExtraTimeRequest(reqTargetApp, reqDurationMins, reqReason, reqNote);
                onSelectScreen('C-07');
              }}
              className="w-full py-3.5 px-5 rounded-xl bg-status-enforced text-on-secondary font-headline font-bold text-sm shadow-lg flex items-center justify-center gap-2 hover:brightness-105 transition-all cursor-pointer"
            >
              <span>Send Request to Sarah 🚀</span>
            </button>
          </div>
        )}

        {/* =====================================================================
            C-07: PARENT DECISION INBOX (7 child code.html)
           ===================================================================== */}
        {activeScreen === 'C-07' && (
          <div className="space-y-5">
            {/* Hero Header & Weekly Agreement Score Bento */}
            <section className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-container/15 border border-secondary-container/30">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                <span className="text-xs font-medium text-secondary">
                  Requests &amp; Decisions • Updates from Sarah &amp; Mark
                </span>
              </div>

              <div>
                <h2 className="font-headline text-2xl font-bold tracking-tight text-on-surface">
                  Parent Decision Inbox
                </h2>
                <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                  Every time request or app question you send appears here with Mom or Dad&apos;s note—nothing is decided in secret.
                </p>
              </div>

              {/* 3-Col Bento Score */}
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                <div className="bg-surface-container-low border border-outline-variant/15 rounded-xl p-3">
                  <div className="text-[10px] uppercase tracking-wider font-mono text-on-surface-variant">
                    This Week
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="font-mono text-xl font-bold text-on-surface">
                      {state.requests.length + 6}
                    </span>
                    <span className="text-[11px] text-on-surface-variant">Sent</span>
                  </div>
                </div>
                <div className="bg-surface-container-low border border-secondary-container/25 rounded-xl p-3">
                  <div className="text-[10px] uppercase tracking-wider font-mono text-secondary">
                    Approved
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="font-mono text-xl font-bold text-secondary">88%</span>
                  </div>
                </div>
                <div className="bg-surface-container-low border border-outline-variant/15 rounded-xl p-3">
                  <div className="text-[10px] uppercase tracking-wider font-mono text-primary">
                    Transparency
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="font-mono text-xl font-bold text-primary">0</span>
                    <span className="text-[11px] text-on-surface-variant">Hidden</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Dynamic Live Requests from Shared State */}
            {state.requests.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-xs font-mono uppercase tracking-wider text-on-surface-variant font-semibold">
                  Live Household Requests ({state.requests.length})
                </h3>
                {state.requests.map((req) => (
                  <article
                    key={req.id}
                    className={`rounded-2xl bg-surface-container p-4 border space-y-3 ${
                      req.status === 'APPROVED'
                        ? 'border-status-enforced/40'
                        : req.status === 'DECLINED'
                        ? 'border-status-failed/40'
                        : 'border-status-pending/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-headline font-bold text-sm text-on-surface">
                            {req.targetName}{' '}
                            {req.requestedMinutes > 0 ? `+${req.requestedMinutes} Mins` : ''}
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase ${
                              req.status === 'APPROVED'
                                ? 'bg-status-enforced/15 text-status-enforced'
                                : req.status === 'DECLINED'
                                ? 'bg-status-failed/15 text-status-failed'
                                : 'bg-status-pending/15 text-status-pending'
                            }`}
                          >
                            {req.status}
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          {req.reasonCategory} • {req.createdAtLabel}
                        </p>
                      </div>
                      {req.status === 'PENDING' && (
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateState(
                              (prev) => ({
                                ...prev,
                                requests: prev.requests.filter((r) => r.id !== req.id),
                              }),
                              `Withdrew request for ${req.targetName}`
                            );
                            notifyChild(`Withdrew pending request for ${req.targetName}.`);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-surface-container-high text-[11px] text-on-surface-variant hover:text-on-surface cursor-pointer"
                        >
                          Withdraw
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-on-surface bg-surface-container-low p-2.5 rounded-xl border border-outline-variant/10">
                      Your note: &ldquo;{req.childNote}&rdquo;
                    </p>
                    {req.parentNote && (
                      <div className="p-3 rounded-xl bg-secondary-container/10 border border-secondary/25 flex items-start gap-2.5">
                        <img
                          src={MOM_AVATAR_URL}
                          alt="Sarah"
                          className="w-7 h-7 rounded-full object-cover shrink-0"
                        />
                        <div className="text-xs">
                          <span className="font-bold text-secondary block">
                            {req.decidedBy || 'Sarah (Mom)'} replied:
                          </span>
                          <span className="text-on-surface">&ldquo;{req.parentNote}&rdquo;</span>
                        </div>
                      </div>
                    )}
                  </article>
                ))}
              </section>
            )}

            {/* Stitch Reference Latest Decisions Cards */}
            <section className="space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono uppercase tracking-wider text-on-surface-variant font-semibold">
                  Recent Decisions from Mom &amp; Dad
                </h3>
                <button
                  type="button"
                  onClick={() => onSelectScreen('C-06')}
                  className="text-xs text-primary font-semibold hover:underline cursor-pointer"
                >
                  + New Request
                </button>
              </div>

              {/* Card 1: Minecraft +15 Mins APPROVED */}
              <article className="rounded-2xl bg-surface-container border border-secondary-container/40 p-4 space-y-3.5 shadow-lg">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-[#2e6f40] flex items-center justify-center text-white font-bold shadow">
                      <span className="material-symbols-outlined text-2xl">view_in_ar</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-headline font-bold text-sm text-on-surface">
                          Minecraft • +15 Mins
                        </h4>
                        <span className="px-2 py-0.5 rounded bg-status-enforced/20 text-secondary font-mono text-[10px] font-bold">
                          APPROVED
                        </span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant">
                        Approved by Sarah (Mom) • 4 mins ago
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-secondary font-bold">14m 20s left</span>
                </div>

                <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/15 flex items-start gap-2.5">
                  <img
                    src={MOM_AVATAR_URL}
                    alt="Sarah"
                    className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5"
                  />
                  <div className="text-xs leading-relaxed">
                    <span className="font-semibold text-on-surface">Mom&apos;s Note: </span>
                    <span className="text-on-surface-variant">
                      &ldquo;Awesome job finishing your math worksheet early! Enjoy finishing the castle build with Sam, then dinner at 6:30.&rdquo;
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => notifyChild('Launching Minecraft with +15m Bonus Timer active!')}
                  className="w-full py-2.5 rounded-xl bg-status-enforced text-on-secondary font-headline font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">play_arrow</span>
                  <span>Open Minecraft Now</span>
                </button>
              </article>

              {/* Card 2: Discord App Install — DISCUSSION FIRST */}
              <article className="rounded-2xl bg-surface-container border border-tertiary/30 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                      <span className="material-symbols-outlined text-xl">forum</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-headline font-bold text-sm text-on-surface">
                          Discord App Install
                        </h4>
                        <span className="px-2 py-0.5 rounded bg-tertiary-container/20 text-tertiary font-mono text-[10px] font-bold">
                          LET&apos;S TALK SUNDAY
                        </span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant">
                        Reviewed by Mark (Dad) • Yesterday
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/15 flex items-start gap-2.5">
                  <img
                    src={DAD_AVATAR_URL}
                    alt="Mark"
                    className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5"
                  />
                  <div className="text-xs leading-relaxed">
                    <span className="font-semibold text-on-surface">Dad&apos;s Note: </span>
                    <span className="text-on-surface-variant">
                      &ldquo;Not saying no forever, buddy! Public servers on Discord have unmoderated chat. Let&apos;s look at setting up a private friends-only group together during Sunday Family Chat.&rdquo;
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSundayAgendaAdded(true);
                    notifyChild('Added "Discord Friends-Only Setup" to Sunday 6:00 PM Family Chat!');
                  }}
                  className={`w-full py-2.5 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 cursor-pointer ${
                    sundayAgendaAdded
                      ? 'bg-status-enforced/15 border-status-enforced/40 text-secondary'
                      : 'bg-surface-container-high border-outline-variant/25 text-on-surface hover:bg-surface-bright'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">event_note</span>
                  <span>
                    {sundayAgendaAdded
                      ? 'Added to Sunday Chat Agenda ✓'
                      : 'Add to Sunday Chat Agenda'}
                  </span>
                </button>
              </article>
            </section>
          </div>
        )}

        {/* =====================================================================
            C-08: EMERGENCY SOS & CHECK-IN (8 child code.html)
           ===================================================================== */}
        {activeScreen === 'C-08' && (
          <div className="space-y-5">
            {/* Emergency Readiness Telemetry Bar */}
            <section className="bg-surface-container-low rounded-xl p-3 border border-outline-variant/15 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-secondary-container/20 text-secondary">
                  <span className="material-symbols-outlined text-[15px]">radar</span>
                </span>
                <span className="text-xs font-medium text-on-surface">
                  Emergency Ready • Fail-safe Active
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="inline-flex items-center gap-1 text-secondary bg-secondary-container/10 px-2 py-0.5 rounded">
                  <span className="material-symbols-outlined text-[12px]">my_location</span>
                  GPS ±{selectedChild.gpsAccuracyMeters}m
                </span>
                <span className="inline-flex items-center gap-1 text-on-surface-variant bg-surface-container px-2 py-0.5 rounded">
                  <span className="material-symbols-outlined text-[12px]">battery_5_bar</span>
                  {selectedChild.batteryPercent}%
                </span>
              </div>
            </section>

            {/* Primary SOS Trigger Module with 3s Hold Ring */}
            <section className="relative rounded-2xl bg-gradient-to-b from-surface-container to-surface-container-low border border-error/25 p-6 flex flex-col items-center text-center overflow-hidden shadow-xl">
              <div className="relative z-10 mb-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-error-container/25 border border-error/30 text-error text-[11px] font-semibold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-status-failed animate-ping" />
                  Immediate Guardian Priority
                </span>
                <h2 className="font-headline font-bold text-xl text-on-surface mt-2">
                  Need Immediate Help?
                </h2>
                <p className="text-xs text-on-surface-variant max-w-xs mx-auto mt-0.5 leading-relaxed">
                  Press and hold the SOS button (or tap once in preview) to alert Mom &amp; Dad with your live GPS coordinates.
                </p>
              </div>

              {/* Radial SOS Hold Button */}
              <div className="relative w-52 h-52 flex items-center justify-center my-2">
                <div className="w-44 h-44 rounded-full border border-status-failed/25 animate-pulse absolute" />
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 200 200">
                  <circle
                    cx="100"
                    cy="100"
                    r="86"
                    fill="none"
                    stroke="rgba(239, 68, 68, 0.15)"
                    strokeWidth="6"
                  />
                  <circle
                    cx="100"
                    cy="100"
                    r="86"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray="540.35"
                    strokeDashoffset={540.35 - (540.35 * sosHoldProgress) / 100}
                  />
                </svg>

                <button
                  type="button"
                  onMouseDown={() => setIsHoldingSos(true)}
                  onMouseUp={() => setIsHoldingSos(false)}
                  onMouseLeave={() => setIsHoldingSos(false)}
                  onTouchStart={() => setIsHoldingSos(true)}
                  onTouchEnd={() => setIsHoldingSos(false)}
                  onClick={() => {
                    setSosCountdownSec(5);
                    setShowSosCountdownModal(true);
                  }}
                  className="relative z-20 w-36 h-36 rounded-full bg-gradient-to-b from-[#ef4444] to-[#b91c1c] text-white shadow-[0_0_40px_rgba(239,68,68,0.45)] border-4 border-error/60 flex flex-col items-center justify-center active:scale-95 transition-transform cursor-pointer"
                >
                  <span
                    className="material-symbols-outlined text-4xl mb-0.5"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    sos
                  </span>
                  <span className="font-headline font-extrabold text-base tracking-tight uppercase">
                    Hold 3s
                  </span>
                  <span className="font-mono text-[10px] text-white/90 mt-0.5">
                    {isHoldingSos ? `${sosHoldProgress}%...` : 'Or Tap to Test'}
                  </span>
                </button>
              </div>

              {sosDispatchedBanner && (
                <div className="w-full mt-3 p-3 rounded-xl bg-status-failed/20 border border-status-failed/50 text-xs text-on-surface flex items-center justify-between">
                  <span className="font-semibold text-error">
                    🚨 SOS Broadcast Active! Sarah &amp; Mark have your live GPS beacon.
                  </span>
                  <button
                    type="button"
                    onClick={() => setSosDispatchedBanner(false)}
                    className="text-[11px] underline cursor-pointer"
                  >
                    I&apos;m Safe Now
                  </button>
                </div>
              )}

              <div className="relative z-10 w-full mt-3 pt-3 border-t border-outline-variant/15 flex items-center justify-center gap-4 text-[11px] text-on-surface-variant">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-error">
                    notifications_active
                  </span>
                  Bypasses Silent Mode
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-secondary">
                    share_location
                  </span>
                  Live GPS Stream
                </span>
              </div>
            </section>

            {/* Instant Check-In (Non-Emergency) */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-headline font-semibold text-xs uppercase tracking-wider text-on-surface-variant">
                  Instant Check-In (Non-Emergency)
                </h3>
                <span className="text-[11px] text-secondary font-mono">1-Tap Update</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => sendSafeCheckIn("I'm Safe & Arrived")}
                  className="bg-surface-container hover:bg-surface-container-high border border-secondary-container/30 rounded-xl p-3.5 text-left transition-all flex flex-col justify-between gap-2.5 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-lg bg-secondary-container/20 border border-secondary-container/40 flex items-center justify-center text-secondary">
                      <span
                        className="material-symbols-outlined text-xl"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        where_to_vote
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-secondary bg-secondary-container/15 px-2 py-0.5 rounded">
                      SAFE PING
                    </span>
                  </div>
                  <div>
                    <div className="font-headline font-bold text-xs text-on-surface">
                      I&apos;m Safe &amp; Arrived
                    </div>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">
                      Let Mom &amp; Dad know you reached your destination safely.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => sendSafeCheckIn('Please Pick Me Up at West Gate')}
                  className="bg-surface-container hover:bg-surface-container-high border border-primary/25 rounded-xl p-3.5 text-left transition-all flex flex-col justify-between gap-2.5 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-lg bg-primary-container/30 border border-primary/30 flex items-center justify-center text-primary">
                      <span
                        className="material-symbols-outlined text-xl"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        directions_car
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-primary bg-primary-container/20 px-2 py-0.5 rounded">
                      RIDE PING
                    </span>
                  </div>
                  <div>
                    <div className="font-headline font-bold text-xs text-on-surface">
                      Please Pick Me Up
                    </div>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">
                      Send your exact pickup spot &amp; ask for a ride home.
                    </p>
                  </div>
                </button>
              </div>

              {checkInDoneBanner && (
                <div className="p-3 rounded-xl bg-secondary-container/15 border border-secondary/30 text-xs text-secondary flex items-center justify-between">
                  <span>✓ {checkInDoneBanner}</span>
                  <button
                    type="button"
                    onClick={() => setCheckInDoneBanner(null)}
                    className="text-[11px] underline cursor-pointer"
                  >
                    Hide
                  </button>
                </div>
              )}
            </section>

            {/* Your Current Beacon Map Preview + Direct Emergency Contacts */}
            <section className="rounded-xl bg-surface-container p-4 border border-outline-variant/15 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-lg">
                    pin_drop
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-on-surface">
                      {selectedChild.currentLocationName} • West Gate
                    </h4>
                    <p className="text-[11px] text-on-surface-variant">
                      {selectedChild.currentLocationAddress}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-status-enforced/15 text-status-enforced font-mono text-[10px] font-bold">
                  ±{selectedChild.gpsAccuracyMeters}m Precise
                </span>
              </div>

              <div className="pt-2 border-t border-outline-variant/15 grid grid-cols-3 gap-2">
                {[
                  { name: 'Call Mom', sub: 'Sarah Jenkins', phone: '(555) 234-8910' },
                  { name: 'Call Dad', sub: 'Mark Jenkins', phone: '(555) 234-8911' },
                  { name: 'Call 911', sub: 'Emergency', phone: '911 Direct' },
                ].map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => notifyChild(`Dialing ${c.name} (${c.phone})...`)}
                    className="p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/15 text-center cursor-pointer"
                  >
                    <div className="text-xs font-bold text-on-surface">{c.name}</div>
                    <div className="text-[10px] font-mono text-on-surface-variant">{c.sub}</div>
                  </button>
                ))}
              </div>
            </section>

            {/* 5-Second SOS Countdown Modal */}
            {showSosCountdownModal && (
              <div className="fixed inset-0 z-50 bg-surface-container-lowest/90 backdrop-blur-md flex items-center justify-center p-4">
                <div className="w-full max-w-sm rounded-2xl bg-surface-container-high border-2 border-status-failed p-6 text-center shadow-2xl space-y-4">
                  <div className="w-16 h-16 rounded-full bg-status-failed/20 border-2 border-status-failed text-status-failed mx-auto flex items-center justify-center font-mono text-2xl font-extrabold">
                    {sosCountdownSec}s
                  </div>
                  <h3 className="font-headline font-bold text-lg text-on-surface">
                    Broadcasting Emergency SOS...
                  </h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Sending high-priority siren alert and live GPS coordinates to Sarah &amp; Mark in{' '}
                    <strong className="text-on-surface">{sosCountdownSec} seconds</strong>.
                  </p>
                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        dispatchEmergencySos(false);
                        setShowSosCountdownModal(false);
                        setSosDispatchedBanner(true);
                      }}
                      className="w-full py-3 rounded-xl bg-status-failed text-white font-headline font-bold text-xs uppercase tracking-wider cursor-pointer"
                    >
                      Send Immediately (Don&apos;t Wait)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSosCountdownModal(false);
                        notifyChild('Cancelled SOS — False alarm.');
                      }}
                      className="w-full py-2.5 rounded-xl bg-surface-container text-on-surface text-xs font-semibold border border-outline-variant/30 cursor-pointer"
                    >
                      Cancel – I Am Safe (False Alarm)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            C-09: FAMILY CHAT & TASKS (9 child code.html)
           ===================================================================== */}
        {activeScreen === 'C-09' && (
          <div className="space-y-4">
            {/* Family Space Header & 3 Filter Pills */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-secondary font-semibold">
                    The Jenkins Household • Family Space
                  </span>
                  <h2 className="font-headline font-bold text-xl text-on-surface">
                    Family Chat &amp; Shared Chores
                  </h2>
                </div>
                <div className="flex -space-x-2">
                  <img
                    src={MOM_AVATAR_URL}
                    alt="Sarah"
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-surface"
                  />
                  <img
                    src={DAD_AVATAR_URL}
                    alt="Mark"
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-surface"
                  />
                  <img
                    src={LEO_AVATAR_URL}
                    alt="Leo"
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-status-enforced"
                  />
                </div>
              </div>

              {/* 3 Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                {[
                  { id: 'ALL' as const, label: 'Chat & Notes', icon: 'forum' },
                  {
                    id: 'TASKS' as const,
                    label: `Shared Tasks (${state.tasks.filter((t) => t.completed).length}/${
                      state.tasks.length
                    } Done)`,
                    icon: 'task_alt',
                  },
                  { id: 'AGENDA' as const, label: 'Sunday Review Agenda (2)', icon: 'event' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setChatTabFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all ${
                      chatTabFilter === tab.id
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Shared Tasks & Chores Section */}
            {(chatTabFilter === 'ALL' || chatTabFilter === 'TASKS') && (
              <section className="rounded-2xl bg-surface-container p-4 border border-outline-variant/15 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-tertiary text-lg">
                      emoji_events
                    </span>
                    <h3 className="font-headline font-bold text-sm text-on-surface">
                      Today&apos;s Chores &amp; Screen-Time Rewards
                    </h3>
                  </div>
                  <span className="font-mono text-xs text-tertiary font-bold">
                    {selectedChild.trustPoints} Trust Pts
                  </span>
                </div>

                <div className="space-y-2">
                  {state.tasks
                    .filter((t) => t.childId === selectedChild.id)
                    .map((task) => (
                      <div
                        key={task.id}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                          task.completed
                            ? 'bg-status-enforced/10 border-status-enforced/30'
                            : 'bg-surface-container-low border-outline-variant/15'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateState(
                                (prev) => ({
                                  ...prev,
                                  tasks: prev.tasks.map((tk) =>
                                    tk.id === task.id ? { ...tk, completed: !tk.completed } : tk
                                  ),
                                  children: prev.children.map((c) =>
                                    c.id === selectedChild.id
                                      ? {
                                          ...c,
                                          trustPoints: task.completed
                                            ? c.trustPoints - task.rewardTrustPoints
                                            : c.trustPoints + task.rewardTrustPoints,
                                        }
                                      : c
                                  ),
                                }),
                                `${selectedChild.name} toggled chore: ${task.title}`
                              );
                              notifyChild(
                                !task.completed
                                  ? `Completed "${task.title}"! +${task.rewardBonusMinutes}m bonus requested.`
                                  : `Unchecked "${task.title}".`
                              );
                            }}
                            className={`w-6 h-6 rounded-lg flex items-center justify-center border cursor-pointer ${
                              task.completed
                                ? 'bg-status-enforced border-status-enforced text-on-secondary'
                                : 'border-outline-variant text-transparent'
                            }`}
                          >
                            <span className="material-symbols-outlined text-sm">check</span>
                          </button>
                          <div>
                            <div
                              className={`text-xs font-semibold ${
                                task.completed
                                  ? 'line-through text-on-surface-variant'
                                  : 'text-on-surface'
                              }`}
                            >
                              {task.title}
                            </div>
                            <div className="text-[11px] text-on-surface-variant">
                              {task.subtitle}
                            </div>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-tertiary-container/20 text-tertiary font-mono text-[10px] font-bold shrink-0">
                          +{task.rewardBonusMinutes}m / +{task.rewardTrustPoints}pts
                        </span>
                      </div>
                    ))}
                </div>
              </section>
            )}

            {/* Sunday Review Agenda Section */}
            {chatTabFilter === 'AGENDA' && (
              <section className="rounded-2xl bg-surface-container p-4 border border-primary/25 space-y-3">
                <h3 className="font-headline font-bold text-sm text-on-surface">
                  Sunday 6:00 PM Family Review Topics
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/15">
                    <div className="font-semibold text-on-surface">
                      1. Friday Night Bedtime Extension (9:00 PM)
                    </div>
                    <p className="text-on-surface-variant text-[11px] mt-0.5">
                      Proposed by {selectedChild.name} • Backed by 4-day Study Streak
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/15">
                    <div className="font-semibold text-on-surface">
                      2. Discord Private Server Rules with Sam
                    </div>
                    <p className="text-on-surface-variant text-[11px] mt-0.5">
                      Added by Dad (Mark) &amp; {selectedChild.name}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Live Message Thread */}
            <section className="rounded-2xl bg-surface-container p-4 border border-outline-variant/15 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-on-surface-variant">
                  Household Messages
                </span>
                <span className="text-[11px] text-status-enforced font-mono">End-to-End Family</span>
              </div>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {state.messages.map((msg) => {
                  const isChild = msg.senderRole === 'CHILD';
                  const isSystem = msg.senderRole === 'SYSTEM';
                  if (isSystem) {
                    return (
                      <div
                        key={msg.id}
                        className="p-2.5 rounded-xl bg-status-enforced/10 border border-status-enforced/30 text-center text-[11px] text-secondary font-medium"
                      >
                        ✨ {msg.text} ({msg.timestampLabel})
                      </div>
                    );
                  }
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-2.5 ${
                        isChild ? 'flex-row-reverse' : 'flex-row'
                      }`}
                    >
                      <img
                        src={
                          isChild
                            ? LEO_AVATAR_URL
                            : msg.senderName.includes('Mark')
                            ? DAD_AVATAR_URL
                            : MOM_AVATAR_URL
                        }
                        alt={msg.senderName}
                        className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5"
                      />
                      <div
                        className={`max-w-[78%] p-3 rounded-2xl text-xs leading-relaxed ${
                          isChild
                            ? 'bg-primary text-on-primary rounded-tr-none'
                            : 'bg-surface-container-high text-on-surface rounded-tl-none'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 mb-0.5 opacity-80 text-[10px] font-mono">
                          <span>{isChild ? 'You' : msg.senderName}</span>
                          <span>{msg.timestampLabel}</span>
                        </div>
                        <p>{msg.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Updates Horizontal Prompt Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
                {[
                  '🙋 Done with homework!',
                  '🐕 Dog is fed & walked',
                  '⏳ Extra 15m request',
                  '💬 Suggest Sunday topic',
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setChatInput(chip)}
                    className="px-2.5 py-1 rounded-full bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/20 text-[11px] text-on-surface-variant hover:text-on-surface whitespace-nowrap cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Message Composer Bar */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setChatInput('📸 Attached photo of completed math homework!');
                    notifyChild('Homework photo attached!');
                  }}
                  aria-label="Attach homework photo"
                  className="w-9 h-9 rounded-full bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center shrink-0 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">add_a_photo</span>
                </button>
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Message Mom & Dad..."
                  className="flex-1 px-3.5 py-2 rounded-full bg-surface-container-lowest border border-outline-variant/25 text-xs text-on-surface outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!chatInput.trim()) return;
                    onUpdateState(
                      (prev) => ({
                        ...prev,
                        messages: [
                          ...prev.messages,
                          {
                            id: `msg-${Date.now()}`,
                            senderId: selectedChild.id,
                            senderName: selectedChild.name,
                            senderRole: 'CHILD',
                            text: chatInput.trim(),
                            timestampLabel: 'Just now',
                          },
                        ],
                      }),
                      `${selectedChild.name} sent a family message`
                    );
                    setChatInput('');
                    notifyChild('Message sent to Family Chat!');
                  }}
                  aria-label="Send family chat message"
                  className="w-9 h-9 rounded-full bg-status-enforced text-on-secondary flex items-center justify-center shrink-0 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">send</span>
                </button>
              </div>
            </section>
          </div>
        )}

        {/* =====================================================================
            C-10: MY ACTIVITY & BALANCE WELLBEING (10 child code.html)
           ===================================================================== */}
        {activeScreen === 'C-10' && (
          <div className="space-y-5">
            {/* Hero Header */}
            <section className="flex items-end justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 text-secondary text-xs font-semibold uppercase tracking-wider mb-1">
                  <span
                    className="material-symbols-outlined text-[16px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    eco
                  </span>
                  <span>Wellbeing &amp; Reflection</span>
                </div>
                <h2 className="font-headline font-bold text-2xl text-on-surface tracking-tight">
                  My Activity &amp; Balance
                </h2>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  See how your screen habits, learning, and offline life work together.
                </p>
              </div>
              <div className="bg-surface-container px-3 py-1.5 rounded-lg border border-outline-variant/15 flex items-center gap-2 shrink-0">
                <span
                  className="material-symbols-outlined text-tertiary text-lg"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  military_tech
                </span>
                <div>
                  <div className="text-[10px] text-on-surface-variant uppercase tracking-wider font-mono">
                    Current Rank
                  </div>
                  <div className="text-xs font-bold text-on-surface">Level 4 Mindful Hero</div>
                </div>
              </div>
            </section>

            {/* Today's Balance Scorecard with 3-Concentric-Ring SVG Radial Chart */}
            <section className="bg-surface-container rounded-2xl p-5 border border-outline-variant/15 space-y-5">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                    <circle
                      cx="80"
                      cy="80"
                      r="68"
                      fill="none"
                      stroke="#222a3d"
                      strokeWidth="12"
                    />
                    <circle
                      cx="80"
                      cy="80"
                      r="52"
                      fill="none"
                      stroke="#222a3d"
                      strokeWidth="12"
                    />
                    <circle
                      cx="80"
                      cy="80"
                      r="36"
                      fill="none"
                      stroke="#222a3d"
                      strokeWidth="12"
                    />
                    {/* Outer Ring: Learning (Emerald) */}
                    <circle
                      cx="80"
                      cy="80"
                      r="68"
                      fill="none"
                      stroke="#4edea3"
                      strokeWidth="12"
                      strokeDasharray="427"
                      strokeDashoffset="110"
                      strokeLinecap="round"
                    />
                    {/* Middle Ring: Play & Fun (Primary Indigo) */}
                    <circle
                      cx="80"
                      cy="80"
                      r="52"
                      fill="none"
                      stroke="#b8c4ff"
                      strokeWidth="12"
                      strokeDasharray="326"
                      strokeDashoffset="120"
                      strokeLinecap="round"
                    />
                    {/* Inner Ring: Creativity (Amber) */}
                    <circle
                      cx="80"
                      cy="80"
                      r="36"
                      fill="none"
                      stroke="#ffb95f"
                      strokeWidth="12"
                      strokeDasharray="226"
                      strokeDashoffset="80"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">
                      Today
                    </span>
                    <span className="font-mono font-bold text-xl text-on-surface leading-tight mt-0.5">
                      {formatMinutesHuman(selectedChild.usedMinutesToday)}
                    </span>
                    <span className="text-[10px] font-medium text-secondary mt-0.5">
                      of {formatMinutesHuman(selectedChild.dailyAllowanceMinutes)} goal
                    </span>
                  </div>
                </div>

                <div className="flex-1 space-y-3 w-full">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-container/15 border border-secondary/25 text-secondary text-xs font-semibold">
                    <span>🌟 Great Balance! In the Sweet Zone</span>
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    You spent <strong className="text-on-surface">41% of your screen time</strong> learning and creating today, plus <strong className="text-secondary">3h 10m playing outside</strong>!
                  </p>

                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/10">
                      <div className="text-[11px] text-on-surface-variant">Screen Time</div>
                      <div className="font-mono font-bold text-base text-on-surface mt-0.5">
                        2h 15m
                      </div>
                      <div className="text-[10px] text-secondary mt-0.5">1h 15m remaining</div>
                    </div>
                    <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/10">
                      <div className="text-[11px] text-on-surface-variant">Offline Active</div>
                      <div className="font-mono font-bold text-base text-secondary mt-0.5">
                        3h 10m
                      </div>
                      <div className="text-[10px] text-on-surface-variant mt-0.5">
                        Soccer &amp; Guitar 🎸
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Healthy Habits & Streaks 3-Col */}
            <section className="grid grid-cols-3 gap-2.5">
              <div className="p-3 rounded-xl bg-surface-container border border-outline-variant/15">
                <div className="text-xs font-bold text-on-surface">📚 Study First</div>
                <div className="font-mono text-sm font-bold text-secondary mt-1">
                  {selectedChild.streakDays} Days
                </div>
                <div className="text-[10px] text-on-surface-variant">Homework before games</div>
              </div>
              <div className="p-3 rounded-xl bg-surface-container border border-outline-variant/15">
                <div className="text-xs font-bold text-on-surface">🌙 Restful Sleep</div>
                <div className="font-mono text-sm font-bold text-primary mt-1">8h 45m</div>
                <div className="text-[10px] text-on-surface-variant">Bedtime respected</div>
              </div>
              <div className="p-3 rounded-xl bg-surface-container border border-outline-variant/15">
                <div className="text-xs font-bold text-on-surface">🚶 Eye Breaks</div>
                <div className="font-mono text-sm font-bold text-tertiary mt-1">5 of 5</div>
                <div className="text-[10px] text-on-surface-variant">20-20-20 rule met</div>
              </div>
            </section>

            {/* Interactive Weekly Rhythm Insights (Mon - Sun) */}
            <section className="rounded-2xl bg-surface-container p-4 border border-outline-variant/15 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-headline font-bold text-sm text-on-surface">
                  Weekly Rhythm Insights
                </h3>
                <span className="text-[11px] font-mono text-on-surface-variant">
                  Tap any day to inspect
                </span>
              </div>

              <div className="grid grid-cols-7 gap-1.5 pt-1">
                {Object.keys(WEEKLY_WELLBEING_INSIGHTS).map((dayKey) => {
                  const active = selectedWellbeingDay === dayKey;
                  return (
                    <button
                      key={dayKey}
                      type="button"
                      onClick={() => setSelectedWellbeingDay(dayKey)}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                        active
                          ? 'bg-primary/20 border-primary text-on-surface font-bold'
                          : 'bg-surface-container-low border-outline-variant/10 text-on-surface-variant'
                      }`}
                    >
                      <div className="text-[10px] font-mono">{dayKey}</div>
                      <div className="w-2 h-8 mx-auto my-1.5 rounded-full bg-surface-container-highest overflow-hidden flex flex-col justify-end">
                        <div className="w-full h-3 bg-status-enforced" />
                        <div className="w-full h-3 bg-primary" />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Selected Day Summary Box */}
              <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/15 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-on-surface">
                    {WEEKLY_WELLBEING_INSIGHTS[selectedWellbeingDay].title}
                  </span>
                  <span className="font-mono text-[11px] text-secondary">
                    Learn: {WEEKLY_WELLBEING_INSIGHTS[selectedWellbeingDay].learn} • Play:{' '}
                    {WEEKLY_WELLBEING_INSIGHTS[selectedWellbeingDay].play}
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  {WEEKLY_WELLBEING_INSIGHTS[selectedWellbeingDay].desc}
                </p>
              </div>
            </section>

            {/* Digital Superpowers Self-Care Checklist */}
            <section className="rounded-2xl bg-surface-container p-4 border border-outline-variant/15 space-y-2.5">
              <h3 className="font-headline font-bold text-sm text-on-surface">
                ⚡ My Digital Superpowers Checklist
              </h3>
              {[
                { key: 'dinner' as const, label: 'No screens at the family dinner table (+15 pts)' },
                { key: 'eyes' as const, label: 'Took 20-20-20 eye breaks during gaming (+10 pts)' },
                {
                  key: 'reading' as const,
                  label: 'Read 20 pages of graphic novel before bed (+20 pts)',
                },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setHabitChecks((prev) => ({ ...prev, [item.key]: !prev[item.key] }));
                    notifyChild('Updated Digital Superpower habit!');
                  }}
                  className="w-full p-3 rounded-xl bg-surface-container-low border border-outline-variant/15 flex items-center justify-between text-left cursor-pointer"
                >
                  <span className="text-xs text-on-surface font-medium">{item.label}</span>
                  <span
                    className={`material-symbols-outlined text-lg ${
                      habitChecks[item.key] ? 'text-status-enforced' : 'text-on-surface-variant/40'
                    }`}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                </button>
              ))}
            </section>
          </div>
        )}

        {/* =====================================================================
            C-11: PRIVACY & SHARING DASHBOARD (11 child code.html)
           ===================================================================== */}
        {activeScreen === 'C-11' && (
          <div className="space-y-5">
            {/* Hero Trust & Transparency Banner */}
            <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface-container-high via-surface-container to-surface-container-low p-5 border border-outline-variant/20">
              <div className="relative z-10 space-y-3">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-container/15 border border-secondary-container/30 text-secondary text-xs font-medium">
                  <span
                    className="material-symbols-outlined text-sm"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    verified_user
                  </span>
                  <span>No Secret Spying Guarantee</span>
                </div>
                <div className="space-y-1">
                  <h2 className="font-headline text-2xl font-bold text-on-surface tracking-tight">
                    Your Privacy &amp; Trust
                  </h2>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Anchor is built on family trust, not secret surveillance. You always have the right to see <strong className="text-on-surface">every single detail</strong> shared with Sarah &amp; Mark—and what stays 100% private to you.
                  </p>
                </div>
              </div>
            </section>

            {/* Interactive Transparency Matrix Segmented Control */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-headline font-bold text-sm text-on-surface">
                  Transparency Matrix
                </h3>
                <span className="text-[11px] font-mono text-on-surface-variant uppercase">
                  Clear Boundaries
                </span>
              </div>

              <div className="p-1 rounded-xl bg-surface-container-lowest border border-outline-variant/15 grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => setPrivacyMatrixTab('SHARED')}
                  className={`py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    privacyMatrixTab === 'SHARED'
                      ? 'bg-surface-container-high text-on-surface shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-base text-primary">
                    visibility
                  </span>
                  <span>What Parents See (5)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrivacyMatrixTab('PRIVATE')}
                  className={`py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    privacyMatrixTab === 'PRIVATE'
                      ? 'bg-surface-container-high text-on-surface shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-base text-secondary">
                    lock
                  </span>
                  <span>Strictly Private (5)</span>
                </button>
              </div>

              {privacyMatrixTab === 'SHARED' ? (
                <div className="space-y-2.5">
                  {[
                    {
                      icon: 'schedule',
                      title: 'App Names & Daily Time Totals',
                      badge: 'SYNCED',
                      desc: 'Mom & Dad can see how long you use apps (e.g., Minecraft for 45m), but NOT what you build or type inside them.',
                    },
                    {
                      icon: 'location_on',
                      title: 'Safe Zone Arrivals & Live GPS',
                      badge: 'REAL-TIME',
                      desc: 'Shares your map pin at School & Home and powers your Emergency SOS beacon.',
                    },
                    {
                      icon: 'shield',
                      title: 'Blocked Harmful Domain Alerts',
                      badge: 'SAFETY ONLY',
                      desc: 'Only alerts parents if an adult or phishing site is blocked—general safe reading is never logged.',
                    },
                    {
                      icon: 'battery_charging_full',
                      title: 'Battery & Online Health',
                      badge: 'TELEMETRY',
                      desc: 'Lets parents know if your Galaxy A34 battery drops below 15% when you are away from home.',
                    },
                    {
                      icon: 'cast',
                      title: 'Consented Live Check-In',
                      badge: 'VISIBLE BANNER',
                      desc: 'Requires a high-visibility glowing banner and gives you an instant Stop button.',
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/15 flex items-start gap-3"
                    >
                      <div className="w-9 h-9 rounded-lg bg-primary-container/25 text-primary flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-lg">{item.icon}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-on-surface">{item.title}</h4>
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-primary-container/20 text-primary">
                            {item.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-on-surface-variant mt-1 leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {[
                    {
                      icon: 'chat_bubble',
                      title: 'Private Text Messages & DMs',
                      desc: 'Anchor NEVER reads your SMS texts, family chats, or friend messages.',
                    },
                    {
                      icon: 'photo_library',
                      title: 'Photos, Videos & Camera Roll',
                      desc: 'Your personal photos, drawings, and saved memes are never uploaded or viewable by parents.',
                    },
                    {
                      icon: 'keyboard',
                      title: 'Zero Keystroke Logging',
                      desc: 'Anchor never records what you type on your keyboard or your passwords.',
                    },
                    {
                      icon: 'mic_off',
                      title: 'Zero Secret Microphone or Camera',
                      desc: 'Your camera or mic can NEVER be turned on silently in the background.',
                    },
                    {
                      icon: 'edit_note',
                      title: 'Personal Notes & Journal Apps',
                      desc: 'Your private notes, reminders, and journals stay 100% on your phone.',
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="p-3.5 rounded-xl bg-surface-container border border-status-enforced/30 flex items-start gap-3"
                    >
                      <div className="w-9 h-9 rounded-lg bg-status-enforced/15 text-status-enforced flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-lg">{item.icon}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-on-surface">{item.title}</h4>
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-status-enforced/15 text-status-enforced">
                            100% PRIVATE
                          </span>
                        </div>
                        <p className="text-[11px] text-on-surface-variant mt-1 leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Active Android Permissions Explainer Accordion */}
            <section className="rounded-2xl bg-surface-container p-4 border border-outline-variant/15 space-y-2.5">
              <h3 className="font-headline font-bold text-sm text-on-surface">
                Active Android System Permissions
              </h3>
              {[
                {
                  id: 'acc',
                  title: 'Accessibility & Usage Service',
                  why: 'Used strictly to detect which app is in the foreground and pause games when your daily timer finishes.',
                },
                {
                  id: 'loc',
                  title: 'Location Sensor (Fine GPS)',
                  why: 'Used to verify safe arrival at Oakridge Middle School and power your 1-tap SOS button.',
                },
                {
                  id: 'adm',
                  title: 'Knox Device Administrator',
                  why: 'Prevents accidental uninstallation of Anchor so your family rules stay synchronized.',
                },
              ].map((p) => (
                <div
                  key={p.id}
                  className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/10 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-on-surface">{p.title}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenPermExplainer(openPermExplainer === p.id ? null : p.id)
                      }
                      className="text-[11px] text-primary hover:underline cursor-pointer"
                    >
                      {openPermExplainer === p.id ? 'Hide details' : 'Learn why this is needed'}
                    </button>
                  </div>
                  {openPermExplainer === p.id && (
                    <p className="text-[11px] text-on-surface-variant pt-1 border-t border-outline-variant/10">
                      {p.why}
                    </p>
                  )}
                </div>
              ))}
            </section>

            {/* Talk with Sarah about House Rules + Export Privacy Log */}
            <section className="rounded-2xl bg-surface-container-low p-4 border border-outline-variant/20 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-on-surface">
                    Talk with Sarah about House Rules
                  </h4>
                  <p className="text-[11px] text-on-surface-variant">
                    Next Family Review: Sunday, 6:00 PM
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSundayTopicModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold cursor-pointer"
                >
                  Suggest a Topic
                </button>
              </div>
              <button
                type="button"
                onClick={() =>
                  notifyChild('Exported Leo_Privacy_Audit_Log.pdf (Zero covert sessions)!')
                }
                className="w-full py-2.5 rounded-xl bg-surface-container-high text-xs font-mono text-on-surface-variant hover:text-on-surface border border-outline-variant/15 cursor-pointer"
              >
                📄 Export My Privacy Audit Log (PDF)
              </button>
            </section>

            {showSundayTopicModal && (
              <div className="fixed inset-0 z-50 bg-surface-container-lowest/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="w-full max-w-md rounded-2xl bg-surface-container-high border border-outline-variant/30 p-5 space-y-4">
                  <h3 className="font-headline font-bold text-base text-on-surface">
                    Suggest Topic for Sunday Family Review
                  </h3>
                  <textarea
                    rows={3}
                    value={sundayTopicInput}
                    onChange={(e) => setSundayTopicInput(e.target.value)}
                    className="w-full p-3 rounded-xl bg-surface-container border border-outline-variant/30 text-xs text-on-surface outline-none"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowSundayTopicModal(false)}
                      className="flex-1 py-2.5 rounded-xl bg-surface-container text-xs text-on-surface-variant cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSundayTopicModal(false);
                        notifyChild('Added topic to Sunday 6:00 PM Family Review with Sarah & Mark!');
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-status-enforced text-on-secondary text-xs font-bold cursor-pointer"
                    >
                      Add to Sunday Agenda
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            C-12: FILTER & CONTENT DISCLOSURES (12 child code.html)
           ===================================================================== */}
        {activeScreen === 'C-12' && (
          <div className="space-y-5">
            {/* Header & Mutual Contract Hero */}
            <section className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary-container/15 border border-secondary-container/30 text-secondary text-xs font-medium">
                <span className="material-symbols-outlined text-[15px]">verified_user</span>
                <span>Digital Safety Transparency • Premium Shield</span>
              </div>
              <h2 className="font-headline text-2xl font-bold text-on-surface tracking-tight">
                Web &amp; Content Safety Rules
              </h2>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Hi {selectedChild.name}! Anchor helps keep harmful websites and scams away while keeping your personal thoughts, drawings, and everyday chats with friends private.
              </p>

              {/* Mutual Contract Card */}
              <div className="rounded-xl bg-surface-container p-4 border border-outline-variant/15 space-y-2.5">
                <h3 className="font-headline font-bold text-sm text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-lg">
                    handshake
                  </span>
                  <span>Our Mutual Contract: What Anchor Does &amp; Doesn&apos;t Do</span>
                </h3>
                <ul className="space-y-2 text-xs text-on-surface-variant">
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-secondary text-base shrink-0">
                      check_circle
                    </span>
                    <span>
                      <strong className="text-on-surface">Private stays private:</strong> Mom &amp; Dad do <span className="text-secondary underline">not</span> get a list of normal websites you read or private messages with friends.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-secondary text-base shrink-0">
                      check_circle
                    </span>
                    <span>
                      <strong className="text-on-surface">Automated shield:</strong> Filters automatically block 18+ adult sites, gambling scams, and malware links before they load.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-tertiary text-base shrink-0">
                      info
                    </span>
                    <span>
                      <strong className="text-on-surface">Safety flags only:</strong> Parents are only notified if a severe safety risk (like cyberbullying or phishing) is triggered.
                    </span>
                  </li>
                </ul>
              </div>
            </section>

            {/* 3 Active Filter Rule Cards */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono uppercase tracking-wider text-on-surface-variant font-semibold">
                  Active Filter Rules ({state.webFilter.profile})
                </h3>
                <span className="text-xs font-mono text-secondary">3 Shields Active</span>
              </div>

              {/* Rule 1: Web Safety & Search Guard */}
              <div className="rounded-xl bg-surface-container-low p-4 border border-outline-variant/15 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-primary text-xl">
                      travel_explore
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-on-surface">
                        Web Safety &amp; SafeSearch Guard
                      </h4>
                      <p className="text-[11px] text-on-surface-variant">
                        Chrome &amp; Samsung Internet • SafeSearch Enforced
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-status-enforced/15 text-status-enforced font-mono text-[10px] font-bold">
                    ACTIVE
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-status-failed/15 text-error font-mono">
                    ✕ 18+ Adult Content
                  </span>
                  <span className="px-2 py-0.5 rounded bg-status-failed/15 text-error font-mono">
                    ✕ Phishing &amp; Gambling
                  </span>
                  <span className="px-2 py-0.5 rounded bg-status-enforced/15 text-secondary font-mono">
                    ✓ Wikipedia, Coding &amp; School
                  </span>
                </div>
              </div>

              {/* Rule 2: Social & In-Game Messaging */}
              <div className="rounded-xl bg-surface-container-low p-4 border border-outline-variant/15 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-tertiary text-xl">
                      mark_chat_read
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-on-surface">
                        Social &amp; In-Game Chat Guard
                      </h4>
                      <p className="text-[11px] text-on-surface-variant">
                        Roblox ({state.socialFilter.robloxChatMode}) • WhatsApp Approved Family
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDadPactNote(!showDadPactNote)}
                    className="text-[11px] text-primary hover:underline cursor-pointer"
                  >
                    {showDadPactNote ? 'Hide Pact' : 'View Dad Pact'}
                  </button>
                </div>
                {showDadPactNote && (
                  <div className="p-2.5 rounded-lg bg-surface-container text-xs text-on-surface-variant border border-outline-variant/15">
                    💬 <strong className="text-on-surface">Pact with Dad:</strong> Roblox chat is set to Friends-Only so strangers cannot send scam trade links.
                  </div>
                )}
              </div>
            </section>

            {/* Collaborative Website Whitelist Appeal Form */}
            <section className="rounded-2xl bg-surface-container p-4 border border-primary/25 space-y-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">
                  add_moderator
                </span>
                <h3 className="font-headline font-bold text-sm text-on-surface">
                  Believe a site is wrongly blocked?
                </h3>
              </div>
              <p className="text-xs text-on-surface-variant">
                Submit a whitelist petition to Sarah &amp; Mark if a school or hobby site is blocked by mistake.
              </p>

              <div className="space-y-2.5">
                <input
                  type="text"
                  value={websiteAppealDomain}
                  onChange={(e) => setWebsiteAppealDomain(e.target.value)}
                  placeholder="e.g., scratch.mit.edu or chesskid.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/25 text-xs text-on-surface font-mono outline-none focus:border-primary"
                />
                <div className="flex items-center gap-2">
                  <select
                    value={websiteAppealReason}
                    onChange={(e) => setWebsiteAppealReason(e.target.value)}
                    className="flex-1 px-3 py-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/25 text-xs text-on-surface outline-none"
                  >
                    <option value="school">Needed for school homework / research</option>
                    <option value="coding">Coding, robotics, or creative hobby</option>
                    <option value="safe">Safe site blocked by mistake</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const domain = websiteAppealDomain.trim() || 'scratch.mit.edu';
                      onUpdateState(
                        (prev) => ({
                          ...prev,
                          requests: [
                            {
                              id: `req-web-${Date.now()}`,
                              childId: selectedChild.id,
                              childName: selectedChild.name,
                              type: 'WEBSITE_UNBLOCK',
                              targetName: domain,
                              targetCategory: 'Web & Browsers',
                              requestedMinutes: 0,
                              reasonCategory: 'Website Whitelist Petition',
                              childNote: `Requesting unblock for ${domain} (${websiteAppealReason})`,
                              createdAtLabel: 'Just now',
                              status: 'PENDING',
                              decidedBy: null,
                              parentNote: null,
                            },
                            ...prev.requests,
                          ],
                        }),
                        `${selectedChild.name} petitioned to whitelist ${domain}`
                      );
                      setWebsiteAppealDomain('');
                      notifyChild(`Submitted whitelist petition for "${domain}" to Sarah & Mark!`);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold shrink-0 cursor-pointer"
                  >
                    Submit Petition
                  </button>
                </div>
              </div>

              {/* Recent Petition Status */}
              <div className="pt-2 border-t border-outline-variant/15 space-y-1.5">
                <div className="text-[10px] font-mono uppercase text-on-surface-variant">
                  Recent Petition Status
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-on-surface">robotics-curriculum.mit.edu</span>
                  <span className="px-2 py-0.5 rounded bg-status-enforced/15 text-status-enforced font-mono text-[10px] font-bold">
                    APPROVED BY MOM
                  </span>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* =====================================================================
            C-13: INCOMING LIVE CONSENT PROMPT (13 child code.html)
           ===================================================================== */}
        {activeScreen === 'C-13' && (
          <div className="space-y-4">
            {/* High-Visibility Amber Consent Header Banner */}
            <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-tertiary-container/15 border border-tertiary-container/40">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-tertiary-container" />
                </span>
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-tertiary">
                  Live Request Pending • Audit #{(state.liveSession.sessionId || 'LIV-84920').replace(/^#/, '')}
                </span>
              </div>
              <span className="font-mono text-xs text-on-surface-variant bg-surface-container-highest px-2 py-0.5 rounded">
                Max 10:00
              </span>
            </div>

            {/* Main Consent Card */}
            <section className="rounded-2xl bg-surface-container border border-outline-variant/25 overflow-hidden shadow-2xl">
              <div className="p-5 pb-4 bg-gradient-to-b from-surface-container-high to-surface-container border-b border-outline-variant/15">
                <div className="flex items-start gap-4">
                  <div className="relative shrink-0">
                    <img
                      src={MOM_AVATAR_URL}
                      alt="Sarah Jenkins"
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-tertiary"
                    />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-tertiary-container text-on-tertiary-container flex items-center justify-center shadow">
                      <span
                        className="material-symbols-outlined text-sm"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        cast_connected
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary-container/30 text-primary text-[11px] font-medium mb-1">
                      <span className="material-symbols-outlined text-xs">verified</span>
                      Guardian Authorization: {state.liveSession.requestedByGuardianName || 'Sarah Jenkins (Mom)'}
                    </div>
                    <h2 className="font-headline font-bold text-lg text-on-surface leading-snug">
                      Mom is requesting a temporary Live Check-In
                    </h2>
                    <p className="text-xs text-on-surface-variant mt-1">
                      Reason provided:{' '}
                      <span className="text-on-surface font-medium">
                        &ldquo;{state.liveSession.reason || 'Study hour focus verification'}&rdquo;
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* 5-Item Ephemeral Disclosure List */}
              <div className="p-4 space-y-2.5">
                <div className="text-[11px] font-mono uppercase tracking-wider text-on-surface-variant font-semibold">
                  What will be shared if approved (Strict Ephemeral Mode)
                </div>

                {[
                  {
                    icon: 'screen_share',
                    title: 'Screen View',
                    val: 'Real-time view of your current screen (Mode: ' + state.liveSession.mode + ')',
                  },
                  {
                    icon: 'graphic_eq',
                    title: 'Ambient Audio Check',
                    val: '2-Way Talk is OFF unless you tap to talk with Mom',
                  },
                  {
                    icon: 'timer',
                    title: 'Session Duration',
                    val: 'Automatically ends after 10 minutes max',
                  },
                  {
                    icon: 'receipt_long',
                    title: 'Mutual Audit Log',
                    val: 'Logged permanently in both your Privacy Dashboard and Mom’s',
                  },
                  {
                    icon: 'cloud_off',
                    title: 'No Secret Storage',
                    val: 'Zero video or audio is ever recorded or saved to the cloud',
                  },
                ].map((row) => (
                  <div
                    key={row.title}
                    className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/10 flex items-center gap-3 text-xs"
                  >
                    <span className="material-symbols-outlined text-tertiary text-lg shrink-0">
                      {row.icon}
                    </span>
                    <div>
                      <span className="font-semibold text-on-surface">{row.title}: </span>
                      <span className="text-on-surface-variant">{row.val}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Equal-Weight Approve & Decline Buttons */}
              <div className="p-4 pt-2 bg-surface-container-low border-t border-outline-variant/15 space-y-2.5">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateState(
                        (prev) => ({
                          ...prev,
                          liveSession: transitionLiveSession(prev.liveSession, {
                            type: 'CHILD_APPROVE',
                          }).next,
                          consentHistory: [
                            createConsentHistoryEntry(
                              prev.liveSession,
                              selectedChild.name,
                              'APPROVED',
                              'Just now'
                            ),
                            ...(prev.consentHistory || []),
                          ],
                        }),
                        `${selectedChild.name} approved temporary Live Check-In`
                      );
                      notifyChild('Live Check-In approved! Persistent banner is now active.');
                      onSelectScreen('C-14');
                    }}
                    className="py-3 px-4 rounded-xl bg-status-enforced text-on-secondary font-headline font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">check_circle</span>
                    <span>Approve (10m max)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateState(
                        (prev) => ({
                          ...prev,
                          liveSession: transitionLiveSession(prev.liveSession, {
                            type: 'CHILD_DECLINE',
                          }).next,
                          consentHistory: [
                            createConsentHistoryEntry(
                              prev.liveSession,
                              selectedChild.name,
                              'DENIED',
                              'Just now'
                            ),
                            ...(prev.consentHistory || []),
                          ],
                        }),
                        `${selectedChild.name} declined Live Check-In`
                      );
                      notifyChild('Live Check-In declined. Sarah was notified respectfully.');
                      onSelectScreen('C-03');
                    }}
                    className="py-3 px-4 rounded-xl bg-surface-container-high hover:bg-surface-bright text-on-surface font-headline font-bold text-xs border border-outline-variant/30 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">cancel</span>
                    <span>Decline Request</span>
                  </button>
                </div>
                <p className="text-[11px] text-center text-on-surface-variant">
                  🔒 Anchor Anti-Surveillance Guarantee: You can stop the session at any second on the next screen.
                </p>
              </div>
            </section>
          </div>
        )}

        {/* =====================================================================
            C-14: ACTIVE LIVE SESSION CHILD VIEW (14 child code.html)
           ===================================================================== */}
        {activeScreen === 'C-14' && (
          <div className="space-y-4">
            {/* Persistent High-Visibility Amber Status Banner */}
            <section className="rounded-2xl bg-tertiary-container/20 border-2 border-tertiary p-4 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-tertiary animate-ping" />
                  <span className="font-mono font-bold text-xs uppercase tracking-wider text-tertiary">
                    Live Check Active • {liveMinsFormatted} left
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded bg-black/30 font-mono text-[11px] text-on-surface">
                  #LIV-84920
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <img
                    src={MOM_AVATAR_URL}
                    alt="Sarah"
                    className="w-9 h-9 rounded-full object-cover border border-tertiary"
                  />
                  <div>
                    <h2 className="font-headline font-bold text-sm text-on-surface">
                      Sarah Jenkins (Mom) is viewing
                    </h2>
                    <p className="text-[11px] text-on-surface-variant">
                      Mode: {audioOnlyRequested ? 'Audio-Only Check' : 'Screen Mirror + Calm Audio'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sovereign Child Stop Button */}
              <button
                type="button"
                onClick={() => {
                  onUpdateState(
                    (prev) => ({
                      ...prev,
                      liveSession: transitionLiveSession(prev.liveSession, {
                        type: 'STOP_SESSION',
                        actor: 'CHILD',
                      }).next,
                    }),
                    `${selectedChild.name} stopped the active Live Session`
                  );
                  notifyChild('Live Check-In stopped immediately.');
                  onSelectScreen('C-03');
                }}
                className="w-full py-3.5 px-4 rounded-xl bg-status-failed text-white font-headline font-extrabold text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 hover:brightness-110 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">stop_circle</span>
                <span>Stop Live Session Now</span>
              </button>
            </section>

            {/* What Mom Sees Right Now (Khan Academy Active Mirror Preview) */}
            <section className="rounded-2xl bg-surface-container p-4 border border-outline-variant/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-on-surface-variant font-semibold">
                  What Mom Sees Right Now (Active Mirror)
                </span>
                <span className="font-mono text-[11px] text-status-enforced">Zero Cloud Recording</span>
              </div>

              {/* Simulated Khan Academy Algebra Screen Preview */}
              <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/25 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-outline-variant/15 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-status-enforced text-lg">
                      school
                    </span>
                    <span className="text-xs font-bold text-on-surface">
                      Khan Academy • Grade 6 Pre-Algebra
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-secondary">Problem 4 of 5</span>
                </div>
                <div className="p-3 rounded-lg bg-surface-container-low font-mono text-xs text-on-surface space-y-1">
                  <div className="text-on-surface-variant text-[11px]">Solve for x:</div>
                  <div className="text-sm font-bold text-primary">3x + 12 = 36 → x = 8 ✓</div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2 rounded bg-surface-container text-on-surface-variant">
                    Ambient Audio: <strong className="text-secondary">38 dB (Calm room)</strong>
                  </div>
                  <div className="p-2 rounded bg-surface-container text-on-surface-variant">
                    Cloud Storage: <strong className="text-secondary">Zero Saved Video</strong>
                  </div>
                </div>
              </div>

              {/* Quick Messages to Mom */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => notifyChild('Sent quick note to Mom: "I am doing homework now!"')}
                  className="py-2.5 px-3 rounded-xl bg-surface-container-high hover:bg-surface-bright text-xs font-semibold text-on-surface border border-outline-variant/20 cursor-pointer"
                >
                  👋 &ldquo;I am doing homework!&rdquo;
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAudioOnlyRequested(!audioOnlyRequested);
                    notifyChild('Switched to Audio-Only mode with Mom.');
                  }}
                  className="py-2.5 px-3 rounded-xl bg-surface-container-high hover:bg-surface-bright text-xs font-semibold text-tertiary border border-tertiary/30 cursor-pointer"
                >
                  🎙️ {audioOnlyRequested ? 'Audio-Only Active' : 'Request Audio-Only Mode'}
                </button>
              </div>
            </section>
          </div>
        )}

        {/* =====================================================================
            C-15: OFFLINE MODE & SAFE RECONNECTION (15 child code.html)
           ===================================================================== */}
        {activeScreen === 'C-15' && (
          <div className="space-y-5">
            {/* Offline Mode Hero Banner */}
            <section className="relative overflow-hidden rounded-2xl bg-surface-container-low border border-tertiary/25 p-5 shadow-lg">
              <div className="relative z-10 flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-tertiary-container/15 border border-tertiary/30 flex items-center justify-center shrink-0 text-tertiary">
                  <span
                    className="material-symbols-outlined text-2xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    cloud_off
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-tertiary-container/15 text-tertiary text-[11px] font-semibold tracking-wide uppercase mb-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
                    Offline Mode • Local Rules Active
                  </div>
                  <h2 className="font-headline font-bold text-lg text-on-surface leading-snug">
                    Your phone isn&apos;t connected to the internet right now
                  </h2>
                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                    Don&apos;t worry, {selectedChild.name}! You&apos;re not in trouble. Your daily timers and safety tools are saved right on your phone until Wi-Fi or cellular comes back.
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3.5 border-t border-outline-variant/15 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                  <span className="material-symbols-outlined text-[16px] text-secondary">
                    history
                  </span>
                  <span>
                    Data timestamp: <strong className="font-mono text-on-surface">3:45 PM (Cached)</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsCheckingWifi(true);
                    setTimeout(() => {
                      setIsCheckingWifi(false);
                      onUpdateState(
                        (prev) => ({
                          ...prev,
                          children: prev.children.map((c) =>
                            c.id === selectedChild.id
                              ? { ...c, online: true, lastSyncLabel: 'Synced just now' }
                              : c
                          ),
                        }),
                        `Reconnected ${selectedChild.name}'s device and flushed offline queue`
                      );
                      notifyChild('Wi-Fi Reconnected! Flushed 2 pending items to Sarah & Mark.');
                    }, 900);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-container text-on-primary-container font-semibold text-xs cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">refresh</span>
                  <span>{isCheckingWifi ? 'Scanning Wi-Fi...' : 'Check Now'}</span>
                </button>
              </div>
            </section>

            {/* What Still Works Right Now */}
            <section className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant">
                  What Still Works Right Now
                </h3>
                <span className="text-[11px] font-mono text-secondary flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">verified_user</span>
                  On-Device SQLite Active
                </span>
              </div>

              <div className="rounded-xl bg-surface-container p-4 border border-outline-variant/15 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-on-surface">
                      Local Screen Timers &amp; Bedtime
                    </h4>
                    <p className="text-[11px] text-on-surface-variant">
                      {formatMinutesHuman(metrics.remainingMinutes)} left today • Bedtime at 8:30 PM
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-status-enforced/15 text-status-enforced font-mono text-[10px] font-bold">
                    ENFORCED LOCALLY
                  </span>
                </div>

                {/* Offline-Ready Apps 2x2 Grid */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {[
                    { icon: 'school', name: 'Khan Academy Offline' },
                    { icon: 'menu_book', name: 'Kindle & PDF Reader' },
                    { icon: 'Calculate', name: 'Calculator & Notes' },
                    { icon: 'call', name: 'Carrier Voice & SMS' },
                  ].map((app) => (
                    <div
                      key={app.name}
                      className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/10 flex items-center gap-2 text-xs text-on-surface"
                    >
                      <span className="material-symbols-outlined text-secondary text-base">
                        {app.icon.toLowerCase()}
                      </span>
                      <span className="truncate font-medium">{app.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Emergency SOS Always Ready (Carrier SMS Fallback) */}
              <div className="rounded-xl bg-error-container/15 p-4 border border-status-failed/30 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-error flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base">sos</span>
                    <span>Emergency SOS (Always Ready Offline)</span>
                  </h4>
                  <p className="text-[11px] text-on-surface-variant">
                    Uses cellular SMS fallback to send your GPS coordinates to Mom &amp; Dad even without Wi-Fi.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOfflineSosModal(true)}
                  className="px-3 py-2 rounded-xl bg-status-failed text-white text-xs font-bold shrink-0 cursor-pointer"
                >
                  SOS Options
                </button>
              </div>
            </section>

            {/* Sync Queue (2 Pending) */}
            <section className="rounded-2xl bg-surface-container p-4 border border-outline-variant/15 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="font-headline font-bold text-sm text-on-surface">
                  Encrypted Local Sync Queue (2 Pending)
                </h3>
                <span className="text-[11px] font-mono text-tertiary">Auto-sends on Wi-Fi</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/10 flex items-center justify-between">
                  <span>1. Extra Time Request (+15m Minecraft)</span>
                  <span className="font-mono text-[10px] text-status-pending">QUEUED</span>
                </div>
                <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/10 flex items-center justify-between">
                  <span>2. Chore Completed: Walk Daisy 🐕 (+10 pts)</span>
                  <span className="font-mono text-[10px] text-status-pending">QUEUED</span>
                </div>
              </div>
            </section>

            {/* Offline SOS Modal */}
            {showOfflineSosModal && (
              <div className="fixed inset-0 z-50 bg-surface-container-lowest/85 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="w-full max-w-sm rounded-2xl bg-surface-container-high border border-status-failed p-5 space-y-4">
                  <h3 className="font-headline font-bold text-base text-on-surface">
                    Offline Carrier SMS Alert &amp; Siren
                  </h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Even without Wi-Fi, your Galaxy A34 can transmit an encrypted SMS beacon with your last GPS fix (±{selectedChild.gpsAccuracyMeters}m) to Sarah &amp; Mark.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowOfflineSosModal(false)}
                      className="flex-1 py-2.5 rounded-xl bg-surface-container text-xs text-on-surface-variant cursor-pointer"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowOfflineSosModal(false);
                        dispatchEmergencySos(true);
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-status-failed text-white text-xs font-bold cursor-pointer"
                    >
                      Send Carrier SMS Test
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Navigation Bar matching Stitch Child App */}
      <nav className="sticky bottom-0 z-30 bg-surface/95 backdrop-blur-xl border-t border-outline-variant/15 px-2 h-16 flex items-center justify-around shrink-0">
        {[
          {
            label: 'Today',
            icon: 'schedule',
            target: 'C-03' as ChildScreenId,
            active: ['C-03', 'C-04', 'C-05'].includes(activeScreen),
          },
          {
            label: 'Requests',
            icon: 'chat_bubble',
            target: 'C-06' as ChildScreenId,
            active: ['C-06', 'C-07'].includes(activeScreen),
          },
          {
            label: 'Safety',
            icon: 'emergency',
            target: 'C-08' as ChildScreenId,
            active: activeScreen === 'C-08',
          },
          {
            label: 'Chat',
            icon: 'forum',
            target: 'C-09' as ChildScreenId,
            active: activeScreen === 'C-09',
          },
          {
            label: 'Wellbeing',
            icon: 'insights',
            target: 'C-10' as ChildScreenId,
            active: activeScreen === 'C-10',
          },
          {
            label: 'Privacy',
            icon: 'shield_lock',
            target: 'C-11' as ChildScreenId,
            active: ['C-11', 'C-12', 'C-13', 'C-14', 'C-15'].includes(activeScreen),
          },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onSelectScreen(item.target)}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2.5 rounded-xl transition-colors cursor-pointer ${
              item.active
                ? 'text-status-enforced font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span
              className="material-symbols-outlined text-[21px]"
              style={item.active ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {item.icon}
            </span>
            <span className="text-[10px] tracking-tight">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};
