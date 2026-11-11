---
title: "Nuxt 自动导入（auto-imports）机制"
description: "介绍 Nuxt 如何自动导入组件、组合式函数、工具函数与 Vue API，简化开发流程。"
category: "nuxt"
date: "2026-07-01"
source: "https://nuxt.com/docs/guide/concepts/auto-imports"
---

Nuxt 会自动引入组件、组合式函数（composables）与 Vue.js API，让你在应用中随处使用，无需编写显式的导入语句。

```vue
<script setup lang="ts">
const count = ref(1) // ref is auto-imported
</script>
```

得益于特定的目录结构，Nuxt 能自动导入 `app/components/`、`app/composables/` 与 `app/utils/` 目录中的内容。

与传统的全局声明不同，这种方式保留 TypeScript 类型、IDE 补全，并确保生产代码只包含实际用到的部分。

文档中任何没有显式导入的函数都由 Nuxt 自动处理。你也可以自动导入 `server/utils/` 目录中导出的函数。此外，可通过 `nuxt.config` 文件中的 `imports` 配置段设置自定义目录或第三方包。

## 内置自动导入

框架会自动导入用于数据获取、访问应用上下文与运行时配置、管理状态，以及定义插件或组件的组合式函数与函数。

```vue
<script setup lang="ts">
/* useFetch() 是自动导入的 */
const { data, refresh, status } = await useFetch('/api/hello')
</script>
```

Vue 的响应式 API，如 `computed` 与 `ref`，以及生命周期辅助函数，也会被自动引入。

```vue
<script setup lang="ts">
/* ref() 和 computed() 是自动导入的 */
const count = ref(1)
const double = computed(() => count.value * 2)
</script>
```

### Vue 与 Nuxt 组合式函数

使用 Vue 与 Nuxt 内置的组合式 API（Composition API）工具时，要记住其中许多需要在正确的上下文中调用。

在组件生命周期中，Vue 通过一个全局变量跟踪当前组件的临时实例，并在同一 tick 内将其清除。Nuxt 用 `nuxtApp` 做类似的事。这可以避免服务端渲染期间出现跨请求的状态污染。

因此，通常不能在 Nuxt 插件、路由中间件或 Vue setup 函数之外使用它们，并且必须同步调用。除非是在 `<script setup>` 块中，或使用了 `defineNuxtComponent`、`defineNuxtPlugin`、`defineNuxtRouteMiddleware` 的组件 setup 函数里，否则不能在调用组合式函数之前使用 `await`。

若遇到 "Nuxt instance is unavailable" 报错，很可能是在错误的生命周期位置调用了 Nuxt 组合式函数。

**错误用法示例：**

```ts
// 尝试在组合式函数外访问运行时配置
const config = useRuntimeConfig()

export const useMyComposable = () => {
  // 在此处访问运行时配置
}
```

**正确用法示例：**

```ts
export const useMyComposable = () => {
  // 由于组合式函数在生命周期中的正确位置被调用，
  // useRuntimeConfig 在此处可用
  const config = useRuntimeConfig()
  // ...
}
```

## 基于目录的自动导入

放在特定目录下的文件会被直接导入：

- `app/components/`：Vue 组件。
- `app/composables/`：Vue 组合式函数。
- `app/utils/`：辅助函数与工具函数。

注意，由于 Vue 对非顶层 ref 的处理方式，自动导入的 `ref` 与 `computed` 属性在组件 `<template>` 中不会自动解包。

### 显式导入

每个自动导入项都通过 `#imports` 别名暴露，需要时可以写成显式导入：

```vue
<script setup lang="ts">
import { computed, ref } from '#imports'

const count = ref(1)
const double = computed(() => count.value * 2)
</script>
```

### 关闭自动导入

要关闭组合式函数与工具函数的自动导入，在配置文件中把 `imports.autoImport` 设为 `false`。

```ts
export default defineNuxtConfig({
  imports: {
    autoImport: false,
  },
})
```

这会完全关闭该功能，但仍可从 `#imports` 显式导入。

### 部分关闭自动导入

如果希望 `ref` 这类框架函数仍自动导入，但自己的自定义代码改为手工导入，把 `imports.scan` 选项设为 `false`：

```ts
export default defineNuxtConfig({
  imports: {
    scan: false,
  },
})
```

## 自动导入的组件

`~/components` 目录中的组件同样会被自动导入，但这项配置与工具函数、组合式函数是分开的。

要为自己的组件目录关闭该行为，把 `components.dirs` 设为空数组：

```ts
export default defineNuxtConfig({
  components: {
    dirs: [],
  },
})
```

## 从第三方包自动导入

也可以为外部包配置自动导入，通过 `presets` 数组手动开启：

```ts
export default defineNuxtConfig({
  imports: {
    presets: [
      {
        from: 'vue-i18n',
        imports: ['useI18n'],
      },
    ],
  },
})
```
