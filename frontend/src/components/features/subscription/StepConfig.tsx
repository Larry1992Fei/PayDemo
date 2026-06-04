import React from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { SUBSCRIPTION_TYPE_CONFIG, getMandateAmounts, type SubscriptionType } from '@/types/subscription';
import { cn } from '@/lib/utils';
import { ArrowRight, CheckCircle2, CreditCard, ShieldCheck } from 'lucide-react';
import { SelfHostedApiCashier, getBusinessError } from './StepBind';
import { useLanguage } from '@/contexts/LanguageContext';

export const StepConfig: React.FC = () => {
  const {
    subMode,
    integrationMode,
    paymentMethod,
    setPaymentMethod,
    subscriptionType,
    setSubscriptionType,
    formParams,
    updateFormParam,
    goNext,
    goNextWithApi,
    bindMandatePaymentMethod,
    isApiCalling,
    mandateTokenId,
    lastApiResponse
  } = useSubscription();
  const { t } = useLanguage();
  const [showApiCashier, setShowApiCashier] = React.useState(false);

  const mandateAmounts = getMandateAmounts(subMode, formParams, paymentMethod);
  const isPayerMaxManaged = subMode === 'payermax';
  const isMerchantManaged = subMode === 'merchant';
  const isNonPeriodic = subMode === 'nonperiodic';

  if (isMerchantManaged || isNonPeriodic) {
    if (integrationMode === 'api' && showApiCashier) {
      return (
        <SelfHostedApiCashier
          amount={mandateAmounts.firstBindAmount}
          currency={mandateAmounts.currency}
          mitType={mandateAmounts.mitType}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          isApiCalling={isApiCalling}
          mandateTokenId={mandateTokenId}
          errorMessage={getBusinessError(lastApiResponse, t)}
          onSubmit={async () => {
            const orderStepId = subMode === 'merchant' ? 'm-order' : 'np-order';
            const result = await bindMandatePaymentMethod(paymentMethod, orderStepId);
            if (result?.code === 'APPLY_SUCCESS' || result?.code === 'PAY_SUCCESS' || result?.code === 'SUCCESS' || result?.data?.redirectUrl) {
              goNext();
            }
          }}
        />
      );
    }

    return (
      <FirstBindTypePreview
        mode={subMode}
        bindType={formParams.bindType}
        amount={mandateAmounts.laterDebitAmount}
        currency={mandateAmounts.currency}
        mitType={mandateAmounts.mitType}
        onSelect={(value) => updateFormParam('bindType', value)}
        onNext={() => {
          if (integrationMode === 'api') {
            setShowApiCashier(true);
            return;
          }
          void goNextWithApi();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {isPayerMaxManaged && (
        <Panel title={t('subscription.config.planTitle')} desc={t('subscription.config.planDesc')}>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(SUBSCRIPTION_TYPE_CONFIG) as SubscriptionType[]).map((type) => {
              return (
                <button
                  key={type}
                  onClick={() => setSubscriptionType(type)}
                  className={cn(
                    'rounded-xl border px-3 py-2 text-left transition-all',
                    subscriptionType === type
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  )}
                >
                  <span className="block text-xs font-black">{t(`subscription.type.${type}.label`)}</span>
                  <span className="mt-0.5 block text-[10px] font-semibold opacity-70">{t(`subscription.type.${type}.desc`)}</span>
                </button>
              );
            })}
          </div>
        </Panel>
      )}

      {isMerchantManaged && (
        <Panel title={t('subscription.config.merchantTitle')} desc={t('subscription.config.merchantDesc')}>
          <MandateSummary
            firstAmount={`${mandateAmounts.currency} ${mandateAmounts.firstBindAmount}`}
            laterAmount={`${mandateAmounts.currency} ${mandateAmounts.laterDebitAmount}`}
            mitType={mandateAmounts.mitType}
          />
        </Panel>
      )}

      {isNonPeriodic && (
        <Panel title={t('subscription.config.nonperiodicTitle')} desc={t('subscription.config.nonperiodicDesc')}>
          <MandateSummary
            firstAmount={`${mandateAmounts.currency} ${mandateAmounts.firstBindAmount}`}
            laterAmount={`${mandateAmounts.currency} ${mandateAmounts.laterDebitAmount}`}
            mitType={mandateAmounts.mitType}
          />
        </Panel>
      )}

      <Panel title={t('subscription.config.parameters')}>
        {isPayerMaxManaged && (
          <div className="space-y-4">
            {paymentMethod === 'apm' && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold leading-relaxed text-amber-800">
                {t('subscription.config.apmFixed')}
              </div>
            )}
            <FormRow>
              <FormField label={t('subscription.config.totalPeriods')} id="totalPeriods">
                <input type="number" min="1" value={formParams.totalPeriods}
                  onChange={e => updateFormParam('totalPeriods', e.target.value)}
                  className={inputCls} />
              </FormField>
              <FormField label={t('subscription.config.periodCount')} id="periodCount">
                <input type="number" min="1" value={formParams.periodCount}
                  onChange={e => updateFormParam('periodCount', e.target.value)}
                  className={inputCls} />
              </FormField>
            </FormRow>
            <FormRow>
              <FormField label={t('subscription.config.periodUnit')} id="periodUnit">
                <select value={formParams.periodUnit}
                  onChange={e => updateFormParam('periodUnit', e.target.value as 'D' | 'W' | 'M' | 'Y')}
                  className={inputCls}>
                  <option value="D">{t('subscription.config.unit.D')}</option>
                  <option value="W">{t('subscription.config.unit.W')}</option>
                  <option value="M">{t('subscription.config.unit.M')}</option>
                  <option value="Y">{t('subscription.config.unit.Y')}</option>
                </select>
              </FormField>
              <FormField label={t('subscription.config.amount')} id="amount">
                <input type="number" step="0.01" min="0" value={formParams.amount}
                  onChange={e => updateFormParam('amount', e.target.value)}
                  className={inputCls} />
              </FormField>
            </FormRow>
            <FormField label={t('subscription.config.currency')} id="currency">
              <input type="text" value={formParams.currency}
                onChange={e => updateFormParam('currency', e.target.value)}
                className={inputCls} />
            </FormField>
            {(subscriptionType === 'trial' || subscriptionType === 'trial_discount') && (
              <FormField label={t('subscription.config.trialDays')} id="trialDays">
                <input type="number" min="1" value={formParams.trialDays}
                  onChange={e => updateFormParam('trialDays', e.target.value)}
                  className={inputCls} />
              </FormField>
            )}
            {(subscriptionType === 'discount' || subscriptionType === 'trial_discount') && (
              <FormRow>
                <FormField label={t('subscription.config.discountPeriods')} id="trialPeriodCount">
                  <input type="number" min="1" value={formParams.trialPeriodCount}
                    onChange={e => updateFormParam('trialPeriodCount', e.target.value)}
                    className={inputCls} />
                </FormField>
                <FormField label={t('subscription.config.discountAmount')} id="trialPeriodAmount">
                  <input type="number" step="0.01" value={formParams.trialPeriodAmount}
                    onChange={e => updateFormParam('trialPeriodAmount', e.target.value)}
                    className={inputCls} />
                </FormField>
              </FormRow>
            )}
          </div>
        )}

        {isMerchantManaged && (
          <div className="space-y-4">
            <BindTypeSelector value={formParams.bindType} onChange={v => updateFormParam('bindType', v)} />
            <FormRow>
              <FormField label={formParams.bindType === 'zero' ? t('subscription.config.laterPlanAmount') : t('subscription.config.firstAndLaterAmount')} id="merchantAmount">
                <input type="number" step="0.01" min="0" value={formParams.merchantAmount}
                  onChange={e => updateFormParam('merchantAmount', e.target.value)}
                  className={inputCls} />
              </FormField>
              <FormField label={t('subscription.config.currency')} id="merchantCurrency">
                <input type="text" value={formParams.merchantCurrency}
                  onChange={e => updateFormParam('merchantCurrency', e.target.value)}
                  className={inputCls} />
              </FormField>
            </FormRow>
            <FormField label={t('subscription.config.subject')} id="merchantSubject">
              <input type="text" value={formParams.merchantSubject}
                onChange={e => updateFormParam('merchantSubject', e.target.value)}
                className={inputCls} />
            </FormField>
            <FormField label={t('subscription.config.userId')} id="merchantUserId">
              <input type="text" value={formParams.merchantUserId}
                onChange={e => updateFormParam('merchantUserId', e.target.value)}
                className={inputCls} />
            </FormField>
          </div>
        )}

        {isNonPeriodic && (
          <div className="space-y-4">
            <BindTypeSelector value={formParams.bindType} onChange={v => updateFormParam('bindType', v)} />
            <FormRow>
              <FormField label={formParams.bindType === 'zero' ? t('subscription.config.laterOnDemandAmount') : t('subscription.config.firstAndLaterAmount')} id="npAmount">
                <input type="number" step="0.01" min="0" value={formParams.npAmount}
                  onChange={e => updateFormParam('npAmount', e.target.value)}
                  className={inputCls} />
              </FormField>
              <FormField label={t('subscription.config.currency')} id="npCurrency">
                <input type="text" value={formParams.npCurrency}
                  onChange={e => updateFormParam('npCurrency', e.target.value)}
                  className={inputCls} />
              </FormField>
            </FormRow>
          </div>
        )}
      </Panel>
    </div>
  );
};

