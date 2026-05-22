export type LinkMode = 'dashboard' | 'api';

export const LINK_MODE_CONFIG: Record<LinkMode, { label: string; desc: string }> = {
  dashboard: {
    label: '商户后台创建链接',
    desc: '登录 PayerMax 商户平台（MMC）录入订单并生成链接/二维码，无需开发创建接口。',
  },
  api: {
    label: 'API 创建链接',
    desc: '通过 createPaybylink 动态生成支付链接，适合自动化和批量分发。',
  },
};
