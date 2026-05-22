import React from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { AlertCircle, CheckCircle2, Clock3 } from 'lucide-react';

const periodUnitText: Record<string, string> = {
  D: '日',
  W: '周',
  M: '月',
  Y: '年',
};

export const StepComplete: React.FC = () => {
  const { subMode, formParams, subscriptionType, lastApiResponse } = useSubscription();

  const responseData = lastApiResponse?.data || lastApiResponse?.debug?.responseFromPayerMax?.data || {};
  const queryPlan = responseData?.subscriptionPlan || {};
  const subscriptionStatus = queryPlan?.subscriptionStatus || responseData?.subscriptionStatus || 'UNKNOWN';
  const firstPayment = responseData?.subscriptionPaymentDetails?.[0];
  const firstPaymentStatus = firstPayment?.paymentStatus || firstPayment?.lastPaymentInfo?.lastPaymentStatus || 'PENDING';
  const activationCallback = lastApiResponse?.localActivationCallback || {};
  const orderAndPayStatus = activationCallback.orderAndPayStatus || activationCallback.payStatus || activationCallback.status || firstPaymentStatus;

  const periodText = `每 ${formParams.periodCount} ${periodUnitText[formParams.periodUnit] || formParams.periodUnit} · 共 ${formParams.totalPeriods} 期`;
  const hasTrial = subscriptionType === 'trial' || subscriptionType === 'trial_discount';
  const hasDiscount = subscriptionType === 'discount' || subscriptionType === 'trial_discount';

  const planTitle = {
    standard: '普通订阅',
    trial: `${formParams.trialDays} 天免费试用`,
    discount: `前 ${formParams.trialPeriodCount} 期优惠`,
    trial_discount: `${formParams.trialDays} 天试用 + 前 ${formParams.trialPeriodCountCombo} 期优惠`,
  }[subscriptionType];

  const planRuleText = [
    hasTrial
      ? `试用期 ${formParams.trialDays} 天，激活金额 ${formParams.currency} ${subscriptionType === 'trial_discount' ? formParams.trialAmountCombo : formParams.trialAmount}`
      : null,
    hasDiscount
      ? `优惠期 ${subscriptionType === 'trial_discount' ? formParams.trialPeriodCountCombo : formParams.trialPeriodCount} 期，每期 ${formParams.currency} ${subscriptionType === 'trial_discount' ? formParams.trialPeriodAmountCombo : formParams.trialPeriodAmount}`
      : null,
    `后续每期 ${formParams.currency} ${formParams.amount}`,
  ].filter(Boolean).join('；');

  const activationAmount = hasTrial
    ? (subscriptionType === 'trial_discount' ? formParams.trialAmountCombo : formParams.trialAmount)
    : hasDiscount
      ? formParams.trialPeriodAmount
      : formParams.amount;

  const normalizedStatus = String(subscriptionStatus).toUpperCase();
  const isActive = normalizedStatus === 'ACTIVE';
  const isFailed = normalizedStatus.includes('FAILED') || normalizedStatus === 'CANCELLED' || normalizedStatus === 'EXPIRED';
  const headerTone = isActive ? 'emerald' : isFailed ? 'red' : 'amber';
  const headerClass = {
    emerald: 'bg-emerald-100 border-emerald-50 shadow-emerald-100 text-emerald-600',
    red: 'bg-red-100 border-red-50 shadow-red-100 text-red-600',
    amber: 'bg-amber-100 border-amber-50 shadow-amber-100 text-amber-600',
  }[headerTone];
  const headerIcon = isActive
    ? <CheckCircle2 className="h-10 w-10" />
    : isFailed
      ? <AlertCircle className="h-10 w-10" />
      : <Clock3 className="h-10 w-10" />;
  const headerTitle = isActive ? '订阅激活成功' : isFailed ? '订阅激活失败' : '订阅状态待确认';
  const headerDescription = isActive
    ? '订阅计划已创建并完成首次激活，后续扣款由约定周期驱动。'
    : isFailed
      ? `subscriptionQuery 返回状态为 ${subscriptionStatus}，请根据查询结果排查首期授权/支付。`
      : `subscriptionQuery 返回状态为 ${subscriptionStatus}，请等待异步结果或重新查询。`;

  return (
    <div className="space-y-6 py-4 text-center">
      <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 shadow-lg ${headerClass}`}>
        {headerIcon}
      </div>
      <div>
        <h3 className="text-xl font-extrabold text-slate-800">{headerTitle}</h3>
        <p className="mt-1 text-sm text-slate-500">{headerDescription}</p>
      </div>

      {subMode === 'payermax' && (
        <div className="grid grid-cols-2 gap-3 text-left">
          {[
            { label: '订阅方案', value: planTitle },
            { label: '扣款周期', value: periodText },
            { label: '订阅规则', value: planRuleText },
            { label: '激活请求', value: `${formParams.currency} ${activationAmount} · ${orderAndPayStatus}` },
            { label: '查询状态', value: subscriptionStatus },
          ].map(item => (
            <div key={item.label} className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">{item.label}</div>
              <div className="mt-0.5 text-xs font-semibold leading-snug text-slate-800">{item.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
