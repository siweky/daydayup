---
title: "Agent 循环、编排与记忆：从一次调用到一个系统"
description: "ReAct 与 Plan-and-Execute、状态图与 checkpoint、记忆分层、多 Agent 协作与人类审批的设计取舍"
category: "ai-agent"
date: "2026-11-11"
---

## Workflow 和 Agent，先分清楚

| | Workflow（工作流） | Agent（智能体） |
|---|---|---|
| 路径 | 代码预先定义，步骤固定 | 模型在运行中决定下一步 |
| 可预测性 | 高 | 低 |
| 成本/延迟 | 可控 | 可能多轮调用，波动大 |
| 适合 | 表单处理、固定审批流、ETL | 开放域任务、需要临场判断 |

**实践建议**：能用 Workflow 解决就用 Workflow，只在「路径无法预先枚举」的地方引入 Agent。很多生产系统其实是「确定性骨架 + 少数几个 Agent 节点」的混合体。

## 三种典型的执行模式

### 1. ReAct（推理 ↔ 行动交替）

模型每轮输出「想法 → 选择工具 → 观察结果 → 再推理」，直到给出答案。就是 [工具调用](/ai-agent/05-tool-calling) 的 tool loop。

- 优点：实现简单、适应性强
- 缺点：容易跑偏、重复调用、长任务难恢复

### 2. Plan-and-Execute

先让模型产出结构化计划，再逐步执行，执行完可重规划。

```ts
type Plan = {
  goal: string
  steps: Array<{ id: string; action: string; dependsOn?: string[]; status: 'pending' | 'done' | 'failed' }>
}
```

适合步骤多、可并行的任务；代价是多一次规划调用，且计划可能基于错误假设。

### 3. 状态图 / 图编排

把节点（模型调用、工具、审批、分支）与边显式建模，状态可持久化、可暂停、可回放。

```text
[理解意图] → [需要检索?] ─是→ [检索] → [生成答案]
                 └─否──────────────→ [生成答案]
                            ↓
                    [敏感操作?] → [人工审批] → [执行] → [结束]
```

LangGraph 这类框架的核心就是这个模型：节点 + 类型化状态 + checkpointer。**当流程需要「暂停几小时等审批」或「失败后从断点恢复」时，图的价值就体现出来了**。

## 一个可用的状态设计

```ts
type AgentState = {
  runId: string
  userId: string
  messages: Message[]          // 会话消息
  plan?: Plan                  // 当前计划
  pendingApproval?: { tool: string; args: unknown }
  facts: Record<string, unknown>   // 已确认事实（压缩后的长期信息）
  metrics: { steps: number; tokens: number; startedAt: number }
  status: 'running' | 'waiting_human' | 'done' | 'failed'
}
```

状态要满足三个条件：**可序列化**（能存数据库）、**可恢复**（拿到快照就能继续）、**可观测**（每一步的 diff 都能推给前端）。这正好对接 [前端集成](/ai-agent/10-frontend-integration) 的事件流。

## 停止条件：生产系统的安全带

任何自主循环都必须同时设置：

| 限制 | 建议起点 | 触发后 |
|---|---|---|
| 最大步数 | 8–15 | 返回「已停止，请缩小范围」+ 已完成的结果 |
| 总时间预算 | 30–60 秒 | 中止并保存 checkpoint，允许用户续跑 |
| Token / 金额预算 | 按业务设定 | 降级到小模型或转人工 |
| 重复动作检测 | 同工具同参数 ≥ 2 次 | 注入提示「该调用无新信息，请换策略或给出结论」 |
| 工具错误上限 | 连续 3 次失败 | 停止重试，走降级路径 |

## 记忆分层

| 层 | 生命周期 | 存什么 | 实现 |
|---|---|---|---|
| 工作记忆 | 单次 run | 当前计划、中间结果、待确认动作 | 内存 / 状态对象 |
| 会话记忆 | 一次对话 | 消息历史、已确认事实、用户偏好 | 数据库会话表 + 摘要压缩 |
| 长期记忆 | 跨会话 | 稳定偏好、项目背景、常用实体 | 向量库 / KV 存储，按需检索注入 |

关键动作是**「提炼」而不是「全存」**：把对话里反复出现的事实抽成结构化条目，检索时只注入相关条目。无脑把全部历史塞进上下文，是成本失控和注意力稀释的头号原因（见 [提示词与上下文工程](/ai-agent/04-prompt-and-context)）。

## Human-in-the-loop：把人放进循环

```text
模型提议写操作 → 状态转为 waiting_human，持久化 checkpoint
   → 前端弹出「变更摘要 + 影响范围 + 确认/拒绝」
   → 用户确认 → 携带审批凭据恢复执行
   → 服务端再次鉴权后才真正调用工具
```

三个设计要点：

1. **审批的是「参数化意图」**，不是一句自然语言（展示结构化摘要，避免用户看不懂）。
2. **审批凭据与会话绑定**，防止 replay / 越权恢复。
3. **恢复时重新鉴权**，不能因为「之前批准过」就跳过权限检查。

## 多 Agent：先问「为什么」

| 模式 | 结构 | 适用 |
|---|---|---|
| Handoff | 一个 Agent 把对话转给另一个专精 Agent | 客服分流、语种切换 |
| Supervisor / Worker | 主管拆解并派发给子 Agent，汇总结果 | 研究、跨领域调研 |
| 流水线 | A 产出 → B 校验 → C 输出 | 需要独立校验环节 |

代价也很实在：**上下文传递会损耗信息、调试变难、成本成倍上升、延迟叠加**。如果单 Agent + 好工具 + 好 prompt 能解决，就别上多 Agent。

## 一次 run 应该留下什么

```text
runId
 ├─ step 0  意图识别     模型/耗时/token
 ├─ step 1  search_docs  参数/命中数/耗时
 ├─ step 2  生成答案     模型/token/finish_reason
 └─ 汇总     总耗时 / 总 token / 成本 / 成功或失败原因
```

这份 trace 同时服务于调试、评估和成本分析，是 [生产化](/ai-agent/11-production-engineering) 的基础设施。

## 动手任务

1. 给 [工具调用](/ai-agent/05-tool-calling) 的 loop 加上四类停止条件，并测试「无限循环」场景能否被拦住。
2. 把状态改成可序列化的 `AgentState`，存到 SQLite，实现中断后从 checkpoint 续跑。
3. 实现一个写操作审批：暂停 → 前端确认 → 服务端二次鉴权 → 继续。
4. 对比「单 Agent」与「Supervisor + 2 Worker」在同一组 10 个任务上的成功率与成本，写出「是否值得」的结论。

参考：[ReAct 论文](https://arxiv.org/abs/2210.03629)、[Anthropic《Building effective agents》](https://www.anthropic.com/research/building-effective-agents)、[LangGraph 文档](https://docs.langchain.com/oss/python/langgraph/overview)
