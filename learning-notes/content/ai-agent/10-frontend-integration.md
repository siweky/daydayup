---
title: "前端主场：Agent 交互工程化"
description: "事件流协议、Nuxt 流式接口、Vue composable 增量渲染、取消与降级、工具时间线与人工审批 UI"
category: "ai-agent"
date: "2026-11-11"
---

## 为什么这是转型最大的差异化优势

纯后端/算法候选人往往把 Agent 当成「一个返回字符串的接口」。但真实的 Agent 产品是**一个持续变化的、会中途等待人的过程**：

```text
思考中 → 调用工具 A → 工具返回 → 再调用工具 B → 需要审批 → 等待用户 → 继续执行 → 产出文件 → 完成
```

把这个过程做得可理解、可中断、可恢复，几乎全是前端工程能力：状态机、流式渲染、事件协议、容错交互、无障碍。这也是面试里最能拉开差距的部分。

## 第一步：把「文本流」升级为「事件流」

不要只推 token。定义一套稳定的事件协议，前端就能渲染出完整的 Agent 时间线。

```ts
type AgentEvent =
  | { type: 'status'; phase: 'thinking' | 'planning' | 'executing' }
  | { type: 'text-delta'; text: string }
  | { type: 'tool-call'; id: string; name: string; args: unknown; title: string }
  | { type: 'tool-result'; id: string; ok: boolean; summary: string; ms: number }
  | { type: 'approval-required'; id: string; title: string; details: unknown }
  | { type: 'artifact'; name: string; url: string }
  | { type: 'usage'; tokens: number; cost: number }
  | { type: 'done'; runId: string }
  | { type: 'error'; code: string; message: string; recoverable: boolean }
```

事件用 SSE 推送，每行 `data: ${JSON.stringify(event)}\n\n`。好处：

- 文本、工具活动、审批、产物、错误可以**共存且有序**
- 前端可以按 `type` 分派到不同 UI 区域，不用解析自然语言猜「它是不是在调工具」
- 事件日志天然就是 trace，可直接落库做回放与评估

## 服务端：Nuxt / Nitro 流式接口

