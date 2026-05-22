export type StandardFlowKey = 'cashier_ALL' | 'cashier_SPECIFIC' | 'api' | 'component';

export type StandardFlowAction =
  | 'show_product'
  | 'select_payment_method'
  | 'call_order_and_pay'
  | 'load_dropin_component'
  | 'submit_component_order'
  | 'show_success';

export interface StandardFlowNode {
  id: string;
  label: string;
  role: 'merchant' | 'payermax' | 'consumer' | 'system';
  action: StandardFlowAction;
  next: string | null;
  note: string;
}

export const STANDARD_FLOW_MAP: Record<StandardFlowKey, StandardFlowNode[]> = {
  cashier_ALL: [
    {
      id: 's1',
      label: '商品信息',
      role: 'merchant',
      action: 'show_product',
      next: 's2',
      note: '用户在商户商品页点击 Buy Now，前端 JS 调用 orderAndPay 创建 PayerMax 托管收银台订单。',
    },
    {
      id: 's2',
      label: '下单展示',
      role: 'payermax',
      action: 'call_order_and_pay',
      next: 's3',
      note: '展示 orderAndPay 真实请求/响应，以及 PayerMax 返回的 redirectUrl 收银台页面。',
    },
    {
      id: 's3',
      label: '支付成功',
      role: 'system',
      action: 'show_success',
      next: null,
      note: '通过 orderQuery 展示最终支付结果。',
    },
  ],
  cashier_SPECIFIC: [
    {
      id: 's1',
      label: '商品信息',
      role: 'merchant',
      action: 'show_product',
      next: 's2',
      note: '用户进入商户自建收银台选择指定支付方式。',
    },
    {
      id: 's2',
      label: '自建收银台',
      role: 'merchant',
      action: 'select_payment_method',
      next: 's3',
      note: '商户侧选择 CARD/APM/Apple Pay/Google Pay，下一步由前端 JS 调用 orderAndPay。',
    },
    {
      id: 's3',
      label: '下单展示',
      role: 'payermax',
      action: 'call_order_and_pay',
      next: 's4',
      note: '展示 Hosted_Checkout + 指定 paymentMethodType 的 orderAndPay 真实请求/响应。',
    },
    {
      id: 's4',
      label: '支付成功',
      role: 'system',
      action: 'show_success',
      next: null,
      note: '通过 orderQuery 展示最终支付结果。',
    },
  ],
  api: [
    {
      id: 's1',
      label: '商品 / 自建收银台',
      role: 'merchant',
      action: 'select_payment_method',
      next: 's2',
      note: '用户先查看商品页，点击 Buy Now 后在同一步进入商户自建收银台并选择支付方式。',
    },
    {
      id: 's2',
      label: '下单支付',
      role: 'payermax',
      action: 'call_order_and_pay',
      next: 's3',
      note: '前端 JS 使用 Direct_Payment 调用 PayerMax，展示真实请求、响应以及可能返回的 3DS/redirectUrl。',
    },
    {
      id: 's3',
      label: '支付成功',
      role: 'system',
      action: 'show_success',
      next: null,
      note: '通过 orderQuery 展示最终支付结果。',
    },
  ],
  component: [
    {
      id: 's1',
      label: '商品信息',
      role: 'merchant',
      action: 'show_product',
      next: 's2',
      note: '前端 JS 调用 applySession，为 Drop-in 前置组件准备 clientKey/sessionKey。',
    },
    {
      id: 's2',
      label: '自建收银台',
      role: 'consumer',
      action: 'load_dropin_component',
      next: 's3',
      note: '手机内加载 PayerMax Drop-in 组件，用户完成卡信息或钱包授权并生成 paymentToken。',
    },
    {
      id: 's3',
      label: '下单支付',
      role: 'payermax',
      action: 'submit_component_order',
      next: 's4',
      note: '前端获取 paymentToken 和 sessionKey 后，由浏览器 JS 调用 orderAndPay 完成 Direct_Payment。',
    },
    {
      id: 's4',
      label: '支付成功',
      role: 'system',
      action: 'show_success',
      next: null,
      note: '通过 orderQuery 展示最终支付结果。',
    },
  ],
};

export const getStandardFlowKey = (
  integrationMode: 'cashier' | 'api' | 'component',
  cashierMode: 'ALL' | 'SPECIFIC',
): StandardFlowKey => {
  if (integrationMode === 'cashier') {
    return cashierMode === 'SPECIFIC' ? 'cashier_SPECIFIC' : 'cashier_ALL';
  }
  return integrationMode;
};
