import React from 'react';
import { cn } from '@/lib/utils';

export interface PhoneSimulatorProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  theme?: 'light' | 'dark';
  contentScroll?: boolean;
}

/**
 * iPhone 15 Pro 风格的微拟物手机模拟器
 * 特征：深黑钛金属边框，顶部灵动岛切口，内嵌极简屏幕环境
 */
export const PhoneSimulator = React.forwardRef<HTMLDivElement, PhoneSimulatorProps>(
  ({ className, children, theme = 'dark', contentScroll = true, ...props }, ref) => {
    return (
      <div 
        ref={ref}
        className={cn(
          "relative mx-auto rounded-[3rem] border-[14px] shadow-2xl overflow-hidden",
          "w-[340px] h-[680px]", // 锁死手机大致高宽比例
          "bg-zinc-900 border-zinc-900/90", // 机身外壳颜色深沉金属感
          className
        )}
        {...props}
      >
        {/*
          顶部的 iPhone 灵动岛 (Dynamic Island)
          这是强拟真硬件感的核心
        */}
        <div className="absolute top-0 inset-x-0 h-8 flex justify-center z-50 mt-2 pointer-events-none">
          <div className="w-28 h-7 bg-black rounded-full flex items-center justify-end px-3">
             <div className="w-2 h-2 rounded-full bg-indigo-500/20 mr-1" />
             <div className="w-3 h-3 rounded-full bg-slate-800 shadow-[inset_0_0_2px_rgba(255,255,255,0.1)]" />
          </div>
        </div>

        {/* 音量与电源按键的边缘阴影/微凸起 (非物理，纯CSS视觉辅助) */}
        <div className="absolute top-28 -left-[14px] w-1 h-12 bg-zinc-800 rounded-l-md pointer-events-none" />
        <div className="absolute top-44 -left-[14px] w-1 h-12 bg-zinc-800 rounded-l-md pointer-events-none" />
        <div className="absolute top-36 -right-[14px] w-1 h-16 bg-zinc-800 rounded-r-md pointer-events-none" />

        {/* 
          屏幕渲染层：
          手机内部真实环境的背景底色 
        */}
        <div className={cn(
          "relative w-full h-full rounded-[2.2rem] overflow-hidden transition-colors duration-300",
          theme === 'light' ? 'bg-gray-50 text-slate-900' : 'bg-slate-950 text-slate-100'
        )}>
          {/* iOS 顶栏状态栏占位及小挂件 */}
          <div className="h-12 w-full pt-4 px-6 flex justify-between items-center text-[11px] font-semibold opacity-70 pointer-events-none">
            <span>9:41</span>
            <div className="flex gap-1.5 items-center">
              {/* 简易电量、信号图标刻画 */}
              <div className="w-4 h-2.5 border border-current rounded-[3px] relative flex items-center p-[1px]">
                  <div className="w-2.5 h-full bg-current rounded-[1px]" />
              </div>
            </div>
          </div>
          
          {/* 核心内容注入口：所有表单、收银台页面均填装于此 */}
          <div className={cn(
            "h-[calc(100%-3rem)] relative z-10",
            contentScroll ? "overflow-y-auto scrollbar-hide pb-6" : "overflow-hidden"
          )}>
            {children}
          </div>

          {/* 底部的 iOS Home Indicator */}
          <div className="absolute bottom-1 inset-x-0 h-6 flex justify-center items-center pointer-events-none z-50">
             <div className="w-32 h-1.5 rounded-full bg-black/20 dark:bg-white/20" />
          </div>
        </div>
      </div>
    );
  }
);
PhoneSimulator.displayName = "PhoneSimulator";
