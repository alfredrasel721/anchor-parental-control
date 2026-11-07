export type SubscriptionTier = 'free' | 'annual_trial' | 'monthly_premium';

export type FeatureKey =
  // FREE FEATURES (Sections 2, 3, 4)
  | 'auth_family_management'
  | 'device_pairing'
  | 'guardian_roles_rbac'
  | 'dashboard_activity_reports'
  | 'daily_screen_time_limits'
  | 'individual_app_limits'
  | 'app_blocking_categories'
  | 'schedules_bedtime_school'
  | 'extra_time_requests'
  | 'location_tracking_geofencing'
  | 'sos_alerts_checkins'
  | 'family_chat_tasks_rewards'
  | 'privacy_data_export_deletion'
  // PREMIUM FEATURES (Strictly the 6 groups in Section 5)
  | 'screen_mirroring_live_view'
  | 'live_camera_access'
  | 'live_microphone_audio'
  | 'notification_filtering'
  | 'website_content_filtering'
  | 'social_media_content_filtering';

export const PREMIUM_ONLY_FEATURES: ReadonlySet<FeatureKey> = new Set<FeatureKey>([
  'screen_mirroring_live_view',
  'live_camera_access',
  'live_microphone_audio',
  'notification_filtering',
  'website_content_filtering',
  'social_media_content_filtering',
]);

export type GuardianRole = 'PRIMARY_ADMIN' | 'CO_GUARDIAN_ADMIN' | 'TRUSTED_EMERGENCY_CONTACT';

export type GuardianAction =
  | 'VIEW_LOCATION_AND_SOS'
  | 'APPROVE_EXTRA_TIME'
  | 'EDIT_SCHEDULES_AND_LIMITS'
  | 'MANAGE_GUARDIANS'
  | 'MANAGE_SUBSCRIPTION'
  | 'INITIATE_LIVE_CHECK'
  | 'DELETE_HOUSEHOLD_DATA';

export interface ChildProfile {
  id: string;
  name: string;
  age: number;
  avatarInitials: string;
  deviceModel: string;
  osVersion: string;
  batteryPercent: number;
  deviceBatteryLevel?: number;
  lastKnownBatterySync?: string;
  isCharging: boolean;
  wifiSsid: string;
  storageUsedGb: number;
  storageTotalGb: number;
  online: boolean;
  lastSyncLabel: string;
  usedMinutesToday: number;
  dailyAllowanceMinutes: number;
  offlineActiveMinutesToday: number;
  trustPoints: number;
  streakDays: number;
  devicePaused: boolean;
  pauseUntilLabel: string | null;
  currentLocationName: string;
  currentLocationAddress: string;
  latitude: number;
  longitude: number;
  gpsAccuracyMeters: number;
  knoxVerified: boolean;
  permissionsGranted: {
    usageStats: boolean;
    locationAlways: boolean;
    knoxDeviceAdmin: boolean;
    liveTransparencyOverlay: boolean;
  };
}

export interface AppRuleItem {
  id: string;
  childId: string;
  name: string;
  packageName: string;
  category: 'Games & Entertainment' | 'Social & Communication' | 'Learning & School' | 'Web & Browsers' | 'Everyday Utilities';
  usedMinutesToday: number;
  dailyLimitMinutes: number | null; // null = Unlimited (e.g. Learning)
  blocked: boolean;
  alwaysAllowed: boolean;
  syncStatus: 'Synced' | 'Pending Sync';
  iconName: string;
}

export interface ScheduleWindow {
  id: string;
  childId: string;
  title: string;
  type: 'BEDTIME' | 'SCHOOL' | 'FOCUS_DINNER' | 'CUSTOM';
  startTime: string; // "20:30"
  endTime: string;   // "07:00"
  daysLabel: string; // "Sun – Thu"
  allowedExceptions: string;
  enabled: boolean;
}

export interface SafeGeofence {
  id: string;
  name: string;
  address: string;
  radiusMeters: number;
  notifyOnArrive: boolean;
  notifyOnLeave: boolean;
  currentlyInside: boolean;
  lastTransitionLabel: string;
}

export interface SafetyAlertEvent {
  id: string;
  childId: string;
  category: 'EMERGENCY_SOS' | 'GEOFENCE' | 'DEVICE_HEALTH' | 'CHECK_IN';
  title: string;
  description: string;
  timestampLabel: string;
  locationLabel: string;
  acknowledgedBy: string | null;
  isDrill: boolean;
}

