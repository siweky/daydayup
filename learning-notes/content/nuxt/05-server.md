---
title: "Server"
description: "How to use the server directory to register API endpoints, middleware, plugins, and utilities in your Nuxt application."
category: "nuxt"
date: "2026-07-01"
source: "https://nuxt.com/docs/guide/directory-structure/server"
---

# Server

The `server/` directory allows you to register API and server handlers for your Nuxt application. Nuxt automatically scans files within this directory to register handlers with Hot Module Replacement (HMR) support.

```text
-| server/
  ---| api/
    -----| hello.ts      # /api/hello
  ---| routes/
    -----| bonjour.ts    # /bonjour
  ---| middleware/
    -----| log.ts        # log all requests
```

Each file must export a default function using `defineEventHandler()` or its alias `eventHandler()`. Handlers can return JSON, a `Promise`, or use `event.node.res.end()` to send responses.

```typescript
// server/api/hello.ts
export default defineEventHandler((event) => {
  return {
    hello: 'world',
  }
})
```

You can universally call this API in your pages and components:

```vue
<!-- app/pages/index.vue -->
<script setup lang="ts">
const { data } = await useFetch('/api/hello')
</script>

<template>
  <pre>{{ data }}</pre>
</template>
```

## Server Routes

Files located in `~/server/api` automatically receive an `/api` prefix in their routing.

To create server routes without the `/api` prefix, place them in the `~/server/routes` directory.

```typescript
// server/routes/hello.ts
export default defineEventHandler(() => 'Hello World!')
```

## Server Middleware

Nuxt reads files in `~/server/middleware` to generate server middleware. These handlers execute before other server routes on every request, allowing you to inspect headers, log activity, or extend the request object.

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

## Server Plugins

Files in `~/server/plugins` are automatically registered as Nitro plugins, enabling you to extend runtime behavior and hook into lifecycle events.

```typescript
// server/plugins/nitroPlugin.ts
export default defineNitroPlugin((nitroApp) => {
  console.log('Nitro plugin', nitroApp)
})
```

## Server Utilities

Server routes utilize `h3` and its helpful utilities. You can add custom helpers in the `~/server/utils` directory.

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

## Server Alias

The `#server` alias allows importing files from anywhere inside the `server/` directory without worrying about relative paths.

```typescript
// server/api/users/[id]/profile.ts
import { formatUser } from '#server/utils/formatUser'
```

This alias is restricted to the `server/` directory and will cause errors if used in client-side code.

## Recipes

### Route Parameters

Dynamic parameters can be defined in filenames using brackets, like `/api/hello/[name].ts`, and accessed through `event.context.params`.

```typescript
// server/api/hello/[name].ts
export default defineEventHandler((event) => {
  const name = getRouterParam(event, 'name')
  return `Hello, ${name}!`
})
```

### Matching HTTP Method

Suffix filenames with `.get`, `.post`, `.put`, `.delete`, etc., to match specific HTTP methods.

```typescript
// server/api/test.get.ts
export default defineEventHandler(() => 'Test get handler')

// server/api/test.post.ts
export default defineEventHandler(() => 'Test post handler')
```

### Body Handling

Read request bodies using `readBody`.

```typescript
// server/api/submit.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  return { body }
})
```

Call it from your app:

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

### Query Parameters

Extract query parameters using `getQuery`.

```typescript
// server/api/query.get.ts
// Sample query /api/query?foo=bar&baz=qux
export default defineEventHandler((event) => {
  const query = getQuery(event)
  return { a: query.foo, b: query.baz }
})
```

### Error Handling

To return specific error codes, throw an exception using `createError`.

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

### Status Codes

Modify the response status using the `setResponseStatus` utility.

```typescript
export default defineEventHandler((event) => {
  setResponseStatus(event, 202)
})
```

### Runtime Config

Access runtime configuration via `useRuntimeConfig`.

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

### Request Cookies

Parse incoming cookies with `parseCookies`.

```typescript
// server/api/cookies.ts
export default defineEventHandler((event) => {
  const cookies = parseCookies(event)
  return { cookies }
})
```

### Forwarding Context & Headers

Use `event.$fetch` to pass incoming headers along to internal fetch calls.

```typescript
// server/api/forward.ts
export default defineEventHandler((event) => {
  return event.$fetch('/api/forwarded')
})
```

### Awaiting Promises After Response

Use `event.waitUntil` to run background tasks without delaying the client response.

```typescript
// server/api/background-task.ts
export default eventHandler((event) => {
  event.waitUntil(timeConsumingBackgroundTask())
  return 'done'
})
```

## Server Storage

Nitro offers a cross-platform storage layer. Configure mount points via `nitro.storage` or server plugins.

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

## Nested Router

Create nested routers using `h3` utilities.

```typescript
// server/api/hello/[...slug].ts
import { createRouter, defineEventHandler, useBase } from 'h3'

const router = createRouter()
router.get('/test', defineEventHandler(() => 'Hello World'))

export default useBase('/api/hello', router.handler)
```
