---
title: "MCP：把工具一次性接好，处处可用"
description: "Model Context Protocol 的三原语、架构与传输方式，TypeScript 最小 Server 示例，以及前端工程师的最佳切入点"
category: "ai-agent"
date: "2026-11-11"
---

## 它解决的是「N × M」集成问题

没有 MCP 时，每个 Agent 应用（N）都要为每个工具系统（M）写一遍适配器：接 GitHub、接数据库、接内部订单系统……重复劳动且互不通用。

MCP（Model Context Protocol）把这件事标准化：**工具提供方实现一次 Server，任何支持 MCP 的 Host 都能直接发现并调用**。它 2024 年由 Anthropic 提出并开源，如今主流模型厂商、IDE 与 Agent 框架都提供了支持，已成为工具生态的通用协议。

```text
Host（你的 Agent 应用 / IDE / 客户端）
   │  MCP Client（每个连接一个）
   │  JSON-RPC 2.0，stdio 或 Streamable HTTP
   ▼
MCP Server（暴露 Tools / Resources / Prompts）
   ▼
业务 API、数据库、文件系统、SaaS
```

### 与 Function Calling 的关系（最容易混淆）

| | Function Calling | MCP |
|---|---|---|
| 解决的问题 | 模型如何表达「我要调用某个函数」 | 应用如何发现并连接外部能力 |
| 边界 | 模型 ↔ 你的应用 | 你的应用 ↔ 外部工具生态 |
| 谁定义 | 你在请求里传 `tools` | Server 自己声明能力，Client 动态发现 |
| 关系 | 互补，不是替代 | MCP Server 暴露的工具，最终仍会变成模型可见的 tool 定义 |

## 三类核心原语

| 原语 | 谁来控制 | 用途 | 类比 |
|---|---|---|---|
| **Tools** | 模型决定调用 | 执行动作、查询数据 | 一次函数调用 / POST 接口 |
| **Resources** | 应用决定注入 | 提供可读上下文（文件、文档、配置） | GET 资源 / 上下文片段 |
| **Prompts** | 用户或应用触发 | 可复用的提示模板与工作流 | 预设指令 / 快捷命令 |

进阶能力还包括 Sampling（Server 反向请求模型生成）与 Elicitation（向用户追问缺失信息），初学阶段了解即可。

### 传输方式

- **stdio**：本地进程，Client 启动 Server 并通过标准输入输出通信。适合本地工具、IDE 插件，最简单。
- **Streamable HTTP**：远程服务，适合团队共享、需要鉴权与多租户的场景（早期 HTTP+SSE 已被其取代）。

## 最小 MCP Server（TypeScript）

以官方 `@modelcontextprotocol/sdk` 为例；SDK 迭代较快，旧版本用 `server.tool(...)`，新版本用 `server.registerTool(...)`，以你安装版本的官方文档为准。

```ts
// mcp/order-server.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const server = new McpServer({ name: 'order-service', version: '1.0.0' })

server.registerTool(
  'get_order',
  {
    title: '查询订单',
    description: '按订单号查询实时状态。只读，不修改数据。',
    inputSchema: { orderId: z.string().regex(/^ORD-\d{6}$/) },
  },
  async ({ orderId }) => {
    const order = await db.orders.findById(orderId)
    if (!order) return { content: [{ type: 'text', text: '未找到该订单' }], isError: true }
    // 只返回必要字段，控制上下文体积
    return { content: [{ type: 'text', text: JSON.stringify({ id: order.id, status: order.status }) }] }
  }
)

server.registerResource(
  'refund-policy',
  'docs://refund-policy',
  { description: '退款政策文档' },
  async (uri) => ({ contents: [{ uri: uri.href, text: await readPolicy() }] })
)

await server.connect(new StdioServerTransport())
```

客户端侧通常是「列出工具 → 转成模型可识别的 tools 定义 → 收到调用后转发给 Server」：

```ts
const { tools } = await client.listTools()
const toolDefs = tools.map(t => ({
  name: t.name,
  description: t.description,
  parameters: t.inputSchema, // JSON Schema
}))

// 模型返回 tool_calls 后
for (const call of toolCalls) {
  const result = await client.callTool({ name: call.name, arguments: JSON.parse(call.arguments) })
  messages.push({ role: 'tool', tool_call_id: call.id, content: stringify(result.content) })
}
```

大部分 Agent 框架已封装了这段胶水代码（见 [框架选型](/ai-agent/09-frameworks)），但**手写一次能让你彻底理解 tool loop**。

## 前端工程师的最佳切入点

你手里已经有大量「现成能力」：BFF 接口、内部管理后台 API、组件文档、设计 token、埋点查询、CMS 内容。把它们包装成 MCP Server，就能让任意 Agent 直接调用，而不用每个应用重写适配器。

推荐顺序：

1. 挑一个**只读**业务接口（如「查订单」「查组件文档」）做成 stdio Server，本地跑通。
2. 用官方 Inspector 或一个支持 MCP 的客户端验证工具发现与调用。
3. 再做一个 Resource，把项目 Markdown 文档暴露给模型（与本站内容天然契合）。
4. 需要团队共享时改成 Streamable HTTP，加鉴权与审计。
5. 写操作一律加确认；先在 [工具调用](/ai-agent/05-tool-calling) 的 loop 里跑通再对外开放。

在 Nuxt 项目里，远程 MCP 端点可以落在 `server/routes/` 或 `server/api/` 中，复用现有的 Nitro 中间件做鉴权与限流——这部分能力本站 [Nitro 模块](/nitro) 已经覆盖。

## 安全边界（比功能更重要）

| 风险 | 对策 |
|---|---|
| 工具被诱导执行危险操作 | 只读优先；写操作必须服务端鉴权 + 人工确认 |
| 远程 Server 越权访问内网 | 网络白名单、SSRF 防护、独立凭据、最小权限 |
| 工具返回内容携带注入指令 | 当作不可信资料处理，见 [提示词与上下文工程](/ai-agent/04-prompt-and-context) |
| 返回体过大撑爆上下文 | 服务端裁剪字段、分页、截断、摘要 |
| 无法追责 | 记录调用方、参数、结果摘要、确认人；接入 Tracing |
| 供应链风险 | 只接可信 Server，锁定版本，审查工具清单再启用 |

牢记：**MCP 是能力发现协议，不是授权系统**。鉴权仍然在你自己的服务端。

## 动手任务

1. 用 TS SDK 实现一个 stdio Server，暴露 2 个只读工具 + 1 个 Resource。
2. 用官方 Inspector 连上，截图记录 `tools/list` 与 `tools/call` 的报文。
3. 在 [工具调用](/ai-agent/05-tool-calling) 的 loop 中接入这个 Server，验证「工具列表动态发现」而不是硬编码。
4. 给写操作加确认步骤，并尝试用注入文本绕过，验证服务端是否仍然拦得住。

参考：[MCP 官方文档](https://modelcontextprotocol.io/)、[MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)、[官方 Server 示例集合](https://github.com/modelcontextprotocol/servers)