export interface ChildRequestItem {
  id: string;
  childId: string;
  childName: string;
  type: 'EXTRA_TIME' | 'NEW_APP_INSTALL' | 'WEBSITE_UNBLOCK';
  targetName: string;
  targetCategory: string;
  requestedMinutes: number;
  reasonCategory: string;
  childNote: string;
  createdAtLabel: string;
  status: 'PENDING' | 'APPROVED' | 'DECLINED';
  decidedBy: string | null;
  parentNote: string | null;
}

export interface FamilyChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'PARENT' | 'CHILD' | 'SYSTEM';
  text: string;
  timestampLabel: string;
  isVoiceNote?: boolean;
  voiceDurationSec?: number;
}

export interface FamilyTaskItem {
  id: string;
  childId: string;
  title: string;
  subtitle: string;
  rewardTrustPoints: number;
  rewardBonusMinutes: number;
  completed: boolean;
  verifiedByParent: boolean;
}

export interface GuardianMember {
  id: string;
  name: string;
  relationLabel: string;
  email: string;
  phone: string;
  role: GuardianRole;
  geofenceAlertsEnabled: boolean;
  sosEscalationTier: 1 | 2 | 3;
  verified: boolean;
}

export interface WebFilterConfig {
  profile: 'STRICT' | 'BALANCED' | 'CUSTOM';
  blockAdultContent: boolean; // Locked true
  blockGambling: boolean;
  blockViolenceHate: boolean;
  blockSocialWebPortals: boolean;
  blockOnlineGamingPortals: boolean;
  enforceSafeSearchAi: boolean;
  whitelistedDomains: string[];
  blacklistedDomains: string[];
  blockedAttempts24h: number;
  safeSearches24h: number;
}

export interface SocialFilterConfig {
  globalMode: 'SUPERVISED' | 'STRICT_BLOCK' | 'GRANULAR';
  discordBlocked: boolean;
  robloxChatMode: 'FRIENDS_ONLY' | 'OFF' | 'OPEN';
  whatsappApprovedCircleOnly: boolean;
  youtubeRestrictedMode: boolean;
  hideShortsInDowntime: boolean;
  flaggedInteractions7d: number;
}

export interface NotificationFilterConfig {
  studyBedtimeQuietEnabled: boolean;
  interceptionProtocol: 'BATCHING' | 'TOTAL_SILENCE' | 'EMERGENCY_ONLY';
  batchReleaseTime: string;
  quietSocialMessaging: boolean;
  quietGamesStreaks: boolean;
  allowSchoolLearning: boolean;
  interceptedCount7d: number;
}

export type LiveSessionMode = 'SCREEN' | 'CAMERA' | 'AUDIO';

export type LiveSessionStatus =
  | 'IDLE'
  | 'PENDING_CHILD_CONSENT'
  | 'ACTIVE_CONSENTED'
  | 'DECLINED_BY_CHILD'
  | 'TERMINATED';

export type ConsentOutcome = 'APPROVED' | 'DENIED' | 'TIMED_OUT';

export interface ConsentHistoryEntry {
  id: string;
  sessionId: string;
  childId: string;
  childName: string;
  requestedByGuardianName: string;
  mode: LiveSessionMode;
  reason: string;
  outcome: ConsentOutcome;
  timestampLabel: string;
  durationSummary: string;
}

export interface LiveSessionState {
  sessionId: string;
  requestedByGuardianName: string;
  targetChildId: string;
  mode: LiveSessionMode;
  reason: string;
  status: LiveSessionStatus;
  remainingSeconds: number;
  maxDurationSeconds: number;
  twoWayTalkActive: boolean;
  startedAtLabel: string | null;
  endedReason: string | null;
}

export interface AnchorHouseholdState {
  id: string;
  householdName: string;
  subscriptionTier: SubscriptionTier;
  pairingCode: string;
  pairingExpiresAt: number;
  selectedChildId: string;
  deviceBatteryLevel: number;
  lastKnownBatterySync: string;
  children: ChildProfile[];
  guardians: GuardianMember[];
  apps: AppRuleItem[];
  schedules: ScheduleWindow[];
  geofences: SafeGeofence[];
  alerts: SafetyAlertEvent[];
  requests: ChildRequestItem[];
  messages: FamilyChatMessage[];
  tasks: FamilyTaskItem[];
  webFilter: WebFilterConfig;
  socialFilter: SocialFilterConfig;
  notificationFilter: NotificationFilterConfig;
  liveSession: LiveSessionState;
  consentHistory?: ConsentHistoryEntry[];
  autoApproveHomeworkApps: boolean;
  fairPlayAdvanceNoticeMinutes: number;
  anonymousDiagnosticsEnabled: boolean;
}

