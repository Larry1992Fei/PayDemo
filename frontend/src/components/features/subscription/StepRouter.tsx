/**
 * StepRouter — 订阅步骤路由代理器
 * 根据 currentStep.id 渲染对应的步骤组件，作为 Playzone 内的内容适配器
 */
import React from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { DramaProductPreview } from './DramaProductPreview';
import { StepConfig } from './StepConfig';
import { StepCreatePlan } from './StepCreatePlan';
import { StepActivate } from './StepActivate';
import { StepComponent } from './StepComponent';
import { StepBind } from './StepBind';
import { StepDeduct } from './StepDeduct';
import { StepComplete } from './StepComplete';
import { StepMandateBound } from './StepMandateBound';
import { StepMandateOrder } from './StepMandateOrder';

/**
 * 通过 stepId 前缀匹配路由规则：
 * pm-1       → StepConfig
 * pm-2       → StepCreatePlan
 * pm-activate → StepActivate (cashier / api)
 * pm-component / m-component / np-component → StepComponent
 * pm-complete → StepComplete
 * m-1 / np-1 → StepConfig
 * m-bind / np-bind → StepBind
 * m-deduct / np-deduct → StepDeduct
 */
const STEP_MAP: Record<string, React.FC> = {
  'pm-1':          DramaProductPreview,
  'pm-2':          StepCreatePlan,
  'pm-activate':   StepActivate,
  'pm-component':  StepActivate,
  'pm-complete':   StepComplete,
  'm-1':           StepConfig,
  'm-bind':        StepBind,
  'm-component':   StepComponent,
  'm-order':       StepMandateOrder,
  'm-bound':       StepMandateBound,
  'm-deduct':      StepDeduct,
  'np-1':          StepConfig,
  'np-bind':       StepBind,
  'np-component':  StepComponent,
  'np-order':      StepMandateOrder,
  'np-bound':      StepMandateBound,
  'np-deduct':     StepDeduct,
};

export const StepRouter: React.FC = () => {
  const { currentStep } = useSubscription();
  const StepComponent = STEP_MAP[currentStep?.id];

  if (!StepComponent) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
        未知步骤 ID: {currentStep?.id}
      </div>
    );
  }

  return (
    <div key={currentStep.id} className="animate-in fade-in slide-in-from-right-4 duration-300">
      <StepComponent />
    </div>
  );
};
