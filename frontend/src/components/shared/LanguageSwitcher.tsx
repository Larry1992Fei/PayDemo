import React from 'react';
import { useLanguage, type Language } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="border-t border-slate-100 bg-white px-6 py-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
          {t('language.title')}
        </span>
        <div className="flex rounded-xl bg-slate-100 p-1">
          {[
            { id: 'zh-CN' as const, label: t('language.zh') },
            { id: 'en-US' as const, label: t('language.en') },
          ].map((item) => {
            const isActive = language === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setLanguage(item.id as Language)}
                className={cn(
                  'h-7 min-w-12 rounded-lg px-3 text-[11px] font-black transition-all',
                  isActive
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
