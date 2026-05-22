import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type { PaymentIntegrationMode } from '@/types/payment';
import type { PaymentMethod } from '@/types/subscription';
import type { LinkMode } from '@/types/link';
import { getStandardSteps } from '@/config/standardSteps';
import { buildStandardOrderRequest } from '@/config/standardRequestBuilder';
import { postPayerMaxDemoApi } from '@/services/payermaxClient';
import { showUiError } from '@/lib/uiFeedback';
import { createDemoUserId } from '@/lib/demoIds';

// 鈹€鈹€ 绫诲瀷瀹氫箟 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
export type ProductMode = 'STANDARD' | 'SUBSCRIPTION' | 'PAYMENT_LINK' | 'DISBURSEMENT';

export const MODES_DESC: Record<ProductMode, string> = {
  STANDARD: '标准收单',
  SUBSCRIPTION: '订阅代扣',
  PAYMENT_LINK: '链接支付',
  DISBURSEMENT: '出款业务'
};

interface ProductContextType {
  productMode: ProductMode;
  setProductMode: (mode: ProductMode) => void;
  integrationMode: PaymentIntegrationMode;
  setIntegrationMode: (mode: PaymentIntegrationMode) => void;
  cashierMode: 'ALL' | 'SPECIFIC';
  setCashierMode: (mode: 'ALL' | 'SPECIFIC') => void;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;
  cashierPaymentMethod: PaymentMethod;
  setCashierPaymentMethod: (method: PaymentMethod) => void;
  linkMode: LinkMode;
  setLinkMode: (mode: LinkMode) => void;
  currentStep: string;
  setCurrentStep: (step: string) => void;
  steps: { id: string; label: string }[];
  amount: string;
  currency: string;
  country: string;
  userId: string;
  redirectUrl: string | null;
  lastApiResponse: any;
  setLastApiResponse: (data: any) => void;
  isApiCalling: boolean;
  triggerFlash: number;
  toNextStep: (selectedPaymentMethod?: PaymentMethod) => Promise<void>;
  goPrev: () => void;
  handleStepClick: (stepId: string) => void;
  resetFlow: () => void;
  stepApiExchanges: Record<string, ApiExchange>;
  sessionData: { sessionKey: string; clientKey: string } | null;
  sessionError: string | null;
  paymentToken: string | null;
  setPaymentToken: (token: string | null) => void;
  paymentLinkData: PaymentLinkData | null;
  createPaymentLink: (stepId?: string) => Promise<any>;
  queryPaymentLink: (stepId?: string) => Promise<any>;
  openDashboardLinkDemo: () => void;
  applySession: () => Promise<void>;
  submitComponentOrder: (stepId?: string) => Promise<any>;
  queryOrderStatus: (query?: { outTradeNo?: string; orderNo?: string; tradeToken?: string; stepId?: string }) => Promise<any>;
}

type ApiEndpoint = { method: string; url: string };

export type ApiExchange = {
  endpoint?: ApiEndpoint;
  requestBody?: string;
  responseBody?: string;
  sections?: Array<{
    title: string;
    endpoint?: ApiEndpoint;
    requestBody?: string;
    responseBody?: string;
  }>;
};

type LocalRequest = {
  method: string;
  url: string;
  body: unknown;
};

export type PaymentLinkData = {
  merchantLinkId: string;
  linkId?: string;
  linkUrl?: string;
  qrCodeUrl?: string;
  linkStatus?: string;
  expiresAt?: string;
  totalAmount: string;
  currency: string;
};

const ProductContext = createContext<ProductContextType | undefined>(undefined);

type PaymentResultAction = 'redirect' | 'success' | 'pending' | 'failed';

interface NormalizedPaymentResult {
  ok: boolean;
  nextAction: PaymentResultAction;
  orderNo?: string;
  redirectUrl?: string | null;
  message: string;
}

