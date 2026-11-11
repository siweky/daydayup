---
title: "Nitro 架构与请求生命周期"
description: "从 h3/unjs 分层、请求处理流程、输出产物到跨运行时抽象，理解 Nuxt 服务端引擎到底做了什么"
category: "nitro"
date: "2026-11-11"
---

> [Nitro 快速入门](/nitro/01-getting-started) 讲怎么起步，这一篇讲**它为什么这样工作**。理解分层之后，`02`–`06` 里的路由、插件、存储、数据库、部署就串成一条线了。

## 一、Nitro 在 Nuxt 里的位置

```text
浏览器
  ↓ HTTP
Vue SSR 渲染（app/）── 页面请求
  ↓
Nitro 服务器 ── server/api、server/routes、server/middleware
  ↓
业务代码 + 外部服务（数据库、对象存储、第三方 API）
```

Nuxt 负责前端与渲染，Nitro 负责**服务端运行时与构建输出**：API 路由、服务端中间件、SSR 渲染器、静态资源、预渲染、部署适配，都是 Nitro 提供的。它也可以脱离 Nuxt 独立使用（Vite 插件方式），但本站用的是「Nuxt 内置 Nitro」这一形态。

## 二、分层：Nitro 站在哪些库上面

| 层 | 代表 | 职责 |
|---|---|---|
| 应用代码 | `server/api/*.ts`、`app/pages/*.vue` | 业务逻辑 |
| Nitro 运行时 | `nitroApp`、hooks、storage、database、cache | 生命周期、跨环境抽象、路由规则 |
| h3 | `defineEventHandler`、`readBody`、`createError`、`getRouterParams` | 轻量 HTTP 框架，统一请求/响应对象 |
| unjs 生态 | `ofetch`、`unstorage`、`unenv`、`unimport` | 请求、KV 存储、运行时兼容、自动导入 |
| 部署预设 | node-server / vercel / cloudflare / static … | 把同一份代码编成不同平台产物 |

这一层抽象的意义：**你写一次 `defineEventHandler`，构建时决定它跑在 Node、边缘还是静态预渲染里**。代价是不同运行时的能力并不等价，见第六节。

## 三、一次请求的完整生命周期

```text
1. 请求进入 → Nitro/h3 创建 event 对象（含 node.req / context / path）
2. server/middleware/* 按文件名顺序执行（可改写 context、提前返回）
3. 路由匹配：文件系统路由 → routeRules → 兜底 renderer
4. 参数/请求体解析：readBody / getQuery / getRouterParams
5. handler 执行：业务逻辑、数据库、外部调用
6. nitroApp hooks 触发（request / response / error / close）
7. 序列化响应：setResponseStatus / setHeader / sendStream / 直接 return
8. 异常被 h3 捕获 → createError → 统一错误响应
```

对应到本站的 `server/api/upload.post.ts`：

```ts
export default defineEventHandler(async (event) => {
  const body = await readMultipartFormData(event)   // 4. 解析
  // ...校验分类白名单、扩展名
  const targetPath = join(process.cwd(), 'content', category)
  await fs.mkdir(contentDir, { recursive: true })   // 5. 业务
  await fs.writeFile(targetPath, fileData.data)
  return { success: true, path: `content/${category}/${filename}` } // 7. 自动 JSON 序列化
})
```

几个容易忽略的点：

- **返回值会按类型自动处理**：对象 → JSON；`ReadableStream` → 流式响应；`string` → 文本。需要精确控制时用 `setResponseHeader` / `sendStream`。
- **方法后缀决定 HTTP 方法**：`upload.post.ts` 只响应 POST，`files.get.ts` 只响应 GET；不带后缀则响应全部方法。
- **路径即路由**：`server/api/files/[...path].delete.ts` → `DELETE /api/files/**`，方括号是通配参数。
- **event 是请求上下文的唯一入口**：不要在模块顶层缓存 `event` 或请求级数据，会造成跨请求污染。

## 四、本站的服务端接口清单

