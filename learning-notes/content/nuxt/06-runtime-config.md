---
title: "Runtime Config"
description: "How to use the Nuxt runtime config API to manage and expose configuration variables and secrets in your application."
category: "nuxt"
date: "2026-07-01"
source: "https://nuxt.com/docs/guide/going-further/runtime-config"
---

# Runtime Config

Nuxt offers an API for runtime configuration, allowing you to safely expose secrets and settings throughout your application.

## Exposing

To make environment variables and configuration settings available to your application, define them in the `nuxt.config` file utilizing the `runtimeConfig` property.

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    // The private keys which are only available within server-side
    apiSecret: '123',
    // Keys within public, will be also exposed to the client-side
    public: {
      apiBase: '/api',
    },
  },
})
```

By placing `apiBase` inside `runtimeConfig.public`, Nuxt injects it into every page payload, making it universally accessible on both the server and the browser.

```ts
const runtimeConfig = useRuntimeConfig()

console.log(runtimeConfig.apiSecret)
console.log(runtimeConfig.public.apiBase)
```

You can also access public runtime configuration directly inside Vue templates via `$config.public`.

### Serialization

Before reaching Nitro, your runtime configuration undergoes serialization. Consequently, avoid placing non-serializable data types like functions, Maps, or Sets inside your `nuxt.config`.

For non-serializable objects or functions, utilize a Nitro or Nuxt middleware/plugin instead of passing them through the configuration file.

### Environment Variables

Using environment variables is the standard method for supplying configuration settings.

While the Nuxt CLI automatically reads `.env` files during development, building, and generating, **your `.env` file will not be read** when executing the compiled production server.

At runtime, config values are **automatically replaced by matching environment variables at runtime**.

This process requires two main conditions:

1. Variables must exist within your `nuxt.config` to prevent arbitrary environment variables from leaking into your codebase.
2. Overrides require specifically formatted environment variables: they must be uppercase, begin with `NUXT_`, and use underscores to delineate keys and case shifts.

#### Example

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

## Reading

### Vue App

To retrieve runtime configuration inside the Vue portion of your application, invoke the `useRuntimeConfig()` composable.

Client and server environments handle this differently:

- **Client-side:** Only `runtimeConfig.public` and `runtimeConfig.app` are exposed. The resulting object is reactive and writable.
- **Server-side:** The complete configuration object is accessible but remains read-only to prevent context leakage.

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

> **Security warning:** Never expose sensitive server-side keys to the client by rendering them in templates or passing them into `useState`.

### Plugins

To utilize configuration settings inside custom plugins, call `useRuntimeConfig()` within the `defineNuxtPlugin` callback.

```ts
// app/plugins/config.ts
export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  console.log('API base URL:', config.public.apiBase)
})
```

### Server Routes

Server API routes can also access these settings via the `useRuntimeConfig` utility.

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

## Typing Runtime Config

Nuxt attempts to automatically generate TypeScript interfaces for your configuration using the `unjs/untyped` library. However, you can manually define types:

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

End-users can leverage `nuxt/schema` to access the specific schema version their project uses. Module creators should augment `@nuxt/schema` instead.
