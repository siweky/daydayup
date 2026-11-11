---
title: "部署与零配置预设（Deploy）"
description: "了解如何通过零配置预设把 Nitro 应用部署到各类托管平台。"
category: "nitro"
date: "2026-07-01"
source: "https://nitro.build/guide/deploy"
---

Nitro 能从同一份代码库生成适配不同托管平台的不同输出格式。借助内置预设（preset），你几乎无需额外代码或配置，即可轻松让 Nitro 调整输出格式。

## 默认输出

默认的生产输出预设是 **Node.js 服务器**。

在开发模式下运行 Nitro 时，Nitro 始终使用名为 `nitro-dev` 的特殊预设：在隔离的 Worker 环境中以 Node.js 搭配 ESM 运行，其行为尽可能贴近生产环境。

## 零配置平台

通过 CI/CD 部署到生产环境时，Nitro 会尝试自动检测平台环境并设置合适的预设，无需任何额外配置。目前以下平台可零配置自动检测：

- AWS Amplify
- Azure
- Cloudflare
- Firebase App Hosting
- Netlify
- Stormkit
- Vercel
- Zeabur

> **Turborepo 用户注意：** 零配置检测会受其严格环境模式（Strict Environment Mode）干扰。你可能需要显式放行相关变量，或改用宽松环境模式（Loose Environment Mode，使用 `--env-mode=loose` 参数）。

其他内置平台需显式指定预设才能使用，其中包括 Zephyr。

## 更改部署预设

若需针对特定平台构建 Nitro，可定义名为 `NITRO_PRESET` 或 `SERVER_PRESET` 的环境变量来指定，也可更新 Nitro 配置，或使用 `--preset` 参数。

对于依赖 CI/CD 的部署，推荐使用环境变量方式。

**示例：** 定义 `NITRO_PRESET` 环境变量：

```bash
nitro build --preset cloudflare_pages
```

**示例：** 更新 `nitro.config.ts` 文件：

```ts
import { defineConfig } from "nitro";

export default defineConfig({
  preset: 'cloudflare_pages'
})
```

## 兼容性日期

部署平台会定期更新其运行时行为，Nitro 预设也随之更新以支持这些新特性。

为避免破坏已有部署，Nitro 使用兼容性日期（compatibility date）。该日期可把行为锁定在项目创建之时，你也可以在未来准备好时选择加入后续更新。

新建项目时，`compatibilityDate` 会被设为当前日期，该设置保存在项目配置中。

应定期更新兼容性日期，并在更新后务必充分测试部署。

## 常见部署目标

### Node.js

默认预设，构建独立的 Node.js 服务器：

```bash
nitro build
node .output/server/index.mjs
```

### Cloudflare Workers / Pages

```bash
nitro build --preset cloudflare_pages
```

### Vercel

```bash
nitro build --preset vercel
```

### Netlify

```bash
nitro build --preset netlify
```

### Deno

```bash
nitro build --preset deno_server
```

### Bun

```bash
nitro build --preset bun
```

### 静态 / 预渲染

在构建时预渲染所有路由，用于静态托管：

```bash
nitro build --preset static
```

### Docker

为 Nitro 应用创建 Dockerfile：

```dockerfile
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
```

## 环境变量

通过环境变量设置运行时配置：

```ts
// nitro.config.ts
import { defineConfig } from "nitro";

export default defineConfig({
  runtimeConfig: {
    apiSecret: '',  // 通过 NUXT_API_SECRET 环境变量设置
    public: {
      apiBase: '/api',  // 通过 NUXT_PUBLIC_API_BASE 环境变量设置
    },
  },
})
```

## 构建产物

`.output/` 目录包含运行应用所需的全部内容：

```
.output/
  server/
    index.mjs     # 入口文件
    chunks/       # 代码分割块
  public/         # 静态资源
  nitro.json      # 构建元数据
```
