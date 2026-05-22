# AUTO REFACTOR REPORT

生成时间：2026-05-21  
审查范围：标准收单、订阅代扣、链接支付、静态前端直连 PayerMax 请求链路、共享 UI 组件、上下文状态流转。

## 1. 产品 / 流程层面修改摘要

- 保留并确认当前核心产品结构：
  - 标准收单：收银台模式、API 模式、前置组件模式。
  - 订阅代扣：PayerMax 托管、商户自管周期性订阅、非周期性订阅代扣。
  - 链接支付：API 创建链接、商户后台创建链接。
- 确认当前项目已进入“静态前端直连 PayerMax”的架构形态：前端收集演示参数，调用本地 `payermaxClient` 完成签名、请求、响应记录，再同步展示到代码块与仿真手机。
- 修复和统一了部分关键交互反馈：
  - 标准收单下单失败、浏览器直连失败统一走 `uiFeedback`。
  - 订阅 APM 与前置组件互斥提示统一走 `uiFeedback`。
  - 订阅前置组件获取 token、首次绑定下单、激活失败统一输出可读错误。
- 保留“真实请求展示”主线：未发起真实请求前，代码块展示空态；请求后展示 PayerMax endpoint、requestBody、responseBody。
- 删除未引用的 `ProductContext_fixed.tsx`，避免后续维护两份 ProductContext。

## 2. UI 统一性修改摘要

- 新增 `frontend/src/styles/design-tokens.css`：
  - 抽取 PayerMax demo 常用颜色、圆角、阴影、字体 token。
  - `frontend/src/index.css` 引入 design tokens，统一基础字体与页面背景。
- 新增 `frontend/src/components/shared/OrderResultPanel.tsx`：
  - 统一 “orderAndPay 已返回” 落地页样式。
  - 替换订阅激活和首次绑定下单中的重复结果页逻辑。
- 重写 `MacCodeSnippet`：
  - 无真实请求时展示统一空态：“完成本步骤操作后，将展示真实请求与响应。”
  - endpoint 行保持左对齐展示完整真实请求地址。
  - 复制按钮仅在真实 request/response 存在时展示。
- 新增 `frontend/src/lib/uiFeedback.ts`：
  - 收口 `alert` 调用入口，后续可替换成 Toast / Modal，而不用逐业务文件改。

## 3. 架构与代码质量修改统计

- 新增公共组件 / 工具：
  - `OrderResultPanel.tsx`
  - `uiFeedback.ts`
  - `design-tokens.css`
- 删除无引用文件：
  - `frontend/src/contexts/ProductContext_fixed.tsx`
- 已消除业务代码中的直接 `alert(...)` 调用；当前仅 `uiFeedback.ts` 作为统一出口保留 `window.alert`。
- 已运行生产构建：
  - `npm run build`：通过。
- 未运行 lint：
  - 根目录未配置 `lint` script，执行 `npm run lint` 返回 Missing script。

## 4. 仍需关注的风险与原因

### 4.1 静态前端直连 PayerMax

当前为了适配官网静态展示，私钥、商户号、appId、签名逻辑已经前移到前端。这满足“无后端服务”的演示目标，但只适合 UAT / Demo：

- 私钥暴露风险：生产环境严禁把 merchant private key 放到浏览器。
- 参数篡改风险：金额、币种、国家、支付方式都可被浏览器 DevTools 修改。
- 回调验签缺失：静态前端无法作为可信入账系统处理 webhook。
- 重放风险：前端生成 requestTime / outTradeNo，缺少服务端幂等存储。

建议在官网文案中明确：“本 Demo 仅用于产品流程演示；生产对接应由商户后端完成签名、金额校验、幂等、回调验签和订单落库。”

### 4.2 上下文仍偏大

`ProductContext` 与 `SubscriptionContext` 仍承担较多职责：流程状态、请求构造、响应记录、页面跳转、组件 session、查询结果等混在一起。虽然当前构建通过，但长期维护建议拆分：

- `flowState`：步骤、后退、重置。
- `apiExchangeStore`：按 stepId 记录真实请求响应。
- `payermaxActions`：orderAndPay、orderQuery、applyDropinSession / applySession、subscriptionCreate、subscriptionQuery、createPaybylink、queryPaybylink。
- `uiState`：redirectUrl、loading、error。

### 4.3 订阅字段一致性需持续回归

订阅代扣场景字段复杂，容易被后续修改再次打散：

- `paymentDetail.paymentMethodType` 必须位于 `paymentDetail` 下。
- PayerMax 托管 / 商户自管周期：`mitType` 应保持 `SCHEDULED`。
- 非周期性代扣：统一使用 `UNSCHEDULED`。
- Apple Pay / Google Pay 的订阅场景需要持续检查 `mitManagementUrl`、必要的 plan 信息和首次扣款时间。
- 全量收银台不应默认传 `paymentMethodType: CARD`。

## 5. 流程健康度评估

当前健康度：中。

优势：

- 产品线和演示路径已经较完整。
- 真实请求展示机制已经基本形成。
- 标准收单、订阅、链接支付都能进入静态前端直连 PayerMax 的模式。
- 构建通过。

主要不足：

- 上下文文件过大，新增需求容易互相影响。
- 缺少自动化测试与 lint。
- 静态直连模式的安全风险需要在官网展示中明确隔离。
- 部分流程依赖第三方 iframe / 钱包 SDK，浏览器限制、CORS、设备能力会造成不稳定，需要在 UI 中保留可读失败原因。

## 6. 建议的后续优化阶段

### 紧急

1. 给官网页面增加“Demo 安全边界说明”，避免商户误以为生产可前端签名。
2. 增加 `lint` script 和基础 ESLint 规则，至少覆盖 no-unused-vars、no-explicit-any 的新增代码。
3. 为每个产品模式保留一条最短 happy path 手工验收清单。

### 重要

1. 拆分 `ProductContext` 和 `SubscriptionContext`。
2. 为 `payermaxClient` 增加 request builder 单元测试，重点覆盖：
   - `paymentDetail.paymentMethodType`
   - `mitType`
   - `totalAmount`
   - `currency/country`
   - `subscriptionPlan`
3. 将所有 stepId、endpoint、步骤标题配置化，避免组件内部硬编码跳转。

### 体验增强

1. 将 `uiFeedback` 从 `window.alert` 升级为统一 Toast / Modal。
2. 给 iframe 阻断、钱包不可用、CORS 失败提供更明确的商户解释。
3. 为 Stepper 增加“已完成 / 当前 / 待完成 / 可回退”视觉状态说明。

## 7. 商户必须知道的最小必要知识

1. 标准收单和订阅代扣都需要先明确集成方式：收银台、API、前置组件。
2. 收银台模式通常依赖 `redirectUrl`，用户在 PayerMax 页面完成支付或授权。
3. API 模式由商户自建收银台，后端或本 Demo 前端直接调用 `orderAndPay`。
4. 前置组件模式先通过组件获取 `paymentToken` / `sessionKey`，再调用 `orderAndPay`。
5. 同步返回只代表请求受理或页面跳转结果，最终支付 / 激活结果应以查询或 webhook 为准。
6. 订阅 PayerMax 托管会创建订阅计划；商户自管和非周期性代扣重点是首次绑定后保存 `paymentTokenID`。
7. 金额、币种、国家、支付方式字段必须从第一步到后续请求保持一致。
8. 生产环境必须由后端签名、验签、落库和做幂等，不能直接复用静态前端 Demo 的密钥方案。

## 8. 验证记录

- `npm run build`：通过。
- `npm run lint`：未通过，原因是项目未配置 `lint` script。
