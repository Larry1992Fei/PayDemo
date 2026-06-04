import React from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { getMandateAmounts, PAYMENT_METHOD_CONFIG } from '@/types/subscription';
import { AlertCircle, ArrowRight, CreditCard, Loader2, Server } from 'lucide-react';
import { OrderResultPanel } from '@/components/shared/OrderResultPanel';
import { isCallbackUrl } from '@/lib/callbackReturn';
import { useLanguage } from '@/contexts/LanguageContext';

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
    stepApiExchanges,
    bindMandatePaymentMethod,
    completeActivationWithQuery,
  } = useSubscription();
  const { t } = useLanguage();

  const amounts = getMandateAmounts(subMode, formParams, paymentMethod);
  const orderStepId = integrationMode === 'cashier'
    ? (subMode === 'nonperiodic' ? 'np-bind' : 'm-bind')
    : currentStep.id;
  const currentExchange = stepApiExchanges[orderStepId] || stepApiExchanges[currentStep.id];
  const cachedOrderResponse = React.useMemo(
    () => parseExchangeResponse(currentExchange?.responseBody),
    [currentExchange?.responseBody]
  );
  const currentStepResponse = lastApiStepId === orderStepId || lastApiStepId === currentStep.id ? lastApiResponse : null;
  const orderResponse = cachedOrderResponse || currentStepResponse;
  const status = getOrderStatus(orderResponse);
  const code = String(orderResponse?.code || '').toUpperCase();
  const requestUrl = currentExchange?.endpoint?.url || orderResponse?.debug?.requestToPayerMax?.url || lastApiEndpoint?.url || '';
  const isCurrentOrderExchange = Boolean(orderResponse) && String(requestUrl).includes('orderAndPay');
  const hasOrderResponse = isCurrentOrderExchange && Boolean(orderResponse?.data?.outTradeNo || orderResponse?.data?.tradeToken || status || code);
  const resultPanelDesc = '';
  const isComponent = integrationMode === 'component';
  const methodLabel = paymentMethod ? PAYMENT_METHOD_CONFIG[paymentMethod].label : 'PayerMax Hosted Checkout';
  const canSubmit = !isApiCalling && (!isComponent || Boolean(componentPaymentToken && componentSessionData?.sessionKey));
  const callbackHandledRef = React.useRef(false);
  const [mockReturnUrl, setMockReturnUrl] = React.useState<string | null>(null);
  const shouldDisplayRedirectUrl = Boolean(
    activationRedirectUrl
      && (
        integrationMode !== 'api'
        || (subMode === 'merchant' && integrationMode === 'api' && currentStep.id === 'm-order')
        || (subMode === 'nonperiodic' && integrationMode === 'api' && currentStep.id === 'np-order')
      )
  );
  const shouldHideRedirectAction = (subMode === 'merchant' || subMode === 'nonperiodic')
    && (integrationMode === 'api' || integrationMode === 'component');

  React.useEffect(() => {
    callbackHandledRef.current = false;
    setMockReturnUrl(null);
  }, [activationRedirectUrl]);

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
      if (!callbackHandledRef.current && isCallbackUrl(iframeUrl)) {
        callbackHandledRef.current = true;
        setMockReturnUrl(iframeUrl);
      }
    } catch {
      // Cross-origin cashier pages cannot be inspected until they return to our callback page.
    }
  };

  if (mockReturnUrl) {
    return (
      <OrderResultPanel
        paymentMethod={methodLabel}
        status={status || code || 'PENDING'}
        desc={resultPanelDesc}
        actionLabel={t('subscription.bind.resultAction')}
        onAction={() => { void handleQuery(); }}
        disabled={isApiCalling}
      />
    );
  }

  if (shouldDisplayRedirectUrl && activationRedirectUrl) {
    return (
      <div className="h-[632px] min-h-[632px] bg-white flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-500">
        <BrowserBar url={activationRedirectUrl} />
        <div className="flex-1 bg-slate-50 relative overflow-hidden">
          <iframe
            src={activationRedirectUrl}
            onLoad={handleIframeLoad}
            className="w-full h-full border-none"
            title="PayerMax Mandate Binding"
            allow="payment"
            sandbox="allow-scripts allow-popups allow-same-origin allow-top-navigation"
          />
        </div>
        {!shouldHideRedirectAction && (
          <div className="p-3 bg-white border-t border-slate-100">
            <button
              type="button"
              onClick={() => { void handleQuery(); }}
              disabled={isApiCalling}
              className="w-full h-11 rounded-2xl bg-blue-600 text-white font-black flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-60"
            >
              {isApiCalling ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              <span>{mockReturnUrl ? t('subscription.bind.resultAction') : t('subscription.order.queryAfterAuth')}</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  if (hasOrderResponse) {
    return (
      <OrderResultPanel
        paymentMethod={methodLabel}
        status={status || code || 'PENDING'}
        desc={resultPanelDesc}
        actionLabel={t('subscription.bind.resultAction')}
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
        <h3 className="text-base font-black text-slate-900">{t('subscription.order.firstTitle')}</h3>
        <p className="text-xs text-slate-500 leading-relaxed mt-2">
          {t('subscription.order.orderDesc')}
        </p>

        {isComponent ? (
          <div className="mt-4">
            <Info label="paymentToken" value={componentPaymentToken || 'WAITING'} />
            <p className="mt-2 text-[10px] font-semibold leading-relaxed text-slate-500">
              {t('subscription.order.tokenUsage')}
            </p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-2">
            <Info label="integration" value={integrationMode} />
            <Info label="paymentMethodType" value={methodLabel} />
            <Info label="mitType" value={amounts.mitType} />
            <Info label="amount" value={`${amounts.currency} ${amounts.firstBindAmount}`} />
          </div>
        )}
      </div>

      {isComponent && !canSubmit && (
        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 flex gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[10px] font-semibold text-amber-800 leading-relaxed">
            {t('subscription.order.needToken')}
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
          {t('subscription.order.callFirstBind')}
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

function getOrderStatus(result: any): string | null {
  return result?.data?.status
    || result?.debug?.responseFromPayerMax?.data?.status
    || result?.status
    || null;
}

function parseExchangeResponse(responseBody?: string): any | null {
  if (!responseBody) return null;
  try {
    return JSON.parse(responseBody);
  } catch {
    return null;
  }
}
