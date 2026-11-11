---
title: "Nitro 快速入门（Getting Started）"
description: "Nitro 是一个兼容任意运行时与任意部署目标的全栈服务器框架。"
category: "nitro"
date: "2026-07-01"
source: "https://nitro.build/guide/getting-started"
---

Nitro 是一个全栈服务器框架（full-stack server framework），兼容任意运行时（runtime）与任意部署目标（deployment target）。

Nitro 为你提供生产可用的服务器，内置文件系统路由（filesystem routing）、代码分割（code-splitting），以及对存储、缓存和数据库的支持——全部与运行时无关，可部署到任意环境。

## 什么是 Nitro？

在 `routes/` 目录中创建服务器路由和 API 路由。每个文件直接映射到一个 URL 路径，其余工作——路由、代码分割和优化构建——由 Nitro 处理。

你也可以通过创建 `server.ts` 文件完全掌控服务器入口。Nitro 的高层、与运行时无关的设计让你可以选用任意 HTTP 库，例如 [Elysia](https://elysiajs.com/)、[h3](https://h3.dev) 或 [Hono](https://hono.dev)。

### 性能

Nitro 在构建时编译路由，无需运行时路由器（runtime router）。每个传入请求只加载并执行其所需的代码。这使其成为无服务器（serverless）托管的理想选择，无论项目规模多大，启动时间都接近 0 毫秒。

### 随处部署

无需任何配置，即可将服务器构建为优化后的 `.output/` 目录，兼容 Node.js、Bun、Deno 以及众多托管平台——Cloudflare Workers、Netlify、Vercel 等。无需改动一行代码，即可利用 ESR、ISR 和 SWR 等平台特性。

### 服务端渲染

用你喜爱的模板引擎渲染 HTML，或直接在服务端使用 React、Vue、Svelte 等组件库。结合客户端激活（client-side hydration）实现完整的通用渲染（universal rendering）。Nitro 提供基础能力，并以渐进式方式助你达成目标。

### 存储

Nitro 开箱即带一个与运行时无关的键值存储（KV storage）层。它默认使用内存存储，但你可以接入 20 多种不同的驱动（FS、Redis、S3 等），把它们挂载到不同的命名空间，并在不改动代码的情况下切换。

### 缓存

Nitro 支持对服务器路由和服务器函数进行缓存，直接由服务器存储支撑（通过 `cache` 命名空间）。

### 数据库

Nitro 还内置了 SQL 数据库。它默认使用 SQLite，但你可以用同一套 API 连接并查询 10 多种数据库（Postgres、MySQL、PGLite 等）。

### 元框架基础

Nitro 可作为构建自有元框架（meta-framework）的基础。Nuxt、SolidStart、TanStack Start 等流行框架都全部或部分地利用了 Nitro。

## 集成 Vite

Nitro 可作为插件与 [Vite](https://vite.dev) 无缝集成。若你正用 Vite 构建前端应用，加入 Nitro 即可获得 API 路由、服务端渲染和完整的生产服务器——全部通过 `vite build` 一起构建。

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { nitro } from "nitro/vite";

export default defineConfig({
  plugins: [nitro()],
});
```

借助 Nitro，`vite build` 会产出优化后的 `.output/` 目录，同时包含前端与后端——可部署到任意环境。

## 创建 Nitro 项目

创建 Nitro 应用最快的方式是使用 `create-nitro-app`：

```bash
npx create-nitro-app@latest
```

请确保已安装 Node.js、Bun 或 Deno 中任一的最新 LTS 版本。

按照 CLI 的提示操作，即可启动开发服务器。

## 添加到 Vite 项目

你可以把 Nitro 添加到任意已有的 Vite 项目，以获得 API 路由、服务端渲染等能力。

### 第 1 步：安装 `nitro` 和 `vite`

```bash
npm install nitro vite
```

### 第 2 步：向 Vite 添加 Nitro 插件

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { nitro } from "nitro/vite";

export default defineConfig({
  plugins: [
    nitro()
  ],
});
```

### 第 3 步：配置 Nitro

创建 `nitro.config.ts` 来配置服务器目录：

```ts
// nitro.config.ts
import { defineConfig } from "nitro";

export default defineConfig({
  serverDir: "./server",
});
```

### 第 4 步：创建 API 路由

在 `server/api/test.ts` 创建你的第一个 API 路由：

```ts
// server/api/test.ts
import { defineHandler } from "nitro";

export default defineHandler(() => {
  return { message: "Hello Nitro!" };
});
```

文件路径直接映射到路由 URL——`server/api/test.ts` 对应 `/api/test`。

### 第 5 步：启动开发服务器

```bash
npm run dev -- --open
```

现在可通过 `http://localhost:3000/api/test` 访问你的 API 路由。
