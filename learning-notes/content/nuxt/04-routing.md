---
title: "Routing"
description: "Nuxt file-system routing creates a route for every file in the pages/ directory."
category: "nuxt"
date: "2026-07-01"
source: "https://nuxt.com/docs/getting-started/routing"
---

# Routing

One core feature of Nuxt is the file system router. Every Vue file inside the `app/pages/` directory creates a corresponding URL (or route) that displays the contents of the file. By using dynamic imports for each page, Nuxt leverages code-splitting to ship the minimum amount of JavaScript for the requested route.

## Pages

Nuxt routing is based on [vue-router](https://router.vuejs.org) and generates the routes from every component created in the `app/pages/` directory, based on their filename.

This file system routing uses naming conventions to create dynamic and nested routes:

```bash
# Directory Structure
-| pages/
---| about.vue
---| index.vue
---| posts/
-----| [id].vue
```

```json
// Generated Router File
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

## Navigation

The `<NuxtLink>` component links pages between them. It renders an `<a>` tag with the `href` attribute set to the route of the page. Once the application is hydrated, page transitions are performed in JavaScript by updating the browser URL. This prevents full-page refreshes and allows for animated transitions.

When a `<NuxtLink>` enters the viewport on the client side, Nuxt will automatically prefetch components and payload of the linked pages ahead of time, resulting in faster navigation.

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

## Route Parameters

The `useRoute()` composable can be used in a `<script setup>` block or a `setup()` method of a Vue component to access the current route details.

```vue
<script setup lang="ts">
const route = useRoute()

// When accessing /posts/1, route.params.id will be 1
console.log(route.params.id)
</script>
```

## Route Middleware

Nuxt provides a customizable route middleware framework you can use throughout your application, ideal for extracting code that you want to run before navigating to a particular route.

> Route middleware runs within the Vue part of your Nuxt app. Despite the similar name, they are completely different from server middleware, which are run in the Nitro server part of your app.

> Route middleware does **not** run for server routes (e.g. `/api/*`) or other server requests. To apply middleware to these requests, use server middleware instead.

There are three kinds of route middleware:

1. **Anonymous (or inline) route middleware**, which are defined directly in the pages where they are used.
2. **Named route middleware**, which are placed in the `app/middleware/` directory and will be automatically loaded via asynchronous import when used on a page.
3. **Global route middleware**, which are placed in the `app/middleware/` directory (with a `.global` suffix) and will be automatically run on every route change.

Example of an `auth` middleware protecting the `/dashboard` page:

```ts
// middleware/auth.ts
export default defineNuxtRouteMiddleware((to, from) => {
  // isAuthenticated() is an example method verifying if a user is authenticated
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

## Route Validation

Nuxt offers route validation via the `validate` property in `definePageMeta()` in each page you wish to validate.

The `validate` property accepts the `route` as an argument. You can return a boolean value to determine whether or not this is a valid route to be rendered with this page. If you return `false`, this will cause a 404 error. You can also directly return an object with `status`/`statusText` to customize the error returned.

```vue
<script setup lang="ts">
definePageMeta({
  validate (route) {
    // Check if the id is made up of digits
    return typeof route.params.id === 'string' && /^\d+$/.test(route.params.id)
  },
})
</script>
```
