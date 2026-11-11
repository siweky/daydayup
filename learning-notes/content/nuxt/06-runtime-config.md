---
title: "Nuxt 运行时配置（runtimeConfig）"
description: "介绍如何使用 Nuxt 运行时配置 API 在应用中管理与暴露配置变量及密钥。"
category: "nuxt"
date: "2026-07-01"
source: "https://nuxt.com/docs/guide/going-further/runtime-config"
---

Nuxt 提供运行时配置（runtime config）API，让你在应用中安全地暴露密钥与设置。

## 暴露配置

要让环境变量（environment variables）与配置项在应用中可用，需在 `nuxt.config` 文件中通过 `runtimeConfig` 属性定义它们。

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    // 仅在服务端可用的私有键
    apiSecret: '123',
    // public 中的键也会暴露给客户端
    public: {
      apiBase: '/api',
    },
  },
})
```

把 `apiBase` 放进 `runtimeConfig.public` 后，Nuxt 会把它注入每个页面的载荷，使其在服务端与浏览器中都可访问。

```ts
const runtimeConfig = useRuntimeConfig()

console.log(runtimeConfig.apiSecret)
console.log(runtimeConfig.public.apiBase)
```

也可以在 Vue 模板中通过 `$config.public` 直接访问公开的运行时配置。

### 序列化

运行时配置在到达 Nitro 之前会经过序列化。因此，避免在 `nuxt.config` 中放入函数、Map、Set 等不可序列化的数据类型。

对于不可序列化的对象或函数，改用 Nitro 或 Nuxt 的中间件/插件，不要通过配置文件传递。

### 环境变量

使用环境变量是提供配置项的标准方式。

Nuxt CLI 在开发、构建与生成期间会自动读取 `.env` 文件，但执行编译后的生产服务器时，**不会读取你的 `.env` 文件**。

运行时，配置值会**被匹配的环境变量自动替换**。

这一机制需要满足两个主要条件：

1. 变量必须存在于 `nuxt.config` 中，以防止任意环境变量泄漏到代码库。
2. 覆盖需要使用特定格式的环境变量：必须全大写、以 `NUXT_` 开头，并用下划线分隔键名与大小写转换。

#### 示例

```env
# .env
NUXT_API_SECRET=api_secret_token
NUXT_PUBLIC_API_BASE=https://nuxtjs.org
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    apiSecret: '', // can be overridden by NUXT_API_SECRET
    public: {
      apiBase: '', // can be overridden by NUXT_PUBLIC_API_BASE
    },
  },
})
```

## 读取配置

### Vue 应用

要在应用的 Vue 部分获取运行时配置，调用 `useRuntimeConfig()` 组合式函数。

客户端与服务端的处理方式不同：

- **客户端：** 只暴露 `runtimeConfig.public` 与 `runtimeConfig.app`，得到的对象是响应式且可写的。
- **服务端：** 可访问完整的配置对象，但为只读，以防上下文泄漏。

```vue
<!-- app/pages/index.vue -->
<script setup lang="ts">
const config = useRuntimeConfig()

console.log('Runtime config:', config)

if (import.meta.server) {
  console.log('API secret:', config.apiSecret)
}
</script>
```

> **安全警告：** 切勿把敏感的服务端密钥渲染到模板或传入 `useState`，从而暴露给客户端。

### 插件

要在自定义插件中使用配置项，在 `defineNuxtPlugin` 回调里调用 `useRuntimeConfig()`。

```ts
// app/plugins/config.ts
export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  console.log('API base URL:', config.public.apiBase)
})
```

### 服务端路由

服务端 API 路由也可通过 `useRuntimeConfig` 工具访问这些设置。

```ts
// server/api/test.ts
export default defineEventHandler(async (event) => {
  const { apiSecret } = useRuntimeConfig(event)

  const result = await $fetch('https://my.api.com/test', {
    headers: {
      Authorization: `Bearer ${apiSecret}`,
    },
  })

  return result
})
```

## 为运行时配置添加类型

Nuxt 会尝试使用 `unjs/untyped` 库为配置自动生成 TypeScript 接口。不过你也可以手动定义类型：

```ts
// index.d.ts
declare module 'nuxt/schema' {
  interface RuntimeConfig {
    apiSecret: string
  }
  interface PublicRuntimeConfig {
    apiBase: string
  }
}
export {}
```

最终用户可通过 `nuxt/schema` 获取项目所用的具体 schema 版本；模块作者则应改为扩展 `@nuxt/schema`。
