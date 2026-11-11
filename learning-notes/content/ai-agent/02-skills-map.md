---
title: "必要技能地图：哪些能复用，哪些必须补"
description: "前端转 AI Agent 的技能矩阵，含可迁移能力对照、优先级、掌握标准与语言选择建议"
category: "ai-agent"
date: "2026-11-11"
---

## 三类技能，别平均用力

| 分类 | 处理方式 | 内容 |
|---|---|---|
| 直接复用 | 换个场景继续用，几乎零学习成本 | TypeScript、async/await、Stream/SSE、Vue/React 状态管理、Node BFF、HTTP、工程化、测试与性能意识 |
| 重点补齐 | 转型真正的门槛，占学习时间 80% | LLM API 与上下文预算、Prompt/上下文工程、工具 Schema 与 tool loop、RAG、Agent 编排与状态、Evals 与 Tracing、安全边界 |
| 暂缓深入 | 应用开发阶段用不上，遇到再学 | Transformer 底层推导、模型预训练/微调、分布式推理、CUDA、复杂数据处理（pandas 重度使用） |

最容易踩的坑是把时间花在第三类上，因为它们看起来「最像 AI」。

## 技能矩阵（按优先级）

| 技能 | 为什么必须 | 优先级 | 掌握标准 | 对应文档 |
|---|---|---|---|---|
| LLM API 与消息结构 | 一切的地基 | P0 | 能手写原生请求、解释每个字段 | [LLM 调用基础](/ai-agent/03-llm-fundamentals) |
| 流式输出 SSE | 用户对「快」的第一感知 | P0 | 能逐 chunk 渲染、可中断、可重连 | [前端集成](/ai-agent/10-frontend-integration) |
| 结构化输出 | 让模型结果能被程序消费 | P0 | 用 JSON Schema/Zod 校验并做失败重试 | [LLM 调用基础](/ai-agent/03-llm-fundamentals) |
| System prompt 设计 | 决定行为边界与稳定性 | P0 | 能写出可版本化、可测试的 prompt | [提示词与上下文工程](/ai-agent/04-prompt-and-context) |
| 上下文与 Token 预算 | 直接决定成本与稳定性 | P0 | 能做摘要压缩、滑动窗口、预算分配 | [提示词与上下文工程](/ai-agent/04-prompt-and-context) |
| Function Calling / tool loop | 从「聊天」跨到「做事」 | P0 | 能独立实现循环、并发调用与错误回喂 | [工具调用](/ai-agent/05-tool-calling) |
| 工具与权限设计 | 生产事故的主要来源 | P0 | 最小权限、幂等、写操作人工确认 | [工具调用](/ai-agent/05-tool-calling)、[生产化](/ai-agent/11-production-engineering) |
| MCP | 工具生态的事实标准 | P1 | 能写 server、能接 client、懂安全边界 | [MCP](/ai-agent/06-mcp) |
| RAG 管线 | 让 Agent 用上私有知识 | P1 | 能定位检索失败原因并改进 | [RAG](/ai-agent/07-rag) |
| Agent 循环/状态机 | 多步任务的骨架 | P1 | 有停止条件、步数上限、恢复机制 | [Agent 循环与编排](/ai-agent/08-agent-loop-and-orchestration) |
| 框架选型与落地 | 提效，但不是能力本身 | P1 | 先原生后框架，能说清取舍 | [框架选型](/ai-agent/09-frameworks) |
| Agent UI 与交互工程 | 前端的差异化壁垒 | P1 | 工具时间线、审批、取消、降级齐全 | [前端集成](/ai-agent/10-frontend-integration) |
| Evals 与 Tracing | 从 Demo 到产品 | P1 | 有数据集、有指标、能定位回归 | [生产化](/ai-agent/11-production-engineering) |
| 成本/延迟优化 | 上线后被老板追问 | P2 | 模型分级、缓存、并发、prompt 精简 | [生产化](/ai-agent/11-production-engineering) |
| 多 Agent 协作 | 只在确有并行收益时用 | P2 | 能论证「为什么不用单 Agent」 | [Agent 循环与编排](/ai-agent/08-agent-loop-and-orchestration) |
| Python 基础 | 复杂 RAG 管线 / 团队基建需要 | P2 | 能读懂脚本、改工具函数、跑 FastAPI | 本站 [Python 模块](/python) |

## 前端能力 → Agent 能力迁移对照

| 你已有的能力 | 迁移到 | 需要补的那一点点 |
|---|---|---|
| TypeScript 类型系统 | 工具参数 Schema、结构化输出 | 学会用 Zod 同时产出运行时校验与 JSON Schema |
| `async/await`、AbortController | 模型调用与工具并发、用户中断 | 取消时要同时中止服务端 loop，不能只停渲染 |
| SSE / ReadableStream | 流式 token / 事件流 | 事件类型要从「纯文本」升级为「文本 + 工具 + 状态」 |
| Pinia / Vuex / Redux | 会话状态与 Agent 状态机 | 状态要可序列化、可持久化、可回放（checkpoint） |
| 表单校验与错误提示 | 工具参数校验、模型输出校验 | 错误要结构化回喂模型让它自我修正 |
| 组件化与设计系统 | 工具定义、Generative UI | 让模型输出「组件名 + props」而不是自由文本 |
| 埋点 / 性能监控 | Tracing / Evals | 追踪单位从「页面」变成「一次 run 的每个 step」 |
| 权限与鉴权 | 工具级权限、数据隔离 | 模型是不可信调用方，服务端必须二次鉴权 |

**一句话**：你缺的不是写代码的能力，而是「如何与一个不确定的、会犯错的输出方协作」的工程经验。

## 语言选择：TypeScript 优先，Python 按需补

2026 年的生态对 TS 已经很友好：Vercel AI SDK、Mastra、LangGraph.js、OpenAI Agents SDK（JS）、MCP 官方 TS SDK 都是一等公民，且前端工程师用 TS 的产出速度远高于现学 Python。

**建议路径**：

1. 前 3 个月全用 TypeScript，把概念吃透、把项目做出来。
2. 遇到以下情况再补 Python：团队 Agent 基建是 Python、要做复杂文档解析/数据处理管线、要复现某篇论文或用 Python 专属库。
3. Python 只需先掌握「能读懂 / 能改 / 能跑服务」的水平，本站 [Python 模块](/python) 的 7 篇笔记足够起步。

不要因为「AI 都用 Python」这句话就推翻自己最大的优势。

## 面试高频能力项（自测用）

- 工具调用超时 / 第三方接口挂了，如何保证用户体验？（降级、重试、备用工具、缓存、优雅提示）
- 多轮对话 Token 溢出怎么处理？（摘要压缩、滑动窗口、关键记忆持久化、无效会话清理）
- 怎么证明你的 Agent 比上一版更好？（评测集、任务成功率、幻觉率、P95、成本）
- 如何防止用户通过上传文档诱导 Agent 执行危险操作？（不可信内容隔离、最小权限、人工确认、输出过滤）
- 为什么这里用 RAG 而不是长上下文 / 微调？（成本、时效性、可归因、权限）
- 什么时候不该用多 Agent？（上下文传递损耗、调试成本、单 Agent 能搞定时）

答不上来的那一条，就是下一周的学习目标。完整答案分布在 [生产化](/ai-agent/11-production-engineering) 与各专题文档中。
