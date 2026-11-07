import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isFeatureEntitled,
  validatePairingCodeInput,
  formatPairingCode,
  calculateScreenTimeMetrics,
  canGuardianPerformAction,
  transitionLiveSession,
  LiveSessionState,
  FeatureKey,
} from './anchorLogic.ts';

test('Free vs Premium Entitlement Boundary strictly enforces the 6 Premium groups only', () => {
  const freeFeatures: FeatureKey[] = [
    'auth_family_management',
    'device_pairing',
    'guardian_roles_rbac',
    'dashboard_activity_reports',
    'daily_screen_time_limits',
    'individual_app_limits',
    'app_blocking_categories',
    'schedules_bedtime_school',
    'extra_time_requests',
    'location_tracking_geofencing',
    'sos_alerts_checkins',
    'family_chat_tasks_rewards',
    'privacy_data_export_deletion',
  ];

  const premiumFeatures: FeatureKey[] = [
    'screen_mirroring_live_view',
    'live_camera_access',
    'live_microphone_audio',
    'notification_filtering',
    'website_content_filtering',
    'social_media_content_filtering',
  ];

  for (const f of freeFeatures) {
    assert.equal(isFeatureEntitled(f, 'free'), true, `Expected ${f} to be FREE`);
    assert.equal(isFeatureEntitled(f, 'annual_trial'), true);
    assert.equal(isFeatureEntitled(f, 'monthly_premium'), true);
  }

  for (const p of premiumFeatures) {
    assert.equal(isFeatureEntitled(p, 'free'), false, `Expected ${p} to require PREMIUM`);
    assert.equal(isFeatureEntitled(p, 'annual_trial'), true);
    assert.equal(isFeatureEntitled(p, 'monthly_premium'), true);
  }
});

test('Pairing code validation and formatting handles hyphenated 6-digit codes and expiry', () => {
  assert.equal(formatPairingCode('842915'), '842-915');
  const now = 1_700_000_000_000;
  const future = now + 600_000;
  const past = now - 1_000;

  const ok = validatePairingCodeInput('842-915', '842915', future, now);
  assert.equal(ok.valid, true);
  assert.equal(ok.normalized, '842915');

  const wrong = validatePairingCodeInput('111-222', '842915', future, now);
  assert.equal(wrong.valid, false);

  const expired = validatePairingCodeInput('842-915', '842915', past, now);
  assert.equal(expired.valid, false);
  assert.match(expired.error || '', /expired/i);
});

test('Screen time metrics calculate remaining allowance and percentage accurately', () => {
  const m = calculateScreenTimeMetrics(135, 210); // 2h 15m used of 3h 30m
  assert.equal(m.remainingMinutes, 75);
  assert.equal(m.formattedUsed, '2h 15m');
  assert.equal(m.formattedAllowance, '3h 30m');
  assert.equal(m.formattedRemaining, '1h 15m');
  assert.equal(m.isExhausted, false);

  const exhausted = calculateScreenTimeMetrics(220, 210);
  assert.equal(exhausted.remainingMinutes, 0);
  assert.equal(exhausted.usagePercent, 100);
  assert.equal(exhausted.isExhausted, true);
});

test('Guardian RBAC enforces separation of powers across Primary, Co-Guardian, and Emergency Contact', () => {
  assert.equal(canGuardianPerformAction('PRIMARY_ADMIN', 'DELETE_HOUSEHOLD_DATA'), true);
  assert.equal(canGuardianPerformAction('CO_GUARDIAN_ADMIN', 'DELETE_HOUSEHOLD_DATA'), false);
  assert.equal(canGuardianPerformAction('CO_GUARDIAN_ADMIN', 'EDIT_SCHEDULES_AND_LIMITS'), true);
  assert.equal(canGuardianPerformAction('TRUSTED_EMERGENCY_CONTACT', 'VIEW_LOCATION_AND_SOS'), true);
  assert.equal(canGuardianPerformAction('TRUSTED_EMERGENCY_CONTACT', 'EDIT_SCHEDULES_AND_LIMITS'), false);
  assert.equal(canGuardianPerformAction('TRUSTED_EMERGENCY_CONTACT', 'INITIATE_LIVE_CHECK'), false);
});

