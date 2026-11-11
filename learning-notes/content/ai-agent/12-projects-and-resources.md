---
title: "实战项目与推荐资源清单"
description: "四个递进式项目（含验收标准）、作品集与简历写法、官方文档/课程/论文/开源资源汇总及 30/90 天计划模板"
category: "ai-agent"
date: "2026-11-11"
---

## 四个递进项目（按难度排序）

挑真实约束的垂直场景，别做「第 N 个聊天框」。每个项目都要能回答：**它比聊天框多解决了什么？出了问题怎么查？**

### 项目 1：流式对话 + 结构化输出

| 项 | 内容 |
|---|---|
| 目标 | 打通从模型 API 到前端渲染的完整链路 |
| 技术栈 | Nuxt server route、原生 fetch / Vercel AI SDK、Zod、SSE |
| 功能 | 逐字渲染、停止生成、多轮会话、把「提取待办」结果渲染成可勾选列表 |
| 验收 | 中文流式无乱码；停止生成后服务端 loop 确实中止；错误格式能自动重试修正；密钥只在服务端 |
| 加分 | 会话持久化、Token 用量展示、明暗主题一致 |

对应文档：[LLM 调用基础](/ai-agent/03-llm-fundamentals)、[前端集成](/ai-agent/10-frontend-integration)

### 项目 2：会查数据的业务助手 + MCP

| 项 | 内容 |
|---|---|
| 目标 | 掌握 tool loop 与工具生态 |
| 技术栈 | TypeScript、Zod、MCP TypeScript SDK、任意业务 API |
| 功能 | 2 个只读工具 + 1 个写操作（带确认）；工具调用时间线；把其中一个工具发布为 MCP Server |
| 验收 | 参数校验失败能自我修正；工具超时有降级；写操作必须人工确认且服务端二次鉴权；MCP 客户端能动态发现工具 |
| 加分 | 幂等键、trace 回放、注入攻击自测用例 |

对应文档：[工具调用](/ai-agent/05-tool-calling)、[MCP](/ai-agent/06-mcp)

### 项目 3：私有知识库问答（RAG）

| 项 | 内容 |
|---|---|
| 目标 | 让 Agent 用上私有知识且答案可归因 |
| 技术栈 | Markdown 解析、Embedding、pgvector / Qdrant、关键词检索、rerank |
| 功能 | 把本站 `content/` 文档入库；答案带来源链接；无依据时明确拒答；按分类过滤 |
| 验收 | 20 条评测集上记录 Recall@5 与忠实度；对比纯向量与混合检索的命中率；文档更新后索引同步 |
| 加分 | 查询改写处理代词、引用编号定位到具体章节、把检索封装成 Agent 工具 |

对应文档：[RAG](/ai-agent/07-rag)、[提示词与上下文工程](/ai-agent/04-prompt-and-context)

### 项目 4：可审批、可观测的多步 Agent

| 项 | 内容 |
|---|---|
| 目标 | 把前三个项目的能力整合成一个「产品级」系统 |
| 技术栈 | 状态图/持久化框架、SSE 事件流、SQLite/Postgres、OpenTelemetry |
| 功能 | 计划拆解 → 多步执行 → 人工审批 → 断点续跑；工具时间线 + 成本看板；20+ 条 evals 自动跑 |
| 验收 | 有四类停止条件；有 runId 全链路 trace；故障演练（超时/限流/断网）全部有可操作降级；能给出任务成功率、P95、单次成本三个数字 |
| 加分 | 多模型容灾、灰度与回滚、写给非技术同事的操作说明 |

对应文档：[Agent 循环与编排](/ai-agent/08-agent-loop-and-orchestration)、[前端集成](/ai-agent/10-frontend-integration)、[生产化](/ai-agent/11-production-engineering)

> 项目 1–2 用 TypeScript 即可完成，项目 3–4 视团队基建决定是否引入 Python。

## 作品集与简历写法

**README 必备五件事**：一句话说明解决什么问题、架构图、快速启动命令、效果截图/录屏、明确的「已知限制与后续计划」。最后一项最能体现工程成熟度。

**描述要量化，用你实测的数字填**：

