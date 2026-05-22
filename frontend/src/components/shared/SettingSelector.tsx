import React from 'react';
import { cn } from '@/lib/utils';

export interface Option {
  id: string;
  label: string;
  desc?: string;
  additionalInfo?: React.ReactNode;
}

interface SettingSelectorProps {
  options: Option[];
  value: string;
  onChange: (id: string) => void;
  type?: 'card' | 'radio';
  name?: string; // used for radio name
  className?: string;
}

/**
 * 尊崇架构设计的通用配置选择器 (Common Config Selector)
 * 支持卡片式 (CARD) 和 单选框式 (RADIO) 两种预设视觉模式
 */
export const SettingSelector: React.FC<SettingSelectorProps> = ({
  options,
  value,
  onChange,
  type = 'card',
  name = 'setting-group',
  className
}) => {
  return (
    <div className={cn("space-y-1.5", className)}>
      {options.map((option) => {
        const isActive = value === option.id;

        // ─── 模式 A：卡片式 (CARD) ───────────────────────────────────────────
        if (type === 'card') {
          return (
            <div
              key={option.id}
              className={cn(
                "w-full rounded-xl border transition-all relative overflow-hidden",
                isActive
                  ? "border-indigo-600 bg-indigo-50/40"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer"
              )}
              onClick={() => !isActive && onChange(option.id)}
            >
              {/* 点击区域覆盖层 (仅在未激活时生效，或者作为整体背景) */}
              <div className="p-3">
                <div className="flex flex-col relative">
                  {/* 左侧蓝色激活竖线 */}
                  {isActive && (
                    <div className="absolute -left-3 top-0 bottom-0 w-[3px] rounded-full bg-indigo-600" />
                  )}
                  <div className={cn(
                    "text-[12px] font-bold leading-tight", 
                    isActive ? "text-indigo-800" : "text-slate-700"
                  )}>
                    {option.label}
                  </div>
                  {option.desc && (
                    <div className="text-[11px] text-slate-400 mt-0.5">{option.desc}</div>
                  )}
                </div>

                {/* 额外的交互内容 (仅在激活时展示) */}
                {isActive && option.additionalInfo && (
                  <div className="mt-3 pt-3 border-t border-indigo-200/50" onClick={(e) => e.stopPropagation()}>
                    {option.additionalInfo}
                  </div>
                )}
              </div>
            </div>
          );
        }

        // ─── 模式 B：单选框式 (RADIO) ────────────────────────────────────────
        return (
          <label 
            key={option.id} 
            className="flex items-center gap-2.5 px-2 py-2 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
          >
            <input
              type="radio"
              name={name}
              value={option.id}
              checked={isActive}
              onChange={() => onChange(option.id)}
              className="accent-indigo-600 w-3.5 h-3.5 cursor-pointer"
            />
            <span className={cn(
              "text-[12px] font-semibold", 
              isActive ? "text-indigo-700" : "text-slate-600",
              option.desc ? "font-bold tracking-wider" : "" // Handle slight differences in Payment Method style
            )}>
              {option.label}
            </span>
          </label>
        );
      })}
    </div>
  );
};
