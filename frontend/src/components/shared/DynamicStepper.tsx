import React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface DynamicStepperProps {
  steps: { id: string; label: string }[];
  currentStepId: string;
}

export const DynamicStepper: React.FC<DynamicStepperProps> = ({ steps, currentStepId }) => {
  const currentIndex = steps.findIndex(s => s.id === currentStepId);

  return (
    <div className="w-full">
      <div
        className="grid w-full"
        style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
      >
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <div key={step.id} className="relative min-w-0 group">
              <div className="relative h-4 flex items-center justify-center">
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'absolute left-1/2 top-1/2 z-0 h-[2px] w-full -translate-y-1/2 transition-all duration-700 ease-in-out',
                      (isCompleted || isCurrent) ? 'bg-indigo-600' : 'bg-slate-200'
                    )}
                  />
                )}

                <div
                  className={cn(
                    'relative z-10 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center transition-all duration-500 cursor-default shadow-sm',
                    isCompleted
                      ? 'border-indigo-600 bg-indigo-600'
                      : isCurrent
                        ? 'border-indigo-600 ring-4 ring-indigo-100'
                        : 'border-slate-300'
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isCompleted && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                  {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping" />}
                </div>
              </div>

              <div className="mt-3 flex justify-center">
                <div
                  className={cn(
                    'min-h-[28px] max-w-[96px] text-center text-[11.5px] font-bold leading-tight tracking-wide transition-colors duration-300',
                    (isCompleted || isCurrent) ? 'text-indigo-900' : 'text-slate-400'
                  )}
                >
                  {step.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
