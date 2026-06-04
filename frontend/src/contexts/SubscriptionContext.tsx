import React, { createContext, useContext, useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type {
  SubMode, IntegrationMode, PaymentMethod, SubscriptionType, SubscriptionFormParams, StepConfig
} from '@/types/subscription';
import { calculateActivationAmount, DEFAULT_FORM_PARAMS, getMandateAmounts, getSubscriptionNoFromResponse, isCompatible, normalizeApmSubscriptionParams, normalizeFullCashierSubscriptionParams, PAYMENT_METHOD_CONFIG } from '@/types/subscription';
import { getStepsForSubMode } from '@/config/subscriptionSteps';
import { postPayerMaxDemoApi } from '@/services/payermaxClient';
import { DEMO_MIT_MANAGEMENT_URL } from '@/config/payermaxDemoUrls';
import { createDemoUserId } from '@/lib/demoIds';
import { showUiWarning } from '@/lib/uiFeedback';
import { useLanguage } from '@/contexts/LanguageContext';

// Context 接口
interface SubscriptionContextType {
  subMode: SubMode;
  integrationMode: IntegrationMode;
  paymentMethod: PaymentMethod;
  subscriptionType: SubscriptionType;
  formParams: SubscriptionFormParams;
  subscriptionUserId: string;

  // Actions
  setSubMode: (m: SubMode) => void;
  setIntegrationMode: (m: IntegrationMode) => void;
  setPaymentMethod: (m: PaymentMethod) => void;
  setSubscriptionType: (t: SubscriptionType) => void;
  updateFormParam: <K extends keyof SubscriptionFormParams>(key: K, value: SubscriptionFormParams[K]) => void;

  // 动态计算产品信息，不允许外部修改
  steps: StepConfig[];
  currentStepIndex: number;
  currentStep: StepConfig;
  isFinalStep: boolean;
  triggerFlash: number;

  // 流转动作
  goNext: () => void;
  goPrev: () => void;
  goToStep: (index: number) => void;
  handleActivationCallback: (callbackData: any) => void;
  reset: () => void;

  // API 展示状态与方法
  isApiCalling: boolean;
  lastApiResponse: any;
  lastApiEndpoint: { method: string; url: string } | null;
  lastApiRequestBody: string | null;
  lastApiResponseBody: string | null;
  lastApiSections: Array<{
    title: string;
    endpoint?: { method: string; url: string };
    requestBody?: string;
    responseBody?: string;
  }> | null;
  lastApiStepId: string | null;
  stepApiExchanges: Record<string, ApiExchangeSnapshot>;
  subscriptionNo: string | null;
  activationRedirectUrl: string | null;
  componentSessionData: { sessionKey: string; clientKey: string } | null;
  componentPaymentToken: string | null;
  mandateTokenId: string | null;
  mandateBindOrderNo: string | null;
  createSubscription: () => Promise<any>;
  activateSubscription: (selectedPaymentMethod?: PaymentMethod, stepIdOverride?: string) => Promise<any>;
  prepareComponentSession: (stepIdOverride?: string) => Promise<any>;
  generateComponentToken: (token?: string) => void;
  activateComponentSubscription: (paymentTokenOverride?: string) => Promise<any>;
  bindMandatePaymentMethod: (selectedPaymentMethod?: PaymentMethod, stepIdOverride?: string) => Promise<any>;
  queryMandateBindingStatus: (stepIdOverride?: string) => Promise<any>;
  deductWithMandateToken: (stepIdOverride?: string) => Promise<any>;
  querySubscriptionStatus: (callbackData?: any) => Promise<any>;
  completeActivationWithQuery: (callbackData?: any) => Promise<void>;
  goNextWithApi: (selectedPaymentMethod?: PaymentMethod) => Promise<void>;
}

type ApiExchangeSnapshot = {
  endpoint?: { method: string; url: string };
  requestBody?: string;
  responseBody?: string;
  sections?: Array<{
    title: string;
    endpoint?: { method: string; url: string };
    requestBody?: string;
    responseBody?: string;
  }>;
};

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);
const MIT_MANAGEMENT_URL = DEMO_MIT_MANAGEMENT_URL;

function getPaymentMethodType(payment?: PaymentMethod | null): string | undefined {
  return payment ? PAYMENT_METHOD_CONFIG[payment].apiType : undefined;
}

function buildMitManagementUrl(payment?: PaymentMethod | null): Record<string, string> {
  // payment 为空（全量收银台）或 Apple Pay/Google Pay 时注入管理地址
  return !payment || payment === 'applepay' || payment === 'googlepay'
    ? { mitManagementUrl: MIT_MANAGEMENT_URL }
    : {};
}

function buildPaymentDetail(payment?: PaymentMethod | null): Record<string, unknown> | undefined {
  const paymentMethodType = getPaymentMethodType(payment);
  return paymentMethodType ? { paymentMethodType } : undefined;
}

function buildDefaultMandateSubscriptionPlan() {
  return {
    subject: 'subject',
    description: 'PayerMax subscription first-period debit.',
    totalPeriods: 12,
    periodRule: {
      periodUnit: 'M',
      periodCount: 1,
    },
    periodAmount: {
      amount: 2000,
      currency: 'KRW',
    },
    trialPeriodConfig: {
      trialPeriodCount: 1,
      trialPeriodAmount: {
        amount: 200,
        currency: 'KRW',
      },
    },
    trialConfig: {
      trialAmount: {
        amount: 100,
        currency: 'KRW',
      },
      trialDays: 7,
    },
  };
}

function buildSubscriptionCurrencyCountry(
  integration: IntegrationMode,
  payment: PaymentMethod | null | undefined,
  currency: string,
  country?: string
): { currency: string; country?: string } {
  if (integration === 'cashier' && !payment) {
    return { currency: 'KRW' };
  }
  return {
    currency: payment === 'apm' ? 'KRW' : currency,
    ...(payment === 'apm' ? { country: 'KR' } : country ? { country } : {}),
  };
}

