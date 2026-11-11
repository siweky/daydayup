---
title: "Nuxt 数据获取：useAsyncData / useFetch / $fetch 怎么选"
description: "三种取数方式的行为差异、SSR 去重与缓存键、错误处理与取消、payload 水合，以及本站内容查询的实际写法"
category: "nuxt"
date: "2026-11-11"
---

## 一、三者定位完全不同

| API | 运行环境 | SSR 去重 | 响应式 | 典型用途 |
|---|---|---|---|---|
| `$fetch` | 客户端 / 服务端均可 | 无 | 无（一次 Promise） | 事件回调里提交表单、服务端调用第三方接口 |
| `useFetch` | 组件 setup（有 Nuxt 上下文） | 有（按 key 复用） | `data` / `status` / `error` 响应式 | 请求自己的 HTTP 接口 |
| `useAsyncData` | 组件 setup | 有（按 key 复用） | 同上 | 包装任意异步逻辑，如 `queryCollection` |

一句话记忆：**`$fetch` 是请求工具，`useFetch` 是「带 SSR 状态的 $fetch」，`useAsyncData` 是「带 SSR 状态的任意 Promise」**。

```ts
// 事件回调里不要用 useFetch：它依赖组件上下文
async function onSubmit() {
  await $fetch('/api/notes', { method: 'POST', body: form })
}

// setup 顶层用 useFetch，SSR 与客户端只发一次请求
const { data, error, refresh } = await useFetch('/api/notes')

// 不是 HTTP 的异步逻辑用 useAsyncData
const { data: articles } = await useAsyncData('ai-agent-page', () =>
  queryCollection('aiAgent').all()
)
```

## 二、SSR 去重与 key

Nuxt 在服务端执行 `useAsyncData` 时会把结果序列化进 payload，客户端水合时**复用同一份数据**，不会重复请求。复用的依据是 key：

```ts
// ❌ 两个页面用同一个 key，数据会互相覆盖
await useAsyncData('list', () => queryCollection('notes').all())
await useAsyncData('list', () => queryCollection('nuxt').all())

// ✅ 本站首页按集合区分
await useAsyncData('notes-list', () => queryCollection('notes').all())
await useAsyncData('nuxt-list', () => queryCollection('nuxt').all())
await useAsyncData('ai-agent-list', () => queryCollection('aiAgent').all())
```

参数化页面要把参数拼进 key，否则从 A 文章跳到 B 文章会拿到缓存的 A：

```ts
const route = useRoute()
const key = computed(() => `page-${route.path}`)
const { data } = await useAsyncData(key, () =>
  queryCollection('notes').path(route.path).first()
)
```

本站 `[...slug].vue` 用 `` `page-${fullPath.value}` `` 做 key，正是这个道理。

### 常用选项

```ts
const { data, status, error, refresh, clear } = await useAsyncData(
  'notes-list',
  () => queryCollection('notes').all(),
  {
    lazy: false,          // true 时不阻塞导航，需自己处理 pending
    immediate: true,      // false 时手动调用 execute()
    server: true,         // false 时只在客户端取
    transform: (rows) => rows.filter(r => r.title),  // 裁剪进 payload 的数据
    pick: ['title', 'path', 'date'],                 // 只序列化需要的字段
    watch: [someRef],     // 依赖变化时自动重取
    default: () => [],    // 初始/失败时的默认值
  }
)
```

`transform` / `pick` 很实用：内容集合的 `body` 是整篇 AST，列表页根本不需要它，裁掉能显著减小 `_payload.json`。本站列表页直接取 `.all()`，如果文章继续增多，这是第一个该优化的点。

## 三、状态与错误处理

```vue
<script setup lang="ts">
const { data, status, error, refresh } = await useFetch<{ items: string[] }>('/api/notes', {
  retry: 1,
  retryDelay: 300,
  timeout: 8000,
})
</script>

<template>
  <p v-if="status === 'pending'">加载中…</p>
  <div v-else-if="error">
    加载失败：{{ error.message }}
    <button @click="refresh()">重试</button>
  </div>
  <ul v-else>
    <li v-for="item in data?.items" :key="item">{{ item }}</li>
  </ul>
</template>
```

