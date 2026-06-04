import React, { useEffect, useRef, useState } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { AlertCircle, ArrowRight, CheckCircle2, Copy, Loader2, ShieldCheck, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEMO_MIT_MANAGEMENT_URL } from '@/config/payermaxDemoUrls';
import type { PaymentMethod } from '@/types/subscription';
import { calculateActivationAmount, getMandateAmounts, normalizeFullCashierSubscriptionParams } from '@/types/subscription';
import { buildFirstPeriodStartDate, buildSubscriptionPlan } from '@/types/subscription';
import { getErrorMessage, showUiError, showUiWarning } from '@/lib/uiFeedback';
import { useLanguage } from '@/contexts/LanguageContext';

const CardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={2}>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20" />
    <path d="M6 15h2" />
  </svg>
);

const GooglePayIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
    <path d="M12 11.5V13h3.5c-.14.87-.94 2.55-3.5 2.55-2.1 0-3.82-1.74-3.82-3.88 0-2.14 1.72-3.88 3.82-3.88 1.2 0 2 .51 2.46.95l1.67-1.61C14.96 7.5 13.6 6.87 12 6.87c-3.42 0-6.2 2.76-6.2 6.13 0 3.37 2.78 6.13 6.2 6.13 3.58 0 5.95-2.51 5.95-6.05 0-.41-.04-.72-.1-1.03H12v-.55z" fill="white" />
  </svg>
);

const methods: Array<{
  id: Exclude<PaymentMethod, 'apm'>;
  label: string;
  sub: string;
  icon: React.ReactNode;
  bg: string;
}> = [
  { id: 'card', label: 'Bank Card', sub: 'Visa, Master, recurring card', icon: <CardIcon />, bg: 'bg-indigo-600' },
  { id: 'applepay', label: 'Apple Pay', sub: 'Tokenized wallet binding', icon: <Wallet className="w-5 h-5" />, bg: 'bg-black' },
  { id: 'googlepay', label: 'Google Pay', sub: 'Android wallet binding', icon: <GooglePayIcon />, bg: 'bg-[#4285F4]' },
];

const MIT_MANAGEMENT_URL = DEMO_MIT_MANAGEMENT_URL;

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> => {
  let timer: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) window.clearTimeout(timer);
  }
};

