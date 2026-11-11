---
title: "Nuxt 4 项目结构与约定速查（以本站为例）"
description: "结合本笔记站的真实配置，梳理 Nuxt 4 的目录约定、配置项、渲染模式、命令与高频踩坑点"
category: "nuxt"
date: "2026-11-11"
---

> `01`–`06` 是官方文档的中文精读笔记，讲概念与原理。这一篇是**中文速查 + 本站落地对照**，回答「这个项目具体是怎么搭起来的、改哪里会生效」。

## 版本与真实配置

本站运行在 **Nuxt 4 + @nuxt/content v3 + Nitro**，`app.baseURL` 为 `/daydayup/`（部署在子路径下）。`nuxt.config.ts` 的关键项：

```ts
export default defineNuxtConfig({
  modules: ['@nuxt/content'],
  app: {
    baseURL: '/daydayup/',
    head: { title: '学习笔记', meta: [/* ... */] },
  },
  css: ['~/assets/css/main.css'],
  content: {
    build: { markdown: { highlight: { theme: { default: 'github-light', dark: 'github-dark' } } } },
  },
  nitro: { prerender: { routes: ['/'], crawlLinks: true } },
  compatibilityDate: '2024-04-03',
})
```

| 配置 | 影响 |
|---|---|
| `app.baseURL` | 所有路由、`NuxtLink`、静态资源、payload 请求都会带这个前缀 |
| `modules` | 内容模块注册后才有 `queryCollection` / `ContentRenderer` 等自动导入 |
| `css` | 全局样式；组件内 `<style scoped>` 不受影响 |
| `content.build.markdown.highlight` | 明暗两套代码高亮主题，与本站主题切换联动 |
| `nitro.prerender` | 构建时预渲染首页并沿链接抓取其它页面 |
| `compatibilityDate` | 锁定 Nitro 行为版本，升级时要留意变更 |

## 目录约定（Nuxt 4 的 `app/` 目录）

Nuxt 4 把前端源码收进 `app/`，与 `server/`、`content/` 平级：

```text
learning-notes/
├── app/
│   ├── app.vue                 # 根组件
│   ├── assets/css/main.css     # 全局样式与 CSS 变量（明暗主题）
│   ├── components/             # 自动导入组件：AppNavBar、ArticleCard…
│   ├── composables/            # 自动导入组合式函数：useTheme
│   ├── layouts/default.vue     # 默认布局（导航 + 页脚 + 背景）
│   ├── pages/                  # 文件路由
│   │   ├── index.vue           # /
│   │   ├── notes.vue           # /notes
│   │   ├── ai-agent.vue        # /ai-agent
│   │   └── [...slug].vue       # 文章详情页（兜底路由）
│   └── plugins/                # 客户端插件（ant-design-vue.client.ts）
├── content/                    # Markdown 内容，按分类建子目录
├── content.config.ts           # 内容集合定义
├── server/api/                 # Nitro 服务端接口
├── public/                     # 静态资源（favicon、bookmarks.json）
├── nuxt.config.ts
└── .output/                    # 构建产物（dist 是它的软链）
```

要点：

- `app/components/` 下的组件**无需 import**，`<ArticleCard />` 直接用。
- `app/pages/` 的静态页优先于 `[...slug].vue` 兜底路由，所以 `/ai-agent` 走列表页，`/ai-agent/01-roadmap` 走详情页。
- `.output/public/<route>/_payload.json` 是预渲染时生成的页面数据；`crawlLinks: true` 会顺着 SSR 输出的链接抓取。被 `ClientOnly` 包住的链接在服务端不输出，因此**详情页链接不会被预渲染爬虫发现**，只能靠运行时 SSR 渲染——本项目正是如此。

## 常用命令

```bash
npm run dev       # 开发服务器，热更新 + devtools
npm run build     # 生成 .output/（SSR 服务端 + 预渲染页面）
npm run generate  # 全静态生成（内容站可选，路由需预渲染齐全）
npm run preview   # 本地预览构建产物
# 或直接运行构建产物
node .output/server/index.mjs   # 可用 NITRO_PORT / NITRO_HOST 指定端口
```

