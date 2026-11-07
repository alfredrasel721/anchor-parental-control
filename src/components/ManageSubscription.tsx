import React, { useState, useEffect } from 'react';
import {
  canGuardianPerformAction,
  changeSubscriptionTier,
  GuardianRole,
  SUBSCRIPTION_PLANS,
  SubscriptionTier,
} from '../utils/anchorLogic';

export interface ManageSubscriptionProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: SubscriptionTier;
  activeGuardianRole: GuardianRole;
  householdName: string;
  onSelectTier: (nextTier: SubscriptionTier, summary: string) => void;
}

export const ManageSubscription: React.FC<ManageSubscriptionProps> = ({
  isOpen,
  onClose,
  currentTier,
  activeGuardianRole,
  householdName,
  onSelectTier,
}) => {
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>(currentTier);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedTier(currentTier);
      setErrorBanner(null);
    }
  }, [isOpen, currentTier]);

  if (!isOpen) return null;

  const canManageSubscription = canGuardianPerformAction(
    activeGuardianRole,
    'MANAGE_SUBSCRIPTION'
  );

  const selectedPlanMeta =
    SUBSCRIPTION_PLANS.find((p) => p.id === selectedTier) || SUBSCRIPTION_PLANS[1];
  const currentPlanMeta =
    SUBSCRIPTION_PLANS.find((p) => p.id === currentTier) || SUBSCRIPTION_PLANS[0];

  const handleApplyChange = () => {
    const result = changeSubscriptionTier(currentTier, selectedTier, activeGuardianRole);
    if (result.error) {
      setErrorBanner(result.error);
      return;
    }
    if (!result.changed) {
      onClose();
      return;
    }
    onSelectTier(result.nextTier, result.actionSummary);
    onClose();
  };

  const getActionButtonLabel = () => {
    if (!canManageSubscription) {
      return 'Primary Guardian Required to Change Plan';
    }
    if (selectedTier === currentTier) {
      return `Keep ${currentPlanMeta.name} (${currentTier})`;
    }
    if (selectedTier === 'free') {
      return 'Downgrade to Core Free Forever ($0/mo)';
    }
    if (currentTier === 'free') {
      return `Upgrade to ${selectedPlanMeta.name} (${selectedPlanMeta.priceLabel})`;
    }
    return `Switch to ${selectedPlanMeta.name} (${selectedPlanMeta.priceLabel})`;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Manage Subscription"
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
    >
      <div className="bg-surface text-on-surface border border-outline-variant/30 rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-primary to-primary-container text-on-primary flex items-start justify-between gap-3 shrink-0">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-[10px] font-mono font-bold uppercase tracking-wider">
              <span className="material-symbols-outlined text-[13px]">workspace_premium</span>
              <span>Google Play Billing v7 • {householdName}</span>
            </div>
            <h2 className="font-headline font-extrabold text-lg leading-tight">
              Manage Subscription &amp; Pricing Plans
            </h2>
            <p className="text-xs text-on-primary-container">
              Current Active Plan:{' '}
              <strong className="font-mono uppercase text-white">
                {currentPlanMeta.name} ({currentTier})
              </strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Manage Subscription Modal"
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center text-sm font-bold shrink-0 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1">
          {/* RBAC Notice if non-primary guardian */}
          {!canManageSubscription && (
            <div className="rounded-2xl bg-error-container/60 border border-error/30 p-3.5 text-xs text-on-error-container flex items-start gap-2.5">
              <span className="material-symbols-outlined text-error text-lg shrink-0">
                lock_person
              </span>
              <div>
                <p className="font-bold text-error">
                  Primary Guardian Authorization Required
                </p>
                <p className="text-[11px] mt-0.5 leading-relaxed">
                  You are viewing as <strong>{activeGuardianRole}</strong>. Only the Primary Guardian (Sarah Jenkins) can upgrade or downgrade household subscription tiers.
                </p>
              </div>
            </div>
          )}

          {errorBanner && (
            <div className="rounded-2xl bg-error-container p-3 text-xs font-bold text-error">
              {errorBanner}
            </div>
          )}

          {/* Pricing Plans List */}
          <div className="space-y-2.5" role="radiogroup" aria-label="Subscription Pricing Plans">
            {SUBSCRIPTION_PLANS.map((plan) => {
              const isSelected = selectedTier === plan.id;
              const isCurrent = currentTier === plan.id;

              return (
                <button
                  key={plan.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setSelectedTier(plan.id)}
                  className={`w-full text-left rounded-2xl p-4 border-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-primary-fixed/25 border-primary shadow-sm'
                      : 'bg-surface-container-low border-outline-variant/25 hover:border-outline-variant/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container">
                        {plan.badge}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-status-enforced/15 text-status-enforced">
                          Current Tier
                        </span>
                      )}
                    </div>
                    <span className="font-mono font-extrabold text-base text-primary shrink-0">
                      {plan.priceLabel}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-headline font-bold text-sm text-on-surface">
                      {plan.name}
                    </h3>
                    <span className="text-[10px] font-mono text-on-surface-variant">
                      id: {plan.id}
                    </span>
                  </div>

                  <p className="text-[11px] font-semibold text-primary mt-0.5">
                    {plan.billingCycle}
                  </p>
                  <p className="text-[11px] text-on-surface-variant mt-1 leading-relaxed">
                    {plan.description}
                  </p>

                  <ul className="mt-2.5 pt-2 border-t border-outline-variant/15 space-y-1">
                    {plan.highlights.map((item) => (
                      <li
                        key={item}
                        className="flex items-center gap-1.5 text-[11px] text-on-surface"
                      >
                        <span
                          className="material-symbols-outlined text-[14px] text-secondary shrink-0"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          check_circle
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl bg-surface-container-low p-3 border border-outline-variant/20 text-[11px] text-on-surface-variant flex items-center justify-between gap-2">
            <span>
              Entitlement syncs immediately to both <strong>Parent APK</strong> &amp;{' '}
              <strong>Child APK</strong> via Firestore.
            </span>
            <span className="font-mono text-[10px] font-bold text-primary shrink-0">
              175+ Countries
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-surface-container-low border-t border-outline-variant/20 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-surface border border-outline-variant/30 text-xs font-bold text-on-surface-variant hover:text-on-surface cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canManageSubscription}
            onClick={handleApplyChange}
            className={`px-4 py-2.5 rounded-xl font-headline font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all ${
              canManageSubscription
                ? 'bg-primary text-on-primary hover:brightness-110 cursor-pointer'
                : 'bg-outline-variant/40 text-on-surface-variant cursor-not-allowed'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">sync_saved_locally</span>
            <span>{getActionButtonLabel()}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
