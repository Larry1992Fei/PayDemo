import React from 'react';
import { useProduct } from '@/contexts/ProductContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Check, XCircle, Clock3 } from 'lucide-react';

export const StepSuccess: React.FC = () => {
  const { paymentMethod, lastApiResponse, resetFlow, amount, currency, queryOrderStatus } = useProduct();
  const { t } = useLanguage();
  const orderNo = lastApiResponse?.localOrderNo || lastApiResponse?.data?.orderNo || lastApiResponse?.data?.outTradeNo || 'ORDER_PENDING';
  const queryOutTradeNo = lastApiResponse?.data?.outTradeNo || orderNo;
  const tradeToken = lastApiResponse?.data?.tradeToken;
  const [, setQueryState] = React.useState<'idle' | 'syncing' | 'received' | 'failed'>('idle');
  const [orderSnapshot, setOrderSnapshot] = React.useState<any>(null);
  const didQuery = React.useRef(false);

  const syncOrder = React.useCallback(async () => {
    if (!orderNo || orderNo === 'ORDER_PENDING') return;
    const snapshot = lastApiResponse?.debug?.responseFromPayerMax?.data || lastApiResponse?.data;
    if (snapshot) {
      setOrderSnapshot(snapshot);
    }
  }, [orderNo, lastApiResponse]);

  const runOrderQuery = React.useCallback(async () => {
    if (!orderNo || orderNo === 'ORDER_PENDING') return;
    setQueryState('syncing');
    try {
      const result = await queryOrderStatus({ outTradeNo: queryOutTradeNo, tradeToken });
      setOrderSnapshot(result.data);
      setQueryState('received');
    } catch (error) {
      console.error('Order query failed:', error);
      setQueryState('failed');
    }
  }, [orderNo, queryOrderStatus, queryOutTradeNo, tradeToken]);

  const markFrontCallback = React.useCallback(async () => {
    return;
  }, []);

  React.useEffect(() => {
    let timer: number | undefined;
    let cancelled = false;

    markFrontCallback().finally(() => syncOrder()).finally(() => {
      if (cancelled) return;
      if (!didQuery.current) {
        didQuery.current = true;
        timer = window.setTimeout(() => {
          runOrderQuery();
        }, 900);
      }
    });

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [markFrontCallback, runOrderQuery, syncOrder]);

  const queryStatus = lastApiResponse?.data?.status || orderSnapshot?.status || orderSnapshot?.payStatus || 'PENDING';
  const normalizedStatus = String(queryStatus).toUpperCase();
  const isFailed = ['FAILED', 'FAIL', 'PAY_FAILED', 'TRADE_FAILED', 'CANCELLED', 'CANCELED', 'EXPIRED'].includes(normalizedStatus);
  const isSuccess = ['SUCCESS', 'PAY_SUCCESS', 'TRADE_SUCCESS'].includes(normalizedStatus);
  const pageTone = isFailed ? 'red' : isSuccess ? 'emerald' : 'amber';
  const pageTitle = isFailed ? 'Payment Failed' : isSuccess ? 'Payment Successful' : 'Payment Pending';
  const pageSubtitle = t('result.returnReceived');
  const pageClass = pageTone === 'red'
    ? 'bg-red-500 text-white'
    : pageTone === 'amber'
      ? 'bg-amber-500 text-white'
      : 'bg-emerald-500 text-white';
  const glowClass = pageTone === 'red'
    ? 'bg-red-400'
    : pageTone === 'amber'
      ? 'bg-amber-400'
      : 'bg-emerald-400';
  const iconNode = isFailed
    ? <XCircle className="w-8 h-8" />
    : isSuccess
      ? <Check className="w-8 h-8" />
      : <Clock3 className="w-8 h-8" />;

  return (
    <div className={`flex flex-col items-center h-full p-5 text-center space-y-4 animate-in zoom-in-90 duration-500 relative overflow-hidden ${pageClass}`}>
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl opacity-50 ${glowClass}`} />
      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm relative z-10 mt-2">{iconNode}</div>
      <div className="relative z-10 space-y-1">
        <h3 className="text-2xl font-extrabold">{pageTitle}</h3>
        <p className="text-xs font-medium opacity-90 max-w-xs">{pageSubtitle}</p>
      </div>
      <div className="w-full max-w-xs bg-white/10 backdrop-blur-sm rounded-xl p-4 relative z-10">
        <div className="flex justify-between items-center mb-3 pb-3 border-b border-white/20"><span className="text-sm font-medium">{t('result.orderNo')}</span><span className="text-sm font-bold truncate ml-4">{orderNo}</span></div>
        <div className="flex justify-between items-center mb-3 pb-3 border-b border-white/20"><span className="text-sm font-medium">Payment Method</span><span className="text-sm font-bold uppercase">{paymentMethod || 'N/A'}</span></div>
        <div className="flex justify-between items-center mb-3 pb-3 border-b border-white/20"><span className="text-sm font-medium">Total Amount</span><span className="text-lg font-extrabold">{currency} {amount}</span></div>
        <div className="flex justify-between items-center"><span className="text-sm font-medium">Query Status</span><span className="text-sm font-bold">{queryStatus}</span></div>
      </div>
      <div className="w-full pt-4 border-t border-white/20 mt-auto relative z-10">
        <button onClick={() => resetFlow()} className="w-full h-12 bg-white text-emerald-600 font-bold rounded-xl shadow-lg active:scale-95 transition-transform">Start New Payment</button>
      </div>
    </div>
  );
};
