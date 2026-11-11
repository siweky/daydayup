---
title: "Nitro 部署与运维检查清单（本站实践）"
description: "构建产物结构、子路径 baseURL、环境变量、健康检查与日志、Docker、缓存与排错，附上线前 checklist"
category: "nitro"
date: "2026-11-11"
---

> [部署与零配置预设](/nitro/06-deploy) 列出了各平台预设与输出格式；这一篇聚焦**真正上线时要做的运维动作与本站踩过的坑**。

## 一、先想清楚部署形态

| 形态 | 命令 | 产物 | 适合本站？ |
|---|---|---|---|
| Node 服务（SSR） | `npm run build` → `node .output/server/index.mjs` | `.output/server` + `.output/public` | 适合，管理页接口需要 Node 文件系统 |
| 全静态 | `npm run generate` | 仅 `.output/public` | 内容展示可以，但上传/删除接口失效 |
| 边缘 / Serverless | `NITRO_PRESET=... npm run build` | 平台专用目录 | 需先改造文件读写与原生依赖 |

本站 `server/api/*.ts` 直接读写 `content/` 目录，属于**有状态、需 Node 运行时**的应用。若要做成静态站，需要把内容管理移到构建流程里（Git 提交 Markdown），而不是靠运行时上传接口。

## 二、子路径部署（本站最大的坑）

`app.baseURL = '/daydayup/'`，意味着：

```text
页面：      /daydayup/ai-agent
静态资源：  /daydayup/_nuxt/xxx.js
接口：      /daydayup/api/files
payload：   /daydayup/ai-agent/_payload.json
```

| 检查项 | 说明 |
|---|---|
| 反向代理 | 必须把 `/daydayup/` 前缀完整转发，不要在网关层剥掉后又不改写内部链接 |
| 前端请求 | 用 `useRuntimeConfig().app.baseURL` 拼接接口地址，别写死 `/api/xxx` |
| 静态资源 | 交给 Nitro 服务托管，或由 CDN 回源到同一路径结构 |
| 本地联调 | `npm run dev` 后访问 `http://localhost:3000/daydayup/`，不是根路径 |

`curl` 快速自检：

```bash
curl -I http://127.0.0.1:3100/daydayup/
curl -I http://127.0.0.1:3100/daydayup/ai-agent/_payload.json
curl -s http://127.0.0.1:3100/daydayup/api/files | head -c 300
```

## 三、环境变量与密钥

关键规则（与 [Nuxt 运行时配置](/nuxt/06-runtime-config) 呼应）：**`.env` 只在开发/构建时被 Nuxt CLI 读取，运行编译后的生产服务器时不会自动读取**。生产环境必须由进程管理器或平台注入环境变量。

```bash
# 开发：.env
NUXT_API_SECRET=xxx
NUXT_PUBLIC_API_BASE=https://api.example.com

# 生产：显式注入，再启动
NITRO_PORT=3100 NITRO_HOST=127.0.0.1 \
NUXT_API_SECRET=xxx NUXT_PUBLIC_API_BASE=https://api.example.com \
node .output/server/index.mjs
```

| 规则 | 原因 |
|---|---|
| 变量必须在 `nuxt.config.ts` 的 `runtimeConfig` 中声明 | 防止任意环境变量泄漏进代码 |
| 命名 `NUXT_` 前缀 + 大写 + 下划线 | Nuxt 的运行时覆盖约定 |
| 私钥只放 `runtimeConfig` 顶层 | `public` 下的值会注入页面 payload，浏览器可见 |
| 服务端 handler 用 `useRuntimeConfig(event)` | 拿到完整（含私有）配置 |

本站目前没有外部密钥；若以后接模型 API，务必只通过 `server/api/` 转发，见 [LLM 调用基础](/ai-agent/03-llm-fundamentals)。

