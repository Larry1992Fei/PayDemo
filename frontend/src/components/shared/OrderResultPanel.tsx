import React from 'react';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';

interface OrderResultPanelProps {
  paymentMethod: string;
  status: string;
  desc: string;
  onAction: () => void;
  disabled?: boolean;
  actionLabel?: string;
}

export const OrderResultPanel: React.FC<OrderResultPanelProps> = ({
  paymentMethod,
  status,
  desc,
  onAction,
  disabled,
  actionLabel = '查看支付结果',
}) => (
  <div className="h-full bg-slate-50 flex flex-col items-center justify-center px-6 text-center">
    <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center shadow-inner mb-8">
      <CheckCircle2 className="w-9 h-9 text-emerald-600" />
    </div>

    <h3 className="text-xl font-extrabold text-slate-800">orderAndPay 已返回</h3>
    <p className="text-xs font-medium text-slate-400 mt-3 px-2 leading-relaxed">{desc}</p>

    <div className="w-full rounded-2xl bg-slate-50 border border-slate-200 p-4 text-left space-y-3 mt-8">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">接口</span>
        <span className="text-xs font-black text-slate-800">/api/orderAndPay</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">支付方式</span>
        <span className="text-xs font-black text-slate-800 uppercase">{paymentMethod}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">返回状态</span>
        <span className="text-xs font-black text-indigo-700 uppercase">{status}</span>
      </div>
    </div>

    <div className="w-full pt-8 border-t border-slate-100 mt-auto">
      <button
        type="button"
        onClick={onAction}
        disabled={disabled}
        className="w-full h-12 rounded-2xl bg-indigo-600 text-white text-sm font-extrabold flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-60"
      >
        {disabled ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {actionLabel}
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  </div>
);
