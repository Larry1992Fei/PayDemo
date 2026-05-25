# PayDemo 部署说明

本文档用于将 PayDemo 静态前端部署到服务器或官网，并重点说明部署域名、部署子路径、`frontCallbackUrl`、`redirectUrl`、`notifyUrl` 等容易出问题的路径配置。

文档中的占位说明：

- `{DEPLOY_ORIGIN}`：最终部署域名，例如 `https://www.example.com`
- `{BASE_PATH}`：前端挂载路径，例如 `/payDemo`
- `{DEPLOY_URL}`：完整访问地址，即 `{DEPLOY_ORIGIN}{BASE_PATH}/`

## 1. 项目形态

PayDemo 当前是纯前端静态项目。

- 不需要 Node/Express 服务端常驻运行。
- 前端构建产物在 `frontend/dist`。
- 浏览器直接请求 PayerMax UAT 接口并展示真实请求和响应。
- Demo 私钥在前端代码中，仅适用于 UAT/演示环境，生产商户接入不应这样使用。

## 2. 本地构建

在本地执行：

```bash
cd frontend
npm install
npm run build
```

构建完成后上传整个目录：

```text
frontend/dist/*
```

到服务器目录，例如：

```text
/data/webapps/payDemo/
```

注意：上传的是 `dist` 里面的文件，不是把 `dist` 文件夹本身放成 `/data/webapps/payDemo/dist/`。

## 3. Nginx 推荐配置

如果项目按 `{DEPLOY_ORIGIN}/payDemo/` 访问，Nginx 可以使用如下子路径配置：

```nginx
location = /payDemo {
    return 301 /payDemo/;
}

location ^~ /payDemo/ {
    alias /data/webapps/payDemo/;
    index index.html;
    try_files $uri $uri/ /payDemo/index.html;
}
```

修改配置后执行：

```bash
nginx -t
systemctl reload nginx
```

验证：

```bash
curl -I {DEPLOY_ORIGIN}/payDemo/
curl -I {DEPLOY_ORIGIN}/payDemo/callback
```

`/payDemo/callback` 应该返回前端 `index.html`，不能是 404。这个路径本身不是一个真实 HTML 文件，而是前端路由/监听回调用的入口。

## 4. Vite base 路径

当前配置在：

```text
frontend/vite.config.ts
```

关键配置：

```ts
base: '/payDemo/'
```

这表示构建后的 JS/CSS 资源都会以 `/payDemo/` 为基础路径加载。

如果以后访问路径改成根路径：

```text
{DEPLOY_ORIGIN}/
```

则需要改成：

```ts
base: '/'
```

如果以后路径改成：

```text
{DEPLOY_ORIGIN}/demo/pay/
```

则需要改成：

```ts
base: '/demo/pay/'
```

改完 `base` 后必须重新执行 `npm run build` 并重新上传。

## 5. callbackUrl 路径注意事项

项目中的前端回调地址不是写死的，而是动态生成。

相关文件：

```text
frontend/src/config/payermaxDemoUrls.ts
frontend/src/lib/callbackReturn.ts
```

当前逻辑会根据浏览器当前域名和 Vite `BASE_URL` 生成：

```text
{DEPLOY_ORIGIN}/payDemo/callback
```

如果官网测试环境只能通过静态入口访问，例如：

```text
{DEPLOY_ORIGIN}/payDemo/index.html
```

则前端会自动把 `frontCallbackUrl` 生成为：

```text
{DEPLOY_ORIGIN}/payDemo/index.html
```

PayerMax 追加参数后会变成：

```text
{DEPLOY_ORIGIN}/payDemo/index.html?outTradeNo=...&tradeToken=...&status=SUCCESS
```

这样不依赖服务器把 `/payDemo/callback` 回退到 `index.html`，更适合官网文档站、静态资源站等无法自定义 rewrite 的部署方式。

也就是说，只要最终访问地址是：

```text
{DEPLOY_ORIGIN}/payDemo/
```

请求体里的：

```json
"frontCallbackUrl": "{DEPLOY_ORIGIN}/payDemo/callback"
```

就会自动正确生成。

### 重要注意事项

