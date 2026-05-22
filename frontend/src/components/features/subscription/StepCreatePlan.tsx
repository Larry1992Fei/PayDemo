import React, { useEffect, useRef, useState } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { SUBSCRIPTION_TYPE_CONFIG } from '@/types/subscription';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { StepComponent } from './StepComponent';

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

  const [createStatus, setCreateStatus] = useState<'idle' | 'creating' | 'success' | 'error'>('idle');
  const [sessionStatus, setSessionStatus] = useState<'idle' | 'preparing' | 'success' | 'error'>('idle');
  const [activateStatus, setActivateStatus] = useState<'idle' | 'activating'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const didAutoCreate = useRef(false);

  const conf = SUBSCRIPTION_TYPE_CONFIG[subscriptionType];
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
      setErrorMessage(error instanceof Error ? error.message : '创建订阅失败');
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
      setErrorMessage(error instanceof Error ? error.message : '预取前置组件 Session 失败');
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
        throw new Error(result.msg || '激活订阅失败');
      }
      goNext();
    } catch (error) {
      setActivateStatus('idle');
      setErrorMessage(error instanceof Error ? error.message : '激活订阅失败');
      console.error('激活订阅失败：', error);
    }
  };

  return (
    <div className="space-y-4">
      {!isComponentMode && (
      <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-700">创建订阅计划</h4>
            <p className="text-[11px] text-slate-400 font-semibold mt-1">
              {isComponentMode ? 'subscriptionCreate + applySession' : 'subscriptionCreate'}
            </p>
          </div>
          <div className="px-2 py-1 bg-indigo-50 rounded-lg border border-indigo-100 text-[11px] font-black text-indigo-700">
            {conf.label}
          </div>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          {isComponentMode
            ? '系统创建订阅计划后，会自动调用 applySession 预取 CARD、APPLEPAY、GOOGLEPAY 的组件 Session。进入自建收银台后，用户只需选择支付方式并加载对应组件。'
            : '系统已根据上一页套餐参数创建订阅计划。请求和响应展示在左侧代码块，手机内仅展示业务结果。'}
        </p>
      </div>
      )}

      {createStatus === 'creating' && !isComponentMode && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 flex items-start gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-blue-800 uppercase tracking-wide">正在创建订阅计划...</div>
            <div className="text-xs text-blue-700 mt-1">正在调用 PayerMax subscriptionCreate</div>
          </div>
        </div>
      )}

      {createStatus === 'success' && subscriptionNo && !isComponentMode && (
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 flex items-start gap-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-emerald-800 uppercase tracking-wide">创建成功 — 返回订阅计划号</div>
            <div className="text-xs font-mono text-emerald-700 mt-1">
              subscriptionNo: <strong>{subscriptionNo}</strong>
            </div>
            <div className="text-xs text-emerald-600 mt-1">
              当前状态：INACTIVE，下一步需要用户完成首次授权/支付来激活。
            </div>
          </div>
        </div>
      )}

      {isComponentMode && sessionStatus === 'preparing' && !componentSessionData && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 flex items-start gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-blue-800 uppercase tracking-wide">正在预取前置组件 Session...</div>
            <div className="text-xs text-blue-700 mt-1">componentList: CARD, APPLEPAY, GOOGLEPAY</div>
          </div>
        </div>
      )}

      {isComponentMode && (sessionStatus === 'success' || componentSessionData) && false && (
        <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-4 flex items-start gap-3">
          <CheckCircle2 className="w-6 h-6 text-indigo-600 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="text-xs font-bold text-indigo-800 uppercase tracking-wide">组件 Session 已准备</div>
            <div className="text-xs text-indigo-700 mt-1">进入自建收银台后将按用户选择动态挂载组件。</div>
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
              正在请求 orderAndPay
            </span>
          ) : (
            <>
              {isComponentMode ? '进入自建收银台' : '进入激活订阅'}
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
          重新创建
        </button>
      )}

      {!isComponentMode && (
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 text-xs text-slate-500 leading-relaxed">
        API 请求和响应已同步展示在左侧代码块。手机内仅保留商户操作步骤和关键业务结果。
      </div>
      )}
    </div>
  );
};
