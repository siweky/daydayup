---
title: "Routing"
description: "Nitro supports filesystem routing to automatically map files to routes with code-splitting and compiled routes."
category: "nitro"
date: "2026-07-01"
source: "https://nitro.build/guide/routing"
---

# Routing

Nitro supports filesystem routing to automatically map files to routes. By combining code-splitting with compiled routes, it removes the need for a runtime router, leaving only minimal compiled logic.

## Request Handler

Nitro request handler is a function accepting an `event` object, which is a `H3Event` object.

```ts
// Single function
import type { H3Event } from "nitro";

export default (event: H3Event) => {
  return "world";
}
```

```ts
// With defineHandler
import { defineHandler } from "nitro";

export default defineHandler((event) => {
  return "world";
});
```

## Filesystem Routing

Nitro supports file-based routing for your API routes (files are automatically mapped to h3 routes). Defining a route is as simple as creating a file inside the `api/` or `routes/` directory.

You can only define one handler per file and you can append the HTTP method to the filename to define a specific request method.

```
routes/
  api/
    test.ts      <-- /api/test
  hello.get.ts   <-- /hello (GET only)
  hello.post.ts  <-- /hello (POST only)
vite.config.ts
```

You can nest routes by creating subdirectories.

```txt
routes/
  api/
    [org]/
      [repo]/
        index.ts   <-- /api/:org/:repo
        issues.ts  <-- /api/:org/:repo/issues
      index.ts     <-- /api/:org
package.json
```

### Route Groups

You can group a set of routes together in a way which doesn't affect file-based routing by wrapping folder names in parentheses `(` and `)`.

```txt
routes/
  api/
    (admin)/
      users.ts   <-- /api/users
      reports.ts <-- /api/reports
    (public)/
      index.ts   <-- /api
```

### Static Routes

Create a file in `routes/` or `routes/api/` directory. The filename will be the route path.

```ts
// routes/api/test.ts
import { defineHandler } from "nitro";

export default defineHandler(() => {
  return { hello: "API" };
});
```

### Dynamic Routes

#### Single param

Use the `[<param>]` syntax where `<param>` is the name of the param. The param will be available in `event.context.params`.

```ts
// routes/hello/[name].ts
import { defineHandler } from "nitro";

export default defineHandler((event) => {
  const { name } = event.context.params;
  return `Hello ${name}!`;
});
```

#### Multiple params

Use `[<param1>]/[<param2>]` syntax where each param is a folder. You **cannot** define multiple params in a single filename or folder.

```ts
// routes/hello/[name]/[age].ts
import { defineHandler } from "nitro";

export default defineHandler((event) => {
  const { name, age } = event.context.params;
  return `Hello ${name}! You are ${age} years old.`;
});
```

#### Catch-all params

Capture all the remaining parts of a URL using `[...<param>]` syntax.

```ts
// routes/hello/[...name].ts
import { defineHandler } from "nitro";

export default defineHandler((event) => {
  const { name } = event.context.params;
  return `Hello ${name}!`;
});
```

### Specific Request Method

Append the HTTP method to the filename to force the route to be matched only for a specific HTTP request method.

Supported methods: `get`, `post`, `put`, `delete`, `patch`, `head`, `options`, `connect`, `trace`.

```ts
// routes/users/[id].get.ts
import { defineHandler } from "nitro";

export default defineHandler(async (event) => {
  const { id } = event.context.params;
  return `User profile!`;
});
```

```ts
// routes/users.post.ts
import { defineHandler } from "nitro";

export default defineHandler(async (event) => {
  const body = await event.req.json();
  return { updated: true };
});
```

### Environment Specific Handlers

Specify for a route that will only be included in specific builds by adding a `.dev`, `.prod` or `.prerender` suffix.

```txt
routes/
  env/
    index.dev.ts       <-- /env (dev only)
    index.get.prod.ts  <-- /env (GET, prod only)
```

### Ignoring Files

Use the `ignore` config option to exclude files from route scanning.

