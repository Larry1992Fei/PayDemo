import type { SubMode, IntegrationMode, StepConfig } from '@/types/subscription';

export function getStepsForSubMode(
  subMode: SubMode,
  integration: IntegrationMode
): StepConfig[] {
  if (subMode === 'payermax') {
    if (integration === 'component') {
      return [
        { id: 'pm-1', label: 'Step 1', title: '配置订阅参数', hint: '配置 PayerMax 托管订阅计划的套餐、周期和金额' },
        { id: 'pm-2', label: 'Step 2', title: '创建计划与自建收银台', hint: '前端 JS 创建订阅计划并预取组件 Session，手机内展示商户自建收银台获取 paymentToken' },
        { id: 'pm-component', label: 'Step 3', title: '支付下单激活订阅', hint: '前端 JS 使用 paymentToken 调用 orderAndPay，展示真实请求、响应以及可能返回的 3DS/redirectUrl' },
        { id: 'pm-complete', label: 'Step 4', title: '完成订阅激活', hint: '通过 subscriptionQuery 查询并展示真实订阅激活结果' },
      ];
    }

    return [
      { id: 'pm-1', label: 'Step 1', title: '配置订阅参数', hint: '配置 PayerMax 托管订阅计划的套餐、周期和金额' },
      { id: 'pm-2', label: 'Step 2', title: '创建订阅计划', hint: '前端 JS 调用 subscriptionCreate 创建订阅计划' },
      { id: 'pm-activate', label: 'Step 3', title: '激活订阅', hint: '调用 orderAndPay 完成首次授权/支付激活' },
      { id: 'pm-complete', label: 'Step 4', title: '完成订阅激活', hint: '通过 subscriptionQuery 查询并展示真实订阅激活结果' },
    ];
  }

  if (subMode === 'merchant') {
    if (integration === 'component') {
      return [
        { id: 'm-1', label: 'Step 1', title: '配置绑定参数', hint: '商户自管周期性订阅：商户自行管理扣款周期，首次绑定生成 token' },
        { id: 'm-component', label: 'Step 2', title: '自建收银台获取 token', hint: '加载前置组件获取 paymentToken，仅完成前端收集要素' },
        { id: 'm-order', label: 'Step 3', title: '首次绑定下单', hint: '前端 JS 使用 paymentToken 调用 orderAndPay，展示真实请求和响应' },
        { id: 'm-bound', label: 'Step 4', title: '完成支付绑定', hint: '调用 orderQuery 查询首次绑定结果，并提示商户保存 paymentTokenID' },
        { id: 'm-deduct', label: 'Step 5', title: '后续发起扣款', hint: '商户按订阅周期使用 paymentTokenID 自行发起扣款' },
      ];
    }

    if (integration === 'api') {
      return [
        { id: 'm-1', label: 'Step 1', title: '配置参数 / 自建收银台', hint: '先展示商户收集的绑定参数，再在同一步进入自建收银台选择支付方式' },
        { id: 'm-order', label: 'Step 2', title: '首次绑定下单', hint: '前端 JS 调用 orderAndPay 完成首次绑定，并展示真实请求和响应' },
        { id: 'm-bound', label: 'Step 3', title: '完成支付绑定', hint: '调用 orderQuery 查询首次绑定结果，并提示商户保存 paymentTokenID' },
        { id: 'm-deduct', label: 'Step 4', title: '后续发起扣款', hint: '商户按订阅周期使用 paymentTokenID 自行发起扣款' },
      ];
    }

    return [
      { id: 'm-1', label: 'Step 1', title: '配置绑定参数', hint: '商户自管周期性订阅：首次绑定传 SCHEDULED 并生成 token' },
      { id: 'm-bind', label: 'Step 2', title: '首次绑定支付方式', hint: '收银台模式跳转 PayerMax，并通过 orderAndPay 返回 redirectUrl' },
      { id: 'm-bound', label: 'Step 3', title: '完成支付绑定', hint: '调用 orderQuery 查询首次绑定结果，并提示商户保存 paymentTokenID' },
      { id: 'm-deduct', label: 'Step 4', title: '后续发起扣款', hint: '商户按订阅周期使用 paymentTokenID 自行发起扣款' },
    ];
  }

  if (integration === 'component') {
    return [
      { id: 'np-1', label: 'Step 1', title: '收集业务数据', hint: '非周期性代扣：商户按需扣款，首次绑定传 UNSCHEDULED 并生成 token' },
      { id: 'np-component', label: 'Step 2', title: '自建收银台获取 token', hint: '加载前置组件获取 paymentToken，仅完成前端收集要素' },
      { id: 'np-order', label: 'Step 3', title: '首次绑定下单', hint: '前端 JS 使用 paymentToken 调用 orderAndPay，展示真实请求和响应' },
      { id: 'np-bound', label: 'Step 4', title: '完成支付绑定', hint: '调用 orderQuery 查询首次绑定结果，并提示商户保存 paymentTokenID' },
      { id: 'np-deduct', label: 'Step 5', title: '后续发起扣款', hint: '商户按业务需要使用 paymentTokenID 灵活发起扣款' },
    ];
  }

  if (integration === 'api') {
    return [
      { id: 'np-1', label: 'Step 1', title: '收集数据 / 自建收银台', hint: '先展示商户收集的业务数据，再在同一步进入自建收银台选择支付方式' },
      { id: 'np-order', label: 'Step 2', title: '首次绑定下单', hint: '前端 JS 调用 orderAndPay 完成首次绑定，并展示真实请求和响应' },
      { id: 'np-bound', label: 'Step 3', title: '完成支付绑定', hint: '调用 orderQuery 查询首次绑定结果，并提示商户保存 paymentTokenID' },
      { id: 'np-deduct', label: 'Step 4', title: '后续发起扣款', hint: '商户按业务需要使用 paymentTokenID 灵活发起扣款' },
    ];
  }

  return [
    { id: 'np-1', label: 'Step 1', title: '收集业务数据', hint: '非周期性代扣：商户按需扣款，首次绑定传 UNSCHEDULED 并生成 token' },
    { id: 'np-bind', label: 'Step 2', title: '首次绑定支付方式', hint: '收银台模式跳转 PayerMax，并通过 orderAndPay 返回 redirectUrl' },
    { id: 'np-bound', label: 'Step 3', title: '完成支付绑定', hint: '调用 orderQuery 查询首次绑定结果，并提示商户保存 paymentTokenID' },
    { id: 'np-deduct', label: 'Step 4', title: '后续发起扣款', hint: '商户按业务需要使用 paymentTokenID 灵活发起扣款' },
  ];
}
