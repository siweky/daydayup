---
title: "Nitro 缓存、错误处理与运行时 hooks"
description: "defineCachedEventHandler、KV 缓存键与失效、createError 统一错误响应、请求生命周期 hooks、定时任务与服务端可靠性"
category: "nitro"
date: "2026-11-11"
---

## 一、缓存的三个层次

| 层次 | 工具 | 缓存什么 | 失效方式 |
|---|---|---|---|
| HTTP 响应 | `routeRules.cache` / `defineCachedEventHandler` | 整个接口响应 | TTL、按路由或变体键 |
| 函数结果 | `defineCachedFunction` | 昂贵计算结果 | TTL、手动失效 |
| 数据 | `useStorage` / `useDatabase` | KV、查询结果 | 显式删除键 |

```ts
// server/api/bookmarks.cached.ts
export default defineCachedEventHandler(async (event) => {
  const data = await readBookmarks()
  return data
}, {
  maxAge: 60,                        // 秒
  name: 'bookmarks',
  getKey: (event) => getQuery(event).tag as string || 'all',
  swr: true,                         // 陈旧时先返回旧值再后台刷新
})
```

```ts
// 路由级缓存
export default defineNuxtConfig({
  routeRules: {
    '/api/bookmarks': { cache: { maxAge: 60, swr: true } },
  },
})
```

### 缓存键设计

```text
资源名 : 变体 : 身份/权限 : 版本
bookmarks : all : v3
article : /ai-agent/01-roadmap : v2026-11-11
```

三条规则：

1. **把权限维度放进键**：缓存了用户 A 的私有响应，返回给用户 B 就是数据泄漏。含身份信息的响应优先 `Cache-Control: private` 或直接不缓存。
2. **内容要有版本号**：本站内容变更后，`_payload.json` 与列表接口缓存需要能失效，否则用户看到旧文章。
3. **缓存穿透与雪崩**：空结果也缓存（短 TTL），TTL 加随机抖动，热点键用 `swr` 兜底。

`useStorage` 适合跨请求共享的轻量 KV；多实例部署时要挂载 Redis 等共享驱动，否则每台机器各存一份。详见 [Nitro 键值存储](/nitro/04-storage)。

## 二、统一错误处理

```ts
// 业务代码：抛出结构化错误
throw createError({
  statusCode: 404,
  statusMessage: '页面未找到',
  data: { code: 'ARTICLE_NOT_FOUND', path: route.path },
})
```

```ts
// server/plugins/error-hook.ts
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', (error, { event }) => {
    const status = (error as any).statusCode ?? 500
    console.error(JSON.stringify({
      level: 'error',
      requestId: event?.context?.requestId,
      path: event?.path,
      status,
      message: error.message,
      // 不要记录请求体 / 密钥 / 用户个人信息
    }))
  })

  nitroApp.hooks.hook('request', (event) => {
    event.context.startedAt ??= Date.now()
  })

  nitroApp.hooks.hook('afterResponse', (event) => {
    console.info(JSON.stringify({
      requestId: event.context.requestId,
      path: event.path,
      ms: Date.now() - (event.context.startedAt as number),
    }))
  })
})
```

| 原则 | 说明 |
|---|---|
| 客户端只看得到状态码与友好消息 | 堆栈、内部路径、SQL 一律不回显 |
| 错误带 `code` 字段 | 前端能按码分支处理（重试 / 重新登录 / 转人工） |
| 5xx 与 4xx 分开统计 | 5xx 是我们的 bug，4xx 多是输入问题 |
| 错误日志带 requestId | 能从用户反馈一路查到服务端那一次请求 |
| 异步异常也要捕获 | `unhandledRejection` 别让进程静默崩溃 |

更多 hooks 与 `nitroApp` 上下文见 [插件与运行时钩子](/nitro/03-plugins)。

## 三、超时、重试与熔断（服务端视角）