| 文件 | 作用 | 值得注意 |
|---|---|---|
| `server/api/files.get.ts` | 列举各分类的 Markdown 文件 | 分类白名单硬编码，新增分类要同步改 |
| `server/api/upload.post.ts` | 上传 `.md` 到指定分类 | 校验 `category` 与扩展名，防目录穿越的第一道闸 |
| `server/api/files/delete.post.ts` | 按路径删除 | 校验路径必须落在 `content/` 内 |
| `server/api/files/[...path].delete.ts` | 另一种删除实现 | 用 `resolve` + `relative` 做目录穿越防护 |
| `server/api/bookmarks.get.ts` | 读取 `public/bookmarks.json` | 只读静态数据，无需数据库 |

这些接口配合 `app/pages/manage.vue` 构成一个「文件内容管理后台」。它们都是**开发/自建工具用途**：生产环境若对外开放，必须补鉴权、限流与审计，否则等于把写文件的能力暴露出去。

## 五、输出产物：构建后到底生成了什么

```text
.output/
├── public/                     # 静态资源 + 预渲染 HTML + _payload.json
│   ├── _nuxt/                  # 客户端 JS/CSS chunk
│   ├── __nuxt_content/         # 内容数据库相关产物
│   ├── ai-agent/index.html     # 预渲染页
│   └── index.html
└── server/
    ├── index.mjs               # 服务入口：node .output/server/index.mjs
    ├── chunks/routes/api/…     # 每个 API 路由编译后的 chunk
    ├── chunks/nitro/…          # 运行时、h3、Prose 组件
    └── package.json            # 声明外部依赖（better-sqlite3 等原生模块）
```

三点结论：

1. **服务端被打包成单个轻量目录**，不需要把整个 `node_modules` 部署上去。
2. **API 路由变成独立 chunk**，可以在构建产物里直接检查某个接口是否被编译进去。
3. **原生依赖（如 `better-sqlite3`）要作为 external 保留**，在容器里安装对应平台的二进制，否则会出现 `NODE_MODULE_VERSION` 之类错误。

## 六、跨运行时的能力差异（最容易踩的坑）

| 能力 | Node | 边缘 / Workers | 静态预渲染 |
|---|---|---|---|
| `node:fs` 读写文件 | 支持 | 不支持 | 仅构建期 |
| 长连接 / SSE | 支持 | 有限制 | 不支持 |
| 原生模块 / SQLite | 支持 | 不支持 | 仅构建期 |
| 进程级内存状态 | 支持 | 不保证 | 不支持 |
| 环境变量运行时覆盖 | 支持 | 平台注入 | 构建期决定 |

所以本站「上传 Markdown 到磁盘」这类接口天然只适合 Node 部署；同样的代码部署到边缘运行时会直接失败。选型时先看部署目标，再决定用文件系统、`unstorage` 还是外部数据库。

**长任务**：serverless 平台有执行时长上限，Agent 类任务若可能跑几十秒，要用队列 + 轮询/webhook，而不是让 HTTP 请求一直挂着（参见 [AI Agent 生产化](/ai-agent/11-production-engineering)）。

## 七、什么时候该写 Nitro 接口

| 场景 | 建议 |
|---|---|
| 需要密钥调用第三方 API | 必须写，密钥绝不能进浏览器 |
| 读写本地文件/数据库 | 必须写 |
| 需要统一鉴权、限流、审计 | 必须写 |
| 只是取内容站 Markdown | 用 `queryCollection`，不必自己写接口 |
| 纯前端可完成的交互 | 别写，减少一层部署复杂度 |

一个判断标准：**如果这段逻辑放在浏览器里会泄漏秘密或破坏权限边界，就放到 `server/`**。

## 动手任务

1. 构建后用 `curl` 请求 `server/api/files.get.ts`，在 `.output/server/chunks/routes/api/` 里找到它对应的 chunk。
2. 写一个 `server/middleware/log.ts`，记录每个请求的 method、path 与耗时，观察它与 API handler 的执行顺序。
3. 用 `nitroApp.hooks` 挂一个 `error` 钩子，把异常统一输出到控制台并带上 `runId`。
4. 把某个接口改成返回 `ReadableStream`，观察 SSE 在本站的行为（可对照 [前端集成](/ai-agent/10-frontend-integration) 的流式接口）。

延伸：[路由与文件系统路由](/nitro/02-routing)、[Plugins 与 Hooks](/nitro/03-plugins)、[Nitro 键值存储](/nitro/04-storage)、[内置 SQL 数据库](/nitro/05-database)、[Nitro 官方文档](https://nitro.unjs.io/)
