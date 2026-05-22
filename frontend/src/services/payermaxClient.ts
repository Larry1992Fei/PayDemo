import { DEMO_FRONT_CALLBACK_URL, DEMO_MIT_MANAGEMENT_URL, DEMO_NOTIFY_URL } from '@/config/payermaxDemoUrls';
import { buildFirstPeriodStartDate, buildSubscriptionPlan, normalizeApmSubscriptionParams, normalizeFullCashierSubscriptionParams } from '@/types/subscription';
import { createDemoUserId } from '@/lib/demoIds';

const APP_ID = '67eff2f3b29a4ecf9576321185dbf658';
const MERCHANT_NO = 'SDP01010114048893';
const FRONT_CALLBACK_URL = DEMO_FRONT_CALLBACK_URL;
const NOTIFY_URL = DEMO_NOTIFY_URL;
const MIT_MANAGEMENT_URL = DEMO_MIT_MANAGEMENT_URL;

const PAYERMAX = {
  subscriptionCreateUrl: 'https://pay-gate-uat.payermax.com/aggregate-pay/api/gateway/subscriptionCreate',
  subscriptionQueryUrl: 'https://pay-gate-uat.payermax.com/aggregate-pay/api/gateway/subscriptionQuery',
  applySessionUrl: 'https://pay-gate-uat.payermax.com/aggregate-pay/api/gateway/applyDropinSession',
  orderAndPayUrl: 'https://pay-gate-uat.payermax.com/aggregate-pay/api/gateway/orderAndPay',
  orderQueryUrl: 'https://pay-gate-uat.payermax.com/aggregate-pay/api/gateway/orderQuery',
  createPaybylinkUrl: 'https://pay-gate-uat.payermax.com/aggregate-pay/api/gateway/createPaybylink',
  queryPaybylinkUrl: 'https://pay-gate-uat.payermax.com/aggregate-pay/api/gateway/queryPaybylink',
  expirePaybylinkUrl: 'https://pay-gate-uat.payermax.com/aggregate-pay/api/gateway/expirePaybylink',
};

