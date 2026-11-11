---
title: "Nitro 服务端中间件、鉴权与输入校验"
description: "server/middleware 执行顺序与事件上下文、会话与 Token 鉴权、Zod 校验、目录穿越防护、限流与幂等"
category: "nitro"
date: "2026-11-11"
---

## 一、服务端中间件：每个请求的统一入口

文件放在 `server/middleware/`，按**文件名字典序**执行，全局生效：

```text
server/middleware/
├── 0.request-id.ts     # 生成 requestId、记录开始时间
├── 1.auth.ts           # 鉴权，写 event.context.user
└── 2.log.ts            # 请求结束记录状态与耗时
```

```ts
// server/middleware/0.request-id.ts
export default defineEventHandler((event) => {
  const id = event.node.req.headers['x-request-id'] || crypto.randomUUID()
  event.context.requestId = String(id)
  event.context.startedAt = Date.now()
  setResponseHeader(event, 'x-request-id', String(id))
})
```

`event.context` 是**请求级上下文**，中间件写入后，后续 handler 可直接读取，避免层层透传参数。它也是避免跨请求污染的正确位置：不要把用户数据放在模块级变量里。

中间件可以提前返回（如鉴权失败），后续 handler 就不会执行：

```ts
if (!allowed) {
  throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
}
```

## 二、鉴权：前端中间件不是安全边界

[路由中间件](/nuxt/08-middleware-state-and-seo) 只负责跳转体验，**服务端接口必须独立校验**。本站 `manage.vue` 关联的上传/删除接口目前没有鉴权，这是最需要补的一环。

三种常见方案：

| 方案 | 适合 | 要点 |
|---|---|---|
| 会话 Cookie | 有登录页的站内应用 | `HttpOnly; Secure; SameSite=Lax`，服务端校验 session |
| Bearer Token / JWT | 前后端分离、第三方调用 | 校验签名与过期时间，不信任前端传来的 userId |
| API Key | 机器对机器、内部工具 | 存环境变量，用定时常量比较，别直接字符串 `===` |

```ts
// server/middleware/1.auth.ts
export default defineEventHandler((event) => {
  const path = event.path.replace(/^\/daydayup/, '')
  // 只对管理类接口做保护，公开内容接口放行
  if (!path.startsWith('/api/files') && !path.startsWith('/api/upload')) return

  const token = getHeader(event, 'authorization')?.replace(/^Bearer\s+/i, '')
  const expected = useRuntimeConfig(event).adminToken
  if (!token || !expected || !safeEqual(token, expected)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  event.context.user = { role: 'admin' }
})

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
```

```ts
// nuxt.config.ts：私钥只放 runtimeConfig 顶层
export default defineNuxtConfig({
  runtimeConfig: { adminToken: '' }, // 生产由 NUXT_ADMIN_TOKEN 注入
})
```

关键原则：**模型输出、请求参数、前端状态都是不可信输入**。鉴权、权限、配额校验必须在服务端按会话身份重新判定，不能相信客户端声称的「我是管理员」。这一点与 [Agent 工具权限设计](/ai-agent/05-tool-calling) 完全一致。

## 三、输入校验：类型不等于校验

```ts
import { z } from 'zod'

const UploadQuery = z.object({
  category: z.enum(['notes', 'nuxt', 'nitro', 'python', 'ai-agent']),
})

export default defineEventHandler(async (event) => {
  const body = await readMultipartFormData(event)
  const parsed = UploadQuery.safeParse(extractFields(body))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', data: parsed.error.issues })
  }
  // 之后 parsed.data.category 才是可信的
})
```

本站 `upload.post.ts` 用的是手写数组白名单，功能上没问题；换成 Zod 的好处是错误信息结构化、规则集中、可与前端共用一份 schema。

### 目录穿越防护（本站删除接口的正确做法）