test('Live Session state machine enforces Premium entitlement, explicit Child consent, and Child stop sovereignty', () => {
  const initial: LiveSessionState = {
    sessionId: '#LIV-00000',
    requestedByGuardianName: 'Sarah Jenkins',
    targetChildId: 'child-leo',
    mode: 'SCREEN',
    reason: 'Study hour focus verification',
    status: 'IDLE',
    remainingSeconds: 600,
    maxDurationSeconds: 600,
    twoWayTalkActive: false,
    startedAtLabel: null,
    endedReason: null,
  };

  // 1. Free tier cannot initiate a live session
  const blockedFree = transitionLiveSession(initial, {
    type: 'PARENT_REQUEST',
    guardianName: 'Sarah Jenkins (Mom)',
    childId: 'child-leo',
    mode: 'SCREEN',
    reason: 'Homework check',
    tier: 'free',
  });
  assert.equal(blockedFree.next.status, 'IDLE');
  assert.ok(blockedFree.error);

  // 2. Premium tier enters PENDING_CHILD_CONSENT (never skips straight to ACTIVE_CONSENTED)
  const pending = transitionLiveSession(initial, {
    type: 'PARENT_REQUEST',
    guardianName: 'Sarah Jenkins (Mom)',
    childId: 'child-leo',
    mode: 'SCREEN',
    reason: 'Study hour focus verification',
    tier: 'annual_trial',
  });
  assert.equal(pending.next.status, 'PENDING_CHILD_CONSENT');

  // 3. Child explicitly approves -> ACTIVE_CONSENTED with 600s max timer
  const approved = transitionLiveSession(pending.next, { type: 'CHILD_APPROVE' });
  assert.equal(approved.next.status, 'ACTIVE_CONSENTED');
  assert.equal(approved.next.remainingSeconds, 600);

  // 4. Child can unconditionally stop the session at any moment
  const stoppedByChild = transitionLiveSession(approved.next, {
    type: 'STOP_SESSION',
    actor: 'CHILD',
  });
  assert.equal(stoppedByChild.next.status, 'TERMINATED');
  assert.equal(stoppedByChild.next.remainingSeconds, 0);

  // 5. Pending consent request can time out cleanly (TIMED_OUT)
  const pending2 = transitionLiveSession(initial, {
    type: 'PARENT_REQUEST',
    guardianName: 'Mark Jenkins (Dad)',
    childId: 'child-leo',
    mode: 'AUDIO',
    reason: 'Evening check-in',
    tier: 'annual_trial',
  });
  const timedOut = transitionLiveSession(pending2.next, { type: 'CONSENT_TIMEOUT' });
  assert.equal(timedOut.next.status, 'TERMINATED');
  assert.match(timedOut.next.endedReason || '', /timed out/i);
});

import {
  createConsentHistoryEntry,
  filterConsentHistory,
  evaluateSyncHealth,
  changeSubscriptionTier,
  evaluateBatteryTelemetry,
} from './anchorLogic.ts';

