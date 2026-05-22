import React, { useEffect } from 'react';
import { useProduct } from '@/contexts/ProductContext';
import { Star, ChevronRight, CreditCard, Lock, CheckCircle2, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── 支付方式图标（SVG，非 Emoji） ────────────────────────────────────────────
const CardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={1.8}>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20" />
  </svg>
);

// ─── 官方规范：Apple Pay 按钮 ──────────────────────────────────────────────────
export const OfficialApplePayButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="w-full h-12 bg-black rounded-lg flex items-center justify-center gap-2 cursor-pointer active:opacity-80 transition-opacity"
    aria-label="Buy with Apple Pay"
  >
    <svg width="15" height="18" viewBox="0 0 15 18" fill="white" xmlns="http://www.w3.org/2000/svg" className="mt-[-2px]">
      <path d="M13.478 13.09c-.466.873-1.008 1.723-1.826 1.735-.807.013-1.067-.476-1.99-.476-.924 0-1.213.46-1.975.489-.792.03-1.39-.794-1.862-1.663C4.28 11.063 3.487 8.04 4.68 6.083c.59-.975 1.638-1.592 2.779-1.61.77-.013 1.5.524 1.973.524.471 0 1.357-.645 2.287-.548.389.017 1.483.157 2.185 1.188-.055.036-1.303.77-1.29 2.293.017 1.82 1.593 2.426 1.61 2.432-.017.044-.253.866-.746 1.728zM9.5 2.19c.44-.5 1.163-.877 1.764-.9.079.702-.206 1.41-.624 1.916-.417.511-1.098.91-1.775.855-.09-.693.245-1.416.635-1.871z"/>
    </svg>
    <span className="text-white text-[19px] font-medium tracking-[-0.3px]" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>Pay</span>
  </button>
);

// ─── 官方规范：Google Pay 按钮 ─────────────────────────────────────────────────
export const OfficialGooglePayButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="w-full h-12 bg-white border border-[#dadce0] rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow-sm active:bg-slate-50 transition-colors"
    aria-label="Buy with Google Pay"
  >
    <div className="flex items-center gap-2">
      <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.07-3.71 1.07-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.11c-.22-.66-.35-1.36-.35-2.11s.13-1.45.35-2.11V7.05H2.18a11.99 11.99 0 0 0 0 9.9l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.51 6.16-4.51z" fill="#EA4335"/>
      </svg>
      <span className="text-[#3c4043] text-lg font-medium tracking-tight" style={{ fontFamily: "'Google Sans', Roboto, Arial, sans-serif" }}>Pay</span>
    </div>
  </button>
);