```ts
import { join, resolve, relative, normalize } from 'node:path'

const contentDir = resolve(process.cwd(), 'content')
const target = resolve(contentDir, normalize(userSuppliedPath))
const rel = relative(contentDir, target)

if (rel.startsWith('..') || normalize(rel).startsWith('..') || !rel) {
  throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
}
```

常见绕过手法：`../`、URL 编码、绝对路径、符号链接、Windows 下的 `..\`、`C:\...`。**只判断「字符串是否包含 `..`」是不够的**，必须先 `resolve` 再 `relative` 校验，并限制扩展名。本站两个删除接口都做了这层校验，值得保留。

## 四、限流、幂等与超时

```ts
// 极简内存限流（单实例演示；多实例请用 Redis）
const hits = new Map<string, { count: number; resetAt: number }>()

export default defineEventHandler((event) => {
  const key = getRequestIP(event) || 'unknown'
  const now = Date.now()
  const rec = hits.get(key) ?? { count: 0, resetAt: now + 60_000 }
  if (now > rec.resetAt) { rec.count = 0; rec.resetAt = now + 60_000 }
  if (++rec.count > 30) throw createError({ statusCode: 429, statusMessage: 'Too Many Requests' })
  hits.set(key, rec)
})
```

| 机制 | 为什么必须 |
|---|---|
| 限流 | 写接口被刷、模型 API 被刷会直接产生费用 |
| 幂等键 | 客户端重试不应造成重复上传/重复删除/重复扣款 |
| 超时 | 外部接口挂住会耗尽连接；设 `AbortSignal.timeout` |
| 请求体大小限制 | 防止超大上传打爆内存 |
| 审计日志 | 谁在什么时候改了哪篇文档，要能追溯 |

## 五、一个「可上线」的管理接口应有的样子

```text
请求 → requestId 中间件 → 鉴权中间件 → 限流
     → Zod 校验参数/文件类型 → 路径穿越校验
     → 幂等键去重 → 业务逻辑（原子写：临时文件 + rename）
     → 审计日志（操作人、路径、结果）→ 结构化响应
     → 异常统一走 error hook，不回显堆栈
```

对比本站现状：`upload.post.ts` 直接 `fs.writeFile` 到目标路径，若写入中断会留下半截文件。改成「写 `.tmp` → `rename`」是低成本的可靠性提升。

## 六、常见坑

| 现象 | 原因 | 处理 |
|---|---|---|
| 中间件没生效 | 文件放错目录或命名后缀带了 HTTP 方法 | 放 `server/middleware/`，不带 `.get/.post` |
| 执行顺序不对 | 字典序与预期不符 | 用数字前缀 `0.` `1.` `2.` |
| 客户端能改身份 | 服务端信任了请求体里的 userId | 从会话/Token 推导身份 |
| 生产读不到密钥 | 只在 `.env` 里配了 | 运行时显式注入环境变量 |
| 路由前缀判断失效 | 忘了 baseURL | 先剥掉 `/daydayup` 再匹配 |
| 429 误伤 | 限流 key 用了可伪造的请求头 | 用真实 IP + 用户身份组合 |
| 并发写坏文件 | 非原子写 | 临时文件 + rename，或加文件锁 |

## 动手任务

1. 给本站 `/api/upload` 与 `/api/files` 删除接口加一层 Bearer Token 鉴权，未授权返回 401。
2. 把 `upload.post.ts` 的分类白名单改成 Zod schema，并与 `manage.vue` 的分类数组做一致性检查（可抽成共享常量）。
3. 用 `../`、绝对路径、URL 编码三种 Payload 测试删除接口，确认都被 403 拦下。
4. 给上传加幂等键（文件名 + 内容哈希），重复提交不应产生两份文件。

延伸：[Nitro 架构与请求生命周期](/nitro/introduction)、[Routing 与中间件](/nitro/02-routing)、[Nuxt 运行时配置](/nuxt/06-runtime-config)、[Agent 权限边界](/ai-agent/11-production-engineering)
