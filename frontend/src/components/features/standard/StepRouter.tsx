import React from 'react';
import { useProduct } from '@/contexts/ProductContext';
import { StandardProductPreview } from './ProductPreview';
import { StepCheckout } from './StepCheckout';
import { StepSuccess } from './StepSuccess';
import { StepComponentPayment } from './StepComponentPayment';
import { StepComponentCashier } from './StepComponentCashier';

export const StandardStepRouter: React.FC = () => {
  const { currentStep, integrationMode, cashierMode } = useProduct();

  if (currentStep === 's1') {
    return <StandardProductPreview />;
  }

  if (integrationMode === 'cashier') {
    if (cashierMode === 'SPECIFIC') {
      if (currentStep === 's2') return <StepCheckout />;
      if (currentStep === 's3') return <StepSuccess />;
    }

    if (currentStep === 's2') return <StepCheckout />;
    if (currentStep === 's3') return <StepSuccess />;
  }

  if (integrationMode === 'api') {
    if (currentStep === 's2') return <StepCheckout />;
    if (currentStep === 's3') return <StepSuccess />;
  }

  if (integrationMode === 'component') {
    if (currentStep === 's2') return <StepComponentCashier />;
    if (currentStep === 's3') return <StepComponentPayment />;
    if (currentStep === 's4') return <StepSuccess />;
  }

  return (
    <div className="flex items-center justify-center h-full text-slate-300 text-sm font-bold">
      <div className="text-center space-y-2">
        <div className="text-3xl">PM</div>
        <div>Step {currentStep} is not configured.</div>
      </div>
    </div>
  );
};