本地访问地址带前缀：`http://localhost:3000/daydayup/`。调用自己的 API 时也要拼上 baseURL（`useRuntimeConfig().app.baseURL`），否则在子路径部署下会 404。

## 渲染模式与 routeRules

| 模式 | 配置 | 适合 |
|---|---|---|
| SSR（默认） | 无需配置 | 内容频繁变化、需要 SEO |
| 静态预渲染 | `nitro.prerender.routes` | 首页、分类页、文档页 |
| 客户端渲染 | `ssr: false` 或 `routeRules` | 强交互工具页 |
| 混合渲染 | `routeRules: { '/manage/**': { ssr: false } }` | 管理后台不需要 SEO |

`ClientOnly` 是本站大量使用的模式：先把数据用 `useAsyncData` 在服务端取好并序列化进 payload，再在客户端渲染 Ant Design 组件，避免 SSR 水合不一致。代价是服务端 HTML 里没有卡片内容，爬虫抓不到链接——理解这一点，才不会奇怪「为什么预渲染只生成了列表页」。

## 自动导入的边界

| 自动导入 | 不自动导入 |
|---|---|
| `app/components/` 的组件 | `node_modules` 里的组件（需在插件里注册） |
| `app/composables/` 顶层函数 | 目录深层默认不扫描，需配置 `imports.dirs` |
| `ref` / `computed` / `useRoute` 等 Vue/Nuxt API | `server/` 目录里绝大多数 Nuxt composable |
| `queryCollection` / `ContentRenderer` | Node 内置模块（`node:fs` 需显式 import） |

服务端代码要用 `defineEventHandler`、`readBody`、`useRuntimeConfig(event)` 等 h3/Nitro API，不能想当然用浏览器 API。

## 高频踩坑清单

| 现象 | 原因 | 处理 |
|---|---|---|
| 部署后静态资源 404 | `app.baseURL` 与部署路径不一致 | 统一配置前缀，图片/接口路径都走 `NuxtLink` 或运行时 baseURL |
| SSR 阶段报 `window is not defined` | 组件初始化访问浏览器对象 | 放进 `onMounted`、`<ClientOnly>` 或 `.client.ts` 插件 |
| 水合不匹配警告 | 服务端与客户端渲染结果不同（时间、随机数） | 固定初始值或用 `ClientOnly` |
| 密钥泄漏到浏览器 | 把私钥放进 `runtimeConfig.public` | 私钥只放服务端；前端只经自己的 server route 调用 |
| 改了 `content/` 不生效 | 内容有构建缓存 | 重启 dev / 重新 build；检查 `.data`、` .nuxt/content` 缓存 |
| 新增分类不显示 | 漏了 `content.config.ts` 的集合定义 | 见 [Content 模块实战](/nuxt/content-module) 的「新增一个分类」 |

## 动手任务

1. 用 `npm run build` 生成产物，查看 `.output/public/` 下哪些路由被预渲染、哪些 `_payload.json` 存在。
2. 给 `/tools/**` 加上 `routeRules` 关闭 SSR，对比构建产物差异。
3. 把一个组件从 `ClientOnly` 里移出，观察 SSR 输出的 HTML 与预渲染链接数量变化。
4. 用 `NITRO_PORT=3100 node .output/server/index.mjs` 起服务，验证带 baseURL 的接口路径。

延伸：[Nuxt 安装与项目初始化](/nuxt/02-installation)、[Nuxt 自动导入](/nuxt/03-auto-imports)、[Nuxt 文件系统路由](/nuxt/04-routing)、[Nuxt 服务端](/nuxt/05-server)、[Nuxt 运行时配置](/nuxt/06-runtime-config)、[Nuxt 官方文档](https://nuxt.com/docs)
