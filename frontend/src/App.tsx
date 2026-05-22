import { useEffect } from 'react';
import { ProductProvider, useProduct } from '@/contexts/ProductContext';
import { SubscriptionProvider, useSubscription } from '@/contexts/SubscriptionContext';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Playzone } from '@/components/layout/Playzone';

function AppContent() {
  const {
    productMode,
    handleStepClick,
    setLastApiResponse,
    steps,
  } = useProduct();
  const { completeActivationWithQuery, handleActivationCallback } = useSubscription();

  useEffect(() => {
    const handleCallback = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const payStatus = urlParams.get('payStatus');
      const status = urlParams.get('status');
      const outTradeNo = urlParams.get('outTradeNo');
      const tradeToken = urlParams.get('tradeToken');
      const orderNo = urlParams.get('orderNo');
      const redirectUrl = window.location.href;
      const isCallbackPath = window.location.pathname === '/callback';
      const isSuccess = ['SUCCESS', 'success'].includes(payStatus || '') || ['SUCCESS', 'success'].includes(status || '');

      const callbackData = {
        outTradeNo: outTradeNo || orderNo || `ORDER_${Date.now()}`,
        tradeToken,
        payStatus: status || payStatus || 'SUCCESS',
        redirectUrl,
      };

      if (isCallbackPath && productMode === 'SUBSCRIPTION') {
        void completeActivationWithQuery(callbackData).catch((error) => {
          console.error('Subscription callback query failed:', error);
          handleActivationCallback({
            ...callbackData,
            queryError: error instanceof Error ? error.message : 'subscriptionQuery failed',
          });
        });
        window.history.replaceState({}, document.title, '/');
        return;
      }

      if ((isCallbackPath || isSuccess) && productMode === 'STANDARD' && (outTradeNo || orderNo || tradeToken)) {
        const successStep = steps[steps.length - 1]?.id || 's3';
        setLastApiResponse({
          code: 'SUCCESS',
          msg: 'Payment return received',
          data: callbackData,
        });
        handleStepClick(successStep);
        window.history.replaceState({}, document.title, '/');
      }
    };

    handleCallback();
    window.addEventListener('popstate', handleCallback);
    return () => window.removeEventListener('popstate', handleCallback);
  }, [
    productMode,
    handleStepClick,
    setLastApiResponse,
    steps,
    completeActivationWithQuery,
    handleActivationCallback,
  ]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50 font-sans text-slate-900">
      <Header />
      <div className="flex flex-1 overflow-hidden relative z-10">
        <Sidebar />
        <Playzone />
      </div>
    </div>
  );
}

function App() {
  return (
    <ProductProvider>
      <SubscriptionProvider>
        <AppContent />
      </SubscriptionProvider>
    </ProductProvider>
  );
}

export default App;
