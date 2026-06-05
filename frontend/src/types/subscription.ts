/**
 * Subscription Domain Type Definitions
 * 订阅代扣业务领域的 TypeScript 类型系统
 */

// ─── 业务模式（订阅内三种子线路）───────────────────────────────────────────
import { createDemoUserId } from '@/lib/demoIds';

export type SubMode = 'payermax' | 'merchant' | 'nonperiodic';

export const SUB_MODE_CONFIG: Record<SubMode, { name: string; desc: string }> = {
  payermax:    { name: 'PayerMax托管（周期性订阅）', desc: 'PayerMax管理订阅计划与扣款周期' },
  merchant:    { name: '商户自管（周期性订阅）',    desc: '商户自主管理订阅计划与扣款时机' },
  nonperiodic: { name: '非周期性订阅代扣',         desc: '商户按业务需求灵活发起扣款' },
};

// ─── 集成方式 ────────────────────────────────────────────────────────────────
export type IntegrationMode = 'cashier' | 'api' | 'component';

export const INTEGRATION_CONFIG: Record<IntegrationMode, { label: string }> = {
  cashier:   { label: '收银台绑定 / 激活' },
  api:       { label: 'API 绑定 / 激活' },
  component: { label: '前置组件绑定 / 激活' },
};

// ─── 支付方式 ────────────────────────────────────────────────────────────────
export type PaymentMethod = '' | 'card' | 'applepay' | 'googlepay' | 'apm';
export type ConcretePaymentMethod = Exclude<PaymentMethod, ''>;

export const PAYMENT_METHOD_CONFIG: Record<ConcretePaymentMethod, { label: string; apiType: string }> = {
  card:      { label: 'CARD',      apiType: 'CARD' },
  applepay:  { label: 'APPLEPAY',  apiType: 'APPLEPAY' },
  googlepay: { label: 'GOOGLEPAY', apiType: 'GOOGLEPAY' },
  apm:       { label: 'APM',       apiType: 'ONE_TOUCH' },
};

export function buildFirstPeriodStartDate(offsetHours = 2): string {
  return `${new Date(Date.now() + offsetHours * 60 * 60 * 1000).toISOString().slice(0, 19)}+00:00`;
}

// ─── 订阅类型（仅 PayerMax 托管模式使用）───────────────────────────────────
export type SubscriptionType = 'standard' | 'trial' | 'discount' | 'trial_discount';

export const SUBSCRIPTION_TYPE_CONFIG: Record<SubscriptionType, { label: string; desc: string }> = {
  standard:       { label: '普通订阅',      desc: '绑定金额 > 0' },
  trial:          { label: 'N天试用',       desc: '绑定金额 = 0' },
  discount:       { label: '前N期优惠',     desc: '绑定金额 > 0' },
  trial_discount: { label: 'N天试用+前N期优惠', desc: '组合优惠' },
};

// ─── 步骤定义 ────────────────────────────────────────────────────────────────
export interface StepConfig {
  id: string;       // panel 路由 key
  label: string;    // Step N
  title: string;    // 步骤描述
  hint: string;     // 底部提示
}

// ─── 表单参数（订阅参数配置区） ──────────────────────────────────────────────
export interface SubscriptionFormParams {
  // PayerMax 模式
  totalPeriods: string;
  periodCount: string;
  periodUnit: 'D' | 'W' | 'M' | 'Y';
  amount: string;
  currency: string;
  startDate: string;
  trialDays: string;
  trialPeriodCount: string;
  trialAmount: string;
  trialPeriodAmount: string;
  trialAmountCombo: string;
  trialPeriodCountCombo: string;
  trialPeriodAmountCombo: string;
  description?: string;
  // Merchant / NonPeriodic 模式
  bindType: 'zero' | 'paid';
  merchantAmount: string;
  merchantCurrency: string;
  merchantSubject: string;
  merchantUserId: string;
  // NonPeriodic 模式
  npAmount: string;
  npCurrency: string;
}