const MERCHANT_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDI+GSYf7qWKLz3aFYJVaa9xv4E2EnEhOc+rEQUR3EpdFiqBVMZWmczTG0OEE88Fv6sWvX9OqRfAPd57wtuu4B6M67LNgz5pFiAOy+G/5l/lEk+bFnoEZIub5CtMPlw2MI9rxyipTHWIV4fHuhrrn1N1Lom+KoSJ5ILUS3Lb2YoueSkmpMORXGTmm1duco02jtfEt9wFwj6xQXIQjoC+g3wqxaqNIIBp2ZpEyJ3NKAjRxkFHhiR1esT1DefSu3WQupUW6llizPbveV0/m9uSml8efPMowGz7Q2LONIjYKos/CSa//85FkQZLEpOPbJPweEqBnqhz2SpAdtZOcD7SSAxAgMBAAECggEAUHGlCqnuDRcndL0N21Sulr5lhZjyBjjQu3SHF7r1IAvTRdM1zSszrgQEjyGWJc5qiKEsX/2uN90SMnuuDtf8+G1hpTPwg6j2R/Xo81eyoK/BlbwXTN5jrjS4K6sz3ajWL4y9oJkRVs4qd7iOfjPtMk9ZaCoXIYc3XVJUS18+/EOeJ5GOQAUP7OKTh7XvzcbKXFOuHHrE9o0mkSVM8HXqaNHObPmeEjoVWvlzILDnsNp0SQ1/BxyFOb5PKuZwIL8A1oL4KY7rpRyUYYD2Du3h5Q32GehqZBPpe1W5ntCoF22PLbS8d3suYlKJLGGy2pbMSaSiD8iorhbgNxIxEgyiVQKBgQD7WdEr5SkQs3G/L+ecYh0YG+NzRqjWqNUX3s9kqDLVmvL4IgGvtr88wsLuirvVAuqnduDTv4CljEuu+r8Zo4NgrJqfe0kggttMwjTkOBr6CQ5BmjzzfCDXCKzMI0NPZvdCwNt8YsFpzg960AJitt7iM4d0Fe7zKCnd61xK7oAQywKBgQDMsAQ9bUC4aWP/3cQNmk7m8Vkvew2rPyuNySsHL1L5xj6j/AEtsbGbGo+TKFJXKAewGpxRWwmR7/645cH4SztDOMKubo5WfJwLyCzNxt5NoLjTzB9XUMlqnnbvcVyXhUYEAUadtegfYU360pFP4x1iKl/M9MuVoekYD6kONwsfcwKBgA0TCfdfjzhILUWFp2WSEPNdGAK6DTRFSfhY5a7VtPc5fSP9GNtcBSyS8PLZkpWs9inJ3D4HexihaJpsfp5FzCKuN8jN7+raA7BFddzdMkIJUI2HCV6c+VRWJi7kMq8hqwD06TXaKTdouZNo2Ibr/kID7irSrUBGuY7KnF1ldJHrAoGBAIy3qYKNXIQrOCtMS59KaVoNrFGfGEuVdxzXovQijbnXl3LnKew/ECngfboea1Ut2PMxqCuqGY8x3f1BPzOyjMBvAjAnI0XEDwdui5bAVE4r40UAPL+rc30QChYc6hnk7riMI/8Cct036QM5xdqU+btmBEyEMn3hPL1k7sUuBECPAoGBANLLW6pIbMVfUMNA+MV9kFRL9WGJDlhNHfjBAGz9JrQngi2DC+uf5VZcgdClE/5lfLKyPxENLlsWHv6BmVEJXC5Wd0miefggbAdJ4lQQr15l9EfCJ5VIbke3POx7j8sZMhkfWKcoPY7iP2K1BNCOdTd4gn7U6zEzZwEbjAIwYFpm
-----END PRIVATE KEY-----`;

type DemoApiPath =
  | '/api/subscriptionCreate'
  | '/api/subscriptionQuery'
  | '/api/applySession'
  | '/api/createPaybylink'
  | '/api/queryPaybylink'
  | '/api/expirePaybylink'
  | '/api/orderAndPay'
  | '/api/orderQuery';

type RequestData = {
  version: string;
  keyVersion: string;
  requestTime: string;
  appId: string;
  merchantNo: string;
  data: Record<string, any>;
};

const subscriptionCache = new Map<string, any>();

function formatRFC3339(date: Date) {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const padMs = (n: number) => (n < 10 ? `00${n}` : n < 100 ? `0${n}` : `${n}`);
  const tzo = -date.getTimezoneOffset();
  const dif = tzo >= 0 ? '+' : '-';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${padMs(date.getMilliseconds())}${dif}${pad(Math.floor(Math.abs(tzo) / 60))}:${pad(Math.abs(tzo) % 60)}`;
}

function baseRequest(version = '1.5'): Omit<RequestData, 'data'> {
  return {
    version,
    keyVersion: '1',
    requestTime: formatRFC3339(new Date()),
    appId: APP_ID,
    merchantNo: MERCHANT_NO,
  };
}

function normalizePaymentMethodInput(type?: string | null): string {
  const normalized = String(type || '').toUpperCase();
  if (!normalized) return '';
  if (normalized.includes('APPLE')) return 'applepay';
  if (normalized.includes('GOOGLE')) return 'googlepay';
  if (normalized.includes('CARD')) return 'card';
  if (normalized.includes('ONE_TOUCH') || normalized.includes('APM') || normalized.includes('KAKAOPAY')) return 'apm';
  return normalized.toLowerCase();
}

function getPaymentMethodType(paymentMethod?: string | null): string | undefined {
  const normalized = normalizePaymentMethodInput(paymentMethod);
  if (!normalized) return undefined;
  if (normalized === 'applepay') return 'APPLEPAY';
  if (normalized === 'googlepay') return 'GOOGLEPAY';
  if (normalized === 'apm') return 'ONE_TOUCH';
  return 'CARD';
}

