import React from 'react';
import { ShoppingBag, Repeat, Link as LinkIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export type ProductMode = 'STANDARD' | 'SUBSCRIPTION' | 'PAYMENT_LINK' | 'DISBURSEMENT';

interface ModeSelectorProps {
  value: ProductMode;
  onChange: (mode: ProductMode) => void;
}

const MODES: { id: ProductMode; icon: React.ReactNode }[] = [
  { id: 'STANDARD', icon: <ShoppingBag className="w-3.5 h-3.5" /> },
  { id: 'SUBSCRIPTION', icon: <Repeat className="w-3.5 h-3.5" /> },
  { id: 'PAYMENT_LINK', icon: <LinkIcon className="w-3.5 h-3.5" /> },
];

export const ModeSelector: React.FC<ModeSelectorProps> = ({ value, onChange }) => {
  const { t } = useLanguage();

  return (
    <div className="flex bg-slate-100/80 p-1 rounded-xl items-center border border-slate-200/50">
      {MODES.map((mode) => {
        const isSelected = value === mode.id;
        return (
          <button
            key={mode.id}
            onClick={() => onChange(mode.id)}
            className={cn(
              'relative flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold transition-all duration-300 select-none',
              isSelected
                ? 'text-indigo-900 bg-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)]'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
            )}
          >
            <span className={cn('transition-colors', isSelected ? 'text-indigo-600' : 'text-slate-400')}>
              {mode.icon}
            </span>
            {t(`mode.${mode.id}`)}
            {isSelected && (
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-600" />
            )}
          </button>
        );
      })}
    </div>
  );
};