| 建议 | 原因 |
|---|---|
| 永远渲染 `error` 分支 | 否则接口挂了就是白屏或永久转圈 |
| 给「重试」一个真实可点的按钮 | 用户不该为系统不确定性买单 |
| `default` 提供稳定形状 | 模板里少写一堆可选链，也避免水合差异 |
| 服务端接口用 `createError` 返回结构化错误 | 前端能区分 401 / 404 / 5xx 分别处理 |
| 别把私钥或大对象塞进 `data` | 它会被序列化到 payload，浏览器可见 |

## 四、请求地址与 baseURL

本站 `app.baseURL = '/daydayup/'`。在组件里请求自己的接口时：

```ts
const base = useRuntimeConfig().app.baseURL
const { data } = await useFetch(`${base}api/bookmarks`)
```

`useFetch` 对**相对路径**会自动走 Nuxt 内部路由，但对自定义 API 或事件回调里的 `$fetch` 要小心前缀。部署到子路径后 404，十有八九是这里没拼对。排查方法：先看浏览器 Network 里实际请求地址，再 `curl` 直打服务端确认接口本身可用。

## 五、竞态与取消

参数变化时旧请求可能后返回，覆盖新数据。`useFetch` 会随依赖自动重取，但仍需处理取消与旧响应：

```ts
const keyword = ref('')
const { data, status } = await useFetch('/api/search', {
  query: { q: keyword },   // 响应式 query，keyword 变化自动重取
  watch: [keyword],
  // 自定义 $fetch 时可传 signal
})

// 手动场景：用 AbortController
let controller: AbortController | null = null
async function search(q: string) {
  controller?.abort()
  controller = new AbortController()
  const res = await $fetch('/api/search', {
    query: { q }, signal: controller.signal,
  })
  if (!controller.signal.aborted) render(res)
}
```

流式场景更复杂：SSE 事件要带 `runId` 与序号，断线重连从最后序号续传；用户中断要同时中止服务端循环。完整实现见 [Agent 前端集成](/ai-agent/10-frontend-integration)。

## 六、与 Content 查询的配合

本站的三种取数形态：

| 页面 | 写法 | 说明 |
|---|---|---|
| 首页 `index.vue` | 5 个 `useAsyncData` 分别查集合，再 `computed` 聚合排序 | key 各自独立 |
| 分类页 `ai-agent.vue` | `useAsyncData('ai-agent-page', () => queryCollection('aiAgent').all())` | 客户端按 `path` 排序得到路线顺序 |
| 详情页 `[...slug].vue` | `useAsyncData(\`page-${path}\`, () => queryCollection(col).path(path).first())` | 查不到时 `createError` 抛 404 |

注意 `queryCollection` 是**服务端内容数据库查询**，不是 HTTP 请求；它必须包在 `useAsyncData` 里才能享受 SSR 数据序列化与水合复用。直接在 setup 里 `await queryCollection(...)` 会导致客户端再查一次（而浏览器里没有内容数据库）。

## 七、常见坑清单

| 现象 | 原因 | 处理 |
|---|---|---|
| 首屏请求发了两遍 | 用了 `$fetch` 而非 `useFetch`/`useAsyncData` | 换成带 SSR 去重的 API |
| 页面 A/B 数据串了 | `useAsyncData` key 相同 | key 带上路径或参数 |
| 客户端报「内容数据库不可用」 | 裸调 `queryCollection` | 包进 `useAsyncData` |
| 水合不匹配 | 服务端与客户端初始值不同（时间、随机、window） | 固定初始值或 `ClientOnly` |
| payload 巨大 | 把 `body` 整篇 AST 序列化进列表页 | `pick` / `transform` 裁剪 |
| 子路径部署接口 404 | 硬编码 `/api/xxx` | 用 `app.baseURL` 拼接 |
| 快速切换参数显示旧数据 | 竞态 | `watch` + 取消 + 检查 `signal.aborted` |

## 动手任务

1. 给首页的 5 个查询加 `pick`，测量 `_payload.json` 前后体积变化。
2. 故意让两个列表页共用同一个 `useAsyncData` key，复现数据串台，再修好。
3. 给一个列表页补完整的 pending / error / retry 三态，并模拟接口 500 验证。
4. 用 `AbortController` 实现搜索防竞态，写一条「旧请求晚返回」的测试。

参考：[Nuxt 数据获取文档](https://nuxt.com/docs/getting-started/data-fetching)、[Nuxt 运行时配置](/nuxt/06-runtime-config)、[Content 模块实战](/nuxt/content-module)