1. `frontCallbackUrl` 必须和实际部署路径一致。
   - 正确：`{DEPLOY_ORIGIN}/payDemo/callback`
   - 静态官网入口也正确：`{DEPLOY_ORIGIN}/payDemo/index.html`
   - 错误：`{DEPLOY_ORIGIN}/callback`
   - 错误：`{DEPLOY_ORIGIN}/payDemo`

2. Nginx 必须把 `/payDemo/callback` 回退到前端 `index.html`。
   - 如果这个路径 404，iframe 或浏览器跳回时无法被前端监听。

3. 修改部署路径后，需要同步修改：
   - `frontend/vite.config.ts` 的 `base`
   - Nginx 的 `location`
   - 重新构建并上传 `frontend/dist`

4. 浏览器可能缓存旧的 sessionStorage。
   - 如果切换过部署路径或测试了很多流程，建议打开页面后点“重置所有步骤”，或清理浏览器站点数据。

## 6. redirectUrl 与仿真手机展示

PayerMax 接口返回 `redirectUrl` 时，Demo 会优先在右侧仿真手机 iframe 中打开。

当前前端会监听：

- iframe 加载回调
- 是否跳回 `frontCallbackUrl`
- 部分流程的 postMessage 或 fallback 状态

注意：

1. 跨域 iframe 无法读取内部页面 DOM。
   - 前端只能判断 iframe 是否加载、是否跳回 callbackUrl。
   - 无法 100% 判断第三方页面是否“白屏”。

2. 如果 PayerMax 页面禁止 iframe 嵌入，仿真手机内可能无法展示。
   - 链接支付已做兜底：先尝试 iframe，加载不稳定时新窗口打开。

3. 只要最终跳回：

```text
{DEPLOY_ORIGIN}/payDemo/callback
```

Demo 就可以识别并切换到统一的结果页。

## 7. notifyUrl 注意事项

当前项目没有服务端，因此：

```json
"notifyUrl": "https://[your domain name]/[your notify URL]"
```

只是演示占位，不会真实接收异步通知。

如果以后要做真实商户接入，需要增加服务端接口用于接收 PayerMax 异步通知，例如：

```text
https://your-domain.com/api/payermax/notify
```

服务端需要：

- 接收 PayerMax 通知
- 验签
- 更新订单状态
- 返回 PayerMax 要求的响应格式

不要只依赖前端 `frontCallbackUrl` 判断真实支付结果。生产环境应以后端异步通知和主动查询结果为准。

## 8. 常见部署问题

### 访问 `/payDemo/` 空白

检查：

- 是否上传了 `frontend/dist` 里面的文件
- 是否存在 `/data/webapps/payDemo/index.html`
- `vite.config.ts` 是否是 `base: '/payDemo/'`
- 浏览器控制台是否有 JS/CSS 404

### 刷新页面或 callback 页面 404

检查 Nginx：

```nginx
try_files $uri $uri/ /payDemo/index.html;
```

这个配置必须存在。

### callback 没有被监听到

检查：

- 请求体里的 `frontCallbackUrl` 是否是 `{DEPLOY_ORIGIN}/payDemo/callback`
- PayerMax 页面最终是否真的跳回这个地址
- Nginx 是否能访问 `/payDemo/callback`
- 是否部署了旧包，建议重新上传最新 `dist`

### PayerMax 接口 CORS 报错

这是浏览器直接请求 PayerMax UAT 接口导致的，需要 PayerMax 侧允许当前访问域名，例如：

```text
{DEPLOY_ORIGIN}
```

如果使用本地调试，也可能需要允许：

```text
http://localhost:5174
```

### 阿里云服务器无法 git clone GitHub

如果服务器访问 GitHub 不稳定，可以继续使用本地构建上传方式：

1. 本地 `npm run build`
2. 上传 `frontend/dist/*` 到 `/data/webapps/payDemo/`
3. reload Nginx

## 9. 推荐上线检查清单

上线前检查：

- `npm run build` 成功
- `/data/webapps/payDemo/index.html` 存在
- `/data/webapps/payDemo/assets/` 存在
- `{DEPLOY_ORIGIN}/payDemo/` 可以访问
- `{DEPLOY_ORIGIN}/payDemo/callback` 不返回 404
- 请求体中的 `frontCallbackUrl` 是 `/payDemo/callback`
- 标准收单、订阅代扣、链接支付至少各跑一条主流程
- 浏览器控制台无明显 JS/CSS 404
