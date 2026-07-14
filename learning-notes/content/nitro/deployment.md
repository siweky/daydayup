---
title: 'Nitro 部署指南'
description: '学习如何将 Nitro 应用部署到不同平台'
date: '2024-12-08'
---

# Nitro 部署指南

## 支持的部署平台

Nitro 支持部署到多种平台，以下是一些常见的目标：

| 平台 | 预设名称 | 特点 |
|------|---------|------|
| Node.js | `node-server` | 传统服务器部署 |
| Cloudflare Workers | `cloudflare-pages` | 边缘计算 |
| Vercel | `vercel` | Serverless |
| Netlify | `netlify` | 自动部署 |
| Deno Deploy | `deno-deploy` | Deno 运行时 |

## 构建

使用以下命令构建应用：

```bash
npm run build
```

构建产物在 `.output/` 目录中。

## Node.js 部署

```bash
# 构建
NITRO_PRESET=node-server npm run build

# 运行
node .output/server/index.mjs
```

## Cloudflare Workers

```bash
NITRO_PRESET=cloudflare-pages npm run build
npx wrangler pages deploy .output/public
```

## 环境变量

通过 `useRuntimeConfig()` 访问运行时配置：

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    apiSecret: process.env.API_SECRET,
    public: {
      apiBase: '/api',
    },
  },
})
```

## 最佳实践

1. **使用环境变量**管理敏感配置
2. **启用压缩**减少传输体积
3. **配置 CDN**加速静态资源
4. **监控性能**及时发现问题

## 总结

Nitro 的多平台支持让部署变得灵活，可以根据项目需求选择最合适的平台。
