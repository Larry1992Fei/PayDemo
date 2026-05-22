import type { PaymentIntegrationMode } from '@/types/payment';

export interface StepItem {
  id: string;
  label: string;
}

export const getStandardSteps = (
  integrationMode: PaymentIntegrationMode,
  cashierMode: 'ALL' | 'SPECIFIC'
): StepItem[] => {
  if (integrationMode === 'cashier') {
    return [
      { id: 's1', label: cashierMode === 'SPECIFIC' ? '商品 / 自建收银台' : '商品信息' },
      { id: 's2', label: '下单展示' },
      { id: 's3', label: '支付成功' },
    ];
  }

  if (integrationMode === 'api') {
    return [
      { id: 's1', label: '商品 / 自建收银台' },
      { id: 's2', label: '下单支付' },
      { id: 's3', label: '支付成功' },
    ];
  }

  if (integrationMode === 'component') {
    return [
      { id: 's1', label: '商品信息' },
      { id: 's2', label: '自建收银台' },
      { id: 's3', label: '下单支付' },
      { id: 's4', label: '支付成功' },
    ];
  }

  return [];
};