function getBuyerInfo(userAgent = navigator.userAgent || 'Mozilla/5.0') {
  return {
    firstName: 'Deborah',
    lastName: 'Swinstead',
    email: 'your@gmail.com',
    phoneNo: '0609 031 114',
    address: 'Test Address',
    city: 'Holden Hill',
    region: 'SA',
    zipCode: '5088',
    clientIp: '211.52.321.225',
    userAgent,
  };
}

function buildStandardPaymentDetail(paymentMethod?: string, requestPaymentDetail: Record<string, any> = {}) {
  const resolvedMethod = normalizePaymentMethodInput(paymentMethod) || 'card';
  const detail: Record<string, any> = {
    ...requestPaymentDetail,
    paymentMethodType: getPaymentMethodType(resolvedMethod),
    buyerInfo: requestPaymentDetail.buyerInfo || getBuyerInfo(),
  };
  if (resolvedMethod === 'card') {
    detail.cardInfo = requestPaymentDetail.cardInfo || {
      cardIdentifierNo: '4001563861135570',
      cardHolderFullName: 'James Smith',
      cardExpirationMonth: '03',
      cardExpirationYear: '30',
      cvv: '123',
    };
  } else if (resolvedMethod === 'applepay') {
    detail.applePayPaymentData = requestPaymentDetail.applePayPaymentData || {
      applicationExpirationDate: '2312',
      applicationPrimaryAccountNumber: '4111111111111111',
      currencyCode: 'USD',
      deviceManufacturerIdentifier: 'A1B2C3D4',
      paymentDataType: '3DSecure',
      transactionAmount: '100.00',
      paymentData: { onlinePaymentCryptogram: 'Aa0KZXFURkhF...', eciIndicator: '07' },
      network: 'VISA',
      type: 'credit',
      displayName: 'Visa 0492',
    };
  } else if (resolvedMethod === 'googlepay') {
    detail.googlePayDetails = requestPaymentDetail.googlePayDetails || {
      authMethod: 'PAN_ONLY',
      cardHolderFullName: 'James Smith',
      cardNetwork: 'VISA',
      expirationMonth: '03',
      expirationYear: '2030',
      pan: '4001563861135570',
      description: 'Google Pay standard payment',
    };
  } else if (resolvedMethod === 'apm') {
    detail.targetOrg = requestPaymentDetail.targetOrg || 'KAKAOPAY';
  }
  return detail;
}

function buildStandardComponentPaymentDetail(paymentToken?: string, sessionKey?: string) {
  return {
    paymentToken,
    sessionKey,
    buyerInfo: getBuyerInfo('Chrome'),
  };
}

function buildSubscriptionPaymentDetail(paymentMethod?: string, integrationMode?: string) {
  const hasExplicitPaymentMethod = Boolean(paymentMethod);
  const resolvedMethod = normalizePaymentMethodInput(paymentMethod) || 'card';
  const resolvedIntegration = String(integrationMode || '').toLowerCase();
  const detail: Record<string, any> = {
    mitType: 'SCHEDULED',
    tokenForFutureUse: true,
    merchantInitiated: false,
  };
  if (resolvedIntegration !== 'cashier' || hasExplicitPaymentMethod) {
    detail.paymentMethodType = getPaymentMethodType(resolvedMethod);
  }
  if (resolvedMethod === 'apm' && (resolvedIntegration === 'api' || resolvedIntegration === 'component')) {
    detail.targetOrg = 'KAKAOPAY';
    detail.buyerInfo = getBuyerInfo('Mozilla/5.0 (iPad; CPU OS 18_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22E252');
  }
  if (resolvedIntegration !== 'api') return detail;
  detail.buyerInfo = detail.buyerInfo || getBuyerInfo();
  if (resolvedMethod === 'card') {
    detail.cardInfo = { cardIdentifierNo: '4001563861135570', cardHolderFullName: 'James Smith', cardExpirationMonth: '03', cardExpirationYear: '30', cvv: '123' };
  } else if (resolvedMethod === 'applepay') {
    detail.applePayPaymentData = { applicationExpirationDate: '2312', applicationPrimaryAccountNumber: '4111111111111111', currencyCode: 'USD', deviceManufacturerIdentifier: 'A1B2C3D4', paymentDataType: '3DSecure', transactionAmount: '100.00', paymentData: { onlinePaymentCryptogram: 'Aa0KZXFURkhF...', eciIndicator: '07' }, network: 'VISA', type: 'credit', displayName: 'Visa 0492' };
  } else if (resolvedMethod === 'googlepay') {
    detail.googlePayDetails = { authMethod: 'PAN_ONLY', cardHolderFullName: 'James Smith', cardNetwork: 'VISA', expirationMonth: '03', expirationYear: '2030', pan: '4001563861135570', description: 'Google Pay subscription activation' };
  }
  return detail;
}

