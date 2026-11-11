---
title: "Nuxt 中间件、状态管理与渲染/SEO 策略"
description: "路由中间件执行顺序与鉴权、useState 与跨请求污染、useSeoMeta、routeRules 混合渲染，以及本站页面对照"
category: "nuxt"
date: "2026-11-11"
---

## 一、三种路由中间件

| 类型 | 位置 | 生效范围 |
|---|---|---|
| 全局（命名） | `app/middleware/*.global.ts` | 每次路由切换 |
| 命名 | `app/middleware/auth.ts` + 页面 `definePageMeta({ middleware: 'auth' })` | 声明了它的页面 |
| 内联 | 页面内 `definePageMeta({ middleware: [fn] })` | 单个页面 |

执行顺序：**全局 → 命名（按数组顺序）→ 内联**，服务端首屏与客户端导航都会执行。

```ts
// app/middleware/auth.ts
export default defineNuxtRouteMiddleware((to, from) => {
  const user = useState<User | null>('user')
  if (!user.value && to.path !== '/login') {
    return navigateTo('/login', { redirectCode: 401 })
  }
})
```

```ts
// app/middleware/log.global.ts
export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.client) console.log('[route]', to.fullPath)
})
```

四个要点：

1. **中间件会在服务端也跑一遍**，别在里面访问 `window` / `localStorage`，用 `import.meta.client` 守卫或 `useCookie`。
2. 返回值语义：返回 `navigateTo(...)` / `abortNavigation(...)` 会中断导航；返回 nothing 表示放行。
3. 避免无限重定向：登录页本身要排除在鉴权规则之外。
4. 真正的权限判定必须在服务端接口里再做一次——前端中间件只是体验层，不是安全边界。

## 二、状态管理：useState 与跨请求污染

```ts
// 请求级、SSR 安全的状态
const counter = useState('counter', () => 0)
```

`useState` 的初始值会被序列化进 payload 并在客户端水合，因此：

- 初始值必须是可序列化的（别放函数、类实例、Map/Set）。
- 不要放敏感数据（payload 浏览器可见）。
- **不要用模块级 `ref` 存用户状态**：Node 进程是长驻的，模块级变量在所有请求间共享，用户 A 的数据可能泄漏给用户 B。

```ts
// ❌ SSR 下的跨请求污染
// shared.ts
export const currentUser = ref<User | null>(null)

// ✅ 请求级
export const useCurrentUser = () => useState<User | null>('current-user', () => null)
```

### 什么时候上 Pinia

| 场景 | 选择 |
|---|---|
| 几个跨页面共享的 UI 状态 | `useState` 足够 |
| 复杂领域状态、多 store、需要 devtools/插件 | Pinia + `@pinia/nuxt` |
| 服务端数据缓存 | `useAsyncData` / `useFetch`（别塞进 store） |
| 表单本地状态 | 组件内 `ref` / `reactive` |

经验：**从服务端取来的数据归 `useAsyncData` 管，纯客户端交互状态归 store 管**，两者混在一起会出现「刷新后状态丢失」或「水合不一致」的疑难杂症。

本站 `useTheme` 属于纯客户端偏好（本地存储 + CSS 类），放在 composable 里并配合 `ClientOnly` 使用，是合理的例外。

## 三、SEO 与元信息

```vue
<script setup lang="ts">
useSeoMeta({
  title: 'AI Agent 学习路线',
  description: '面向前端工程师的五阶段转型路线',
  ogTitle: 'AI Agent 学习路线',
  ogDescription: '从 LLM 调用到生产级智能体',
  ogType: 'article',
  twitterCard: 'summary_large_image',
})

// 需要更细控制时用 useHead
useHead({
  link: [{ rel: 'canonical', href: 'https://example.com/daydayup/ai-agent' }],
})
</script>
```

| 建议 | 原因 |
|---|---|
| 每个内容页用 `useSeoMeta` 动态设置 | 本站详情页目前只在 `nuxt.config.ts` 里设了全站标题，所有文章标题相同，是明显的 SEO 短板 |
| title/description 复用 frontmatter | `page.title` / `page.description` 已有，接上即可 |
| canonical 用绝对地址且带 baseURL | 子路径部署下避免重复内容 |
| 结构化数据（JSON-LD） | 文档/教程类内容可加 `TechArticle` |
| 生成 sitemap | 内容站建议配 `@nuxtjs/sitemap`，注意 baseURL |

