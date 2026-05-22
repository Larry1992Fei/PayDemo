export type CallbackData = {
  outTradeNo: string;
  tradeToken: string | null;
  payStatus: string;
  redirectUrl: string;
  orderNo: string | null;
};

export function getCallbackPath() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${basePath}/callback`;
}

export function getCallbackUrl() {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}${getCallbackPath()}`;
}

export function isCallbackUrl(url: string) {
  try {
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.origin : undefined);
    return parsed.pathname === getCallbackPath() || parsed.pathname === '/callback';
  } catch {
    return false;
  }
}

export function parseCallbackData(url: string): CallbackData {
  const parsed = new URL(url, typeof window !== 'undefined' ? window.location.origin : undefined);
  const params = parsed.searchParams;
  const payStatus = params.get('status') || params.get('payStatus') || 'SUCCESS';
  const orderNo = params.get('orderNo');
  const outTradeNo = params.get('outTradeNo') || orderNo || `ORDER_${Date.now()}`;

  return {
    outTradeNo,
    tradeToken: params.get('tradeToken'),
    payStatus,
    redirectUrl: parsed.href,
    orderNo,
  };
}