function buildSubscriptionComponentPaymentDetail(paymentToken?: string, sessionKey?: string) {
  return {
    paymentToken,
    sessionKey,
    mitType: 'SCHEDULED',
    tokenForFutureUse: true,
    merchantInitiated: false,
    buyerInfo: getBuyerInfo('Chrome'),
  };
}

function buildMerchantManagedWalletSubscriptionPlan(isZeroAmount = false) {
  return {
    subject: 'subject',
    description: 'PMMAX Subscription Payment',
    totalPeriods: 12,
    periodRule: { periodUnit: 'M', periodCount: 1 },
    periodAmount: { amount: 2000, currency: 'KRW' },
    firstPeriodStartDate: buildFirstPeriodStartDate(),
    trialPeriodConfig: { trialPeriodCount: 1, trialPeriodAmount: { amount: 200, currency: 'KRW' } },
    trialConfig: { trialAmount: { amount: isZeroAmount ? 0 : 100, currency: 'KRW' }, trialDays: 7 },
  };
}

function buildMandatePaymentDetail({
  paymentMethod,
  integrationMode,
  mitType,
  tokenForFutureUse,
  merchantInitiated,
  paymentToken,
  sessionKey,
  paymentTokenID,
  subsequentDeduction,
  targetOrg,
}: Record<string, any>) {
  const resolvedMethod = normalizePaymentMethodInput(paymentMethod) || 'card';
  const resolvedIntegration = String(integrationMode || '').toLowerCase();
  const detail: Record<string, any> = {
    mitType: mitType || 'SCHEDULED',
    tokenForFutureUse: tokenForFutureUse !== undefined ? Boolean(tokenForFutureUse) : !subsequentDeduction,
    merchantInitiated: merchantInitiated !== undefined ? Boolean(merchantInitiated) : Boolean(subsequentDeduction),
    buyerInfo: getBuyerInfo(resolvedIntegration === 'component' ? 'Chrome' : 'Mozilla/5.0'),
  };
  if (paymentToken && sessionKey) {
    detail.paymentToken = paymentToken;
    detail.sessionKey = sessionKey;
  }
  const isComponentTokenPayment = resolvedIntegration === 'component' && paymentToken && sessionKey;
  if (!isComponentTokenPayment && (resolvedIntegration !== 'cashier' || paymentMethod)) {
    detail.paymentMethodType = getPaymentMethodType(resolvedMethod);
  }
  if (paymentTokenID) detail.paymentTokenID = paymentTokenID;
  if (targetOrg) detail.targetOrg = targetOrg;
  else if (resolvedMethod === 'apm' && resolvedIntegration === 'api' && !subsequentDeduction) {
    detail.targetOrg = 'KAKAOPAY';
  }
  if (resolvedIntegration !== 'api' || paymentToken || subsequentDeduction) return detail;
  if (resolvedMethod === 'card') {
    detail.cardInfo = { cardIdentifierNo: '4001563861135570', cardHolderFullName: 'James Smith', cardExpirationMonth: '03', cardExpirationYear: '30', cvv: '123' };
  } else if (resolvedMethod === 'applepay') {
    detail.applePayPaymentData = { applicationExpirationDate: '231231', applicationPrimaryAccountNumber: '1234209400123456', currencyCode: '840', deviceManufacturerIdentifier: '040010030273', paymentDataType: '3DSecure', transactionAmount: '100.00', paymentData: { onlinePaymentCryptogram: 'Aa0KZXFURkhF...', eciIndicator: '07' }, network: 'VISA', type: 'credit', displayName: 'Visa 0492' };
  } else if (resolvedMethod === 'googlepay') {
    detail.googlePayDetails = { authMethod: 'PAN_ONLY', cardHolderFullName: 'James Smith', cardNetwork: 'VISA', expirationMonth: '03', expirationYear: '2030', pan: '4001563861135570', description: 'Google Pay mandate binding' };
  }
  return detail;
}

