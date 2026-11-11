---
title: "浏览器渲染与网络基础"
description: "关键渲染路径、事件循环、HTTP 缓存、存储方案、同源策略与常见 Web 安全机制，附 SSE/WebSocket 选型"
category: "notes"
date: "2026-11-11"
---

## 一、从输入 URL 到像素

```text
DNS 解析 → TCP 握手 → TLS 握手 → HTTP 请求
  → 接收 HTML → 解析 DOM / CSSOM → 渲染树
  → Layout（几何）→ Paint（绘制）→ Composite（合成）→ 屏幕
```

| 阶段 | 阻塞因素 | 优化方向 |
|---|---|---|
| 网络 | DNS/TLS/TTFB | 连接复用、CDN、HTTP/2/3、SSR |
| 解析 | 同步 `<script>`、阻塞 CSS | `defer` / `type=module`、关键 CSS 内联 |
| 渲染 | 大 DOM、复杂选择器、频繁布局读写 | 减少 DOM 规模、避免强制同步布局 |

**强制同步布局**：在同一帧里先改样式再读 `offsetHeight` 等几何属性，浏览器被迫提前执行 Layout。批量「先读后写」或用 `requestAnimationFrame` 分离，是优化 INP 的基本功。

```ts
// ❌ 读写交替，触发多次 Layout
items.forEach(el => { el.style.width = '100px'; console.log(el.offsetWidth) })

// ✅ 先批量写，下一帧再读
items.forEach(el => { el.style.width = '100px' })
requestAnimationFrame(() => items.forEach(el => console.log(el.offsetWidth)))
```

CSS 属性也要分层理解：`transform` / `opacity` 只走合成层，代价最低；`width` / `top` 会触发 Layout；`color` / `background` 触发 Paint。动画优先用前一类。

## 二、事件循环与长任务

```text
调用栈 → 微任务队列（Promise.then / queueMicrotask / MutationObserver）
       → 渲染（rAF → Layout/Paint/Composite）
       → 宏任务（setTimeout / I/O / 事件回调）
```

- 微任务会在当前任务结束前**全部清空**，所以递归微任务能饿死渲染。
- 超过 50ms 的任务算「长任务」，直接损害 INP。
- 大计算拆成小块（`scheduler.yield()` 或分片 `setTimeout`）或丢进 Web Worker。
- `requestAnimationFrame` 适合视觉更新；`requestIdleCallback` 适合低优先级后台工作。

```ts
async function processInChunks(items: unknown[]) {
  for (let i = 0; i < items.length; i += 50) {
    doWork(items.slice(i, i + 50))
    await new Promise(r => setTimeout(r, 0)) // 让出一帧
  }
}
```

## 三、HTTP 缓存：强缓存与协商缓存

| 类型 | 响应头 | 行为 |
|---|---|---|
| 强缓存 | `Cache-Control: max-age=31536000, immutable` | 有效期内不发请求 |
| 协商缓存 | `ETag` / `Last-Modified` + `304` | 每次发请求，未变则返回 304 |
| 不缓存 | `Cache-Control: no-store` | 每次完整下载 |
| 流式必配 | `Cache-Control: no-cache, no-transform` | 禁止代理缓存或改写响应体 |

实践约定：

- 带内容哈希的 `_nuxt/xxx.js` → `immutable` 长缓存。
- HTML 与 `_payload.json` → 短缓存或 `no-cache`，否则改了内容用户还看旧页面。
- API 响应按数据敏感度决定是否缓存；含用户信息的响应要加 `private` / `no-store`。
- 流式 SSE 必须加 `X-Accel-Buffering: no`，否则 Nginx 会把流攒起来一次性返回，逐字效果消失。

HTTP/2 多路复用让「合并小文件」的老优化失效，反而应该适度拆包以利用缓存粒度；HTTP/3 基于 QUIC，弱网下握手与丢包恢复更好。

## 四、浏览器存储怎么选

