/**
 * Standard Payment Domain Type Definitions
 * 标准收单业务领域的 TypeScript 类型系统
 */

export type PaymentIntegrationMode = 'cashier' | 'api' | 'component';

export const PAYMENT_INTEGRATION_CONFIG: Record<PaymentIntegrationMode, { label: string; apiValue: string; desc: string }> = {
  cashier: { 
    label: '收银台模式', 
    apiValue: 'PAYERMAX_MANAGED',
    desc: '重定向至 PayerMax 托管收银台页面完成支付'
  },
  api: { 
    label: 'API 模式', 
    apiValue: 'DIRECT_API',
    desc: '完全自主控制支付 UI'
  },
  component: { 
    label: '前置组件模式', 
    apiValue: 'PRE_COMPONENT',
    desc: '在商户页面内嵌入 PayerMax 提供的极简支付组件'
  },
};