function pemToArrayBuffer(pem: string) {
  const base64 = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

let privateKeyPromise: Promise<CryptoKey> | null = null;

async function getPrivateKey() {
  privateKeyPromise ||= crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(MERCHANT_PRIVATE_KEY),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return privateKeyPromise;
}

async function signRawBody(bodyString: string) {
  const key = await getPrivateKey();
  const signature = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    key,
    new TextEncoder().encode(bodyString)
  );
  const bytes = new Uint8Array(signature);
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

async function sendPayerMax(url: string, requestData: RequestData) {
  const bodyString = JSON.stringify(requestData);
  const sign = await signRawBody(bodyString);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
        sign,
      },
      body: bodyString,
    });
    const text = await response.text();
    const payerMaxResponse = text ? JSON.parse(text) : { code: 'EMPTY_RESPONSE' };
    return {
      payerMaxResponse,
      sign,
      corsBlocked: false,
    };
  } catch (error) {
    return {
      payerMaxResponse: {
        code: 'BROWSER_DIRECT_REQUEST_FAILED',
        msg: error instanceof Error ? error.message : String(error),
        data: null,
      },
      sign,
      corsBlocked: true,
    };
  }
}

function withDebug(response: any, url: string, requestData: RequestData, extra: Record<string, any> = {}) {
  return {
    ...response,
    ...extra,
    debug: {
      requestToPayerMax: {
        method: 'POST',
        url,
        body: requestData,
      },
      responseFromPayerMax: response,
    },
  };
}

function extractPaymentTokenId(result: any): string | null {
  return result?.data?.paymentTokenID
    || result?.data?.paymentDetail?.paymentTokenID
    || result?.data?.paymentDetails?.[0]?.paymentTokenID
    || null;
}

function resolveOrderNo(result: any, outTradeNo: string) {
  return result?.data?.orderNo || result?.data?.outTradeNo || outTradeNo;
}