// ============================================================================
// Pure Business Logic Functions (Unit-Tested)
// ============================================================================

/**
 * Checks whether a feature is accessible under the current subscription tier.
 * Free features are ALWAYS accessible. Only the 6 explicitly defined Premium
 * feature groups require 'annual_trial' or 'monthly_premium'.
 */
export function isFeatureEntitled(feature: FeatureKey, tier: SubscriptionTier): boolean {
  if (!PREMIUM_ONLY_FEATURES.has(feature)) {
    return true;
  }
  return tier === 'annual_trial' || tier === 'monthly_premium';
}

/**
 * Validates a 6-digit pairing code (accepts '842915' or '842-915') against
 * the active household code and expiration timestamp.
 */
export function validatePairingCodeInput(
  inputCode: string,
  expectedCode: string,
  expiresAtMs: number,
  nowMs: number
): { valid: boolean; normalized: string; error?: string } {
  const normalized = inputCode.replace(/[^0-9]/g, '');
  const expectedNormalized = expectedCode.replace(/[^0-9]/g, '');

  if (normalized.length !== 6) {
    return { valid: false, normalized, error: 'Pairing code must be 6 digits.' };
  }
  if (nowMs > expiresAtMs) {
    return { valid: false, normalized, error: 'Pairing code has expired. Generate a new code on the Parent App.' };
  }
  if (normalized !== expectedNormalized) {
    return { valid: false, normalized, error: 'Invalid pairing code. Please check the 6-digit code shown on the Parent App.' };
  }
  return { valid: true, normalized };
}

/**
 * Formats a 6-digit numeric string as 'XXX-XXX'.
 */
export function formatPairingCode(rawDigits: string): string {
  const clean = rawDigits.replace(/[^0-9]/g, '').slice(0, 6);
  if (clean.length <= 3) return clean;
  return `${clean.slice(0, 3)}-${clean.slice(3)}`;
}

/**
 * Calculates remaining screen time and usage percentage for a child profile.
 */
export function calculateScreenTimeMetrics(
  usedMinutes: number,
  allowanceMinutes: number
): {
  remainingMinutes: number;
  usagePercent: number;
  isExhausted: boolean;
  formattedRemaining: string;
  formattedUsed: string;
  formattedAllowance: string;
} {
  const safeUsed = Math.max(0, Math.round(usedMinutes));
  const safeAllowance = Math.max(15, Math.round(allowanceMinutes));
  const remainingMinutes = Math.max(0, safeAllowance - safeUsed);
  const usagePercent = Math.min(100, Math.round((safeUsed / safeAllowance) * 100));

  return {
    remainingMinutes,
    usagePercent,
    isExhausted: remainingMinutes === 0,
    formattedRemaining: formatMinutesHuman(remainingMinutes),
    formattedUsed: formatMinutesHuman(safeUsed),
    formattedAllowance: formatMinutesHuman(safeAllowance),
  };
}

