import React from 'react';
import { ModeSelector } from '@/components/shared/ModeSelector';
import { useProduct } from '@/contexts/ProductContext';

export const Header: React.FC = () => {
  const { productMode, setProductMode } = useProduct();

  return (
    <header className="h-16 shrink-0 bg-white border-b border-slate-200/80 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.03)] flex items-center justify-between px-8 z-30">
      {/* 顶部左侧 Logo 域块 */}
      <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-extrabold pr-0.5">
            P
          </div>
          <div className="font-extrabold text-xl tracking-tighter text-slate-800">
            PayerMax<span className="text-indigo-600 font-light">Hub</span>
          </div>
          <div className="w-1 h-4 bg-slate-200 mx-2" />
          <span className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">
            Interactive Center
          </span>
      </div>

      {/* 顶部中央或右侧 全局业务体系控制器 */}
      <ModeSelector value={productMode} onChange={setProductMode} />
    </header>
  );
};