function buildOrderAndPayRequest(req: Record<string, any>) {
  const requestPaymentDetail = req.paymentDetail || {};
  const paymentMethod = normalizePaymentMethodInput(requestPaymentDetail.paymentMethodType || req.paymentMethodType || req.paymentMethod);
  const paymentToken = req.paymentToken || requestPaymentDetail.paymentToken;
  const sessionKey = req.sessionKey || requestPaymentDetail.sessionKey;
  const paymentTokenID = req.paymentTokenID || requestPaymentDetail.paymentTokenID;
  const mitType = req.mitType || requestPaymentDetail.mitType;
  const tokenForFutureUse = req.tokenForFutureUse !== undefined ? req.tokenForFutureUse : requestPaymentDetail.tokenForFutureUse;
  const merchantInitiated = req.merchantInitiated !== undefined ? req.merchantInitiated : requestPaymentDetail.merchantInitiated;
  const integrationMode = req.integrationMode;
  const subscriptionMode = Boolean(req.subscriptionMode);
  const mandateMode = Boolean(req.mandateMode);
  const isSubscriptionFullCashier = (subscriptionMode || mandateMode) && integrationMode === 'cashier' && !paymentMethod;
  const omitCountry = subscriptionMode && integrationMode === 'api' && req.country === undefined;
  const needsMitManagementUrl = paymentMethod === 'applepay' || paymentMethod === 'googlepay' || isSubscriptionFullCashier;
  const outTradeNo = `ORDER_${Date.now()}`;

  let totalAmountStr = req.amount || req.totalAmount || '2000';
  let finalCurrency = req.currency;
  const cachedSubscription = req.subscriptionNo ? subscriptionCache.get(req.subscriptionNo) : null;
  if (subscriptionMode && req.subscriptionNo && cachedSubscription?.formParams) {
    finalCurrency = cachedSubscription.formParams.currency || 'KRW';
  }
  const finalAmount = Number(totalAmountStr);
  finalCurrency = finalCurrency || (isSubscriptionFullCashier ? 'KRW' : 'USD');

  const dataPayload: Record<string, any> = {
    outTradeNo,
    totalAmount: finalAmount,
    currency: finalCurrency,
    ...(!omitCountry ? { country: req.country || 'ID' } : {}),
    subject: req.subject || (subscriptionMode ? '订阅激活支付' : 'Demo Payment'),
    userId: req.userId || createDemoUserId(),
    reference: req.reference || 'CustomRef',
    frontCallbackUrl: FRONT_CALLBACK_URL,
    notifyUrl: NOTIFY_URL,
    language: 'en',
  };

  if (isSubscriptionFullCashier) {
    dataPayload.currency = 'KRW';
    delete dataPayload.country;
  }

  if (!subscriptionMode && !mandateMode && integrationMode === 'cashier' && req.cashierMode === 'SPECIFIC' && paymentMethod) {
    dataPayload.paymentDetail = {
      ...requestPaymentDetail,
      paymentMethodType: getPaymentMethodType(paymentMethod),
    };
  }

  if (subscriptionMode && req.subscriptionNo) {
    dataPayload.subscriptionPlan = { subscriptionNo: req.subscriptionNo };
    if (paymentMethod === 'apm') {
      dataPayload.country = 'KR';
      dataPayload.currency = 'KRW';
      dataPayload.totalAmount = Math.round(Number(dataPayload.totalAmount) || 0);
    }
    dataPayload.mitManagementUrl = MIT_MANAGEMENT_URL;
    dataPayload.paymentDetail = buildSubscriptionPaymentDetail(paymentMethod, integrationMode);
  }

  if (mandateMode) {
    dataPayload.paymentDetail = buildMandatePaymentDetail({
      paymentMethod,
      integrationMode,
      mitType,
      tokenForFutureUse,
      merchantInitiated,
      paymentToken,
      sessionKey,
      paymentTokenID,
      subsequentDeduction: req.subsequentDeduction,
      targetOrg: requestPaymentDetail.targetOrg,
    });
    if (paymentMethod === 'apm') {
      dataPayload.country = 'KR';
      dataPayload.currency = 'KRW';
      dataPayload.totalAmount = Math.round(Number(dataPayload.totalAmount) || 0);
    }
    if (needsMitManagementUrl) dataPayload.mitManagementUrl = MIT_MANAGEMENT_URL;
    if (req.mandateBusinessMode === 'merchant' && integrationMode === 'cashier' && !paymentMethod) {
      dataPayload.subscriptionPlan = req.subscriptionPlan || buildMerchantManagedWalletSubscriptionPlan(Number(dataPayload.totalAmount) === 0);
    } else if (req.mandateBusinessMode === 'merchant' && (paymentMethod === 'applepay' || paymentMethod === 'googlepay')) {
      dataPayload.subscriptionPlan = req.subscriptionPlan || buildMerchantManagedWalletSubscriptionPlan(Number(dataPayload.totalAmount) === 0);
    }
  }

  if (integrationMode === 'cashier') {
    dataPayload.integrate = 'Hosted_Checkout';
  } else if (integrationMode === 'api') {
    dataPayload.integrate = 'Direct_Payment';
    dataPayload.terminalType = 'WEB';
    if (subscriptionMode) {
      dataPayload.paymentDetail = buildSubscriptionPaymentDetail(paymentMethod, integrationMode);
    } else if (!mandateMode) {
      dataPayload.paymentDetail = buildStandardPaymentDetail(paymentMethod, requestPaymentDetail);
    }
  } else if (integrationMode === 'component') {
    dataPayload.integrate = 'Direct_Payment';
    dataPayload.terminalType = 'WEB';
    dataPayload.paymentDetail = mandateMode
      ? buildMandatePaymentDetail({
          paymentMethod,
          integrationMode,
          mitType,
          tokenForFutureUse,
          merchantInitiated,
          paymentToken,
          sessionKey,
          paymentTokenID,
          subsequentDeduction: req.subsequentDeduction,
          targetOrg: requestPaymentDetail.targetOrg,
        })
      : subscriptionMode
        ? buildSubscriptionComponentPaymentDetail(paymentToken, sessionKey)
        : buildStandardComponentPaymentDetail(paymentToken, sessionKey);
  }

  return {
    requestData: { ...baseRequest('1.5'), data: dataPayload },
    outTradeNo,
    finalAmount,
    finalCurrency,
  };
}

