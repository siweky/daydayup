---
title: "Getting Started"
description: "Introduction to Nitro, a full-stack server framework compatible with any runtime and any deployment target."
category: "nitro"
date: "2026-07-01"
source: "https://nitro.build/guide/getting-started"
---

# Getting Started

Nitro is a full-stack server framework, compatible with any runtime and any deployment target.

Nitro gives you a production-ready server with filesystem routing, code-splitting, and built-in support for storage, caching, and databases -- all runtime-agnostic and deployable anywhere.

## What is Nitro?

Create server and API routes inside the `routes/` directory. Each file maps directly to a URL path, and Nitro handles the rest -- routing, code-splitting, and optimized builds.

You can also take full control of the server entry by creating a `server.ts` file. Nitro's high-level, runtime-agnostic approach lets you use any HTTP library, such as [Elysia](https://elysiajs.com/), [h3](https://h3.dev), or [Hono](https://hono.dev).

### Performance

Nitro compiles your routes at build time, removing the need for a runtime router. Only the code required to handle each incoming request is loaded and executed. This makes it ideal for serverless hosting, with near-0ms boot time regardless of project size.

### Deploy Anywhere

Build your server into an optimized `.output/` folder compatible with Node.js, Bun, Deno, and many hosting platforms without any configuration -- Cloudflare Workers, Netlify, Vercel, and more. Take advantage of platform features like ESR, ISR, and SWR without changing a single line of code.

### Server-Side Rendering

Render HTML with your favorite templating engine, or use component libraries such as React, Vue, or Svelte directly on the server. Go full universal rendering with client-side hydration. Nitro provides the foundation and a progressive approach to reach your goals.

### Storage

Nitro includes a runtime-agnostic key-value storage layer out of the box. It uses in-memory storage by default, but you can connect more than 20 different drivers (FS, Redis, S3, etc.), attach them to different namespaces, and swap them without changing your code.

### Caching

Nitro supports caching for both server routes and server functions, backed directly by the server storage (via the `cache` namespace).

### Database

Nitro also includes a built-in SQL database. It defaults to SQLite, but you can connect to and query more than 10 databases (Postgres, MySQL, PGLite, etc.) using the same API.

### Meta-Framework Foundation

Nitro can be used as the foundation for building your own meta-framework. Popular frameworks such as Nuxt, SolidStart, and TanStack Start fully or partially leverage Nitro.

## Vite Integration

Nitro integrates seamlessly with [Vite](https://vite.dev) as a plugin. If you're building a frontend application with Vite, adding Nitro gives you API routes, server-side rendering, and a full production server -- all built together with `vite build`.

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { nitro } from "nitro/vite";

export default defineConfig({
  plugins: [nitro()],
});
```

With Nitro, `vite build` produces an optimized `.output/` folder containing both your frontend and backend -- ready to deploy anywhere.

## Create a Nitro Project

The fastest way to create a Nitro application is using `create-nitro-app`:

```bash
npx create-nitro-app@latest
```

Make sure to have installed the latest LTS version of either Node.js, Bun, or Deno.

Follow the instructions from the CLI and you will be ready to start your development server.

## Add to a Vite Project

You can add Nitro to any existing Vite project to get API routes, server-side rendering, and more.

### Step 1: Install `nitro` and `vite`

```bash
npm install nitro vite
```

### Step 2: Add Nitro plugin to Vite

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

### Step 3: Configure Nitro

Create a `nitro.config.ts` to configure the server directory:

```ts
// nitro.config.ts
import { defineConfig } from "nitro";

export default defineConfig({
  serverDir: "./server",
});
```

### Step 4: Create an API route

Create your first API route at `server/api/test.ts`:

```ts
// server/api/test.ts
import { defineHandler } from "nitro";

export default defineHandler(() => {
  return { message: "Hello Nitro!" };
});
```

The file path maps directly to the route URL -- `server/api/test.ts` becomes `/api/test`.

### Step 5: Start the development server

```bash
npm run dev -- --open
```

Your API route is now accessible at `http://localhost:3000/api/test`.
