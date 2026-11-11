---
title: "Nuxt 文件系统路由（routing）"
description: "Nuxt 的文件系统路由会为 pages/ 目录下的每个文件创建一条路由。"
category: "nuxt"
date: "2026-07-01"
source: "https://nuxt.com/docs/getting-started/routing"
---

Nuxt 的一项核心特性是文件系统路由（file system router）。`app/pages/` 目录下的每个 Vue 文件都会生成一个对应的 URL（即路由），用于展示该文件的内容。通过对每个页面使用动态导入，Nuxt 借助代码分割（code splitting）只为所请求的路由下发最少的 JavaScript。

## 页面

Nuxt 路由基于 [vue-router](https://router.vuejs.org)，根据 `app/pages/` 目录中每个组件的文件名生成路由。

这种文件系统路由通过命名约定创建动态路由与嵌套路由：

```bash
# 目录结构
-| pages/
---| about.vue
---| index.vue
---| posts/
-----| [id].vue
```

```json
// 生成的路由文件
{
  "routes": [
    {
      "path": "/about",
      "component": "pages/about.vue"
    },
    {
      "path": "/",
      "component": "pages/index.vue"
    },
    {
      "path": "/posts/:id",
      "component": "pages/posts/[id].vue"
    }
  ]
}
```

## 导航

`<NuxtLink>` 组件用于在页面之间建立链接。它渲染一个 `<a>` 标签，`href` 属性设为目标页面的路由。应用完成注水（hydration）后，页面切换由 JavaScript 通过更新浏览器 URL 完成，从而避免整页刷新，并支持动画过渡。

在客户端，当 `<NuxtLink>` 进入视口时，Nuxt 会提前自动预取所链接页面的组件与载荷（payload），让导航更快。

```vue
<template>
  <header>
    <nav>
      <ul>
        <li><NuxtLink to="/about">About</NuxtLink></li>
        <li><NuxtLink to="/posts/1">Post 1</NuxtLink></li>
        <li><NuxtLink to="/posts/2">Post 2</NuxtLink></li>
      </ul>
    </nav>
  </header>
</template>
```

## 路由参数

可以在 Vue 组件的 `<script setup>` 块或 `setup()` 方法中使用 `useRoute()` 组合式函数，访问当前路由的详细信息。

```vue
<script setup lang="ts">
const route = useRoute()

// 访问 /posts/1 时，route.params.id 为 1
console.log(route.params.id)
</script>
```

## 路由中间件

Nuxt 提供可自定义的路由中间件（route middleware）框架，可在整个应用中使用，适合把进入特定路由前要执行的代码抽取出来。

> 路由中间件运行在 Nuxt 应用的 Vue 部分。尽管名称相近，它与运行在应用 Nitro 服务端部分的服务器中间件完全不同。

> 路由中间件**不会**对服务端路由（如 `/api/*`）或其他服务端请求执行。若要给这些请求应用中间件，请改用服务器中间件。

路由中间件分为三类：

1. **匿名（或内联）路由中间件**，直接定义在使用它的页面中。
2. **具名路由中间件**，放在 `app/middleware/` 目录中，在页面中使用时通过异步导入自动加载。
3. **全局路由中间件**，放在 `app/middleware/` 目录中（带 `.global` 后缀），每次路由变化都会自动执行。

保护 `/dashboard` 页面的 `auth` 中间件示例：

```ts
// middleware/auth.ts
export default defineNuxtRouteMiddleware((to, from) => {
  // isAuthenticated() 是一个校验用户是否已认证的示例方法
  if (isAuthenticated() === false) {
    return navigateTo('/login')
  }
})
```

```vue
<!-- pages/dashboard.vue -->
<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})
</script>

<template>
  <h1>Welcome to your dashboard</h1>
</template>
```

## 路由校验

Nuxt 通过每个待校验页面中 `definePageMeta()` 的 `validate` 属性提供路由校验。

`validate` 属性接收 `route` 作为参数。可以返回布尔值，判断该路由是否应由当前页面渲染；返回 `false` 会触发 404 错误。也可以直接返回带 `status`/`statusText` 的对象，自定义返回的错误。

```vue
<script setup lang="ts">
definePageMeta({
  validate (route) {
    // 检查 id 是否由数字组成
    return typeof route.params.id === 'string' && /^\d+$/.test(route.params.id)
  },
})
</script>
```
