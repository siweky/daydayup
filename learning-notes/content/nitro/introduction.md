---
title: 'Nitro 引擎入门'
description: '了解 Nuxt 背后的 Nitro 服务端引擎及其核心功能'
date: '2024-12-05'
---

# Nitro 引擎入门

## 什么是 Nitro

Nitro 是 Nuxt 3 使用的跨平台 HTTP 框架，由 UnJS 团队开发。它提供了一个统一的服务端 API，可以部署到各种平台。

## 核心特性

- **跨平台部署**：支持 Node.js、Cloudflare Workers、Vercel、Deno 等
- **API 路由**：基于文件系统的 API 路由
- **自动代码分割**：智能的代码分割和懒加载
- **热模块替换**：开发环境支持 HMR

## API 路由

在 `server/api/` 目录中创建 API 路由：

```ts
// server/api/hello.ts
export default defineEventHandler(() => {
  return { message: 'Hello World' }
})
```

### HTTP 方法

通过文件名后缀指定 HTTP 方法：

```
server/api/
├── users.get.ts      → GET /api/users
├── users.post.ts     → POST /api/users
├── users/[id].get.ts → GET /api/users/:id
└── users/[id].put.ts → PUT /api/users/:id
```

## 请求处理

```ts
export default defineEventHandler(async (event) => {
  // 读取请求体
  const body = await readBody(event)

  // 读取查询参数
  const query = getQuery(event)

  // 读取路由参数
  const params = getRouterParams(event)

  return { body, query, params }
})
```

## 存储

Nitro 内置了键值存储：

```ts
export default defineEventHandler(async () => {
  const storage = useStorage()

  await storage.setItem('cache:key', { data: 'value' })
  const data = await storage.getItem('cache:key')

  return data
})
```

## 总结

Nitro 为 Nuxt 提供了强大的服务端能力，让全栈开发变得更加简单。