export const StepComponent: React.FC = () => {
  const {
    subMode,
    currentStep,
    subscriptionType,
    paymentMethod,
    setPaymentMethod,
    formParams,
    subscriptionNo,
    componentSessionData,
    componentPaymentToken,
    stepApiExchanges,
    isApiCalling,
    prepareComponentSession,
    generateComponentToken,
    activateComponentSubscription,
    bindMandatePaymentMethod,
    completeActivationWithQuery,
    goNext,
  } = useSubscription();
  const { t } = useLanguage();

  const [sdkStatus, setSdkStatus] = useState<'idle' | 'loading' | 'ready' | 'missing' | 'unsupported'>('idle');
  const [isTokenizing, setIsTokenizing] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [copied, setCopied] = useState(false);
  const [componentActivationResult, setComponentActivationResult] = useState<any>(null);
  const instanceRef = useRef<any>(null);
  const mountedKeyRef = useRef<string | null>(null);
  const sessionRequestRef = useRef<string | null>(null);
  const primaryInFlightRef = useRef(false);

  const hasSession = Boolean(componentSessionData);
  const hasToken = Boolean(componentPaymentToken);
  const hasCurrentStepExchange = Boolean(stepApiExchanges[currentStep.id]);
  const currentMethod = !paymentMethod || paymentMethod === 'apm' ? 'card' : paymentMethod;
  const mandateAmounts = getMandateAmounts(subMode, formParams, paymentMethod);
  const normalizedParams = subMode === 'payermax' ? normalizeFullCashierSubscriptionParams(formParams) : formParams;
  const displayCurrency = subMode === 'merchant' || subMode === 'nonperiodic'
    ? mandateAmounts.currency
    : normalizedParams.currency;
  const displayAmount = subMode === 'merchant' || subMode === 'nonperiodic'
    ? mandateAmounts.firstBindAmount
    : subMode === 'payermax'
      ? calculateActivationAmount(subscriptionType, normalizedParams)
      : normalizedParams.amount;
  const amountText = Number(displayAmount || 0).toFixed(displayCurrency === 'KRW' ? 0 : 2);
  const isEmbeddedInPlanStep = subMode === 'payermax' && currentStep.id === 'pm-2';
  const currentMethodLabel = methods.find(method => method.id === currentMethod)?.label || currentMethod.toUpperCase();
  const buildMitCanMakePaymentArgs = () => {
    const firstPeriodStartDate = buildFirstPeriodStartDate();

    if (subMode === 'payermax') {
      const normalizedPlanParams = normalizeFullCashierSubscriptionParams(formParams);
      return {
        subscriptionPlan: {
          ...buildSubscriptionPlan(subscriptionType, normalizedPlanParams),
          firstPeriodStartDate,
        },
        mitManagementUrl: MIT_MANAGEMENT_URL,
      };
    }

    return {
      subscriptionPlan: {
        subject: 'subject',
        description: 'PayerMax subscription first-period debit.',
        totalPeriods: Number(formParams.totalPeriods || 12),
        periodRule: {
          periodUnit: formParams.periodUnit || 'M',
          periodCount: Number(formParams.periodCount || 1),
        },
        periodAmount: {
          amount: Number(mandateAmounts.configuredLaterDebitAmount || mandateAmounts.laterDebitAmount || mandateAmounts.firstBindAmount || 0),
          currency: mandateAmounts.currency,
        },
        firstPeriodStartDate,
      },
      mitManagementUrl: MIT_MANAGEMENT_URL,
    };
  };

  useEffect(() => {
    if (subMode === 'payermax' || isApiCalling) return;
    if (componentSessionData && hasCurrentStepExchange) return;
    const requestKey = `${currentStep.id}:${componentSessionData?.sessionKey || 'new'}:${hasCurrentStepExchange ? 'recorded' : 'missing'}`;
    if (sessionRequestRef.current === requestKey) return;
    sessionRequestRef.current = requestKey;
    void prepareComponentSession(currentStep.id).catch((error) => {
      console.error(error);
      sessionRequestRef.current = null;
    });
  }, [subMode, componentSessionData, hasCurrentStepExchange, isApiCalling, prepareComponentSession, currentStep.id]);

  useEffect(() => {
    if (!componentSessionData || !currentMethod || mountedKeyRef.current === currentMethod) return;

    let cancelled = false;
    let attempts = 0;

    const mountComponent = () => {
      if (cancelled) return;

      const PMdropin = (window as any).PMdropin;
      if (!PMdropin) {
        attempts += 1;
        setSdkStatus('loading');
        if (attempts > 30) {
          setSdkStatus('missing');
          return;
        }
        window.setTimeout(mountComponent, 100);
        return;
      }

      try {
        if (currentMethod === 'applepay' && typeof PMdropin.isSupportApplePay === 'function' && !PMdropin.isSupportApplePay()) {
          setSdkStatus('unsupported');
          return;
        }

        if (instanceRef.current?.unmount) {
          instanceRef.current.unmount();
          instanceRef.current = null;
        }

        const commonConfig = {
          clientKey: componentSessionData.clientKey,
          sessionKey: componentSessionData.sessionKey,
          language: 'en',
          sandbox: true,
        };

        let containerId = '';
        let instance: any = null;

        if (currentMethod === 'card') {
          containerId = 'pmx-subscription-card-container';
          instance = PMdropin.create('card', {
            ...commonConfig,
            customTheme: [{
              name: 'subscription',
              base: 'light',
              style: `:root {
                --bg-color-input: #f9fafb;
                --border-radius-input: 12px;
                --border-color-input: #eef2ff;
                --height-input: 44px;
              }`,
            }],
          });
        } else if (currentMethod === 'applepay') {
          containerId = 'pmx-subscription-bottom-sdk-slot';
          instance = PMdropin.create('applepay', {
            ...commonConfig,
            theme: 'black',
            payButtonStyle: 'width:100%; height:50px; border-radius:25px;',
          });
        } else {
          containerId = 'pmx-subscription-bottom-sdk-slot';
          instance = PMdropin.create('googlepay', {
            ...commonConfig,
            payButtonConfig: { buttonRadius: '25', buttonColor: 'black', width: '100%', height: '50px' },
          });
        }

        const container = document.getElementById(containerId);
        if (!container) {
          attempts += 1;
          setSdkStatus('loading');
          if (attempts > 30) {
            setSdkStatus('missing');
            return;
          }
          window.setTimeout(mountComponent, 100);
          return;
        }
        container.innerHTML = '';

        instanceRef.current = instance;
        mountedKeyRef.current = currentMethod;
        setSdkStatus('loading');
        setIsFormValid(currentMethod !== 'card');
        instance.mount(`#${containerId}`);

        if (typeof instance.on === 'function') {
          instance.on('ready', () => setSdkStatus('ready'));
          instance.on('load', (res: any) => {
            if (res?.code === 'SUCCESS') setSdkStatus('ready');
          });
          if (currentMethod === 'card') {
            instance.on('form-check', (res: any) => setIsFormValid(Boolean(res?.isFormValid)));
          } else {
            instance.on('payButtonClick', () => { void handleTokenGen(instance); });
          }
        }
      } catch (error) {
        console.error(error);
        setSdkStatus('missing');
      }
    };

    mountComponent();

    return () => {
      cancelled = true;
    };
  }, [componentSessionData, currentMethod]);

  const copyToken = async () => {
    if (!componentPaymentToken) return;
    await navigator.clipboard.writeText(componentPaymentToken);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  const handleSelect = (method: Exclude<PaymentMethod, 'apm'>) => {
    if (currentMethod === method) return;
    mountedKeyRef.current = null;
    setSdkStatus('idle');
    setComponentActivationResult(null);
    setPaymentMethod(method);
  };

  const handleTokenGen = async (activeInstance?: any): Promise<string | null> => {
    const targetInstance = activeInstance || instanceRef.current;
    if (!targetInstance) {
      showUiWarning(t('subscription.toast.componentMissing').replace('{method}', currentMethod));
      return null;
    }
    if (primaryInFlightRef.current) {
      showUiWarning(t('subscription.toast.tokenBusy').replace('{method}', currentMethod.toUpperCase()));
      return null;
    }
    primaryInFlightRef.current = true;
    setIsTokenizing(true);
    try {
      // Follow the official PayerMax dropin flow:
      // 1. Disable the component before canMakePayment
      targetInstance.emit('setDisabled', true);

      // 2. Call canMakePayment to verify and get paymentToken.
      // Subscription MIT components should receive the same plan metadata for
      // CARD, APPLEPAY and GOOGLEPAY so the SDK can tokenize for recurring use.
      const canMakePaymentArgs = buildMitCanMakePaymentArgs();
      console.log('[Subscription Component] canMakePayment request', currentMethod, canMakePaymentArgs);
      const response: any = await withTimeout(
        Promise.resolve(targetInstance.emit('canMakePayment', canMakePaymentArgs)),
        15000,
        t('subscription.toast.canMakePaymentTimeout').replace('{method}', currentMethod.toUpperCase())
      );
      console.log('[Subscription Component] canMakePayment response', currentMethod, response);

      if (response?.code === 'APPLY_SUCCESS' && response?.data?.paymentToken) {
        // 3. For Apple Pay: notify SDK of payment success (dismisses the Apple Pay sheet)
        if (currentMethod === 'applepay') {
          targetInstance.emit('paySuccess');
        }
        targetInstance.emit('setDisabled', false);
        generateComponentToken(response.data.paymentToken);
        return response.data.paymentToken;
      }

      // Payment failed or cancelled
      if (currentMethod === 'applepay') {
        targetInstance.emit('payFail');
      }
      targetInstance.emit('setDisabled', false);
      showUiError(t('subscription.error.tokenFailed')
        .replace('{method}', currentMethod.toUpperCase())
        .replace('{reason}', response?.msg || response?.message || response?.code || JSON.stringify(response)));
      return null;
    } catch (error) {
      console.error('canMakePayment failed:', error);
      // Ensure component is re-enabled on error
      try {
        if (currentMethod === 'applepay') {
          targetInstance.emit('payFail');
        }
        targetInstance.emit('setDisabled', false);
      } catch { /* ignore */ }
      showUiError(t('subscription.error.tokenException')
        .replace('{method}', currentMethod.toUpperCase())
        .replace('{reason}', getErrorMessage(error, 'UNKNOWN_ERROR')));
      return null;
    } finally {
      setIsTokenizing(false);
      primaryInFlightRef.current = false;
    }
  };

  const handlePrimary = async (activeInstance?: any) => {
    if (isApiCalling || isTokenizing) {
      return;
    }

    if (!hasSession) {
      return;
    }

    if (subMode === 'payermax' && componentActivationResult) {
      await completeActivationWithQuery({
        source: 'COMPONENT_TOKEN_ACTIVATION',
        paymentToken: componentPaymentToken,
        orderAndPayStatus: componentActivationResult?.data?.status,
        orderAndPayCode: componentActivationResult?.code,
      });
      return;
    }

    let resolvedToken = componentPaymentToken;

    if (!resolvedToken) {
      if (sdkStatus === 'missing') {
        resolvedToken = `CPT_SUB_DEMO_${Date.now()}`;
        generateComponentToken(resolvedToken);
      } else {
        resolvedToken = await handleTokenGen(activeInstance);
      }

      if (!resolvedToken) {
        return;
      }

      if (subMode !== 'payermax') {
        return;
      }
    }

    if (subMode !== 'payermax') {
      const orderStepId = subMode === 'nonperiodic' ? 'np-order' : 'm-order';
      const result = await bindMandatePaymentMethod(currentMethod, orderStepId);
      if (result?.code === 'APPLY_SUCCESS' || result?.code === 'PAY_SUCCESS' || result?.code === 'SUCCESS' || result?.data?.redirectUrl) {
        goNext();
      } else {
        showUiError(t('subscription.error.firstBindFailed').replace('{reason}', result?.msg || result?.message || result?.code || 'UNKNOWN_ERROR'));
      }
      return;
    }

    const result = await activateComponentSubscription(resolvedToken);

    if (subMode === 'payermax' && currentStep.id === 'pm-2') {
      setComponentActivationResult(result);
      goNext();
      return;
    }

    if (result.code === 'APPLY_SUCCESS' || result.code === 'PAY_SUCCESS') {
      if (subMode === 'payermax') {
        setComponentActivationResult(result);
      } else {
        goNext();
      }
    } else {
      showUiError(t('subscription.error.activateFailed') + `: ${result.msg || result.message || result.code || 'UNKNOWN_ERROR'}`);
    }
  };

  const canAuthorize = currentMethod === 'card'
    ? sdkStatus === 'missing' || (sdkStatus === 'ready' && isFormValid)
    : sdkStatus === 'ready' || sdkStatus === 'missing';

  return (
    <div className="flex flex-col h-full bg-[#f8f9fb] font-sans relative">
      <div className="bg-white px-5 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md shadow-indigo-100">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="block text-[14px] font-bold text-slate-900 tracking-tight">Subscription Checkout</span>
            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">{t('subscription.component.hosted')}</span>
          </div>
        </div>
        <div className="text-right">
          <span className="block text-[10px] font-bold text-slate-400 uppercase">{displayCurrency}</span>
          <span className="block text-[16px] font-black text-slate-900">{amountText}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {subMode === 'payermax' && !isEmbeddedInPlanStep && (
        <div className="px-5 pt-4">
          <div className="rounded-2xl bg-slate-900 text-white p-3 shadow-lg shadow-slate-200">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('subscription.component.managedPlan')}</p>
                <p className="mt-1 text-[12px] font-black truncate">{subscriptionNo || t('subscription.component.planCreated')}</p>
              </div>
              <span className="shrink-0 rounded-full bg-white/10 px-2 py-1 text-[10px] font-black uppercase">
                {currentMethod}
              </span>
            </div>
            <p className="mt-2 text-[10px] font-semibold text-slate-300 leading-relaxed">
              {t('subscription.component.planHint')}
            </p>
          </div>
        </div>
        )}

        <p className="px-5 pt-5 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('subscription.component.selectMethod')}</p>

        <div className="px-4 space-y-2">
          {methods.map((method) => {
            const isSelected = currentMethod === method.id;
            return (
              <div key={method.id} className="group">
                <button
                  type="button"
                  onClick={() => handleSelect(method.id)}
                  className={cn(
                    'w-full px-4 py-3 bg-white rounded-2xl border transition-all flex items-center justify-between',
                    isSelected ? 'border-indigo-600 bg-white ring-1 ring-indigo-600' : 'border-slate-100 hover:border-slate-200'
                  )}
                >
                  <div className="flex items-center gap-3.5">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm', method.bg)}>
                      {method.icon}
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-[13px] text-slate-800 leading-tight">{method.label}</p>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">{method.sub}</p>
                    </div>
                  </div>
                  <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all', isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-200')}>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                  </div>
                </button>

                {method.id === 'card' && isSelected && (
                  <div className="mt-2 mb-4 animate-in slide-in-from-top-2 duration-300">
                    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                      {!hasSession ? (
                        <div className="min-h-[120px] flex items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
                          <p className="text-[10px] font-bold text-slate-400">{t('subscription.component.sessionPreparing')}</p>
                        </div>
                      ) : (
                        <div id="pmx-subscription-card-container" className="min-h-[120px]">
                          {sdkStatus === 'loading' && (
                            <div className="flex items-center justify-center py-10">
                              <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
                            </div>
                          )}
                        </div>
                      )}
                      <p className="mt-3 text-[10px] font-semibold text-slate-400 leading-relaxed">
                        {t('subscription.component.cardHint')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {hasSession && currentMethod !== 'card' && !hasToken && (
          <div className="mx-4 mt-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm animate-in slide-in-from-bottom-2 duration-300">
            <div className="min-h-[58px] flex items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 text-center">
              {sdkStatus === 'loading' ? (
                <div className="flex items-center gap-2 text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-[10px] font-bold">{t('subscription.component.walletPreparing')}</span>
                </div>
              ) : (
                <p className="text-[10px] font-semibold text-slate-400 leading-relaxed">
                  {t('subscription.component.methodReady').replace('{method}', currentMethodLabel)}
                </p>
              )}
            </div>
          </div>
        )}

        {!hasSession && (
          <div className="mx-4 mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-3 flex gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-[10px] font-semibold text-blue-800 leading-relaxed">
              {t('subscription.component.waitSession')}
            </p>
          </div>
        )}

        {hasSession && sdkStatus === 'missing' && !hasToken && (
          <div className="mx-4 mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 flex gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[10px] font-semibold text-amber-800 leading-relaxed">
              {t('subscription.component.sdkMissing')}
            </p>
          </div>
        )}

        {hasToken && (
          <div className="mx-4 mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-left shadow-sm animate-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-700">paymentToken</span>
              <button type="button" onClick={copyToken} className="h-7 px-2 rounded-lg bg-slate-900 text-white text-[10px] font-bold flex items-center gap-1 active:scale-95 transition-transform">
                <Copy className="w-3 h-3" />
                {copied ? t('subscription.component.copied') : t('subscription.component.copy')}
              </button>
            </div>
            <div className="text-[10px] font-mono text-slate-700 break-all leading-relaxed rounded-xl border border-emerald-100 bg-white px-3 py-2">
              {componentPaymentToken}
            </div>
            <p className="mt-2 text-[10px] font-semibold leading-relaxed text-emerald-800/80">
              {t('subscription.component.tokenUsage')}
            </p>
          </div>
        )}

      </div>

      {(subMode === 'payermax' || subMode === 'merchant' || subMode === 'nonperiodic') && (
        <div className="p-4 bg-white border-t border-slate-100 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] z-40">
          {hasToken && subMode === 'payermax' && currentStep.id === 'pm-2' ? (
            <button
              type="button"
              onClick={() => { void handlePrimary(); }}
              disabled={isApiCalling}
              className="w-full h-12 font-bold rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-50 active:scale-95 transition-all flex items-center justify-center gap-2 text-[13px] uppercase tracking-wider disabled:opacity-50"
            >
              <ArrowRight className="w-4 h-4" />
              <span>{t('subscription.component.submitToken')}</span>
            </button>
          ) : componentActivationResult && subMode === 'payermax' ? (
            <button
              type="button"
              onClick={() => { void handlePrimary(); }}
              disabled={isApiCalling}
              className="w-full h-12 font-bold rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-50 active:scale-95 transition-all flex items-center justify-center gap-2 text-[13px] uppercase tracking-wider disabled:opacity-50"
            >
              {isApiCalling ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{t('subscription.component.queryStatus')}</span>
            </button>
          ) : hasToken && subMode !== 'payermax' ? (
            <button
              type="button"
              onClick={() => { void handlePrimary(); }}
              disabled={isApiCalling}
              className="w-full h-12 font-bold rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-50 active:scale-95 transition-all flex items-center justify-center gap-2 text-[13px] uppercase tracking-wider disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{t('subscription.component.submitTokenOrder')}</span>
            </button>
          ) : (
            <div className="relative min-h-[50px]">
              {currentMethod === 'applepay' && sdkStatus === 'unsupported' && (
                <div className="flex flex-col items-center justify-center gap-1.5 animate-in fade-in duration-500">
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-[12px] font-bold">{t('subscription.component.deviceUnsupported')}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">{t('subscription.component.applePayHint')}</p>
                </div>
              )}

              <div className={cn(currentMethod === 'card' ? 'block' : 'hidden')}>
                <button
                  type="button"
                  onClick={() => { void handlePrimary(); }}
                  disabled={!hasSession || isApiCalling || isTokenizing || !canAuthorize}
                  className={cn(
                    'w-full h-12 font-bold rounded-full text-white shadow-lg flex items-center justify-center gap-2 text-[13px] uppercase tracking-wider transition-all disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed',
                    canAuthorize ? 'bg-indigo-600 shadow-indigo-100 active:scale-95' : 'bg-slate-100 text-slate-300'
                  )}
                >
                  {(isApiCalling || isTokenizing) ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>
                      <span>{subMode === 'payermax' && currentStep.id === 'pm-2' ? t('subscription.component.tokenizeOrder') : subMode === 'payermax' ? t('subscription.component.confirmActivate') : t('subscription.component.confirmAuth')}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>

              <div
                id="pmx-subscription-bottom-sdk-slot"
                className={cn(
                  currentMethod !== 'card' && sdkStatus !== 'unsupported' ? 'block' : 'hidden',
                  'w-full h-12'
                )}
              />

              {!hasSession && (
                <div className="w-full h-12 border-2 border-dashed border-slate-100 rounded-full flex items-center justify-center bg-slate-50/30">
                  <p className="text-[11px] font-bold text-slate-300 uppercase">Preparing Component Session</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
