import React from 'react';
import { useProduct } from '@/contexts/ProductContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2, ArrowRight, CheckCircle2, Clock3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isCallbackUrl } from '@/lib/callbackReturn';
import { MockReturnPage } from '@/components/shared/MockReturnPage';

export const StepCheckout: React.FC = () => {
  const { redirectUrl, cashierMode, integrationMode, paymentMethod, lastApiResponse, toNextStep } = useProduct();
  const { t } = useLanguage();
  const [returnSignal, setReturnSignal] = React.useState<null | 'callback' | 'postMessage' | 'fallback'>(null);
  const iframeLoadCountRef = React.useRef(0);
  const returnHandledRef = React.useRef(false);
  const isApiMode = integrationMode === 'api';
  const isCashierMode = integrationMode === 'cashier';
  const status = returnSignal
    ? 'SUCCESS'
    : (lastApiResponse?.data?.status || lastApiResponse?.data?.payStatus || lastApiResponse?.code);
  const hasOrderResponse = Boolean(lastApiResponse?.debug?.requestToPayerMax || lastApiResponse?.data || lastApiResponse?.code);

  React.useEffect(() => {
    iframeLoadCountRef.current = 0;
    returnHandledRef.current = false;
    setReturnSignal(null);
  }, [redirectUrl]);

  const markReturn = React.useCallback((signal: 'callback' | 'postMessage' | 'fallback') => {
    if (returnHandledRef.current) return;
    returnHandledRef.current = true;
    setReturnSignal(signal);
  }, []);

  React.useEffect(() => {
    if (!redirectUrl) return;
    const handleMessage = (event: MessageEvent) => {
      if (event.origin.includes('payermax.com')) {
        const data = event.data;
        if (data.payStatus === 'SUCCESS' || data.status === 'SUCCESS') {
          markReturn('postMessage');
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [redirectUrl, markReturn]);

  const handleIframeLoad = (event: React.SyntheticEvent<HTMLIFrameElement>) => {
    try {
      const iframeUrl = event.currentTarget.contentWindow?.location.href || '';
      if (iframeUrl && isCallbackUrl(iframeUrl)) {
        markReturn('callback');
        return;
      }
    } catch {
      // Cross-origin cashier pages cannot be inspected until they return to our callback page.
    }

    if (isCashierMode) {
      return;
    }

    if (!isApiMode) return;
    iframeLoadCountRef.current += 1;
    if (iframeLoadCountRef.current >= 2) {
      markReturn('fallback');
    }
  };

  if (redirectUrl && returnSignal) {
    return (
      <MockReturnPage
        status={status}
        orderNo={lastApiResponse?.data?.outTradeNo || lastApiResponse?.localOrderNo || lastApiResponse?.data?.orderNo}
        methodLabel={paymentMethod}
        businessLabel="STANDARD_PAYMENT"
        fallback={returnSignal === 'fallback'}
        actionLabel="Check payment result"
        onAction={() => { void toNextStep(); }}
      />
    );
  }

  if (redirectUrl) {
    const shouldShowManualResultButton = integrationMode !== 'cashier';
    return (
      <div className="h-full bg-white flex flex-col animate-in slide-in-from-bottom-5 duration-500">
        <div className="h-10 bg-slate-50 flex items-center px-4 gap-2 border-b border-slate-100 flex-none">
          <div className="flex gap-1">
            {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-200" />)}
          </div>
          <div className="flex-1 bg-white h-6 rounded-md border border-slate-100 flex items-center px-3 text-[9px] text-slate-400 truncate">
            <span className="text-emerald-500 mr-1 font-bold">https://</span>{redirectUrl.split('//')[1]}
          </div>
        </div>
        <div className="flex-1 bg-slate-50 relative overflow-hidden">
          <iframe
            src={redirectUrl}
            onLoad={handleIframeLoad}
            className="w-full h-full border-none"
            title="PayerMax Cashier"
            allow="payment"
            sandbox="allow-scripts allow-popups allow-same-origin allow-top-navigation allow-forms"
          />
        </div>
        <div className="h-8 bg-slate-50 border-t border-slate-100 flex items-center justify-around flex-none">
          <ArrowRight className="w-3 h-3 text-slate-300 rotate-180" />
          <ArrowRight className="w-3 h-3 text-slate-300" />
          <div className="w-3.5 h-3.5 rounded-sm border border-slate-300" />
        </div>
        {shouldShowManualResultButton && (
          <div className="p-3 bg-white border-t border-slate-100">
            <button
              onClick={() => {
                if (isApiMode) {
                  markReturn('fallback');
                  return;
                }
                markReturn('fallback');
              }}
              className="w-full h-11 rounded-xl bg-indigo-600 text-white text-sm font-extrabold flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              {isApiMode ? t('standard.checkout.3dsComplete') : t('standard.checkout.paymentComplete')}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    );
  }

  const title = isApiMode
    ? (hasOrderResponse ? t('result.orderReturned') : t('standard.checkout.requestingOrder'))
    : cashierMode === 'SPECIFIC'
      ? t('standard.checkout.orderDisplay')
      : t('standard.checkout.cashierPayment');
  const description = isApiMode
    ? t('standard.checkout.requestSent')
    : cashierMode === 'SPECIFIC'
      ? `${paymentMethod.toUpperCase()} ${t('standard.checkout.processingPayment')}`
      : t('standard.checkout.cashierLoading');

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-6">
      <div className={cn(
        "w-20 h-20 rounded-full flex items-center justify-center shadow-inner",
        hasOrderResponse ? "bg-emerald-50" : cashierMode === 'SPECIFIC' || isApiMode ? "bg-blue-50" : "bg-indigo-50"
      )}>
        {hasOrderResponse ? (
          <CheckCircle2 className="w-9 h-9 text-emerald-600" />
        ) : (
          <Loader2 className={cn("w-8 h-8 animate-spin", cashierMode === 'SPECIFIC' || isApiMode ? "text-blue-600" : "text-indigo-600")} />
        )}
      </div>

      <div>
        <h3 className="text-xl font-extrabold text-slate-800">{title}</h3>
        {description && (
          <p className="text-xs font-medium text-slate-400 mt-2 px-4 leading-relaxed">{description}</p>
        )}
      </div>

      {hasOrderResponse && (
        <div className="w-full rounded-2xl bg-slate-50 border border-slate-200 p-4 text-left space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('result.api')}</span>
            <span className="text-xs font-black text-slate-800">/api/orderAndPay</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('result.paymentMethod')}</span>
            <span className="text-xs font-black text-slate-800 uppercase">{paymentMethod}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('result.status')}</span>
            <span className="text-xs font-black text-indigo-700">{status || 'PENDING'}</span>
          </div>
        </div>
      )}

      <div className="w-full pt-8 border-t border-slate-100 mt-auto">
        <button
          onClick={() => toNextStep()}
          disabled={!hasOrderResponse}
          className="w-full h-12 rounded-2xl bg-indigo-600 text-white text-sm font-extrabold flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-60 disabled:active:scale-100"
        >
          {hasOrderResponse ? t('result.check') : t('standard.checkout.waitingResult')}
          {hasOrderResponse ? <ArrowRight className="w-4 h-4" /> : <Clock3 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
