import React from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { AlertCircle, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { postPayerMaxDemoApi } from '@/services/payermaxClient';
import { OrderResultPanel } from '@/components/shared/OrderResultPanel';

type ActivationState = 'idle' | 'queryable' | 'failed';

export const StepActivate: React.FC = () => {
  const {
    activationRedirectUrl,
    isApiCalling,
    lastApiResponse,
    currentStep,
    componentPaymentToken,
    componentSessionData,
    activateComponentSubscription,
    completeActivationWithQuery,
    subscriptionNo,
    subMode,
    integrationMode,
    paymentMethod,
  } = useSubscription();

  const [isQuerying, setIsQuerying] = React.useState(false);
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const autoQueryRef = React.useRef(false);
  const iframeReturnHandledRef = React.useRef(false);

  const isComponentOrderStep = currentStep.id === 'pm-component';
  const orderStatus = getOrderStatus(lastApiResponse);
  const orderCode = String(lastApiResponse?.code || '').toUpperCase();
  const state = getActivationState(lastApiResponse);
  const shouldWaitForCallbackOnly = subMode === 'payermax'
    && integrationMode === 'cashier'
    && currentStep.id === 'pm-activate';
  const hasOrderResponse = Boolean(
    lastApiResponse?.data?.outTradeNo ||
      lastApiResponse?.data?.tradeToken ||
      orderStatus ||
      orderCode,
  );

  const completeActivation = React.useCallback(async (source: string, payload: Record<string, unknown> = {}) => {
    const status = getOrderStatus(lastApiResponse);
    setIsQuerying(true);
    try {
      await completeActivationWithQuery({
        outTradeNo: lastApiResponse?.data?.outTradeNo || lastApiResponse?.localOrderNo,
        tradeToken: lastApiResponse?.data?.tradeToken,
        payStatus: status || payload.payStatus || 'UNKNOWN',
        orderAndPayStatus: status || 'UNKNOWN',
        orderAndPayCode: lastApiResponse?.code,
        orderAndPayMsg: lastApiResponse?.msg || lastApiResponse?.message,
        redirectUrl: activationRedirectUrl,
        source,
        ...payload,
      });
    } catch (error) {
      setIsQuerying(false);
      throw error;
    }
  }, [activationRedirectUrl, completeActivationWithQuery, lastApiResponse]);

  React.useEffect(() => {
    if (currentStep.id === 'pm-activate' || currentStep.id === 'pm-component') return;
    if (activationRedirectUrl || !hasOrderResponse || state !== 'queryable' || autoQueryRef.current) return;

    autoQueryRef.current = true;
    void completeActivation(`ORDER_AND_PAY_STATUS_${String(orderStatus || orderCode || 'UNKNOWN').toUpperCase()}`, {
      note: 'orderAndPay returned a status without redirectUrl; query subscription status directly.',
      status: orderStatus,
    });
  }, [activationRedirectUrl, completeActivation, currentStep.id, hasOrderResponse, isComponentOrderStep, orderCode, orderStatus, state]);

  React.useEffect(() => {
    if (!activationRedirectUrl) return;

    const handleMessage = (event: MessageEvent) => {
      if (!event.origin.includes('payermax.com')) return;

      const data = typeof event.data === 'object' && event.data ? event.data : {};
      const status = (data as any).payStatus || (data as any).status || (data as any).resultStatus;
      if (status) {
        void completeActivation('PAYERMAX_POST_MESSAGE', data as Record<string, unknown>);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [activationRedirectUrl, completeActivation, isComponentOrderStep]);

  // Stabilization-based iframe detection + delayed limited polling.
  // 1. Track iframe loads — after 3 seconds of no new loads, mark as "stable"
  // 2. If onLoad fires AFTER stable → user interacted → overlay + single query
  // 3. If PNA blocks and onLoad never fires → limited polling kicks in after stable
  const iframeStableRef = React.useRef(false);
  const stabilityTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = React.useRef(0);
  const MAX_POLL_ATTEMPTS = 20;
  const POLL_INTERVAL_MS = 5000;

  // Terminal subscription statuses (INACTIVE = still waiting, keep checking)
  const TERMINAL_STATUSES = React.useMemo(() => new Set([
    'EXPIRED', 'ACTIVE_FAILED', 'ACTIVE', 'FINISH', 'CANCEL',
  ]), []);

  // Start limited polling after iframe stabilizes
  const startLimitedPolling = React.useCallback(() => {
    if (pollingIntervalRef.current || iframeReturnHandledRef.current) return;

    const doPoll = async () => {
      if (iframeReturnHandledRef.current) {
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        return;
      }
      pollCountRef.current += 1;
      if (pollCountRef.current > MAX_POLL_ATTEMPTS) {
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        return;
      }
      try {
        if (!subscriptionNo) return;
        const result = await postPayerMaxDemoApi('/api/subscriptionQuery', { subscriptionNo });
        const status = result?.data?.subscriptionPlan?.subscriptionStatus || result?.data?.status;

        if (status && TERMINAL_STATUSES.has(status.toUpperCase())) {
          iframeReturnHandledRef.current = true;
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
          // Show overlay FIRST, then delay the jump so user sees the overlay
          setIsTransitioning(true);
          setTimeout(() => {
            void completeActivation('DEFERRED_POLL_FINAL_STATE', {
              note: 'Limited polling detected terminal status after iframe stabilized.',
              status,
            });
          }, 800);
        }
      } catch {
        // ignore
      }
    };

    // First poll immediately, then every POLL_INTERVAL_MS
    void doPoll();
    pollingIntervalRef.current = setInterval(doPoll, POLL_INTERVAL_MS);
  }, [subscriptionNo, TERMINAL_STATUSES, completeActivation]);

  // Cleanup polling on unmount
  React.useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      if (stabilityTimerRef.current) clearTimeout(stabilityTimerRef.current);
    };
  }, []);

  const handleIframeLoad = React.useCallback((event: React.SyntheticEvent<HTMLIFrameElement>) => {
    if (!activationRedirectUrl || iframeReturnHandledRef.current) return;

    // Always try to read the URL first (works when redirect to our origin succeeds)
    try {
      const iframeUrl = event.currentTarget.contentWindow?.location.href || '';
      if (iframeUrl && iframeUrl.startsWith(window.location.origin)) {
        iframeReturnHandledRef.current = true;
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        void completeActivation('IFRAME_RETURN_URL', {
          note: 'PayerMax authorization page returned to frontCallbackUrl; query subscription status.',
          returnUrl: iframeUrl,
        });
        return;
      }
    } catch {
      // Cross-origin — can't read URL
    }

    if (shouldWaitForCallbackOnly) {
      return;
    }

    if (iframeStableRef.current) {
      // Page was stable, this new load = user interacted with 3DS page
      iframeReturnHandledRef.current = true;
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      setIsTransitioning(true);
      setTimeout(() => {
        void completeActivation('IFRAME_NAVIGATION_DETECTED', {
          note: 'Detected iframe navigation after 3DS page stabilized. Querying subscription status once.',
        });
      }, 1500);
    } else {
      // Page still loading initially — reset the stabilization timer
      if (stabilityTimerRef.current) clearTimeout(stabilityTimerRef.current);
      stabilityTimerRef.current = setTimeout(() => {
        iframeStableRef.current = true;
        // Start limited polling as fallback (for PNA-blocked cases where onLoad won't fire again)
        startLimitedPolling();
      }, 3000);
    }

  }, [activationRedirectUrl, completeActivation, shouldWaitForCallbackOnly, startLimitedPolling]);

  const handleComponentOrder = async () => {
    await activateComponentSubscription(componentPaymentToken || undefined);
  };

  if (activationRedirectUrl) {
    const shouldShowQueryAction = false;
    const shouldHideQueryOverlay = shouldWaitForCallbackOnly;

    return (
      <BrowserShell
        url={activationRedirectUrl}
        action={
          shouldShowQueryAction ? (
            <button
              onClick={() => {
                void completeActivation(isComponentOrderStep ? 'COMPONENT_REDIRECT_CONFIRMED' : 'LOCAL_3DS_CONFIRMED', {
                  note: '用户完成授权/3DS 后，手动查询订阅状态。',
                });
              }}
              disabled={isApiCalling || isQuerying}
              className="w-full h-11 bg-blue-600 text-white rounded-2xl font-black flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-70"
            >
              {isApiCalling || isQuerying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  正在查询订阅状态
                </>
              ) : (
                <>
                  授权完成后，查询订阅状态
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          ) : undefined
        }
      >
        <div className="flex-1 min-h-0 bg-slate-50 relative overflow-hidden">
          <iframe
            src={activationRedirectUrl}
            className="w-full h-full border-none block"
            title="PayerMax Subscription Activation"
            allow="payment"
            onLoad={handleIframeLoad}
            sandbox="allow-scripts allow-popups allow-same-origin allow-top-navigation"
          />
          {(isQuerying || isTransitioning) && !shouldHideQueryOverlay && (
            <QueryOverlay
              title="正在查询订阅状态"
              desc="授权页面已返回，正在调用 subscriptionQuery 获取真实激活结果。"
            />
          )}
        </div>
      </BrowserShell>
    );
  }

  if (isApiCalling) {
    return (
      <LoadingPanel
        title="正在请求 orderAndPay"
        status={orderStatus || orderCode || 'TRANSMITTING'}
        desc="前端 JS 正在使用上一阶段的 sessionKey 与 paymentToken 发起订阅激活下单。"
      />
    );
  }

  if (isQuerying) {
    return (
      <LoadingPanel
        title="正在查询订阅状态"
        status={orderStatus || orderCode || 'QUERYING'}
        desc="正在调用 subscriptionQuery，并在最后一步展示真实订阅激活状态。"
      />
    );
  }

  if (isComponentOrderStep && !hasOrderResponse) {
    return (
      <div className="h-full bg-slate-50 flex flex-col px-5 py-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-black text-slate-900">准备支付下单激活订阅</h3>
          <p className="text-xs text-slate-500 leading-relaxed mt-2">
            系统将使用第二步获得的 sessionKey 与 paymentToken，由前端 JS 调用 orderAndPay 激活订阅。
          </p>

          <div className="mt-4 grid grid-cols-1 gap-2">
            <InfoPill label="sessionKey" value={componentSessionData?.sessionKey || 'READY'} />
            <InfoPill label="paymentToken" value={componentPaymentToken || 'WAITING'} />
          </div>
        </div>

        <div className="mt-auto pt-4">
          <button
            onClick={() => { void handleComponentOrder(); }}
            disabled={!componentPaymentToken || !componentSessionData?.sessionKey || isApiCalling}
            className="w-full h-12 bg-emerald-600 text-white rounded-2xl font-black flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-60 disabled:cursor-not-allowed"
          >
            调用 orderAndPay 激活订阅
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (isComponentOrderStep && hasOrderResponse) {
    return (
      <OrderResultPanel
        paymentMethod={paymentMethod || 'ALL_CASHIER'}
        status={orderStatus || orderCode || 'UNKNOWN'}
        desc="本步骤保留支付下单激活结果。点击下方按钮后，再调用 subscriptionQuery 进入最终结果页。"
        onAction={() => {
          void completeActivation('COMPONENT_ORDER_STATUS_CONFIRMED', {
            status: orderStatus,
            note: '组件模式 orderAndPay 已返回，手动查询订阅状态。',
          });
        }}
        disabled={isQuerying}
      />
    );
  }

  if (hasOrderResponse && state === 'queryable') {
    return (
      <OrderResultPanel
        paymentMethod={paymentMethod || 'ALL_CASHIER'}
        status={orderStatus || orderCode || 'UNKNOWN'}
        desc={integrationMode === 'api'
          ? '前端 JS 已使用 Direct_Payment 调用 PayerMax。左侧展示本次 orderAndPay 的真实请求和响应。'
          : '前端 JS 已使用 paymentToken 调用 PayerMax。左侧展示本次 orderAndPay 的真实请求和响应。'}
        onAction={() => {
          void completeActivation(isComponentOrderStep ? 'COMPONENT_ORDER_STATUS_CONFIRMED' : 'ORDER_AND_PAY_STATUS_CONFIRMED', {
            status: orderStatus,
            note: 'orderAndPay 已返回，用户点击后查询订阅激活结果。',
          });
        }}
        disabled={isQuerying}
      />
    );
  }

  if (state === 'failed') {
    return (
      <StatusPanel
        tone="red"
        title="激活请求未成功"
        status={orderCode || 'UNKNOWN'}
        desc="请查看左侧 orderAndPay 响应体中的错误原因。"
      />
    );
  }

  return (
    <div className="h-full bg-slate-50 flex flex-col items-center justify-center px-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
        <AlertCircle className="w-7 h-7 text-amber-600" />
      </div>
      <h3 className="text-base font-black text-slate-900">等待激活请求</h3>
      <p className="text-xs text-slate-500 leading-relaxed mt-2">
        系统会根据上一步结果调用 orderAndPay，并根据 redirectUrl 或 status 进入后续查询。
      </p>
    </div>
  );
};

const InfoPill: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</div>
    <div className="text-[10px] font-mono font-bold text-slate-700 truncate mt-1">{value}</div>
  </div>
);

const LoadingPanel: React.FC<{ title: string; status: string; desc: string }> = ({ title, status, desc }) => (
  <div className="h-full bg-slate-50 flex flex-col items-center justify-center px-8 text-center">
    <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
      <Loader2 className="w-7 h-7 text-indigo-600 animate-spin" />
    </div>
    <h3 className="text-base font-black text-slate-900">{title}</h3>
    <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] font-black text-blue-700">
      orderAndPay 状态：{status}
    </div>
    <p className="text-xs text-slate-500 leading-relaxed mt-3">{desc}</p>
  </div>
);

const StatusPanel: React.FC<{
  tone: 'blue' | 'red';
  title: string;
  status: string;
  desc: string;
  actionLabel?: string;
  onAction?: () => void;
  disabled?: boolean;
}> = ({ tone, title, status, desc, actionLabel, onAction, disabled }) => {
  const isRed = tone === 'red';
  return (
    <div className="h-full bg-slate-50 flex flex-col px-5 py-6">
      <div className={`rounded-2xl border p-5 shadow-sm ${isRed ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'}`}>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${isRed ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
          {isRed ? <AlertCircle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
        </div>
        <h3 className="text-base font-black text-slate-900">{title}</h3>
        <div className={`inline-flex mt-3 rounded-full px-3 py-1 text-[11px] font-black ${isRed ? 'bg-red-100 text-red-700' : 'bg-white/80 text-blue-700'}`}>
          {status}
        </div>
        <p className="text-xs text-slate-500 leading-relaxed mt-3">{desc}</p>
      </div>
      {actionLabel && onAction && (
        <div className="mt-auto pt-4">
          <button
            onClick={onAction}
            disabled={disabled}
            className="w-full h-12 bg-emerald-600 text-white rounded-2xl font-black flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-60"
          >
            {disabled ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {actionLabel}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

const QueryOverlay: React.FC<{ title: string; desc: string }> = ({ title, desc }) => (
  <div className="absolute inset-0 bg-white/85 backdrop-blur-[1px] flex flex-col items-center justify-center px-8 text-center">
    <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4 shadow-sm">
      <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
    </div>
    <h3 className="text-base font-black text-slate-900">{title}</h3>
    <p className="text-xs text-slate-500 leading-relaxed mt-2">{desc}</p>
  </div>
);

const BrowserShell: React.FC<{ url: string; children: React.ReactNode; action?: React.ReactNode }> = ({ url, children, action }) => (
  <div className="h-[632px] min-h-[632px] bg-white flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-500">
    <div className="h-10 bg-slate-50 flex items-center px-4 gap-2 border-b border-slate-100 flex-none">
      <div className="flex gap-1">
        {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-200" />)}
      </div>
      <div className="flex-1 bg-white h-6 rounded-md border border-slate-100 flex items-center px-3 text-[9px] text-slate-400 truncate">
        <span className="text-emerald-500 mr-1 font-bold">https://</span>
        {url.split('//')[1] || url}
      </div>
    </div>
    <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
      {children}
    </div>
    {action && (
      <div className="p-3 bg-white border-t border-slate-100 flex-none">
        {action}
      </div>
    )}
    <div className="h-8 bg-slate-50 border-t border-slate-100 flex items-center justify-around flex-none">
      <ArrowRight className="w-3 h-3 text-slate-300 rotate-180" />
      <ArrowRight className="w-3 h-3 text-slate-300" />
      <div className="w-3.5 h-3.5 rounded-sm border border-slate-300" />
    </div>
  </div>
);

function getOrderStatus(result: any): string | null {
  return result?.data?.status
    || result?.debug?.responseFromPayerMax?.data?.status
    || result?.status
    || null;
}

function getActivationState(result: any): ActivationState {
  const status = getOrderStatus(result);
  if (status) return 'queryable';

  const code = String(result?.code || '').toUpperCase();
  if (code && !['APPLY_SUCCESS', 'PAY_SUCCESS', 'SUCCESS'].includes(code)) return 'failed';

  return 'idle';
}
