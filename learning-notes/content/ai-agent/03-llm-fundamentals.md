---
title: "LLM 调用基础：一次请求里到底发生了什么"
description: "Token、上下文窗口、消息角色、采样参数、流式输出、结构化输出与成本模型，附 TypeScript 原生调用示例"
category: "ai-agent"
date: "2026-11-11"
---

## 六个必须先建立的概念

| 概念 | 含义 | 工程影响 |
|---|---|---|
| Token | 模型读写文本的最小单位，中文通常 1 字 ≈ 1–2 token | 直接计费；决定上下文能装多少 |
| 上下文窗口 | 单次请求「输入 + 输出」的总 Token 上限 | 超了会报错或被截断；长对话必须压缩 |
| 消息角色 | system / developer / user / assistant / tool | 角色用错会显著影响服从度与注入风险 |
| 采样参数 | temperature、top_p、seed 等 | 结构化任务用低温；创意任务可稍高 |
| 结构化输出 | 用 JSON Schema 约束返回格式 | 让结果能被程序直接消费，是工具调用的前提 |
| 流式输出 | 服务端按 chunk 推送增量 | 首字延迟（TTFT）决定用户体验 |

**心智模型**：模型是无状态函数。`messages` 进去，`completion` 出来；所谓「多轮对话记忆」，是你在客户端把历史消息重新拼进数组而已。

## 一次原生请求（不用任何框架）

以 OpenAI 兼容的 Chat Completions 接口为例，各家模型厂商的字段高度相似。密钥必须放在服务端。

```ts
// server/utils/llm.ts
type Message = {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
}

export async function chat(messages: Message[]): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.2,
      stream: false,
    }),
    signal: AbortSignal.timeout(20_000),
  })

  if (!res.ok) {
    throw new Error(`LLM ${res.status}: ${await res.text()}`)
  }

  const data = await res.json()
  return data.choices[0].message.content as string
}
```

调用时把历史一起传入：

```ts
const messages: Message[] = [
  { role: 'system', content: '你是技术文档助手，回答简洁，不确定时明确说不知道。' },
  { role: 'user', content: '什么是上下文窗口？' },
  { role: 'assistant', content: '单次请求输入加输出的 Token 上限……' },
  { role: 'user', content: '那超了怎么办？' },
]
const answer = await chat(messages)
```

注意：**每次请求都要重发全部历史**，这就是长对话又贵又慢的根源。

## 流式输出：SSE 的最小解析

```ts
export async function* streamChat(messages: Message[]) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages, stream: true }),
  })

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // SSE 以空行分隔事件，必须处理跨 chunk 的半行
    const events = buffer.split('\n\n')
    buffer = events.pop() ?? ''

    for (const event of events) {
      const line = event.split('\n').find(l => l.startsWith('data: '))
      if (!line) continue
      const payload = line.slice(6).trim()
      if (payload === '[DONE]') return
      const delta = JSON.parse(payload).choices?.[0]?.delta?.content
      if (delta) yield delta as string
    }
  }
}
```

三个必须记住的细节：`TextDecoder` 要开 `{ stream: true }` 防止中文被截断成乱码；`buffer` 要保留未闭合的半行；`[DONE]` 是结束信号。前端侧渲染见 [前端集成](/ai-agent/10-frontend-integration)。

## 结构化输出：别再正则解析模型回答

用 JSON Schema 约束模型，再用 Zod 做运行时校验，双保险：

```ts
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'

const Intent = z.object({
  action: z.enum(['search_order', 'refund', 'ask_human']),
  orderId: z.string().regex(/^ORD-\d{6}$/).optional(),
  reason: z.string().max(200),
})

const schema = zodToJsonSchema(Intent, { target: 'jsonSchema7' })

// 请求体中声明 response_format（具体字段以所用厂商文档为准）
const body = {
  model: 'gpt-4o-mini',
  messages,
  response_format: {
    type: 'json_schema',
    json_schema: { name: 'intent', schema, strict: true },
  },
}

// 拿到结果后仍然要校验，失败就把错误回喂模型重试
const parsed = Intent.safeParse(JSON.parse(raw))
if (!parsed.success) {
  // 把 parsed.error.issues 作为新消息发回去，让模型自我修正
}
```

这段「校验 → 错误回喂 → 重试」的模式，是后面 [工具调用](/ai-agent/05-tool-calling) 的雏形。

## 成本与延迟的粗略估算

成本按 Token 计，输入通常比输出便宜得多（不同模型差异较大，以厂商定价页为准）。

```text
单次成本 ≈ 输入 token × 输入单价 + 输出 token × 输出单价
用户感知延迟 ≈ 首 token 延迟(TTFT) + 输出 token 数 × 单 token 生成耗时
```

| 优化手段 | 效果 | 代价 |
|---|---|---|
| 精简 system prompt、删冗余 few-shot | 每次请求都省 | 可能降低稳定性，需 evals 验证 |
| 历史摘要压缩 / 滑动窗口 | 长对话成本大幅下降 | 可能丢细节 |
| 小模型做分类/路由，大模型做生成 | 成本可降一个量级 | 多一次调用与编排复杂度 |
| 流式输出 | 不改变总成本，显著改善感知延迟 | 前端实现复杂度上升 |
| 缓存相同 prompt 前缀 | 高频场景收益明显 | 需要厂商支持与缓存键设计 |

## 常见坑清单

- **把 API Key 放在前端**：任何 `.vue` / 浏览器代码里的密钥都等于公开，必须经自己的 server route 转发。
- **用字符串拼接 JSON**：让模型输出 JSON 后 `JSON.parse` 一把梭，遇到 markdown 包裹就崩；先要结构化输出，再容错解析。
- **忽略 `finish_reason`**：`length` 表示被上下文/输出上限截断，不是完整答案。
- **没有超时与取消**：`AbortSignal.timeout` + 用户主动中断都要有，否则 loop 会一直烧钱。
- **把 temperature 当万能旋钮**：格式不稳先改 prompt 与 schema，别指望调温度解决。
- **只看单次调用不看整轮 run**：一个 Agent 任务可能触发十几次模型调用，成本是乘出来的。

## 动手任务

1. 手写上面的 `chat()`，把完整请求/响应打到控制台，逐字段解释。
2. 实现流式版本，在 Nuxt 页面里逐字渲染，并加「停止生成」按钮（要能真正中止服务端）。
3. 用 Zod 定义一个「提取待办事项」的结构，故意让模型输出错误格式，实现错误回喂重试。
4. 记录一次 20 轮对话的 Token 增长曲线，再用摘要压缩改造，对比成本与回答质量。

参考：[OpenAI API 文档](https://platform.openai.com/docs/api-reference/chat)、[Vercel AI SDK 文档](https://ai-sdk.dev/docs/introduction)、[Zod](https://zod.dev/)