const Panel: React.FC<{ title: string; desc?: string; children: React.ReactNode }> = ({ title, desc, children }) => (
  <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
    <h4 className="text-sm font-bold text-slate-700">{title}</h4>
    {desc && <p className="mt-1 mb-4 text-xs font-semibold leading-relaxed text-slate-500">{desc}</p>}
    {children}
  </div>
);

const BindTypeSelector: React.FC<{
  value: 'zero' | 'paid';
  onChange: (value: 'zero' | 'paid') => void;
}> = ({ value, onChange }) => {
  const { t } = useLanguage();

  return (
  <div>
    <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">{t('subscription.config.firstBindType')}</p>
    <div className="grid grid-cols-2 gap-3">
      {(['zero', 'paid'] as const).map(type => (
        <button
          key={type}
          onClick={() => onChange(type)}
          className={cn(
            'rounded-xl border px-3 py-2 text-left transition-all',
            value === type
              ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
              : 'border-slate-200 text-slate-500 hover:border-slate-300'
          )}
        >
          <span className="block text-xs font-black">{type === 'zero' ? t('subscription.config.zeroBind') : t('subscription.config.paidBind')}</span>
          <span className="mt-0.5 block text-[10px] font-semibold opacity-70">
            {type === 'zero' ? t('subscription.config.zeroBindDesc') : t('subscription.config.paidBindDesc')}
          </span>
        </button>
      ))}
    </div>
  </div>
  );
};