```ts
async function callUpstream(url: string) {
  const res = await fetch(url, { signal: AbortSignal.timeout(8_000) })
  if (!res.ok) throw createError({ statusCode: 502, statusMessage: 'Upstream failed' })
  return res.json()
}

// 有限重试 + 抖动，只对幂等的 GET 重试
async function withRetry<T>(fn: () => Promise<T>, times = 2): Promise<T> {
  for (let i = 0; i <= times; i++) {
    try { return await fn() } catch (e) {
      if (i === times) throw e
      await new Promise(r => setTimeout(r, 200 * 2 ** i + Math.random() * 100))
    }
  }
  throw new Error('unreachable')
}
```

| 场景 | 策略 |
|---|---|
| 上游超时 | 8s 超时 → 有限重试 → 返回缓存/降级数据 |
| 上游持续失败 | 熔断，一段时间不再请求，避免雪崩 |
| 写操作重试 | 必须幂等键，否则会重复执行 |
| 客户端断开 | 监听 `event.node.req.on('close')` 中止长任务 |
| 长任务 | 超过平台执行时长上限时改队列 + 轮询 |

对 Agent 应用尤其重要：**模型调用昂贵且有速率限制**，没有超时/预算/重试上限的循环会直接烧钱，见 [Agent 停止条件](/ai-agent/08-agent-loop-and-orchestration)。

## 四、定时任务与后台作业

Nitro 支持通过配置声明计划任务（具体字段与可用性以所用版本的官方文档为准）：

```ts
// nuxt.config.ts（示意）
export default defineNuxtConfig({
  nitro: {
    scheduledTasks: {
      // cron 表达式：每天凌晨重建索引
      '0 3 * * *': ['rebuild:index'],
    },
    tasks: {
      'rebuild:index': {
        handler: '~/server/tasks/rebuild-index',
        description: '重建内容索引',
      },
    },
  },
})
```

注意：

- serverless / 静态托管没有常驻进程，定时任务需要平台调度器触发一个受保护的 HTTP 接口。
- 任务必须**幂等 + 可重入**，重复触发不能产生重复数据。
- 任务要有超时、日志与失败告警，别做成「静默不执行也没人知道」。
- 单实例本地用内存调度够用，多实例部署要靠分布式锁。

## 五、本站可以立刻做的四件事

| 优先级 | 改动 | 收益 |
|---|---|---|
| 高 | 给 `/api/upload`、`/api/files` 加鉴权与限流 | 堵住写文件能力暴露，见 [中间件与鉴权](/nitro/07-middleware-and-auth) |
| 高 | 上传改成临时文件 + 原子 rename | 避免写入中断留下半截 Markdown |
| 中 | 给 `/api/bookmarks` 加 `defineCachedEventHandler` | 减少重复读文件 |
| 中 | 加统一 error hook + requestId | 出问题时能定位到具体请求 |

## 六、排错速查

| 现象 | 原因 | 检查 |
|---|---|---|
| 改了内容仍返回旧数据 | 缓存未失效 / `_payload.json` 被 CDN 缓存 | 看响应头与缓存键，加版本号 |
| 用户看到别人的数据 | 缓存键缺身份维度 | 键里加用户/租户，或 `private` |
| 错误响应里带堆栈 | 直接把异常序列化返回 | 统一走 `createError` + error hook |
| 定时任务不执行 | 平台无常驻进程 | 改成外部调度器调用受保护接口 |
| 重试后数据重复 | 写操作没幂等键 | 加幂等键与服务端去重 |
| 流式响应变一次性 | 代理缓冲 | `X-Accel-Buffering: no` + `no-transform` |

## 动手任务

1. 给 `/api/bookmarks` 加 60 秒缓存，写一条刷新数据的用例验证缓存命中与失效。
2. 实现统一 error hook，让 500 在日志里有完整堆栈、在响应里只有一句友好提示。
3. 给一个外部 API 调用加超时 + 有限重试 + 降级返回，模拟上游挂掉验证用户体验。
4. 把本站上传接口改成原子写，并写一个「写入中途失败」的测试确认不会留下坏文件。

参考：[Nitro 缓存文档](https://nitro.unjs.io/guide/cache)、[Plugins 与 Hooks](/nitro/03-plugins)、[Nitro 键值存储](/nitro/04-storage)、[部署与运维清单](/nitro/deployment)
