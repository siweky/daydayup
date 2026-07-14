---
title: "Deploy"
description: "Learn how to deploy Nitro applications to various hosting providers with zero-config presets."
category: "nitro"
date: "2026-07-01"
source: "https://nitro.build/guide/deploy"
---

# Deploy

Nitro can generate different output formats suitable for different hosting providers from the same code base. Using built-in presets, you can easily configure Nitro to adjust its output format with almost no additional code or configuration.

## Default Output

The default production output preset is **Node.js server**.

When running Nitro in development mode, Nitro will always use a special preset called `nitro-dev` using Node.js with ESM in an isolated Worker environment with behavior as close as possible to the production environment.

## Zero-Config Providers

When deploying to production using CI/CD, Nitro tries to automatically detect the provider environment and set the right one without any additional configuration required. Currently, the following providers can be auto-detected with zero config:

- AWS Amplify
- Azure
- Cloudflare
- Firebase App Hosting
- Netlify
- Stormkit
- Vercel
- Zeabur

> **Warning for Turborepo users:** Zero config detection will be interfered by its Strict Environment Mode. You may need to allow the variables explicitly or use its Loose Environment Mode (with `--env-mode=loose` flag).

Other built-in providers are available with an explicit preset, including Zephyr.

## Changing the Deployment Preset

If you need to build Nitro against a specific provider, you can target it by defining an environment variable named `NITRO_PRESET` or `SERVER_PRESET`, or by updating your Nitro configuration or using `--preset` argument.

Using the environment variable approach is recommended for deployments depending on CI/CD.

**Example:** Defining a `NITRO_PRESET` environment variable:

```bash
nitro build --preset cloudflare_pages
```

**Example:** Updating the `nitro.config.ts` file:

```ts
import { defineConfig } from "nitro";

export default defineConfig({
  preset: 'cloudflare_pages'
})
```

## Compatibility Date

Deployment providers regularly update their runtime behavior. Nitro presets are updated to support these new features.

To prevent breaking existing deployments, Nitro uses compatibility dates. These dates let you lock in behavior at the project creation time. You can also opt in to future updates when ready.

When you create a new project, the `compatibilityDate` is set to the current date. This setting is saved in your project's configuration.

You should update the compatibility date periodically. Always test your deployment thoroughly after updating.

## Common Deployment Targets

### Node.js

The default preset. Builds a standalone Node.js server:

```bash
nitro build
node .output/server/index.mjs
```

### Cloudflare Workers / Pages

```bash
nitro build --preset cloudflare_pages
```

### Vercel

```bash
nitro build --preset vercel
```

### Netlify

```bash
nitro build --preset netlify
```

### Deno

```bash
nitro build --preset deno_server
```

### Bun

```bash
nitro build --preset bun
```

### Static / Prerendered

Pre-render all routes at build time for static hosting:

```bash
nitro build --preset static
```

### Docker

Create a Dockerfile for your Nitro application:

```dockerfile
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
```

## Environment Variables

Set runtime configuration via environment variables:

```ts
// nitro.config.ts
import { defineConfig } from "nitro";

export default defineConfig({
  runtimeConfig: {
    apiSecret: '',  // Set via NUXT_API_SECRET env var
    public: {
      apiBase: '/api',  // Set via NUXT_PUBLIC_API_BASE env var
    },
  },
})
```

## Build Output

The `.output/` directory contains everything needed to run your application:

```
.output/
  server/
    index.mjs     # Entry point
    chunks/       # Code-split chunks
  public/         # Static assets
  nitro.json      # Build metadata
```
