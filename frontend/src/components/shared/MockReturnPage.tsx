import React from 'react';
import { ArrowRight, CheckCircle2, Clock3, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Detail = {
  label: string;
  value?: string | number | null;
};

type MockReturnPageProps = {
  title?: string;
  description?: string;
  status?: string | null;
  orderNo?: string | null;
  methodLabel?: string | null;
  businessLabel?: string;
  details?: Detail[];
  actionLabel?: string;
  onAction?: () => void;
  disabled?: boolean;
  loading?: boolean;
  fallback?: boolean;
};

export const MockReturnPage: React.FC<MockReturnPageProps> = ({
  title,
  description,
  status,
  orderNo,
  methodLabel,
  businessLabel,
  details = [],
  actionLabel,
  onAction,
  disabled,
  loading,
  fallback,
}) => {
  const rows = [
    { label: 'callback status', value: status || (fallback ? 'READY_TO_CHECK' : 'SUCCESS') },
    methodLabel ? { label: 'payment method', value: methodLabel } : null,
    businessLabel ? { label: 'business flow', value: businessLabel } : null,
    orderNo ? { label: 'outTradeNo', value: orderNo } : null,
    ...details,
  ].filter(Boolean) as Detail[];

  return (
    <div className="h-full bg-white flex flex-col px-6 py-7 text-center">
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className={cn(
          'w-16 h-16 rounded-full flex items-center justify-center mb-5',
          fallback ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
        )}>
          {fallback ? <Clock3 className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
        </div>
        <h3 className="text-lg font-black text-slate-900">
          {title || (fallback ? 'Ready to check result' : 'Returned to merchant')}
        </h3>
        <p className="mt-2 text-xs font-semibold text-slate-500 leading-relaxed">
          {description || (
            fallback
              ? 'The redirect page changed state, but no callback URL was readable. Continue only when the user has finished the payment or authorization page.'
              : 'The browser has reached frontCallbackUrl. This demo keeps the user in the simulator and lets you query the real result next.'
          )}
        </p>

        <div className="mt-5 w-full rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left space-y-3">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{row.label}</span>
              <span className="text-[10px] font-mono font-bold text-slate-700 truncate text-right">{row.value || '-'}</span>
            </div>
          ))}
        </div>
      </div>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          disabled={disabled || loading}
          className="w-full h-12 rounded-2xl bg-blue-600 text-white font-black flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          {actionLabel}
        </button>
      )}
    </div>
  );
};
