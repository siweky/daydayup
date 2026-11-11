---
title: "2026 年框架选型：TypeScript 优先的务实路线"
description: "Vercel AI SDK、Mastra、LangGraph、各厂商 Agents SDK 与低代码平台的能力对比、选择决策树与避坑建议"
category: "ai-agent"
date: "2026-11-11"
---

## 先说结论：框架不是能力，是封装

主流框架的核心能力已经趋同：类型化工具、流式输出、MCP 客户端、handoff、guardrails、持久化执行、tracing。差异主要体现在**执行模型**（循环 / 图 / 角色）、**语言生态**、**持久化深度**和**与某家模型厂商的绑定程度**。

**学习顺序**：先手写一次原生 API 与 tool loop（[LLM 调用基础](/ai-agent/03-llm-fundamentals)、[工具调用](/ai-agent/05-tool-calling)），再上框架。否则你只会调 API，遇到「Agent 卡住循环」「状态丢了」时无从下手。

## 全景对比（2026 年现状，能力描述以官方文档为准）

| 框架 / SDK | 语言 | 核心特长 | 适合场景 | 需要注意 |
|---|---|---|---|---|
| 原生厂商 SDK | 任意 | 零抽象、完全可控 | 学习阶段、简单调用 | 状态、重试、tracing 都得自己写 |
| **Vercel AI SDK** | TS | 模型中立、流式与工具类型化、结构化输出、AI UI 组件生态 | 前端主导的 AI 应用、Next/Nuxt 产品 | 记忆与复杂持久化交给应用层 |
| **Mastra** | TS | Agent + Workflow + 记忆 + RAG + MCP + Evals + 可观测一体化 | 想用一套 TS 框架覆盖全链路 | 抽象较厚，先理解底层概念再用 |
| **LangGraph** | Python / JS | 显式状态图、checkpointer、断点恢复、时间旅行 | 长任务、审批流、需审计的流程 | 有学习曲线；JS 版新特性略滞后于 Python |
| **OpenAI Agents SDK** | TS / Python | Agent loop、handoffs、guardrails、官方 tracing | 以 OpenAI 模型为主的应用 | 与单一厂商生态耦合较紧 |
| **Claude Agent SDK** | TS / Python | 面向编码与工具密集型 Agent，继承 Claude Code 的能力 | 代码 Agent、IDE 内智能体 | 同上，按所用模型选择 |
| **Google ADK** | Python / TS / Java / Go | 多语言、与 Gemini / Vertex 集成 | 已用 GCP 的团队 | 生态绑定 |
| **Microsoft Agent Framework** | Python / .NET | 企业级编排与 Azure 集成，AutoGen、Semantic Kernel 的演进方向 | Azure / .NET 企业系统 | 与 Azure 体系绑定 |
| **LangChain.js / LlamaIndex** | TS / Python | 集成面广、文档与 RAG 管线成熟 | 需要大量现成连接器 | 抽象层多，按需取用而非全盘引入 |
| **Dify / n8n** | 低代码 | 可视化编排、快速验证、非技术同事可参与 | 原型验证、内部工具 | 复杂逻辑与工程化受限于平台 |
| **Cloudflare Agents** | TS | Durable Object 承载的有状态 Agent，靠近边缘 | 边缘部署、长连接场景 | 平台绑定 |

> 生态迭代很快，具体 API 与版本请以各项目官方文档和 changelog 为准。这张表用来判断「哪一类工具解决什么问题」，不要照抄版本号。

## 给前端工程师的推荐路径

```text
第 1 步  原生 fetch + SSE + Zod              → 建立底层直觉（不装框架）
第 2 步  Vercel AI SDK 或厂商原生 SDK        → 把流式 UI / 工具类型化做顺
第 3 步  按需求二选一：
          · 需要「暂停/恢复/审批/长任务」 → LangGraph（状态图 + checkpoint）
          · 需要「记忆/RAG/evals/MCP 全套」 → Mastra
第 4 步  确定主力模型后，评估是否改用对应厂商 Agents SDK
第 5 步  需要复杂 RAG 管线或团队是 Python 基建 → 再补 Python 生态
```

**第 2 步就够做出可演示的产品了。** 别在第 3 步之前纠结「哪个框架最强」。

## 选择决策树

```text
Q1 是否只是「一次调用 + 流式展示」？
   是 → 原生 SDK / Vercel AI SDK，别上 Agent 框架
Q2 是否需要多步自主决策？
   否 → 写成固定 Workflow（代码或低代码平台）
Q3 流程是否需要暂停、等待审批、失败后从断点恢复？
   是 → LangGraph 一类带 checkpointer 的图编排
Q4 是否需要完整 TS 平台（记忆、RAG、评估、可观测）？
   是 → Mastra
Q5 是否已深度绑定某模型厂商 / 云？
   是 → 对应厂商 SDK（OpenAI / Claude / Google / Microsoft）
Q6 只是给团队快速验证想法？
   是 → Dify / n8n，验证完再决定是否自研
```

## 三个选型原则

1. **按约束选，不按功能清单选**：语言（TS 还是 Python）、运行时（serverless 还是常驻）、任务时长（秒级还是天级）、审计要求，这四项决定一切。
2. **把 provider 抽象隔离在一处**：模型调用、工具定义、prompt 模板都放在自己的适配层，换框架时只改这一层。
3. **业务逻辑不要长在框架 API 上**：你的核心价值是「订单退款规则」「审批条件」「权限判断」，这些应该是纯函数，能被单元测试，不依赖任何框架对象。

## 框架解决不了的事

| 仍然要你自己做 | 为什么 |
|---|---|
| 工具权限与服务端鉴权 | 框架不知道你的用户体系 |
| Prompt 版本与 evals | 需要业务标注数据 |
| 上下文预算与成本策略 | 与业务定价、SLA 相关 |
| Agent UI 的交互与降级 | 前端体验是差异化壁垒 |
| 领域知识与失败复盘 | 没有任何库能替你理解业务 |

## 应对「框架三个月一变」

- 锁版本、写升级记录，别在大版本刚发布时迁生产。
- 订阅官方 changelog，只跟进与自己在用特性相关的部分。
- 概念优先：tool loop、状态机、上下文预算、evals 这些不会过时，具体 API 会。
- 定期用原生 API 重写一遍最小 Demo，检验自己是否还理解底层。

## 动手任务

1. 用原生 SDK 和 Vercel AI SDK 分别实现同一个「带一个工具的流式助手」，对比代码量与可控性。
2. 给同一任务加上「暂停等待审批」需求，试着用状态图框架实现，记录状态持久化到哪张表。
3. 把模型供应商从 A 换成 B，统计需要改动的文件数——这是检验抽象是否合格的硬指标。

参考：[Vercel AI SDK](https://ai-sdk.dev/docs/introduction)、[Mastra](https://mastra.ai/docs)、[LangGraph](https://docs.langchain.com/oss/python/langgraph/overview)、[OpenAI Agents SDK](https://openai.github.io/openai-agents-js/)、[MCP 官方生态](https://modelcontextprotocol.io/)
