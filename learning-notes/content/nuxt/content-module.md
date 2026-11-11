---
title: "@nuxt/content v3 实战：本站的内容层是怎么搭的"
description: "集合定义、页面集合与数据集合、frontmatter 规范、queryCollection 查询、ContentRenderer 与 MDC、预渲染 payload，以及新增一个分类的完整步骤"
category: "nuxt"
date: "2026-11-11"
---

## v3 的核心变化：先定义集合，再查询

v2 时代可以直接 `queryContent()` 扫描 `content/` 目录；v3 要求先在 `content.config.ts` 里**显式声明集合与 schema**，构建时把 Markdown 解析进内容数据库，运行时用 `queryCollection()` 查询。

好处是类型安全、查询可控、可以做结构化校验；代价是「新建目录但忘了加集合定义」时内容会静默不显示——这是最常见的坑。

### 本站的五个集合

```ts
// content.config.ts
export default defineContentConfig({
  collections: {
    notes:   defineCollection({ type: 'page', source: 'notes/**' }),
    nuxt:    defineCollection({ type: 'page', source: 'nuxt/**' }),
    nitro:   defineCollection({ type: 'page', source: 'nitro/**' }),
    python:  defineCollection({ type: 'page', source: 'python/**' }),
    aiAgent: defineCollection({ type: 'page', source: 'ai-agent/**' }),
  },
})
```

注意 `ai-agent` 是**路径段**（URL 用连字符），`aiAgent` 是**集合键**（合法标识符，会参与生成类型与表名）。两者在详情页里通过映射关联：

```ts
// app/pages/[...slug].vue
const collectionKeyMap: Record<string, string> = {
  notes: 'notes', nuxt: 'nuxt', nitro: 'nitro', python: 'python',
  'ai-agent': 'aiAgent',
}
const section = computed(() => pathParts.value[0] || '')
const col = collectionKeyMap[section.value]
const { data: page } = await useAsyncData(`page-${fullPath.value}`, () =>
  queryCollection(col as 'notes' | 'nuxt' | 'nitro' | 'python' | 'aiAgent')
    .path(fullPath.value).first()
)
```

`section` 同时用于面包屑和「返回列表」按钮，保证路径语义不被集合键污染。

### `type: 'page'` 与 `type: 'data'`

| 类型 | 适用 | 特点 |
|---|---|---|
| `page` | 每篇 Markdown 对应一个页面（本站全部内容） | 内置 `title` / `description` / `body` / `path`，可交给 `ContentRenderer` |
| `data` | JSON/YAML/CSV 配置数据 | 需要 `defineCollection` + `z.object()` 定义 schema，适合站点配置、作者表、导航树 |

如果以后要给笔记加「标签 / 系列 / 难度」并做结构化筛选，可以把 frontmatter 用 Zod schema 显式声明，IDE 里 `article.tags` 也会有类型提示。

## Frontmatter 规范

本站统一格式（双引号、必带 `category` 与 `date`）：

```md
---
title: "文章标题"
description: "一句话描述，会显示在卡片上"
category: "ai-agent"
date: "2026-11-11"
---
```

| 字段 | 用途 | 谁在用 |
|---|---|---|
| `title` | 页面 h1、卡片标题、面包屑 | 详情页、ArticleCard、首页 |
| `description` | 卡片摘要、SEO | 列表页、首页 |
| `date` | 「最近更新」排序与展示 | `pages/index.vue` |
| `category` | 文档自身标记，便于检索与迁移 | 内容管理、后续做筛选 |
| `source`（可选） | 官方文档摘录的出处 | nuxt 01–06 |

**正文不要写一级标题**：详情页已经用 `page.title` 渲染了 `<h1>`，正文从 `##` 开始，目录（TOC）也只抽取 `h2`/`h3`。

## 查询 API

```ts
// 列表页：取全部
const { data: articles } = await useAsyncData('ai-agent-page', () =>
  queryCollection('aiAgent').all()
)

// 详情页：按路径取单篇
const page = await queryCollection('aiAgent').path('/ai-agent/01-roadmap').first()

// 首页：多集合聚合并按日期排序
const [notes, nuxt, nitro, python, aiAgent] = await Promise.all([/* ... */])
const recent = [...notes, ...nuxt, ...nitro, ...python, ...aiAgent]
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  .slice(0, 6)
```

常用链式方法：`all()` / `first()` / `path()` / `where()` / `select()` / `order()` / `limit()` / `skip()`（具体签名以所用版本的类型提示为准）。两个实践建议：

1. **自己排序更可控**：本站 `content/ai-agent/` 用 `01`–`12` 文件名前缀，列表页按 `path` 字符串排序即可得到学习路线顺序，不依赖数据库返回顺序。
2. **`useAsyncData` 的 key 要唯一**：多个集合聚合时别复用同一个 key，否则会互相覆盖（本站用 `notes-list`、`ai-agent-list` 等区分）。