```ts
// server/api/agent.post.ts
import type { AgentEvent } from '~/shared/agent-events'

export default defineEventHandler(async (event) => {
  const { messages, runId } = await readBody<{ messages: unknown[]; runId: string }>(event)

  setResponseHeaders(event, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // 关掉反向代理缓冲，否则看不到流式效果
  })

  const encoder = new TextEncoder()
  const abort = new AbortController()
  // 客户端断开时中止整个 Agent loop，避免继续消耗模型额度
  event.node.req.on('close', () => abort.abort())

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: AgentEvent) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`))

      try {
        for await (const e of runAgent(messages, { runId, signal: abort.signal })) {
          send(e)
        }
      } catch (err) {
        send({ type: 'error', code: 'AGENT_FAILED', message: '执行中断', recoverable: true })
      } finally {
        controller.close()
      }
    },
  })

  return stream
})
```

要点：`no-transform` 与 `X-Accel-Buffering: no` 防止网关把流攒起来一次性返回；把请求的 abort signal 一路传到模型调用与工具执行，用户点「停止」才能真的省钱。

## 客户端：一个可复用的 composable

```ts
// app/composables/useAgentStream.ts
export function useAgentStream() {
  const events = ref<AgentEvent[]>([])
  const answer = ref('')
  const status = ref<'idle' | 'streaming' | 'waiting' | 'error' | 'done'>('idle')
  let controller: AbortController | null = null
  let pending = ''
  let raf = 0

  // 逐 token 直接写 ref 会触发大量重渲染，先攒起来按帧刷新
  const flush = () => {
    if (pending) { answer.value += pending; pending = '' }
    raf = 0
  }

  async function send(messages: unknown[], runId: string) {
    status.value = 'streaming'
    controller = new AbortController()
    const base = useRuntimeConfig().app.baseURL // 本项目为 /daydayup/
    const res = await fetch(`${base}api/agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, runId }),
      signal: controller.signal,
    })

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const chunks = buffer.split('\n\n')
      buffer = chunks.pop() ?? ''
      for (const chunk of chunks) {
        const line = chunk.split('\n').find(l => l.startsWith('data: '))
        if (!line) continue
        handle(JSON.parse(line.slice(6)) as AgentEvent)
      }
    }
    flush()
    status.value = 'done'
  }

  function handle(e: AgentEvent) {
    if (e.type !== 'text-delta') events.value.push(e)
    switch (e.type) {
      case 'text-delta':
        pending += e.text
        if (!raf) raf = requestAnimationFrame(flush)
        break
      case 'approval-required': status.value = 'waiting'; break
      case 'error': status.value = 'error'; break
    }
  }

  function stop() { controller?.abort(); flush(); status.value = 'idle' }
  return { events, answer, status, send, stop }
}
```

三个容易忽略的点：`TextDecoder` 半行缓冲、按帧批量刷新、组件卸载时调用 `stop()`。

## UI 该有的五个区域

| 区域 | 内容 | 常见错误 |
|---|---|---|
| 消息流 | 用户/助手消息，逐字渲染 | 每个 token 全量重渲染整个列表 |
| 工具时间线 | 正在调用什么、参数摘要、耗时、成功/失败 | 把 Agent 做成「黑盒转圈」 |
| 状态与进度 | 当前阶段、已用步数、是否等待人工 | 只有一个无限 spinner |
| 审批卡片 | 结构化变更摘要 + 确认/拒绝 + 影响范围 | 让用户对着自然语言点「确定」 |
| 产物区 | 生成的文件、表格、链接、可复制结果 | 产物埋在长文本里找不到 |

**Generative UI**：让模型输出「组件名 + props」而不是自由 Markdown，前端按白名单渲染成真实组件（表格、图表、表单）。本站已有 ECharts 与 Ant Design Vue，做这步很顺手。注意白名单 + props 校验，绝不对模型输出用 `v-html`。

## 容错交互：面试最爱问的部分

| 场景 | 生产级做法 |
|---|---|
| 工具超时 | 单工具 8s 超时 → 重试 1 次 → 切备用数据源/缓存 → 界面显示「已用降级数据，如需精确结果点重试」 |
| 模型 5xx / 限流 | 指数退避重试 → 切备用模型（带清晰的能力差异提示）→ 仍失败则保留已完成步骤，提供「从断点续跑」 |
| 网络断开 | 事件带 `runId` 与序号，重连时从最后序号续传；避免整轮重跑 |
| 上下文溢出 | 服务端压缩历史并提示「已折叠早期对话」，提供「查看被折叠内容」 |
| 用户中途取消 | 前端 abort + 服务端中止 loop + 保存 checkpoint，展示「已停止，已完成 N 步」 |
| 输出不可信 | Markdown 渲染前消毒、外链白名单、iframe/脚本一律禁止 |

核心思路：**用户不应该为系统的不确定性买单**。永远给出「发生了什么 + 现在能做什么」。

## 性能与可访问性

- 长对话用虚拟列表；消息组件用 `v-memo` 或按 id 缓存，避免历史消息随新 token 重渲染。
- Markdown 渲染节流：文本区按句/按帧更新，别每个 token 跑一次完整解析。
- `aria-live="polite"` 播报状态变化（不要播报每个 token，会把屏幕阅读器刷爆）。
- 所有操作支持键盘；审批卡片要有明确焦点与 Esc 取消。
- 流式输出配色与对比度同时满足明暗主题（本站的 CSS 变量可直接复用）。

## 动手任务

1. 在 Nitro 里实现上面的 SSE 接口，用 curl 观察逐条事件报文。
2. 用 `useAgentStream` 搭出五区域界面，把工具调用渲染成时间线。
3. 实现「停止生成」并抓包确认服务端 loop 确实中止（不是前端假装停）。
4. 造 3 种故障（工具超时、模型限流、断网），逐一验证降级文案与续跑能否工作。
5. 用 200 条消息压测，记录渲染耗时并做一次批量刷新优化，量化优化前后差异。

延伸：[学习路线](/ai-agent/01-roadmap)、[生产化](/ai-agent/11-production-engineering)、[Nitro 服务端](/nitro)、[MDN：Server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