| 方案 | 容量 | 随请求发送 | 适合 |
|---|---|---|---|
| Cookie | ~4KB | 是 | 会话标识（配 `HttpOnly; Secure; SameSite`） |
| LocalStorage | ~5MB | 否 | 非敏感偏好、主题设置 |
| SessionStorage | ~5MB | 否 | 标签页级临时状态 |
| IndexedDB | 较大 | 否 | 离线数据、大对象、缓存草稿 |

安全底线：**不要在 LocalStorage 放 token 或密钥**（XSS 可直接读取）。会话凭证用 `HttpOnly` Cookie；长期状态放服务端，按用户隔离。

本站的 `useTheme` 用本地存储保存明暗主题，是 LocalStorage 的典型合理用法。

## 五、同源策略与 Web 安全

| 机制 | 作用 | 配置要点 |
|---|---|---|
| 同源策略 / CORS | 限制跨域读取响应 | 服务端白名单 `Access-Control-Allow-Origin`，带凭证时不能用 `*` |
| CSP | 限制可执行脚本来源 | `script-src 'self'`，禁止内联脚本与不可信 CDN |
| `SameSite` | 缓解 CSRF | 会话 Cookie 用 `Lax` 或 `Strict` |
| XSS 防护 | 输出转义 | 禁止对用户输入/模型输出直接 `v-html`，Markdown 渲染前消毒 |
| HTTPS / HSTS | 防中间人 | 全站强制，`Secure` Cookie |

**渲染模型输出时特别小心**：LLM 返回的 Markdown 可能夹带 HTML、`<script>`、`javascript:` 链接或外链图片。要用白名单渲染组件、消毒 HTML、限制外链域名，见 [Agent UI 安全](/ai-agent/10-frontend-integration)。

## 六、实时通信方案选型

| 方案 | 方向 | 适合 | 注意 |
|---|---|---|---|
| 短轮询 | 客户端拉 | 极低频状态 | 浪费请求 |
| SSE | 服务端 → 客户端 | 流式文本、事件流、进度推送 | 单向；自动重连；文本协议 |
| WebSocket | 双向 | 协同编辑、实时游戏 | 需要心跳、重连与状态同步 |
| `fetch` + ReadableStream | 服务端 → 客户端 | 需要 POST 传参的流式请求 | 手动解析 chunk，处理半行 |

大模型对话与 Agent 事件流通常用 **SSE** 或 **POST + ReadableStream**：请求需要带较长的 `messages`，返回需要逐条推送 `text-delta` / `tool-call` / `approval-required` 事件。实现要点：

- `TextDecoder` 开 `{ stream: true }`，避免中文跨 chunk 被截成乱码。
- 保留未闭合的半行 `buffer`，按空行切事件。
- 每个事件带 `id` / `runId`，断线重连时从最后序号续传。
- 用户点「停止」时 `AbortController.abort()` 要一路传到服务端，否则后端还在烧模型额度。

## 七、调试手法

| 工具 | 看什么 |
|---|---|
| Network 面板 | waterfall、TTFB、缓存命中（304 / from disk cache）、SSE 是否持续收到 chunk |
| Performance 面板 | 长任务、Layout/Paint 次数、帧率、主线程占用 |
| Coverage 面板 | 首屏未使用的 JS/CSS 比例 |
| Memory 面板 | 分离 DOM 泄漏、事件监听未清理 |
| Lighthouse / RUM | 实验室指标与真实用户数据的差异 |

## 动手任务

1. 打开本站首页的 Network 面板，找出哪些资源命中强缓存、哪些走了 304，解释原因。
2. 用 Performance 录制一次长列表滚动，找出超过 50ms 的任务并拆掉它。
3. 写一个 SSE demo，故意让服务端返回跨 chunk 的中文，验证 `TextDecoder` + 半行缓冲的必要性。
4. 给一段 LLM 输出构造 XSS 样例，验证你的 Markdown 渲染链路能否拦住。

延伸：[前端工程化与性能优化](/notes/frontend-engineering)、[MDN：HTTP 缓存](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching)、[MDN：Server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)、[Agent 前端集成](/ai-agent/10-frontend-integration)
