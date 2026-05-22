import React from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { getMandateAmounts, PAYMENT_METHOD_CONFIG, type PaymentMethod } from '@/types/subscription';
import { ArrowRight, CheckCircle2, CreditCard, Loader2, Lock, Server, ShieldCheck, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

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

const apiMethods: Array<{
  id: PaymentMethod;
  label: string;
  sub: string;
  icon: React.ReactNode;
  bg: string;
}> = [
  { id: 'card', label: 'Bank Card', sub: 'Direct API card binding', icon: <CardIcon />, bg: 'bg-indigo-600' },
  { id: 'applepay', label: 'Apple Pay', sub: 'Apple Pay payment data', icon: <Wallet className="w-5 h-5" />, bg: 'bg-black' },
  { id: 'googlepay', label: 'Google Pay', sub: 'Google Pay details', icon: <GooglePayIcon />, bg: 'bg-[#4285F4]' },
  { id: 'apm', label: 'APM', sub: 'ONE_TOUCH · KAKAOPAY', icon: <Wallet className="w-5 h-5" />, bg: 'bg-emerald-600' },
];

export const StepBind: React.FC = () => {
  const {
    subMode,
    integrationMode,
    paymentMethod,
    setPaymentMethod,
    formParams,
    mandateTokenId,
    activationRedirectUrl,
    isApiCalling,
    lastApiResponse,
    bindMandatePaymentMethod,
    goNext,
  } = useSubscription();

  const mandateAmounts = getMandateAmounts(subMode, formParams, paymentMethod);
  const mitType = mandateAmounts.mitType;
  const amount = mandateAmounts.firstBindAmount;
  const currency = mandateAmounts.currency;
  const isCashier = integrationMode === 'cashier';
  const isApi = integrationMode === 'api';
  const errorMessage = getBusinessError(lastApiResponse);

  const handlePrimary = async () => {
    if (isApi) {
      goNext();
      return;
    }

    if (mandateTokenId) {
      goNext();
      return;
    }
    const result = await bindMandatePaymentMethod(paymentMethod, subMode === 'merchant' ? 'm-bind' : 'np-bind');
    if ((result?.code === 'APPLY_SUCCESS' || result?.code === 'PAY_SUCCESS') && !result?.data?.redirectUrl) {
      goNext();
    }
  };

  if (isApi) {
    return (
      <SelfHostedApiCashier
        amount={amount}
        currency={currency}
        mitType={mitType}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        isApiCalling={isApiCalling}
        mandateTokenId={mandateTokenId}
        errorMessage={errorMessage}
        onSubmit={handlePrimary}
      />
    );
  }

  if (isCashier && activationRedirectUrl) {
    return (
      <BrowserShell url={activationRedirectUrl} onCallback={goNext} />
    );
  }

  const pmLabel = paymentMethod ? PAYMENT_METHOD_CONFIG[paymentMethod].label : 'PayerMax Hosted Checkout';
  const buttonText = mandateTokenId ? '进入完成支付绑定' : '打开绑定收银台';

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="bg-white px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-black text-slate-900">PayerMax 收银台绑定</h3>
          <p className="text-[10px] font-bold text-slate-400 mt-0.5">orderAndPay · tokenForFutureUse=true</p>
        </div>
        <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
          <ShieldCheck className="w-4 h-4" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">First Binding</p>
              <h4 className="text-sm font-black text-slate-900 mt-1">{pmLabel}</h4>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed mt-1">
                首次绑定需要用户参与授权，固定传 merchantInitiated=false，并生成后续扣款使用的 paymentTokenID。
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <Info label="mitType" value={mitType} />
            <Info label="amount" value={`${currency} ${amount}`} />
            <Info label="merchantInitiated" value="false" />
            <Info label="tokenForFutureUse" value="true" />
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold leading-relaxed text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
            <Server className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PayerMax API</p>
            <p className="text-xs font-bold text-slate-700">调用 orderAndPay 获取 redirectUrl 并打开收银台</p>
          </div>
        </div>
      </div>

      <div className="p-4 bg-white border-t border-slate-100">
        <button
          type="button"
          onClick={() => { void handlePrimary(); }}
          disabled={isApiCalling}
          className="w-full h-12 rounded-2xl bg-emerald-600 text-white font-black flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 transition-all"
        >
          {isApiCalling ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          {buttonText}
        </button>
      </div>
    </div>
  );
};

export const SelfHostedApiCashier: React.FC<{
  amount: string;
  currency: string;
  mitType: string;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (m: PaymentMethod) => void;
  isApiCalling: boolean;
  mandateTokenId: string | null;
  errorMessage?: string | null;
  onSubmit: () => Promise<void>;
}> = ({ amount, currency, mitType, paymentMethod, setPaymentMethod, isApiCalling, mandateTokenId, errorMessage, onSubmit }) => (
  <div className="flex flex-col h-full bg-[#f8f9fb] font-sans relative">
    <div className="bg-white px-5 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md shadow-indigo-100">
          <ShieldCheck className="w-4 h-4 text-white" />
        </div>
        <div>
          <span className="block text-[14px] font-bold text-slate-900 tracking-tight">Subscription Checkout</span>
          <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Merchant API Hosted</span>
        </div>
      </div>
      <div className="text-right">
        <span className="block text-[10px] font-bold text-slate-400 uppercase">{currency}</span>
        <span className="block text-[16px] font-black text-slate-900">
          {Number(amount || 0).toFixed(currency === 'KRW' ? 0 : 2)}
        </span>
      </div>
    </div>

    <div className="flex-1 overflow-y-auto">
      <div className="px-5 pt-4">
        <div className="rounded-2xl bg-slate-900 text-white p-3 shadow-lg shadow-slate-200">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Self-hosted Binding</p>
              <p className="mt-1 text-[12px] font-black truncate">merchantInitiated=false · {mitType}</p>
            </div>
            <span className="shrink-0 rounded-full bg-white/10 px-2 py-1 text-[10px] font-black uppercase">
              {paymentMethod}
            </span>
          </div>
          <p className="mt-2 text-[10px] font-semibold text-slate-300 leading-relaxed">
            商户自建收银台选择支付方式，前端 JS 直连 orderAndPay 完成首次绑定，并返回 paymentTokenID。
          </p>
        </div>
      </div>

      <p className="px-5 pt-5 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Method</p>

      <div className="px-4 space-y-2">
        {apiMethods.map((method) => {
          const selected = paymentMethod === method.id;
          return (
            <button
              key={method.id}
              type="button"
              onClick={() => setPaymentMethod(method.id)}
              className={cn(
                'w-full px-4 py-3 bg-white rounded-2xl border transition-all flex items-center justify-between',
                selected ? 'border-indigo-600 bg-white ring-1 ring-indigo-600' : 'border-slate-100 hover:border-slate-200'
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
              <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all', selected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-200')}>
                {selected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mx-4 mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800 font-semibold leading-relaxed">
        API 模式下，商户页面负责收集支付信息或钱包授权要素，前端 JS 组装 paymentDetail 并调用 orderAndPay。
      </div>

      {mandateTokenId && (
        <div className="mx-4 mt-4 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="text-xs font-bold text-emerald-800 uppercase tracking-wide">绑定成功 · paymentTokenID</div>
            <div className="text-xs font-mono text-emerald-700 mt-1 break-all">{mandateTokenId}</div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="mx-4 mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-semibold leading-relaxed text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="mt-6 flex items-center justify-center gap-2 opacity-30 pb-6">
        <Lock className="w-3 h-3" />
        <span className="text-[9px] font-bold uppercase tracking-widest">PCI-DSS Secure</span>
      </div>
    </div>

    <div className="p-4 bg-white border-t border-slate-100 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] z-40">
      <button
        type="button"
        onClick={() => { void onSubmit(); }}
        disabled={isApiCalling}
        className="w-full h-12 font-bold rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-100 active:scale-95 disabled:opacity-60 transition-all flex items-center justify-center gap-2 text-[13px] uppercase tracking-wider"
      >
        {isApiCalling ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
        <span>{mandateTokenId ? 'Continue to Query Result' : 'Continue to orderAndPay'}</span>
      </button>
    </div>
  </div>
);

const BrowserShell: React.FC<{ url: string; action?: React.ReactNode; onCallback?: () => void }> = ({ url, action, onCallback }) => {
  const callbackHandledRef = React.useRef(false);

  const handleIframeLoad = (event: React.SyntheticEvent<HTMLIFrameElement>) => {
    try {
      const iframeUrl = event.currentTarget.contentWindow?.location.href || '';
      if (!callbackHandledRef.current && iframeUrl.startsWith(`${window.location.origin}/callback`)) {
        callbackHandledRef.current = true;
        onCallback?.();
      }
    } catch {
      // Cross-origin cashier pages cannot be inspected until they return to our callback page.
    }
  };

  return (
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
      <div className="flex-1 bg-slate-50 relative overflow-hidden">
        <iframe
          src={url}
          onLoad={handleIframeLoad}
          className="w-full h-full border-none"
          title="PayerMax Mandate Cashier"
          allow="payment"
          sandbox="allow-scripts allow-popups allow-same-origin allow-top-navigation"
        />
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
};

const Info: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</div>
    <div className="text-[12px] font-black text-slate-800 mt-1 break-all">{value}</div>
  </div>
);

export function getBusinessError(result: any): string | null {
  const code = result?.code || result?.debug?.responseFromPayerMax?.code;
  const rawMessage = result?.msg || result?.message || result?.debug?.responseFromPayerMax?.msg;
  if (!rawMessage || ['APPLY_SUCCESS', 'PAY_SUCCESS', 'SUCCESS'].includes(code)) return null;

  if (/amount/i.test(rawMessage)) {
    return `${rawMessage} 当前支付方式或渠道可能不支持该首次绑定金额。可切换“首次 >0 元绑定”，或更换支付方式后再验证。`;
  }

  return rawMessage;
}
