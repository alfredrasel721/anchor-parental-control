import React, { useState } from 'react';
import {
  AnchorHouseholdState,
  calculateScreenTimeMetrics,
  canGuardianPerformAction,
  ConsentOutcome,
  createConsentHistoryEntry,
  evaluateBatteryTelemetry,
  evaluateSyncHealth,
  filterConsentHistory,
  formatMinutesHuman,
  GuardianRole,
  isFeatureEntitled,
  LiveSessionMode,
  SubscriptionTier,
  transitionLiveSession,
} from '../utils/anchorLogic';
import { createInitialHouseholdState } from '../data/initialHouseholdState';
import { ManageSubscription } from './ManageSubscription';

export type ParentScreenId =
  | 'P-01'
  | 'P-02'
  | 'P-03'
  | 'P-04'
  | 'P-05'
  | 'P-06'
  | 'P-07'
  | 'P-08'
  | 'P-09'
  | 'P-10'
  | 'P-11'
  | 'P-12'
  | 'P-13'
  | 'P-14'
  | 'P-15'
  | 'P-16'
  | 'P-17'
  | 'P-18'
  | 'P-19'
  | 'P-20';

export interface ParentScreenMeta {
  id: ParentScreenId;
  title: string;
  shortTitle: string;
  subtitle: string;
  stitchFile: string;
  isPremium?: boolean;
}

export const PARENT_SCREENS: ParentScreenMeta[] = [
  { id: 'P-01', title: 'Sign-In & Biometrics', shortTitle: 'Sign-In', subtitle: 'Guardian Passkey & Biometric Auth', stitchFile: '/assets/aistudio/1_parent_code_afc79743.html' },
  { id: 'P-02', title: 'Household Setup', shortTitle: 'Setup', subtitle: 'Step 1 of 3 • Trust Pact Onboarding', stitchFile: '/assets/aistudio/2_parent_code_b83219a2.html' },
  { id: 'P-03', title: 'Pair Child Device', shortTitle: 'Pairing', subtitle: '6-Digit Code & QR Handshake', stitchFile: '/assets/aistudio/3_parent_code_6d226c2a.html' },
  { id: 'P-04', title: 'Family Dashboard', shortTitle: 'Dashboard', subtitle: 'Live Screen Allowance & Safety Feed', stitchFile: '/assets/aistudio/4_parent_code_9799138a.html' },
  { id: 'P-05', title: 'Child Device Status', shortTitle: 'Device', subtitle: 'Knox Shield & Hardware Telemetry', stitchFile: '/assets/aistudio/5_parent_code_50b82b28.html' },
  { id: 'P-06', title: 'Screen-Time Analytics', shortTitle: 'Analytics', subtitle: '7-Day Balance & Rhythm Trends', stitchFile: '/assets/aistudio/6_parent_code_a8b81e9c.html' },
  { id: 'P-07', title: 'App Usage & Limits', shortTitle: 'App Limits', subtitle: 'Category Caps & App Rules', stitchFile: '/assets/aistudio/7_parent_code_0f066acc.html' },
  { id: 'P-08', title: 'Schedules & Downtime', shortTitle: 'Schedules', subtitle: '24-Hour Rhythm & Quiet Time', stitchFile: '/assets/aistudio/8_parent_code_cbdc0496.html' },
  { id: 'P-09', title: 'Location & Geofences', shortTitle: 'Location', subtitle: 'Live GPS (±4m) & Safe Zones', stitchFile: '/assets/aistudio/9_parent_code_6febc360.html' },
  { id: 'P-10', title: 'Alerts & SOS Activity', shortTitle: 'SOS Alerts', subtitle: 'Safety Sentinel & Drill Log', stitchFile: '/assets/aistudio/10_parent_code_a412caac.html' },
  { id: 'P-11', title: 'Extra Time Requests', shortTitle: 'Requests', subtitle: 'Family Accountability Inbox', stitchFile: '/assets/aistudio/11_parent_code_fee0c2d0.html' },
  { id: 'P-12', title: 'Family Chat & Tasks', shortTitle: 'Chat/Tasks', subtitle: 'Shared Pacts & Trust Rewards', stitchFile: '/assets/aistudio/12_parent_code_62e2a0a7.html' },
  { id: 'P-13', title: 'Guardians & Contacts', shortTitle: 'Guardians', subtitle: 'Separation of Powers RBAC', stitchFile: '/assets/aistudio/13_parent_code_0c253a42.html' },
  { id: 'P-14', title: 'Privacy & Data Rights', shortTitle: 'Privacy', subtitle: 'GDPR / COPPA Tier-A & Shred', stitchFile: '/assets/aistudio/14_parent_code_de43c2af.html' },
  { id: 'P-15', title: 'Premium & Billing', shortTitle: 'Billing', subtitle: 'Google Play Subscriptions', stitchFile: '/assets/aistudio/15_parent_code_71b2eef3.html' },
  { id: 'P-16', title: 'Web & Content Filters', shortTitle: 'Web Filter', subtitle: 'Knox Private DNS & SafeSearch', stitchFile: '/assets/aistudio/16_parent_code_da1a8a54.html', isPremium: true },
  { id: 'P-17', title: 'Social Media Filters', shortTitle: 'Social', subtitle: 'Supervised Play & Short-Form Caps', stitchFile: '/assets/aistudio/17_parent_code_531ee6c8.html', isPremium: true },
  { id: 'P-18', title: 'Notification Filter', shortTitle: 'Notifs', subtitle: 'Study Focus & Batching', stitchFile: '/assets/aistudio/18_parent_code_f33e7b96.html', isPremium: true },
  { id: 'P-19', title: 'Active Live Session', shortTitle: 'Live View', subtitle: 'Consent-First Screen/Cam/Audio', stitchFile: '/assets/aistudio/19_parent_code_d5f932cb.html', isPremium: true },
  { id: 'P-20', title: 'Knox Diagnostics', shortTitle: 'Knox Diag', subtitle: 'Hardware Attestation & Self-Test', stitchFile: '/assets/aistudio/20_parent_code_0d247715.html' },
];

export interface ParentAppViewportProps {
  state: AnchorHouseholdState;
  activeScreen: ParentScreenId;
  onSelectScreen: (screen: ParentScreenId) => void;
  activeGuardianRole: GuardianRole;
  onChangeGuardianRole: (role: GuardianRole) => void;
  onUpdateState: (updater: (prev: AnchorHouseholdState) => AnchorHouseholdState, actionNote?: string) => void;
  onGoogleSignIn: () => void;
  currentUserEmail: string | null;
  onOpenStitchHtml?: (stitchUrl: string) => void;
  onSignOut?: () => void;
}

const SARAH_AVATAR =
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=160&q=80';
const LEO_AVATAR =
  'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=160&q=80';
const MAYA_AVATAR =
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=160&q=80';
const MARK_AVATAR =
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80';