本站可以立刻做的一步：在 `[...slug].vue` 里根据 `page.value` 调用 `useSeoMeta`，让每篇文章有独立标题与描述。

## 四、渲染模式与 routeRules

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  routeRules: {
    '/': { prerender: true },              // 构建期静态化
    '/ai-agent/**': { prerender: true },   // 文档页静态化（需链接可被爬虫发现）
    '/manage/**': { ssr: false },          // 纯客户端管理后台
    '/api/bookmarks': { cache: { maxAge: 60 } },
    '/old-path': { redirect: '/new-path' },
  },
})
```

| 模式 | 优点 | 代价 |
|---|---|---|
| SSR（默认） | 首屏快、SEO 好、数据实时 | 需要服务端运行时 |
| 预渲染 / SSG | 可纯静态托管、最快 | 内容变更需重新构建；链接要可被爬虫发现 |
| CSR | 部署简单、无 SSR 兼容问题 | 首屏慢、SEO 弱 |
| SWR / ISR 缓存 | 兼顾实时与成本 | 需要处理缓存失效与陈旧数据 |

本站 `crawlLinks: true` 只能抓取 SSR HTML 里出现的链接，而列表内容被 `ClientOnly` 包住，导致文章详情页没有生成静态文件。若要全静态化，有两条路：给详情页显式列 `prerender.routes`（可用脚本枚举 `content/` 生成），或去掉列表页的 `ClientOnly` 让链接出现在服务端 HTML 中。详见 [Content 模块实战](/nuxt/content-module)。

## 五、本站页面结构对照

| 页面 | 状态来源 | 渲染策略 | 备注 |
|---|---|---|---|
| `index.vue` | 5 个集合的 `useAsyncData` | SSR + 预渲染 | 卡片在 `ClientOnly` 内 |
| `notes.vue` / `ai-agent.vue` | 单个集合 `.all()` | SSR + 预渲染 | 按 `path` 排序得到阅读顺序 |
| `[...slug].vue` | 按路径查单篇 + 面包屑/TOC | 运行时 SSR | 查不到则抛 404 |
| `manage.vue` | 调用 `server/api` | 适合 CSR | 应加鉴权中间件 |
| `tools/*` | 纯客户端 | 可用 `ssr: false` | ECharts / Three.js 依赖浏览器 API |

一个明确的改进项：`manage.vue` 目前没有任何鉴权，而它关联的接口能写/删 `content/` 下的文件。加一层简单的中间件（哪怕只是开发环境内网访问）都比裸奔好，服务端做法见 [Nitro 中间件与鉴权](/nitro/07-middleware-and-auth)。

## 六、常见坑

| 现象 | 原因 | 处理 |
|---|---|---|
| 中间件里 `window is not defined` | SSR 阶段执行 | `import.meta.client` 守卫 |
| 登录后跳回登录页 | 中间件读到的状态还没水合 | 用 `useState` / cookie，别依赖本地存储 |
| 刷新后状态丢失 | 只存在客户端 store | 持久化或改从服务端取 |
| 用户数据串台 | 模块级 `ref` 在 SSR 进程共享 | 改 `useState` 或请求上下文 |
| 所有页面标题一样 | 只在 `nuxt.config.ts` 配了全站 head | 详情页用 `useSeoMeta` |
| 预渲染缺详情页 | 链接被 `ClientOnly` 隐藏 | 显式 `prerender.routes` 或让链接出现在 SSR HTML |

## 动手任务

1. 在 `[...slug].vue` 里加 `useSeoMeta`，用 `page.title` / `description` 生成独立元信息，构建后检查 HTML `<head>`。
2. 写一个 `auth` 中间件保护 `/manage`，并验证服务端接口是否也应该校验（结论：应该）。
3. 给 `/tools/**` 设置 `ssr: false`，对比构建产物与首屏 HTML 差异。
4. 用脚本枚举 `content/**/*.md` 生成 `prerender.routes`，让全部文章页静态化，并检查是否多出静态文件。

参考：[Nuxt 中间件文档](https://nuxt.com/docs/guide/directory-structure/middleware)、[useState](https://nuxt.com/docs/api/composables/use-state)、[SEO 与 Meta](https://nuxt.com/docs/getting-started/seo-meta)、[混合渲染](https://nuxt.com/docs/guide/concepts/rendering)