const normalizePaymentResult = (result: any): NormalizedPaymentResult => {
  const code = result?.code;
  const status = result?.data?.status || result?.data?.payStatus || result?.data?.paymentStatus;
  const redirectUrl = result?.data?.redirectUrl || null;
  const orderNo = result?.localOrderNo || result?.data?.orderNo || result?.data?.outTradeNo;
  const message = result?.msg || result?.message || '未知响应';

  if (code === 'PAY_SUCCESS' || status === 'SUCCESS' || status === 'TRADE_SUCCESS') {
    return { ok: true, nextAction: 'success', orderNo, redirectUrl, message };
  }

  if (code === 'APPLY_SUCCESS') {
    return {
      ok: true,
      nextAction: redirectUrl ? 'redirect' : 'pending',
      orderNo,
      redirectUrl,
      message
    };
  }

  if (code === 'PROCESSING' || status === 'PENDING' || status === 'PROCESSING') {
    return { ok: true, nextAction: 'pending', orderNo, redirectUrl, message };
  }

  return { ok: false, nextAction: 'failed', orderNo, redirectUrl, message };
};

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 鈹€鈹€ 鎸佷箙鍖栦笌鍒濆鍖?鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
  const storedProductMode = sessionStorage.getItem('productMode') as ProductMode;
  const storedIntegrationMode = sessionStorage.getItem('integrationMode') as PaymentIntegrationMode;
  const storedCashierMode = sessionStorage.getItem('cashierMode') as 'ALL' | 'SPECIFIC';
  const storedCurrentStep = sessionStorage.getItem('currentStep');
  const storedPaymentMethod = sessionStorage.getItem('paymentMethod') as PaymentMethod;

  const [productMode, setProductModeState] = useState<ProductMode>(storedProductMode || 'STANDARD');
  const [integrationMode, setIntegrationModeState] = useState<PaymentIntegrationMode>(storedIntegrationMode || 'cashier');
  const [cashierMode, setCashierModeState] = useState<'ALL' | 'SPECIFIC'>(storedCashierMode || 'ALL');
  const [paymentMethod, setPaymentMethodState] = useState<PaymentMethod>(storedPaymentMethod || 'card');
  const [cashierPaymentMethod, setCashierPaymentMethod] = useState<PaymentMethod>('card');
  const [linkMode, setLinkMode] = useState<LinkMode>('dashboard');
  const [currentStep, setCurrentStep] = useState(storedCurrentStep || 's1');
  const [redirectUrl, setRedirectUrl] = useState<string | null>(sessionStorage.getItem('redirectUrl'));
  const [lastApiResponse, setLastApiResponse] = useState<any>(JSON.parse(sessionStorage.getItem('lastApiResponse') || 'null'));
  const [stepApiExchanges, setStepApiExchanges] = useState<Record<string, ApiExchange>>(() => {
    try {
      return JSON.parse(sessionStorage.getItem('standard.stepApiExchanges') || '{}');
    } catch {
      return {};
    }
  });
  const [isApiCalling, setIsApiCalling] = useState(false);
  const [triggerFlash, setTriggerFlash] = useState(0);
  const [sessionData, setSessionData] = useState<{ sessionKey: string; clientKey: string } | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [paymentToken, setPaymentToken] = useState<string | null>(null);
  const [paymentLinkData, setPaymentLinkData] = useState<PaymentLinkData | null>(() => {
    try {
      return JSON.parse(sessionStorage.getItem('paymentLinkData') || 'null');
    } catch {
      return null;
    }
  });

  const amount = "11.00";
  const currency = "USD";
  const country = "ID";
  const subject = "diamond 700";
  const [userId, setUserId] = useState(() => sessionStorage.getItem('standard.userId') || createDemoUserId());

  // 鈹€鈹€ 鎸佷箙鍖栧悓姝?鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
  useEffect(() => {
    sessionStorage.setItem('productMode', productMode);
    sessionStorage.setItem('integrationMode', integrationMode);
    sessionStorage.setItem('cashierMode', cashierMode);
    sessionStorage.setItem('currentStep', currentStep);
    sessionStorage.setItem('paymentMethod', paymentMethod);
    if (redirectUrl) sessionStorage.setItem('redirectUrl', redirectUrl);
    else sessionStorage.removeItem('redirectUrl');
    if (lastApiResponse) sessionStorage.setItem('lastApiResponse', JSON.stringify(lastApiResponse));
    else sessionStorage.removeItem('lastApiResponse');
    if (paymentLinkData) sessionStorage.setItem('paymentLinkData', JSON.stringify(paymentLinkData));
    else sessionStorage.removeItem('paymentLinkData');
    sessionStorage.setItem('standard.stepApiExchanges', JSON.stringify(stepApiExchanges));
    sessionStorage.setItem('standard.userId', userId);
  }, [productMode, integrationMode, cashierMode, currentStep, paymentMethod, redirectUrl, lastApiResponse, stepApiExchanges, paymentLinkData, userId]);

  // 鈹€鈹€ 鎬ц兘浼樺寲锛氱粍浠舵ā寮忓悗鍙伴鍔犺浇 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
  useEffect(() => {
    if (integrationMode === 'component' && currentStep === 's1' && !sessionData && !isApiCalling) {
      console.log('🚀 [Background] Pre-fetching PayerMax Session...');
      applySession();
    }
  }, [integrationMode, currentStep, sessionData]);

  useEffect(() => {
    if (productMode === 'PAYMENT_LINK' && !['l1', 'l2', 'l3'].includes(currentStep)) {
      setCurrentStep('l1');
    }
  }, [productMode, currentStep]);

  // 鈹€鈹€ 娴佺▼瀹氫箟 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
  const steps = useMemo(() => {
    if (productMode === 'STANDARD') {
      return getStandardSteps(integrationMode, cashierMode);
    }
    if (productMode === 'PAYMENT_LINK') {
      return [
        { id: 'l1', label: linkMode === 'api' ? '商品参数/创建链接' : '后台录入/生成链接' },
        { id: 'l2', label: '用户支付' },
        { id: 'l3', label: '查询结果' },
      ];
    }
    return [{ id: 's1', label: '默认步骤' }];
  }, [productMode, integrationMode, cashierMode, linkMode]);

  const getStartStep = (mode = productMode) => (mode === 'PAYMENT_LINK' ? 'l1' : 's1');

  const resetFlow = (startStep?: string) => {
    const safeStartStep = typeof startStep === 'string' ? startStep : getStartStep();
    setCurrentStep(safeStartStep);
    setRedirectUrl(null);
    setLastApiResponse(null);
    setStepApiExchanges({});
    setSessionData(null);
    setSessionError(null);
    setPaymentToken(null);
    setPaymentLinkData(null);
    setUserId(createDemoUserId());
    setTriggerFlash(prev => prev + 1);
  };

  const setProductMode = (mode: ProductMode) => {
    setProductModeState(mode);
    resetFlow(getStartStep(mode));
  };

  const setIntegrationMode = (mode: PaymentIntegrationMode) => {
    setIntegrationModeState(mode);
    resetFlow();
  };

  const setCashierMode = (mode: 'ALL' | 'SPECIFIC') => {
    setCashierModeState(mode);
    resetFlow();
  };

  const setPaymentMethod = (method: PaymentMethod) => {
    setPaymentMethodState(method);
  };

  const setLinkModeWithReset = (mode: LinkMode) => {
    setLinkMode(mode);
    resetFlow('l1');
  };

  const handleStepClick = (stepId: string) => {
    setCurrentStep(stepId);
    setTriggerFlash(prev => prev + 1);
  };

  const goPrev = () => {
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id);
      setTriggerFlash(prev => prev + 1);
    }
  };

  const recordStandardExchange = (stepId: string, result: any, localRequest: LocalRequest) => {
    const payerMaxRequest = result?.debug?.requestToPayerMax;
    const payerMaxResponse = result?.debug?.responseFromPayerMax;
    const exchange: ApiExchange = {
      endpoint: {
        method: payerMaxRequest?.method || localRequest.method,
        url: payerMaxRequest?.url || localRequest.url,
      },
      requestBody: JSON.stringify(payerMaxRequest?.body || localRequest.body, null, 2),
      responseBody: JSON.stringify(payerMaxResponse || result, null, 2),
    };
    setStepApiExchanges(prev => ({ ...prev, [stepId]: exchange }));
  };

  // 鈹€鈹€ 娴佺▼寮曟搸鏍稿績 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
  const toNextStep = async (selectedPaymentMethod?: PaymentMethod) => {
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    if (currentIndex >= steps.length - 1) return;

    const nextStepId = steps[currentIndex + 1].id;

    if (productMode === 'PAYMENT_LINK') {
      if (currentStep === 'l1') {
        if (linkMode === 'api') {
          await createPaymentLink('l1');
          setCurrentStep(nextStepId);
        } else {
          openDashboardLinkDemo();
          setCurrentStep(nextStepId);
        }
      } else if (currentStep === 'l2') {
        await queryPaymentLink(nextStepId);
      } else {
        setCurrentStep(nextStepId);
      }
    } else if (productMode === 'STANDARD') {
      // 1. 鏀堕摱鍙版ā寮忛€昏緫
      if (integrationMode === 'cashier') {
        if (currentStep === 's2' && nextStepId === 's3') {
          setCurrentStep(nextStepId);
        } else if (cashierMode === 'ALL' && currentStep === 's1') {
          await callOrderAndPay(nextStepId);
        } else if (cashierMode === 'SPECIFIC') {
          if (currentStep === 's1') {
            await callOrderAndPay(nextStepId, selectedPaymentMethod);
          } else {
            setCurrentStep(nextStepId);
          }
        } else {
          setCurrentStep(nextStepId);
        }
      } 
      // 2. API 妯″紡閫昏緫锛歵1 鍐呴儴瀹屾垚鑷缓鏀堕摱鍙伴€夋嫨锛岄€夊畬鍚庣洿鎺ヨ皟 orderAndPay 杩涘叆 s2
      else if (integrationMode === 'api') {
        if (currentStep === 's1') {
          await callOrderAndPay(nextStepId, selectedPaymentMethod || paymentMethod);
        } else {
          setCurrentStep(nextStepId);
        }
      }
      // 3. 组件模式逻辑
      else if (integrationMode === 'component') {
        setCurrentStep(nextStepId);
      }
    } else {
      setCurrentStep(nextStepId);
    }
    setTriggerFlash(prev => prev + 1);
  };

  const buildPaymentLinkRequest = () => {
    const merchantLinkId = `PAYLINK_${Date.now()}`;
    return {
      merchantLinkId,
      linkType: 'ONETIME',
      expiresTime: '86400',
      country: 'ID',
      currency: 'IDR',
      totalAmount: '40000',
      language: 'en',
      description: 'PayerMax Smart Watch Pro',
      linkDescription: 'API created demo payment link',
      userInfo: {
        userId,
        username: 'Demo Buyer',
      },
      goodsDetails: [
        {
          goodsName: 'PayerMax Smart Watch Pro',
          goodsDescription: 'Limited Edition Space Gray',
          quantity: '1',
          price: '40000',
          goodsCurrency: 'IDR',
          showUrl: 'https://dummyimage.com/400x400/111827/ffffff&text=PayerMax',
        },
      ],
      merchantInfo: {
        logoUrl: 'https://dummyimage.com/100x100/4f46e5/ffffff&text=PM',
        contactEmail: 'support@example.com',
      },
    };
  };

  const createPaymentLink = async (stepId = currentStep) => {
    setIsApiCalling(true);
    try {
      const requestBody = buildPaymentLinkRequest();
      const result = await postPayerMaxDemoApi('/api/createPaybylink', requestBody);
      setLastApiResponse(result);
      recordStandardExchange(stepId, result, {
        method: 'POST',
        url: '/api/createPaybylink',
        body: requestBody,
      });

      setPaymentLinkData({
        merchantLinkId: result?.data?.merchantLinkId || requestBody.merchantLinkId,
        linkId: result?.data?.linkId,
        linkUrl: result?.data?.linkUrl,
        qrCodeUrl: result?.data?.qrCodeUrl,
        linkStatus: result?.data?.linkStatus,
        expiresAt: result?.data?.expiresAt,
        totalAmount: requestBody.totalAmount,
        currency: requestBody.currency,
      });
      setCurrentStep(stepId);
      return result;
    } finally {
      setIsApiCalling(false);
      setTriggerFlash(prev => prev + 1);
    }
  };

  const queryPaymentLink = async (stepId = currentStep) => {
    const merchantLinkId = paymentLinkData?.merchantLinkId || lastApiResponse?.data?.merchantLinkId;
    if (!merchantLinkId) {
      throw new Error('merchantLinkId is required before queryPaybylink');
    }

    setIsApiCalling(true);
    try {
      const requestBody = { merchantLinkId };
      const result = await postPayerMaxDemoApi('/api/queryPaybylink', requestBody);
      setLastApiResponse(result);
      recordStandardExchange(stepId, result, {
        method: 'POST',
        url: '/api/queryPaybylink',
        body: requestBody,
      });
      setPaymentLinkData(prev => prev ? {
        ...prev,
        linkStatus: result?.data?.linkStatus || prev.linkStatus,
        linkUrl: result?.data?.linkUrl || prev.linkUrl,
        qrCodeUrl: result?.data?.qrCodeUrl || prev.qrCodeUrl,
        expiresAt: result?.data?.expiresAt || prev.expiresAt,
      } : prev);
      setCurrentStep(stepId);
      return result;
    } finally {
      setIsApiCalling(false);
      setTriggerFlash(prev => prev + 1);
    }
  };

  const openDashboardLinkDemo = () => {
    const merchantLinkId = `MMC_LINK_${Date.now()}`;
    setPaymentLinkData({
      merchantLinkId,
      linkId: 'created-in-mmc',
      linkUrl: 'https://www.payermax.link/demo',
      qrCodeUrl: '',
      linkStatus: 'ACTIVE',
      expiresAt: new Date(Date.now() + 86400 * 1000).toISOString(),
      totalAmount: '40000',
      currency: 'IDR',
    });
    setLastApiResponse({
      code: 'MMC_CREATED',
      msg: 'Payment link created in PayerMax Merchant Portal',
      data: {
        merchantLinkId,
        linkStatus: 'ACTIVE',
        linkUrl: 'https://www.payermax.link/demo',
      },
    });
    setTriggerFlash(prev => prev + 1);
  };

  const applySession = async () => {
    if (sessionData || sessionError || isApiCalling) return;

    setIsApiCalling(true);
    setSessionError(null);
    try {
      const requestBody = {
        amount,
        currency,
        country: "ID",
        userId,
        componentList: ["CARD", "APPLEPAY", "GOOGLEPAY"]
      };
      const result = await postPayerMaxDemoApi('/api/applySession', requestBody);
      setLastApiResponse(result);
      recordStandardExchange('s2', result, {
        method: 'POST',
        url: '/api/applySession',
        body: requestBody,
      });
      
      if (result.code === 'APPLY_SUCCESS' && result.data) {
        setSessionData({
          sessionKey: result.data.sessionKey,
          clientKey: result.data.clientKey
        });
      } else {
        setSessionError(result.msg || '会话获取失败');
      }
    } catch (err) {
      const errorMsg = '网络请求失败，请检查服务状态';
      setSessionError(errorMsg);
      console.error('Apply Session Error:', err);
    } finally {
      setIsApiCalling(false);
      setTriggerFlash(prev => prev + 1);
    }
  };

  const submitComponentOrder = async (stepId = currentStep) => {
    if (!paymentToken) {
      console.warn('paymentToken 缺失，无法下单');
      return;
    }

    const requestBody = {
      amount: amount || '11.00',
      currency: currency || 'USD',
      integrationMode: 'component',
      paymentToken,
      sessionKey: sessionData?.sessionKey,
      country: "ID",
      userId,
      subject: "Demo Drop-in Payment"
    };

    setIsApiCalling(true);
    try {
      const result = await postPayerMaxDemoApi('/api/orderAndPay', requestBody);

      const normalized = normalizePaymentResult(result);

      if (normalized.ok) {
        setRedirectUrl(normalized.redirectUrl || null);
        setLastApiResponse(result);
        recordStandardExchange(stepId, result, {
          method: 'POST',
          url: '/api/orderAndPay',
          body: requestBody,
        });
        return result;
      } else {
        showUiError(`支付失败：${normalized.message}`);
        return result;
      }
    } catch (err) {
      console.error('Order Error:', err);
      showUiError('浏览器直连 PayerMax 请求失败');
      throw err;
    } finally {
      setIsApiCalling(false);
      setTriggerFlash(prev => prev + 1);
    }
  };
  // 通用 API 调用方法
  const callOrderAndPay = async (nextStepId: string, overridePaymentMethod?: PaymentMethod) => {
    setIsApiCalling(true);
    try {
      const effectivePaymentMethod = overridePaymentMethod || paymentMethod;
      if (overridePaymentMethod) {
        setPaymentMethodState(overridePaymentMethod);
        setCashierPaymentMethod(overridePaymentMethod);
      }

      const requestBody = buildStandardOrderRequest({
        amount,
        currency,
        country,
        subject,
        userId,
        integrationMode,
        cashierMode,
        paymentMethod: effectivePaymentMethod,
      });

      const result = await postPayerMaxDemoApi('/api/orderAndPay', requestBody);
      const normalized = normalizePaymentResult(result);
      if (normalized.ok) {
        setRedirectUrl(normalized.redirectUrl || null);
        setLastApiResponse(result);
        recordStandardExchange(nextStepId, result, {
          method: 'POST',
          url: '/api/orderAndPay',
          body: requestBody,
        });
        setCurrentStep(nextStepId);
      } else {
        showUiError(`下单失败：${normalized.message}`);
      }
    } catch (error) {
      console.error('API Error:', error);
      showUiError('浏览器直连 PayerMax 请求失败，请检查网络、CORS 或签名配置');
    } finally {
      setIsApiCalling(false);
    }
  };

  const queryOrderStatus = async (query: { outTradeNo?: string; orderNo?: string; tradeToken?: string; stepId?: string } = {}) => {
    const fallbackOutTradeNo = lastApiResponse?.data?.outTradeNo || lastApiResponse?.localOrderNo;
    const fallbackTradeToken = lastApiResponse?.data?.tradeToken;
    const requestBody = {
      outTradeNo: query.outTradeNo || query.orderNo || fallbackOutTradeNo,
      tradeToken: query.tradeToken || fallbackTradeToken,
    };

    if (!requestBody.outTradeNo && !requestBody.tradeToken) {
      throw new Error('缺少 orderQuery 查询参数');
    }

    setIsApiCalling(true);
    try {
      const result = await postPayerMaxDemoApi('/api/orderQuery', requestBody);
      setLastApiResponse(result);
      recordStandardExchange(query.stepId || currentStep, result, {
        method: 'POST',
        url: '/api/orderQuery',
        body: requestBody,
      });
      setTriggerFlash(prev => prev + 1);
      return result;
    } finally {
      setIsApiCalling(false);
    }
  };

  // 鈹€鈹€ 鎶ユ枃妯℃澘鏍稿績 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
  return (
    <ProductContext.Provider value={{
      productMode, setProductMode,
      integrationMode, setIntegrationMode,
      cashierMode, setCashierMode,
      paymentMethod, setPaymentMethod,
      cashierPaymentMethod, setCashierPaymentMethod,
      linkMode, setLinkMode: setLinkModeWithReset,
      currentStep, setCurrentStep,
      steps, amount, currency, country, userId, redirectUrl, lastApiResponse, setLastApiResponse,
      isApiCalling, triggerFlash, toNextStep, goPrev, handleStepClick, resetFlow,
      stepApiExchanges,
      sessionData, sessionError, paymentToken, setPaymentToken,
      paymentLinkData, createPaymentLink, queryPaymentLink, openDashboardLinkDemo,
      applySession, submitComponentOrder, queryOrderStatus
    }}>
      {children}
    </ProductContext.Provider>
  );
};

export const useProduct = () => {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error('useProduct must be used within a ProductProvider');
  }
  return context;
};

