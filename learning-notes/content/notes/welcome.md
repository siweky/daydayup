---
title: "欢迎来到我的学习笔记"
description: "站点结构、五个内容分类、写作规范与新增笔记的完整流程说明"
category: "notes"
date: "2026-11-11"
---

# 欢迎来到我的学习笔记

这是一个用 **Nuxt 4 + Nitro + @nuxt/content v3** 搭建的个人知识站，用来把学过的东西整理成能回头查的结构化笔记。相比浏览器书签和截图，把知识用自己的话重写一遍，检索更快、记忆更牢，也更容易发现「我以为我懂了」的地方。

## 内容分类

| 分类 | 目录 | 页面 | 内容 |
|---|---|---|---|
| 个人笔记 | `content/notes/` | `/notes` | Vue 3、TypeScript、前端工程化、浏览器与网络 |
| Nuxt | `content/nuxt/` | `/nuxt` | 官方文档精读（01–06）+ 中文实战（结构、Content、数据获取、中间件与 SEO） |
| Nitro | `content/nitro/` | `/nitro` | 路由、插件、存储、数据库、部署 + 架构、鉴权、缓存与错误处理的中文补充 |
| Python | `content/python/` | `/python` | 语法到 Web 开发（01–07）+ 异步并发、与 AI Agent 的衔接（08–09） |
| AI Agent | `content/ai-agent/` | `/ai-agent` | 面向前端转型的学习路线、技能地图、核心概念与 12 篇实战笔记 |

此外还有：书签（`/bookmarks`）、小工具（`/tools`）、内容管理（`/manage`）。

### 推荐阅读路径

- **想系统学一个框架**：先看编号系列打基础，再看中文实战篇对照本项目怎么落地。
- **想转型 AI Agent**：从 [学习路线总览](/ai-agent/01-roadmap) 和 [必要技能地图](/ai-agent/02-skills-map) 开始，按 01→12 顺序读，每篇末尾都有可验收的动手任务。
- **想理解这个站点本身**：[Nuxt 4 项目结构速查](/nuxt/getting-started) → [@nuxt/content v3 实战](/nuxt/content-module) → [Nitro 架构](/nitro/introduction)。

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | [Nuxt 4](https://nuxt.com/) + Vue 3 + TypeScript |
| 服务端 | [Nitro](https://nitro.unjs.io/)（`server/api/`） |
| 内容 | [@nuxt/content v3](https://content.nuxt.com/)，集合定义在 `content.config.ts` |
| UI | Ant Design Vue、ECharts、Three.js（粒子背景） |
| 样式 | 全局 CSS 变量 + 明暗主题、代码高亮明暗双主题 |
| 部署 | `npm run build` → `node .output/server/index.mjs`，`app.baseURL` 为 `/daydayup/` |

## 如何添加新笔记

### 方式一：直接创建文件（推荐）

在对应分类目录下新建 `.md`，frontmatter 用统一格式：

```md
---
title: "文章标题"
description: "一句话描述，会显示在卡片上"
category: "notes"
date: "2026-11-11"
---

## 从这里开始写正文

正文从二级标题开始：详情页已经用 title 渲染了 h1，目录也只抽取 h2/h3。
```

写作约定：

- `title` / `description` / `category` / `date` 四项必填，值用双引号。
- 站内链接写绝对路径 `/notes/xxx`，不要写 `./xxx.md`（会指向不存在的 `.md` 路由）。
- 文件名带数字前缀（如 `01-roadmap.md`），列表页即可按路径得到阅读顺序。
- 代码示例尽量可直接运行；每篇结尾给出可验收的「动手任务」。

### 方式二：通过管理页上传

打开 `/daydayup/manage`，选择分类后上传 `.md` 文件即可，服务端会写入对应 `content/` 目录。也可以用接口：

```bash
curl -X POST http://localhost:3000/daydayup/api/upload \
  -F "file=@my-note.md" \
  -F "category=notes"
```

可选分类值：`notes`、`nuxt`、`nitro`、`python`、`ai-agent`。

> 管理接口具备写/删文件能力，目前只适合本地或内网使用；若部署到公网，务必先加鉴权、限流与审计，见 [Nitro 中间件与鉴权](/nitro/07-middleware-and-auth)。

### 新增一个分类要改哪些地方

只建目录不够，站点层有 6 处联动（完整说明见 [Content 模块实战](/nuxt/content-module)）：

1. `content.config.ts` 增加集合定义
2. `content/<目录>/` 写 Markdown
3. `app/pages/<目录>.vue` 列表页
4. `app/pages/[...slug].vue` 路径段 → 集合键映射
5. 导航、首页统计与分类卡、卡片徽标、CSS 配色
6. 管理页/文件列举/上传接口的分类白名单

## 已经实现 / 下一步

**已实现**：分类浏览与统计、文章详情与目录（TOC）、明暗主题、代码高亮、全文搜索框（UI）、书签管理、图表工具、Markdown 上传与删除、首页最近更新聚合、预渲染与 payload。

**下一步**：

- 搜索框接上真实的全站检索（目前只有 UI）
- 给文章加标签/系列/难度，并在列表页做筛选
- 详情页补 `useSeoMeta`，让每篇文章有独立标题与描述
- 给管理接口补鉴权、限流与操作审计
- 用脚本枚举文章路径生成 `prerender.routes`，实现全站静态化
- 把 `content/` 目录本身做成 RAG 知识库（正好是 [项目 3](/ai-agent/12-projects-and-resources) 的练手素材）

笔记站最好的用法，是一边学一边把它改得更好用。
