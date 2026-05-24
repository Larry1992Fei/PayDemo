import React from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { normalizeApmSubscriptionParams, normalizeFullCashierSubscriptionParams } from '@/types/subscription';
import { AlertCircle, CheckCircle2, Clock3, RotateCcw } from 'lucide-react';

const periodUnitText: Record<string, string> = {
  D: '日',
  W: '周',
  M: '月',
  Y: '年',
};

const firstPresent = (...values: unknown[]) =>
  values.find(value => value !== undefined && value !== null && value !== '');

const formatAmount = (currency: unknown, amount: unknown) => {
  const currencyText = String(currency || 'KRW');
  const numericAmount = Number(amount || 0);
  const decimals = currencyText === 'KRW' ? 0 : 2;
  return `${currencyText} ${Number.isFinite(numericAmount) ? numericAmount.toFixed(decimals) : amount}`;
};

export const StepComplete: React.FC = () => {
  const { subMode, formParams, subscriptionType, paymentMethod, lastApiResponse, reset } = useSubscription();
  const planParams = paymentMethod === 'apm'
    ? normalizeApmSubscriptionParams(formParams)
    : normalizeFullCashierSubscriptionParams(formParams);

  const responseData = lastApiResponse?.data || lastApiResponse?.debug?.responseFromPayerMax?.data || {};
  const requestData = lastApiResponse?.debug?.requestToPayerMax?.body?.data || {};
  const queryPlan = responseData?.subscriptionPlan || {};
  const periodAmount = queryPlan?.periodAmount || {};
  const trialConfig = queryPlan?.trialConfig || {};
  const trialAmount = trialConfig?.trialAmount || {};
  const trialPeriodConfig = queryPlan?.trialPeriodConfig || {};
  const trialPeriodAmount = trialPeriodConfig?.trialPeriodAmount || {};
  const subscriptionStatus = queryPlan?.subscriptionStatus || responseData?.subscriptionStatus || 'UNKNOWN';
  const firstPayment = responseData?.subscriptionPaymentDetails?.[0];
  const firstPaymentStatus = firstPayment?.paymentStatus || firstPayment?.lastPaymentInfo?.lastPaymentStatus || 'PENDING';
  const activationCallback = lastApiResponse?.localActivationCallback || {};
  const orderAndPayStatus = activationCallback.orderAndPayStatus || activationCallback.payStatus || activationCallback.status || firstPaymentStatus;
  const requestPaymentMethod = requestData?.paymentDetail?.paymentMethodType || requestData?.paymentDetail?.paymentType;
  const paymentMethodText = String(firstPresent(requestPaymentMethod, paymentMethod || '全量收银台')).toUpperCase();

  const displayCurrency = firstPresent(
    activationCallback.currency,
    firstPayment?.currency,
    planParams.currency,
    periodAmount.currency,
    trialAmount.currency,
    trialPeriodAmount.currency
  );
  const periodCurrency = firstPresent(planParams.currency, periodAmount.currency, displayCurrency);
  const periodValue = firstPresent(planParams.amount, periodAmount.amount);
  const trialValue = firstPresent(planParams.trialAmount, trialAmount.amount);
  const trialPeriodValue = firstPresent(planParams.trialPeriodAmount, trialPeriodAmount.amount);
  const comboTrialValue = firstPresent(planParams.trialAmountCombo, trialAmount.amount);
  const comboTrialPeriodValue = firstPresent(planParams.trialPeriodAmountCombo, trialPeriodAmount.amount);
  const activationValue = firstPresent(
    activationCallback.amount,
    activationCallback.totalAmount,
    firstPayment?.amount,
    firstPayment?.totalAmount,
    subscriptionType === 'trial'
      ? trialValue
      : subscriptionType === 'trial_discount'
        ? comboTrialValue
        : subscriptionType === 'discount'
          ? trialPeriodValue
          : periodValue
  );

  const periodRule = queryPlan?.periodRule || {};
  const periodCount = firstPresent(planParams.periodCount, periodRule.periodCount);
  const periodUnit = String(firstPresent(planParams.periodUnit, periodRule.periodUnit));
  const totalPeriods = firstPresent(planParams.totalPeriods, queryPlan?.totalPeriods);
  const periodText = `每 ${periodCount} ${periodUnitText[periodUnit] || periodUnit} · 共 ${totalPeriods} 期`;
  const hasTrial = subscriptionType === 'trial' || subscriptionType === 'trial_discount';
  const hasDiscount = subscriptionType === 'discount' || subscriptionType === 'trial_discount';

  const planTitle = {
    standard: '普通订阅',
    trial: `${planParams.trialDays} 天免费试用`,
    discount: `前 ${planParams.trialPeriodCount} 期优惠`,
    trial_discount: `${planParams.trialDays} 天试用 + 前 ${planParams.trialPeriodCountCombo} 期优惠`,
  }[subscriptionType];

  const planRuleText = [
    hasTrial
      ? `试用期 ${firstPresent(planParams.trialDays, trialConfig.trialDays)} 天，激活金额 ${formatAmount(displayCurrency, subscriptionType === 'trial_discount' ? comboTrialValue : trialValue)}`
      : null,
    hasDiscount
      ? `优惠期 ${firstPresent(subscriptionType === 'trial_discount' ? planParams.trialPeriodCountCombo : planParams.trialPeriodCount, trialPeriodConfig.trialPeriodCount)} 期，每期 ${formatAmount(periodCurrency, subscriptionType === 'trial_discount' ? comboTrialPeriodValue : trialPeriodValue)}`
      : null,
    `后续每期 ${formatAmount(periodCurrency, periodValue)}`,
  ].filter(Boolean).join('；');

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
        <>
          <div className="grid grid-cols-2 gap-3 text-left">
            {[
              { label: '订阅方案', value: planTitle },
              { label: '扣款周期', value: periodText },
              { label: '订阅规则', value: planRuleText },
              { label: '激活请求', value: `${formatAmount(displayCurrency, activationValue)} · ${orderAndPayStatus}` },
              { label: '查询状态', value: subscriptionStatus },
              { label: '支付方式', value: paymentMethodText },
            ].map(item => (
              <div key={item.label} className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">{item.label}</div>
                <div className="mt-0.5 text-xs font-semibold leading-snug text-slate-800">{item.value}</div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={reset}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white text-xs font-black text-emerald-700 shadow-sm transition-all active:scale-95"
          >
            <RotateCcw className="h-4 w-4" />
            重置订阅流程
          </button>
        </>
      )}
    </div>
  );
};