function extractPaymentTokenId(result: any): string | null {
  return result?.data?.paymentTokenID
    || result?.data?.paymentDetail?.paymentTokenID
    || result?.data?.paymentDetails?.[0]?.paymentTokenID
    || result?.debug?.responseFromPayerMax?.data?.paymentTokenID
    || result?.debug?.responseFromPayerMax?.data?.paymentDetail?.paymentTokenID
    || result?.debug?.responseFromPayerMax?.data?.paymentDetails?.[0]?.paymentTokenID
    || null;
}

// Provider
export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useLanguage();
  const storedIntegrationMode = (sessionStorage.getItem('subscription.integrationMode') as IntegrationMode) || 'cashier';
  const [subMode, setSubModeState] = useState<SubMode>((sessionStorage.getItem('subscription.subMode') as SubMode) || 'payermax');
  const [integrationMode, setIntegrationModeState] = useState<IntegrationMode>(storedIntegrationMode);
  const [paymentMethod, setPaymentMethodState] = useState<PaymentMethod>(() => {
    const saved = sessionStorage.getItem('subscription.paymentMethod') as PaymentMethod | null;
    if (saved !== null) return saved;
    return storedIntegrationMode === 'cashier' ? '' : 'card';
  });
  const [subscriptionType, setSubscriptionType] = useState<SubscriptionType>((sessionStorage.getItem('subscription.subscriptionType') as SubscriptionType) || 'standard');
  const [formParams, setFormParams] = useState<SubscriptionFormParams>(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem('subscription.formParams') || 'null');
      const nextParams = stored ? { ...DEFAULT_FORM_PARAMS, ...stored } : { ...DEFAULT_FORM_PARAMS };
      if (!nextParams.merchantUserId || nextParams.merchantUserId === 'test1111111') {
        nextParams.merchantUserId = createDemoUserId();
      }
      return nextParams;
    } catch {
      return { ...DEFAULT_FORM_PARAMS, merchantUserId: createDemoUserId() };
    }
  });
  const [currentStepIndex, setCurrentStepIndex] = useState(() => Number(sessionStorage.getItem('subscription.currentStepIndex') || 0));
  const [triggerFlash, setTriggerFlash] = useState(0);

  const [isApiCalling, setIsApiCalling] = useState(false);
  const [lastApiResponse, setLastApiResponse] = useState<any>(() => {
    try {
      return JSON.parse(sessionStorage.getItem('subscription.lastApiResponse') || 'null');
    } catch {
      return null;
    }
  });
  const [lastApiEndpoint, setLastApiEndpoint] = useState<{ method: string; url: string } | null>(() => {
    try {
      return JSON.parse(sessionStorage.getItem('subscription.lastApiEndpoint') || 'null');
    } catch {
      return null;
    }
  });
  const [lastApiRequestBody, setLastApiRequestBody] = useState<string | null>(sessionStorage.getItem('subscription.lastApiRequestBody'));
  const [lastApiResponseBody, setLastApiResponseBody] = useState<string | null>(sessionStorage.getItem('subscription.lastApiResponseBody'));
  const [lastApiSections, setLastApiSections] = useState<SubscriptionContextType['lastApiSections']>(null);
  const lastApiExchangeRef = useRef<ApiExchangeSnapshot | null>(null);
  const [lastApiStepId, setLastApiStepId] = useState<string | null>(sessionStorage.getItem('subscription.lastApiStepId'));
  const [stepApiExchanges, setStepApiExchanges] = useState<Record<string, ApiExchangeSnapshot>>(() => {
    try {
      return JSON.parse(sessionStorage.getItem('subscription.stepApiExchanges') || '{}');
    } catch {
      return {};
    }
  });
  const [subscriptionNo, setSubscriptionNo] = useState<string | null>(sessionStorage.getItem('subscription.subscriptionNo'));
  const [activationRedirectUrl, setActivationRedirectUrl] = useState<string | null>(sessionStorage.getItem('subscription.activationRedirectUrl'));
  const [componentSessionData, setComponentSessionData] = useState<{ sessionKey: string; clientKey: string } | null>(null);
  const [componentPaymentToken, setComponentPaymentToken] = useState<string | null>(null);
  const [mandateTokenId, setMandateTokenId] = useState<string | null>(sessionStorage.getItem('subscription.mandateTokenId'));
  const [mandateBindOrderNo, setMandateBindOrderNo] = useState<string | null>(sessionStorage.getItem('subscription.mandateBindOrderNo'));
  const [mandateTargetOrg, setMandateTargetOrg] = useState<string | null>(sessionStorage.getItem('subscription.mandateTargetOrg'));
  const [mandatePaymentMethod, setMandatePaymentMethod] = useState<string | null>(sessionStorage.getItem('subscription.mandatePaymentMethod'));
  const [subscriptionUserId, setSubscriptionUserId] = useState(sessionStorage.getItem('subscription.subscriptionUserId') || createDemoUserId());

  const flash = useCallback(() => setTriggerFlash(n => n + 1), []);

  useEffect(() => {
    sessionStorage.setItem('subscription.subMode', subMode);
    sessionStorage.setItem('subscription.integrationMode', integrationMode);
    sessionStorage.setItem('subscription.paymentMethod', paymentMethod);
    sessionStorage.setItem('subscription.subscriptionType', subscriptionType);
    sessionStorage.setItem('subscription.formParams', JSON.stringify(formParams));
    sessionStorage.setItem('subscription.currentStepIndex', String(currentStepIndex));
    sessionStorage.setItem('subscription.subscriptionUserId', subscriptionUserId);
    if (subscriptionNo) sessionStorage.setItem('subscription.subscriptionNo', subscriptionNo);
    else sessionStorage.removeItem('subscription.subscriptionNo');
    if (activationRedirectUrl) sessionStorage.setItem('subscription.activationRedirectUrl', activationRedirectUrl);
    else sessionStorage.removeItem('subscription.activationRedirectUrl');
    if (lastApiResponse) sessionStorage.setItem('subscription.lastApiResponse', JSON.stringify(lastApiResponse));
    else sessionStorage.removeItem('subscription.lastApiResponse');
    if (lastApiEndpoint) sessionStorage.setItem('subscription.lastApiEndpoint', JSON.stringify(lastApiEndpoint));
    else sessionStorage.removeItem('subscription.lastApiEndpoint');
    if (lastApiRequestBody) sessionStorage.setItem('subscription.lastApiRequestBody', lastApiRequestBody);
    else sessionStorage.removeItem('subscription.lastApiRequestBody');
    if (lastApiResponseBody) sessionStorage.setItem('subscription.lastApiResponseBody', lastApiResponseBody);
    else sessionStorage.removeItem('subscription.lastApiResponseBody');
    if (lastApiStepId) sessionStorage.setItem('subscription.lastApiStepId', lastApiStepId);
    else sessionStorage.removeItem('subscription.lastApiStepId');
    sessionStorage.setItem('subscription.stepApiExchanges', JSON.stringify(stepApiExchanges));
    if (mandateTokenId) sessionStorage.setItem('subscription.mandateTokenId', mandateTokenId);
    else sessionStorage.removeItem('subscription.mandateTokenId');
    if (mandateBindOrderNo) sessionStorage.setItem('subscription.mandateBindOrderNo', mandateBindOrderNo);
    else sessionStorage.removeItem('subscription.mandateBindOrderNo');
    if (mandateTargetOrg) sessionStorage.setItem('subscription.mandateTargetOrg', mandateTargetOrg);
    else sessionStorage.removeItem('subscription.mandateTargetOrg');
    if (mandatePaymentMethod) sessionStorage.setItem('subscription.mandatePaymentMethod', mandatePaymentMethod);
    else sessionStorage.removeItem('subscription.mandatePaymentMethod');
  }, [
    subMode,
    integrationMode,
    paymentMethod,
    subscriptionType,
    formParams,
    currentStepIndex,
    subscriptionUserId,
    subscriptionNo,
    activationRedirectUrl,
    lastApiResponse,
    lastApiEndpoint,
    lastApiRequestBody,
    lastApiResponseBody,
    lastApiStepId,
    stepApiExchanges,
    mandateTokenId,
    mandateBindOrderNo,
    mandateTargetOrg,
    mandatePaymentMethod
  ]);


  // 步骤数组：根据模式动态计算，前置组件模式会增加一步
  const steps = useMemo(
    () => getStepsForSubMode(subMode, integrationMode),
    [subMode, integrationMode]
  );

  const currentStep = steps[currentStepIndex] ?? steps[0];
  const isFinalStep = currentStepIndex >= steps.length - 1;

  const clearApiDisplay = useCallback(() => {
    setLastApiResponse(null);
    setLastApiEndpoint(null);
    setLastApiRequestBody(null);
    setLastApiResponseBody(null);
    setLastApiSections(null);
    setLastApiStepId(null);
    setStepApiExchanges({});
    lastApiExchangeRef.current = null;
  }, []);

  const clearRuntimeArtifacts = useCallback(() => {
    clearApiDisplay();
    setSubscriptionNo(null);
    setActivationRedirectUrl(null);
    setComponentSessionData(null);
    setComponentPaymentToken(null);
    setMandateTokenId(null);
    setMandateBindOrderNo(null);
    setMandateTargetOrg(null);
    setMandatePaymentMethod(null);
    setSubscriptionUserId(createDemoUserId());
    [
      'subscription.subscriptionNo',
      'subscription.activationRedirectUrl',
      'subscription.lastApiResponse',
      'subscription.lastApiEndpoint',
      'subscription.lastApiRequestBody',
      'subscription.lastApiResponseBody',
      'subscription.lastApiStepId',
      'subscription.stepApiExchanges',
      'subscription.mandateTokenId',
      'subscription.mandateBindOrderNo',
      'subscription.mandateTargetOrg',
      'subscription.mandatePaymentMethod'
    ].forEach(key => sessionStorage.removeItem(key));
  }, [clearApiDisplay]);

  // 实时报文：根据全量状态计算
  // Actions
  const setSubMode = useCallback((m: SubMode) => {
    setSubModeState(m);
    if (m !== 'payermax') {
      setSubscriptionType('standard');
    }
    if (integrationMode === 'cashier') {
      setPaymentMethodState('');
      sessionStorage.setItem('subscription.paymentMethod', '');
    }
    clearRuntimeArtifacts();
    setCurrentStepIndex(0);
    flash();
  }, [flash, integrationMode, clearRuntimeArtifacts]);

  const setIntegrationMode = useCallback((m: IntegrationMode) => {
    // APM is incompatible with component integration.
    if (!isCompatible(paymentMethod, m)) {
      showUiWarning(t('subscription.toast.apmComponentFallback'));
      setIntegrationModeState('cashier');
    } else {
      setIntegrationModeState(m);
    }
    const nextPaymentMethod = m === 'cashier' ? '' : (paymentMethod || 'card');
    setPaymentMethodState(nextPaymentMethod);
    sessionStorage.setItem('subscription.paymentMethod', nextPaymentMethod);
    clearRuntimeArtifacts();
    setCurrentStepIndex(0);
    flash();
  }, [paymentMethod, flash, clearRuntimeArtifacts, t]);

  const setPaymentMethod = useCallback((m: PaymentMethod) => {
    // APM is incompatible with component integration.
    if (!isCompatible(m, integrationMode)) {
      showUiWarning(t('subscription.toast.apmComponentUnsupported'));
      return;
    }
    setPaymentMethodState(m);
    sessionStorage.setItem('subscription.paymentMethod', m);
    
    const isComponentRuntimeStep = integrationMode === 'component'
      && (currentStep?.id?.includes('component') || (subMode === 'payermax' && currentStep?.id === 'pm-2'));
    const isApiSelfHostedRuntimeStep = integrationMode === 'api'
      && (currentStep?.id === 'm-1' || currentStep?.id === 'np-1' || currentStep?.id === 'm-bind' || currentStep?.id === 'np-bind' || currentStep?.id === 'm-order' || currentStep?.id === 'np-order');
      
    if (isComponentRuntimeStep || isApiSelfHostedRuntimeStep) {
      if (m === 'apm') {
        setFormParams(prev => normalizeApmSubscriptionParams(prev));
      } else {
        setFormParams(prev => ({
          ...prev,
          currency: DEFAULT_FORM_PARAMS.currency,
          amount: DEFAULT_FORM_PARAMS.amount,
          trialAmount: DEFAULT_FORM_PARAMS.trialAmount,
          trialPeriodAmount: DEFAULT_FORM_PARAMS.trialPeriodAmount,
          trialAmountCombo: DEFAULT_FORM_PARAMS.trialAmountCombo,
          trialPeriodAmountCombo: DEFAULT_FORM_PARAMS.trialPeriodAmountCombo,
        }));
      }
      flash();
      return;
    }

    clearApiDisplay();
    setComponentPaymentToken(null);
    setMandateTokenId(null);
    setMandateBindOrderNo(null);
    if (m === 'apm') {
      setFormParams(prev => normalizeApmSubscriptionParams(prev));
    } else {
      setFormParams(prev => ({
        ...prev,
        currency: DEFAULT_FORM_PARAMS.currency,
        amount: DEFAULT_FORM_PARAMS.amount,
        trialAmount: DEFAULT_FORM_PARAMS.trialAmount,
        trialPeriodAmount: DEFAULT_FORM_PARAMS.trialPeriodAmount,
        trialAmountCombo: DEFAULT_FORM_PARAMS.trialAmountCombo,
        trialPeriodAmountCombo: DEFAULT_FORM_PARAMS.trialPeriodAmountCombo,
      }));
    }
    setComponentSessionData(null);
    setCurrentStepIndex(0);
    flash();
  }, [integrationMode, currentStep?.id, subMode, flash, clearApiDisplay, t]);

  const updateFormParam = useCallback(<K extends keyof SubscriptionFormParams>(
    key: K, value: SubscriptionFormParams[K]
  ) => {
    setFormParams(prev => ({ ...prev, [key]: value }));
    flash();
  }, [flash]);

  const goNext = useCallback(() => {
    if (!isFinalStep) { setCurrentStepIndex(i => i + 1); flash(); }
  }, [isFinalStep, flash]);

  const goPrev = useCallback(() => {
    if (currentStepIndex > 0) { setCurrentStepIndex(i => i - 1); flash(); }
  }, [currentStepIndex, flash]);

  const goToStep = useCallback((index: number) => {
    if (index >= 0 && index < steps.length) { setCurrentStepIndex(index); flash(); }
  }, [steps.length, flash]);

  const handleActivationCallback = useCallback((callbackData: any) => {
    const boundStep = steps.find(step => ['pm-complete', 'm-bound', 'np-bound'].includes(step.id));
    const boundIndex = steps.findIndex(step => step.id === boundStep?.id);
    
    if (boundIndex >= 0) {
      setCurrentStepIndex(boundIndex);
    } else {
      setCurrentStepIndex(Math.max(steps.length - 1, 0));
    }
    
    const targetStepId = boundStep?.id || 'pm-complete';
    
    setLastApiResponse({
      code: 'SUCCESS',
      msg: 'Subscription activation payment completed',
      data: callbackData
    });
    setLastApiStepId(targetStepId);
    setLastApiEndpoint(null);
    setLastApiRequestBody(null);
    setLastApiResponseBody(JSON.stringify({
      code: 'SUCCESS',
      msg: 'Subscription activation payment completed',
      data: callbackData
    }, null, 2));
    setLastApiSections(null);
    setActivationRedirectUrl(null);
    flash();
  }, [steps, flash]);

  const goToCompleteStep = useCallback(() => {
    const boundStep = steps.find(step => ['pm-complete', 'm-bound', 'np-bound'].includes(step.id));
    const completeIndex = steps.findIndex(step => step.id === boundStep?.id);
    setCurrentStepIndex(completeIndex >= 0 ? completeIndex : Math.max(steps.length - 1, 0));
    setActivationRedirectUrl(null);
    flash();
  }, [steps, flash]);

  const reset = useCallback(() => {
    setCurrentStepIndex(0);
    setFormParams({ ...DEFAULT_FORM_PARAMS, merchantUserId: createDemoUserId() });
    setSubscriptionNo(null);
    setActivationRedirectUrl(null);
    setLastApiResponse(null);
    setLastApiEndpoint(null);
    setLastApiRequestBody(null);
    setLastApiResponseBody(null);
    lastApiExchangeRef.current = null;
    setLastApiSections(null);
    setLastApiStepId(null);
    setStepApiExchanges({});
    setComponentSessionData(null);
    setComponentPaymentToken(null);
    setMandateTokenId(null);
    setMandateBindOrderNo(null);
    setMandateTargetOrg(null);
    setMandatePaymentMethod(null);
    setSubscriptionUserId(createDemoUserId());
    [
      'subscription.subscriptionNo',
      'subscription.activationRedirectUrl',
      'subscription.lastApiResponse',
      'subscription.lastApiEndpoint',
      'subscription.lastApiRequestBody',
      'subscription.lastApiResponseBody',
      'subscription.lastApiStepId',
      'subscription.stepApiExchanges',
      'subscription.mandateTokenId',
      'subscription.mandateBindOrderNo',
      'subscription.mandateTargetOrg',
      'subscription.mandatePaymentMethod'
    ].forEach(key => sessionStorage.removeItem(key));
    flash();
  }, [flash]);

  // API 方法
  const recordApiExchange = useCallback((
    result: any,
    localRequest: { method: string; url: string; body: unknown },
    stepId: string
  ) => {
    const payerMaxRequest = result?.debug?.requestToPayerMax;
    const payerMaxResponse = result?.debug?.responseFromPayerMax;
    const snapshot = {
      endpoint: {
        method: payerMaxRequest?.method || localRequest.method,
        url: payerMaxRequest?.url || localRequest.url,
      },
      requestBody: JSON.stringify(payerMaxRequest?.body || localRequest.body, null, 2),
      responseBody: JSON.stringify(payerMaxResponse || result, null, 2),
    };

    lastApiExchangeRef.current = snapshot;
    setLastApiEndpoint(snapshot.endpoint);
    setLastApiRequestBody(snapshot.requestBody);
    setLastApiResponseBody(snapshot.responseBody);
    setLastApiSections(null);
    setLastApiStepId(stepId);
    setStepApiExchanges(prev => ({ ...prev, [stepId]: snapshot }));
  }, []);

  const buildApiSection = useCallback((
    title: string,
    result: any,
    localRequest: { method: string; url: string; body: unknown }
  ) => {
    const payerMaxRequest = result?.debug?.requestToPayerMax;
    const payerMaxResponse = result?.debug?.responseFromPayerMax;

    return {
      title,
      endpoint: {
        method: payerMaxRequest?.method || localRequest.method,
        url: payerMaxRequest?.url || localRequest.url,
      },
      requestBody: JSON.stringify(payerMaxRequest?.body || localRequest.body, null, 2),
      responseBody: JSON.stringify(payerMaxResponse || result, null, 2),
    };
  }, []);

  const createSubscription = useCallback(async () => {
    setIsApiCalling(true);
    try {
      // All integration modes use the same normalized params (consistent subscriptionPlan)
      const effectiveFormParams = paymentMethod === 'apm'
        ? normalizeApmSubscriptionParams(formParams)
        : normalizeFullCashierSubscriptionParams(formParams);
      const requestBody = {
        subscriptionType,
        formParams: effectiveFormParams,
        userId: subscriptionUserId,
        integrationMode,
        paymentMethod
      };

      const result = await postPayerMaxDemoApi('/api/subscriptionCreate', requestBody);
      setLastApiResponse(result);
      setLastApiStepId('pm-2');
      recordApiExchange(result, {
        method: 'POST',
        url: '/api/subscriptionCreate',
        body: requestBody
      }, 'pm-2');
      
      const resolvedSubscriptionNo = getSubscriptionNoFromResponse(result);

      if (result.code === 'SUCCESS' && resolvedSubscriptionNo) {
        setSubscriptionNo(resolvedSubscriptionNo);
        flash();
        return result;
      } else {
        throw new Error(result.msg || t('subscription.error.createMissingNo'));
      }
    } finally {
      setIsApiCalling(false);
    }
  }, [subscriptionType, formParams, subscriptionUserId, integrationMode, paymentMethod, currentStep.id, flash, recordApiExchange, t]);

  const activateSubscription = useCallback(async (selectedPaymentMethod?: PaymentMethod, stepIdOverride?: string) => {
    if (!subscriptionNo) {
      throw new Error(t('subscription.error.missingSubscriptionNoCreate'));
    }

    setIsApiCalling(true);
    setActivationRedirectUrl(null);
    try {
      const effectivePaymentMethod = selectedPaymentMethod || paymentMethod;
      // All integration modes use the same normalized params (consistent totalAmount)
      const effectiveFormParams = effectivePaymentMethod === 'apm'
        ? normalizeApmSubscriptionParams(formParams)
        : normalizeFullCashierSubscriptionParams(formParams);
      const moneyFields = buildSubscriptionCurrencyCountry(
        integrationMode,
        effectivePaymentMethod,
        effectiveFormParams.currency
      );
      if (subMode === 'payermax' && integrationMode === 'api') {
        delete moneyFields.country;
      }
      
      const requestBody = {
        subscriptionNo,
        subscriptionMode: true,
        integrationMode,
        ...(buildPaymentDetail(effectivePaymentMethod) ? { paymentDetail: buildPaymentDetail(effectivePaymentMethod) } : {}),
        ...buildMitManagementUrl(effectivePaymentMethod),
        amount: calculateActivationAmount(subscriptionType, effectiveFormParams),
        ...moneyFields,
        userId: subscriptionUserId,
        subject: 'PayerMax Subscription Activation'
      };

      const result = await postPayerMaxDemoApi('/api/orderAndPay', requestBody);
      setLastApiResponse(result);
      setLastApiStepId(stepIdOverride || currentStep.id);
      recordApiExchange(result, {
        method: 'POST',
        url: '/api/orderAndPay',
        body: requestBody
      }, stepIdOverride || currentStep.id);
      setActivationRedirectUrl(result?.data?.redirectUrl || null);
      flash();
      return result;
    } finally {
      setIsApiCalling(false);
    }
  }, [subscriptionNo, integrationMode, paymentMethod, subscriptionType, formParams, subscriptionUserId, currentStep.id, flash, recordApiExchange, t]);

  const prepareComponentSession = useCallback(async (stepIdOverride?: string) => {
    setIsApiCalling(true);
    try {
      const isMandateComponent = subMode === 'merchant' || subMode === 'nonperiodic';
      const mandateAmounts = getMandateAmounts(subMode, formParams, paymentMethod);
      // For PayerMax-managed subscriptions, use normalized params to match orderAndPay activation amount
      const normalizedParams = isMandateComponent ? formParams : normalizeFullCashierSubscriptionParams(formParams);
      const componentAmountSource = isMandateComponent ? mandateAmounts.firstBindAmount : calculateActivationAmount(subscriptionType, normalizedParams);
      const componentCurrency = isMandateComponent ? mandateAmounts.currency : normalizedParams.currency;
      const componentCountry = isMandateComponent ? mandateAmounts.country : 'KR';
      const componentMitType = subMode === 'nonperiodic' ? 'UNSCHEDULED' : 'SCHEDULED';
      const requestBody = {
        amount: componentAmountSource,
        currency: componentCurrency,
        country: componentCountry,
        userId: subscriptionUserId,
        mitType: componentMitType,
        tokenForFutureUse: true,
        componentList: ['CARD', 'APPLEPAY', 'GOOGLEPAY'],
      };

      const result = await postPayerMaxDemoApi('/api/applySession', requestBody);
      setLastApiResponse(result);
      setLastApiStepId(stepIdOverride || 'pm-component');
      const localRequest = {
        method: 'POST',
        url: '/api/applySession',
        body: requestBody
      };

      const previousExchange = lastApiExchangeRef.current;

      if (stepIdOverride === 'pm-2' && previousExchange) {
        const applySessionSection = buildApiSection('Step 2B · applySession', result, localRequest);
        lastApiExchangeRef.current = {
          endpoint: applySessionSection.endpoint,
          requestBody: applySessionSection.requestBody,
          responseBody: applySessionSection.responseBody || '',
        };
        setLastApiSections([
          {
            title: 'Step 2A · subscriptionCreate',
            endpoint: previousExchange.endpoint,
            requestBody: previousExchange.requestBody,
            responseBody: previousExchange.responseBody,
          },
          applySessionSection,
        ]);
        setLastApiEndpoint(applySessionSection.endpoint || null);
        setLastApiRequestBody(applySessionSection.requestBody);
        setLastApiResponseBody(applySessionSection.responseBody || null);
        setLastApiStepId('pm-2');
        setStepApiExchanges(prev => ({
          ...prev,
          'pm-2': {
            endpoint: applySessionSection.endpoint,
            requestBody: applySessionSection.requestBody,
            responseBody: applySessionSection.responseBody || '',
            sections: [
              {
                title: 'Step 2A · subscriptionCreate',
                endpoint: previousExchange.endpoint,
                requestBody: previousExchange.requestBody,
                responseBody: previousExchange.responseBody,
              },
              applySessionSection,
            ],
          },
        }));
      } else {
        recordApiExchange(result, localRequest, stepIdOverride || 'pm-component');
      }

      if (result.code === 'APPLY_SUCCESS' && result.data) {
        setComponentSessionData({
          sessionKey: result.data.sessionKey,
          clientKey: result.data.clientKey
        });
      } else {
        throw new Error(result.msg || 'applyDropinSession failed');
      }
      flash();
      return result;
    } finally {
      setIsApiCalling(false);
    }
  }, [subMode, formParams, paymentMethod, subscriptionUserId, flash, recordApiExchange, buildApiSection, lastApiEndpoint, lastApiRequestBody, lastApiResponseBody]);

  const generateComponentToken = useCallback((token?: string) => {
    const resolvedToken = token || `CPT_SUB_DEMO_${Date.now()}`;
    setComponentPaymentToken(resolvedToken);
    flash();
  }, [flash]);

  const getMandateContext = useCallback(() => {
    const isNonPeriodic = subMode === 'nonperiodic';
    const amounts = getMandateAmounts(subMode, formParams, paymentMethod);
    const userId = isNonPeriodic ? subscriptionUserId : formParams.merchantUserId || subscriptionUserId;
    const subject = isNonPeriodic ? 'Flexible auto debit authorization' : formParams.merchantSubject;

    return {
      mitType: amounts.mitType,
      bindAmount: amounts.firstBindAmount,
      deductAmount: amounts.laterDebitAmount,
      currency: amounts.currency,
      country: amounts.country,
      userId,
      subject,
    };
  }, [subMode, paymentMethod, formParams, subscriptionUserId]);

  const bindMandatePaymentMethod = useCallback(async (selectedPaymentMethod?: PaymentMethod, stepIdOverride?: string) => {
    const storedPaymentMethod = (sessionStorage.getItem('subscription.paymentMethod') as PaymentMethod | null) ?? paymentMethod;
    const effectivePaymentMethod = selectedPaymentMethod !== undefined
      ? selectedPaymentMethod
      : integrationMode === 'cashier'
        ? (paymentMethod || storedPaymentMethod || '')
        : paymentMethod;
    if (integrationMode === 'component' && (!componentSessionData?.sessionKey || !componentPaymentToken)) {
      showUiWarning(t('subscription.toast.needOrderAndPayToken'));
      return;
    }
    const context = getMandateContext();
    setIsApiCalling(true);
    setActivationRedirectUrl(null);

    try {
      const moneyFields = buildSubscriptionCurrencyCountry(
        integrationMode,
        effectivePaymentMethod,
        context.currency,
        context.country
      );
      const requestBody = {
        mandateMode: true,
        mandateBusinessMode: subMode,
        integrationMode,
        amount: context.bindAmount,
        ...moneyFields,
        userId: context.userId,
        subject: context.subject,
        ...(integrationMode === 'cashier' && !effectivePaymentMethod
          ? { subscriptionPlan: buildDefaultMandateSubscriptionPlan(), mitManagementUrl: MIT_MANAGEMENT_URL }
          : buildMitManagementUrl(effectivePaymentMethod)),
        paymentDetail: {
          ...(buildPaymentDetail(effectivePaymentMethod) || {}),
          mitType: context.mitType,
          tokenForFutureUse: true,
          merchantInitiated: false,
          ...(componentPaymentToken ? { paymentToken: componentPaymentToken } : {}),
          ...(componentSessionData?.sessionKey ? { sessionKey: componentSessionData.sessionKey } : {}),
        },
      };

      const result = await postPayerMaxDemoApi('/api/orderAndPay', requestBody);
      const tokenId = extractPaymentTokenId(result);
      const bindOrderNo = result?.localOrderNo
        || result?.data?.outTradeNo
        || result?.data?.orderNo
        || result?.debug?.requestToPayerMax?.body?.data?.outTradeNo
        || null;

      if (tokenId) setMandateTokenId(tokenId);
      setMandateBindOrderNo(bindOrderNo);
      setLastApiResponse(result);
      setLastApiStepId(stepIdOverride || currentStep.id);
      recordApiExchange(result, {
        method: 'POST',
        url: '/api/orderAndPay',
        body: requestBody,
      }, stepIdOverride || currentStep.id);
      setActivationRedirectUrl(result?.data?.redirectUrl || null);
      flash();
      return tokenId ? { ...result, localPaymentTokenID: tokenId } : result;
    } finally {
      setIsApiCalling(false);
    }
  }, [paymentMethod, integrationMode, currentStep.id, componentPaymentToken, componentSessionData, getMandateContext, recordApiExchange, flash, t]);

  const queryMandateBindingStatus = useCallback(async (stepIdOverride?: string) => {
    const queryNo = mandateBindOrderNo
      || lastApiResponse?.localOrderNo
      || lastApiResponse?.data?.outTradeNo
      || lastApiResponse?.debug?.requestToPayerMax?.body?.data?.outTradeNo;

    if (!queryNo) {
      showUiWarning(t('subscription.toast.needBindOrder'));
      const localResult = {
        code: 'MISSING_QUERY_PARAMS',
        msg: 'Missing real outTradeNo, unable to query paymentTokenID with orderQuery.',
        data: {
          paymentTokenID: mandateTokenId || null,
          status: 'WAITING_FOR_BIND_ORDER',
        },
      };
      setLastApiResponse(localResult);
      setLastApiStepId(stepIdOverride || currentStep.id);
      flash();
      return localResult;
    }

    setIsApiCalling(true);
    try {
      const requestBody = { outTradeNo: queryNo };
      const result = await postPayerMaxDemoApi('/api/orderQuery', requestBody);
      const tokenId = extractPaymentTokenId(result);
      if (tokenId) setMandateTokenId(tokenId);
      
      const details = result?.data?.paymentDetails || result?.debug?.responseFromPayerMax?.data?.paymentDetails;
      if (details && details.length > 0) {
        const pmt = (details[0].paymentMethodType || details[0].paymentType)?.toUpperCase();
        const targetOrg = details[0].targetOrg;
        
        if (pmt) {
          let mappedMethod = 'apm' as PaymentMethod;
          if (pmt === 'CARD') mappedMethod = 'card';
          else if (pmt === 'APPLEPAY') mappedMethod = 'applepay';
          else if (pmt === 'GOOGLEPAY') mappedMethod = 'googlepay';
          setMandatePaymentMethod(mappedMethod);
          sessionStorage.setItem('subscription.mandatePaymentMethod', mappedMethod);
        }
        if (targetOrg) {
          setMandateTargetOrg(targetOrg);
        }
      }
      setLastApiResponse(result);
      setLastApiStepId(stepIdOverride || currentStep.id);
      recordApiExchange(result, {
        method: 'POST',
        url: '/api/orderQuery',
        body: requestBody,
      }, stepIdOverride || currentStep.id);
      flash();
      return result;
    } finally {
      setIsApiCalling(false);
    }
  }, [mandateBindOrderNo, mandateTokenId, lastApiResponse, currentStep.id, recordApiExchange, flash, t]);

  const deductWithMandateToken = useCallback(async (stepIdOverride?: string) => {
    const context = getMandateContext();
    if (!mandateTokenId) {
      showUiWarning(t('subscription.toast.needMandateToken'));
      return;
    }
    const tokenId = mandateTokenId;
    const effectivePaymentMethod = (mandatePaymentMethod as PaymentMethod) || paymentMethod;
    setIsApiCalling(true);

    try {
      const requestBody = {
        mandateMode: true,
        mandateBusinessMode: subMode,
        subsequentDeduction: true,
        integrationMode: 'api',
        amount: context.deductAmount,
        currency: context.currency,
        country: context.country,
        userId: context.userId,
        subject: `${context.subject} - subsequent debit`,
        ...(subMode === 'merchant' ? {
          subscriptionPlan: {
            merchantSubscriptionNo: `SUB_${context.userId}_${Date.now()}`,
            deductNo: `DEDUCT_${Date.now()}`,
            currentPeriod: 2,
            totalPeriods: formParams.totalPeriods || 36,
            startTime: new Date().toISOString().split('T')[0],
            endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          }
        } : {}),
        ...buildMitManagementUrl(effectivePaymentMethod),
        paymentDetail: {
          ...(buildPaymentDetail(effectivePaymentMethod) || {}),
          ...(mandateTargetOrg ? { targetOrg: mandateTargetOrg } : {}),
          mitType: context.mitType,
          tokenForFutureUse: false,
          merchantInitiated: true,
          paymentTokenID: tokenId,
        },
      };

      const result = await postPayerMaxDemoApi('/api/orderAndPay', requestBody);
      setLastApiResponse(result);
      setLastApiStepId(stepIdOverride || currentStep.id);
      recordApiExchange(result, {
        method: 'POST',
        url: '/api/orderAndPay',
        body: requestBody,
      }, stepIdOverride || currentStep.id);
      flash();
      return result;
    } finally {
      setIsApiCalling(false);
    }
  }, [getMandateContext, mandateTokenId, paymentMethod, mandatePaymentMethod, currentStep.id, recordApiExchange, flash, mandateTargetOrg, subMode, formParams.totalPeriods, t]);

  const activateComponentSubscription = useCallback(async (paymentTokenOverride?: string) => {
    if (!subscriptionNo) {
      showUiWarning(t('subscription.toast.needSubscriptionPlan'));
      return;
    }
    const resolvedPaymentToken = paymentTokenOverride || componentPaymentToken;
    if (!componentSessionData?.sessionKey || !resolvedPaymentToken) {
      showUiWarning(t('subscription.toast.needComponentAuth'));
      return;
    }

    setIsApiCalling(true);
    try {
      const requestBody = {
        subscriptionNo,
        subscriptionMode: true,
        integrationMode: 'component',
        ...buildMitManagementUrl(paymentMethod),
        amount: calculateActivationAmount(subscriptionType, normalizeFullCashierSubscriptionParams(formParams)),
        currency: normalizeFullCashierSubscriptionParams(formParams).currency,
        country: 'ID',
        userId: subscriptionUserId,
        subject: 'PayerMax Subscription Drop-in Activation',
        paymentToken: resolvedPaymentToken,
        sessionKey: componentSessionData.sessionKey
      };

      const result = await postPayerMaxDemoApi('/api/orderAndPay', requestBody);
      setActivationRedirectUrl(result?.data?.redirectUrl || null);
      setLastApiResponse(result);
      setLastApiStepId('pm-component');
      recordApiExchange(result, {
        method: 'POST',
        url: '/api/orderAndPay',
        body: requestBody
      }, 'pm-component');
      flash();
      return result;
    } finally {
      setIsApiCalling(false);
    }
  }, [subscriptionNo, componentSessionData, componentPaymentToken, paymentMethod, subscriptionType, formParams, subscriptionUserId, flash, recordApiExchange, t]);

  const querySubscriptionStatus = useCallback(async (callbackData?: any) => {
    if (!subscriptionNo) {
      throw new Error(t('subscription.error.missingSubscriptionNoQuery'));
    }

    const previousActivation = lastApiResponse;
    const previousActivationData = previousActivation?.debug?.requestToPayerMax?.body?.data || {};
    const previousCallback = previousActivation?.localActivationCallback || {};
    const activationSnapshot = {
      ...previousCallback,
      ...callbackData,
      amount: previousCallback.amount
        || callbackData?.amount
        || previousActivation?.localAmount
        || previousActivationData.totalAmount
        || previousActivationData.amount,
      currency: previousCallback.currency
        || callbackData?.currency
        || previousActivation?.localCurrency
        || previousActivationData.currency,
      outTradeNo: previousCallback.outTradeNo
        || callbackData?.outTradeNo
        || previousActivation?.localOrderNo
        || previousActivation?.data?.outTradeNo
        || previousActivationData.outTradeNo,
      orderAndPayStatus: previousCallback.orderAndPayStatus
        || callbackData?.orderAndPayStatus
        || previousActivation?.data?.status
        || previousActivation?.code,
    };

    setIsApiCalling(true);
    try {
      const requestBody = { subscriptionNo };
      const result = await postPayerMaxDemoApi('/api/subscriptionQuery', requestBody);
      const enrichedResult = {
        ...result,
        localActivationCallback: activationSnapshot,
      };
      setLastApiResponse(enrichedResult);
      setLastApiStepId('pm-complete');
      recordApiExchange(enrichedResult, {
        method: 'POST',
        url: '/api/subscriptionQuery',
        body: requestBody
      }, 'pm-complete');
      flash();
      return enrichedResult;
    } finally {
      setIsApiCalling(false);
    }
  }, [subscriptionNo, lastApiResponse, flash, recordApiExchange, t]);

  const completeActivationWithQuery = useCallback(async (callbackData?: any) => {
    if (subMode === 'merchant' || subMode === 'nonperiodic') {
      const stepId = subMode === 'merchant' ? 'm-bound' : 'np-bound';
      await queryMandateBindingStatus(stepId);
    } else {
      await querySubscriptionStatus(callbackData);
    }
    goToCompleteStep();
  }, [subMode, queryMandateBindingStatus, querySubscriptionStatus, goToCompleteStep]);

  const goNextWithApi = useCallback(async (selectedPaymentMethod?: PaymentMethod) => {
    if (currentStep.id === 'pm-2' && integrationMode === 'component') {
      if (!componentPaymentToken) {
        showUiWarning(t('subscription.toast.needOrderAndPayToken'));
        return;
      }
      await activateComponentSubscription();
      goNext();
      return;
    }

    if (currentStep.id === 'pm-1') {
      // 第一步完成后自动进入创建订阅
      goNext();
    } else if (currentStep.id === 'pm-2') {
      const result = await activateSubscription(selectedPaymentMethod, 'pm-activate');
      if (result.code !== 'APPLY_SUCCESS') {
        throw new Error(result.msg || t('subscription.error.activateFailed'));
      }
      goNext();
    } else if (currentStep.id === 'pm-activate') {
      await activateSubscription(selectedPaymentMethod);
      goNext();
    } else if (currentStep.id === 'm-1' || currentStep.id === 'np-1') {
      if (integrationMode === 'cashier') {
        const result = await bindMandatePaymentMethod(selectedPaymentMethod, currentStep.id === 'm-1' ? 'm-bind' : 'np-bind');
        if (result?.code === 'APPLY_SUCCESS' || result?.code === 'PAY_SUCCESS' || result?.code === 'SUCCESS' || result?.data?.redirectUrl) {
          goNext();
        }
      } else {
        goNext();
      }
    } else if (currentStep.id === 'pm-component') {
      if (!componentSessionData) {
        await prepareComponentSession();
      } else if (!componentPaymentToken) {
        showUiWarning(t('subscription.toast.needOrderAndPayToken'));
      } else {
        await activateComponentSubscription();
      }
    } else if (currentStep.id === 'm-bind' || currentStep.id === 'np-bind') {
      if (integrationMode === 'api') {
        goNext();
      } else {
        const result = await bindMandatePaymentMethod(selectedPaymentMethod, currentStep.id);
        if ((result?.code === 'APPLY_SUCCESS' || result?.code === 'PAY_SUCCESS' || result?.code === 'SUCCESS') && !result?.data?.redirectUrl) {
          goNext();
        }
      }
    } else if (currentStep.id === 'm-component' || currentStep.id === 'np-component') {
      if (!componentSessionData) {
        await prepareComponentSession(currentStep.id);
      } else if (!componentPaymentToken) {
        showUiWarning(t('subscription.toast.needComponentPaymentToken'));
      } else {
        const orderStepId = currentStep.id === 'm-component' ? 'm-order' : 'np-order';
        const result = await bindMandatePaymentMethod(selectedPaymentMethod, orderStepId);
        if (result?.code === 'APPLY_SUCCESS' || result?.code === 'PAY_SUCCESS' || result?.code === 'SUCCESS' || result?.data?.redirectUrl) {
          goNext();
        }
      }
    } else if (currentStep.id === 'm-order' || currentStep.id === 'np-order') {
      if (integrationMode === 'component' && !componentPaymentToken) {
        showUiWarning(t('subscription.toast.needFirstBindToken'));
        return;
      }
      await bindMandatePaymentMethod(selectedPaymentMethod, currentStep.id);
    } else if (currentStep.id === 'm-bound' || currentStep.id === 'np-bound') {
      await queryMandateBindingStatus(currentStep.id);
    } else if (currentStep.id === 'm-deduct' || currentStep.id === 'np-deduct') {
      await deductWithMandateToken(currentStep.id);
    } else {
      goNext();
    }
  }, [currentStep.id, integrationMode, goNext, activateSubscription, componentSessionData, componentPaymentToken, prepareComponentSession, activateComponentSubscription, bindMandatePaymentMethod, queryMandateBindingStatus, deductWithMandateToken, completeActivationWithQuery, paymentMethod, t]);

  return (
    <SubscriptionContext.Provider value={{
      subMode, integrationMode, paymentMethod, subscriptionType, formParams, subscriptionUserId,
      setSubMode, setIntegrationMode, setPaymentMethod, setSubscriptionType, updateFormParam,
      steps, currentStepIndex, currentStep, isFinalStep, triggerFlash,
      goNext, goPrev, goToStep, handleActivationCallback, reset,
      isApiCalling, lastApiResponse, lastApiEndpoint, lastApiRequestBody, lastApiResponseBody, lastApiSections,
      lastApiStepId, stepApiExchanges, subscriptionNo, activationRedirectUrl, componentSessionData, componentPaymentToken, mandateTokenId, mandateBindOrderNo,
      createSubscription, activateSubscription, prepareComponentSession, generateComponentToken, activateComponentSubscription,
      bindMandatePaymentMethod, queryMandateBindingStatus, deductWithMandateToken, querySubscriptionStatus, completeActivationWithQuery, goNextWithApi,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

// Hook
export const useSubscription = () => {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within <SubscriptionProvider>');
  return ctx;
};
