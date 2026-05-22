import React, { useState, useEffect, useRef } from 'react';
import { useProduct } from '@/contexts/ProductContext';
import { Lock, CheckCircle2, ShieldCheck, Loader2, ArrowRight, Wallet, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const CardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={2}>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20" />
    <path d="M6 15h2" />
  </svg>
);

export const StepComponentCashier: React.FC = () => {
  const { 
    amount, currency, paymentMethod, setPaymentMethod, setCurrentStep,
    sessionData, applySession, paymentToken, setPaymentToken, submitComponentOrder, isApiCalling
  } = useProduct();

  const [sdkStatus, setSdkStatus] = useState<'idle' | 'loading' | 'ready'>('idle');
  const [isTokenizing, setIsTokenizing] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [unsupportedApplePay, setUnsupportedApplePay] = useState(false);
  
  const instanceRef = useRef<any>(null);
  const isInitialized = useRef<string | null>(null);

  useEffect(() => {
    if (!paymentMethod || !sessionData || isInitialized.current === paymentMethod) return;

    const initSDK = () => {
      try {
        const PMdropin = (window as any).PMdropin;
        if (!PMdropin) {
          setTimeout(initSDK, 100);
          return;
        }

        // 1. Apple Pay 环境检测
        if (paymentMethod === 'applepay') {
          if (!PMdropin.isSupportApplePay()) {
            setUnsupportedApplePay(true);
            setSdkStatus('idle');
            return;
          } else {
            setUnsupportedApplePay(false);
          }
        } else {
          setUnsupportedApplePay(false);
        }

        if (instanceRef.current) {
          instanceRef.current.unmount();
          instanceRef.current = null;
        }
        
        isInitialized.current = paymentMethod;
        setSdkStatus('loading');
        setPaymentToken('');

        let instance: any = null;
        let containerId = '';

        if (paymentMethod === 'card') {
          containerId = 'pmx-inline-card-container';
          instance = PMdropin.create('card', {
            clientKey: sessionData.clientKey,
            sessionKey: sessionData.sessionKey,
            language: "en",
            sandbox: true,
            customTheme: [{
              name: 'merchant',
              base: 'light',
              style: `:root { 
                --bg-color-input: #f9fafb; 
                --border-radius-input: 12px;
                --border-color-input: #f3f4f6;
                --height-input: 44px;
              }`
            }]
          });
        } 
        else if (paymentMethod === 'applepay' || paymentMethod === 'googlepay') {
          containerId = 'pmx-bottom-sdk-slot';
          if (paymentMethod === 'applepay') {
            instance = PMdropin.create('applepay', {
              clientKey: sessionData.clientKey,
              sessionKey: sessionData.sessionKey,
              theme: 'black',
              payButtonStyle: 'width:100%; height:50px; border-radius:25px;',
              sandbox: true
            });
          } else {
            instance = PMdropin.create('googlepay', {
              clientKey: sessionData.clientKey,
              sessionKey: sessionData.sessionKey,
              sandbox: true,
              payButtonConfig: { buttonRadius: "25", buttonColor: "black", width: "100%", height: "50px" }
            });
          }
        }

        if (instance) {
          const container = document.getElementById(containerId);
          if (container) container.innerHTML = ''; 
          instanceRef.current = instance;
          instance.mount(`#${containerId}`);

          if (typeof instance.on === 'function') {
            instance.on('ready', () => setSdkStatus('ready'));
            instance.on('load', (res: any) => { if (res.code === "SUCCESS") setSdkStatus('ready'); });
            if (paymentMethod === 'card') {
              instance.on('form-check', (res: any) => setIsFormValid(res.isFormValid));
            } else {
              instance.on('payButtonClick', () => handleTokenGen(instance));
            }
          }
        }
      } catch (err) { console.error(err); }
    };
    initSDK();
  }, [sessionData, paymentMethod]);

  const handleTokenGen = async (activeInstance?: any) => {
    const targetInstance = activeInstance || instanceRef.current;
    if (!targetInstance) return;
    setIsTokenizing(true);
    try {
      // Follow official PayerMax dropin flow: setDisabled → canMakePayment → setDisabled
      targetInstance.emit('setDisabled', true);
      const response: any = await targetInstance.emit('canMakePayment');
      if (response?.code === 'APPLY_SUCCESS' && response?.data?.paymentToken) {
        if (paymentMethod === 'applepay') targetInstance.emit('paySuccess');
        targetInstance.emit('setDisabled', false);
        setPaymentToken(response.data.paymentToken);
      } else {
        if (paymentMethod === 'applepay') targetInstance.emit('payFail');
        targetInstance.emit('setDisabled', false);
      }
    } catch (err) {
      console.error('canMakePayment failed:', err);
      try {
        if (paymentMethod === 'applepay') targetInstance.emit('payFail');
        targetInstance.emit('setDisabled', false);
      } catch { /* ignore */ }
    } finally { setIsTokenizing(false); }
  };

  const handleSelect = (id: any) => {
    if (paymentMethod === id) return;
    setPaymentMethod(id);
    if (!sessionData) applySession();
  };

  const handleSubmitTokenForOrder = async () => {
    const result = await submitComponentOrder('s3');
    if (result) {
      setCurrentStep('s3');
    }
  };

  const methods = [
    { id: 'card', label: 'Bank Card', sub: 'Visa, Master, etc.', icon: <CardIcon />, bg: 'bg-indigo-600' },
    { id: 'applepay', label: 'Apple Pay', sub: 'iPhone payment', icon: <Wallet className="w-5 h-5" />, bg: 'bg-black' },
    { id: 'googlepay', label: 'Google Pay', sub: 'Android payment', icon: <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5"><path d="M12 11.5v1.5h3.5c-.14.87-.94 2.55-3.5 2.55-2.1 0-3.82-1.74-3.82-3.88 0-2.14 1.72-3.88 3.82-3.88 1.2 0 2 .51 2.46.95l1.67-1.61C14.96 7.5 13.6 6.87 12 6.87c-3.42 0-6.2 2.76-6.2 6.13 0 3.37 2.78 6.13 6.2 6.13 3.58 0 5.95-2.51 5.95-6.05 0-.41-.04-.72-.1-1.03H12v-.55z" fill="white"/></svg>, bg: 'bg-[#4285F4]' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#f8f9fb] font-sans relative">
      {/* 极简 Header */}
      <div className="bg-white px-5 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md shadow-indigo-100">
             <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <span className="text-[14px] font-bold text-slate-900 tracking-tight">Checkout</span>
        </div>
        <div className="flex items-baseline gap-1">
           <span className="text-[10px] font-bold text-slate-400 uppercase">{currency}</span>
           <span className="text-[16px] font-black text-slate-900">{parseFloat(amount).toFixed(2)}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <p className="px-5 pt-5 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Method</p>
        
        <div className="px-4 space-y-2">
          {methods.map((m) => {
            const isSelected = paymentMethod === m.id;
            return (
              <div key={m.id} className="group">
                <button
                  onClick={() => handleSelect(m.id as any)}
                  className={cn(
                    "w-full px-4 py-3 bg-white rounded-2xl border transition-all flex items-center justify-between",
                    isSelected
                      ? "border-indigo-600 bg-white ring-1 ring-indigo-600"
                      : "border-slate-100 hover:border-slate-200"
                  )}
                >
                  <div className="flex items-center gap-3.5">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm", 
                      m.bg
                    )}>
                      {m.icon}
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-[13px] text-slate-800 leading-tight">{m.label}</p>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">{m.sub}</p>
                    </div>
                  </div>
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                    isSelected ? "border-indigo-600 bg-indigo-600" : "border-slate-200"
                  )}>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                  </div>
                </button>

                {/* CARD 区域 */}
                {m.id === 'card' && isSelected && (
                  <div className="mt-2 mb-4 animate-in slide-in-from-top-2 duration-300">
                    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                      <div id="pmx-inline-card-container" className="min-h-[120px]">
                         {sdkStatus === 'loading' && (
                           <div className="flex items-center justify-center py-10">
                              <Loader2 className="w-6 h-6 animate-spin text-slate-200" />
                           </div>
                         )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 opacity-30 pb-10">
           <Lock className="w-3 h-3" />
           <span className="text-[9px] font-bold uppercase tracking-widest">PCI-DSS Secure</span>
        </div>

        {paymentToken && (
          <div className="mx-4 mt-3 mb-5 rounded-xl border border-emerald-100 bg-white px-3.5 py-2.5 text-left shadow-sm animate-in fade-in slide-in-from-bottom-1 duration-300">
            <div className="truncate font-mono text-[10px] font-semibold text-slate-700">
              <span className="font-black uppercase tracking-widest text-emerald-700">Token: </span>
              {paymentToken}
            </div>
            <p className="mt-1 text-[10px] font-semibold text-slate-500">
              获取到 Token 后用于后续下单。
            </p>
          </div>
        )}
      </div>

      {/* 底部紧凑操作区 */}
      <div className="p-4 bg-white border-t border-slate-100 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] z-40">
        {paymentToken ? (
           <button
              onClick={handleSubmitTokenForOrder}
              disabled={isApiCalling}
              className="w-full h-12 font-bold rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-50 active:scale-95 transition-all flex items-center justify-center gap-2 text-[13px] uppercase tracking-wider disabled:opacity-60 disabled:active:scale-100"
            >
              {isApiCalling ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>Submit Token & Order</span>
            </button>
        ) : (
          <div className="relative min-h-[50px]">
            {/* 1. 不支持 Apple Pay 的特殊提示 */}
            {paymentMethod === 'applepay' && unsupportedApplePay && (
              <div className="flex flex-col items-center justify-center gap-1.5 animate-in fade-in duration-500">
                 <div className="flex items-center gap-2 text-amber-600">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-[12px] font-bold">Device Unsupported</span>
                 </div>
                 <p className="text-[10px] text-slate-400 font-medium">Please use Safari or an iOS device</p>
              </div>
            )}

            {/* 2. CARD 按钮 */}
            <div className={cn(paymentMethod === 'card' ? "block" : "hidden")}>
              <button
                onClick={() => handleTokenGen()}
                disabled={isTokenizing || !isFormValid || sdkStatus !== 'ready'}
                className={cn(
                  "w-full h-12 font-bold rounded-full text-white shadow-lg flex items-center justify-center gap-2 text-[13px] uppercase tracking-wider transition-all",
                  isFormValid && sdkStatus === 'ready' 
                    ? "bg-indigo-600 shadow-indigo-100 active:scale-95" 
                    : "bg-slate-100 text-slate-300 shadow-none cursor-not-allowed"
                )}
              >
                {isTokenizing ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>
                    <span>Confirm & Pay</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

            {/* 3. AP/GP SDK (仅在环境支持时显示) */}
            <div 
              id="pmx-bottom-sdk-slot" 
              className={cn(
                ((paymentMethod === 'applepay' && !unsupportedApplePay) || paymentMethod === 'googlepay') ? "block" : "hidden", 
                "w-full h-12"
              )} 
            />

            {/* 4. 未选中提示 */}
            {!paymentMethod && (
              <div className="w-full h-12 border-2 border-dashed border-slate-100 rounded-full flex items-center justify-center bg-slate-50/30">
                <p className="text-[11px] font-bold text-slate-300 uppercase">Select a method</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
