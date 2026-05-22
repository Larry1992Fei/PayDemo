import React from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { getMandateAmounts, PAYMENT_METHOD_CONFIG } from '@/types/subscription';
import { AlertCircle, ArrowRight, CheckCircle2, CreditCard, Loader2, Server } from 'lucide-react';
import { OrderResultPanel } from '@/components/shared/OrderResultPanel';

export const StepMandateOrder: React.FC = () => {
  const {
    subMode,
    currentStep,
    integrationMode,
    paymentMethod,
    formParams,
    componentPaymentToken,
    componentSessionData,
    activationRedirectUrl,
    isApiCalling,
    lastApiResponse,
    lastApiEndpoint,
    lastApiStepId,
    bindMandatePaymentMethod,
    completeActivationWithQuery,
  } = useSubscription();

  const amounts = getMandateAmounts(subMode, formParams, paymentMethod);
  const status = getOrderStatus(lastApiResponse);
  const code = String(lastApiResponse?.code || '').toUpperCase();
  const requestUrl = lastApiResponse?.debug?.requestToPayerMax?.url || lastApiEndpoint?.url || '';
  const isCurrentOrderExchange = lastApiStepId === currentStep.id && String(requestUrl).includes('orderAndPay');
  const hasOrderResponse = isCurrentOrderExchange && Boolean(lastApiResponse?.data?.outTradeNo || lastApiResponse?.data?.tradeToken || status || code);
  const isComponent = integrationMode === 'component';
  const methodLabel = paymentMethod ? PAYMENT_METHOD_CONFIG[paymentMethod].label : 'PayerMax Hosted Checkout';
  const canSubmit = !isApiCalling && (!isComponent || Boolean(componentPaymentToken && componentSessionData?.sessionKey));
  const callbackHandledRef = React.useRef(false);
  const [mockReturnUrl, setMockReturnUrl] = React.useState<string | null>(null);
  const callbackPath = `${window.location.origin}${import.meta.env.BASE_URL}callback`;
  const shouldDisplayRedirectUrl = Boolean(
    activationRedirectUrl
      && (
        integrationMode !== 'api'
        || (subMode === 'merchant' && integrationMode === 'api' && currentStep.id === 'm-order')
        || (subMode === 'nonperiodic' && integrationMode === 'api' && currentStep.id === 'np-order')
      )
  );

  const handleOrder = async () => {
    await bindMandatePaymentMethod(paymentMethod, currentStep.id);
  };

  const handleQuery = async () => {
    await completeActivationWithQuery({
      source: 'MANDATE_ORDER_CONFIRMED',
      orderAndPayStatus: status || code || 'UNKNOWN',
      orderAndPayCode: code,
      redirectUrl: activationRedirectUrl,
    });
  };

  const handleIframeLoad = (event: React.SyntheticEvent<HTMLIFrameElement>) => {
    try {
      const iframeUrl = event.currentTarget.contentWindow?.location.href || '';
      if (!callbackHandledRef.current && (iframeUrl.startsWith(callbackPath) || iframeUrl.startsWith(`${window.location.origin}/callback`))) {
        callbackHandledRef.current = true;
        setMockReturnUrl(iframeUrl);
      }
    } catch {
      // Cross-origin cashier pages cannot be inspected until they return to our callback page.
    }
  };

  if (shouldDisplayRedirectUrl && activationRedirectUrl) {
    return (
      <div className="h-[632px] min-h-[632px] bg-white flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-500">
        <BrowserBar url={mockReturnUrl || activationRedirectUrl} />
        <div className="flex-1 bg-slate-50 relative overflow-hidden">
          {mockReturnUrl ? (
            <MockReturnPage
              status={status || code || 'SUCCESS'}
              orderNo={lastApiResponse?.data?.outTradeNo || lastApiResponse?.localOrderNo || 'ORDER_RETURNED'}
              methodLabel={methodLabel}
            />
          ) : (
            <iframe
              src={activationRedirectUrl}
              onLoad={handleIframeLoad}
              className="w-full h-full border-none"
              title="PayerMax Mandate Binding"
              allow="payment"
              sandbox="allow-scripts allow-popups allow-same-origin allow-top-navigation"
            />
          )}
        </div>
        <div className="p-3 bg-white border-t border-slate-100">
          <button
            type="button"
            onClick={() => { void handleQuery(); }}
            disabled={isApiCalling}
            className="w-full h-11 rounded-2xl bg-blue-600 text-white font-black flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-60"
          >
            {isApiCalling ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            授权完成后，查询绑定结果
          </button>
        </div>
      </div>
    );
  }

  if (hasOrderResponse) {
    return (
      <OrderResultPanel
        paymentMethod={methodLabel}
        status={status || code || 'UNKNOWN'}
        desc={integrationMode === 'api'
          ? '前端 JS 已使用 Direct_Payment 调用 PayerMax。左侧展示本次 orderAndPay 的真实请求和响应。'
          : '前端 JS 已使用 paymentToken 调用 PayerMax。左侧展示本次 orderAndPay 的真实请求和响应。'}
        onAction={() => { void handleQuery(); }}
        disabled={isApiCalling}
      />
    );
  }

  return (
    <div className="h-full bg-slate-50 flex flex-col px-5 py-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
          <Server className="w-6 h-6" />
        </div>
        <h3 className="text-base font-black text-slate-900">首次绑定下单</h3>
        <p className="text-xs text-slate-500 leading-relaxed mt-2">
          前端 JS 将使用上一阶段收集的支付要素调用 orderAndPay。左侧代码块会展示真实请求和 PayerMax 响应。
        </p>

        <div className="mt-4 grid grid-cols-1 gap-2">
          <Info label="integration" value={integrationMode} />
          <Info label="paymentMethodType" value={methodLabel} />
          <Info label="mitType" value={amounts.mitType} />
          <Info label="amount" value={`${amounts.currency} ${amounts.firstBindAmount}`} />
          {isComponent && <Info label="paymentToken" value={componentPaymentToken || 'WAITING'} />}
          {isComponent && <Info label="sessionKey" value={componentSessionData?.sessionKey || 'WAITING'} />}
        </div>
      </div>

      {isComponent && !canSubmit && (
        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 flex gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[10px] font-semibold text-amber-800 leading-relaxed">
            请先在上一步完成前置组件授权，获取 paymentToken 与 sessionKey。
          </p>
        </div>
      )}

      <div className="mt-auto pt-4">
        <button
          type="button"
          onClick={() => { void handleOrder(); }}
          disabled={!canSubmit}
          className="w-full h-12 bg-emerald-600 text-white rounded-2xl font-black flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isApiCalling ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
          调用 orderAndPay 首次绑定
        </button>
      </div>
    </div>
  );
};

const Info: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</div>
    <div className="text-[10px] font-mono font-bold text-slate-700 truncate mt-1">{value}</div>
  </div>
);

