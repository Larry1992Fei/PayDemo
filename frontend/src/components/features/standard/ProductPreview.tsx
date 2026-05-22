import React from 'react';
import { useProduct } from '@/contexts/ProductContext';
import { ShoppingBag, Star, ShieldCheck, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StepSpecificCashier } from './StepSpecificCashier';

/**
 * 标准收单专用的商品详情页预览组件
 * 尊崇架构设计，独立模块化封装
 */
export const StandardProductPreview: React.FC = () => {
  const { amount, currency, toNextStep, integrationMode, cashierMode } = useProduct();
  const [showApiCashier, setShowApiCashier] = React.useState(false);
  const [showSpecificCashier, setShowSpecificCashier] = React.useState(false);

  React.useEffect(() => {
    if (integrationMode !== 'api') {
      setShowApiCashier(false);
    }
    if (integrationMode !== 'cashier' || cashierMode !== 'SPECIFIC') {
      setShowSpecificCashier(false);
    }
  }, [integrationMode, cashierMode]);

  if (integrationMode === 'api' && showApiCashier) {
    return <StepSpecificCashier />;
  }

  if (integrationMode === 'cashier' && cashierMode === 'SPECIFIC' && showSpecificCashier) {
    return <StepSpecificCashier />;
  }

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* 1. 商品主图区 */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-slate-100">
        <img 
          src="/product.png" 
          alt="Premium Gadget" 
          className="w-full h-full object-cover animate-in fade-in zoom-in-95 duration-700"
        />
        <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm">
          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
          <span className="text-[10px] font-bold text-slate-800">4.9</span>
        </div>
      </div>

      {/* 2. 商品简述区 */}
      <div className="flex-1 px-5 pt-5 pb-24 space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h1 className="text-lg font-extrabold text-slate-900 leading-tight">
              PayerMax Premium <br/>Smart Watch Pro
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">Limited Edition • Space Gray</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-indigo-600 block">{currency}</span>
            <span className="text-2xl font-black text-slate-900 leading-none">
              {parseFloat(amount).toFixed(2)}
            </span>
          </div>
        </div>

        {/* 核心卖点小组件 */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100">
            <div className="p-1.5 bg-blue-100/50 rounded-lg"><Truck className="w-3.5 h-3.5 text-blue-600" /></div>
            <span className="text-[9px] font-bold text-slate-500">Free Shipping</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100">
            <div className="p-1.5 bg-emerald-100/50 rounded-lg"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /></div>
            <span className="text-[9px] font-bold text-slate-500">2Y Warranty</span>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</h4>
          <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-3">
            Experience the next level of technology with PayerMax Premium Smart Watch. Featuring an OLED display, advanced heart rate monitoring, and 14-day battery life.
          </p>
        </div>
      </div>

      {/* 3. 底部吸底支付栏 */}
      <div className="absolute bottom-0 inset-x-0 p-5 bg-white/90 backdrop-blur-xl border-t border-slate-100 flex items-center gap-4 z-20">
        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
          <ShoppingBag className="w-6 h-6" />
        </div>
        <button
          onClick={() => {
            if (integrationMode === 'api') {
              setShowApiCashier(true);
              return;
            }
            if (integrationMode === 'cashier' && cashierMode === 'SPECIFIC') {
              setShowSpecificCashier(true);
              return;
            }
            void toNextStep();
          }}
          className={cn(
            "flex-1 h-12 rounded-2xl bg-indigo-600 text-white font-extrabold text-[13px] shadow-lg shadow-indigo-600/30",
            "active:scale-95 transition-all duration-200"
          )}
        >
          Buy Now
        </button>
      </div>
    </div>
  );
};
