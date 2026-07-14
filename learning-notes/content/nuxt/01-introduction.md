---
title: "Introduction"
description: "An overview of the Nuxt framework, its automation features, server-side rendering benefits, and core architecture."
category: "nuxt"
date: "2026-07-01"
source: "https://nuxt.com/docs/getting-started/introduction"
---

# Introduction

Nuxt aims to make web development intuitive and performant while prioritizing an excellent developer experience. It is a free, open-source framework designed to help you build type-safe, production-grade full-stack applications and websites using Vue.js.

Developers can immediately start writing `.vue` files, benefiting from hot module replacement during development and default server-side rendering for production performance. Furthermore, the framework prevents vendor lock-in, enabling deployment anywhere, including edge networks.

## Automation and Conventions

The framework utilizes an opinionated directory structure and conventions to automate repetitive tasks, letting developers concentrate on building features. You can still customize default behaviors via the configuration file.

- **File-based routing:** Routes are defined by your directory structure, simplifying organization and removing manual route setup.
- **Code splitting:** Your code is automatically divided into smaller chunks to decrease initial load times.
- **Server-side rendering out of the box:** Built-in SSR capabilities eliminate the need to configure a separate server.
- **Auto-imports:** Vue composables and components can be used directly from their directories without manual imports, ensuring tree-shaking and optimized bundles.
- **Data-fetching utilities:** Composables are provided for SSR-compatible data fetching and various strategies.
- **Zero-config TypeScript support:** Auto-generated types and configuration files allow you to write type-safe code easily.
- **Configured build tools:** Vite is used by default to provide hot module replacement and production bundling with baked-in best practices.

## Server-Side Rendering

Nuxt includes built-in SSR capabilities by default, offering numerous advantages:

- **Faster initial page load time:** Browsers receive fully rendered HTML immediately, improving perceived load times.
- **Improved SEO:** Search engines can index pages more effectively since HTML content is instantly available.
- **Better performance on low-powered devices:** Reducing client-side JavaScript execution benefits devices that struggle with heavy processing.
- **Better accessibility:** Immediate content availability enhances the experience for users relying on screen readers.
- **Easier caching:** Server-side caching further boosts performance.

Because the framework is versatile, you can statically render your application, disable SSR globally, or use hybrid rendering via route rules.

### Server Engine

The Nitro server engine unlocks advanced full-stack capabilities. During development, it utilizes Rollup and Node.js workers for context isolation and server code. It also automatically generates your server API and middleware by reading specific directories.

For production, Nitro compiles your application and server into a single, lightweight output directory. This minified output removes Node.js modules (excluding polyfills) and can be deployed on any JavaScript-supporting system, including serverless, edge, or static environments.

### Production-ready

Applications can be deployed on Node or Deno servers, pre-rendered for static hosting, or pushed to serverless and edge providers.

### Modular

A robust module system enables you to extend the framework with custom features and third-party service integrations.

### Architecture

The framework consists of several core packages:

- **Core engine:** The main package powering the framework.
- **Bundlers:** Support for Vite, Rspack, and Webpack.
- **Command line interface:** The official CLI tool.
- **Server engine:** Powered by Nitro.
- **Development kit:** Utilities for module and plugin authors.