export const DEFAULT_FORM_PARAMS: SubscriptionFormParams = {
  totalPeriods: '12', periodCount: '1', periodUnit: 'M',
  amount: '2000', currency: 'KRW', startDate: '',
  trialDays: '7', trialPeriodCount: '1', trialAmount: '0',
  trialPeriodAmount: '200', trialAmountCombo: '0',
  trialPeriodCountCombo: '1', trialPeriodAmountCombo: '200',
  description: 'PayerMax subscription first-period debit.',
  bindType: 'zero', merchantAmount: '2000', merchantCurrency: 'KRW',
  merchantSubject: 'Auto Debit Title', merchantUserId: createDemoUserId(),
  npAmount: '100', npCurrency: 'KRW',
};

// ─── 兼容性规则（APM 不支持前置组件）────────────────────────────────────────
export function isCompatible(payment: PaymentMethod, integration: IntegrationMode): boolean {
  if (!payment) return true;
  return !(payment === 'apm' && integration === 'component');
}

// ─── 辅助函数 ────────────────────────────────────────────────────────────────
export function getComponentList(payment: PaymentMethod): string {
  const map: Record<ConcretePaymentMethod, string> = {
    card:      '"CARD"',
    applepay:  '"APPLEPAY"',
    googlepay: '"GOOGLEPAY"',
    apm:       '"ONE_TOUCH"',
  };
  return map[payment || 'card'];
}

export function calculateActivateAmount(
  subType: SubscriptionType,
  amount: string,
  trialAmountCombo: string
): string {
  if (subType === 'trial') return '0';
  if (subType === 'trial_discount') return trialAmountCombo;
  return amount;
}

export function calculateActivationAmount(
  subType: SubscriptionType,
  params: SubscriptionFormParams
): string {
  // 严格按照业务模式判定优先级：trialConfig -> trialPeriodConfig -> periodAmount
  
  // 1. 检查是否存在 trialConfig (试用模式 或 试用+优惠模式)
  if (subType === 'trial') {
    return params.trialAmount || '0';
  }
  if (subType === 'trial_discount') {
    return params.trialAmountCombo || '0';
  }

  // 2. 检查是否存在 trialPeriodConfig (仅优惠模式)
  // 注意：在 trial_discount 模式下，由于 trialConfig 优先级更高，已经在上面返回了
  if (subType === 'discount') {
    return params.trialPeriodAmount || params.amount;
  }

  // 3. 普通订阅 (standard)：没有任何优惠，直接使用原价
  return params.amount;
}

export function formatPaymentAmount(amount: string | number, currency: string): string {
  const numericAmount = Number(amount || 0);
  if (numericAmount <= 0) return '0';
  return numericAmount.toFixed(currency === 'KRW' ? 0 : 2);
}

export function getMandateAmounts(
  subMode: SubMode,
  params: SubscriptionFormParams,
  paymentMethod?: PaymentMethod
) {
  const isNonPeriodic = subMode === 'nonperiodic';
  const isApm = paymentMethod === 'apm';
  const isFullCashier = !paymentMethod; // 无特定支付方式即为全量收银台
  
  const configuredAmount = isNonPeriodic ? params.npAmount : params.merchantAmount;
  const configuredCurrency = isNonPeriodic ? params.npCurrency : params.merchantCurrency;
  
  // 币种逻辑：APM 或 全量收银台 强制 KRW
  const currency = (isApm || isFullCashier) ? 'KRW' : configuredCurrency;
  const country = 'KR';
  
  // 金额逻辑：全量收银台且是 paid 类型时强制 2000，否则使用配置金额
  let firstBindAmount = params.bindType === 'zero' ? '0' : configuredAmount;
  if (isFullCashier && params.bindType === 'paid') {
    firstBindAmount = '2000';
  }
  
  const laterDebitAmount = Number(configuredAmount) > 0 ? configuredAmount : (currency === 'KRW' ? '100' : '9.99');

  return {
    bindType: params.bindType,
    firstBindAmount: formatPaymentAmount(firstBindAmount, currency),
    laterDebitAmount: (isApm || isFullCashier)
      ? String(Math.max(100, Math.round(Number(laterDebitAmount) || 100)))
      : formatPaymentAmount(laterDebitAmount, currency),
    configuredLaterDebitAmount: formatPaymentAmount(configuredAmount, currency),
    currency,
    country,
    mitType: isNonPeriodic ? 'UNSCHEDULED' : 'SCHEDULED',
  };
}

