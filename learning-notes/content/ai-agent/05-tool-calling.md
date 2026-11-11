---
title: "Function Calling 与工具循环：让模型真正动手"
description: "工具 Schema 设计原则、完整 TypeScript tool loop 实现、并发调用、错误回喂与生产级容错"
category: "ai-agent"
date: "2026-11-11"
---

## 从「回答」到「执行」只差一个循环

普通聊天：`用户 → 模型 → 回答`。

工具调用：`用户 → 模型（决定调用哪个工具、给什么参数）→ 你执行代码 → 把结果作为 tool 消息回喂 → 模型继续推理 → 回答或再调工具`。

```text
┌─────────────────────────────────────────────┐
│  messages = [system, user]                  │
│      ↓                                      │
│  调用模型（带上 tools 定义）                  │
│      ↓                                      │
│  ┌─ 有 tool_calls？ ── 否 ─→ 返回最终答案   │
│  │       是                                │
│  │  校验参数 → 执行工具 → 追加 tool 消息     │
│  └─────────────── 回到模型（循环）           │
│      ! 步数 / 时间 / 预算 上限               │
└─────────────────────────────────────────────┘
```

**关键点**：模型从来不「执行」工具，它只是输出一个结构化的调用意图。真正执行的是你的服务端代码——所以权限、鉴权、幂等都归你管。

## 工具 Schema 设计：把它当成给同事写的 API 文档

```ts
import { z } from 'zod'

const tools = {
  get_order: {
    description: '按订单号查询订单的实时状态与金额。仅用于查询，不修改任何数据。',
    parameters: z.object({
      orderId: z.string().regex(/^ORD-\d{6}$/).describe('订单号，格式 ORD-000123'),
    }),
    // 只读工具可标记为安全，写操作必须人工确认
    readOnly: true,
    run: async ({ orderId }: { orderId: string }) => db.orders.findById(orderId),
  },
  create_refund: {
    description: '发起退款申请。必须已获得用户明确确认后才能调用。',
    parameters: z.object({
      orderId: z.string(),
      amount: z.number().positive(),
      reason: z.enum(['damaged', 'wrong_item', 'late', 'other']),
    }),
    readOnly: false,
    run: async (args) => refunds.create(args),
  },
} as const
```

| 原则 | 说明 |
|---|---|
| 名字动词化、无歧义 | `get_order` 优于 `order`；相近工具要在描述里写清「什么时候不用它」 |
| 描述写清边界 | 输入、输出、副作用、失败情况，模型靠这段选工具 |
| 参数尽量收窄 | 用枚举、正则、必填字段，别给自由字符串「想填啥填啥」 |
| 结果要精简 | 只返回模型需要的字段，别把整个数据库行塞回上下文 |
| 幂等 | 同一调用重试不能产生两次副作用（用幂等键） |
| 错误是数据 | 工具失败要返回结构化错误，供模型自我修正或转人工 |

这跟前端写表单校验是同一套思路：**用类型把不确定性挡在边界外**。

## 一个完整的 tool loop（TypeScript）

```ts
type Msg =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: ToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string }

type ToolCall = { id: string; name: string; arguments: string }

async function runAgent(userInput: string, opts = { maxSteps: 8, budgetMs: 30_000 }) {
  const messages: Msg[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userInput },
  ]
  const started = Date.now()

  for (let step = 0; step < opts.maxSteps; step++) {
    if (Date.now() - started > opts.budgetMs) {
      return { answer: '任务超时，已停止执行，请重试或转人工。', trace: messages }
    }

    const reply = await callModel(messages, buildToolDefinitions()) // 见 03 篇
    messages.push(reply.assistantMessage)

    const calls = reply.toolCalls ?? []
    if (calls.length === 0) return { answer: reply.text, trace: messages }

    // 只读工具并发执行；写操作在这里必须先经过人工确认
    const results = await Promise.all(calls.map(async (call): Promise<Msg> => {
      const tool = tools[call.name as keyof typeof tools]
      if (!tool) return toolResult(call.id, { error: 'unknown_tool' })

      const parsed = tool.parameters.safeParse(JSON.parse(call.arguments || '{}'))
      if (!parsed.success) {
        // 把校验错误回喂，模型下一轮通常会自己改对
        return toolResult(call.id, { error: 'invalid_args', issues: parsed.error.issues })
      }
      if (!tool.readOnly && !await requireHumanApproval(call)) {
        return toolResult(call.id, { error: 'user_rejected' })
      }

      try {
        const data = await withTimeout(tool.run(parsed.data), 8_000)
        return toolResult(call.id, compact(data)) // 裁剪，别塞大对象
      } catch (e) {
        return toolResult(call.id, { error: 'tool_failed', message: String(e) })
      }
    }))

    messages.push(...results)
  }

  return { answer: '已达到最大执行步数，请缩小任务范围。', trace: messages }
}

function toolResult(id: string, data: unknown): Msg {
  return { role: 'tool', tool_call_id: id, content: JSON.stringify(data) }
}
```

**四个不可省略的保护**：`maxSteps`（防无限循环烧钱）、总时间预算、单工具超时、写操作确认。缺一个，Demo 就只是 Demo。

`trace`（即 `messages`）同时是调试日志与评测数据源，后续接 Tracing 时直接复用。

## 常见失败模式与对策

| 现象 | 根因 | 对策 |
|---|---|---|
| 选错工具 | 描述重叠、边界没写清 | 合并或重命名工具；描述里补「不用于…」；加 few-shot |
| 参数瞎编（如编造单号） | 模型想「帮忙」又没有数据 | system prompt 明确禁止编造；参数校验 + 追问 |
| 格式不合法 | 没用结构化输出 / 校验缺失 | JSON Schema + Zod + 错误回喂重试 |
| 循环调用同一个工具 | 工具结果没带来新信息 | 检测重复调用并返回提示；降低 maxSteps |
| 工具超时拖死整轮 | 没超时 / 没降级 | 单工具 timeout、备用工具、缓存兜底、友好提示 |
| 重复扣款 / 重复发消息 | 工具不幂等 | 幂等键 + 服务端去重 + 写操作确认 |
| 越权操作 | 把模型当可信调用方 | 服务端按当前用户身份二次鉴权，与模型输出无关 |

## 与前端概念的类比（帮助记忆）

```text
工具定义      ≈ 组件 props 类型 + 文档
模型输出参数   ≈ 用户填写的表单（可能乱填）
Zod 校验      ≈ 表单校验规则
错误回喂      ≈ 把校验错误红字显示在输入框旁，让用户改
人工确认      ≈ 危险操作的二次确认弹窗
trace         ≈ Redux devtools 的 action 时间线
```

## 动手任务

1. 不用框架，把上面的 loop 跑起来，接两个工具（一个只读查询、一个写操作）。
2. 故意让模型传错参数，观察「错误回喂」后它是否自我修正；统计修正成功率。
3. 造一个会超时的工具，实现 8 秒超时 + 备用数据源降级，界面给出可操作提示。
4. 把 `trace` 渲染成时间线面板（这正是 [前端集成](/ai-agent/10-frontend-integration) 要做的事）。

延伸：[MCP](/ai-agent/06-mcp)、[生产化](/ai-agent/11-production-engineering)、[OpenAI Function Calling 文档](https://platform.openai.com/docs/guides/function-calling)
