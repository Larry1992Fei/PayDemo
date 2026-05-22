import type { PaymentIntegrationMode } from '@/types/payment';
import type { PaymentMethod } from '@/types/subscription';
import { PAYMENT_METHOD_CONFIG } from '@/types/subscription';

interface BuildStandardOrderRequestArgs {
  amount: string | number;
  currency: string;
  country: string;
  subject: string;
  userId: string;
  integrationMode: PaymentIntegrationMode;
  cashierMode: 'ALL' | 'SPECIFIC';
  paymentMethod?: PaymentMethod;
}

export const buildStandardOrderRequest = ({
  amount,
  currency,
  country,
  subject,
  userId,
  integrationMode,
  cashierMode,
  paymentMethod,
}: BuildStandardOrderRequestArgs) => {
  const requestBody: Record<string, unknown> = {
    amount,
    currency,
    country,
    subject,
    userId,
    integrationMode,
  };

  if (integrationMode === 'cashier' && cashierMode === 'SPECIFIC') {
    requestBody.cashierMode = 'SPECIFIC';
  }

  if (integrationMode !== 'cashier' || cashierMode === 'SPECIFIC') {
    requestBody.paymentDetail = {
      paymentMethodType: PAYMENT_METHOD_CONFIG[paymentMethod || 'card'].apiType,
    };
  }

  return requestBody;
};