export function normalizeApmSubscriptionParams(params: SubscriptionFormParams): SubscriptionFormParams {
  return {
    ...params,
    currency: 'KRW',
    amount: '2000',
    trialAmount: '0',
    trialPeriodAmount: '200',
    trialAmountCombo: '0',
    trialPeriodAmountCombo: '200',
  };
}

export function normalizeFullCashierSubscriptionParams(params: SubscriptionFormParams): SubscriptionFormParams {
  return {
    ...params,
    currency: 'KRW',
    amount: '2000',
    trialAmount: '0',
    trialPeriodAmount: '200',
    trialAmountCombo: '0',
    trialPeriodCountCombo: '1',
    trialPeriodAmountCombo: '200',
    trialDays: '7',
    totalPeriods: '12',
    periodCount: '1',
    periodUnit: 'M',
    description: 'PayerMax subscription first-period debit.',
  };
}

export function buildSubscriptionPlan(type: SubscriptionType, params: SubscriptionFormParams) {
  const plan: any = {
    subject: params.description ? 'subject' : 'PayerMax Subscription Plan',
    description: params.description || 'PayerMax subscription first-period debit.',
    totalPeriods: parseInt(params.totalPeriods, 10),
    periodRule: {
      periodUnit: params.periodUnit,
      periodCount: parseInt(params.periodCount, 10),
    },
    periodAmount: {
      amount: parseFloat(params.amount),
      currency: params.currency,
    },
  };

  if (type === 'trial') {
    plan.trialConfig = {
      trialAmount: {
        amount: parseFloat(params.trialAmount || '0'),
        currency: params.currency,
      },
      trialDays: parseInt(params.trialDays, 10),
    };
  } else if (type === 'discount') {
    plan.trialPeriodConfig = {
      trialPeriodCount: parseInt(params.trialPeriodCount, 10),
      trialPeriodAmount: {
        amount: parseFloat(params.trialPeriodAmount),
        currency: params.currency,
      },
    };
  } else if (type === 'trial_discount') {
    plan.trialConfig = {
      trialAmount: {
        amount: parseFloat(params.trialAmountCombo !== undefined ? params.trialAmountCombo : '0'),
        currency: params.currency,
      },
      trialDays: parseInt(params.trialDays || '7', 10),
    };
    plan.trialPeriodConfig = {
      trialPeriodCount: parseInt(params.trialPeriodCountCombo || '1', 10),
      trialPeriodAmount: {
        amount: parseFloat(params.trialPeriodAmountCombo || '200'),
        currency: params.currency,
      },
    };
  }

  return plan;
}

export function buildMerchantManagedSubscriptionPlan(
  params: SubscriptionFormParams,
  options: {
    bindAmount: string | number;
    laterAmount: string | number;
    currency: string;
  }
) {
  const bindAmount = Number(options.bindAmount || 0);
  const laterAmount = Number(options.laterAmount || 0);
  const currency = options.currency || params.merchantCurrency || 'KRW';
  const plan: any = {
    subject: 'subject',
    description: 'PayerMax subscription first-period debit.',
    totalPeriods: parseInt(params.totalPeriods || '12', 10),
    periodRule: {
      periodUnit: params.periodUnit || 'M',
      periodCount: parseInt(params.periodCount || '1', 10),
    },
    periodAmount: {
      amount: laterAmount,
      currency,
    },
    firstPeriodStartDate: buildFirstPeriodStartDate(),
  };

  if (bindAmount === 0) {
    plan.trialConfig = {
      trialAmount: {
        amount: 0,
        currency,
      },
      trialDays: parseInt(params.trialDays || '7', 10),
    };
  }

  return plan;
}

export function getSubscriptionNoFromResponse(result: any): string | null {
  return result?.data?.subscriptionNo || result?.data?.subscriptionPlan?.subscriptionNo || null;
}

export function getPeriodUnitText(unit: string): string {
  const map: Record<string, string> = { D: '天', W: '周', M: '月', Y: '年' };
  return map[unit] ?? unit;
}