## 渲染内容

```vue
<script setup lang="ts">
const { data: page } = await useAsyncData('page', () =>
  queryCollection('notes').path(route.path.replace(/^\/daydayup/, '')).first()
)
</script>

<template>
  <ContentRenderer :value="page" />
</template>
```

- `ContentRenderer` 会把解析后的 AST 渲染成对应的 `Prose*` 组件（表格、代码块、引用等），本站构建产物里能看到 `ProseTable`、`ProsePre` 等 chunk。
- 代码高亮由 `content.build.markdown.highlight` 配置，明暗主题自动切换。
- Markdown 里可以写 MDC 组件语法（`::alert{color="green"} ... ::`），组件放在 `app/components/content/` 下即可被识别。`content/index.md` 里的 `::alert` / `::counter` 就是示例。
- 链接建议用**绝对路径** `/notes/xxx`，不要写 `./xxx.md`——后者会当成指向 `.md` 文件的链接而 404。

本站详情页还自己实现了 TOC：遍历 `page.value.body` 抽 `h2`/`h3` 节点文本，生成右侧锚点目录。这是 `ContentRenderer` 之外的一个实用扩展点。

## 预渲染与 payload

构建时 `nitro.prerender.routes: ['/']` + `crawlLinks: true` 会生成：

```text
.output/public/index.html
.output/public/ai-agent/index.html
.output/public/ai-agent/_payload.json
.output/public/_payload.json
...
```

`_payload.json` 里是 `useAsyncData` 序列化后的数据。因为本站列表内容包在 `ClientOnly` 中，服务端 HTML 只有骨架，数据实际从 payload 注入——验证内容是否被收录时，应该去查 `_payload.json`，而不是只看 HTML。

被 `ClientOnly` 隐藏的链接不会被爬虫发现，所以文章详情页没有生成静态文件，访问时由 Nitro 运行时 SSR 渲染（数据内联在响应里）。这对内容站是可接受的，若需要全静态，可给详情页显式加 `prerender.routes` 或去掉 `ClientOnly` 让链接出现在 SSR HTML 中。

## 新增一个分类的完整步骤

以刚加的「AI Agent」为例，站点层一共要动 6 处，缺一不可：

| 步骤 | 文件 | 做什么 |
|---|---|---|
| 1 | `content.config.ts` | 新增集合（键用合法标识符，`source` 指向目录） |
| 2 | `content/<新目录>/*.md` | 写内容，frontmatter 统一格式 |
| 3 | `app/pages/<新目录>.vue` | 列表页：`useAsyncData` + `queryCollection().all()` + `ArticleCard` |
| 4 | `app/pages/[...slug].vue` | 路径段 → 集合键映射、面包屑标签、返回列表 |
| 5 | `AppNavBar.vue` / `pages/index.vue` / `ArticleCard.vue` / `main.css` | 导航入口、统计与分类卡、卡片徽标、配色 |
| 6 | `manage.vue` / `server/api/files.get.ts` / `upload.post.ts` | 管理页上传/列举/删除的分类白名单 |

漏掉第 1 步：内容不显示；漏掉第 4 步：详情页 404；漏掉第 6 步：管理页传不上来。这条清单可以直接当 checklist 复用。

## 常见坑

| 现象 | 原因 | 处理 |
|---|---|---|
| 新目录文章不出现 | 没在 `content.config.ts` 定义集合 | 加集合并重新构建 |
| 详情页 404 | `[...slug].vue` 的集合映射没覆盖新路径段 | 补 `collectionKeyMap` |
| 卡片显示「无标题」 | frontmatter 缺 `title` 或缩进/引号错误 | 检查 YAML，值用引号包裹 |
| 卡片 badge 没颜色 | `main.css` 缺 `.badge-<category>` 规则 | 补分类配色（含 dark 变体） |
| 修改 Markdown 不生效 | 内容缓存 | 重启 dev 或清 `.data` / `.nuxt/content` 后重构建 |
| 站内链接 404 | 用了 `./xxx.md` 相对路径 | 改成 `/category/xxx` 绝对路径 |

## 动手任务

1. 照上面的 6 步清单，自己加一个「算法」分类并验证列表页、详情页、导航、管理页全部可用。
2. 给集合加 Zod schema（如 `tags: z.array(z.string())`），在列表页按标签筛选。
3. 去掉一个列表页的 `ClientOnly`，重新构建，对比 `.output/public/` 下是否多出详情页的静态文件。
4. 写一个 MDC 组件放进 `app/components/content/`，在 Markdown 里调用它。

参考：[Nuxt Content 官方文档](https://content.nuxt.com/)、[Nuxt 4 项目结构速查](/nuxt/getting-started)、[Server 目录](/nuxt/05-server)
