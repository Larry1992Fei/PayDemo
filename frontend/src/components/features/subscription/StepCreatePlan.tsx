import React, { useEffect, useRef, useState } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { StepComponent } from './StepComponent';
import { useLanguage } from '@/contexts/LanguageContext';

export const StepCreatePlan: React.FC = () => {
  const {
    subscriptionType,
    integrationMode,
    createSubscription,
    activateSubscription,
    prepareComponentSession,
    isApiCalling,
    subscriptionNo,
    componentSessionData,
    goNext,
  } = useSubscription();
  const { t } = useLanguage();

  const [createStatus, setCreateStatus] = useState<'idle' | 'creating' | 'success' | 'error'>('idle');
  const [sessionStatus, setSessionStatus] = useState<'idle' | 'preparing' | 'success' | 'error'>('idle');
  const [activateStatus, setActivateStatus] = useState<'idle' | 'activating'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const didAutoCreate = useRef(false);

  const isComponentMode = integrationMode === 'component';
  const canEnterNext = createStatus === 'success' && subscriptionNo && (!isComponentMode || sessionStatus === 'success' || componentSessionData);

  useEffect(() => {
    if (didAutoCreate.current) return;
    didAutoCreate.current = true;
    void handleCreateSubscription();
  }, []);

  const handleCreateSubscription = async () => {
    if (createStatus !== 'idle') return;

    setCreateStatus('creating');
    setSessionStatus('idle');
    setErrorMessage('');

    try {
      await createSubscription();
      setCreateStatus('success');
    } catch (error) {
      setCreateStatus('error');
      setErrorMessage(error instanceof Error ? error.message : t('subscription.create.errorCreate'));
      console.error('创建订阅失败：', error);
      return;
    }

    if (!isComponentMode) return;

    setSessionStatus('preparing');
    try {
      await prepareComponentSession('pm-2');
      setSessionStatus('success');
    } catch (error) {
      setSessionStatus('error');
      setErrorMessage(error instanceof Error ? error.message : t('subscription.create.errorSession'));
      console.error('预取前置组件 Session 失败：', error);
    }
  };

  const handleEnterActivation = async () => {
    if (!subscriptionNo || activateStatus === 'activating') return;

    if (isComponentMode) {
      goNext();
      return;
    }

    setActivateStatus('activating');
    setErrorMessage('');

    try {
      const result = await activateSubscription(undefined, 'pm-activate');
      if (result.code !== 'APPLY_SUCCESS') {
        throw new Error(result.msg || t('subscription.create.errorActivate'));
      }
      goNext();
    } catch (error) {
      setActivateStatus('idle');
      setErrorMessage(error instanceof Error ? error.message : t('subscription.create.errorActivate'));
      console.error('激活订阅失败：', error);
    }
  };

  return (
    <div className="space-y-4">
      {!isComponentMode && (
      <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-700">{t('subscription.create.title')}</h4>
            <p className="text-[11px] text-slate-400 font-semibold mt-1">
              {isComponentMode ? 'subscriptionCreate + applySession' : 'subscriptionCreate'}
            </p>
          </div>
          <div className="px-2 py-1 bg-indigo-50 rounded-lg border border-indigo-100 text-[11px] font-black text-indigo-700">
            {t(`subscription.type.${subscriptionType}.label`)}
          </div>
        </div>
      </div>
      )}

      {createStatus === 'creating' && !isComponentMode && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 flex items-start gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-blue-800 uppercase tracking-wide">{t('subscription.create.creating')}</div>
            <div className="text-xs text-blue-700 mt-1">{t('subscription.create.calling')}</div>
          </div>
        </div>
      )}

      {createStatus === 'success' && subscriptionNo && !isComponentMode && (
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 flex items-start gap-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-emerald-800 uppercase tracking-wide">{t('subscription.create.success')}</div>
            <div className="text-xs font-mono text-emerald-700 mt-1">
              subscriptionNo: <strong>{subscriptionNo}</strong>
            </div>
            <div className="text-xs text-emerald-600 mt-1">
              {t('subscription.create.inactive')}
            </div>
          </div>
        </div>
      )}

      {isComponentMode && sessionStatus === 'preparing' && !componentSessionData && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 flex items-start gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-blue-800 uppercase tracking-wide">{t('subscription.create.preparingSession')}</div>
            <div className="text-xs text-blue-700 mt-1">componentList: CARD, APPLEPAY, GOOGLEPAY</div>
          </div>
        </div>
      )}

      {isComponentMode && (sessionStatus === 'success' || componentSessionData) && false && (
        <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-4 flex items-start gap-3">
          <CheckCircle2 className="w-6 h-6 text-indigo-600 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="text-xs font-bold text-indigo-800 uppercase tracking-wide">{t('subscription.create.sessionReady')}</div>
            <div className="text-xs text-indigo-700 mt-1">{t('subscription.create.sessionReadyHint')}</div>
            <div className="text-xs font-mono text-indigo-700 mt-1 truncate">
              sessionKey: {componentSessionData?.sessionKey || '-'}
            </div>
          </div>
        </div>
      )}

      {createStatus === 'success' && subscriptionNo && !isComponentMode && (
        <button
          onClick={handleEnterActivation}
          disabled={isApiCalling || activateStatus === 'activating' || !canEnterNext}
          className="w-full bg-emerald-600 text-white py-3 px-4 rounded-lg font-bold hover:bg-emerald-700 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {activateStatus === 'activating' ? (
            <span className="inline-flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t('subscription.create.requestingOrder')}
            </span>
          ) : (
            <>
              {isComponentMode ? t('subscription.create.enterCashier') : t('subscription.create.activate')}
              <ArrowRight className="inline-block w-4 h-4 ml-1" />
            </>
          )}
        </button>
      )}

      {createStatus === 'success' && subscriptionNo && isComponentMode && (sessionStatus === 'success' || componentSessionData) && (
        <div className="-mx-1 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <StepComponent />
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-3 text-xs text-red-700 leading-relaxed">
          {errorMessage}
        </div>
      )}

      {createStatus === 'error' && (
        <button
          onClick={handleCreateSubscription}
          disabled={isApiCalling}
          className="w-full px-3 py-2 bg-red-500 text-white text-xs font-medium rounded-lg hover:bg-red-600 disabled:opacity-50"
        >
          {t('subscription.create.retry')}
        </button>
      )}

    </div>
  );
};
