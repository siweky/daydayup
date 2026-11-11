---
title: "Nuxt 服务端（server）目录"
description: "介绍如何使用 server/ 目录在 Nuxt 应用中注册 API 端点、中间件、插件与工具函数。"
category: "nuxt"
date: "2026-07-01"
source: "https://nuxt.com/docs/guide/directory-structure/server"
---

`server/` 目录用于为 Nuxt 应用注册 API 与服务端处理器。Nuxt 会自动扫描该目录下的文件，注册支持热模块替换（HMR）的处理器。

```text
-| server/
  ---| api/
    -----| hello.ts      # /api/hello
  ---| routes/
    -----| bonjour.ts    # /bonjour
  ---| middleware/
    -----| log.ts        # log all requests
```

每个文件都必须使用 `defineEventHandler()` 或其别名 `eventHandler()` 导出一个默认函数。处理器可以返回 JSON、`Promise`，或用 `event.node.res.end()` 发送响应。

```typescript
// server/api/hello.ts
export default defineEventHandler((event) => {
  return {
    hello: 'world',
  }
})
```

可以在页面与组件中通用地调用该 API：

```vue
<!-- app/pages/index.vue -->
<script setup lang="ts">
const { data } = await useFetch('/api/hello')
</script>

<template>
  <pre>{{ data }}</pre>
</template>
```

## 服务端路由

位于 `~/server/api` 的文件在路由中自动带上 `/api` 前缀。

要创建不带 `/api` 前缀的服务端路由，把它们放到 `~/server/routes` 目录。

```typescript
// server/routes/hello.ts
export default defineEventHandler(() => 'Hello World!')
```

## 服务端中间件

Nuxt 读取 `~/server/middleware` 中的文件生成服务端中间件。这些处理器在每次请求中都先于其他服务端路由执行，可用于检查请求头、记录日志或扩展请求对象。

```typescript
// server/middleware/log.ts
export default defineEventHandler((event) => {
  console.log('New request: ' + getRequestURL(event))
})
```

```typescript
// server/middleware/auth.ts
export default defineEventHandler((event) => {
  event.context.auth = { user: 123 }
})
```

## 服务端插件

`~/server/plugins` 中的文件会自动注册为 Nitro 插件，可用于扩展运行时行为并挂接生命周期事件。

```typescript
// server/plugins/nitroPlugin.ts
export default defineNitroPlugin((nitroApp) => {
  console.log('Nitro plugin', nitroApp)
})
```

## 服务端工具函数

服务端路由使用 `h3` 及其配套工具。可以在 `~/server/utils` 目录中添加自定义辅助函数。

```typescript
// server/utils/handler.ts
export const defineWrappedResponseHandler = <T extends EventHandlerRequest, D> (
  handler: EventHandler<T, D>,
): EventHandler<T, D> =>
  defineEventHandler<T>(async (event) => {
    try {
      const response = await handler(event)
      return { response }
    } catch (err) {
      return { err }
    }
  })
```

## 服务端别名

`#server` 别名允许从 `server/` 目录内的任意位置导入文件，无需关心相对路径。

```typescript
// server/api/users/[id]/profile.ts
import { formatUser } from '#server/utils/formatUser'
```

该别名仅限 `server/` 目录使用，在客户端代码中使用会报错。

## 实用范例

### 路由参数

可以用方括号在文件名中定义动态参数，例如 `/api/hello/[name].ts`，并通过 `event.context.params` 访问。

```typescript
// server/api/hello/[name].ts
export default defineEventHandler((event) => {
  const name = getRouterParam(event, 'name')
  return `Hello, ${name}!`
})
```

### 匹配 HTTP 方法

在文件名后加 `.get`、`.post`、`.put`、`.delete` 等后缀，以匹配特定的 HTTP 方法。

```typescript
// server/api/test.get.ts
export default defineEventHandler(() => 'Test get handler')

// server/api/test.post.ts
export default defineEventHandler(() => 'Test post handler')
```

### 请求体处理

使用 `readBody` 读取请求体。

```typescript
// server/api/submit.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  return { body }
})
```

在应用中调用：

```vue
<script setup lang="ts">
async function submit () {
  const { body } = await $fetch('/api/submit', {
    method: 'post',
    body: { test: 123 },
  })
}
</script>
```

### 查询参数

使用 `getQuery` 提取查询参数。

```typescript
// server/api/query.get.ts
// 示例查询 /api/query?foo=bar&baz=qux
export default defineEventHandler((event) => {
  const query = getQuery(event)
  return { a: query.foo, b: query.baz }
})
```

### 错误处理

要返回指定的错误码，使用 `createError` 抛出异常。

```typescript
// server/api/validation/[id].ts
export default defineEventHandler((event) => {
  const id = Number.parseInt(event.context.params.id) as number
  if (!Number.isInteger(id)) {
    throw createError({
      status: 400,
      statusText: 'ID should be an integer',
    })
  }
  return 'All good'
})
```

### 状态码

使用 `setResponseStatus` 工具修改响应状态。

```typescript
export default defineEventHandler((event) => {
  setResponseStatus(event, 202)
})
```

### 运行时配置

通过 `useRuntimeConfig` 访问运行时配置。

```typescript
// server/api/foo.ts
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const repo = await $fetch('https://api.github.com/repos/nuxt/nuxt', {
    headers: {
      Authorization: `token ${config.githubToken}`,
    },
  })
  return repo
})
```

### 请求 Cookie

使用 `parseCookies` 解析传入的 Cookie。

```typescript
// server/api/cookies.ts
export default defineEventHandler((event) => {
  const cookies = parseCookies(event)
  return { cookies }
})
```

### 转发上下文与请求头

使用 `event.$fetch` 把传入的请求头带到内部 fetch 调用中。

```typescript
// server/api/forward.ts
export default defineEventHandler((event) => {
  return event.$fetch('/api/forwarded')
})
```

### 响应后等待 Promise

使用 `event.waitUntil` 运行后台任务，而不延迟客户端响应。

```typescript
// server/api/background-task.ts
export default eventHandler((event) => {
  event.waitUntil(timeConsumingBackgroundTask())
  return 'done'
})
```

## 服务端存储

Nitro 提供跨平台的存储层。可通过 `nitro.storage` 或服务端插件配置挂载点。

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  nitro: {
    storage: {
      redis: {
        driver: 'redis',
        port: 6379,
        host: '127.0.0.1',
      },
    },
  },
})
```

```typescript
// server/api/storage/test.ts
export default defineEventHandler(async (event) => {
  const keys = await useStorage('redis').getKeys()
  await useStorage('redis').setItem('foo', 'bar')
  await useStorage('redis').removeItem('foo')
  return {}
})
```

## 嵌套路由

使用 `h3` 的工具创建嵌套路由。

```typescript
// server/api/hello/[...slug].ts
import { createRouter, defineEventHandler, useBase } from 'h3'

const router = createRouter()
router.get('/test', defineEventHandler(() => 'Hello World'))

export default useBase('/api/hello', router.handler)
```
