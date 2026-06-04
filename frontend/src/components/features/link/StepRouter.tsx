import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, ExternalLink, Link2, Loader2, QrCode, RotateCcw, SearchCheck } from 'lucide-react';
import { useProduct } from '@/contexts/ProductContext';
import { useLanguage } from '@/contexts/LanguageContext';

export const LinkStepRouter: React.FC = () => {
  const { currentStep } = useProduct();

  if (currentStep === 'l1' || currentStep === 's1') return <LinkConfigStep />;
  if (currentStep === 'l2') return <LinkPaymentStep />;
  if (currentStep === 'l3') return <LinkResultStep />;

  return <LinkConfigStep />;
};

const LinkConfigStep: React.FC = () => {
  const { linkMode, toNextStep, isApiCalling } = useProduct();
  const { t } = useLanguage();
  const isApi = linkMode === 'api';

  return (
    <div className="h-full bg-slate-50 flex flex-col">
      <div className="bg-white px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pay by Link</p>
          <h2 className="text-lg font-black text-slate-900">
            {isApi ? t('link.config.apiTitle') : t('link.config.dashboardTitle')}
          </h2>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center">
          <Link2 className="w-5 h-5" />
        </div>
      </div>

      <div className="flex-1 p-5 space-y-4">
        <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm space-y-3">
          <Info label={t('link.product')} value="PayerMax Smart Watch Pro" />
          <Info label={t('link.type')} value="ONETIME" />
          <Info label={t('link.country')} value="ID" />
          <Info label={t('link.amount')} value="IDR 40000" />
          <Info label={t('link.expires')} value={`86400 ${t('link.seconds')}`} />
        </div>

        <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-4">
          <p className="text-xs font-bold text-indigo-900 leading-relaxed">
            {isApi ? t('link.apiHint') : t('link.dashboardHint')}
          </p>
        </div>
      </div>

      <div className="p-5 bg-white border-t border-slate-100">
        <button
          onClick={() => { void toNextStep(); }}
          disabled={isApiCalling}
          className="w-full h-12 rounded-2xl bg-indigo-600 text-white text-sm font-extrabold flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-60"
        >
          {isApiCalling ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {isApi ? t('link.create') : t('link.generate')}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const LinkPaymentStep: React.FC = () => {
  const { paymentLinkData, toNextStep, isApiCalling } = useProduct();
  const { t } = useLanguage();
  const [paymentView, setPaymentView] = useState<'idle' | 'embedded' | 'external'>('idle');
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const linkUrl = paymentLinkData?.linkUrl || 'https://www.payermax.link/demo';
  const qrCodeUrl = paymentLinkData?.qrCodeUrl;

  React.useEffect(() => {
    if (paymentView !== 'embedded' || iframeLoaded) return;

    const timer = window.setTimeout(() => {
      setPaymentView((current) => {
        if (current !== 'embedded') return current;
        window.open(linkUrl, '_blank', 'noopener,noreferrer');
        return 'external';
      });
    }, 3500);

    return () => window.clearTimeout(timer);
  }, [iframeLoaded, linkUrl, paymentView]);

  const openPaymentLink = () => {
    setIframeLoaded(false);
    setPaymentView('embedded');
  };

  const openPaymentLinkExternally = () => {
    window.open(linkUrl, '_blank', 'noopener,noreferrer');
    setPaymentView('external');
  };

  if (paymentView === 'embedded') {
    return (
      <div className="h-full bg-slate-50 flex flex-col">
        <BrowserBar url={linkUrl} />
        <div className="flex-1 bg-white relative overflow-hidden">
          {!iframeLoaded && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-8 text-center bg-slate-50">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
              <h2 className="text-lg font-black text-slate-900">{t('link.opening')}</h2>
              <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-500">
                {t('link.openingHint')}
              </p>
            </div>
          )}
          <iframe
            src={linkUrl}
            onLoad={() => setIframeLoaded(true)}
            className="w-full h-full border-none"
            title="PayerMax Payment Link"
            allow="payment"
            sandbox="allow-scripts allow-popups allow-same-origin allow-top-navigation"
          />
        </div>
        <div className="p-4 bg-white border-t border-slate-100 space-y-2">
          <button
            type="button"
            onClick={openPaymentLinkExternally}
            className="w-full h-11 rounded-2xl bg-white border border-slate-200 text-slate-700 text-sm font-extrabold flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            {t('link.openNewWindow')}
            <ExternalLink className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => { void toNextStep(); }}
            disabled={isApiCalling}
            className="w-full h-11 rounded-2xl bg-indigo-600 text-white text-sm font-extrabold flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-60"
          >
            {isApiCalling ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {t('link.queryAfterPay')}
            <SearchCheck className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (paymentView === 'external') {
    return (
      <div className="h-full bg-slate-50 flex flex-col">
        <BrowserBar url={linkUrl} />
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-5">
            <ExternalLink className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900">{t('link.opened')}</h2>
          <p className="mt-3 text-xs font-semibold leading-relaxed text-slate-500">
            {t('link.openedHint')}
          </p>
        </div>
        <LinkQueryButton onClick={() => { void toNextStep(); }} loading={isApiCalling} />
      </div>
    );
  }

  return (
    <div className="h-full bg-slate-50 flex flex-col">
      <div className="px-5 py-4 bg-white border-b border-slate-100 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">User Payment</p>
          <h2 className="text-lg font-black text-slate-900">{t('link.userPaymentTitle')}</h2>
        </div>
        <QrCode className="w-8 h-8 text-indigo-600" />
      </div>

      <div className="flex-1 p-5 space-y-4 overflow-y-auto">
        <div className="rounded-3xl bg-white border border-slate-200 p-5 shadow-sm text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment QR Code</p>
          <div className="mt-4 mx-auto w-48 h-48 rounded-3xl border border-slate-100 bg-slate-50 flex items-center justify-center overflow-hidden">
            {qrCodeUrl ? (
              <img src={qrCodeUrl} alt="PayerMax payment QR code" className="w-full h-full object-contain p-2" />
            ) : (
              <QrCode className="w-24 h-24 text-slate-300" />
            )}
          </div>
          <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-100 px-3 py-2 text-[10px] font-bold text-slate-600 break-all text-left">
            {linkUrl}
          </div>
        </div>

        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-black text-emerald-900">{t('link.returned')}</p>
            <p className="text-[11px] font-semibold text-emerald-700 leading-relaxed mt-1">
              {t('link.returnedHint')}
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 bg-white border-t border-slate-100 space-y-2">
        <button
          onClick={openPaymentLink}
          className="w-full h-12 rounded-2xl bg-indigo-600 text-white text-sm font-extrabold flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          {t('link.openPayment')}
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const LinkResultStep: React.FC = () => {
  const { lastApiResponse, paymentLinkData, isApiCalling, linkMode, resetFlow } = useProduct();
  const { t } = useLanguage();
  const data = lastApiResponse?.data || {};
  const linkStatus = data.linkStatus || paymentLinkData?.linkStatus || 'ACTIVE';
  const payInfo = Array.isArray(data.payByLinkInfo) ? data.payByLinkInfo[0] : null;
  const payStatus = payInfo?.status || (linkMode === 'dashboard' ? 'WAITING_FOR_USER_PAYMENT' : 'WAITING');

  return (
    <div className="h-full bg-emerald-500 text-white flex flex-col items-center p-5 text-center space-y-4">
      <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mt-2">
        <SearchCheck className="w-8 h-8" />
      </div>
      <div>
        <h2 className="text-2xl font-black">{t('link.resultTitle')}</h2>
        <p className="text-xs font-semibold text-white/85 mt-1">{t('link.resultHint')}</p>
      </div>

      <div className="w-full rounded-2xl bg-white/15 border border-white/20 p-4 text-left space-y-3">
        <Info light label="Link Status" value={linkStatus} />
        <Info light label="Pay Status" value={payStatus} />
        <Info light label="Merchant Link ID" value={data.merchantLinkId || paymentLinkData?.merchantLinkId || 'N/A'} />
        <Info light label="Amount" value={`${data.currency || paymentLinkData?.currency || 'IDR'} ${data.totalAmount || paymentLinkData?.totalAmount || '40000'}`} />
      </div>

      <div className="w-full rounded-2xl bg-white/10 border border-white/15 p-3 text-left">
        <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Merchant Notes</p>
        <p className="text-xs font-semibold leading-relaxed mt-2">
          {t('link.merchantNotes')}
        </p>
      </div>

      <button
        onClick={() => resetFlow()}
        disabled={isApiCalling || linkMode === 'dashboard'}
        className="mt-auto w-full h-12 rounded-2xl bg-white text-emerald-600 text-sm font-black flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {t('link.createNew')}
        <RotateCcw className="w-4 h-4" />
      </button>
    </div>
  );
};

const BrowserBar: React.FC<{ url: string }> = ({ url }) => (
  <div className="h-10 bg-slate-50 flex items-center px-4 gap-2 border-b border-slate-100 flex-none">
    <div className="flex gap-1">
      {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-200" />)}
    </div>
    <div className="flex-1 bg-white h-6 rounded-md border border-slate-100 flex items-center px-3 text-[9px] text-slate-400 truncate">
      <span className="text-emerald-500 mr-1 font-bold">https://</span>{url.split('//')[1] || url}
    </div>
  </div>
);

const LinkQueryButton: React.FC<{ onClick: () => void; loading?: boolean }> = ({ onClick, loading }) => {
  const { t } = useLanguage();

  return (
    <div className="p-5 bg-white border-t border-slate-100">
      <button
        onClick={onClick}
        disabled={loading}
        className="w-full h-12 rounded-2xl bg-indigo-600 text-white text-sm font-extrabold flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-60"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {t('link.queryAfterPay')}
        <SearchCheck className="w-4 h-4" />
      </button>
    </div>
  );
};

const Info: React.FC<{ label: string; value: string; light?: boolean }> = ({ label, value, light }) => (
  <div className="flex items-center justify-between gap-4">
    <span className={`text-[10px] font-black uppercase tracking-widest ${light ? 'text-white/60' : 'text-slate-400'}`}>{label}</span>
    <span className={`text-xs font-black truncate ${light ? 'text-white' : 'text-slate-800'}`}>{value}</span>
  </div>
);
