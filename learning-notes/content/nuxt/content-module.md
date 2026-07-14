---
title: 'Nuxt Content 模块详解'
description: '深入了解 @nuxt/content 模块，实现基于 Markdown 的内容管理'
date: '2024-12-15'
---

# Nuxt Content 模块详解

## 概述

`@nuxt/content` 是 Nuxt 官方的内容模块，它允许你使用 Markdown、YAML、JSON 或 CSV 文件来管理网站内容。

## 安装与配置

```bash
npm install @nuxt/content
```

在 `nuxt.config.ts` 中添加模块：

```ts
export default defineNuxtConfig({
  modules: ['@nuxt/content'],
})
```

## 定义集合

使用 `content.config.ts` 定义内容集合：

```ts
import { defineContentConfig, defineCollection } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    docs: defineCollection({
      type: 'page',
      source: 'docs/**',
    }),
  },
})
```

## 查询内容

使用 `queryCollection` 查询集合中的内容：

```vue
<script setup>
const { data: articles } = await useAsyncData('articles', () =>
  queryCollection('docs').all()
)
</script>
```

## 渲染内容

使用 `ContentRenderer` 组件渲染 Markdown：

```vue
<template>
  <ContentRenderer :value="page" />
</template>
```

## Frontmatter

在 Markdown 文件顶部使用 YAML frontmatter：

```md
---
title: '文章标题'
description: '文章描述'
date: '2024-01-01'
---
```

## 总结

`@nuxt/content` 让静态内容管理变得简单而强大，非常适合文档站点和博客。