const BrowserBar: React.FC<{ url: string }> = ({ url }) => (
  <div className="h-10 bg-slate-50 flex items-center px-4 gap-2 border-b border-slate-100 flex-none">
    <div className="flex gap-1">
      {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-200" />)}
    </div>
    <div className="flex-1 bg-white h-6 rounded-md border border-slate-100 flex items-center px-3 text-[9px] text-slate-400 truncate">
      <span className="text-emerald-500 mr-1 font-bold">https://</span>
      {url.split('//')[1] || url}
    </div>
  </div>
);

const MockReturnPage: React.FC<{ status: string; orderNo: string; methodLabel: string }> = ({ status, orderNo, methodLabel }) => (
  <div className="h-full bg-white flex flex-col items-center justify-center px-6 text-center">
    <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-5">
      <CheckCircle2 className="w-8 h-8" />
    </div>
    <h3 className="text-lg font-black text-slate-900">Returned to merchant</h3>
    <p className="mt-2 text-xs font-semibold text-slate-500 leading-relaxed">
      The browser has reached frontCallbackUrl. This demo keeps the user in the simulator and lets you query the real binding result next.
    </p>
    <div className="mt-5 w-full rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left space-y-3">
      <Info label="callback status" value={status || 'SUCCESS'} />
      <Info label="payment method" value={methodLabel} />
      <Info label="outTradeNo" value={orderNo} />
    </div>
  </div>
);

function getOrderStatus(result: any): string | null {
  return result?.data?.status
    || result?.debug?.responseFromPayerMax?.data?.status
    || result?.status
    || null;
}