export function formatMinutesHuman(totalMinutes: number): string {
  const mins = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h 00m`;
  return `${h}h ${m < 10 ? `0${m}` : m}m`;
}

/**
 * Enforces Role-Based Access Control (RBAC) across Primary Admin,
 * Co-Guardian Admin, and Trusted Emergency Contact roles.
 */
export function canGuardianPerformAction(role: GuardianRole, action: GuardianAction): boolean {
  switch (role) {
    case 'PRIMARY_ADMIN':
      return true;
    case 'CO_GUARDIAN_ADMIN':
      // Co-Guardian can do everything except irreversibly delete household data or change primary billing tier
      return action !== 'DELETE_HOUSEHOLD_DATA' && action !== 'MANAGE_SUBSCRIPTION';
    case 'TRUSTED_EMERGENCY_CONTACT':
      // Emergency Contacts (e.g., Grandma Eleanor, Uncle David) can ONLY view location/SOS during alerts
      return action === 'VIEW_LOCATION_AND_SOS';
    default:
      return false;
  }
}

/**
 * Enforces the Mandatory Consent State Machine for Premium Live Sessions
 * (Screen Mirroring, Live Camera, Live Audio).
 * - A parent request NEVER goes straight to ACTIVE_CONSENTED; it MUST enter PENDING_CHILD_CONSENT.
 * - Only an explicit child approval transitions PENDING_CHILD_CONSENT -> ACTIVE_CONSENTED.
 * - Either parent or child can unconditionally terminate an active or pending session at any time.
 */
export function transitionLiveSession(
  current: LiveSessionState,
  event:
    | { type: 'PARENT_REQUEST'; guardianName: string; childId: string; mode: LiveSessionMode; reason: string; tier: SubscriptionTier }
    | { type: 'CHILD_APPROVE' }
    | { type: 'CHILD_DECLINE' }
    | { type: 'CONSENT_TIMEOUT' }
    | { type: 'STOP_SESSION'; actor: 'PARENT' | 'CHILD' }
    | { type: 'SWITCH_MODE'; mode: LiveSessionMode }
    | { type: 'TOGGLE_TWO_WAY_TALK' }
    | { type: 'TICK_SECOND' }
): { next: LiveSessionState; error?: string } {
  switch (event.type) {
    case 'PARENT_REQUEST': {
      const featureMap: Record<LiveSessionMode, FeatureKey> = {
        SCREEN: 'screen_mirroring_live_view',
        CAMERA: 'live_camera_access',
        AUDIO: 'live_microphone_audio',
      };
      if (!isFeatureEntitled(featureMap[event.mode], event.tier)) {
        return {
          next: current,
          error: 'Live safety check requires an active Anchor Family Premium subscription.',
        };
      }
      return {
        next: {
          sessionId: `#LIV-${Math.floor(10000 + Math.random() * 89999)}`,
          requestedByGuardianName: event.guardianName,
          targetChildId: event.childId,
          mode: event.mode,
          reason: event.reason.trim() || 'Study hour focus verification',
          status: 'PENDING_CHILD_CONSENT',
          remainingSeconds: 600, // Hard 10-minute cap
          maxDurationSeconds: 600,
          twoWayTalkActive: false,
          startedAtLabel: null,
          endedReason: null,
        },
      };
    }
    case 'CHILD_APPROVE': {
      if (current.status !== 'PENDING_CHILD_CONSENT') {
        return { next: current, error: 'No pending live request to approve.' };
      }
      return {
        next: {
          ...current,
          status: 'ACTIVE_CONSENTED',
          remainingSeconds: 600,
          startedAtLabel: 'Just now',
          endedReason: null,
        },
      };
    }
    case 'CHILD_DECLINE': {
      if (current.status !== 'PENDING_CHILD_CONSENT') {
        return { next: current, error: 'No pending live request to decline.' };
      }
      return {
        next: {
          ...current,
          status: 'DECLINED_BY_CHILD',
          remainingSeconds: 0,
          twoWayTalkActive: false,
          endedReason: 'Declined by child on device',
        },
      };
    }
    case 'CONSENT_TIMEOUT': {
      if (current.status !== 'PENDING_CHILD_CONSENT') {
        return { next: current, error: 'No pending live request to time out.' };
      }
      return {
        next: {
          ...current,
          status: 'TERMINATED',
          remainingSeconds: 0,
          twoWayTalkActive: false,
          endedReason: 'Consent request timed out (no response within 60s)',
        },
      };
    }
    case 'STOP_SESSION': {
      return {
        next: {
          ...current,
          status: 'TERMINATED',
          remainingSeconds: 0,
          twoWayTalkActive: false,
          endedReason:
            event.actor === 'CHILD'
              ? 'Stopped immediately by child via red sovereignty bar'
              : 'Ended by guardian',
        },
      };
    }
    case 'SWITCH_MODE': {
      if (current.status !== 'ACTIVE_CONSENTED' && current.status !== 'PENDING_CHILD_CONSENT') {
        return { next: { ...current, mode: event.mode } };
      }
      return {
        next: {
          ...current,
          mode: event.mode,
        },
      };
    }
    case 'TOGGLE_TWO_WAY_TALK': {
      if (current.status !== 'ACTIVE_CONSENTED') {
        return { next: current, error: 'Two-way talk requires an active consented session.' };
      }
      return {
        next: {
          ...current,
          twoWayTalkActive: !current.twoWayTalkActive,
        },
      };
    }
    case 'TICK_SECOND': {
      if (current.status !== 'ACTIVE_CONSENTED') {
        return { next: current };
      }
      if (current.remainingSeconds <= 1) {
        return {
          next: {
            ...current,
            status: 'TERMINATED',
            remainingSeconds: 0,
            twoWayTalkActive: false,
            endedReason: '10-minute maximum session timer expired automatically',
          },
        };
      }
      return {
        next: {
          ...current,
          remainingSeconds: current.remainingSeconds - 1,
        },
      };
    }
  }
}