test('Consent History records and filters APPROVED, DENIED, and TIMED_OUT outcomes accurately', () => {
  const sampleSession: LiveSessionState = {
    sessionId: '#LIV-90123',
    requestedByGuardianName: 'Sarah Jenkins (Mom)',
    targetChildId: 'child-leo',
    mode: 'SCREEN',
    reason: 'Homework check-in',
    status: 'PENDING_CHILD_CONSENT',
    remainingSeconds: 600,
    maxDurationSeconds: 600,
    twoWayTalkActive: false,
    startedAtLabel: null,
    endedReason: null,
  };

  const approvedEntry = createConsentHistoryEntry(sampleSession, 'Leo Jenkins', 'APPROVED', 'Today, 4:00 PM');
  const deniedEntry = createConsentHistoryEntry(sampleSession, 'Leo Jenkins', 'DENIED', 'Today, 3:00 PM');
  const timedOutEntry = createConsentHistoryEntry(
    { ...sampleSession, targetChildId: 'child-maya' },
    'Maya Jenkins',
    'TIMED_OUT',
    'Yesterday'
  );

  const all = [approvedEntry, deniedEntry, timedOutEntry];
  assert.equal(filterConsentHistory(all, 'ALL').length, 3);
  assert.equal(filterConsentHistory(all, 'APPROVED').length, 1);
  assert.equal(filterConsentHistory(all, 'DENIED').length, 1);
  assert.equal(filterConsentHistory(all, 'TIMED_OUT').length, 1);
  assert.equal(filterConsentHistory(all, 'ALL', 'child-leo').length, 2);
});

test('Sync Health evaluator classifies OPTIMAL, DEGRADED, and OFFLINE states accurately', () => {
  const optimal = evaluateSyncHealth(true, 42, 0);
  assert.equal(optimal.status, 'OPTIMAL');
  assert.equal(optimal.latencyMs, 42);

  const degradedLatency = evaluateSyncHealth(true, 480, 0);
  assert.equal(degradedLatency.status, 'DEGRADED');

  const degradedPending = evaluateSyncHealth(true, 55, 2);
  assert.equal(degradedPending.status, 'DEGRADED');
  assert.equal(degradedPending.pendingUpdatesCount, 2);

  const offline = evaluateSyncHealth(false, 42, 1);
  assert.equal(offline.status, 'OFFLINE');
  assert.equal(offline.latencyMs, null);
});

test('ManageSubscription tier transition enforces Primary Guardian RBAC and upgrades/downgrades accurately', () => {
  // Non-primary guardians cannot modify subscriptionTier
  const blockedCoGuardian = changeSubscriptionTier('free', 'annual_trial', 'CO_GUARDIAN_ADMIN');
  assert.equal(blockedCoGuardian.changed, false);
  assert.equal(blockedCoGuardian.nextTier, 'free');
  assert.ok(blockedCoGuardian.error);

  // Primary guardian upgrades from free -> annual_trial
  const upgraded = changeSubscriptionTier('free', 'annual_trial', 'PRIMARY_ADMIN');
  assert.equal(upgraded.changed, true);
  assert.equal(upgraded.nextTier, 'annual_trial');
  assert.equal(upgraded.direction, 'UPGRADE');

  // Primary guardian downgrades from annual_trial -> free
  const downgraded = changeSubscriptionTier('annual_trial', 'free', 'PRIMARY_ADMIN');
  assert.equal(downgraded.changed, true);
  assert.equal(downgraded.nextTier, 'free');
  assert.equal(downgraded.direction, 'DOWNGRADE');
});

test('Battery telemetry evaluator classifies GOOD, LOW, and CRITICAL levels and formats sync labels', () => {
  const good = evaluateBatteryTelemetry(78, 'Synced 12s ago', false);
  assert.equal(good.level, 78);
  assert.equal(good.status, 'GOOD');
  assert.equal(good.shortLabel, '78%');
  assert.equal(good.lastKnownBatterySync, 'Synced 12s ago');

  const low = evaluateBatteryTelemetry(22, 'Synced 1m ago', false);
  assert.equal(low.status, 'LOW');
  assert.equal(low.iconName, 'battery_2_bar');

  const critical = evaluateBatteryTelemetry(9, 'Synced just now', false);
  assert.equal(critical.status, 'CRITICAL');
  assert.equal(critical.iconName, 'battery_alert');

  const charging = evaluateBatteryTelemetry(55, 'Synced just now', true);
  assert.equal(charging.iconName, 'battery_charging_full');
});



