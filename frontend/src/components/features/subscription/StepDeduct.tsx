import React from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { getMandateAmounts } from '@/types/subscription';
import { CheckCircle2, RotateCcw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export const StepDeduct: React.FC = () => {
  const {
    subMode,
    paymentMethod,
    formParams,
    mandateTokenId,
    lastApiResponse,
    reset,
  } = useSubscription();
  const { t } = useLanguage();

  const mandateAmounts = getMandateAmounts(subMode, formParams, paymentMethod);
  const mitType = mandateAmounts.mitType;
  const amount = mandateAmounts.laterDebitAmount;
  const currency = mandateAmounts.currency;
  const status = lastApiResponse?.debug?.responseFromPayerMax?.data?.status
    || lastApiResponse?.data?.status
    || lastApiResponse?.code
    || 'READY';

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="border-b border-slate-100 bg-white px-5 py-4">
        <h3 className="text-[15px] font-black text-slate-900">{t('subscription.deduct.title')}</h3>
        <p className="mt-0.5 text-[10px] font-bold text-slate-400">orderAndPay · merchantInitiated=true</p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        <div className="rounded-2xl bg-slate-900 p-4 text-white shadow-lg shadow-slate-200">
          <p className="text-xs font-semibold leading-relaxed text-slate-200">
            {t('subscription.deduct.desc')}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <Info label={t('subscription.deduct.amount')} value={`${currency} ${amount}`} />
          <Info label="mitType" value={mitType} />
          <Info label="merchantInitiated" value="true" />
          <Info label="tokenForFutureUse" value="false" />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">paymentTokenID</p>
          <div className="mt-2 break-all rounded-xl border border-slate-100 bg-slate-50 p-3 font-mono text-[11px] text-slate-700">
            {mandateTokenId || t('subscription.deduct.waitToken')}
          </div>
        </div>

        {lastApiResponse && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-emerald-800">{t('subscription.deduct.boundDone')}</div>
              <div className="mt-1 font-mono text-xs text-emerald-700">status: {status}</div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 bg-white p-4">
        <button
          type="button"
          onClick={reset}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 font-black text-white transition-all active:scale-95"
        >
          <RotateCcw className="h-4 w-4" />
          {t('subscription.deduct.reset')}
        </button>
      </div>
    </div>
  );
};

const Info: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</div>
    <div className="mt-1 break-all text-[12px] font-black text-slate-800">{value}</div>
  </div>
);
