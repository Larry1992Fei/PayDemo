import React from 'react';
import { useProduct } from '@/contexts/ProductContext';
import { CreditCard, ShieldCheck, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STANDARD_CARD_DETAIL } from '@/config/demoPaymentDetails';

export const StepApiPayment: React.FC = () => {
  const { amount, currency, paymentMethod, toNextStep } = useProduct();
  const isCard = paymentMethod === 'card';

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in slide-in-from-right-4 duration-500">
      {/* 头部：商户品牌 */}
      <div className="bg-white px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-[10px] text-white font-bold">PM</span>
          </div>
          <span className="text-sm font-bold text-slate-800">PayerMax Store</span>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Amount</span>
          <span className="text-sm font-black text-slate-900">{currency} {parseFloat(amount).toFixed(2)}</span>
        </div>
      </div>

      <div className="flex-1 p-5 space-y-6">
        {/* API 模式的核心：商户自建表单 */}
        <div className="space-y-4">
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            {isCard ? 'Enter Card Details' : 'Payment Confirmation'}
          </h3>

          {isCard ? (
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Card Number</label>
                <div className="h-11 bg-slate-50 rounded-xl border border-slate-100 px-3 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-800 font-medium tracking-widest">{STANDARD_CARD_DETAIL.displayNumber}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Expiry</label>
                  <div className="h-11 bg-slate-50 rounded-xl border border-slate-100 px-3 flex items-center">
                    <span className="text-sm text-slate-800 font-medium">{STANDARD_CARD_DETAIL.cardExpirationMonth} / {STANDARD_CARD_DETAIL.cardExpirationYear}</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">CVV</label>
                  <div className="h-11 bg-slate-50 rounded-xl border border-slate-100 px-3 flex items-center">
                    <span className="text-sm text-slate-800 font-medium">***</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col items-center text-center space-y-4">
              <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center text-3xl",
                paymentMethod === 'applepay' ? "bg-slate-900 text-white" : "bg-blue-50 text-blue-600"
              )}>
                {paymentMethod === 'applepay' ? '🍎' : paymentMethod === 'googlepay' ? '🤖' : '💱'}
              </div>
              <div>
                <h4 className="font-extrabold text-slate-800 uppercase">{paymentMethod}</h4>
                <p className="text-[11px] text-slate-400 font-medium mt-1">
                  You will be redirected to complete the payment via {paymentMethod} secure gateway.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-emerald-600 px-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold">Encrypted & Secure by PayerMax</span>
          </div>
        </div>
      </div>

      {/* 吸底按钮 */}
      <div className="p-5 bg-white border-t border-slate-100">
        <button 
          onClick={() => toNextStep()}
          className="w-full h-12 bg-indigo-600 text-white font-extrabold rounded-2xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          {isCard ? 'Pay Now' : 'Proceed to Payment'}
          <ArrowRight className="w-4 h-4" />
        </button>
        <p className="text-[9px] text-center text-slate-400 mt-3 font-medium">
          By clicking pay, you agree to the merchant's Terms & Conditions.
        </p>
      </div>
    </div>
  );
};