```ts
// nitro.config.ts
import { defineConfig } from "nitro";

export default defineConfig({
  ignore: [
    "routes/api/**/_*",   // Ignore files starting with _ in api/
    "middleware/_*.ts",    // Ignore middleware starting with _
    "routes/_*.ts",       // Ignore root routes starting with _
  ],
});
```

## Programmatic Route Handlers

### `routes` config

Register route handlers programmatically using the `routes` config option:

```ts
// nitro.config.ts
import { defineConfig } from "nitro";

export default defineConfig({
  routes: {
    "/api/hello": "./server/routes/api/hello.ts",
    "/api/custom": {
      handler: "./server/routes/api/hello.ts",
      method: "POST",
      lazy: true,
    },
  },
});
```

### `handlers` config

The `handlers` array is useful for registering middleware with control over route matching:

```ts
// nitro.config.ts
import { defineConfig } from "nitro";

export default defineConfig({
  handlers: [
    {
      route: "/api/**",
      handler: "./server/middleware/api-auth.ts",
      middleware: true,
    },
  ],
});
```

## Middleware

Nitro route middleware can hook into the request lifecycle. Middleware are auto-registered within the `middleware/` directory.

```ts
// middleware/auth.ts
import { defineHandler } from "nitro";

export default defineHandler((event) => {
  event.context.user = { name: "Nitro" };
});
```

> Returning anything from a middleware will close the request and should be avoided!

### Execution Order

Middleware are executed in directory listing order. Prefix middleware with a number to control their execution order:

```md
middleware/
  01.logger.ts  <-- First
  02.auth.ts    <-- Second
```

### Route-scoped Middleware

Register middleware for specific route patterns using the `handlers` config:

```ts
// nitro.config.ts
import { defineConfig } from "nitro";

export default defineConfig({
  handlers: [
    {
      route: "/api/**",
      handler: "./server/middleware/api-auth.ts",
      middleware: true,
    },
  ],
});
```

## Route Rules

Nitro allows you to add logic at the top-level for each route. It can be used for redirecting, proxying, caching, authentication, and adding headers.

```ts
// nitro.config.ts
import { defineConfig } from "nitro";

export default defineConfig({
  routeRules: {
    '/blog/**': { swr: true },
    '/blog2/**': { swr: 600 },
    '/blog3/**': { static: true },
    '/assets/**': { headers: { 'cache-control': 's-maxage=0' } },
    '/api/v1/**': { cors: true, headers: { 'access-control-allow-methods': 'GET' } },
    '/old-page': { redirect: '/new-page' },
    '/proxy/example': { proxy: 'https://example.com' },
    '/admin/**': { basicAuth: { username: 'admin', password: 'supersecret' } },
  }
});
```

### Route Rules Reference

| Option | Type | Description |
|--------|------|-------------|
| `headers` | `Record<string, string>` | Custom response headers |
| `redirect` | `string \| { to, status? }` | Redirect to another URL (default: `307`) |
| `proxy` | `string \| { to, ...options }` | Proxy requests to another URL |
| `cors` | `boolean` | Enable permissive CORS headers |
| `cache` | `object \| false` | Cache options |
| `swr` | `boolean \| number` | Shortcut for `cache: { swr: true, maxAge }` |
| `static` | `boolean \| number` | Shortcut for static caching |
| `basicAuth` | `object \| false` | HTTP Basic Authentication |
| `prerender` | `boolean` | Enable/disable prerendering |
| `isr` | `boolean \| number \| object` | Incremental Static Regeneration (Vercel) |

## Config Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `baseURL` | `string` | `"/"` | Base URL for all routes |
| `apiBaseURL` | `string` | `"/api"` | Base URL for routes in the `api/` directory |
| `serverDir` | `string \| false` | `false` | Server directory for scanning routes |
| `routes` | `Record<string, handler>` | `{}` | Route-to-handler mapping |
| `handlers` | `NitroEventHandler[]` | `[]` | Programmatic handler registration |
| `routeRules` | `Record<string, NitroRouteConfig>` | `{}` | Route rules for matching patterns |
| `ignore` | `string[]` | `[]` | Glob patterns to ignore during file scanning |
