---
title: "Auto-imports"
description: "How Nuxt automatically imports components, composables, utilities, and Vue APIs to streamline development."
category: "nuxt"
date: "2026-07-01"
source: "https://nuxt.com/docs/guide/concepts/auto-imports"
---

# Auto-imports

Nuxt automatically brings in components, composables, and Vue.js APIs so you can use them throughout your app without writing explicit import statements.

```vue
<script setup lang="ts">
const count = ref(1) // ref is auto-imported
</script>
```

Because of its specific folder layout, Nuxt can automatically import items from your `app/components/`, `app/composables/`, and `app/utils/` directories.

Unlike traditional global declarations, this approach maintains TypeScript typings, IDE completions, and ensures it only includes what is used in your production code.

Any function in the documentation that isn't explicitly imported is handled by Nuxt automatically. You can also auto-import exported functions from the `server/utils/` directory. Furthermore, custom folders or third-party packages can be configured via the `imports` section in your `nuxt.config` file.

## Built-in Auto-imports

The framework automatically imports composables and functions for tasks like data fetching, accessing app context and runtime configuration, managing state, and defining plugins or components.

```vue
<script setup lang="ts">
/* useFetch() is auto-imported */
const { data, refresh, status } = await useFetch('/api/hello')
</script>
```

Vue's Reactivity APIs, such as `computed` and `ref`, along with lifecycle helpers, are also brought in automatically.

```vue
<script setup lang="ts">
/* ref() and computed() are auto-imported */
const count = ref(1)
const double = computed(() => count.value * 2)
</script>
```

### Vue and Nuxt Composables

When utilizing built-in Composition API tools from Vue and Nuxt, remember that many require being invoked within the correct context.

During a component's lifecycle, Vue tracks the temporary instance of the current component via a global variable, unsetting it in the same tick. Nuxt does something similar with `nuxtApp`. This prevents cross-request state pollution during server rendering.

Consequently, you generally cannot use these outside of a Nuxt plugin, route middleware, or Vue setup function. They must also be used synchronously. You cannot use `await` before calling a composable, except within `<script setup>` blocks, the setup function of a component using `defineNuxtComponent`, `defineNuxtPlugin`, or `defineNuxtRouteMiddleware`.

If you encounter an error stating "Nuxt instance is unavailable", you are likely invoking a Nuxt composable in an incorrect lifecycle location.

**Example of breaking code:**

```ts
// trying to access runtime config outside a composable
const config = useRuntimeConfig()

export const useMyComposable = () => {
  // accessing runtime config here
}
```

**Example of working code:**

```ts
export const useMyComposable = () => {
  // Because your composable is called in the right place in the lifecycle,
  // useRuntimeConfig will work here
  const config = useRuntimeConfig()
  // ...
}
```

## Directory-based Auto-imports

Files placed in specific folders are imported directly:

- `app/components/` for Vue components.
- `app/composables/` for Vue composables.
- `app/utils/` for helper functions and utilities.

Note that auto-imported `ref` and `computed` properties will not be unwrapped automatically inside a component `<template>` due to how Vue handles refs that aren't top-level.

### Explicit Imports

Every auto-imported item is exposed via the `#imports` alias, allowing you to make the import explicit if desired:

```vue
<script setup lang="ts">
import { computed, ref } from '#imports'

const count = ref(1)
const double = computed(() => count.value * 2)
</script>
```

### Disabling Auto-imports

To turn off automatic importing for composables and utilities, set `imports.autoImport` to `false` in your configuration file.

```ts
export default defineNuxtConfig({
  imports: {
    autoImport: false,
  },
})
```

This completely disables the feature, though you can still rely on explicit imports from `#imports`.

### Partially Disabling Auto-imports

If you want framework functions like `ref` to remain automatic but prefer to manually import your own custom code, set the `imports.scan` option to `false`:

```ts
export default defineNuxtConfig({
  imports: {
    scan: false,
  },
})
```

## Auto-imported Components

Components from your `~/components` directory are also brought in automatically, though this is configured separately from utilities and composables.

To disable this behavior for your own components directory, set `components.dirs` to an empty array:

```ts
export default defineNuxtConfig({
  components: {
    dirs: [],
  },
})
```

## Auto-import from Third-Party Packages

You can also configure automatic imports for external packages. Enable it manually using the `presets` array:

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