export async function postPayerMaxDemoApi(path: DemoApiPath, body: Record<string, any> = {}) {
  if (path === '/api/subscriptionCreate') {
    const paymentMethod = normalizePaymentMethodInput(body.paymentMethodType || body.paymentMethod);
    const effectiveFormParams = paymentMethod === 'apm'
      ? normalizeApmSubscriptionParams(body.formParams)
      : normalizeFullCashierSubscriptionParams(body.formParams);
    const requestData = {
      ...baseRequest('1.5'),
      data: {
        subscriptionRequestId: `sub_req_${Date.now()}`,
        userId: body.userId,
        callbackUrl: NOTIFY_URL,
        subscriptionPlan: buildSubscriptionPlan(body.subscriptionType, effectiveFormParams),
      },
    };
    const { payerMaxResponse } = await sendPayerMax(PAYERMAX.subscriptionCreateUrl, requestData);
    const subscriptionNo = payerMaxResponse.data?.subscriptionNo || payerMaxResponse.data?.subscriptionPlan?.subscriptionNo;
    if (subscriptionNo) {
      subscriptionCache.set(subscriptionNo, {
        subscriptionRequestId: requestData.data.subscriptionRequestId,
        formParams: effectiveFormParams,
        subscriptionType: body.subscriptionType,
      });
    }
    return withDebug({
      code: payerMaxResponse.code === 'APPLY_SUCCESS' ? 'SUCCESS' : payerMaxResponse.code,
      msg: payerMaxResponse.msg || '成功',
      data: {
        subscriptionNo,
        subscriptionPlan: payerMaxResponse.data?.subscriptionPlan,
        status: payerMaxResponse.data?.status,
        subscriptionRequestId: requestData.data.subscriptionRequestId,
      },
    }, PAYERMAX.subscriptionCreateUrl, requestData);
  }

  if (path === '/api/subscriptionQuery') {
    const cached = body.subscriptionNo ? subscriptionCache.get(body.subscriptionNo) : null;
    const requestData = {
      ...baseRequest('1.5'),
      data: {
        ...(cached?.subscriptionRequestId ? { subscriptionRequestId: cached.subscriptionRequestId } : {}),
        subscriptionNo: body.subscriptionNo,
      },
    };
    const { payerMaxResponse } = await sendPayerMax(PAYERMAX.subscriptionQueryUrl, requestData);
    return withDebug(payerMaxResponse, PAYERMAX.subscriptionQueryUrl, requestData);
  }

  if (path === '/api/applySession') {
    const requestData = {
      ...baseRequest('1.4'),
      data: {
        country: body.country,
        currency: body.currency,
        totalAmount: body.amount,
        userId: body.userId || createDemoUserId(),
        componentList: body.componentList || ['CARD', 'APPLEPAY', 'GOOGLEPAY'],
        ...(body.mitType ? { mitType: body.mitType } : {}),
        ...(body.targetOrg ? { targetOrg: body.targetOrg } : {}),
      },
    };
    const { payerMaxResponse } = await sendPayerMax(PAYERMAX.applySessionUrl, requestData);
    return withDebug(payerMaxResponse, PAYERMAX.applySessionUrl, requestData);
  }

  if (path === '/api/createPaybylink') {
    const requestData = {
      ...baseRequest('1.4'),
      data: {
        merchantLinkId: body.merchantLinkId || `PAYLINK_${Date.now()}`,
        linkType: body.linkType || 'ONETIME',
        expiresTime: body.expiresTime || '86400',
        country: body.country || 'ID',
        currency: body.currency || 'IDR',
        totalAmount: body.totalAmount || '40000',
        language: body.language || 'en',
        description: body.description || 'PayerMax demo payment link',
        linkDescription: body.linkDescription || 'Demo link created by API',
        userInfo: {
          userId: body.userInfo?.userId || createDemoUserId(),
          username: body.userInfo?.username || 'Demo Buyer',
        },
        goodsDetails: body.goodsDetails?.length ? body.goodsDetails : [
          {
            goodsName: 'PayerMax Smart Watch Pro',
            goodsDescription: 'Limited Edition Space Gray',
            quantity: '1',
            price: String(body.totalAmount || '40000'),
            goodsCurrency: body.currency || 'IDR',
            showUrl: 'https://dummyimage.com/400x400/111827/ffffff&text=PayerMax',
          },
        ],
        merchantInfo: {
          logoUrl: body.merchantInfo?.logoUrl || 'https://dummyimage.com/100x100/4f46e5/ffffff&text=PM',
          contactEmail: body.merchantInfo?.contactEmail || 'support@example.com',
        },
        notifyUrl: NOTIFY_URL,
      },
    };
    const { payerMaxResponse } = await sendPayerMax(PAYERMAX.createPaybylinkUrl, requestData);
    return withDebug(payerMaxResponse, PAYERMAX.createPaybylinkUrl, requestData, {
      localPayLink: {
        merchantLinkId: requestData.data.merchantLinkId,
        linkId: payerMaxResponse.data?.linkId,
        linkUrl: payerMaxResponse.data?.linkUrl,
        qrCodeUrl: payerMaxResponse.data?.qrCodeUrl,
        linkStatus: payerMaxResponse.data?.linkStatus || 'UNKNOWN',
        expiresAt: payerMaxResponse.data?.expiresAt,
        amount: requestData.data.totalAmount,
        currency: requestData.data.currency,
      },
    });
  }

  if (path === '/api/queryPaybylink') {
    const requestData = {
      ...baseRequest('1.1'),
      data: { merchantLinkId: body.merchantLinkId },
    };
    const { payerMaxResponse } = await sendPayerMax(PAYERMAX.queryPaybylinkUrl, requestData);
    return withDebug(payerMaxResponse, PAYERMAX.queryPaybylinkUrl, requestData);
  }

  if (path === '/api/expirePaybylink') {
    const requestData = {
      ...baseRequest('1.1'),
      data: { merchantLinkId: body.merchantLinkId },
    };
    const { payerMaxResponse } = await sendPayerMax(PAYERMAX.expirePaybylinkUrl, requestData);
    return withDebug(payerMaxResponse, PAYERMAX.expirePaybylinkUrl, requestData);
  }

  if (path === '/api/orderAndPay') {
    const { requestData, outTradeNo, finalAmount, finalCurrency } = buildOrderAndPayRequest(body);
    const { payerMaxResponse } = await sendPayerMax(PAYERMAX.orderAndPayUrl, requestData);
    const tokenId = extractPaymentTokenId(payerMaxResponse);
    return withDebug(payerMaxResponse, PAYERMAX.orderAndPayUrl, requestData, {
      localOrderNo: resolveOrderNo(payerMaxResponse, outTradeNo),
      localPaymentTokenID: tokenId || undefined,
      localStaticMode: true,
      localAmount: finalAmount,
      localCurrency: finalCurrency,
    });
  }

  if (path === '/api/orderQuery') {
    const requestData = {
      ...baseRequest('1.5'),
      data: { outTradeNo: body.outTradeNo || body.orderNo },
    };
    const { payerMaxResponse } = await sendPayerMax(PAYERMAX.orderQueryUrl, requestData);
    return withDebug(payerMaxResponse, PAYERMAX.orderQueryUrl, requestData);
  }

  return { code: 'UNSUPPORTED_STATIC_API', msg: `${path} is not implemented in static mode.` };
}
