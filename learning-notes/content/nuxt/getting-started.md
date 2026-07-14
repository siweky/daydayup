---
title: 'Nuxt 3 入门指南'
description: '从零开始学习 Nuxt 3，了解核心概念与项目结构'
date: '2024-12-10'
---

# Nuxt 3 入门指南

## 什么是 Nuxt

Nuxt 是一个基于 Vue.js 的全栈框架，它提供了开箱即用的服务端渲染（SSR）、静态站点生成（SSG）等能力。

## 核心特性

- **文件路由系统**：基于 `pages/` 目录自动生成路由
- **自动导入**：组件、composables、工具函数自动导入
- **混合渲染**：支持 SSR、SSG、ISR 等多种渲染模式
- **Nitro 引擎**：强大的服务端能力

## 项目结构

```
my-nuxt-app/
├── app/
│   ├── app.vue
│   ├── pages/
│   ├── components/
│   ├── composables/
│   ├── layouts/
│   └── assets/
├── content/
├── public/
├── server/
│   └── api/
├── nuxt.config.ts
└── package.json
```

## 快速开始

```bash
npx nuxi@latest init my-app
cd my-app
npm install
npm run dev
```

## 页面与路由

Nuxt 会根据 `pages/` 目录自动生成路由：

```
pages/
├── index.vue       → /
├── about.vue       → /about
└── posts/
    ├── index.vue   → /posts
    └── [id].vue    → /posts/:id
```

## 数据获取

使用 `useAsyncData` 或 `useFetch` 获取数据：

```vue
<script setup>
const { data } = await useFetch('/api/hello')
</script>
```

## 总结

Nuxt 3 提供了优秀的开发体验，让开发者能够专注于业务逻辑而非基础设施搭建。
