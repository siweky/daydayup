---
title: "路由与文件系统路由（Routing）"
description: "Nitro 支持文件系统路由，将文件自动映射为路由，并具备代码分割与编译路由能力。"
category: "nitro"
date: "2026-07-01"
source: "https://nitro.build/guide/routing"
---

Nitro 支持文件系统路由（filesystem routing），自动将文件映射为路由。通过代码分割（code-splitting）与编译路由相结合，它免去了对运行时路由器（runtime router）的依赖，只留下最小化的编译逻辑。

## 请求处理器

Nitro 的请求处理器是一个接收 `event` 对象的函数，其类型为 `H3Event`。

```ts
// 单个函数
import type { H3Event } from "nitro";

export default (event: H3Event) => {
  return "world";
}
```

```ts
// 使用 defineHandler
import { defineHandler } from "nitro";

export default defineHandler((event) => {
  return "world";
});
```

## 文件系统路由

Nitro 为 API 路由提供基于文件的路由（file-based routing）：`api/`、`routes/` 下的文件会自动映射为 h3 路由。定义路由只需新建一个文件。

每个文件只能定义一个处理器，你可以在文件名后追加 HTTP 方法，以指定具体的请求方法。

```
routes/
  api/
    test.ts      <-- /api/test
  hello.get.ts   <-- /hello （仅 GET）
  hello.post.ts  <-- /hello （仅 POST）
vite.config.ts
```

你可以通过创建子目录来嵌套路由。

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

### 路由组

你可以用括号 `(` 和 `)` 包裹文件夹名，在不影响基于文件的路由的前提下把一组路由归在一起。

```txt
routes/
  api/
    (admin)/
      users.ts   <-- /api/users
      reports.ts <-- /api/reports
    (public)/
      index.ts   <-- /api
```

### 静态路由

在 `routes/` 或 `routes/api/` 目录中创建文件，文件名即为路由路径。

```ts
// routes/api/test.ts
import { defineHandler } from "nitro";

export default defineHandler(() => {
  return { hello: "API" };
});
```

### 动态路由

#### 单个参数

使用 `[<param>]` 语法，其中 `<param>` 为参数名。该参数可在 `event.context.params` 中获取。

```ts
// routes/hello/[name].ts
import { defineHandler } from "nitro";

export default defineHandler((event) => {
  const { name } = event.context.params;
  return `Hello ${name}!`;
});
```

#### 多个参数

使用 `[<param1>]/[<param2>]` 语法，每个参数对应一个文件夹。你 **不能** 在单个文件名或文件夹中定义多个参数。

```ts
// routes/hello/[name]/[age].ts
import { defineHandler } from "nitro";

export default defineHandler((event) => {
  const { name, age } = event.context.params;
  return `Hello ${name}! You are ${age} years old.`;
});
```

#### 捕获所有参数

使用 `[...<param>]` 语法捕获 URL 中剩余的所有部分。

```ts
// routes/hello/[...name].ts
import { defineHandler } from "nitro";

export default defineHandler((event) => {
  const { name } = event.context.params;
  return `Hello ${name}!`;
});
```

### 指定请求方法

在文件名后追加 HTTP 方法，强制该路由仅匹配特定的 HTTP 请求方法。

支持的方法：`get`、`post`、`put`、`delete`、`patch`、`head`、`options`、`connect`、`trace`。

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

### 环境专属处理器

通过添加 `.dev`、`.prod` 或 `.prerender` 后缀，指定某路由仅在特定构建中纳入。

```txt
routes/
  env/
    index.dev.ts       <-- /env （仅开发环境）
    index.get.prod.ts  <-- /env （GET，仅生产环境）
```

### 忽略文件

使用 `ignore` 配置项将文件排除在路由扫描之外。

```ts
// nitro.config.ts
import { defineConfig } from "nitro";

export default defineConfig({
  ignore: [
    "routes/api/**/_*",   // 忽略 api/ 中以下划线开头的文件
    "middleware/_*.ts",    // 忽略以下划线开头的中间件
    "routes/_*.ts",       // 忽略根路由中以下划线开头的文件
  ],
});
```

## 编程式路由处理器

### `routes` 配置

使用 `routes` 配置项以编程方式注册路由处理器：

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

### `handlers` 配置

`handlers` 数组适用于注册中间件（middleware），并可控制路由匹配：

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

## 中间件

Nitro 路由中间件可以挂接到请求生命周期。中间件会在 `middleware/` 目录中自动注册。

```ts
// middleware/auth.ts
import { defineHandler } from "nitro";

export default defineHandler((event) => {
  event.context.user = { name: "Nitro" };
});
```

> 中间件里一旦返回值就会提前结束请求，应当避免！

### 执行顺序

中间件按目录列举顺序执行。给中间件加数字前缀即可控制其执行顺序：

```md
middleware/
  01.logger.ts  <-- 第一个
  02.auth.ts    <-- 第二个
```

### 路由作用域中间件

使用 `handlers` 配置为特定路由模式注册中间件：

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

## 路由规则

Nitro 允许你在顶层为每条路由添加逻辑，即路由规则（route rules），可用于重定向、代理、缓存、身份认证以及添加响应头。

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

### 路由规则参考

| 配置项 | 类型 | 说明 |
|--------|------|-------------|
| `headers` | `Record<string, string>` | 自定义响应头 |
| `redirect` | `string \| { to, status? }` | 重定向到另一个 URL（默认 `307`） |
| `proxy` | `string \| { to, ...options }` | 将请求代理到另一个 URL |
| `cors` | `boolean` | 启用宽松的 CORS 响应头 |
| `cache` | `object \| false` | 缓存选项 |
| `swr` | `boolean \| number` | `cache: { swr: true, maxAge }` 的快捷方式 |
| `static` | `boolean \| number` | 静态缓存的快捷方式 |
| `basicAuth` | `object \| false` | HTTP 基础认证 |
| `prerender` | `boolean` | 启用/禁用预渲染 |
| `isr` | `boolean \| number \| object` | 增量静态再生（Incremental Static Regeneration，Vercel） |

## 配置参考

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|---------|-------------|
| `baseURL` | `string` | `"/"` | 所有路由的基础 URL |
| `apiBaseURL` | `string` | `"/api"` | `api/` 目录中路由的基础 URL |
| `serverDir` | `string \| false` | `false` | 用于扫描路由的服务器目录 |
| `routes` | `Record<string, handler>` | `{}` | 路由到处理器的映射 |
| `handlers` | `NitroEventHandler[]` | `[]` | 编程式注册处理器 |
| `routeRules` | `Record<string, NitroRouteConfig>` | `{}` | 匹配模式的路由规则 |
| `ignore` | `string[]` | `[]` | 文件扫描时忽略的 glob 模式 |