```text
❌ 优化了 Agent 的响应体验，提升了系统稳定性
✅ 流式渲染改为按帧批量刷新，200 条消息下渲染耗时从 Xms 降至 Yms
✅ 建立 25 条评测集，工具参数合法率从 A% 提升到 B%，任务成功率 C%
✅ 引入小模型路由与历史摘要压缩，单次任务平均成本下降 N%
✅ 实现工具超时降级与 checkpoint 续跑，故障场景会话失败率下降 M%
```

面试准备围绕三条线：**为什么这样设计**（取舍）、**哪里失败过**（复盘）、**怎么证明有效**（数据）。

## 推荐资源（按用途分类）

### 官方文档（首选，最不容易过时）

| 资源 | 用途 |
|---|---|
| [OpenAI Platform Docs](https://platform.openai.com/docs/overview) | API、Function Calling、结构化输出、Agents |
| [Anthropic Docs](https://docs.anthropic.com/) | 工具使用、提示工程、Agent 设计 |
| [Vercel AI SDK](https://ai-sdk.dev/docs/introduction) | TS 流式与工具、AI UI |
| [MCP 官方文档](https://modelcontextprotocol.io/) | 协议规范与 SDK 索引 |
| [LangGraph](https://docs.langchain.com/oss/python/langgraph/overview) | 状态图、checkpoint、人工审批 |
| [Mastra](https://mastra.ai/docs) | TS 全链路 Agent 平台 |
| [LlamaIndex](https://docs.llamaindex.ai/) | RAG 与文档管线 |
| [Nuxt Content](https://content.nuxt.com/) / [Nitro](https://nitro.unjs.io/) | 本站内容与服务端的实现基础 |

### 理念与方法（读透比追新有用）

| 资源 | 收获 |
|---|---|
| [Anthropic《Building effective agents》](https://www.anthropic.com/research/building-effective-agents) | Workflow 与 Agent 的边界、常见模式 |
| [Prompt Engineering Guide](https://www.promptingguide.ai/) | 提示技巧的系统梳理 |
| [ReAct 论文](https://arxiv.org/abs/2210.03629) | 推理与行动交替的原始思路 |
| [RAG 论文](https://arxiv.org/abs/2005.11401) | 检索增强生成的来龙去脉 |
| [OWASP LLM Top 10](https://owasp.org/www-project-top-10-for-large-language-model-applications/) | 安全风险清单 |

### 课程与动手环境

- [DeepLearning.AI 短课程](https://www.deeplearning.ai/short-courses/)：按主题几小时一门，适合快速补概念。
- [Hugging Face LLM Course](https://huggingface.co/learn/llm-course)：想理解模型侧直觉时再看，非必须。
- [Langfuse](https://langfuse.com/docs) / [LangSmith](https://docs.smith.langchain.com/)：把 Tracing 与 Evals 跑起来。

### 开源项目（读代码，别只复制配置）

- [MCP Servers 示例集合](https://github.com/modelcontextprotocol/servers)：学习工具如何暴露。
- [Dify](https://github.com/langgenius/dify) / [n8n](https://github.com/n8n-io/n8n)：看可视化编排怎么做状态与权限。
- [LangChain](https://github.com/langchain-ai/langchain) / [LlamaIndex](https://github.com/run-llama/llama_index)：看大型框架的抽象分层与取舍。

> 生态更新快：以官方文档与 changelog 为准，任何博客里的版本号都当作历史快照。

## 30 天 / 90 天计划模板

```text
第 1–30 天
  W1  03 篇 + 原生 API 调用 + SSE 解析
  W2  04/05 篇 + 手写 tool loop + Zod 校验
  W3  10 篇 + 五区域 UI + 停止/降级
  W4  完成项目 1，写一篇复盘笔记

第 31–90 天
  M2  06/07 篇 + MCP Server + RAG，完成项目 2、3
  M3  08/09/11 篇 + 框架落地 + evals/tracing，完成项目 4
  持续 每周至少一条笔记、一次评测、一次失败复盘
```

## 把学习闭环留在项目里

这个笔记站本身就是最好的练习场：

- 每读完一篇，在 `content/ai-agent/` 补一篇自己的踩坑记录（frontmatter 照抄现有格式即可）。
- 用「管理」页上传 `.md` 时选择 `AI Agent 文档` 分类，导航与首页统计会自动更新。
- 项目 3 可以直接把整个 `content/` 目录当语料，做完还能反过来检验笔记写得够不够清楚。

**路线图看完了，真正的进度条是跑通的项目数。**