const MandateSummary: React.FC<{ firstAmount: string; laterAmount: string; mitType: string }> = ({
  firstAmount,
  laterAmount,
  mitType
}) => {
  const { t } = useLanguage();

  return (
    <div className="grid grid-cols-3 gap-2 text-xs">
      <SummaryItem label={t('subscription.config.firstBindAmount')} value={firstAmount} />
      <SummaryItem label={t('subscription.config.laterDebitAmount')} value={laterAmount} />
      <SummaryItem label={t('subscription.config.mitType')} value={mitType} />
    </div>
  );
};

const SummaryItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</div>
    <div className="mt-1 break-all text-[12px] font-black text-slate-800">{value}</div>
  </div>
);

const FirstBindTypePreview: React.FC<{
  mode: 'merchant' | 'nonperiodic';
  bindType: 'zero' | 'paid';
  amount: string;
  currency: string;
  mitType: string;
  onSelect: (value: 'zero' | 'paid') => void;
  onNext: () => void;
}> = ({ mode, bindType, amount, currency, mitType, onSelect, onNext }) => {
  const { t } = useLanguage();
  const isMerchant = mode === 'merchant';
  const options: Array<{
    id: 'zero' | 'paid';
    title: string;
    tag: string;
    desc: string;
    amount: string;
  }> = [
    {
      id: 'zero',
      title: t('subscription.config.zeroBind'),
      tag: t('subscription.config.trialScenario'),
      desc: isMerchant
        ? t('subscription.config.zeroMerchantDesc')
        : t('subscription.config.zeroNonperiodicDesc'),
      amount: `${currency} 0`,
    },
    {
      id: 'paid',
      title: t('subscription.config.paidBind'),
      tag: t('subscription.config.firstPayScenario'),
      desc: isMerchant
        ? t('subscription.config.paidMerchantDesc')
        : t('subscription.config.paidNonperiodicDesc'),
      amount: `${currency} ${amount}`,
    },
  ];
  const selected = options.find(item => item.id === bindType) || options[0];
  return (
    <div className="flex h-full flex-col overflow-hidden bg-slate-50 font-sans text-slate-900">
      <div className="shrink-0 border-b border-slate-100 bg-white px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-500">
              First Binding
            </p>
            <h2 className="mt-0.5 text-lg font-black tracking-tight">
              {isMerchant ? t('subscription.config.merchantPreviewTitle') : t('subscription.config.nonperiodicPreviewTitle')}
            </h2>
            <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-500">
              {t('subscription.config.previewHint')}
            </p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-4">
        <div className="space-y-2.5">
          {options.map(option => {
            const active = bindType === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onSelect(option.id)}
                className={cn(
                  'w-full rounded-2xl border bg-white p-3 text-left shadow-sm transition-all',
                  active
                    ? 'border-indigo-600 ring-2 ring-indigo-100'
                    : 'border-slate-200 hover:border-slate-300'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                    active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
                  )}>
                    {active ? <CheckCircle2 className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-black text-slate-900">{option.title}</h3>
                        <p className="mt-0.5 line-clamp-2 text-[10px] font-semibold leading-relaxed text-slate-500">
                          {option.desc}
                        </p>
                      </div>
                      <span className={cn(
                        'shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase',
                        active ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'
                      )}>
                        {option.tag}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <InfoTile label={t('subscription.config.firstAmount')} value={option.amount} active={active} />
                      <InfoTile label="MIT Type" value={mitType} active={active} />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="hidden">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Selected Plan</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-emerald-950">{selected.title}</p>
              <p className="mt-1 text-[11px] font-semibold leading-relaxed text-emerald-800/80">
                {t('subscription.config.nextOrderHint')}
              </p>
            </div>
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-emerald-700 shadow-sm">
              {selected.amount}
            </span>
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-slate-100 bg-white p-4">
        <button
          type="button"
          onClick={onNext}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-sm font-black text-white shadow-lg shadow-emerald-100 transition-transform active:scale-95"
        >
          {t('subscription.config.firstOrderBind')}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

const InfoTile: React.FC<{ label: string; value: string; active: boolean }> = ({ label, value, active }) => (
  <div className={cn(
    'rounded-xl border px-3 py-2',
    active ? 'border-indigo-100 bg-indigo-50/70' : 'border-slate-100 bg-slate-50'
  )}>
    <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">{label}</div>
    <div className="mt-1 truncate text-[11px] font-black text-slate-800">{value}</div>
  </div>
);

const inputCls = 'h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-800 transition-colors focus:border-indigo-500 focus:bg-white focus:outline-none';

const FormRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="grid grid-cols-2 gap-3">{children}</div>
);

const FormField: React.FC<{ label: string; id: string; children: React.ReactNode }> = ({ label, id, children }) => (
  <div className="flex flex-col gap-1">
    <label htmlFor={id} className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</label>
    {children}
  </div>
);
