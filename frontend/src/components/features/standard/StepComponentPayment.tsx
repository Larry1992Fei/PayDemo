import React from 'react';
import { useProduct } from '@/contexts/ProductContext';
import { ShieldCheck, Lock, Cpu, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { isCallbackUrl } from '@/lib/callbackReturn';
import { MockReturnPage } from '@/components/shared/MockReturnPage';

export const StepComponentPayment: React.FC = () => {
  const { submitComponentOrder, toNextStep, isApiCalling, lastApiResponse, redirectUrl, paymentMethod } = useProduct();
  const [hasSubmitted, setHasSubmitted] = React.useState(false);
  const [returnSignal, setReturnSignal] = React.useState<null | 'callback' | 'fallback'>(null);
  const iframeLoadCountRef = React.useRef(0);
  const returnHandledRef = React.useRef(false);
  const hasOrderResponse = Boolean(
    lastApiResponse?.debug?.requestToPayerMax?.url?.includes('orderAndPay') ||
    lastApiResponse?.data?.outTradeNo ||
    lastApiResponse?.localOrderNo
  );
  const displaySubmitted = hasSubmitted || hasOrderResponse;
  const status = lastApiResponse?.data?.status || lastApiResponse?.data?.payStatus || lastApiResponse?.code;

  const handleSubmit = async () => {
    const result = await submitComponentOrder('s3');
    if (result) setHasSubmitted(true);
  };

  React.useEffect(() => {
    iframeLoadCountRef.current = 0;
    returnHandledRef.current = false;
    setReturnSignal(null);
  }, [redirectUrl]);

  const markReturn = React.useCallback((signal: 'callback' | 'fallback') => {
    if (returnHandledRef.current) return;
    returnHandledRef.current = true;
    setReturnSignal(signal);
    setHasSubmitted(true);
  }, []);

  const handleIframeLoad = (event: React.SyntheticEvent<HTMLIFrameElement>) => {
    try {
      const iframeUrl = event.currentTarget.contentWindow?.location.href || '';
      if (iframeUrl && isCallbackUrl(iframeUrl)) {
        markReturn('callback');
        return;
      }
    } catch {
      // Cross-origin payment pages cannot be inspected until they return to our callback page.
    }

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
        businessLabel="STANDARD_COMPONENT_PAYMENT"
        fallback={returnSignal === 'fallback'}
        actionLabel="Check payment result"
        onAction={() => { void toNextStep(); }}
      />
    );
  }

  if (redirectUrl) {
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
            title="PayerMax Component Payment"
            allow="payment"
            sandbox="allow-scripts allow-popups allow-same-origin allow-top-navigation allow-forms"
          />
        </div>
        <div className="p-3 bg-white border-t border-slate-100">
          <button
            onClick={() => markReturn('fallback')}
            className="w-full h-11 rounded-xl bg-indigo-600 text-white text-sm font-extrabold flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            完成页面支付，查看支付结果
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white animate-in fade-in duration-500 font-sans">
      <div className="px-5 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-indigo-600 rounded-md flex items-center justify-center shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">PayerMax System</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">
            {displaySubmitted ? 'ORDER READY' : 'TOKEN READY'}
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col px-8 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-50 rounded-full blur-[80px] opacity-50" />

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center py-6 pb-24">
          <div className="relative w-20 h-20 mb-5">
            <div className="absolute inset-0 border-4 border-indigo-50 rounded-full" />
            {isApiCalling ? (
              <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin" />
            ) : null}
            <div className="absolute inset-0 flex items-center justify-center">
              {displaySubmitted ? (
                <CheckCircle2 className="w-9 h-9 text-emerald-600" />
              ) : (
                <Cpu className="w-8 h-8 text-indigo-600" />
              )}
            </div>
          </div>

          <h2 className="text-[17px] font-black text-slate-900 mb-2 tracking-tight">
            {displaySubmitted ? 'orderAndPay 已返回' : '准备调用 orderAndPay'}
          </h2>

          <div className="space-y-3 w-full">
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed max-w-[250px] mx-auto">
              将第二步获取到的 paymentToken 和 sessionKey 用于前端 JS 直连 PayerMax orderAndPay 完成下单支付。
            </p>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100/50 text-left space-y-2 w-full">
              <Info label="支付方式" value={paymentMethod.toUpperCase()} />
              <Info label="接口" value="/api/orderAndPay" />
              <Info label="返回状态" value={status || (displaySubmitted ? 'PENDING' : 'WAITING')} />
            </div>
          </div>
        </div>

        <div className="absolute bottom-4 left-0 right-0 px-8 z-20">
          {displaySubmitted ? (
            <button
              onClick={() => toNextStep()}
              className="w-full h-11 rounded-2xl bg-indigo-600 text-white text-sm font-extrabold flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-indigo-600/20"
            >
              查看支付结果
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isApiCalling}
              className="w-full h-11 rounded-2xl bg-indigo-600 text-white text-sm font-extrabold flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-60 shadow-lg shadow-indigo-600/20"
            >
              {isApiCalling ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              调用 orderAndPay
            </button>
          )}
        </div>
      </div>

      <div className="p-6 flex flex-col items-center gap-2 border-t border-slate-50 opacity-50">
        <div className="flex items-center gap-1.5">
          <Lock className="w-3 h-3 text-slate-400" />
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Bank-Grade Encryption</span>
        </div>
      </div>
    </div>
  );
};

const Info: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between gap-4">
    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
    <span className="text-xs font-black text-slate-800 truncate">{value}</span>
  </div>
);
