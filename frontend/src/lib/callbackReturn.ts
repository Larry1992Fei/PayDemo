export type CallbackData = {
  outTradeNo: string;
  tradeToken: string | null;
  payStatus: string;
  redirectUrl: string;
  orderNo: string | null;
};

const CALLBACK_PARAM_KEYS = ['outTradeNo', 'tradeToken', 'status', 'payStatus', 'orderNo'];

function getBasePath() {
  return import.meta.env.BASE_URL.replace(/\/$/, '');
}

function getStaticEntryPath() {
  if (typeof window === 'undefined') return null;
  return window.location.pathname.endsWith('/index.html') ? window.location.pathname : null;
}

function hasCallbackParams(params: URLSearchParams) {
  return CALLBACK_PARAM_KEYS.some((key) => params.has(key));
}

export function getCallbackPath() {
  return getStaticEntryPath() || `${getBasePath()}/callback`;
}

export function getCallbackUrl() {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}${getCallbackPath()}`;
}

export function isCallbackUrl(url: string) {
  try {
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.origin : undefined);
    const basePath = getBasePath();
    const staticEntryPath = getStaticEntryPath();
    const callbackPath = `${basePath}/callback`;
    const isCallbackPath = parsed.pathname === callbackPath || parsed.pathname === '/callback';
    const isStaticEntryCallback = Boolean(
      hasCallbackParams(parsed.searchParams)
        && (
          parsed.pathname === staticEntryPath
          || parsed.pathname === `${basePath}/index.html`
          || parsed.pathname.endsWith('/index.html')
        )
    );
    return isCallbackPath || isStaticEntryCallback;
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