export const ParentAppViewport: React.FC<ParentAppViewportProps> = ({
  state: household,
  activeScreen,
  onSelectScreen,
  activeGuardianRole,
  onChangeGuardianRole,
  onUpdateState: onUpdateHousehold,
  onOpenStitchHtml = () => {},
  currentUserEmail: userEmail,
  onGoogleSignIn,
  onSignOut = () => {},
}) => {
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // P-01 Sign-in states
  const [loginEmail, setLoginEmail] = useState(userEmail || 'sarah.jenkins@family-anchor.org');
  const [loginPass, setLoginPass] = useState('••••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [biometricUnlocked, setBiometricUnlocked] = useState(false);

  // P-02 Onboarding states
  const [draftHouseholdName, setDraftHouseholdName] = useState(household.householdName);
  const [guardianPreferredName, setGuardianPreferredName] = useState('Sarah Jenkins');
  const [selectedRelationChip, setSelectedRelationChip] = useState<'Mother' | 'Father' | 'Legal Guardian' | 'Co-Parent'>('Mother');
  const [notificationCadence, setNotificationCadence] = useState<'INSTANT' | 'DAILY' | 'WEEKLY'>('INSTANT');
  const [pledgeNoKeylogger, setPledgeNoKeylogger] = useState(true);
  const [pledgeOpenBoundaries, setPledgeOpenBoundaries] = useState(true);
  const [newChildName, setNewChildName] = useState('');
  const [newChildAge, setNewChildAge] = useState('10');
  const [showAddChildForm, setShowAddChildForm] = useState(false);

  // P-03 Pairing states
  const [pairingTab, setPairingTab] = useState<'CODE' | 'QR'>('CODE');
  const [codeCopied, setCodeCopied] = useState(false);

  // P-05 Device Pause Modal
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pauseDurationChoice, setPauseDurationChoice] = useState<'1 Hour' | 'Rest of Day' | 'Until Resumed'>('1 Hour');

  // P-06 Analytics states
  const [analyticsRange, setAnalyticsRange] = useState<'Today' | '7 Days' | '30 Days' | 'Custom'>('7 Days');

  // P-07 App Usage & Limits states
  const [p07SubTab, setP07SubTab] = useState<'CATEGORIES' | 'INDIVIDUAL' | 'DOWNTIME'>('CATEGORIES');
  const [showAddAppModal, setShowAddAppModal] = useState(false);
  const [newAppRuleName, setNewAppRuleName] = useState('');
  const [newAppRuleLimit, setNewAppRuleLimit] = useState('45');

  // P-08 Schedules states
  const [instantQuietDuration, setInstantQuietDuration] = useState<'30m' | '1h' | 'Until Bed'>('30m');

  // P-09 Location & Geofence states
  const [mapMode, setMapMode] = useState<'MAP' | 'SAT'>('MAP');
  const [showAddGeofenceForm, setShowAddGeofenceForm] = useState(false);
  const [newGeoName, setNewGeoName] = useState('');
  const [newGeoAddress, setNewGeoAddress] = useState('');
  const [newGeoRadius, setNewGeoRadius] = useState(250);

  // P-10 Alerts & SOS states
  const [alertFilter, setAlertFilter] = useState<'ALL' | 'EMERGENCY_SOS' | 'GEOFENCE' | 'DEVICE_HEALTH'>('ALL');
  const [showSosDrillModal, setShowSosDrillModal] = useState(false);
  const [playingSosAudioId, setPlayingSosAudioId] = useState<string | null>(null);

  // P-12 Family Chat & Tasks states
  const [p12Tab, setP12Tab] = useState<'CHAT' | 'TASKS'>('CHAT');
  const [chatDraft, setChatDraft] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskBonus, setNewTaskBonus] = useState(15);
  const [showAddTaskForm, setShowAddTaskForm] = useState(false);

  // P-13 Guardians states
  const [newGuardianName, setNewGuardianName] = useState('');
  const [newGuardianRelation, setNewGuardianRelation] = useState('Grandparent');
  const [newGuardianRole, setNewGuardianRole] = useState<GuardianRole>('TRUSTED_EMERGENCY_CONTACT');
  const [showAddGuardianModal, setShowAddGuardianModal] = useState(false);

  // P-14 Privacy & Deletion states
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // P-15 Billing & ManageSubscription modal states
  const [selectedPlanOption, setSelectedPlanOption] = useState<'annual_trial' | 'monthly_premium'>('annual_trial');
  const [showManageSubscriptionModal, setShowManageSubscriptionModal] = useState(false);

  // P-16 Web Filter states
  const [newDomainInput, setNewDomainInput] = useState('');
  const [domainListMode, setDomainListMode] = useState<'WHITELIST' | 'BLACKLIST'>('WHITELIST');
  const [showChildBlockPreviewModal, setShowChildBlockPreviewModal] = useState(false);

  // P-19 Live Session & Consent History states
  const [liveReasonInput, setLiveReasonInput] = useState('Study hour focus verification');
  const [consentFilter, setConsentFilter] = useState<'ALL' | ConsentOutcome>('ALL');

  // P-20 Diagnostics & Real-Time Sync Health states
  const [selfTestRunning, setSelfTestRunning] = useState(false);
  const [lastSelfTestLabel, setLastSelfTestLabel] = useState('Verified 2m ago • 142ms RTT');
  const [biometricPrefEnabled, setBiometricPrefEnabled] = useState(true);
  const [weeklyDigestPrefEnabled, setWeeklyDigestPrefEnabled] = useState(true);
  const [simulatedLatencyMs, setSimulatedLatencyMs] = useState<number>(38);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  const activeChild =
    household.children.find((c) => c.id === household.selectedChildId) || household.children[0];
  const screenMetrics = calculateScreenTimeMetrics(
    activeChild.usedMinutesToday,
    activeChild.dailyAllowanceMinutes
  );
  const childApps = household.apps.filter((a) => a.childId === activeChild.id);
  const childSchedules = household.schedules.filter((s) => s.childId === activeChild.id);
  const pendingRequests = household.requests.filter((r) => r.status === 'PENDING');
  const pendingRuleSyncCount = childApps.filter((a) => a.syncStatus === 'Pending Sync').length;
  const syncHealth = evaluateSyncHealth(
    activeChild.online,
    simulatedLatencyMs,
    pendingRuleSyncCount
  );
  const batteryTelemetry = evaluateBatteryTelemetry(
    activeChild.deviceBatteryLevel ?? household.deviceBatteryLevel ?? activeChild.batteryPercent,
    activeChild.lastKnownBatterySync ?? household.lastKnownBatterySync ?? activeChild.lastSyncLabel,
    activeChild.isCharging
  );
  const currentMeta = PARENT_SCREENS.find((s) => s.id === activeScreen) || PARENT_SCREENS[3];

  const canEditRules = canGuardianPerformAction(activeGuardianRole, 'EDIT_SCHEDULES_AND_LIMITS');
  const canApproveTime = canGuardianPerformAction(activeGuardianRole, 'APPROVE_EXTRA_TIME');
  const canManageGuardians = canGuardianPerformAction(activeGuardianRole, 'MANAGE_GUARDIANS');
  const canDeleteHousehold = canGuardianPerformAction(activeGuardianRole, 'DELETE_HOUSEHOLD_DATA');

  const digits = household.pairingCode.replace(/[^0-9]/g, '').padEnd(6, '0').slice(0, 6).split('');

  const handleSelectChild = (childId: string) => {
    onUpdateHousehold((prev) => {
      const target = prev.children.find((c) => c.id === childId) || prev.children[0];
      return {
        ...prev,
        selectedChildId: childId,
        deviceBatteryLevel: target.deviceBatteryLevel ?? target.batteryPercent,
        lastKnownBatterySync: target.lastKnownBatterySync ?? target.lastSyncLabel,
      };
    }, 'Switched active child profile');
  };

  const regeneratePairingCode = () => {
    const random6 = Math.floor(100000 + Math.random() * 900000).toString();
    onUpdateHousehold((prev) => ({
      ...prev,
      pairingCode: random6,
      pairingExpiresAt: Date.now() + 10 * 60 * 1000,
    }), 'Generated new 6-digit pairing code');
    triggerToast(`New pairing code generated: ${random6.slice(0, 3)}-${random6.slice(3)}`);
  };

  const handleDecisionOnRequest = (
    reqId: string,
    decision: 'APPROVED' | 'DECLINED',
    bonusMinutesOverride?: number,
    note?: string
  ) => {
    if (!canApproveTime) {
      triggerToast('RBAC Restricted: Emergency contacts cannot approve screen-time requests.');
      return;
    }
    onUpdateHousehold((prev) => {
      const targetReq = prev.requests.find((r) => r.id === reqId);
      if (!targetReq) return prev;
      const grantMinutes = bonusMinutesOverride ?? targetReq.requestedMinutes;

      const updatedRequests = prev.requests.map((r) =>
        r.id === reqId
          ? {
              ...r,
              status: decision,
              decidedBy: activeGuardianRole === 'PRIMARY_ADMIN' ? 'Sarah (Mom)' : 'Mark (Dad)',
              parentNote:
                note ||
                (decision === 'APPROVED'
                  ? `Approved +${grantMinutes}m bonus`
                  : 'Declined — Let’s stick to our evening pact'),
            }
          : r
      );

      const updatedChildren =
        decision === 'APPROVED' && targetReq.type === 'EXTRA_TIME'
          ? prev.children.map((c) =>
              c.id === targetReq.childId
                ? { ...c, dailyAllowanceMinutes: c.dailyAllowanceMinutes + grantMinutes }
                : c
            )
          : prev.children;

      return {
        ...prev,
        requests: updatedRequests,
        children: updatedChildren,
      };
    }, `${decision === 'APPROVED' ? 'Approved' : 'Declined'} child request`);
    triggerToast(
      decision === 'APPROVED'
        ? 'Request approved & synced to child device!'
        : 'Request declined with gentle reason.'
    );
  };

  const isStackScreen =
    activeScreen === 'P-02' ||
    activeScreen === 'P-03' ||
    activeScreen === 'P-05' ||
    activeScreen === 'P-19';

  const allConsentEntries = household.consentHistory || [];
  const filteredConsentEntries = filterConsentHistory(allConsentEntries, consentFilter);

  const renderConsentHistoryPanel = (showFullControls = false) => (
    <section
      aria-label="Consent History"
      className="bg-surface rounded-3xl p-4 shadow-xs border border-outline-variant/20 space-y-3.5"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-secondary-container flex items-center justify-center text-secondary shrink-0">
            <span className="material-symbols-outlined text-[20px]">history_edu</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-headline font-bold text-sm text-on-surface">
                Consent History
              </h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-primary-fixed text-primary">
                {allConsentEntries.length} Logged
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant">
              Past child consent requests &amp; outcomes (Approved / Denied / Timed Out)
            </p>
          </div>
        </div>
        {!showFullControls && (
          <button
            type="button"
            onClick={() => onSelectScreen('P-19')}
            className="text-xs font-bold text-primary hover:underline shrink-0"
          >
            Open Live View
          </button>
        )}
      </div>

      {/* Filter Pills: All / Approved / Denied / Timed Out */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {(
          [
            { id: 'ALL', label: `All (${allConsentEntries.length})` },
            {
              id: 'APPROVED',
              label: `Approved (${allConsentEntries.filter((e) => e.outcome === 'APPROVED').length})`,
            },
            {
              id: 'DENIED',
              label: `Denied (${allConsentEntries.filter((e) => e.outcome === 'DENIED').length})`,
            },
            {
              id: 'TIMED_OUT',
              label: `Timed Out (${allConsentEntries.filter((e) => e.outcome === 'TIMED_OUT').length})`,
            },
          ] as const
        ).map((tab) => {
          const active = consentFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setConsentFilter(tab.id)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-colors ${
                active
                  ? 'bg-primary text-on-primary shadow-2xs'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Consent Request Outcome Rows */}
      <div className="space-y-2.5">
        {filteredConsentEntries.length === 0 ? (
          <div className="p-4 rounded-2xl bg-surface-container-low text-center text-xs text-on-surface-variant">
            No consent history entries match this filter.
          </div>
        ) : (
          filteredConsentEntries.map((entry) => {
            const isApproved = entry.outcome === 'APPROVED';
            const isDenied = entry.outcome === 'DENIED';
            const outcomeLabel = isApproved
              ? 'Approved'
              : isDenied
              ? 'Denied'
              : 'Timed Out';
            const outcomeStyle = isApproved
              ? 'bg-status-enforced/15 text-status-enforced'
              : isDenied
              ? 'bg-error-container text-error'
              : 'bg-status-pending/15 text-status-pending';
            const outcomeIcon = isApproved
              ? 'check_circle'
              : isDenied
              ? 'cancel'
              : 'schedule';
            const modeIcon =
              entry.mode === 'SCREEN'
                ? 'screen_share'
                : entry.mode === 'CAMERA'
                ? 'photo_camera_front'
                : 'graphic_eq';
            const modeLabel =
              entry.mode === 'SCREEN'
                ? 'Screen View'
                : entry.mode === 'CAMERA'
                ? 'Front Camera'
                : 'Ambient Audio';

            return (
              <div
                key={entry.id}
                className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/20 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-surface flex items-center justify-center text-primary border border-outline-variant/20 shrink-0">
                      <span className="material-symbols-outlined text-[18px]">{modeIcon}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-headline font-bold text-xs text-on-surface">
                          {entry.childName}
                        </span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-surface text-on-surface-variant border border-outline-variant/20">
                          {modeLabel}
                        </span>
                        <span className="text-[10px] font-mono text-outline">
                          {entry.sessionId}
                        </span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant truncate mt-0.5">
                        Reason: &ldquo;{entry.reason}&rdquo;
                      </p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${outcomeStyle}`}
                  >
                    <span
                      className="material-symbols-outlined text-[13px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {outcomeIcon}
                    </span>
                    <span>{outcomeLabel}</span>
                  </span>
                </div>

                <div className="pt-1.5 border-t border-outline-variant/15 flex items-center justify-between text-[10px] text-on-surface-variant">
                  <span>
                    By <strong className="text-on-surface">{entry.requestedByGuardianName}</strong> •{' '}
                    {entry.durationSummary}
                  </span>
                  <span className="font-mono shrink-0 ml-2">{entry.timestampLabel}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );

  return (
    <div className="flex flex-col h-full bg-background text-on-surface font-body select-none relative overflow-hidden">
      {/* Top App Bar (Material 3 Glassmorphism Header matching Stitch) */}
      <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur-xl border-b border-outline-variant/20 px-4 h-16 flex items-center justify-between shrink-0">
        {isStackScreen ? (
          <div className="flex items-center gap-3">
            <button
              onClick={() => onSelectScreen('P-04')}
              className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface hover:bg-surface-container-low transition-colors"
              title="Back to Family Dashboard"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div>
              <h1 className="font-headline font-bold text-[17px] tracking-tight text-on-surface leading-tight">
                {currentMeta.title}
              </h1>
              <p className="text-[11px] font-medium text-on-surface-variant leading-none mt-0.5">
                {currentMeta.subtitle}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onSelectScreen('P-04')}
              className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-on-primary shadow-sm"
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                anchor
              </span>
            </button>
            <div>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="font-headline font-extrabold text-[15px] sm:text-[16px] tracking-tight text-primary leading-none">
                  Anchor Parent
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-primary-fixed text-primary shrink-0">
                  {activeScreen}
                </span>
              </div>
              <p className="text-[11px] text-on-surface-variant font-medium truncate max-w-[130px] sm:max-w-[165px] mt-0.5">
                {currentMeta.title}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          {/* Child Switcher Chip */}
          <button
            type="button"
            onClick={() => {
              const nextChild =
                household.children.find((c) => c.id !== activeChild.id) || activeChild;
              handleSelectChild(nextChild.id);
              triggerToast(`Switched context to ${nextChild.name}`);
            }}
            className="flex items-center gap-1.5 bg-surface-container-low hover:bg-surface-container-high px-2 py-1 rounded-full transition-colors border border-outline-variant/20 cursor-pointer"
            title="Switch active child device"
          >
            <img
              src={activeChild.id === 'child-leo' ? LEO_AVATAR : MAYA_AVATAR}
              alt={activeChild.name}
              className="w-5 h-5 rounded-full object-cover"
            />
            <span className="text-xs font-semibold text-on-surface">
              {activeChild.name.split(' ')[0]}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-status-enforced"></span>
            <span className="material-symbols-outlined text-[15px] text-on-surface-variant">
              expand_more
            </span>
          </button>

          {/* Visual Battery Percentage Indicator in Parent View Header */}
          <button
            type="button"
            aria-label={batteryTelemetry.ariaDescription}
            onClick={() => onSelectScreen('P-05')}
            title={`${activeChild.name} Battery: ${batteryTelemetry.shortLabel} • ${batteryTelemetry.lastKnownBatterySync}`}
            className="flex items-center gap-1.5 bg-surface-container-low hover:bg-surface-container-high px-2 py-1 rounded-full transition-colors border border-outline-variant/20 cursor-pointer"
          >
            <span
              className={`material-symbols-outlined text-[16px] ${
                batteryTelemetry.status === 'CRITICAL'
                  ? 'text-error'
                  : batteryTelemetry.status === 'LOW'
                  ? 'text-status-pending'
                  : 'text-status-enforced'
              }`}
            >
              {batteryTelemetry.iconName}
            </span>
            <div className="flex flex-col items-start leading-none">
              <div className="flex items-center gap-1">
                <span className="font-mono text-[11px] font-bold text-on-surface">
                  {batteryTelemetry.shortLabel}
                </span>
                <div className="w-6 h-2 rounded-xs bg-surface-container-high border border-outline-variant/40 overflow-hidden p-0.5 hidden sm:block">
                  <div
                    className={`h-full rounded-2xs transition-all ${
                      batteryTelemetry.status === 'CRITICAL'
                        ? 'bg-error'
                        : batteryTelemetry.status === 'LOW'
                        ? 'bg-status-pending'
                        : 'bg-status-enforced'
                    }`}
                    style={{ width: `${batteryTelemetry.level}%` }}
                  />
                </div>
              </div>
              <span className="text-[9px] font-mono text-on-surface-variant hidden md:inline">
                {batteryTelemetry.lastKnownBatterySync}
              </span>
            </div>
          </button>

          {/* Manage Subscription Modal Trigger Button */}
          <button
            type="button"
            aria-label="Manage Subscription"
            onClick={() => setShowManageSubscriptionModal(true)}
            title={`Manage Subscription (Current: ${household.subscriptionTier})`}
            className="px-2 py-1 rounded-full bg-primary-fixed/60 hover:bg-primary-fixed text-primary border border-primary/20 text-[10px] font-headline font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[14px]">workspace_premium</span>
            <span className="hidden xl:inline">Manage Plan</span>
            <span className="font-mono uppercase text-[9px] bg-primary text-on-primary px-1.5 py-0.2 rounded-full">
              {household.subscriptionTier === 'free'
                ? 'Free'
                : household.subscriptionTier === 'annual_trial'
                ? 'Annual'
                : 'Monthly'}
            </span>
          </button>

          {/* Notification Bell with Pending Count */}
          <button
            type="button"
            onClick={() => onSelectScreen('P-11')}
            className="relative w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-low text-on-surface-variant transition-colors cursor-pointer"
            title="Extra Time & App Requests"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            {pendingRequests.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full ring-2 ring-surface"></span>
            )}
          </button>

          {/* Sarah Profile Avatar -> P-20 */}
          <button
            type="button"
            onClick={() => onSelectScreen('P-20')}
            className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant/40 shrink-0 cursor-pointer"
            title="Account & Knox Diagnostics (P-20)"
          >
            <img src={SARAH_AVATAR} alt="Sarah Jenkins" className="w-full h-full object-cover" />
          </button>
        </div>
      </header>

      {/* Quick 20-Screen Stitch Jump Strip + RBAC Role Indicator */}
      <div className="bg-surface border-b border-outline-variant/15 px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
        <select
          aria-label="Guardian Role Selector"
          value={activeGuardianRole}
          onChange={(e) => onChangeGuardianRole(e.target.value as GuardianRole)}
          className="text-[10px] font-bold bg-surface-container-low text-on-surface rounded-lg px-2 py-1 border border-outline-variant/30 shrink-0 cursor-pointer"
        >
          <option value="PRIMARY_ADMIN">Role: Sarah (Primary Admin)</option>
          <option value="CO_GUARDIAN_ADMIN">Role: Mark (Co-Guardian)</option>
          <option value="TRUSTED_EMERGENCY_CONTACT">Role: Grandma (SOS Contact)</option>
        </select>

        <div className="h-3.5 w-[1px] bg-outline-variant/30 mx-0.5 shrink-0" />

        {PARENT_SCREENS.map((scr) => {
          const active = scr.id === activeScreen;
          return (
            <button
              key={scr.id}
              onClick={() => onSelectScreen(scr.id)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap transition-all flex items-center gap-1 shrink-0 ${
                active
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              <span>{scr.id}</span>
              <span className="hidden sm:inline">{scr.title}</span>
            </button>
          );
        })}
      </div>

      {/* Real-Time Sync Health Indicator & Global Quick Actions Row */}
      <div className="bg-surface border-b border-outline-variant/20 px-3.5 py-2 space-y-2 shrink-0">
        {/* Sync Health Indicator Bar */}
        <div
          aria-label="Sync Health"
          className={`rounded-xl px-3 py-1.5 border flex items-center justify-between gap-2 text-[11px] transition-colors ${
            syncHealth.status === 'OPTIMAL'
              ? 'bg-status-enforced/8 border-status-enforced/25 text-on-surface'
              : syncHealth.status === 'DEGRADED'
              ? 'bg-status-pending/12 border-status-pending/30 text-on-surface'
              : 'bg-error-container/40 border-error/30 text-on-surface'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                syncHealth.status === 'OPTIMAL'
                  ? 'bg-status-enforced animate-pulse'
                  : syncHealth.status === 'DEGRADED'
                  ? 'bg-status-pending animate-ping'
                  : 'bg-error'
              }`}
            />
            <span className="font-headline font-bold uppercase tracking-wider text-[10px] shrink-0">
              Sync Health:
            </span>
            <span
              className={`font-mono font-bold truncate ${
                syncHealth.status === 'OPTIMAL'
                  ? 'text-status-enforced'
                  : syncHealth.status === 'DEGRADED'
                  ? 'text-status-pending'
                  : 'text-error'
              }`}
            >
              {syncHealth.headline}
            </span>
            <span className="hidden sm:inline text-on-surface-variant truncate">
              • {syncHealth.detail}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {syncHealth.status !== 'OPTIMAL' && (
              <button
                type="button"
                onClick={() => {
                  setSimulatedLatencyMs(36);
                  onUpdateHousehold(
                    (prev) => ({
                      ...prev,
                      children: prev.children.map((c) =>
                        c.id === activeChild.id
                          ? { ...c, online: true, lastSyncLabel: 'Synced just now' }
                          : c
                      ),
                      apps: prev.apps.map((a) =>
                        a.childId === activeChild.id ? { ...a, syncStatus: 'Synced' } : a
                      ),
                    }),
                    'Restored optimal Parent-Child APK sync link'
                  );
                  triggerToast('FCM wake ping succeeded • Sync restored (36ms RTT)');
                }}
                className="px-2 py-0.5 rounded-md bg-primary text-on-primary font-bold text-[10px] cursor-pointer"
              >
                Re-Sync
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (!activeChild.online) {
                  setSimulatedLatencyMs(38);
                  onUpdateHousehold(
                    (prev) => ({
                      ...prev,
                      children: prev.children.map((c) =>
                        c.id === activeChild.id
                          ? { ...c, online: true, lastSyncLabel: 'Synced 4s ago' }
                          : c
                      ),
                    }),
                    'Simulated Child APK back online (38ms RTT)'
                  );
                } else if (simulatedLatencyMs <= 100) {
                  setSimulatedLatencyMs(465);
                  triggerToast('Simulated high network latency (465ms Degraded Sync)');
                } else {
                  onUpdateHousehold(
                    (prev) => ({
                      ...prev,
                      children: prev.children.map((c) =>
                        c.id === activeChild.id
                          ? { ...c, online: false, lastSyncLabel: 'Offline (Queued)' }
                          : c
                      ),
                    }),
                    'Simulated Child APK offline state'
                  );
                  triggerToast('Simulated Child APK offline — local rules remain enforced');
                }
              }}
              className="px-2 py-0.5 rounded-md bg-surface hover:bg-surface-container text-on-surface-variant border border-outline-variant/30 font-mono text-[10px] cursor-pointer"
              title="Cycle Sync Health state (Optimal / Degraded / Offline)"
            >
              {syncHealth.status === 'OPTIMAL'
                ? 'Test Latency'
                : syncHealth.status === 'DEGRADED'
                ? 'Test Offline'
                : 'Restore Online'}
            </button>
          </div>
        </div>

        {/* Global Quick Actions Row (Find Child, Pause Internet, Emergency Alert) */}
        <div
          aria-label="Quick Actions"
          className="flex items-center justify-between gap-1.5"
        >
          <span className="text-[10px] font-headline font-bold uppercase tracking-wider text-on-surface-variant shrink-0 hidden sm:inline">
            Quick Actions:
          </span>
          <div className="grid grid-cols-3 gap-1.5 flex-1">
            {/* 1. Find Child */}
            <button
              type="button"
              onClick={() => {
                onUpdateHousehold(
                  (prev) => ({
                    ...prev,
                    children: prev.children.map((c) =>
                      c.id === activeChild.id
                        ? {
                            ...c,
                            gpsAccuracyMeters: 3,
                            lastSyncLabel: 'Synced just now',
                          }
                        : c
                    ),
                  }),
                  `Primary Guardian triggered Find Child GPS ping for ${activeChild.name}`
                );
                onSelectScreen('P-09');
                triggerToast(
                  `Find Child: Located ${activeChild.name} at ${activeChild.currentLocationName} (GPS ±3m)`
                );
              }}
              className="py-1.5 px-2.5 rounded-xl bg-primary-fixed/70 hover:bg-primary-fixed text-primary font-headline font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">my_location</span>
              <span>Find Child</span>
            </button>

            {/* 2. Pause Internet */}
            <button
              type="button"
              onClick={() => {
                if (!canEditRules) {
                  triggerToast('RBAC Restricted: Only Primary or Co-Guardian can pause internet.');
                  return;
                }
                const nextPaused = !activeChild.devicePaused;
                onUpdateHousehold(
                  (prev) => ({
                    ...prev,
                    children: prev.children.map((c) =>
                      c.id === activeChild.id
                        ? {
                            ...c,
                            devicePaused: nextPaused,
                            pauseUntilLabel: nextPaused
                              ? 'Internet Paused by Primary Guardian'
                              : null,
                          }
                        : c
                    ),
                  }),
                  `${nextPaused ? 'Paused' : 'Resumed'} internet on ${activeChild.name}'s device`
                );
                triggerToast(
                  nextPaused
                    ? `Internet paused on ${activeChild.name.split(' ')[0]}'s ${activeChild.deviceModel}`
                    : `Internet resumed on ${activeChild.name.split(' ')[0]}'s ${activeChild.deviceModel}`
                );
              }}
              className={`py-1.5 px-2.5 rounded-xl font-headline font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                activeChild.devicePaused
                  ? 'bg-error text-on-error shadow-2xs'
                  : 'bg-surface-container-low hover:bg-surface-container-high text-on-surface border border-outline-variant/30'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">
                {activeChild.devicePaused ? 'wifi' : 'wifi_off'}
              </span>
              <span>{activeChild.devicePaused ? 'Resume Internet' : 'Pause Internet'}</span>
            </button>

            {/* 3. Emergency Alert */}
            <button
              type="button"
              onClick={() => {
                onUpdateHousehold(
                  (prev) => ({
                    ...prev,
                    alerts: [
                      {
                        id: `alert-emerg-${Date.now()}`,
                        childId: activeChild.id,
                        category: 'EMERGENCY_SOS',
                        title: 'Guardian Emergency Check-In Alert',
                        description: `Immediate check-in siren dispatched to ${activeChild.name}'s ${activeChild.deviceModel}`,
                        timestampLabel: 'Just now',
                        locationLabel: activeChild.currentLocationName,
                        acknowledgedBy: 'Sarah (Primary Guardian)',
                        isDrill: false,
                      },
                      ...prev.alerts,
                    ],
                    messages: [
                      ...prev.messages,
                      {
                        id: `msg-emerg-${Date.now()}`,
                        senderId: 'guardian-sarah',
                        senderName: 'Sarah (Mom)',
                        senderRole: 'PARENT',
                        text: `🚨 URGENT CHECK-IN: ${activeChild.name.split(' ')[0]}, please tap "Check In Safe" or call Mom/Dad right away.`,
                        timestampLabel: 'Just now',
                      },
                    ],
                  }),
                  `Dispatched Emergency Alert to ${activeChild.name}`
                );
                onSelectScreen('P-10');
                triggerToast(
                  `Emergency Alert dispatched to ${activeChild.name}'s device (bypasses silent mode)`
                );
              }}
              className="py-1.5 px-2.5 rounded-xl bg-error-container/75 hover:bg-error text-error hover:text-on-error font-headline font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">emergency_share</span>
              <span>Emergency Alert</span>
            </button>
          </div>
        </div>
      </div>

      {/* Toast Feedback Banner */}
      {toastMsg && (
        <div className="mx-4 mt-2 px-3.5 py-2 rounded-xl bg-inverse-surface text-inverse-on-surface text-xs font-semibold flex items-center justify-between shadow-md z-30 animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-secondary-fixed">
              verified
            </span>
            <span>{toastMsg}</span>
          </div>
          <button
            onClick={() => setToastMsg(null)}
            className="text-[11px] text-inverse-on-surface/70 hover:text-inverse-on-surface ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Scrollable Screen Body */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24 space-y-5">
        {/* =====================================================================
            P-01: PARENT SIGN-IN & BIOMETRIC UNLOCK (Stitch 1_parent_code)
           ===================================================================== */}
        {activeScreen === 'P-01' && (
          <div className="space-y-5">
            {/* Brand Identity Badge & Header */}
            <div className="flex flex-col items-center text-center pt-1">
              <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center mb-3 shadow-md relative">
                <span
                  className="material-symbols-outlined text-on-primary text-3xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  anchor
                </span>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-secondary flex items-center justify-center border-2 border-surface">
                  <span
                    className="material-symbols-outlined text-on-secondary text-[13px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    verified_user
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary mb-1">
                Guardian Workspace
              </span>
              <h2 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface">
                Welcome Back, Guardian
              </h2>
              <p className="text-xs text-on-surface-variant mt-1 max-w-xs leading-relaxed">
                Sign in to manage household boundaries, review extra-time requests, and support healthy digital habits.
              </p>
            </div>

            {/* Warm Illustration Accent */}
            <div className="relative w-full h-24 rounded-2xl overflow-hidden bg-surface-container-low border border-outline-variant/20 flex items-center justify-between px-5">
              <div className="z-10 max-w-[65%]">
                <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  Mutual Trust Framework
                </p>
                <p className="text-xs text-on-surface-variant mt-0.5 leading-snug">
                  Connected to <span className="font-semibold text-on-surface">2 child devices</span> • All safety signals nominal.
                </p>
              </div>
              <div className="z-10 flex items-center gap-1.5 bg-surface/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-outline-variant/30 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-status-enforced animate-pulse"></span>
                <span className="text-[11px] font-mono font-medium text-on-surface">v3.4 SafeCore</span>
              </div>
            </div>

            {/* Trust Transparency Banner */}
            <div className="bg-secondary-container/40 border border-secondary/20 rounded-2xl p-3.5 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-secondary/15 flex items-center justify-center shrink-0 mt-0.5">
                <span
                  className="material-symbols-outlined text-secondary text-[18px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  shield_with_heart
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-on-secondary-container font-headline">
                    Anchor Family Pledge
                  </h3>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary/15 text-secondary">
                    Transparent
                  </span>
                </div>
                <p className="text-[11px] text-on-secondary-container/85 mt-0.5 leading-relaxed">
                  Zero covert spyware. Every safety rule and live check-in is visible to your child to build lifelong digital responsibility.
                </p>
              </div>
            </div>

            {/* Primary Authentication Card */}
            <div className="bg-surface rounded-3xl p-5 shadow-sm border border-outline-variant/25 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1.5">
                  Guardian Email or Username
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined text-outline text-[20px] absolute left-3.5 pointer-events-none">
                    mail
                  </span>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full h-12 pl-11 pr-10 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm text-on-surface font-medium focus:outline-none focus:border-primary"
                  />
                  <span
                    className="material-symbols-outlined text-status-enforced text-[18px] absolute right-3.5"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-on-surface">
                    Guardian Passkey or Password
                  </label>
                  <button
                    type="button"
                    onClick={() => triggerToast('Password recovery link dispatched to guardian email.')}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined text-outline text-[20px] absolute left-3.5 pointer-events-none">
                    lock
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    className="w-full h-12 pl-11 pr-11 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm text-on-surface font-medium focus:outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? 'visibility' : 'visibility_off'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Remember Device Switch */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberDevice}
                    onChange={(e) => setRememberDevice(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary"
                  />
                  <span className="text-xs font-medium text-on-surface-variant">
                    Keep this parent device trusted for 30 days
                  </span>
                </label>
                <span className="text-[11px] font-mono text-outline">TLS 1.3</span>
              </div>

              {/* Sign In CTA */}
              <button
                type="button"
                onClick={() => {
                  triggerToast('Signed in to The Jenkins Household');
                  onSelectScreen('P-04');
                }}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary-container text-on-primary font-headline font-bold text-sm tracking-wide shadow-md hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                <span>Sign In to Household</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>

            {/* Biometric & Passkey Fast-Track Card */}
            <div className="bg-surface-container-low rounded-2xl p-4 border border-outline-variant/25 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-primary-fixed flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined text-[28px]">fingerprint</span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold font-headline text-on-surface">
                      Biometric Quick Unlock
                    </h3>
                    <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-surface-container-highest text-primary">
                      FIDO2
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {biometricUnlocked
                      ? 'Biometrics Verified • Hardware Key Unlocked'
                      : 'Use Android Fingerprint or Face Unlock for instant entry'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBiometricUnlocked(true);
                  triggerToast('Android Biometrics Verified • Opening Family Dashboard');
                  setTimeout(() => onSelectScreen('P-04'), 600);
                }}
                className={`px-3.5 py-2.5 rounded-xl font-headline font-bold text-xs transition-colors shrink-0 flex items-center gap-1.5 shadow-xs ${
                  biometricUnlocked
                    ? 'bg-status-enforced text-white'
                    : 'bg-surface hover:bg-surface-container-highest text-primary border border-outline-variant/30'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {biometricUnlocked ? 'check_circle' : 'sensors'}
                </span>
                <span>{biometricUnlocked ? 'Verified' : 'Unlock'}</span>
              </button>
            </div>

            {/* Google Account OAuth Button */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={onGoogleSignIn}
                className="w-full h-11 rounded-xl bg-surface hover:bg-surface-container-low border border-outline-variant/40 text-on-surface font-semibold text-xs flex items-center justify-center gap-2.5 transition-colors shadow-2xs"
              >
                <span className="material-symbols-outlined text-[18px] text-primary">
                  account_circle
                </span>
                <span>
                  {userEmail ? `Signed in with Google (${userEmail})` : 'Continue with Google Account'}
                </span>
              </button>
              {userEmail && (
                <button
                  type="button"
                  onClick={onSignOut}
                  className="w-full py-2 text-xs font-semibold text-error hover:underline"
                >
                  Sign Out of Google Session
                </button>
              )}
            </div>

            {/* Footer Registration Prompt */}
            <div className="pt-2 border-t border-outline-variant/20 text-center space-y-2">
              <p className="text-xs text-on-surface-variant">
                New to Anchor Guardianship?
                <button
                  onClick={() => onSelectScreen('P-02')}
                  className="font-bold text-primary hover:underline ml-1"
                >
                  Set up a new family account
                </button>
              </p>
            </div>
          </div>
        )}

        {/* =====================================================================
            P-02: CREATE FAMILY HOUSEHOLD ONBOARDING (Stitch 2_parent_code)
           ===================================================================== */}
        {activeScreen === 'P-02' && (
          <div className="space-y-5">
            {/* Step Progress Indicator */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-primary mb-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-primary text-on-primary text-[11px] flex items-center justify-center font-bold">
                    1
                  </span>
                  Step 1 of 3: Create Family Household
                </span>
                <span className="font-mono text-[11px] text-on-surface-variant">33% Complete</span>
              </div>
              <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden flex gap-1 p-0.5">
                <div className="w-1/3 h-full bg-primary rounded-full"></div>
                <div className="w-1/3 h-full bg-transparent rounded-full"></div>
                <div className="w-1/3 h-full bg-transparent rounded-full"></div>
              </div>
            </div>

            {/* Hero Header & Philosophy Banner */}
            <div className="space-y-3">
              <div>
                <h2 className="font-headline text-2xl font-extrabold text-on-surface tracking-tight leading-snug">
                  Let’s set up your family space
                </h2>
                <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                  Establish your household profile, guardian role, and add the children you’ll be guiding together.
                </p>
              </div>

              <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary to-primary-container text-on-primary p-4 shadow-sm">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0 border border-white/20">
                    <span className="material-symbols-outlined text-2xl text-secondary-fixed">
                      family_restroom
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[10px] font-bold uppercase tracking-wider">
                      <span
                        className="material-symbols-outlined text-[12px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        handshake
                      </span>
                      Collaborative Safety
                    </div>
                    <h3 className="font-headline text-sm font-bold text-white leading-tight">
                      Built on trust, not hidden surveillance
                    </h3>
                    <p className="text-[11px] text-on-primary-container leading-snug">
                      Children see clear boundaries and can request extra time fairly.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 1: Household Identity Card */}
            <div className="bg-surface rounded-2xl p-4 shadow-xs border border-outline-variant/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">home</span>
                  <h3 className="font-headline font-bold text-sm text-on-surface">
                    Household Name
                  </h3>
                </div>
                <span className="text-[11px] font-medium text-status-enforced bg-status-enforced/10 px-2 py-0.5 rounded-full">
                  Required
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={draftHouseholdName}
                  onChange={(e) => setDraftHouseholdName(e.target.value)}
                  className="w-full h-11 pl-3.5 pr-10 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-semibold text-on-surface focus:outline-none focus:border-primary"
                />
                <span
                  className="material-symbols-outlined text-status-enforced text-[18px] absolute right-3 top-3"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
              </div>
            </div>

            {/* Section 2: Primary Guardian Role & Preferences */}
            <div className="bg-surface rounded-2xl p-4 shadow-xs border border-outline-variant/20 space-y-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">badge</span>
                <h3 className="font-headline font-bold text-sm text-on-surface">
                  Primary Guardian Profile
                </h3>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-on-surface">
                  Your Legal or Preferred Name
                </label>
                <input
                  type="text"
                  value={guardianPreferredName}
                  onChange={(e) => setGuardianPreferredName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-medium text-on-surface"
                />
              </div>

              {/* Guardian Role Selector Chips */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-on-surface">
                  Your Guardian Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Mother', 'Father', 'Legal Guardian', 'Co-Parent'] as const).map((roleLabel) => {
                    const selected = selectedRelationChip === roleLabel;
                    return (
                      <button
                        key={roleLabel}
                        type="button"
                        onClick={() => setSelectedRelationChip(roleLabel)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl font-semibold text-xs transition-colors ${
                          selected
                            ? 'border-2 border-primary bg-primary-fixed/40 text-primary font-bold'
                            : 'border border-outline-variant/40 bg-surface-container-low text-on-surface-variant'
                        }`}
                      >
                        <span
                          className="material-symbols-outlined text-[18px]"
                          style={selected ? { fontVariationSettings: "'FILL' 1" } : undefined}
                        >
                          {selected ? 'check_circle' : 'person'}
                        </span>
                        <span>{roleLabel}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notification Cadence */}
              <div className="space-y-2 pt-1 border-t border-outline-variant/15">
                <label className="block text-xs font-semibold text-on-surface">
                  Notification Cadence
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'INSTANT', label: 'Instant Alerts (SOS & Requests)' },
                    { id: 'DAILY', label: 'Daily Summary Digest' },
                    { id: 'WEEKLY', label: 'Weekly Screen-Time Report' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setNotificationCadence(item.id as 'INSTANT' | 'DAILY' | 'WEEKLY')}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${
                        notificationCadence === item.id
                          ? 'bg-secondary-container text-on-secondary-container font-bold'
                          : 'bg-surface-container-low text-on-surface-variant border border-outline-variant/30'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 3: Children Roster */}
            <div className="bg-surface rounded-2xl p-4 shadow-xs border border-outline-variant/20 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    child_care
                  </span>
                  <div>
                    <h3 className="font-headline font-bold text-sm text-on-surface">
                      Children in Household
                    </h3>
                    <p className="text-[11px] text-on-surface-variant">
                      Age-appropriate defaults will be suggested
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-primary-fixed text-primary">
                  {household.children.length} Added
                </span>
              </div>

              {household.children.map((c) => (
                <div
                  key={c.id}
                  className="bg-surface-container-low rounded-xl p-3 border border-outline-variant/30 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={c.id === 'child-leo' ? LEO_AVATAR : MAYA_AVATAR}
                        alt={c.name}
                        className="w-11 h-11 rounded-full object-cover border-2 border-secondary"
                      />
                      <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-status-enforced text-white flex items-center justify-center text-[10px]">
                        ✓
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-headline font-bold text-sm text-on-surface">
                          {c.name}
                        </h4>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant">
                          Age {c.age}
                        </span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">
                        {c.deviceModel} • Ready to pair
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-status-enforced bg-status-enforced/10 px-2 py-1 rounded-lg">
                    Active
                  </span>
                </div>
              ))}

              {showAddChildForm ? (
                <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-2.5">
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Child Name (e.g. Noah)"
                      value={newChildName}
                      onChange={(e) => setNewChildName(e.target.value)}
                      className="col-span-2 h-9 px-3 rounded-lg bg-surface border border-outline-variant/40 text-xs"
                    />
                    <input
                      type="number"
                      placeholder="Age"
                      value={newChildAge}
                      onChange={(e) => setNewChildAge(e.target.value)}
                      className="h-9 px-2.5 rounded-lg bg-surface border border-outline-variant/40 text-xs"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddChildForm(false)}
                      className="px-3 py-1.5 rounded-lg text-xs text-on-surface-variant"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!newChildName.trim()) return;
                        const cleanName = newChildName.trim();
                        const newId = `child-${Date.now()}`;
                        onUpdateHousehold((prev) => ({
                          ...prev,
                          children: [
                            ...prev.children,
                            {
                              ...prev.children[0],
                              id: newId,
                              name: cleanName,
                              age: Number(newChildAge) || 10,
                              avatarInitials: cleanName.slice(0, 2).toUpperCase(),
                              deviceModel: 'Android Device (Pending Pair)',
                            },
                          ],
                        }), `Added child profile ${cleanName}`);
                        setNewChildName('');
                        setShowAddChildForm(false);
                        triggerToast(`Added ${cleanName} to household roster`);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-bold"
                    >
                      Save Child
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAddChildForm(true)}
                  className="w-full py-2.5 px-3 rounded-xl border border-dashed border-primary/40 bg-primary-fixed/20 hover:bg-primary-fixed/40 text-primary font-headline font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">person_add</span>
                  <span>Add Another Child</span>
                </button>
              )}
            </div>

            {/* Section 4: Family Trust Agreement */}
            <div className="bg-secondary-container/35 border border-secondary/25 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span
                  className="material-symbols-outlined text-secondary text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  verified_user
                </span>
                <h3 className="font-headline font-bold text-xs text-on-secondary-container uppercase tracking-wider">
                  Family Trust Agreement
                </h3>
              </div>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pledgeNoKeylogger}
                  onChange={(e) => setPledgeNoKeylogger(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-secondary"
                />
                <span className="text-xs text-on-secondary-container leading-snug">
                  <strong>We pledge not to use secret keystroke logging.</strong> All rules and active schedules will be clearly shown on our child’s Anchor dashboard.
                </span>
              </label>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pledgeOpenBoundaries}
                  onChange={(e) => setPledgeOpenBoundaries(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-secondary"
                />
                <span className="text-xs text-on-secondary-container leading-snug">
                  <strong>We will discuss screen boundaries openly</strong> and review extra-time requests with constructive feedback.
                </span>
              </label>
            </div>

            {/* Primary Save & Continue CTA */}
            <button
              type="button"
              onClick={() => {
                onUpdateHousehold((prev) => ({
                  ...prev,
                  householdName: draftHouseholdName.trim() || prev.householdName,
                }), 'Saved household onboarding setup');
                triggerToast('Household saved! Proceeding to Step 2: Device Pairing');
                onSelectScreen('P-03');
              }}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary-container text-on-primary font-headline font-bold text-sm tracking-wide shadow-md flex items-center justify-center gap-2"
            >
              <span>Continue to Device Pairing</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        )}

        {/* =====================================================================
            P-03: ADD CHILD & PAIR DEVICE (Stitch 3_parent_code)
           ===================================================================== */}
        {activeScreen === 'P-03' && (
          <div className="space-y-5">
            {/* Target Child Badge */}
            <div className="bg-surface-container-low rounded-2xl p-3.5 flex items-center justify-between border border-outline-variant/20">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-headline font-bold text-base">
                  {activeChild.avatarInitials}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-headline font-bold text-sm text-on-surface">
                      {activeChild.name}
                    </span>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container">
                      {activeChild.age} yrs
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Target: {activeChild.deviceModel} • Android 14
                  </p>
                </div>
              </div>
              <button
                onClick={() => onSelectScreen('P-02')}
                className="text-xs font-semibold text-primary px-3 py-1.5 rounded-lg hover:bg-primary-fixed/40 transition-colors"
              >
                Change
              </button>
            </div>

            {/* Primary Pairing Card (6-Digit Code & QR Matrix) */}
            <div className="bg-surface rounded-3xl p-5 shadow-sm border border-outline-variant/20 relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-primary block">
                    Step 2 of 3 • Handshake
                  </span>
                  <h2 className="font-headline font-extrabold text-lg text-on-surface">
                    Pairing Passcode
                  </h2>
                </div>
                <div className="inline-flex rounded-xl bg-surface-container p-1">
                  <button
                    onClick={() => setPairingTab('CODE')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                      pairingTab === 'CODE'
                        ? 'bg-surface text-primary shadow-xs'
                        : 'text-on-surface-variant'
                    }`}
                  >
                    Code
                  </button>
                  <button
                    onClick={() => setPairingTab('QR')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                      pairingTab === 'QR'
                        ? 'bg-surface text-primary shadow-xs'
                        : 'text-on-surface-variant'
                    }`}
                  >
                    QR Matrix
                  </button>
                </div>
              </div>

              {pairingTab === 'CODE' ? (
                <>
                  <p className="text-xs text-on-surface-variant mb-4 leading-relaxed">
                    Open the <strong className="text-on-surface">Anchor Child App</strong> on {activeChild.name.split(' ')[0]}’s phone and enter this 6-digit temporary code:
                  </p>

                  {/* 6-Digit Display Boxes */}
                  <div className="grid grid-cols-6 gap-2 my-3">
                    {digits.map((d, idx) => (
                      <div
                        key={idx}
                        className="h-14 rounded-xl bg-surface-container-low border-2 border-primary/25 flex items-center justify-center font-mono text-2xl font-bold text-primary shadow-2xs"
                      >
                        {d}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="my-3 p-4 rounded-2xl bg-surface-container-low border border-outline-variant/25 flex flex-col items-center">
                  <div className="w-36 h-36 bg-white p-3 rounded-2xl border-2 border-primary/20 shadow-xs flex items-center justify-center">
                    <svg viewBox="0 0 100 100" className="w-full h-full fill-primary">
                      <rect x="8" y="8" width="26" height="26" rx="4" />
                      <rect x="13" y="13" width="16" height="16" fill="white" rx="2" />
                      <rect x="17" y="17" width="8" height="8" />
                      <rect x="66" y="8" width="26" height="26" rx="4" />
                      <rect x="71" y="13" width="16" height="16" fill="white" rx="2" />
                      <rect x="75" y="17" width="8" height="8" />
                      <rect x="8" y="66" width="26" height="26" rx="4" />
                      <rect x="13" y="71" width="16" height="16" fill="white" rx="2" />
                      <rect x="17" y="75" width="8" height="8" />
                      <rect x="42" y="12" width="8" height="8" />
                      <rect x="42" y="28" width="16" height="8" />
                      <rect x="12" y="42" width="16" height="8" />
                      <rect x="36" y="42" width="24" height="16" rx="3" />
                      <rect x="68" y="44" width="10" height="18" />
                      <rect x="44" y="66" width="14" height="10" />
                      <rect x="66" y="68" width="22" height="22" rx="4" />
                      <rect x="72" y="74" width="10" height="10" fill="white" />
                    </svg>
                  </div>
                  <p className="text-xs font-bold text-on-surface mt-2.5">
                    Scan from Anchor Child App (Screen C-01)
                  </p>
                  <p className="text-[11px] font-mono text-on-surface-variant">
                    Token: ANC-{digits.slice(0, 3).join('')}-{digits.slice(3).join('')}
                  </p>
                </div>
              )}

              {/* Quick Actions: Copy & Regenerate */}
              <div className="flex items-center gap-2.5 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(household.pairingCode);
                    setCodeCopied(true);
                    triggerToast('Pairing code copied to clipboard');
                    setTimeout(() => setCodeCopied(false), 2000);
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-primary-fixed/60 hover:bg-primary-fixed text-primary font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {codeCopied ? 'check' : 'content_copy'}
                  </span>
                  <span>{codeCopied ? 'Copied!' : 'Copy Code'}</span>
                </button>
                <button
                  type="button"
                  onClick={regeneratePairingCode}
                  className="py-2.5 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">refresh</span>
                  <span>Refresh</span>
                </button>
              </div>

              {/* Countdown Timer Bar */}
              <div className="mt-5 pt-4 border-t border-outline-variant/20">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-on-surface-variant flex items-center gap-1.5 font-medium">
                    <span className="material-symbols-outlined text-[15px] text-status-pending">
                      timer
                    </span>
                    Security countdown
                  </span>
                  <span className="font-mono font-semibold text-status-pending">
                    Expires in 09:42
                  </span>
                </div>
                <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-secondary rounded-full w-4/5"></div>
                </div>
              </div>
            </div>

            {/* Live Connection Listener Status */}
            <div className="bg-secondary-container/40 border border-secondary/20 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-secondary/15 text-secondary">
                  <span className="material-symbols-outlined text-[20px]">sensors</span>
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-status-enforced animate-ping"></span>
                </div>
                <div>
                  <h4 className="font-headline font-bold text-xs text-on-secondary-container">
                    Listening for handshake...
                  </h4>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">
                    End-to-end TLS 1.3 channel ready for {activeChild.name.split(' ')[0]}’s device
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-mono font-semibold text-secondary px-2.5 py-1 rounded-md bg-surface">
                WAITING
              </span>
            </div>

            {/* 3-Step Child Setup Guide */}
            <div className="bg-surface-container-low rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant">
                  Family Connection Steps
                </h3>
                <span className="text-[11px] text-secondary font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">verified_user</span>
                  Child Respect Mode
                </span>
              </div>
              <div className="space-y-2.5">
                {[
                  {
                    step: '1',
                    title: `Install "Anchor Child" from Google Play`,
                    desc: `Search for Anchor Family Safety on ${activeChild.name.split(' ')[0]}'s Android phone.`,
                  },
                  {
                    step: '2',
                    title: 'Enter the 6-digit code or scan QR',
                    desc: 'You can test this live right now on Screen C-01 in the Child App viewport.',
                  },
                  {
                    step: '3',
                    title: 'Review Transparent Safety Pact together',
                    desc: `${activeChild.name.split(' ')[0]} sees exactly what is shared (screen time & safe zones) and what remains private.`,
                  },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-on-primary font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {item.step}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-on-surface">{item.title}</p>
                      <p className="text-[11px] text-on-surface-variant mt-0.5 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Share Direct Install Link */}
            <button
              type="button"
              onClick={() =>
                triggerToast(`Setup link & code ${digits.slice(0, 3).join('')}-${digits.slice(3).join('')} ready to share via SMS/WhatsApp`)
              }
              className="w-full py-3.5 px-4 rounded-2xl bg-primary text-on-primary font-headline font-bold text-sm shadow-sm hover:bg-primary-container transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">share</span>
              <span>Send Setup Link via SMS or WhatsApp</span>
            </button>
          </div>
        )}

        {/* =====================================================================
            P-04: FAMILY DASHBOARD (Stitch 4_parent_code)
           ===================================================================== */}
        {activeScreen === 'P-04' && (
          <div className="space-y-5">
            {/* Child Selector Strip */}
            <section aria-label="Child Profiles">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Connected Children
                </span>
                <span className="text-[11px] font-medium text-status-enforced flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-status-enforced"></span>
                  {activeChild.lastSyncLabel} • Device Health Normal
                </span>
              </div>
              <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-1">
                {household.children.map((child) => {
                  const selected = child.id === activeChild.id;
                  return (
                    <button
                      key={child.id}
                      onClick={() => handleSelectChild(child.id)}
                      className={`flex items-center gap-2.5 px-3.5 py-2 rounded-2xl shrink-0 transition-all ${
                        selected
                          ? 'bg-primary text-on-primary shadow-sm'
                          : 'bg-surface-container-low text-on-surface hover:bg-surface-container border border-outline-variant/20'
                      }`}
                    >
                      <div className="relative">
                        <img
                          src={child.id === 'child-leo' ? LEO_AVATAR : MAYA_AVATAR}
                          alt={child.name}
                          className="w-8 h-8 rounded-full object-cover border border-white/40"
                        />
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-status-enforced border-2 border-primary rounded-full"></span>
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold leading-none">
                          {child.name.split(' ')[0]} ({child.age})
                        </p>
                        <p
                          className={`text-[10px] mt-0.5 font-mono ${
                            selected ? 'text-on-primary/80' : 'text-on-surface-variant'
                          }`}
                        >
                          {child.deviceModel.replace('Samsung ', '').replace('Google ', '')} •{' '}
                          {child.batteryPercent}%
                        </p>
                      </div>
                    </button>
                  );
                })}
                <button
                  onClick={() => onSelectScreen('P-03')}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl border border-dashed border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary transition-colors shrink-0 text-xs font-semibold"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>Add child</span>
                </button>
              </div>
            </section>

            {/* Primary Bento Hero: Today's Screen Time & Quick Actions */}
            <section className="bg-surface rounded-3xl p-5 shadow-xs border border-outline-variant/20 relative overflow-hidden">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-secondary block">
                    Today&apos;s Balance
                  </span>
                  <h2 className="font-headline font-extrabold text-xl text-on-surface">
                    Screen Allowance
                  </h2>
                </div>
                <button
                  onClick={() => onSelectScreen('P-05')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                    activeChild.devicePaused
                      ? 'bg-error-container text-on-error-container'
                      : 'bg-status-enforced/10 text-status-enforced'
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-[14px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {activeChild.devicePaused ? 'pause_circle' : 'verified_user'}
                  </span>
                  <span>{activeChild.devicePaused ? 'Device Paused' : 'Rules Enforced'}</span>
                </button>
              </div>

              {/* Radial Gauge + Usage Breakdown */}
              <div className="flex items-center gap-5 my-2">
                <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="#dfe9fa"
                      strokeWidth="10"
                      fill="transparent"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="#113c8d"
                      strokeWidth="10"
                      fill="transparent"
                      strokeDasharray="251.2"
                      strokeDashoffset={251.2 - (251.2 * screenMetrics.usagePercent) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="font-mono font-bold text-base text-on-surface leading-none">
                      {screenMetrics.usagePercent}%
                    </span>
                    <span className="text-[10px] text-on-surface-variant mt-0.5">used</span>
                  </div>
                </div>

                <div className="flex-1 space-y-2">
                  <div>
                    <div className="flex items-baseline justify-between">
                      <span className="font-mono font-extrabold text-2xl text-on-surface">
                        {screenMetrics.formattedUsed}
                      </span>
                      <span className="text-xs font-mono text-on-surface-variant">
                        / {screenMetrics.formattedAllowance}
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant">
                      <strong className="text-secondary font-semibold">
                        {screenMetrics.formattedRemaining} left
                      </strong>{' '}
                      for today
                    </p>
                  </div>

                  {/* Category Mini-Pills */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant">
                      Edu: 50m
                    </span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant">
                      Games: 1h 05m
                    </span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant">
                      Social: 20m
                    </span>
                  </div>
                </div>
              </div>

              {/* Next Schedule Transition Banner */}
              <div className="mt-4 pt-3.5 border-t border-outline-variant/20 flex items-center justify-between text-xs">
                <span className="text-on-surface-variant flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-primary">
                    bedtime
                  </span>
                  Bedtime lock starts in{' '}
                  <strong className="text-on-surface font-mono">1h 45m</strong> (8:30 PM)
                </span>
                <button
                  onClick={() => onSelectScreen('P-08')}
                  className="text-primary font-bold hover:underline"
                >
                  Edit
                </button>
              </div>

              {/* Quick Action Controls */}
              <div className="grid grid-cols-3 gap-2 mt-4">
                <button
                  onClick={() => {
                    onUpdateHousehold((prev) => ({
                      ...prev,
                      children: prev.children.map((c) =>
                        c.id === activeChild.id
                          ? {
                              ...c,
                              devicePaused: !c.devicePaused,
                              pauseUntilLabel: !c.devicePaused ? 'Paused by Guardian' : null,
                            }
                          : c
                      ),
                    }), 'Toggled device pause');
                    triggerToast(
                      activeChild.devicePaused
                        ? `${activeChild.name.split(' ')[0]}'s device resumed`
                        : `${activeChild.name.split(' ')[0]}'s device paused`
                    );
                  }}
                  className={`py-2.5 px-2 rounded-xl font-semibold text-xs flex flex-col items-center gap-1 transition-colors ${
                    activeChild.devicePaused
                      ? 'bg-error text-on-error'
                      : 'bg-surface-container-low hover:bg-surface-container-high text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {activeChild.devicePaused ? 'play_circle' : 'pause_circle'}
                  </span>
                  <span>{activeChild.devicePaused ? 'Resume' : 'Pause Device'}</span>
                </button>

                <button
                  onClick={() => {
                    onUpdateHousehold((prev) => ({
                      ...prev,
                      children: prev.children.map((c) =>
                        c.id === activeChild.id
                          ? { ...c, dailyAllowanceMinutes: c.dailyAllowanceMinutes + 30 }
                          : c
                      ),
                    }), 'Granted +30m bonus time');
                    triggerToast(`Granted +30m bonus screen time to ${activeChild.name.split(' ')[0]}`);
                  }}
                  className="py-2.5 px-2 rounded-xl bg-primary-fixed/60 hover:bg-primary-fixed text-primary font-semibold text-xs flex flex-col items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">more_time</span>
                  <span>+30m Bonus</span>
                </button>

                <button
                  onClick={() => onSelectScreen('P-08')}
                  className="py-2.5 px-2 rounded-xl bg-surface-container-low hover:bg-surface-container-high text-on-surface font-semibold text-xs flex flex-col items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px] text-secondary">
                    shield_moon
                  </span>
                  <span>Downtime</span>
                </button>
              </div>
            </section>

            {/* 2-Column Feature Modules: Live Safety Check & App Limits */}
            <section className="grid grid-cols-2 gap-3">
              <div className="bg-surface rounded-2xl p-4 border border-outline-variant/20 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-xl bg-secondary-container flex items-center justify-center text-secondary">
                      <span className="material-symbols-outlined text-[18px]">radar</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary-container/60 text-on-secondary-container">
                      Consent-First
                    </span>
                  </div>
                  <h3 className="font-headline font-bold text-sm text-on-surface">
                    Live Safety Check
                  </h3>
                  <p className="text-[11px] text-on-surface-variant mt-0.5 leading-snug">
                    Request audited check-in with child alert banner.
                  </p>
                </div>
                <button
                  onClick={() => onSelectScreen('P-19')}
                  className="mt-3 w-full py-2 rounded-xl bg-secondary text-on-secondary font-semibold text-xs hover:opacity-95 transition-opacity flex items-center justify-center gap-1"
                >
                  <span>Ping Child</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
              </div>

              <div className="bg-surface rounded-2xl p-4 border border-outline-variant/20 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-xl bg-primary-fixed flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-[18px]">apps</span>
                    </div>
                    <span className="text-[10px] font-mono font-semibold text-status-enforced">
                      {childApps.length} Managed
                    </span>
                  </div>
                  <h3 className="font-headline font-bold text-sm text-on-surface">App Limits</h3>
                  <p className="text-[11px] text-on-surface-variant mt-0.5 leading-snug">
                    Roblox (15m left), YouTube Kids, Duolingo free.
                  </p>
                </div>
                <button
                  onClick={() => onSelectScreen('P-07')}
                  className="mt-3 w-full py-2 rounded-xl bg-surface-container-high text-on-surface font-semibold text-xs hover:bg-surface-container-highest transition-colors flex items-center justify-center gap-1"
                >
                  <span>Manage Limits</span>
                  <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                </button>
              </div>
            </section>

            {/* Activity & Requests Feed */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-headline font-bold text-sm text-on-surface">
                  Recent Activity &amp; Requests
                </h3>
                <button
                  onClick={() => onSelectScreen('P-11')}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  View all ({household.requests.length})
                </button>
              </div>

              {pendingRequests.length > 0 ? (
                pendingRequests.slice(0, 1).map((req) => (
                  <div
                    key={req.id}
                    className="bg-surface rounded-2xl p-4 border-l-4 border-status-pending shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-tertiary-fixed flex items-center justify-center text-tertiary font-bold">
                          <span className="material-symbols-outlined text-[20px]">
                            sports_esports
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-headline font-bold text-xs text-on-surface">
                              {req.childName} requested +{req.requestedMinutes} min
                            </h4>
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-status-pending/15 text-status-pending">
                              Pending
                            </span>
                          </div>
                          <p className="text-[11px] text-on-surface-variant">
                            {req.targetName} • &ldquo;{req.childNote}&rdquo;
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-on-surface-variant">
                        {req.createdAtLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDecisionOnRequest(req.id, 'APPROVED', 15)}
                        className="flex-1 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs hover:bg-primary-container transition-colors"
                      >
                        Approve +{req.requestedMinutes}m
                      </button>
                      <button
                        onClick={() => handleDecisionOnRequest(req.id, 'DECLINED')}
                        className="flex-1 py-2 rounded-xl bg-surface-container text-on-surface-variant font-semibold text-xs hover:bg-surface-container-high transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-surface rounded-2xl p-3.5 border border-outline-variant/20 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-status-enforced">
                      check_circle
                    </span>
                    <span className="text-xs font-semibold text-on-surface">
                      All child extra-time petitions resolved!
                    </span>
                  </div>
                  <button
                    onClick={() => onSelectScreen('P-11')}
                    className="text-xs font-bold text-primary"
                  >
                    History
                  </button>
                </div>
              )}

              {/* Location Safe Zone Card */}
              <div
                onClick={() => onSelectScreen('P-09')}
                className="bg-surface-container-low rounded-2xl p-3.5 flex items-center justify-between border border-outline-variant/15 cursor-pointer hover:bg-surface-container transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-secondary-container/70 flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined text-[18px]">location_on</span>
                  </div>
                  <div>
                    <h4 className="font-headline font-bold text-xs text-on-surface">
                      Arrived at {activeChild.currentLocationName}
                    </h4>
                    <p className="text-[11px] text-on-surface-variant">
                      Safe Zone verified • GPS ±{activeChild.gpsAccuracyMeters}m
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-status-enforced font-semibold">
                  Safe Zone
                </span>
              </div>
            </section>

            {/* Consent History Panel on Parent Dashboard */}
            {renderConsentHistoryPanel(false)}

            {/* Active Policy Enforcements Summary */}
            <section className="bg-surface-container-low rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant">
                  Active Enforcements
                </h3>
                <span className="text-[11px] font-mono text-status-enforced font-semibold">
                  3/3 Synced
                </span>
              </div>
              <div className="space-y-2">
                <div
                  onClick={() => onSelectScreen('P-08')}
                  className="flex items-center justify-between text-xs py-1.5 border-b border-outline-variant/15 cursor-pointer"
                >
                  <span className="font-medium text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-primary">
                      schedule
                    </span>
                    Bedtime Lock (8:30 PM – 7:00 AM)
                  </span>
                  <span className="text-[11px] font-semibold text-status-enforced">Enforced</span>
                </div>
                <div
                  onClick={() => onSelectScreen('P-17')}
                  className="flex items-center justify-between text-xs py-1.5 border-b border-outline-variant/15 cursor-pointer"
                >
                  <span className="font-medium text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-primary">
                      block
                    </span>
                    Social Apps Limit (30m/day)
                  </span>
                  <span className="text-[11px] font-semibold text-status-enforced">Enforced</span>
                </div>
                <div
                  onClick={() => onSelectScreen('P-16')}
                  className="flex items-center justify-between text-xs py-1 cursor-pointer"
                >
                  <span className="font-medium text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-secondary">
                      travel_explore
                    </span>
                    Web &amp; Search Filter (SafeSearch)
                  </span>
                  <span className="text-[11px] font-semibold text-status-enforced">Active</span>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* =====================================================================
            P-05: CHILD PROFILE & DEVICE STATUS (Stitch 5_parent_code)
           ===================================================================== */}
        {activeScreen === 'P-05' && (
          <div className="space-y-5">
            {/* Child Profile Header Card */}
            <section className="bg-surface rounded-3xl p-5 shadow-xs border border-outline-variant/25 relative overflow-hidden">
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <img
                    src={activeChild.id === 'child-leo' ? LEO_AVATAR : MAYA_AVATAR}
                    alt={activeChild.name}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-primary/20 shadow-xs"
                  />
                  <span
                    className="absolute -bottom-1 -right-1 bg-status-enforced text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-surface flex items-center gap-0.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                    Online
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h2 className="font-headline font-extrabold text-xl text-on-surface truncate">
                      {activeChild.name}
                    </h2>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary-fixed text-primary">
                      Age {activeChild.age}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-on-surface-variant mt-0.5 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-primary">
                      smartphone
                    </span>
                    <span>{activeChild.deviceModel}</span>
                    <span className="text-outline">•</span>
                    <span className="font-mono text-[11px] text-status-enforced">
                      Synced {activeChild.lastSyncLabel}
                    </span>
                  </p>
                </div>
              </div>

              {/* Screen Time Snapshot Bar */}
              <div className="mt-4 pt-4 border-t border-outline-variant/20">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-on-surface-variant">
                    Today&apos;s Digital Rhythm
                  </span>
                  <span className="font-mono font-bold text-on-surface">
                    {screenMetrics.formattedUsed}{' '}
                    <span className="text-on-surface-variant font-normal">
                      / {screenMetrics.formattedAllowance}
                    </span>
                  </span>
                </div>
                <div className="w-full h-2.5 bg-surface-container rounded-full overflow-hidden flex">
                  <div
                    className="bg-primary h-full rounded-l-full"
                    style={{ width: `${screenMetrics.usagePercent}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-on-surface-variant mt-1.5">
                  <span>{screenMetrics.usagePercent}% of daily allowance consumed</span>
                  <span className="text-secondary font-semibold">
                    Bedtime lock scheduled for 8:30 PM
                  </span>
                </div>
              </div>
            </section>

            {/* Quick Remote Device Controls */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  Guardian Quick Actions
                </h3>
                <span className="text-[11px] text-outline font-mono">TLS 1.3 Command Link</span>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  onClick={() =>
                    triggerToast(`Ringing ${activeChild.deviceModel} at full volume for 60s`)
                  }
                  className="bg-surface hover:bg-surface-container-low active:scale-[0.98] transition-all p-3.5 rounded-2xl border border-outline-variant/25 flex flex-col items-center text-center gap-1.5 shadow-2xs"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[20px]">ring_volume</span>
                  </div>
                  <span className="font-headline font-bold text-xs text-on-surface">
                    Ping Device
                  </span>
                  <span className="text-[10px] text-on-surface-variant leading-tight">
                    Ring 60s (Loud)
                  </span>
                </button>

                <button
                  onClick={() => {
                    onUpdateHousehold((prev) => ({
                      ...prev,
                      children: prev.children.map((c) =>
                        c.id === activeChild.id ? { ...c, lastSyncLabel: 'Just now' } : c
                      ),
                    }), 'Forced policy sync to child device');
                    triggerToast('All household rules force-synced to Galaxy A34');
                  }}
                  className="bg-surface hover:bg-surface-container-low active:scale-[0.98] transition-all p-3.5 rounded-2xl border border-outline-variant/25 flex flex-col items-center text-center gap-1.5 shadow-2xs"
                >
                  <div className="w-10 h-10 rounded-xl bg-secondary-container flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined text-[20px]">sync</span>
                  </div>
                  <span className="font-headline font-bold text-xs text-on-surface">
                    Force Sync
                  </span>
                  <span className="text-[10px] text-on-surface-variant leading-tight">
                    Push Rules Now
                  </span>
                </button>

                <button
                  onClick={() =>
                    triggerToast('Anchor Child background agent restarted cleanly (PID 4821)')
                  }
                  className="bg-surface hover:bg-surface-container-low active:scale-[0.98] transition-all p-3.5 rounded-2xl border border-outline-variant/25 flex flex-col items-center text-center gap-1.5 shadow-2xs"
                >
                  <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-[20px]">restart_alt</span>
                  </div>
                  <span className="font-headline font-bold text-xs text-on-surface">
                    Restart App
                  </span>
                  <span className="text-[10px] text-on-surface-variant leading-tight">
                    Anchor Agent
                  </span>
                </button>
              </div>
            </section>

            {/* Hardware & Connectivity Bento Grid */}
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                Hardware Telemetry
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {/* Battery Card */}
                <div className="bg-surface rounded-2xl p-4 border border-outline-variant/25 shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-status-enforced/15 text-status-enforced flex items-center justify-center">
                      <span
                        className="material-symbols-outlined text-[18px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        battery_charging_80
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-status-enforced/10 text-status-enforced">
                      {activeChild.isCharging ? 'Charging' : 'Healthy'}
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-on-surface-variant">Battery Level</p>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="font-mono font-bold text-xl text-on-surface">
                      {activeChild.batteryPercent}%
                    </span>
                    <span className="text-[11px] text-on-surface-variant">~14h est.</span>
                  </div>
                </div>

                {/* Network Signal Card */}
                <div className="bg-surface rounded-2xl p-4 border border-outline-variant/25 shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-primary-fixed text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[18px]">wifi</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-surface-container text-on-surface-variant">
                      5 GHz
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-on-surface-variant">Network Link</p>
                  <div className="mt-0.5">
                    <p className="font-headline font-bold text-sm text-on-surface truncate">
                      {activeChild.wifiSsid}
                    </p>
                    <p className="text-[11px] text-on-surface-variant font-mono">
                      LTE Backup Ready
                    </p>
                  </div>
                </div>

                {/* Storage Card */}
                <div className="col-span-2 bg-surface rounded-2xl p-4 border border-outline-variant/25 shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-surface-container-high text-on-surface-variant flex items-center justify-center">
                        <span className="material-symbols-outlined text-[18px]">hard_drive</span>
                      </div>
                      <div>
                        <h4 className="font-headline font-bold text-xs text-on-surface">
                          Internal Storage
                        </h4>
                        <p className="text-[11px] text-on-surface-variant">
                          Games (22.4 GB) • Media (14.1 GB) • System (11.7 GB)
                        </p>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-xs text-on-surface">
                      {activeChild.storageUsedGb} / {activeChild.storageTotalGb} GB
                    </span>
                  </div>
                  <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden flex gap-0.5">
                    <div className="bg-primary h-full w-[18%]" />
                    <div className="bg-secondary h-full w-[11%]" />
                    <div className="bg-outline h-full w-[9%]" />
                  </div>
                </div>
              </div>
            </section>

            {/* Knox & OS Permission Health */}
            <section className="bg-surface rounded-2xl p-4 border border-outline-variant/25 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="material-symbols-outlined text-secondary text-[20px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    verified_user
                  </span>
                  <h3 className="font-headline font-bold text-sm text-on-surface">
                    Guardian Shield &amp; OS Integrity
                  </h3>
                </div>
                <span className="text-[11px] font-mono font-bold text-status-enforced bg-status-enforced/10 px-2.5 py-0.5 rounded-full">
                  4/4 Protected
                </span>
              </div>

              <div className="divide-y divide-outline-variant/15 text-xs">
                <div className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px] text-primary">
                      security
                    </span>
                    <div>
                      <p className="font-semibold text-on-surface">Samsung Knox Shield v3.4</p>
                      <p className="text-[11px] text-on-surface-variant">
                        Hardware-backed tamper prevention active
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-status-enforced">
                    Enforced
                  </span>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px] text-primary">
                      accessibility_new
                    </span>
                    <div>
                      <p className="font-semibold text-on-surface">Accessibility &amp; Usage Stats</p>
                      <p className="text-[11px] text-on-surface-variant">
                        Monitors foreground app launches &amp; screen time
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-status-enforced">
                    Active
                  </span>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px] text-primary">
                      admin_panel_settings
                    </span>
                    <div>
                      <p className="font-semibold text-on-surface">Device Admin Permission</p>
                      <p className="text-[11px] text-on-surface-variant">
                        Blocks unauthorized uninstallation of Anchor Child
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-status-enforced">
                    Locked
                  </span>
                </div>

                <div className="pt-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px] text-secondary">
                      system_update
                    </span>
                    <div>
                      <p className="font-semibold text-on-surface">System Platform</p>
                      <p className="text-[11px] text-on-surface-variant font-mono">
                        {activeChild.osVersion} • Anchor Child v2.4.1
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-on-surface-variant">
                    Up to date
                  </span>
                </div>
              </div>
            </section>

            {/* Lifecycle & Emergency Override Section */}
            <section className="bg-surface-container-low rounded-2xl p-4 border border-outline-variant/25 space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Device Lifecycle &amp; Overrides
              </h3>
              <button
                onClick={() => onSelectScreen('P-03')}
                className="w-full py-2.5 px-3.5 rounded-xl bg-surface hover:bg-surface-container-high border border-outline-variant/30 text-on-surface font-semibold text-xs flex items-center justify-between transition-colors"
              >
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary">
                    phonelink_setup
                  </span>
                  <span>Pair New Replacement Device</span>
                </span>
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
                  chevron_right
                </span>
              </button>

              <button
                onClick={() => setShowPauseModal(true)}
                className="w-full py-2.5 px-3.5 rounded-xl bg-error-container/40 hover:bg-error-container/70 border border-error/20 text-error font-semibold text-xs flex items-center justify-between transition-colors"
              >
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">pause_circle</span>
                  <span>Pause Policy Enforcements...</span>
                </span>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-error/10 text-error">
                  Requires Auth
                </span>
              </button>
            </section>

            {/* Pause Policy Enforcements Modal (Stitch P-05 Modal) */}
            {showPauseModal && (
              <div className="fixed inset-0 z-50 bg-on-surface/50 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-surface rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-outline-variant/30 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-error-container text-error flex items-center justify-center">
                      <span className="material-symbols-outlined">shield_locked</span>
                    </div>
                    <div>
                      <h4 className="font-headline font-extrabold text-base text-on-surface">
                        Pause Safe Limits?
                      </h4>
                      <p className="text-[11px] text-on-surface-variant">
                        {activeChild.name} receives a transparent notification on their device.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(['1 Hour', 'Rest of Day', 'Until Resumed'] as const).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setPauseDurationChoice(opt)}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border ${
                          pauseDurationChoice === opt
                            ? 'bg-primary text-on-primary border-primary'
                            : 'bg-surface-container-low text-on-surface border-outline-variant/30'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setShowPauseModal(false)}
                      className="flex-1 py-2.5 rounded-xl bg-surface-container text-on-surface-variant text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        onUpdateHousehold((prev) => ({
                          ...prev,
                          children: prev.children.map((c) =>
                            c.id === activeChild.id
                              ? {
                                  ...c,
                                  devicePaused: true,
                                  pauseUntilLabel: `Paused (${pauseDurationChoice})`,
                                }
                              : c
                          ),
                        }), `Paused limits for ${pauseDurationChoice}`);
                        setShowPauseModal(false);
                        triggerToast(`Safe limits paused for ${pauseDurationChoice}`);
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-error text-on-error text-xs font-bold"
                    >
                      Confirm Override
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            P-06: SCREEN-TIME ANALYTICS (Stitch 6_parent_code)
           ===================================================================== */}
        {activeScreen === 'P-06' && (
          <div className="space-y-5">
            {/* Time Range Switcher */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-secondary block">
                  Healthy Digital Habits
                </span>
                <h2 className="font-headline font-extrabold text-xl text-on-surface">
                  Screen-Time Analytics
                </h2>
              </div>
              <button
                onClick={() =>
                  triggerToast('Exported 7-Day Family Balance Report (PDF/CSV)')
                }
                className="px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-primary text-xs font-bold flex items-center gap-1 border border-outline-variant/30"
              >
                <span className="material-symbols-outlined text-[15px]">download</span>
                <span>Export</span>
              </button>
            </div>

            <div className="bg-surface-container p-1 rounded-2xl grid grid-cols-4 gap-1">
              {(['Today', '7 Days', '30 Days', 'Custom'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setAnalyticsRange(r)}
                  className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                    analyticsRange === r
                      ? 'bg-surface text-primary font-bold shadow-xs'
                      : 'text-on-surface-variant'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Weekly Balance Scorecard */}
            <div className="bg-surface rounded-3xl p-5 shadow-xs border border-outline-variant/20 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Weekly Balance Scorecard
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-status-enforced/10 text-status-enforced">
                  <span
                    className="material-symbols-outlined text-[14px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    eco
                  </span>
                  Within Healthy Target
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-container-low rounded-2xl p-3.5 border border-outline-variant/15">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-on-surface-variant">Screen Time</span>
                    <span className="text-[10px] font-mono font-bold text-status-enforced bg-status-enforced/10 px-1.5 py-0.5 rounded">
                      -18% vs last wk
                    </span>
                  </div>
                  <p className="font-mono font-extrabold text-2xl text-on-surface">14h 20m</p>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">
                    Avg <strong className="text-on-surface font-mono">2h 02m</strong> / day
                  </p>
                </div>

                <div className="bg-secondary-container/35 rounded-2xl p-3.5 border border-secondary/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-on-secondary-container">
                      Offline Active
                    </span>
                    <span className="text-[10px] font-mono font-bold text-secondary bg-surface px-1.5 py-0.5 rounded">
                      +3h 10m outdoors
                    </span>
                  </div>
                  <p className="font-mono font-extrabold text-2xl text-on-secondary-container">
                    22h 45m
                  </p>
                  <p className="text-[11px] text-on-secondary-container/80 mt-0.5">
                    Soccer, reading &amp; unplugged
                  </p>
                </div>
              </div>

              {/* Sleep Wind-Down Adherence */}
              <div className="pt-3 border-t border-outline-variant/20 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-primary-fixed flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[18px]">bedtime</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-on-surface">Sleep Wind-Down Routine</h4>
                    <p className="text-[11px] text-on-surface-variant">
                      Phone docked before 8:30 PM bedtime lock
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-sm text-status-enforced">
                    6 of 7 days
                  </span>
                  <div className="flex items-center gap-1 mt-1 justify-end">
                    <span className="w-2 h-2 rounded-full bg-status-enforced"></span>
                    <span className="w-2 h-2 rounded-full bg-status-enforced"></span>
                    <span className="w-2 h-2 rounded-full bg-status-enforced"></span>
                    <span className="w-2 h-2 rounded-full bg-status-enforced"></span>
                    <span className="w-2 h-2 rounded-full bg-status-pending"></span>
                    <span className="w-2 h-2 rounded-full bg-status-enforced"></span>
                    <span className="w-2 h-2 rounded-full bg-status-enforced"></span>
                  </div>
                </div>
              </div>
            </div>

            {/* 7-Day Stacked Bar Chart Card */}
            <div className="bg-surface rounded-3xl p-5 shadow-xs border border-outline-variant/20">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-headline font-bold text-sm text-on-surface">
                    Daily Screen Rhythm
                  </h3>
                  <p className="text-[11px] text-on-surface-variant">
                    Dashed line shows 2h 30m daily guideline cap
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-medium">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-xs bg-secondary"></span>Learning
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-xs bg-primary"></span>Games
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-xs bg-tertiary-container"></span>Social
                  </span>
                </div>
              </div>

              <div className="relative h-44 pt-4 pb-6 px-2">
                <div className="absolute inset-x-0 top-10 border-b border-dashed border-primary/40 flex justify-end pr-1">
                  <span className="text-[9px] font-mono font-semibold text-primary bg-surface px-1 -mt-2">
                    2h 30m Limit
                  </span>
                </div>

                <div className="h-full grid grid-cols-7 gap-3 items-end relative z-10">
                  {[
                    { day: 'Mon', total: '1h 55m', edu: 30, game: 35, soc: 10 },
                    { day: 'Tue', total: '2h 10m', edu: 40, game: 30, soc: 15 },
                    { day: 'Wed', total: '1h 40m', edu: 35, game: 25, soc: 8 },
                    { day: 'Thu', total: '2h 05m', edu: 30, game: 40, soc: 12 },
                    { day: 'Fri', total: '2h 40m', edu: 25, game: 52, soc: 18, over: true },
                    { day: 'Sat', total: '1h 35m', edu: 20, game: 32, soc: 10 },
                    { day: 'Today', total: screenMetrics.formattedUsed, edu: 28, game: 38, soc: 12, active: true },
                  ].map((col) => (
                    <div key={col.day} className="flex flex-col items-center h-full justify-end">
                      <span
                        className={`text-[9px] font-mono mb-1 ${
                          col.over
                            ? 'font-bold text-status-pending'
                            : col.active
                            ? 'font-bold text-primary'
                            : 'text-on-surface-variant'
                        }`}
                      >
                        {col.total}
                      </span>
                      <div
                        className={`w-full max-w-[26px] flex flex-col justify-end rounded-t-lg overflow-hidden h-full bg-surface-container-low ${
                          col.active ? 'ring-2 ring-primary/30' : ''
                        }`}
                      >
                        <div className="bg-tertiary-container w-full" style={{ height: `${col.soc}%` }} />
                        <div className="bg-primary w-full" style={{ height: `${col.game}%` }} />
                        <div className="bg-secondary w-full" style={{ height: `${col.edu}%` }} />
                      </div>
                      <span
                        className={`text-[10px] mt-1.5 ${
                          col.active
                            ? 'font-bold text-primary'
                            : 'font-semibold text-on-surface-variant'
                        }`}
                      >
                        {col.day}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-2 pt-3 border-t border-outline-variant/15 flex items-center justify-between text-xs">
                <span className="text-on-surface-variant flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-secondary">
                    auto_awesome
                  </span>
                  <strong>Great balance on Saturday:</strong> 3h outdoor soccer practice logged.
                </span>
              </div>
            </div>

            {/* Top Apps Breakdown */}
            <div className="bg-surface rounded-3xl p-5 shadow-xs border border-outline-variant/20 space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-headline font-bold text-sm text-on-surface">
                    Top Apps Breakdown (7 Days)
                  </h3>
                  <p className="text-[11px] text-on-surface-variant">
                    Tap any app to adjust daily time caps
                  </p>
                </div>
                <button
                  onClick={() => onSelectScreen('P-07')}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Manage Rules
                </button>
              </div>

              {[
                { name: 'Duolingo: Language', badge: 'Always Allowed', badgeColor: 'bg-secondary-container text-on-secondary-container', time: '3h 40m', pct: 82, bar: 'bg-secondary', icon: 'school' },
                { name: 'Minecraft', badge: '1h / day cap', badgeColor: 'bg-primary-fixed text-primary', time: '3h 10m', pct: 72, bar: 'bg-primary', icon: 'deployed_code' },
                { name: 'Khan Academy', badge: 'Learning Bonus', badgeColor: 'bg-secondary-container text-on-secondary-container', time: '2h 50m', pct: 64, bar: 'bg-secondary', icon: 'menu_book' },
                { name: 'Roblox', badge: '45m / day cap', badgeColor: 'bg-primary-fixed text-primary', time: '2h 15m', pct: 50, bar: 'bg-primary', icon: 'sports_esports' },
                { name: 'WhatsApp (Family)', badge: '30m / day cap', badgeColor: 'bg-tertiary-fixed text-tertiary', time: '1h 10m', pct: 28, bar: 'bg-tertiary-container', icon: 'forum' },
              ].map((app) => (
                <div
                  key={app.name}
                  onClick={() => onSelectScreen('P-07')}
                  className="space-y-1.5 cursor-pointer"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-surface-container-low flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-[18px]">{app.icon}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-on-surface">{app.name}</span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${app.badgeColor}`}>
                            {app.badge}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-xs text-on-surface">{app.time}</span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                    <div className={`${app.bar} h-full rounded-full`} style={{ width: `${app.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Pickups & Coaching Insight */}
            <div className="bg-secondary-container/35 border border-secondary/25 rounded-2xl p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-secondary text-on-secondary flex items-center justify-center shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[20px]">lightbulb</span>
              </div>
              <div className="space-y-1.5">
                <h4 className="font-headline font-bold text-xs text-on-secondary-container">
                  Guardian Coaching Insight
                </h4>
                <p className="text-xs text-on-secondary-container/90 leading-relaxed">
                  {activeChild.name.split(' ')[0]} completed <strong>5 consecutive days</strong> of Duolingo before opening any gaming apps. Consider awarding a +15m weekend bonus!
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => onSelectScreen('P-12')}
                    className="px-3 py-1.5 rounded-lg bg-secondary text-on-secondary font-bold text-[11px]"
                  >
                    Discuss in Family Chat
                  </button>
                  <button
                    onClick={() => onSelectScreen('P-07')}
                    className="px-3 py-1.5 rounded-lg bg-surface text-on-surface font-semibold text-[11px] border border-outline-variant/30"
                  >
                    Adjust App Limits
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            P-07: APP USAGE & LIMITS (Stitch 7_parent_code)
           ===================================================================== */}
        {activeScreen === 'P-07' && (
          <div className="space-y-5">
            {/* Child Context Hero Bar */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-on-surface-variant">
                  Managing App Boundaries for
                </p>
                <h2 className="text-xl font-extrabold font-headline text-on-surface tracking-tight">
                  {activeChild.name.split(' ')[0]}&apos;s Device Limits
                </h2>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary-container/50 text-on-secondary-container text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-status-enforced"></span>
                <span>Enforced 2m ago</span>
              </div>
            </div>

            {/* 3-Tab Segmented Navigation */}
            <div className="grid grid-cols-3 p-1 bg-surface-container rounded-xl">
              {[
                { id: 'CATEGORIES', label: 'App Categories' },
                { id: 'INDIVIDUAL', label: 'Individual Apps' },
                { id: 'DOWNTIME', label: 'Downtime' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    if (t.id === 'DOWNTIME') {
                      onSelectScreen('P-08');
                    } else {
                      setP07SubTab(t.id as 'CATEGORIES' | 'INDIVIDUAL');
                    }
                  }}
                  className={`py-2 px-2 rounded-lg text-xs font-bold transition-all ${
                    p07SubTab === t.id
                      ? 'bg-surface text-primary shadow-xs'
                      : 'text-on-surface-variant'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Master Daily Screen Allowance Card */}
            <div className="bg-surface rounded-2xl p-5 shadow-xs border border-outline-variant/15">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                    Global Daily Cap
                  </span>
                  <h3 className="text-base font-bold font-headline text-on-surface mt-0.5">
                    Daily Screen Allowance
                  </h3>
                </div>
                <div className="text-right">
                  <span className="font-mono text-lg font-bold text-primary">
                    {screenMetrics.formattedAllowance}
                  </span>
                  <p className="text-[11px] text-on-surface-variant">Weekdays (Mon–Fri)</p>
                </div>
              </div>

              {/* Multi-Segment Usage Bar */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-on-surface font-mono">
                    {screenMetrics.formattedUsed} used today
                  </span>
                  <span className="text-secondary font-semibold font-mono">
                    {screenMetrics.formattedRemaining} remaining
                  </span>
                </div>
                <div className="h-3 w-full bg-surface-container-high rounded-full overflow-hidden flex gap-0.5 p-0.5">
                  <div className="h-full bg-primary rounded-l-full w-[38%]" />
                  <div className="h-full bg-secondary w-[22%]" />
                  <div className="h-full bg-tertiary-container rounded-r-full w-[12%]" />
                </div>
                <div className="flex items-center gap-4 text-[11px] text-on-surface-variant pt-1">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-primary"></span>Games (1h 10m)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-secondary"></span>Education (45m)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-tertiary-container"></span>Social (20m)
                  </span>
                </div>
              </div>

              {/* Stepper Adjustment Row */}
              <div className="pt-3 border-t border-surface-container flex items-center justify-between">
                <span className="text-xs font-medium text-on-surface-variant">
                  Adjust Today&apos;s Allowance
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={!canEditRules}
                    onClick={() =>
                      onUpdateHousehold((prev) => ({
                        ...prev,
                        children: prev.children.map((c) =>
                          c.id === activeChild.id
                            ? {
                                ...c,
                                dailyAllowanceMinutes: Math.max(30, c.dailyAllowanceMinutes - 15),
                              }
                            : c
                        ),
                      }), 'Reduced daily allowance by 15m')
                    }
                    className="w-8 h-8 rounded-lg bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface font-mono font-bold text-xs"
                  >
                    -15m
                  </button>
                  <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-md bg-surface-container-low text-on-surface">
                    {screenMetrics.formattedAllowance} / day
                  </span>
                  <button
                    disabled={!canEditRules}
                    onClick={() =>
                      onUpdateHousehold((prev) => ({
                        ...prev,
                        children: prev.children.map((c) =>
                          c.id === activeChild.id
                            ? { ...c, dailyAllowanceMinutes: c.dailyAllowanceMinutes + 15 }
                            : c
                        ),
                      }), 'Increased daily allowance by 15m')
                    }
                    className="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center font-mono font-bold text-xs"
                  >
                    +15m
                  </button>
                </div>
              </div>
            </div>

            {/* Individual / Category App Rules List */}
            <div className="space-y-3">
              {childApps.map((app) => (
                <div
                  key={app.id}
                  className="bg-surface rounded-2xl p-4 shadow-xs border border-outline-variant/15 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        app.blocked
                          ? 'bg-error-container text-error'
                          : app.alwaysAllowed
                          ? 'bg-secondary-container text-secondary'
                          : 'bg-primary-fixed text-primary'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {app.category.includes('Games')
                          ? 'sports_esports'
                          : app.category.includes('Learning')
                          ? 'school'
                          : app.category.includes('Social')
                          ? 'forum'
                          : 'public'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-bold text-on-surface truncate">{app.name}</p>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            app.syncStatus === 'Synced'
                              ? 'bg-status-enforced/10 text-status-enforced'
                              : 'bg-status-pending/15 text-status-pending'
                          }`}
                        >
                          {app.syncStatus}
                        </span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant font-mono mt-0.5">
                        {app.category} • Used {formatMinutesHuman(app.usedMinutesToday)}
                        {app.dailyLimitMinutes ? ` / ${formatMinutesHuman(app.dailyLimitMinutes)} cap` : ' • Unlimited'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {app.dailyLimitMinutes !== null && !app.blocked && (
                      <button
                        onClick={() =>
                          onUpdateHousehold((prev) => ({
                            ...prev,
                            apps: prev.apps.map((item) =>
                              item.id === app.id
                                ? {
                                    ...item,
                                    dailyLimitMinutes: (item.dailyLimitMinutes || 30) + 15,
                                    syncStatus: 'Synced',
                                  }
                                : item
                            ),
                          }), `Added +15m cap to ${app.name}`)
                        }
                        className="px-2 py-1 rounded-lg bg-surface-container text-[11px] font-mono font-bold text-primary hover:bg-primary-fixed"
                      >
                        +15m
                      </button>
                    )}
                    <button
                      onClick={() => {
                        onUpdateHousehold((prev) => ({
                          ...prev,
                          apps: prev.apps.map((item) =>
                            item.id === app.id
                              ? { ...item, blocked: !item.blocked, syncStatus: 'Synced' }
                              : item
                          ),
                        }), `Toggled block on ${app.name}`);
                        triggerToast(
                          `${app.name} is now ${!app.blocked ? 'Blocked' : 'Allowed'}`
                        );
                      }}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                        app.blocked
                          ? 'bg-error text-on-error'
                          : 'bg-surface-container-low text-on-surface hover:bg-surface-container-high border border-outline-variant/30'
                      }`}
                    >
                      {app.blocked ? 'Blocked' : 'Active'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Custom App Rule Button & Modal */}
            {showAddAppModal ? (
              <div className="bg-surface rounded-2xl p-4 border border-primary/30 space-y-3">
                <h4 className="font-headline font-bold text-xs text-primary uppercase">
                  New Custom App Rule
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="App Name (e.g. Pokémon GO)"
                    value={newAppRuleName}
                    onChange={(e) => setNewAppRuleName(e.target.value)}
                    className="col-span-2 h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant/40 text-xs"
                  />
                  <input
                    type="number"
                    placeholder="Cap (min)"
                    value={newAppRuleLimit}
                    onChange={(e) => setNewAppRuleLimit(e.target.value)}
                    className="h-9 px-2.5 rounded-lg bg-surface-container-low border border-outline-variant/40 text-xs font-mono"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowAddAppModal(false)}
                    className="px-3 py-1.5 text-xs text-on-surface-variant"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!newAppRuleName.trim()) return;
                      onUpdateHousehold((prev) => ({
                        ...prev,
                        apps: [
                          ...prev.apps,
                          {
                            id: `app-${Date.now()}`,
                            childId: activeChild.id,
                            name: newAppRuleName.trim(),
                            packageName: 'com.custom.app',
                            category: 'Games & Entertainment',
                            usedMinutesToday: 0,
                            dailyLimitMinutes: Number(newAppRuleLimit) || 45,
                            blocked: false,
                            alwaysAllowed: false,
                            syncStatus: 'Synced',
                            iconName: 'Gamepad2',
                          },
                        ],
                      }), `Added app rule for ${newAppRuleName}`);
                      setNewAppRuleName('');
                      setShowAddAppModal(false);
                      triggerToast('Custom app limit added & synced');
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-bold"
                  >
                    Save Rule
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddAppModal(true)}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-primary to-primary-container text-on-primary font-headline font-bold text-sm shadow-md flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">add_circle</span>
                <span>Add App Rule</span>
              </button>
            )}
          </div>
        )}

        {/* =====================================================================
            P-08: SCHEDULES & DOWNTIME (Stitch 8_parent_code)
           ===================================================================== */}
        {activeScreen === 'P-08' && (
          <div className="space-y-5">
            {/* Hero Status Banner */}
            <div className="bg-gradient-to-br from-primary to-primary-container rounded-2xl p-5 text-on-primary shadow-sm relative overflow-hidden">
              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-[11px] font-semibold tracking-wide uppercase mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary-fixed"></span>
                    Current Mode: Free Play Window
                  </span>
                  <h2 className="font-headline font-extrabold text-xl tracking-tight">
                    Active until 8:30 PM
                  </h2>
                  <p className="text-xs text-on-primary-container mt-1">
                    Next Rhythm:{' '}
                    <span className="text-white font-semibold">Bedtime Wind-Down</span> in 1h 45m
                  </p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center border border-white/15">
                  <span className="material-symbols-outlined text-2xl">partly_cloudy_night</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs">
                <span className="text-on-primary-container flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px]">notifications_active</span>
                  {activeChild.name.split(' ')[0]} receives fair warnings at 8:15 PM &amp; 8:25 PM
                </span>
                <span className="font-mono font-bold text-secondary-fixed">SYNCED</span>
              </div>
            </div>

            {/* 24-Hour Daily Rhythm Bar */}
            <div className="bg-surface rounded-2xl p-4 shadow-xs border border-outline-variant/15">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-headline font-bold text-sm text-on-surface">
                    Today&apos;s 24-Hour Rhythm
                  </h3>
                  <p className="text-[11px] text-on-surface-variant">
                     Predictable structure helps kids wind down without conflict
                  </p>
                </div>
                <span className="font-mono text-xs font-bold text-primary bg-primary-fixed/50 px-2 py-0.5 rounded-md">
                  Thu
                </span>
              </div>

              <div className="relative pt-4 pb-2">
                <div
                  className="absolute top-0 left-[72%] -translate-x-1/2 flex flex-col items-center z-10"
                >
                  <span className="text-[9px] font-mono font-bold bg-on-surface text-surface px-1.5 py-0.5 rounded">
                    6:45 PM
                  </span>
                  <div className="w-0.5 h-6 bg-on-surface"></div>
                </div>
                <div className="h-4 w-full rounded-full overflow-hidden flex gap-0.5 bg-surface-container p-0.5">
                  <div className="h-full bg-primary w-[29%] rounded-l-full" />
                  <div className="h-full bg-secondary-fixed w-[4%]"/>
                  <div className="h-full bg-tertiary-fixed-dim w-[31%]" />
                  <div className="h-full bg-secondary w-[21%]" />
                  <div className="h-full bg-primary w-[15%] rounded-r-full" />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-on-surface-variant mt-1.5 px-0.5">
                  <span>12a</span>
                  <span>7a</span>
                  <span>8a School</span>
                  <span>3:30p Play</span>
                  <span>8:30p Bed</span>
                </div>
              </div>
            </div>

            {/* Recurring Schedule Cards */}
            <div className="space-y-3">
              {childSchedules.map((sched) => (
                <div
                  key={sched.id}
                  className="bg-surface rounded-2xl p-4 shadow-xs border border-outline-variant/15 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          sched.type === 'BEDTIME'
                            ? 'bg-primary-fixed text-primary'
                            : sched.type === 'SCHOOL'
                            ? 'bg-tertiary-fixed text-tertiary'
                            : 'bg-secondary-container text-secondary'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[22px]">
                          {sched.type === 'BEDTIME'
                            ? 'bedtime'
                            : sched.type === 'SCHOOL'
                            ? 'school'
                            : 'restaurant'}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-headline font-bold text-sm text-on-surface">
                            {sched.title}
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-status-enforced/10 text-status-enforced">
                            {sched.enabled ? 'Enforced' : 'Paused'}
                          </span>
                        </div>
                        <p className="text-xs font-mono font-semibold text-primary mt-0.5">
                          {sched.startTime} – {sched.endTime} • {sched.daysLabel}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        onUpdateHousehold((prev) => ({
                          ...prev,
                          schedules: prev.schedules.map((s) =>
                            s.id === sched.id ? { ...s, enabled: !s.enabled } : s
                          ),
                        }), `Toggled schedule ${sched.title}`);
                        triggerToast(`${sched.title} ${!sched.enabled ? 'enabled' : 'paused'}`);
                      }}
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors ${
                        sched.enabled ? 'bg-primary' : 'bg-outline-variant'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white transition-transform ${
                          sched.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  <div className="pt-2 border-t border-surface-container flex items-center justify-between text-[11px] text-on-surface-variant">
                    <span>Allowed Exceptions: {sched.allowedExceptions}</span>
                    <span className="font-mono text-secondary font-semibold">Knox Synced</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Instant Pause / Focus Block Card */}
            <div className="bg-surface-container-low rounded-2xl p-4 border border-outline-variant/20 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-surface-container-highest flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[20px]">pause_circle</span>
                  </div>
                  <div>
                    <h4 className="font-headline font-bold text-sm text-on-surface">
                      Instant Pause / Focus Block
                    </h4>
                    <p className="text-[11px] text-on-surface-variant">
                      Temporarily quiet non-essential apps right now
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['30m', '1h', 'Until Bed'] as const).map((dur) => (
                  <button
                    key={dur}
                    onClick={() => setInstantQuietDuration(dur)}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-colors ${
                      instantQuietDuration === dur
                        ? 'bg-primary-fixed/60 border-primary/30 text-primary font-bold'
                        : 'bg-surface border-outline-variant/30 text-on-surface'
                    }`}
                  >
                    {dur}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  onUpdateHousehold((prev) => ({
                    ...prev,
                    children: prev.children.map((c) =>
                      c.id === activeChild.id
                        ? {
                            ...c,
                            devicePaused: true,
                            pauseUntilLabel: `Quiet Time (${instantQuietDuration})`,
                          }
                        : c
                    ),
                  }), `Activated Instant Quiet Time (${instantQuietDuration})`);
                  triggerToast(`Activated Instant Quiet Time for ${instantQuietDuration}`);
                }}
                className="w-full py-2.5 rounded-xl bg-surface-container-highest hover:bg-primary hover:text-on-primary text-on-surface font-headline font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">timer</span>
                <span>Activate Instant Quiet Time ({instantQuietDuration})</span>
              </button>
            </div>
          </div>
        )}

        {/* =====================================================================
            P-09: LOCATION & GEOFENCES (Stitch 9_parent_code)
           ===================================================================== */}
        {activeScreen === 'P-09' && (
          <div className="space-y-5">
            {/* Child Context Selector Strip */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {household.children.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelectChild(c.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      c.id === activeChild.id
                        ? 'bg-primary text-on-primary shadow-xs'
                        : 'bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    <span>{c.name.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-container/60 text-on-secondary-container text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-status-enforced animate-pulse"></span>
                <span>Live GPS (±{activeChild.gpsAccuracyMeters}m)</span>
              </div>
            </div>

            {/* Interactive Map Viewport & Active Safe Zone */}
            <div className="bg-surface rounded-2xl overflow-hidden shadow-xs border border-outline-variant/20">
              <div
                className={`relative h-64 w-full overflow-hidden ${
                  mapMode === 'SAT'
                    ? 'bg-slate-800 text-white'
                    : 'bg-[#e6eefb]'
                }`}
              >
                {/* SVG Street Grid & Safe Zone Circles */}
                <svg className="w-full h-full" viewBox="0 0 400 260">
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path
                        d="M 40 0 L 0 0 0 40"
                        fill="none"
                        stroke={mapMode === 'SAT' ? '#334155' : '#cbd5e1'}
                        strokeWidth="0.7"
                      />
                    </pattern>
                  </defs>
                  <rect width="400" height="260" fill="url(#grid)" />
                  {/* Roads */}
                  <path
                    d="M 0 130 Q 160 120 400 150"
                    stroke={mapMode === 'SAT' ? '#475569' : '#ffffff'}
                    strokeWidth="10"
                    fill="none"
                  />
                  <path
                    d="M 210 0 L 185 260"
                    stroke={mapMode === 'SAT' ? '#475569' : '#ffffff'}
                    strokeWidth="8"
                    fill="none"
                  />
                  {/* Geofence Radius Circle: Oakridge Middle School */}
                  <circle
                    cx="195"
                    cy="128"
                    r="58"
                    fill="rgba(0, 107, 88, 0.16)"
                    stroke="#006b58"
                    strokeWidth="2"
                    strokeDasharray="6 4"
                  />
                  {/* Secondary Geofence: Home Sanctuary */}
                  <circle
                    cx="85"
                    cy="68"
                    r="28"
                    fill="rgba(17, 60, 141, 0.12)"
                    stroke="#113c8d"
                    strokeWidth="1.5"
                  />
                </svg>

                {/* Top Overlay Controls */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                  <div className="bg-surface/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-xs border border-outline-variant/20 flex items-center gap-2 pointer-events-auto">
                    <span className="material-symbols-outlined text-status-enforced text-[16px]">
                      battery_charging_80
                    </span>
                    <span className="font-mono text-xs font-bold text-on-surface">
                      {activeChild.batteryPercent}%
                    </span>
                    <span className="text-outline-variant">•</span>
                    <span className="text-[11px] font-medium text-on-surface-variant">
                      GPS High Precision
                    </span>
                  </div>

                  <div className="bg-surface/95 backdrop-blur-md p-1 rounded-xl shadow-xs border border-outline-variant/20 flex items-center gap-1 pointer-events-auto">
                    <button
                      onClick={() => setMapMode('MAP')}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                        mapMode === 'MAP'
                          ? 'bg-primary text-on-primary'
                          : 'text-on-surface-variant'
                      }`}
                    >
                      Map
                    </button>
                    <button
                      onClick={() => setMapMode('SAT')}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                        mapMode === 'SAT'
                          ? 'bg-primary text-on-primary'
                          : 'text-on-surface-variant'
                      }`}
                    >
                      Sat
                    </button>
                  </div>
                </div>

                {/* Center Child Pin */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                  <div className="relative flex flex-col items-center">
                    <div className="bg-primary text-on-primary px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-md mb-1 whitespace-nowrap flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">school</span>
                      <span>{activeChild.currentLocationName}</span>
                    </div>
                    <div className="w-11 h-11 rounded-full p-0.5 bg-surface shadow-lg border-2 border-secondary relative">
                      <img
                        src={activeChild.id === 'child-leo' ? LEO_AVATAR : MAYA_AVATAR}
                        alt={activeChild.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-status-enforced border-2 border-surface"></span>
                    </div>
                  </div>
                </div>

                {/* Bottom Map Attribution */}
                <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
                  <span className="bg-surface/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-mono text-on-surface-variant shadow-xs">
                    Updated 30 seconds ago
                  </span>
                </div>
              </div>

              {/* Active Location Card Footer */}
              <div className="p-4 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="material-symbols-outlined text-secondary text-[18px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      verified
                    </span>
                    <h2 className="font-headline font-bold text-sm text-on-surface">
                      Safe at School • Verified
                    </h2>
                  </div>
                  <p className="text-xs text-on-surface-variant">
                    {activeChild.currentLocationAddress}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => triggerToast('Live GPS ping refreshed (±3m accuracy)')}
                    className="px-3 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">refresh</span>
                    <span>Ping GPS</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Configured Safe Geofences */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-headline font-bold text-base text-on-surface">
                    Configured Safe Geofences
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    Instant entry &amp; exit notifications for guardians
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-secondary bg-secondary-container/50 px-2.5 py-1 rounded-lg">
                  {household.geofences.length} Active Zones
                </span>
              </div>

              {household.geofences.map((geo) => (
                <div
                  key={geo.id}
                  className="bg-surface rounded-2xl p-4 shadow-xs border border-outline-variant/15 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          geo.currentlyInside
                            ? 'bg-secondary-container text-secondary'
                            : 'bg-primary-fixed text-primary'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[22px]">
                          {geo.name.includes('School')
                            ? 'school'
                            : geo.name.includes('Home')
                            ? 'home'
                            : 'sports_soccer'}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-headline font-bold text-sm text-on-surface">
                            {geo.name}
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-surface-container-high text-on-surface">
                            {geo.radiusMeters}m
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          {geo.address} • {geo.lastTransitionLabel}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        onUpdateHousehold((prev) => ({
                          ...prev,
                          geofences: prev.geofences.map((g) =>
                            g.id === geo.id ? { ...g, notifyOnArrive: !g.notifyOnArrive } : g
                          ),
                        }), `Updated geofence alerts for ${geo.name}`)
                      }
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        geo.notifyOnArrive
                          ? 'bg-status-enforced/10 text-status-enforced'
                          : 'bg-surface-container text-on-surface-variant'
                      }`}
                    >
                      {geo.notifyOnArrive ? 'Arrive + Leave' : 'Muted'}
                    </button>
                  </div>
                </div>
              ))}

              {/* Create New Geofence Form / CTA */}
              {showAddGeofenceForm ? (
                <div className="bg-surface rounded-2xl p-4 border border-primary/30 space-y-3">
                  <h4 className="font-headline font-bold text-xs text-primary uppercase">
                    Add Safe Zone Geofence
                  </h4>
                  <input
                    type="text"
                    placeholder="Zone Name (e.g. Grandma's House)"
                    value={newGeoName}
                    onChange={(e) => setNewGeoName(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant/40 text-xs"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Street Address"
                      value={newGeoAddress}
                      onChange={(e) => setNewGeoAddress(e.target.value)}
                      className="col-span-2 h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant/40 text-xs"
                    />
                    <input
                      type="number"
                      placeholder="Radius (m)"
                      value={newGeoRadius}
                      onChange={(e) => setNewGeoRadius(Number(e.target.value))}
                      className="h-9 px-2.5 rounded-lg bg-surface-container-low border border-outline-variant/40 text-xs font-mono"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowAddGeofenceForm(false)}
                      className="px-3 py-1.5 text-xs text-on-surface-variant"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (!newGeoName.trim()) return;
                        onUpdateHousehold((prev) => ({
                          ...prev,
                          geofences: [
                            ...prev.geofences,
                            {
                              id: `geo-${Date.now()}`,
                              name: newGeoName.trim(),
                              address: newGeoAddress.trim() || 'Maple District',
                              radiusMeters: newGeoRadius || 250,
                              notifyOnArrive: true,
                              notifyOnLeave: true,
                              currentlyInside: false,
                              lastTransitionLabel: 'Created just now',
                            },
                          ],
                        }), `Added geofence ${newGeoName}`);
                        setNewGeoName('');
                        setNewGeoAddress('');
                        setShowAddGeofenceForm(false);
                        triggerToast('New Safe Zone geofence active!');
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-bold"
                    >
                      Save Safe Zone
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddGeofenceForm(true)}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-primary to-primary-container text-on-primary font-headline font-bold text-sm shadow-md flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[20px]">add_location_alt</span>
                  <span>Create New Safe Zone Geofence</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* =====================================================================
            P-10: ALERTS & SOS ACTIVITY (Stitch 10_parent_code)
           ===================================================================== */}
        {activeScreen === 'P-10' && (
          <div className="space-y-5">
            {/* Emergency Readiness Card */}
            <div className="bg-surface rounded-2xl p-5 shadow-xs border border-outline-variant/15 relative overflow-hidden">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-bold uppercase tracking-wide">
                    <span
                      className="material-symbols-outlined text-[14px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      verified_user
                    </span>
                    <span>All Quiet &amp; Protected</span>
                  </div>
                  <h2 className="font-headline font-extrabold text-lg text-on-surface pt-1">
                    No Active SOS Emergencies
                  </h2>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Emergency override bypasses silent/Do-Not-Disturb on both parent devices. Last drill verified in 1.4s.
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-secondary-container/60 flex items-center justify-center text-secondary shrink-0">
                  <span className="material-symbols-outlined text-2xl">health_and_safety</span>
                </div>
              </div>

              <div className="mt-4 pt-3.5 border-t border-surface-container flex items-center justify-between gap-2">
                <div className="text-[11px] text-on-surface-variant font-mono">
                  Escalation: Mom &amp; Dad → Grandma Eleanor
                </div>
                <button
                  onClick={() => setShowSosDrillModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-primary-fixed hover:bg-primary hover:text-on-primary text-primary font-headline font-bold text-xs transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px]">campaign</span>
                  <span>Test Family SOS Siren</span>
                </button>
              </div>
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {[
                { id: 'ALL', label: `All Events (${household.alerts.length})` },
                { id: 'EMERGENCY_SOS', label: 'Emergency & SOS' },
                { id: 'GEOFENCE', label: 'Geofences' },
                { id: 'DEVICE_HEALTH', label: 'Device Health' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setAlertFilter(tab.id as typeof alertFilter)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-colors ${
                    alertFilter === tab.id
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'bg-surface-container text-on-surface-variant'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Detailed Safety Timeline */}
            <div className="space-y-3">
              {household.alerts
                .filter((a) => alertFilter === 'ALL' || a.category === alertFilter)
                .map((alert) => (
                  <div
                    key={alert.id}
                    className={`bg-surface rounded-2xl p-4 shadow-xs border space-y-2.5 ${
                      alert.category === 'EMERGENCY_SOS'
                        ? 'border-error/30 bg-error-container/10'
                        : 'border-outline-variant/15'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            alert.category === 'EMERGENCY_SOS'
                              ? 'bg-error text-on-error'
                              : alert.category === 'GEOFENCE'
                              ? 'bg-secondary-container text-secondary'
                              : 'bg-primary-fixed text-primary'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {alert.category === 'EMERGENCY_SOS'
                              ? 'sos'
                              : alert.category === 'GEOFENCE'
                              ? 'location_on'
                              : 'battery_alert'}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-headline font-bold text-xs text-on-surface">
                              {alert.title}
                            </h4>
                            {alert.isDrill && (
                              <span className="px-1.5 py-0.5 rounded bg-error/15 text-error font-mono text-[9px] font-bold">
                                PRACTICE DRILL
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-on-surface-variant mt-0.5">
                            {alert.description}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-on-surface-variant shrink-0">
                        {alert.timestampLabel}
                      </span>
                    </div>

                    {alert.category === 'EMERGENCY_SOS' && (
                      <div className="bg-surface-container-low rounded-xl p-2.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              setPlayingSosAudioId(playingSosAudioId === alert.id ? null : alert.id)
                            }
                            className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              {playingSosAudioId === alert.id ? 'pause' : 'play_arrow'}
                            </span>
                          </button>
                          <span className="font-semibold text-on-surface text-[11px]">
                            5s Ambient Audio Beacon
                          </span>
                        </div>
                        <span className="font-mono text-[10px] text-status-enforced">
                          {alert.acknowledgedBy ? `Ack by ${alert.acknowledgedBy}` : 'Verified'}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
            </div>

            {/* Family SOS Drill Modal */}
            {showSosDrillModal && (
              <div className="fixed inset-0 z-50 bg-on-surface/50 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-surface rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-outline-variant/30 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined">campaign</span>
                    </div>
                    <div>
                      <h4 className="font-headline font-extrabold text-base text-on-surface">
                        Run Family SOS Drill?
                      </h4>
                      <p className="text-[11px] text-on-surface-variant">
                        Sends a practice check-in ping to all guardians and logs a drill record.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowSosDrillModal(false)}
                      className="flex-1 py-2.5 rounded-xl bg-surface-container text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        onUpdateHousehold((prev) => ({
                          ...prev,
                          alerts: [
                            {
                              id: `alert-drill-${Date.now()}`,
                              childId: activeChild.id,
                              category: 'EMERGENCY_SOS',
                              title: 'Emergency SOS Check-in Test',
                              description: 'Practice drill executed by Sarah (Mom) • 1.2s delivery',
                              timestampLabel: 'Just now',
                              locationLabel: activeChild.currentLocationName,
                              acknowledgedBy: 'Sarah (Mom)',
                              isDrill: true,
                            },
                            ...prev.alerts,
                          ],
                        }), 'Executed Family SOS Drill');
                        setShowSosDrillModal(false);
                        triggerToast('Practice SOS Drill verified across all guardian devices!');
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold"
                    >
                      Execute Test Ping
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            P-11: EXTRA TIME & APP REQUESTS (Stitch 11_parent_code)
           ===================================================================== */}
        {activeScreen === 'P-11' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Family Accountability Inbox
                </p>
                <h2 className="font-headline font-extrabold text-xl text-on-surface">
                  Extra Time &amp; App Requests
                </h2>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-tertiary-fixed text-tertiary font-mono font-bold text-xs">
                {pendingRequests.length} Pending
              </span>
            </div>

            {/* Priority Requests Cards */}
            <div className="space-y-3.5">
              {household.requests.map((req) => (
                <div
                  key={req.id}
                  className={`bg-surface rounded-2xl p-5 shadow-xs border space-y-4 ${
                    req.status === 'PENDING'
                      ? 'border-l-4 border-status-pending border-outline-variant/20'
                      : 'border-outline-variant/15 opacity-85'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center">
                        <span className="material-symbols-outlined text-[22px]">
                          {req.type === 'NEW_APP_INSTALL' ? 'download' : 'more_time'}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-headline font-bold text-sm text-on-surface">
                            {req.targetName}
                          </h3>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              req.status === 'PENDING'
                                ? 'bg-status-pending/15 text-status-pending'
                                : req.status === 'APPROVED'
                                ? 'bg-status-enforced/15 text-status-enforced'
                                : 'bg-error-container text-error'
                            }`}
                          >
                            {req.status === 'PENDING'
                              ? `Asking +${req.requestedMinutes}m`
                              : req.status}
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant">
                          From {req.childName} • {req.targetCategory} • {req.createdAtLabel}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Child's Reason Quote Bubble */}
                  <div className="bg-surface-container-low rounded-xl p-3 border border-outline-variant/20">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-0.5">
                      Child&apos;s Note ({req.reasonCategory})
                    </p>
                    <p className="text-xs text-on-surface italic">&ldquo;{req.childNote}&rdquo;</p>
                  </div>

                  {req.status === 'PENDING' ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => handleDecisionOnRequest(req.id, 'APPROVED', 15)}
                          className="py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs shadow-xs"
                        >
                          Approve +15m
                        </button>
                        <button
                          onClick={() => handleDecisionOnRequest(req.id, 'APPROVED', 30)}
                          className="py-2.5 rounded-xl bg-primary-fixed text-primary font-bold text-xs"
                        >
                          +30 Min
                        </button>
                        <button
                          onClick={() =>
                            handleDecisionOnRequest(
                              req.id,
                              'DECLINED',
                              0,
                              'Finish homework first, then we can unlock extra play!'
                            )
                          }
                          className="py-2.5 rounded-xl bg-surface-container-high text-on-surface-variant font-semibold text-xs"
                        >
                          Decline Kindly
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-surface-container flex items-center justify-between text-xs text-on-surface-variant">
                      <span>Decided by {req.decidedBy || 'Guardian'}</span>
                      <span className="font-semibold text-on-surface">{req.parentNote}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Collaborative Safeguard Rules */}
            <div className="bg-surface rounded-2xl p-4 border border-outline-variant/20 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-headline font-bold text-sm text-on-surface">
                    Auto-Approve School &amp; Learning Apps
                  </h4>
                  <p className="text-xs text-on-surface-variant">
                    Automatically grant extra time for verified education apps (Khan Academy, Duolingo)
                  </p>
                </div>
                <button
                  onClick={() =>
                    onUpdateHousehold((prev) => ({
                      ...prev,
                      autoApproveHomeworkApps: !prev.autoApproveHomeworkApps,
                    }), 'Toggled auto-approve homework apps')
                  }
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors ${
                    household.autoApproveHomeworkApps ? 'bg-secondary' : 'bg-outline-variant'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      household.autoApproveHomeworkApps ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            P-12: FAMILY CHAT & SHARED TASKS (Stitch 12_parent_code)
           ===================================================================== */}
        {activeScreen === 'P-12' && (
          <div className="space-y-4">
            {/* Segmented View Toggle */}
            <div className="bg-surface-container p-1 rounded-xl grid grid-cols-2 gap-1">
              <button
                onClick={() => setP12Tab('CHAT')}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 ${
                  p12Tab === 'CHAT'
                    ? 'bg-surface text-primary shadow-xs'
                    : 'text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">forum</span>
                <span>Chat &amp; Pacts</span>
              </button>
              <button
                onClick={() => setP12Tab('TASKS')}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 ${
                  p12Tab === 'TASKS'
                    ? 'bg-surface text-primary shadow-xs'
                    : 'text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">task_alt</span>
                <span>
                  Tasks &amp; Rewards ({household.tasks.filter((t) => t.completed).length}/
                  {household.tasks.length})
                </span>
              </button>
            </div>

            {/* Active Evening Pact Card */}
            <div className="bg-surface rounded-2xl p-4 shadow-xs border border-outline-variant/15 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-secondary-container flex items-center justify-center text-secondary">
                    <span
                      className="material-symbols-outlined text-[20px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      handshake
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                        Active Evening Pact
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-secondary-container/60 text-on-secondary-container">
                        +25m Bonus Unlocked
                      </span>
                    </div>
                    <h3 className="font-headline font-bold text-sm text-on-surface">
                      Today&apos;s Evening Rhythm: Wind-down at 8:30 PM
                    </h3>
                  </div>
                </div>
              </div>

              {/* Tasks / Habits Checklist */}
              <div className="space-y-2">
                {household.tasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => {
                      onUpdateHousehold((prev) => ({
                        ...prev,
                        tasks: prev.tasks.map((t) =>
                          t.id === task.id
                            ? { ...t, completed: !t.completed, verifiedByParent: !t.completed }
                            : t
                        ),
                      }), `Updated task ${task.title}`);
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${
                      task.completed
                        ? 'bg-secondary-container/25 border border-secondary/20'
                        : 'bg-surface-container-low border border-outline-variant/25'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`material-symbols-outlined text-[18px] ${
                          task.completed ? 'text-status-enforced' : 'text-outline'
                        }`}
                        style={task.completed ? { fontVariationSettings: "'FILL' 1" } : undefined}
                      >
                        {task.completed ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                      <div>
                        <p
                          className={`text-xs font-bold text-on-surface ${
                            task.completed ? 'line-through opacity-75' : ''
                          }`}
                        >
                          {task.title}
                        </p>
                        <p className="text-[10px] text-on-surface-variant">{task.subtitle}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-secondary/15 text-secondary">
                      +{task.rewardTrustPoints} TP / +{task.rewardBonusMinutes}m
                    </span>
                  </div>
                ))}
              </div>

              {showAddTaskForm ? (
                <div className="pt-2 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="New habit pact (e.g. Practice Piano 20m)"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      className="col-span-2 h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant/40 text-xs"
                    />
                    <input
                      type="number"
                      placeholder="Bonus min"
                      value={newTaskBonus}
                      onChange={(e) => setNewTaskBonus(Number(e.target.value))}
                      className="h-9 px-2.5 rounded-lg bg-surface-container-low border border-outline-variant/40 text-xs font-mono"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowAddTaskForm(false)}
                      className="px-3 py-1 text-xs text-on-surface-variant"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (!newTaskTitle.trim()) return;
                        onUpdateHousehold((prev) => ({
                          ...prev,
                          tasks: [
                            ...prev.tasks,
                            {
                              id: `task-${Date.now()}`,
                              childId: activeChild.id,
                              title: newTaskTitle.trim(),
                              subtitle: 'Assigned by Sarah (Mom)',
                              rewardTrustPoints: 15,
                              rewardBonusMinutes: newTaskBonus || 15,
                              completed: false,
                              verifiedByParent: false,
                            },
                          ],
                        }), `Assigned task ${newTaskTitle}`);
                        setNewTaskTitle('');
                        setShowAddTaskForm(false);
                        triggerToast('New habit pact assigned to Leo');
                      }}
                      className="px-3 py-1 rounded-lg bg-primary text-on-primary text-xs font-bold"
                    >
                      Assign Task
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddTaskForm(true)}
                  className="w-full py-2 rounded-xl border border-dashed border-outline-variant text-xs font-bold text-primary hover:bg-primary-fixed/30 transition-colors flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">add_task</span>
                  <span>Assign New Task / Habit Pact</span>
                </button>
              )}
            </div>

            {/* Live Family Chat Stream */}
            <div className="space-y-3">
              {household.messages.map((msg) => {
                const isParent = msg.senderRole === 'PARENT';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isParent ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-3.5 shadow-2xs ${
                        isParent
                          ? 'bg-primary text-on-primary rounded-tr-xs'
                          : 'bg-surface border border-outline-variant/20 text-on-surface rounded-tl-xs'
                      }`}
                    >
                      <p className="text-[10px] font-bold opacity-80 mb-0.5">{msg.senderName}</p>
                      <p className="text-xs leading-relaxed">{msg.text}</p>
                    </div>
                    <span className="text-[10px] font-mono text-on-surface-variant mt-1 px-1">
                      {msg.timestampLabel}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Quick Prompt Chips & Composer */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {[
                  '🌮 Dinner is ready!',
                  '⭐ Award +15m Trust Bonus',
                  '⏰ 10m Wind-down reminder',
                  '👍 Great job on homework!',
                ].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => {
                      onUpdateHousehold((prev) => ({
                        ...prev,
                        messages: [
                          ...prev.messages,
                          {
                            id: `msg-${Date.now()}`,
                            senderId: 'guardian-sarah',
                            senderName: 'Sarah (Mom)',
                            senderRole: 'PARENT',
                            text: chip,
                            timestampLabel: 'Just now',
                          },
                        ],
                      }), 'Sent family chat quick message');
                    }}
                    className="px-3 py-1.5 rounded-full bg-surface border border-outline-variant/30 text-[11px] font-semibold text-on-surface whitespace-nowrap hover:bg-primary-fixed"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Message Leo & Mark..."
                  value={chatDraft}
                  onChange={(e) => setChatDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && chatDraft.trim()) {
                      const text = chatDraft.trim();
                      onUpdateHousehold((prev) => ({
                        ...prev,
                        messages: [
                          ...prev.messages,
                          {
                            id: `msg-${Date.now()}`,
                            senderId: 'guardian-sarah',
                            senderName: 'Sarah (Mom)',
                            senderRole: 'PARENT',
                            text,
                            timestampLabel: 'Just now',
                          },
                        ],
                      }), 'Sent family chat message');
                      setChatDraft('');
                    }
                  }}
                  className="flex-1 h-11 px-4 rounded-full bg-surface border border-outline-variant/40 text-xs text-on-surface focus:outline-none focus:border-primary"
                />
                <button
                  onClick={() => {
                    if (!chatDraft.trim()) return;
                    const text = chatDraft.trim();
                    onUpdateHousehold((prev) => ({
                      ...prev,
                      messages: [
                        ...prev.messages,
                        {
                          id: `msg-${Date.now()}`,
                          senderId: 'guardian-sarah',
                          senderName: 'Sarah (Mom)',
                          senderRole: 'PARENT',
                          text,
                          timestampLabel: 'Just now',
                        },
                      ],
                    }), 'Sent family chat message');
                    setChatDraft('');
                  }}
                  className="w-11 h-11 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">send</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            P-13: GUARDIAN ROLES & TRUSTED CONTACTS (Stitch 13_parent_code)
           ===================================================================== */}
        {activeScreen === 'P-13' && (
          <div className="space-y-5">
            {/* Separation of Powers RBAC Guarantee Card */}
            <div className="bg-gradient-to-br from-primary to-primary-container rounded-2xl p-5 text-on-primary shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-[10px] font-bold uppercase tracking-wider">
                  Anchor Separation of Powers • Core Guarantee
                </span>
                <span className="material-symbols-outlined text-secondary-fixed">
                  admin_panel_settings
                </span>
              </div>
              <h2 className="font-headline font-extrabold text-lg leading-snug">
                Role-Based Access Control (RBAC)
              </h2>
              <div className="grid grid-cols-2 gap-2.5 pt-1 text-xs">
                <div className="bg-white/10 rounded-xl p-2.5 border border-white/15">
                  <p className="font-bold text-secondary-fixed">Full Admin</p>
                  <p className="text-[11px] text-on-primary-container mt-0.5">
                    Rules, schedules, extra time &amp; live check-ins
                  </p>
                </div>
                <div className="bg-white/10 rounded-xl p-2.5 border border-white/15">
                  <p className="font-bold text-white">Emergency Contact</p>
                  <p className="text-[11px] text-on-primary-container mt-0.5">
                    SOS alerts &amp; school pickup location only
                  </p>
                </div>
              </div>
            </div>

            {/* Guardians & Contacts Roster */}
            <div className="space-y-3">
              {household.guardians.map((g) => (
                <div
                  key={g.id}
                  className="bg-surface rounded-2xl p-4 shadow-xs border border-outline-variant/20 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={g.name.includes('Sarah') ? SARAH_AVATAR : g.name.includes('Mark') ? MARK_AVATAR : MAYA_AVATAR}
                        alt={g.name}
                        className="w-11 h-11 rounded-full object-cover border border-outline-variant/40"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-headline font-bold text-sm text-on-surface">
                            {g.name}
                          </h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-fixed text-primary">
                            {g.relationLabel}
                          </span>
                        </div>
                        <p className="text-[11px] text-on-surface-variant font-mono mt-0.5">
                          {g.email} • Tier {g.sosEscalationTier} SOS
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        g.role === 'TRUSTED_EMERGENCY_CONTACT'
                          ? 'bg-secondary-container text-on-secondary-container'
                          : 'bg-primary text-on-primary'
                      }`}
                    >
                      {g.role === 'PRIMARY_ADMIN'
                        ? 'Owner'
                        : g.role === 'CO_GUARDIAN_ADMIN'
                        ? 'Co-Admin'
                        : 'SOS Only'}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-surface-container flex items-center justify-between text-xs">
                    <span className="text-on-surface-variant">Receive Geofence Check-ins</span>
                    <button
                      disabled={!canManageGuardians}
                      onClick={() =>
                        onUpdateHousehold((prev) => ({
                          ...prev,
                          guardians: prev.guardians.map((item) =>
                            item.id === g.id
                              ? { ...item, geofenceAlertsEnabled: !item.geofenceAlertsEnabled }
                              : item
                          ),
                        }), `Updated geofence alerts for ${g.name}`)
                      }
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${
                        g.geofenceAlertsEnabled
                          ? 'bg-status-enforced/15 text-status-enforced'
                          : 'bg-surface-container text-on-surface-variant'
                      }`}
                    >
                      {g.geofenceAlertsEnabled ? 'Enabled' : 'SOS Only'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Invite Trusted Family Member Modal / Button */}
            {showAddGuardianModal ? (
              <div className="bg-surface rounded-2xl p-4 border border-primary/30 space-y-3">
                <h4 className="font-headline font-bold text-xs text-primary uppercase">
                  Invite Guardian or Emergency Contact
                </h4>
                <input
                  type="text"
                  placeholder="Full Name (e.g. Aunt Clara)"
                  value={newGuardianName}
                  onChange={(e) => setNewGuardianName(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant/40 text-xs"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Relation (e.g. Aunt)"
                    value={newGuardianRelation}
                    onChange={(e) => setNewGuardianRelation(e.target.value)}
                    className="h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant/40 text-xs"
                  />
                  <select
                    value={newGuardianRole}
                    onChange={(e) => setNewGuardianRole(e.target.value as GuardianRole)}
                    className="h-9 px-2 rounded-lg bg-surface-container-low border border-outline-variant/40 text-xs font-semibold"
                  >
                    <option value="TRUSTED_EMERGENCY_CONTACT">Emergency Contact (SOS Only)</option>
                    <option value="CO_GUARDIAN_ADMIN">Co-Guardian Admin</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowAddGuardianModal(false)}
                    className="px-3 py-1.5 text-xs text-on-surface-variant"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!newGuardianName.trim()) return;
                      onUpdateHousehold((prev) => ({
                        ...prev,
                        guardians: [
                          ...prev.guardians,
                          {
                            id: `guard-${Date.now()}`,
                            name: newGuardianName.trim(),
                            relationLabel: newGuardianRelation,
                            email: `${newGuardianName.toLowerCase().replace(/\s+/g, '.')}@family.org`,
                            phone: '+1 (555) 019-9942',
                            role: newGuardianRole,
                            geofenceAlertsEnabled: true,
                            sosEscalationTier: 2,
                            verified: true,
                          },
                        ],
                      }), `Invited ${newGuardianName}`);
                      setNewGuardianName('');
                      setShowAddGuardianModal(false);
                      triggerToast('Guardian invitation dispatched!');
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-bold"
                  >
                    Send Invite
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddGuardianModal(true)}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-primary to-primary-container text-on-primary font-headline font-bold text-sm shadow-md flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">person_add</span>
                <span>Invite Trusted Family Member or Guardian</span>
              </button>
            )}
          </div>
        )}

        {/* =====================================================================
            P-14: PRIVACY, DATA RIGHTS & DELETION (Stitch 14_parent_code)
           ===================================================================== */}
        {activeScreen === 'P-14' && (
          <div className="space-y-5">
            {/* Zero Covert Telemetry Guarantee Card */}
            <div className="bg-secondary-container/40 border border-secondary/25 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary text-on-secondary">
                  COPPA Tier-A Certified
                </span>
                <span className="font-mono text-[11px] font-bold text-secondary">
                  Zero-Knowledge Vault
                </span>
              </div>
              <h2 className="font-headline font-extrabold text-base text-on-secondary-container">
                Zero Covert Telemetry Guarantee
              </h2>
              <ul className="space-y-1.5 text-xs text-on-secondary-container/90">
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-secondary">
                    check_circle
                  </span>
                  Never reads private SMS/chat body text or keystrokes
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-secondary">
                    check_circle
                  </span>
                  Location trails auto-purge after 30 days
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-secondary">
                    check_circle
                  </span>
                  Zero third-party ad broker SDKs
                </li>
              </ul>
            </div>

            {/* Statutory Privacy Actions (GDPR / CCPA) */}
            <div className="bg-surface rounded-2xl p-4 shadow-xs border border-outline-variant/20 space-y-3">
              <h3 className="font-headline font-bold text-sm text-on-surface">
                Statutory Privacy Actions (GDPR / CCPA)
              </h3>

              <div className="p-3 rounded-xl bg-surface-container-low flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-on-surface">Full Family Data Dossier</p>
                  <p className="text-[11px] text-on-surface-variant">
                    Machine-readable JSON/PDF archive of all household records
                  </p>
                </div>
                <button
                  onClick={() => triggerToast('Encrypted family data archive downloaded (.json)')}
                  className="px-3 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold shrink-0"
                >
                  Download
                </button>
              </div>

              <div className="p-3 rounded-xl bg-surface-container-low flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-on-surface">
                    Clear 30-Day Location &amp; App Trails
                  </p>
                  <p className="text-[11px] text-on-surface-variant">
                    Purges historical GPS breadcrumbs while keeping rules active
                  </p>
                </div>
                <button
                  onClick={() =>
                    triggerToast('Historical GPS & usage logs purged from cloud vault')
                  }
                  className="px-3 py-1.5 rounded-xl bg-surface-container-highest text-on-surface text-xs font-bold shrink-0"
                >
                  Purge Logs
                </button>
              </div>
            </div>

            {/* Danger Zone: Article 17 GDPR Irreversible Account Destruction */}
            <div className="bg-error-container/30 border border-error/30 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-error">
                <span className="material-symbols-outlined">warning</span>
                <h3 className="font-headline font-bold text-sm">
                  Irreversible Account Destruction (Article 17 GDPR)
                </h3>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Cryptographically shreds all household profiles, unpairs child devices cleanly, and revokes Knox rules immediately.
              </p>
              <button
                disabled={!canDeleteHousehold}
                onClick={() => setShowDeleteModal(true)}
                className="w-full py-2.5 rounded-xl bg-error text-on-error font-headline font-bold text-xs shadow-xs"
              >
                Initiate Family Deletion Request
              </button>
            </div>

            {showDeleteModal && (
              <div className="fixed inset-0 z-50 bg-on-surface/50 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-surface rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-error/30 space-y-4">
                  <h4 className="font-headline font-extrabold text-base text-error">
                    Confirm Cryptographic Shred
                  </h4>
                  <p className="text-xs text-on-surface-variant">
                    Type <strong className="font-mono text-on-surface">DELETE</strong> to reset household data to factory defaults:
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmInput}
                    onChange={(e) => setDeleteConfirmInput(e.target.value)}
                    placeholder="Type DELETE"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-mono"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowDeleteModal(false)}
                      className="flex-1 py-2.5 rounded-xl bg-surface-container text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (deleteConfirmInput !== 'DELETE') {
                          triggerToast('Please type DELETE to confirm');
                          return;
                        }
                        onUpdateHousehold(
                          (prev) => createInitialHouseholdState(prev.id),
                          'Executed GDPR Article 17 reset'
                        );
                        setDeleteConfirmInput('');
                        setShowDeleteModal(false);
                        triggerToast('Household data shredded & reset to clean state');
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-error text-on-error text-xs font-bold"
                    >
                      Shred Now
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            P-15: ANCHOR FAMILY PREMIUM & BILLING (Stitch 15_parent_code)
           ===================================================================== */}
        {activeScreen === 'P-15' && (
          <div className="space-y-5">
            {/* Hero Banner */}
            <div className="bg-gradient-to-br from-primary to-primary-container rounded-3xl p-5 text-on-primary shadow-sm space-y-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[10px] font-bold uppercase">
                Gentle Guidance, Complete Trust
              </span>
              <h2 className="font-headline font-extrabold text-xl">
                Anchor Family Premium
              </h2>
              <p className="text-xs text-on-primary-container leading-relaxed">
                Basic screen time limits, SOS alerts, and emergency location remain <strong>free forever</strong>. Upgrade for advanced content filters &amp; consented live check-ins.
              </p>
            </div>

            {/* Plan Selection Cards */}
            <div className="grid grid-cols-1 gap-3">
              {[
                {
                  id: 'annual_trial' as const,
                  title: 'Annual Family Plan',
                  price: '$4.99 / mo',
                  sub: 'Billed $59.88/yr after 14-day free trial • Save 38%',
                  badge: 'Best Value • 14-Day Free Trial',
                },
                {
                  id: 'monthly_premium' as const,
                  title: 'Monthly Flexible Plan',
                  price: '$7.99 / mo',
                  sub: 'Billed monthly via Google Play • Cancel anytime',
                  badge: 'Flexible Monthly',
                },
              ].map((plan) => {
                const selected = selectedPlanOption === plan.id;
                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlanOption(plan.id)}
                    className={`rounded-2xl p-4 cursor-pointer border-2 transition-all ${
                      selected
                        ? 'bg-primary-fixed/30 border-primary shadow-xs'
                        : 'bg-surface border-outline-variant/25'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container">
                        {plan.badge}
                      </span>
                      <span className="font-mono font-extrabold text-base text-primary">
                        {plan.price}
                      </span>
                    </div>
                    <h3 className="font-headline font-bold text-sm text-on-surface">
                      {plan.title}
                    </h3>
                    <p className="text-xs text-on-surface-variant mt-0.5">{plan.sub}</p>
                  </div>
                );
              })}
            </div>

            {/* 6 Strictly Scoped Premium Features Breakdown */}
            <div className="bg-surface rounded-2xl p-4 border border-outline-variant/20 space-y-2.5">
              <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant">
                Included in Anchor Family Premium
              </h3>
              {[
                { title: 'Consent-First Live Safety Check-in', desc: 'Audited Screen View, Front Camera & Ambient Audio with child banner (P-19)' },
                { title: 'Advanced Web & Content Filter', desc: 'Knox Private DNS category protection & SafeSearch (P-16)' },
                { title: 'Social Media Shield', desc: 'Supervised Roblox/Discord rules & short-form video downtime (P-17)' },
                { title: 'Smart Notification Batching', desc: 'Hold game streaks & social pings during study hours (P-18)' },
              ].map((feat) => (
                <div key={feat.title} className="flex items-start gap-2.5 text-xs">
                  <span
                    className="material-symbols-outlined text-secondary text-[18px] mt-0.5"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    verified
                  </span>
                  <div>
                    <p className="font-bold text-on-surface">{feat.title}</p>
                    <p className="text-[11px] text-on-surface-variant">{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Google Play Billing CTA */}
            <div className="space-y-2">
              <button
                onClick={() => {
                  onUpdateHousehold((prev) => ({
                    ...prev,
                    subscriptionTier: selectedPlanOption,
                  }), `Activated ${selectedPlanOption} via Google Play Billing`);
                  triggerToast(`Google Play Entitlement Active: ${selectedPlanOption}`);
                }}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary-container text-on-primary font-headline font-bold text-sm shadow-md flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
                <span>
                  {selectedPlanOption === 'annual_trial'
                    ? 'Start 14-Day Free Trial (Google Play)'
                    : 'Subscribe Monthly ($7.99/mo)'}
                </span>
              </button>
              <button
                onClick={() => {
                  onUpdateHousehold((prev) => ({
                    ...prev,
                    subscriptionTier: 'free',
                  }), 'Switched to Free Tier');
                  triggerToast('Switched to Core Free Tier (test premium gates on P-16..P-19)');
                }}
                className="w-full py-2 text-xs font-semibold text-on-surface-variant hover:text-primary"
              >
                Current Tier: <strong className="font-mono uppercase">{household.subscriptionTier}</strong> (Tap to test Free Tier gate)
              </button>
            </div>
          </div>
        )}

        {/* =====================================================================
            P-16: WEB & CONTENT FILTERS (Stitch 16_parent_code)
           ===================================================================== */}
        {activeScreen === 'P-16' && (
          <div className="space-y-5">
            {!isFeatureEntitled('website_content_filtering', household.subscriptionTier) && (
              <div className="bg-tertiary-fixed/60 border border-tertiary/30 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-on-tertiary-fixed">
                    Anchor Family Premium Feature
                  </p>
                  <p className="text-[11px] text-on-tertiary-fixed/80">
                    Upgrade to enable Knox Private DNS &amp; category web filtering.
                  </p>
                </div>
                <button
                  onClick={() => onSelectScreen('P-15')}
                  className="px-3 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold shrink-0"
                >
                  Unlock
                </button>
              </div>
            )}

            {/* Protection Profiles */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="font-headline font-extrabold text-lg text-on-surface">
                  Web Protection Profile
                </h2>
                <span className="text-[11px] font-mono font-bold text-status-enforced bg-status-enforced/10 px-2.5 py-0.5 rounded-full">
                  Knox DNS Guard
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'STRICT', title: 'Strict', sub: 'Age 11 Match' },
                    { id: 'BALANCED', title: 'Balanced', sub: 'Teen Guided' },
                    { id: 'CUSTOM', title: 'Custom', sub: 'Granular' },
                  ] as const
                ).map((prof) => {
                  const active = household.webFilter.profile === prof.id;
                  return (
                    <button
                      key={prof.id}
                      onClick={() =>
                        onUpdateHousehold((prev) => ({
                          ...prev,
                          webFilter: { ...prev.webFilter, profile: prof.id },
                        }), `Set Web Filter profile to ${prof.title}`)
                      }
                      className={`p-3 rounded-2xl text-left border transition-all ${
                        active
                          ? 'bg-primary text-on-primary border-primary shadow-xs'
                          : 'bg-surface border-outline-variant/25 text-on-surface'
                      }`}
                    >
                      <p className="font-headline font-bold text-xs">{prof.title}</p>
                      <p
                        className={`text-[10px] mt-0.5 ${
                          active ? 'text-on-primary/80' : 'text-on-surface-variant'
                        }`}
                      >
                        {prof.sub}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* System Category Rules */}
            <div className="bg-surface rounded-2xl p-4 shadow-xs border border-outline-variant/20 space-y-3">
              <h3 className="font-headline font-bold text-sm text-on-surface">
                System Category Rules
              </h3>
              {[
                { key: 'blockAdultContent' as const, label: 'Adult & Explicit Material', locked: true },
                { key: 'blockGambling' as const, label: 'Gambling, Loot Boxes & Betting', locked: false },
                { key: 'blockViolenceHate' as const, label: 'Violence & Extremism', locked: false },
                { key: 'blockSocialWebPortals' as const, label: 'Unmonitored Chat & Social Web Portals', locked: false },
                { key: 'enforceSafeSearchAi' as const, label: 'Enforce Google/Bing SafeSearch & Kid AI', locked: false },
              ].map((rule) => {
                const enabled = household.webFilter[rule.key];
                return (
                  <div
                    key={rule.key}
                    className="flex items-center justify-between py-2 border-b border-surface-container last:border-0"
                  >
                    <div>
                      <p className="text-xs font-bold text-on-surface">{rule.label}</p>
                      {rule.locked && (
                        <span className="text-[10px] font-mono text-secondary">
                          Mandatory Child Protection Lock
                        </span>
                      )}
                    </div>
                    <button
                      disabled={rule.locked}
                      onClick={() =>
                        onUpdateHousehold((prev) => ({
                          ...prev,
                          webFilter: {
                            ...prev.webFilter,
                            [rule.key]: !prev.webFilter[rule.key],
                          },
                        }), `Toggled ${rule.label}`)
                      }
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                        enabled
                          ? 'bg-status-enforced/15 text-status-enforced'
                          : 'bg-surface-container text-on-surface-variant'
                      }`}
                    >
                      {enabled ? 'Blocked / Safe' : 'Allowed'}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Whitelist / Blacklist Custom Domains */}
            <div className="bg-surface rounded-2xl p-4 shadow-xs border border-outline-variant/20 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-headline font-bold text-sm text-on-surface">
                  Custom Domain Exceptions
                </h3>
                <div className="inline-flex rounded-lg bg-surface-container p-0.5 text-[10px] font-bold">
                  <button
                    onClick={() => setDomainListMode('WHITELIST')}
                    className={`px-2 py-1 rounded-md ${
                      domainListMode === 'WHITELIST' ? 'bg-surface text-secondary' : ''
                    }`}
                  >
                    Allowed
                  </button>
                  <button
                    onClick={() => setDomainListMode('BLACKLIST')}
                    className={`px-2 py-1 rounded-md ${
                      domainListMode === 'BLACKLIST' ? 'bg-surface text-error' : ''
                    }`}
                  >
                    Blocked
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {(domainListMode === 'WHITELIST'
                  ? household.webFilter.whitelistedDomains
                  : household.webFilter.blacklistedDomains
                ).map((dom) => (
                  <span
                    key={dom}
                    className={`px-2.5 py-1 rounded-full text-xs font-mono flex items-center gap-1 ${
                      domainListMode === 'WHITELIST'
                        ? 'bg-secondary-container/50 text-on-secondary-container'
                        : 'bg-error-container/60 text-on-error-container'
                    }`}
                  >
                    {dom}
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add domain (e.g. scratch.mit.edu)"
                  value={newDomainInput}
                  onChange={(e) => setNewDomainInput(e.target.value)}
                  className="flex-1 h-9 px-3 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-mono"
                />
                <button
                  onClick={() => {
                    if (!newDomainInput.trim()) return;
                    const clean = newDomainInput.trim().toLowerCase();
                    onUpdateHousehold((prev) => ({
                      ...prev,
                      webFilter:
                        domainListMode === 'WHITELIST'
                          ? {
                              ...prev.webFilter,
                              whitelistedDomains: [...prev.webFilter.whitelistedDomains, clean],
                            }
                          : {
                              ...prev.webFilter,
                              blacklistedDomains: [...prev.webFilter.blacklistedDomains, clean],
                            },
                    }), `Added ${clean} to ${domainListMode}`);
                    setNewDomainInput('');
                    triggerToast(`Added ${clean} to ${domainListMode.toLowerCase()}`);
                  }}
                  className="px-3.5 rounded-xl bg-primary text-on-primary text-xs font-bold"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Fair Play Child Block Screen Preview */}
            <div className="bg-secondary-container/35 border border-secondary/20 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <h4 className="font-headline font-bold text-xs text-on-secondary-container">
                  Fair Play Transparency Banner
                </h4>
                <p className="text-[11px] text-on-secondary-container/85">
                  Preview the gentle explanation {activeChild.name.split(' ')[0]} sees when a site is filtered.
                </p>
              </div>
              <button
                onClick={() => setShowChildBlockPreviewModal(true)}
                className="px-3 py-1.5 rounded-xl bg-surface text-secondary font-bold text-xs border border-secondary/30 shrink-0"
              >
                Preview C-11
              </button>
            </div>

            {showChildBlockPreviewModal && (
              <div className="fixed inset-0 z-50 bg-on-surface/50 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-surface rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-3 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-secondary-container text-secondary flex items-center justify-center mx-auto">
                    <span className="material-symbols-outlined">shield_with_heart</span>
                  </div>
                  <h4 className="font-headline font-extrabold text-base text-on-surface">
                    Child Block Screen Preview (C-11)
                  </h4>
                  <p className="text-xs text-on-surface-variant">
                    &ldquo;Heads up, Leo! This website is paused by your family&apos;s Safe Browsing Pact. You can ask Mom or Dad to review it.&rdquo;
                  </p>
                  <button
                    onClick={() => setShowChildBlockPreviewModal(false)}
                    className="w-full py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold"
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            P-17: SOCIAL APP & CONTENT FILTERS (Stitch 17_parent_code)
           ===================================================================== */}
        {activeScreen === 'P-17' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-secondary block">
                  Healthy Social Boundaries
                </span>
                <h2 className="font-headline font-extrabold text-xl text-on-surface">
                  Social App &amp; Content Shield
                </h2>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-primary-fixed text-primary font-mono font-bold text-xs">
                Premium Active
              </span>
            </div>

            {/* Global Shield Mode Selector */}
            <div className="grid grid-cols-3 gap-2 bg-surface-container p-1 rounded-2xl">
              {(['SUPERVISED', 'STRICT_BLOCK', 'GRANULAR'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() =>
                    onUpdateHousehold((prev) => ({
                      ...prev,
                      socialFilter: { ...prev.socialFilter, globalMode: m },
                    }), `Set Social Shield mode to ${m}`)
                  }
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    household.socialFilter.globalMode === m
                      ? 'bg-surface text-primary shadow-xs'
                      : 'text-on-surface-variant'
                  }`}
                >
                  {m === 'SUPERVISED' ? 'Supervised' : m === 'STRICT_BLOCK' ? 'Strict Block' : 'Granular'}
                </button>
              ))}
            </div>

            {/* Platform Policy Cards */}
            <div className="space-y-3">
              {/* Roblox Card */}
              <div className="bg-surface rounded-2xl p-4 shadow-xs border border-outline-variant/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-primary-fixed text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined">sports_esports</span>
                    </div>
                    <div>
                      <h4 className="font-headline font-bold text-sm text-on-surface">Roblox</h4>
                      <p className="text-[11px] text-on-surface-variant">
                        Supervised Social Play • 45m Daily Limit
                      </p>
                    </div>
                  </div>
                  <select
                    value={household.socialFilter.robloxChatMode}
                    onChange={(e) =>
                      onUpdateHousehold((prev) => ({
                        ...prev,
                        socialFilter: {
                          ...prev.socialFilter,
                          robloxChatMode: e.target.value as 'FRIENDS_ONLY' | 'OFF' | 'OPEN',
                        },
                      }), 'Updated Roblox chat policy')
                    }
                    className="text-xs font-bold bg-surface-container-low px-2.5 py-1.5 rounded-xl border border-outline-variant/30"
                  >
                    <option value="FRIENDS_ONLY">Friends Only Chat</option>
                    <option value="OFF">Chat Disabled</option>
                    <option value="OPEN">Open Chat</option>
                  </select>
                </div>
              </div>

              {/* Discord Card */}
              <div className="bg-surface rounded-2xl p-4 shadow-xs border border-outline-variant/20 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-error-container text-error flex items-center justify-center">
                    <span className="material-symbols-outlined">forum</span>
                  </div>
                  <div>
                    <h4 className="font-headline font-bold text-sm text-on-surface">Discord</h4>
                    <p className="text-[11px] text-on-surface-variant">
                      Open voice servers paused until Age 13
                    </p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    onUpdateHousehold((prev) => ({
                      ...prev,
                      socialFilter: {
                        ...prev.socialFilter,
                        discordBlocked: !prev.socialFilter.discordBlocked,
                      },
                    }), 'Toggled Discord block')
                  }
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                    household.socialFilter.discordBlocked
                      ? 'bg-error text-on-error'
                      : 'bg-status-enforced text-white'
                  }`}
                >
                  {household.socialFilter.discordBlocked ? 'Blocked' : 'Allowed'}
                </button>
              </div>

              {/* YouTube & Short-Form Video */}
              <div className="bg-surface rounded-2xl p-4 shadow-xs border border-outline-variant/20 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-secondary-container text-secondary flex items-center justify-center">
                    <span className="material-symbols-outlined">smart_display</span>
                  </div>
                  <div>
                    <h4 className="font-headline font-bold text-sm text-on-surface">
                      YouTube &amp; Short-Form Feeds
                    </h4>
                    <p className="text-[11px] text-on-surface-variant">
                      Restricted Mode Enforced • Hide Shorts in Downtime
                    </p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    onUpdateHousehold((prev) => ({
                      ...prev,
                      socialFilter: {
                        ...prev.socialFilter,
                        hideShortsInDowntime: !prev.socialFilter.hideShortsInDowntime,
                      },
                    }), 'Toggled Shorts downtime filter')
                  }
                  className="px-3 py-1.5 rounded-xl bg-secondary text-on-secondary text-xs font-bold"
                >
                  {household.socialFilter.hideShortsInDowntime ? 'Shorts Filtered' : 'Standard'}
                </button>
              </div>
            </div>

            <button
              onClick={() => triggerToast('Social rules synced to Leo’s Galaxy A34')}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-primary-container text-on-primary font-headline font-bold text-sm shadow-md"
            >
              Apply Social Rules to {activeChild.name.split(' ')[0]}&apos;s Phone
            </button>
          </div>
        )}

        {/* =====================================================================
            P-18: NOTIFICATION & DISTRACTION FILTER (Stitch 18_parent_code)
           ===================================================================== */}
        {activeScreen === 'P-18' && (
          <div className="space-y-5">
            {/* Master Focus Mode Card */}
            <div className="bg-surface rounded-2xl p-5 shadow-xs border border-outline-variant/20 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    Zero-Break Focus Engine
                  </span>
                  <h2 className="font-headline font-extrabold text-lg text-on-surface">
                    Study &amp; Bedtime Quiet Hours
                  </h2>
                </div>
                <button
                  onClick={() =>
                    onUpdateHousehold((prev) => ({
                      ...prev,
                      notificationFilter: {
                        ...prev.notificationFilter,
                        studyBedtimeQuietEnabled:
                          !prev.notificationFilter.studyBedtimeQuietEnabled,
                      },
                    }), 'Toggled Study & Bedtime Quiet Hours')
                  }
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors ${
                    household.notificationFilter.studyBedtimeQuietEnabled
                      ? 'bg-primary'
                      : 'bg-outline-variant'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      household.notificationFilter.studyBedtimeQuietEnabled
                        ? 'translate-x-5'
                        : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Interception Protocol 3-Tab Selector */}
              <div className="grid grid-cols-3 gap-2 bg-surface-container p-1 rounded-xl">
                {(['BATCHING', 'TOTAL_SILENCE', 'EMERGENCY_ONLY'] as const).map((proto) => (
                  <button
                    key={proto}
                    onClick={() =>
                      onUpdateHousehold((prev) => ({
                        ...prev,
                        notificationFilter: {
                          ...prev.notificationFilter,
                          interceptionProtocol: proto,
                        },
                      }), `Set notification protocol to ${proto}`)
                    }
                    className={`py-2 rounded-lg text-[11px] font-bold ${
                      household.notificationFilter.interceptionProtocol === proto
                        ? 'bg-surface text-primary shadow-xs'
                        : 'text-on-surface-variant'
                    }`}
                  >
                    {proto === 'BATCHING'
                      ? 'Smart Batching'
                      : proto === 'TOTAL_SILENCE'
                      ? 'Total Silence'
                      : 'Emergency Only'}
                  </button>
                ))}
              </div>
              <p className="text-xs text-on-surface-variant">
                Non-urgent game streaks and social pings are held silently and delivered in a single digest at <strong>{household.notificationFilter.batchReleaseTime}</strong>.
              </p>
            </div>

            {/* Distraction Intercepts Analytics Card */}
            <div className="bg-surface rounded-2xl p-4 shadow-xs border border-outline-variant/20 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-headline font-bold text-sm text-on-surface">
                  Distraction Intercepts (Past 7 Days)
                </h3>
                <span className="font-mono text-xs font-bold text-secondary">
                  ~3h 45m Focus Preserved
                </span>
              </div>
              <p className="font-mono font-extrabold text-2xl text-primary">
                {household.notificationFilter.interceptedCount7d} alerts quieted
              </p>
              <div className="h-2.5 w-full rounded-full overflow-hidden flex gap-0.5 bg-surface-container">
                <div className="bg-primary w-[65%]" />
                <div className="bg-secondary w-[27%]" />
                <div className="bg-tertiary w-[8%]" />
              </div>
              <div className="flex justify-between text-[11px] text-on-surface-variant">
                <span>268 Game Streaks</span>
                <span>114 Social Pings</span>
                <span>30 Promo Ads</span>
              </div>
            </div>

            <button
              onClick={() => triggerToast('Notification batching policy synced to Galaxy A34')}
              className="w-full py-3.5 rounded-xl bg-primary text-on-primary font-headline font-bold text-sm shadow-md"
            >
              Apply Policy to {activeChild.deviceModel}
            </button>
          </div>
        )}

        {/* =====================================================================
            P-19: CONSENT-FIRST ACTIVE LIVE SESSION (Stitch 19_parent_code)
           ===================================================================== */}
        {activeScreen === 'P-19' && (
          <div className="space-y-5">
            {/* Header Status Card */}
            <div className="bg-surface rounded-2xl p-4 shadow-xs border border-outline-variant/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary-container text-secondary flex items-center justify-center">
                  <span className="material-symbols-outlined">visibility</span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="font-headline font-bold text-sm text-on-surface">
                      Live Safety Check-in
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-secondary-container text-on-secondary-container">
                      {household.liveSession.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant">
                    Mandatory child notification &amp; red Stop button active on C-13
                  </p>
                </div>
              </div>
              <span className="font-mono text-xs font-bold text-primary">
                {household.liveSession.sessionId}
              </span>
            </div>

            {/* 3-Tab Mode Selector */}
            <div className="grid grid-cols-3 gap-2 bg-surface-container p-1 rounded-2xl">
              {(
                [
                  { id: 'SCREEN', label: 'Screen View', icon: 'screen_share' },
                  { id: 'CAMERA', label: 'Front Camera', icon: 'photo_camera_front' },
                  { id: 'AUDIO', label: 'Ambient Audio', icon: 'graphic_eq' },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    const res = transitionLiveSession(household.liveSession, {
                      type: 'SWITCH_MODE',
                      mode: m.id,
                    });
                    onUpdateHousehold((prev) => ({
                      ...prev,
                      liveSession: res.next,
                    }), `Switched live mode to ${m.label}`);
                  }}
                  className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    household.liveSession.mode === m.id
                      ? 'bg-surface text-primary shadow-xs'
                      : 'text-on-surface-variant'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>

            {/* Live Viewer Window (Dark Inverse Surface matching Stitch P-19) */}
            <div className="bg-inverse-surface text-inverse-on-surface rounded-3xl p-5 shadow-md space-y-4 relative overflow-hidden">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-semibold">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      household.liveSession.status === 'ACTIVE_CONSENTED'
                        ? 'bg-status-enforced animate-ping'
                        : 'bg-status-pending'
                    }`}
                  ></span>
                  {activeChild.name.split(' ')[0]}&apos;s {activeChild.deviceModel}
                </span>
                <span className="font-mono text-[11px] opacity-80">120ms • 720p 15fps</span>
              </div>

              {household.liveSession.status === 'ACTIVE_CONSENTED' ? (
                <div className="bg-slate-900/90 border border-white/15 rounded-2xl p-5 text-center space-y-2">
                  <span className="material-symbols-outlined text-4xl text-secondary-fixed">
                    {household.liveSession.mode === 'SCREEN'
                      ? 'menu_book'
                      : household.liveSession.mode === 'CAMERA'
                      ? 'videocam'
                      : 'mic'}
                  </span>
                  <h3 className="font-headline font-bold text-sm text-white">
                    {household.liveSession.mode === 'SCREEN'
                      ? 'Foreground App: Khan Academy Math • Algebra I'
                      : household.liveSession.mode === 'CAMERA'
                      ? 'Front Camera Feed • Study Desk Verified'
                      : 'Ambient Audio Stream • 38 dB Quiet Room'}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Child Watermark Banner Active: &ldquo;Live Parental Check Active — Shared with Sarah (Mom)&rdquo;
                  </p>
                  <div className="pt-2 flex items-center justify-center gap-3 text-[11px] font-mono text-secondary-fixed">
                    <span>Remaining: {Math.floor(household.liveSession.remainingSeconds / 60)}m {household.liveSession.remainingSeconds % 60}s</span>
                    <span>•</span>
                    <span>Max 10:00 cap</span>
                  </div>
                </div>
              ) : household.liveSession.status === 'PENDING_CHILD_CONSENT' ? (
                <div className="bg-slate-900/90 border border-amber-400/30 rounded-2xl p-5 text-center space-y-2">
                  <span className="material-symbols-outlined text-3xl text-amber-300 animate-pulse">
                    notifications_active
                  </span>
                  <h3 className="font-headline font-bold text-sm text-white">
                    Waiting for {activeChild.name.split(' ')[0]}&apos;s Consent on Screen C-13...
                  </h3>
                  <p className="text-xs text-slate-300">
                    Switch to the Child App viewport (Screen C-13) and tap &ldquo;Approve Check-in&rdquo; to start streaming.
                  </p>
                </div>
              ) : (
                <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5 text-center space-y-3">
                  <p className="text-xs text-slate-300">
                    No active live check-in session. Reason disclosed to child:
                  </p>
                  <input
                    type="text"
                    value={liveReasonInput}
                    onChange={(e) => setLiveReasonInput(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl bg-slate-800 border border-white/20 text-xs text-white"
                  />
                  <button
                    onClick={() => {
                      const res = transitionLiveSession(household.liveSession, {
                        type: 'PARENT_REQUEST',
                        guardianName: 'Sarah (Mom)',
                        childId: activeChild.id,
                        mode: household.liveSession.mode,
                        reason: liveReasonInput,
                        tier: household.subscriptionTier,
                      });
                      if (res.error) {
                        triggerToast(res.error);
                        return;
                      }
                      onUpdateHousehold((prev) => ({
                        ...prev,
                        liveSession: res.next,
                      }), 'Requested Consent-First Live Safety Check');
                      triggerToast('Live check-in requested! Approve it on Child Screen C-13.');
                    }}
                    className="w-full py-2.5 rounded-xl bg-secondary text-on-secondary font-headline font-bold text-xs"
                  >
                    Request Audited Live Check-In
                  </button>
                </div>
              )}

              {household.liveSession.status === 'PENDING_CHILD_CONSENT' && (
                <div className="pt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      const res = transitionLiveSession(household.liveSession, {
                        type: 'CONSENT_TIMEOUT',
                      });
                      const entry = createConsentHistoryEntry(
                        household.liveSession,
                        activeChild.name,
                        'TIMED_OUT',
                        'Just now'
                      );
                      onUpdateHousehold(
                        (prev) => ({
                          ...prev,
                          liveSession: res.next,
                          consentHistory: [entry, ...(prev.consentHistory || [])],
                        }),
                        'Consent request timed out after 60s'
                      );
                      triggerToast('Consent request timed out & logged to Consent History');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200 text-[11px] font-bold flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                    <span>Simulate 60s Consent Timeout</span>
                  </button>
                </div>
              )}

              {/* Session Controls */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  disabled={household.liveSession.status !== 'ACTIVE_CONSENTED'}
                  onClick={() => {
                    const res = transitionLiveSession(household.liveSession, {
                      type: 'TOGGLE_TWO_WAY_TALK',
                    });
                    onUpdateHousehold((prev) => ({
                      ...prev,
                      liveSession: res.next,
                    }), 'Toggled Two-Way Talk');
                  }}
                  className={`py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 ${
                    household.liveSession.twoWayTalkActive
                      ? 'bg-secondary text-on-secondary'
                      : 'bg-white/10 text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">record_voice_over</span>
                  <span>
                    {household.liveSession.twoWayTalkActive
                      ? 'Audio Line Open'
                      : 'Request Two-Way Talk'}
                  </span>
                </button>

                <button
                  onClick={() => {
                    const res = transitionLiveSession(household.liveSession, {
                      type: 'STOP_SESSION',
                      actor: 'PARENT',
                    });
                    onUpdateHousehold((prev) => ({
                      ...prev,
                      liveSession: res.next,
                    }), 'Ended Live Session');
                    triggerToast('Live session ended immediately & logged to family audit trail');
                  }}
                  className="py-2.5 rounded-xl bg-error text-on-error font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">stop_circle</span>
                  <span>End Session Now</span>
                </button>
              </div>
            </div>

            {/* Full Consent History Panel on P-19 */}
            {renderConsentHistoryPanel(true)}
          </div>
        )}

        {/* =====================================================================
            P-20: ACCOUNT & KNOX DIAGNOSTICS (Stitch 20_parent_code)
           ===================================================================== */}
        {activeScreen === 'P-20' && (
          <div className="space-y-5">
            {/* Guardian Account & Tier Card */}
            <div className="bg-surface rounded-2xl p-4 shadow-xs border border-outline-variant/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={SARAH_AVATAR}
                  alt="Sarah Jenkins"
                  className="w-12 h-12 rounded-full object-cover border-2 border-primary"
                />
                <div>
                  <h2 className="font-headline font-extrabold text-base text-on-surface">
                    Sarah Jenkins
                  </h2>
                  <p className="text-xs text-on-surface-variant">
                    {userEmail || 'sarah.j@example.com'} • Primary Admin
                  </p>
                  <span className="inline-block mt-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-primary-fixed text-primary uppercase">
                    Tier: {household.subscriptionTier}
                  </span>
                </div>
              </div>
              <button
                onClick={() => onSelectScreen('P-15')}
                className="px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-primary text-xs font-bold border border-outline-variant/30"
              >
                Billing
              </button>
            </div>

            {/* Samsung Knox Hardware Integrity Card */}
            <div className="bg-surface rounded-2xl p-4 shadow-xs border border-outline-variant/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="material-symbols-outlined text-secondary"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    verified_user
                  </span>
                  <h3 className="font-headline font-bold text-sm text-on-surface">
                    Samsung Knox Hardware Integrity
                  </h3>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-status-enforced/10 text-status-enforced">
                  TIMA Attested
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-surface-container-low">
                  <p className="text-[10px] text-on-surface-variant font-mono">SEAndroid Policy</p>
                  <p className="font-bold text-on-surface mt-0.5">Enforcing • Knox 3.10</p>
                </div>
                <div className="p-3 rounded-xl bg-surface-container-low">
                  <p className="text-[10px] text-on-surface-variant font-mono">Covert Audit</p>
                  <p className="font-bold text-status-enforced mt-0.5">0 Spyware Modules</p>
                </div>
              </div>
            </div>

            {/* Real-Time Pipeline Health & Self-Test */}
            <div className="bg-surface rounded-2xl p-4 shadow-xs border border-outline-variant/20 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-headline font-bold text-sm text-on-surface">
                  Real-Time Pipeline Health
                </h3>
                <span className="font-mono text-[11px] text-status-enforced font-bold">
                  {lastSelfTestLabel}
                </span>
              </div>

              {[
                { name: 'FCM Cloud Wake Channel', status: 'Connected (TLS 1.3)' },
                { name: 'Location Geofence Polling', status: 'High Precision (±4m)' },
                { name: 'Emergency SOS Cellular Dispatch', status: 'Ready • Dual-Sim' },
                { name: 'Knox MDM Policy Engine', status: 'Enforced • 0 Drift' },
              ].map((sub) => (
                <div
                  key={sub.name}
                  className="flex items-center justify-between text-xs py-1.5 border-b border-surface-container last:border-0"
                >
                  <span className="font-medium text-on-surface">{sub.name}</span>
                  <span className="font-mono text-[11px] text-status-enforced font-semibold">
                    {sub.status}
                  </span>
                </div>
              ))}

              <button
                onClick={() => {
                  setSelfTestRunning(true);
                  setTimeout(() => {
                    setSelfTestRunning(false);
                    setLastSelfTestLabel('All 4 Subsystems Passed • 118ms RTT');
                    triggerToast('Full Knox & Firestore pipeline self-test passed (118ms RTT)');
                  }, 600);
                }}
                className="w-full py-2.5 rounded-xl bg-primary text-on-primary font-headline font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">network_check</span>
                <span>
                  {selfTestRunning
                    ? 'Running Hardware Attestation...'
                    : 'Run Full Connection Self-Test'}
                </span>
              </button>
            </div>

            {/* Parent App Preferences */}
            <div className="bg-surface rounded-2xl p-4 shadow-xs border border-outline-variant/20 space-y-3">
              <h3 className="font-headline font-bold text-sm text-on-surface">
                Parent App Preferences
              </h3>
              <div className="flex items-center justify-between text-xs">
                <span className="text-on-surface">Require Biometrics on Launch</span>
                <button
                  onClick={() => setBiometricPrefEnabled(!biometricPrefEnabled)}
                  className={`px-2.5 py-1 rounded-lg font-bold ${
                    biometricPrefEnabled
                      ? 'bg-status-enforced/15 text-status-enforced'
                      : 'bg-surface-container text-on-surface-variant'
                  }`}
                >
                  {biometricPrefEnabled ? 'Enabled' : 'Off'}
                </button>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-on-surface">Weekly Family Habit Digest Email</span>
                <button
                  onClick={() => setWeeklyDigestPrefEnabled(!weeklyDigestPrefEnabled)}
                  className={`px-2.5 py-1 rounded-lg font-bold ${
                    weeklyDigestPrefEnabled
                      ? 'bg-status-enforced/15 text-status-enforced'
                      : 'bg-surface-container text-on-surface-variant'
                  }`}
                >
                  {weeklyDigestPrefEnabled ? 'Subscribed' : 'Paused'}
                </button>
              </div>
            </div>

            <div className="text-center text-[11px] font-mono text-on-surface-variant pt-1">
              Anchor Parent for Android v2.1.8 (`com.anchor.parent`) • SOC2 Type II • COPPA Tier-A
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation Bar (5 Tabs matching Stitch Parent App Shell) */}
      <nav
        aria-label="Primary Bottom Navigation"
        className="sticky bottom-0 z-30 bg-surface/95 backdrop-blur-xl border-t border-outline-variant/20 h-16 px-2 grid grid-cols-5 items-center shrink-0"
      >
        {[
          { id: 'P-04' as ParentScreenId, label: 'Home', icon: 'dashboard', match: ['P-01', 'P-02', 'P-03', 'P-04', 'P-05', 'P-06'] },
          { id: 'P-07' as ParentScreenId, label: 'Rules', icon: 'tune', match: ['P-07', 'P-08', 'P-16', 'P-17', 'P-18'] },
          { id: 'P-09' as ParentScreenId, label: 'Location', icon: 'location_on', match: ['P-09', 'P-10', 'P-19'] },
          { id: 'P-11' as ParentScreenId, label: 'Requests', icon: 'notifications', match: ['P-11'], badge: pendingRequests.length },
          { id: 'P-13' as ParentScreenId, label: 'Family', icon: 'group', match: ['P-12', 'P-13', 'P-14', 'P-15', 'P-20'] },
        ].map((tab) => {
          const isCurrent = tab.match.includes(activeScreen);
          return (
            <button
              key={tab.label}
              onClick={() => onSelectScreen(tab.id)}
              className={`flex flex-col items-center justify-center gap-0.5 py-1 transition-colors relative ${
                isCurrent ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <div
                className={`w-12 h-7 rounded-full flex items-center justify-center relative ${
                  isCurrent ? 'bg-primary-fixed' : ''
                }`}
              >
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={isCurrent ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {tab.icon}
                </span>
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-0.5 right-1.5 bg-error text-on-error text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {tab.badge}
                  </span>
                ) : null}
              </div>
              <span className={`text-[10px] ${isCurrent ? 'font-bold' : 'font-medium'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ManageSubscription Modal */}
      <ManageSubscription
        isOpen={showManageSubscriptionModal}
        onClose={() => setShowManageSubscriptionModal(false)}
        currentTier={household.subscriptionTier}
        activeGuardianRole={activeGuardianRole}
        householdName={household.householdName}
        onSelectTier={(nextTier, summary) => {
          onUpdateHousehold(
            (prev) => ({
              ...prev,
              subscriptionTier: nextTier,
            }),
            summary
          );
          triggerToast(summary);
        }}
      />
    </div>
  );
};