// ─── API 模式专属：带信息展开的收银台 ──────────────────────────────────────
const ApiModeCashier: React.FC<{ amount: string; currency: string }> = ({ amount, currency }) => {
  const { paymentMethod, setPaymentMethod, toNextStep } = useProduct();

  // 默认选中 CARD
  useEffect(() => {
    if (paymentMethod !== 'card' && paymentMethod !== 'applepay' && paymentMethod !== 'googlepay') {
      setPaymentMethod('card');
    }
  }, []);

  const handleConfirm = (method: 'card' | 'applepay' | 'googlepay') => {
    setPaymentMethod(method);
    toNextStep(method);
  };

  return (
    <div className="flex flex-col h-full bg-[#f7f8fa] relative overflow-hidden">
      {/* 顶部金额栏 */}
      <div className="bg-white px-5 py-4 border-b border-slate-100 flex items-center justify-between shadow-sm z-10 relative">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-[10px] text-white font-black">PM</span>
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Checkout</p>
            <p className="text-xs font-extrabold text-slate-800 leading-tight">PayerMax Store</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[9px] text-slate-400 font-bold uppercase">Total</p>
          <p className="text-base font-black text-slate-900">{currency} {parseFloat(amount).toFixed(2)}</p>
        </div>
      </div>

      {/* 支付方式列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-24">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Select Payment Method</p>

        {/* ── Card Row（可展开表单） ── */}
        <div className="rounded-2xl overflow-hidden shadow-sm">
          <button
            onClick={() => setPaymentMethod('card')}
            className={cn(
              "w-full p-3.5 bg-white border flex items-center justify-between transition-all duration-200 cursor-pointer",
              paymentMethod === 'card'
                ? "border-indigo-500 ring-1 ring-indigo-500 rounded-t-2xl rounded-b-none relative z-10"
                : "border-slate-200 rounded-2xl hover:border-slate-300"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <CardIcon />
              </div>
              <div className="text-left">
                <p className="font-bold text-slate-800 text-[13px] leading-tight">Credit / Debit Card</p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Visa, Mastercard, UnionPay</p>
              </div>
            </div>
            <div className={cn(
              "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
              paymentMethod === 'card' ? "border-indigo-500 bg-indigo-500" : "border-slate-300"
            )}>
              {paymentMethod === 'card' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
          </button>

          {/* 展开：卡四要素表单 */}
          {paymentMethod === 'card' && (
            <div className="bg-white border border-t-0 border-indigo-500 rounded-b-2xl px-4 pb-4 pt-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Card Number</label>
                <div className="h-10 bg-slate-50 rounded-xl border border-slate-200 px-3 flex items-center gap-2">
                  <CreditCard className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                  <span className="text-[13px] font-mono font-semibold text-slate-700 tracking-widest">4444 3333 2222 1111</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Expiry Date</label>
                  <div className="h-10 bg-slate-50 rounded-xl border border-slate-200 px-3 flex items-center">
                    <span className="text-[13px] font-mono font-semibold text-slate-700">03 / 30</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    CVV <Lock className="w-2.5 h-2.5" />
                  </label>
                  <div className="h-10 bg-slate-50 rounded-xl border border-slate-200 px-3 flex items-center">
                    <span className="text-[13px] font-mono font-semibold text-slate-500 tracking-widest">• • •</span>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Cardholder Name</label>
                <div className="h-10 bg-slate-50 rounded-xl border border-slate-200 px-3 flex items-center">
                  <span className="text-[13px] font-semibold text-slate-700">James Smith</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 pt-0.5">
                <Lock className="w-3 h-3 text-emerald-500" />
                <span className="text-[9px] font-bold text-emerald-600">256-bit SSL Encrypted · PCI DSS Compliant</span>
              </div>
            </div>
          )}
        </div>

        {/* ── 快速支付分隔线 ── */}
        <div className="flex items-center gap-3 py-2 px-1">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Or pay instantly</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* ── Apple Pay 按钮 ── */}
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <OfficialApplePayButton onClick={() => handleConfirm('applepay')} />
        </div>

        {/* ── Google Pay 按钮 ── */}
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
          <OfficialGooglePayButton onClick={() => handleConfirm('googlepay')} />
        </div>

        {/* 安全页脚 */}
        <div className="flex flex-col items-center justify-center pt-2 pb-6 space-y-2 opacity-60">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-slate-400" />
            <span className="text-[9px] font-bold text-slate-400 tracking-wide uppercase">Secured by PayerMax</span>
          </div>
          <p className="text-[8px] text-slate-400 font-medium">PCI DSS Level 1 Certified · Encrypted Data</p>
        </div>
      </div>

      {/* 吸底确认按钮（仅 Card 选中时显示，保持与之前相同交互） */}
      <div className={cn(
        "absolute bottom-0 inset-x-0 p-4 bg-white/90 backdrop-blur-md border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] transition-transform duration-300 z-20",
        paymentMethod === 'card' ? "translate-y-0" : "translate-y-full"
      )}>
        <button
          onClick={() => handleConfirm('card')}
          className="w-full h-12 font-extrabold rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 active:scale-95 cursor-pointer flex items-center justify-center gap-2 text-sm"
        >
          <CheckCircle2 className="w-4 h-4" />
          Pay with Card
        </button>
        <p className="text-[9px] text-center text-slate-400 mt-2.5 font-medium">
          Secured by PayerMax · Your data is never stored
        </p>
      </div>
    </div>
  );
};

// ─── 收银台模式：指定支付方式（与 API 模式同一设计语言） ────────────────────
const CashierModeCashier: React.FC<{ amount: string; productImageUrl: string }> = ({ amount, productImageUrl }) => {
  const { cashierPaymentMethod, setCashierPaymentMethod, currency, toNextStep } = useProduct();

  const navigate = (id: string) => {
    setCashierPaymentMethod(id as any);
    toNextStep(id as any);
  };

  const cardMethods = [
    { id: 'card', label: 'Credit / Debit Card', sub: 'Visa, Mastercard, UnionPay',  icon: <CardIcon />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { id: 'apm',  label: 'Local Payment (APM)', sub: 'KakaoPay, GCash, OVO & more', icon: <Wallet className="w-4 h-4" />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#f7f8fa]">

      {/* ── 顶部 Header（与 API 模式一致） ── */}
      <div className="bg-white px-5 py-4 border-b border-slate-100 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-[10px] text-white font-black">PM</span>
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Checkout</p>
            <p className="text-xs font-extrabold text-slate-800 leading-tight">PayerMax Store</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[9px] text-slate-400 font-bold uppercase">Total</p>
          <p className="text-base font-black text-slate-900">{currency} {parseFloat(amount).toFixed(2)}</p>
        </div>
      </div>

      {/* ── 商品摘要条（横向紧凑，比 API 模式简单，留更多空间给支付方式） ── */}
      <div className="bg-white border-b border-slate-100 px-5 py-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
          <img src={productImageUrl} alt="Product" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-bold text-slate-800 truncate">PayerMax Smart Watch Pro</p>
          <p className="text-[10px] text-slate-400 font-medium">Limited Edition · Space Gray</p>
        </div>
        <div className="flex items-center gap-1 bg-amber-50 border border-amber-100 rounded-lg px-2 py-0.5">
          <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
          <span className="text-[10px] font-bold text-amber-700">4.9</span>
        </div>
      </div>

      {/* ── 支付方式区 ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Select Payment Method</p>

        {/* Card + APM 列表（点击即跳） */}
        {cardMethods.map((m) => (
          <button
            key={m.id}
            onClick={() => navigate(m.id)}
            className={cn(
              "w-full p-3.5 bg-white rounded-2xl border flex items-center justify-between shadow-sm transition-all duration-200 cursor-pointer hover:border-slate-300 hover:shadow-md",
              cashierPaymentMethod === m.id
                ? "border-indigo-500 ring-2 ring-indigo-100"
                : "border-slate-200"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", m.bg, m.color)}>
                {m.icon}
              </div>
              <div className="text-left">
                <p className="font-bold text-slate-800 text-[13px] leading-tight">{m.label}</p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">{m.sub}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </button>
        ))}

        {/* 分隔线 */}
        <div className="flex items-center gap-3 py-1">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Or pay instantly</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* 官方 Apple Pay 按钮（黑底白字，直接触发） */}
        <OfficialApplePayButton onClick={() => navigate('applepay')} />

        {/* 官方 Google Pay 按钮（白底彩色，直接触发） */}
        <OfficialGooglePayButton onClick={() => navigate('googlepay')} />

        {/* 安全角标 */}
        <div className="flex items-center justify-center gap-1.5 pt-1">
          <Lock className="w-3 h-3 text-slate-400" />
          <span className="text-[9px] font-medium text-slate-400">Secured by PayerMax · PCI DSS Level 1</span>
        </div>
      </div>
    </div>
  );
};


// ─── 路由组件 ──────────────────────────────────────────────────────────────────
export const StepSpecificCashier: React.FC = () => {
  const { integrationMode, amount, currency } = useProduct();
  const productImageUrl = `${import.meta.env.BASE_URL}product.png`;

  if (integrationMode === 'api') {
    return <ApiModeCashier amount={amount} currency={currency} />;
  }

  return <CashierModeCashier amount={amount} productImageUrl={productImageUrl} />;
};