/**
 * Creates a standardized ConsentHistoryEntry when a child consent request resolves.
 */
export function createConsentHistoryEntry(
  session: LiveSessionState,
  childName: string,
  outcome: ConsentOutcome,
  timestampLabel = 'Just now'
): ConsentHistoryEntry {
  const durationMap: Record<ConsentOutcome, string> = {
    APPROVED: 'Consented • 10m max window',
    DENIED: 'Declined by child on device (0s)',
    TIMED_OUT: 'No response within 60s window',
  };
  return {
    id: `consent-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    sessionId: session.sessionId,
    childId: session.targetChildId,
    childName,
    requestedByGuardianName: session.requestedByGuardianName,
    mode: session.mode,
    reason: session.reason,
    outcome,
    timestampLabel,
    durationSummary: durationMap[outcome],
  };
}

/**
 * Filters a list of ConsentHistoryEntry records by outcome and optional childId.
 */
export function filterConsentHistory(
  entries: ConsentHistoryEntry[],
  outcomeFilter: 'ALL' | ConsentOutcome,
  childId?: string
): ConsentHistoryEntry[] {
  return entries.filter((entry) => {
    const matchesChild = !childId || entry.childId === childId;
    const matchesOutcome = outcomeFilter === 'ALL' || entry.outcome === outcomeFilter;
    return matchesChild && matchesOutcome;
  });
}

export type SyncHealthStatus = 'OPTIMAL' | 'DEGRADED' | 'OFFLINE';

export interface SyncHealthReport {
  status: SyncHealthStatus;
  latencyMs: number | null;
  pendingUpdatesCount: number;
  headline: string;
  detail: string;
}

/**
 * Evaluates real-time synchronization health and latency between Parent and Child APKs.
 */
export function evaluateSyncHealth(
  childOnline: boolean,
  latencyMs: number,
  pendingUpdatesCount = 0
): SyncHealthReport {
  if (!childOnline || latencyMs < 0) {
    return {
      status: 'OFFLINE',
      latencyMs: null,
      pendingUpdatesCount,
      headline: 'Child APK Offline',
      detail:
        pendingUpdatesCount > 0
          ? `${pendingUpdatesCount} rule update(s) queued for FCM wake`
          : 'Enforcing cached local SQLite rules on device',
    };
  }
  const safeLatency = Math.max(1, Math.round(latencyMs));
  if (safeLatency > 350 || pendingUpdatesCount > 0) {
    return {
      status: 'DEGRADED',
      latencyMs: safeLatency,
      pendingUpdatesCount,
      headline: `Sync Degraded (${safeLatency}ms)`,
      detail:
        pendingUpdatesCount > 0
          ? `${pendingUpdatesCount} pending rule sync(s) in flight`
          : 'High network jitter • Retrying via TLS 1.3',
    };
  }
  return {
    status: 'OPTIMAL',
    latencyMs: safeLatency,
    pendingUpdatesCount: 0,
    headline: `Sync Healthy • ${safeLatency}ms RTT`,
    detail: 'Parent ↔ Child APK real-time channel active',
  };
}

export interface SubscriptionPlanMeta {
  id: SubscriptionTier;
  name: string;
  badge: string;
  priceLabel: string;
  billingCycle: string;
  description: string;
  rank: number;
  highlights: string[];
}

export const SUBSCRIPTION_PLANS: readonly SubscriptionPlanMeta[] = [
  {
    id: 'free',
    name: 'Core Free Forever',
    badge: 'Always $0 • Essential Safety',
    priceLabel: '$0 / mo',
    billingCycle: 'No credit card required • Unlimited children & devices',
    description:
      'Complete core screen-time limits, bedtime/school schedules, live GPS & geofences, SOS alerts, and family tasks.',
    rank: 0,
    highlights: [
      'Daily screen-time limits, app blocking & schedules',
      'Live GPS location tracking, safe geofences & SOS alerts',
      'Extra-time requests, family chat & chore rewards',
    ],
  },
  {
    id: 'annual_trial',
    name: 'Annual Family Plan',
    badge: 'Recommended • 14-Day Free Trial',
    priceLabel: '$4.99 / mo',
    billingCycle: 'Billed $59.88/yr via Google Play after 14-day trial (Save 38%)',
    description:
      'Unlocks all 6 advanced protection engines including Consent-First Live Check-In and Knox DNS filtering.',
    rank: 2,
    highlights: [
      'Consent-First Live Screen, Camera & Audio Check-Ins (P-19)',
      'Advanced Web & SafeSearch DNS Filtering (P-16)',
      'Social Media Shield & Study Notification Batching (P-17 & P-18)',
    ],
  },
  {
    id: 'monthly_premium',
    name: 'Monthly Flexible Plan',
    badge: 'Month-to-Month Flexibility',
    priceLabel: '$7.99 / mo',
    billingCycle: 'Billed monthly via Google Play • Cancel anytime',
    description:
      'Full access to all 6 Anchor Family Premium protection engines with month-to-month billing flexibility.',
    rank: 1,
    highlights: [
      'All 6 Anchor Family Premium features included',
      'Shared across all household guardians & child devices',
      'Flexible monthly renewal with zero annual commitment',
    ],
  },
];

/**
 * Validates and computes a subscription tier upgrade/downgrade transition.
 * Only the Primary Guardian (PRIMARY_ADMIN) can upgrade or downgrade household subscription tiers.
 */
export function changeSubscriptionTier(
  currentTier: SubscriptionTier,
  targetTier: SubscriptionTier,
  guardianRole: GuardianRole
): {
  nextTier: SubscriptionTier;
  changed: boolean;
  direction: 'UPGRADE' | 'DOWNGRADE' | 'SWITCH' | 'UNCHANGED';
  actionSummary: string;
  error?: string;
} {
  if (!canGuardianPerformAction(guardianRole, 'MANAGE_SUBSCRIPTION')) {
    return {
      nextTier: currentTier,
      changed: false,
      direction: 'UNCHANGED',
      actionSummary: 'Permission denied',
      error: 'Only the Primary Guardian can upgrade or downgrade the household subscription tier.',
    };
  }

  if (currentTier === targetTier) {
    return {
      nextTier: currentTier,
      changed: false,
      direction: 'UNCHANGED',
      actionSummary: `Household is already on ${targetTier}`,
    };
  }

  const currentPlan = SUBSCRIPTION_PLANS.find((p) => p.id === currentTier)!;
  const targetPlan = SUBSCRIPTION_PLANS.find((p) => p.id === targetTier)!;
  const direction =
    targetTier === 'free'
      ? 'DOWNGRADE'
      : currentTier === 'free'
      ? 'UPGRADE'
      : targetPlan.rank > currentPlan.rank
      ? 'UPGRADE'
      : 'SWITCH';

  return {
    nextTier: targetTier,
    changed: true,
    direction,
    actionSummary: `${direction === 'DOWNGRADE' ? 'Downgraded' : direction === 'UPGRADE' ? 'Upgraded' : 'Switched'} household subscription to ${targetPlan.name} (${targetTier})`,
  };
}

export type BatteryHealthLevel = 'GOOD' | 'LOW' | 'CRITICAL';

export interface BatteryTelemetryStatus {
  level: number;
  status: BatteryHealthLevel;
  isCharging: boolean;
  lastKnownBatterySync: string;
  iconName: string;
  shortLabel: string;
  ariaDescription: string;
}

/**
 * Evaluates child device battery percentage and sync telemetry for the Parent View header indicator.
 */
export function evaluateBatteryTelemetry(
  deviceBatteryLevel: number,
  lastKnownBatterySync: string,
  isCharging = false
): BatteryTelemetryStatus {
  const safeLevel = Math.max(0, Math.min(100, Math.round(deviceBatteryLevel)));
  const syncText = (lastKnownBatterySync || 'Synced just now').trim();

  let status: BatteryHealthLevel = 'GOOD';
  if (safeLevel <= 15) {
    status = 'CRITICAL';
  } else if (safeLevel <= 30) {
    status = 'LOW';
  }

  let iconName = 'battery_full';
  if (isCharging) {
    iconName = 'battery_charging_full';
  } else if (safeLevel <= 15) {
    iconName = 'battery_alert';
  } else if (safeLevel <= 35) {
    iconName = 'battery_2_bar';
  } else if (safeLevel <= 75) {
    iconName = 'battery_4_bar';
  }

  return {
    level: safeLevel,
    status,
    isCharging,
    lastKnownBatterySync: syncText,
    iconName,
    shortLabel: `${safeLevel}%`,
    ariaDescription: `Child device battery ${safeLevel}%${isCharging ? ' charging' : ''} (${syncText})`,
  };
}