## 四、Docker 化

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NITRO_HOST=0.0.0.0 NITRO_PORT=3000
COPY --from=build /app/.output ./.output
# 有原生依赖（better-sqlite3）时，需要在此层安装对应平台的二进制
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
```

注意：

- 只拷 `.output`，不要把 `node_modules` 和源码带进运行镜像。
- 构建层与运行层的 Node 版本/架构要一致，否则原生模块会报版本不匹配。
- `content/` 是运行时写入目录 → 需要挂持久卷或改为构建期内容，否则容器重建后上传的笔记会丢。
- 镜像里不要留 `.env`。

## 五、健康检查、日志与可观测

```ts
// server/api/health.get.ts
export default defineEventHandler(() => ({
  status: 'ok',
  uptime: process.uptime(),
  ts: new Date().toISOString(),
}))
```

| 项 | 建议 |
|---|---|
| 健康检查 | 独立路由，不依赖数据库，供负载均衡探活 |
| 日志 | 结构化输出（method、path、status、耗时、requestId），别 `console.log` 一堆无格式文本 |
| 错误追踪 | 在 `nitroApp.hooks` 的 `error` 钩子里统一上报，错误消息不要回显堆栈给用户 |
| 指标 | 请求量、P95、5xx 比例、进程内存；Agent 类应用还要看 token 与成本 |
| 敏感信息 | 日志脱敏，禁止记录密钥、请求体中的个人信息 |

## 六、缓存与性能

```ts
// nuxt.config.ts：按路由设置缓存策略
export default defineNuxtConfig({
  routeRules: {
    '/': { prerender: true },
    '/daydayup/api/bookmarks': { cache: { maxAge: 60 } },
    '/daydayup/manage/**': { ssr: false },
  },
})
```

- `_nuxt/` 静态资源带内容哈希 → 长缓存（`immutable`）。
- `_payload.json` 与页面 HTML → 短缓存或不缓存，否则内容更新后用户看到旧数据。
- 反向代理开启 gzip/brotli，但**流式 SSE 接口要关掉缓冲**（`X-Accel-Buffering: no`、`Cache-Control: no-transform`），否则流式效果消失。
- CDN 回源路径要保留 `/daydayup/` 前缀。

## 七、排错表

| 现象 | 可能原因 | 排查顺序 |
|---|---|---|
| 页面 200 但样式/JS 404 | baseURL 前缀被网关剥离 | 看浏览器 Network 里 `_nuxt` 的实际请求路径 |
| 接口 404 | 前端拼错 baseURL / 方法后缀不匹配 | `curl` 直接打服务端，再看构建 chunk 是否存在 |
| 内容更新不生效 | 命中了旧的 `_payload.json` 缓存 | 清 CDN 缓存，检查响应头 |
| 生产读不到配置 | 只放了 `.env` 没注入环境变量 | 在进程内打印非敏感配置确认 |
| SSE 一次性返回 | 代理缓冲 | 加 `X-Accel-Buffering: no` 与 `no-transform` |
| 原生模块报错 | 构建/运行镜像架构不一致 | 统一 Node 版本与平台，安装对应二进制 |
| 新手部署后管理页能传但重启丢失 | 容器无持久卷 | 挂卷或改为 Git 管理内容 |

## 上线前 Checklist

```text
[ ] 明确部署形态（Node SSR / 静态 / 边缘），确认接口能力与之匹配
[ ] baseURL 前缀在页面、接口、静态资源、payload 四处一致
[ ] 生产环境变量显式注入，私钥不在 public 下、不进镜像
[ ] /health 健康检查可用，网关超时时间大于最长接口耗时
[ ] 结构化日志与错误上报可用，敏感字段已脱敏
[ ] 静态资源长缓存、页面/payload 短缓存、SSE 关闭代理缓冲
[ ] 内容目录持久化方案确定（卷 / Git / 外部存储）
[ ] 管理接口已加鉴权、限流与操作审计（本站当前仅适合内网使用）
[ ] 构建产物只含 .output，滚动更新与回滚路径演练过
```

## 动手任务

1. 用 `NITRO_PORT=3100 node .output/server/index.mjs` 起服务，逐个验证上面三条 `curl` 自检命令。
2. 加一个 `/api/health` 路由，构建后确认它被编进 `.output/server/chunks/routes/api/`。
3. 故意用不带 baseURL 的地址请求接口，记录 404 现象并在前端改成运行时拼接。
4. 写一份 Dockerfile 跑通两阶段构建，检查运行镜像里是否残留 `.env` 和 `node_modules`。

延伸：[部署与零配置预设](/nitro/06-deploy)、[Nuxt 运行时配置](/nuxt/06-runtime-config)、[Nuxt 4 项目结构速查](/nuxt/getting-started)、[生产化清单](/ai-agent/11-production-engineering)
