---
title: "RAG：让 Agent 用上私有知识，还能说清出处"
description: "检索增强生成的完整管线、分块与 Embedding 策略、混合检索与重排、评估指标及常见坑"
category: "ai-agent"
date: "2026-11-11"
---

## 先判断：到底要不要 RAG

| 方案 | 适合 | 不适合 |
|---|---|---|
| 直接塞进上下文 | 少量、每次都变、临时资料 | 知识库大、成本敏感 |
| **RAG** | 知识量大、需更新、需要出处、需权限过滤 | 需要模型改变「表达方式/风格」 |
| 微调 | 固定风格、固定格式、领域术语适配 | 知识频繁更新、需要可归因 |
| 长上下文硬塞 | 一次性分析整份长文档 | 高频请求、低延迟要求 |

RAG 的三个不可替代优势：**知识可更新**（改文档即可，不用重训）、**答案可归因**（能给出处）、**可做权限过滤**（按用户可见范围检索）。

## 完整管线

```text
文档 → 解析 → 分块(chunk) → 向量化(embedding) → 索引(向量库)
                                                    ↑
用户问题 → 改写/扩写 → 检索(向量 + 关键词) → 重排(rerank) → 拼装上下文 → 生成 → 带引用回答
```

### 1. 解析与分块

解析要保留结构：标题层级、表格、代码块、元数据（来源 URL、更新时间、权限标签）。这些元数据后面做过滤与引用都要用。

| 分块策略 | 说明 | 适用 |
|---|---|---|
| 固定长度 + 重叠 | 如 500 token、重叠 50–100 | 通用基线，先跑通再优化 |
| 按标题/段落结构 | 不切断语义单元 | 技术文档、规范类内容（本站笔记适用） |
| 父子块 | 用小块检索、把所属大块喂给模型 | 需要完整语境的长文档 |
| 语义分块 | 按语义相似度切 | 效果更好但实现成本高 |

**经验**：分块质量往往比换 Embedding 模型影响更大。每个 chunk 都要带上「它来自哪篇文档的哪一节」的元数据。

### 2. Embedding 与检索

```ts
// 极简示意：向量余弦相似度（生产请用向量库）
function cosine(a: number[], b: number[]) {
  const dot = a.reduce((s, v, i) => s + v * b[i], 0)
  const norm = (x: number[]) => Math.sqrt(x.reduce((s, v) => s + v * v, 0))
  return dot / (norm(a) * norm(b))
}

async function retrieve(query: string, topK = 5) {
  const q = await embed(query)                    // 与入库时用同一个模型
  const candidates = await vectorStore.search(q, topK * 4)
  const keywords = await keywordSearch(query, topK * 4)   // BM25 / 全文检索
  const merged = reciprocalRankFusion(candidates, keywords) // 混合检索
  const reranked = await rerank(query, merged.slice(0, 20)) // 交叉编码器精排
  return reranked.slice(0, topK)
}
```

要点：

- **查询改写**：用户问「那它超了怎么办」，代词要补成完整的检索 query，否则必然检索失败。
- **混合检索**：纯向量对专有名词、编号、代码片段不敏感，配合关键词检索（BM25）显著提升命中率。
- **重排**：粗排取 20–50 条，用 rerank 模型精排到 3–5 条，性价比最高的一步。
- **元数据过滤**：先按权限、时间、文档类型过滤，再算相似度，避免「检索到不该看的内容」。

### 3. 拼装与生成

```ts
const context = hits.map((h, i) =>
  `【${i + 1}】来源：${h.title} (${h.url})\n${h.text}`
).join('\n\n')

const messages = [
  { role: 'system', content: '仅依据给定资料回答；资料不足时明确说明并建议转人工。每个结论后标注资料编号。' },
  { role: 'user', content: `资料：\n${context}\n\n问题：${question}` },
]
```

资料区要明确标注为「资料而非指令」——这是 [提示词与上下文工程](/ai-agent/04-prompt-and-context) 在 RAG 场景的落地点。

## 评估：别靠「感觉好像准了」

先造一个 20–50 条的人工标注评测集（问题、应命中的文档片段、标准答案要点），再分两层测：

| 层 | 指标 | 失败时该改哪里 |
|---|---|---|
| 检索 | Recall@K、MRR、命中率 | 分块、查询改写、混合检索、rerank、Embedding 模型 |
| 生成 | 忠实度（是否只依据资料）、引用准确率、答案完整度 | system prompt、上下文拼装、模型选择 |

**排查顺序很重要**：先看检索有没有把正确片段取回来。如果 Top-5 里根本没有答案，换再大的生成模型也没用。

## 向量库选型

| 方案 | 特点 | 适合 |
|---|---|---|
| pgvector / PostgreSQL | 与业务数据同库，事务与权限好做 | 已有 Postgres、中小型知识库、强权限需求 |
| Qdrant / Weaviate | 专用向量库，过滤与混合检索能力强 | 规模较大、检索能力要求高 |
| Pinecone | 全托管、省运维 | 不想管基础设施 |
| Chroma / LanceDB | 轻量、嵌入式 | 本地原型与实验 |

前端转型初期建议 **pgvector 或 SQLite 向量扩展**，把精力放在管线与评估上，而不是运维。

## 常见坑清单

| 现象 | 原因 | 对策 |
|---|---|---|
| 答案编造但语气笃定 | prompt 没给「拒绝」路径 | 明确要求「资料不足就说不知道」+ 引用编号 |
| 命中片段对但答案错 | 上下文里混入无关 chunk 干扰 | 减少 Top-K、加重排、按相关度排序拼装 |
| 表格/代码内容答不准 | 解析时被拍平成乱文本 | 结构化解析，表格转 Markdown 保留 |
| 文档更新后答案还是旧的 | 索引没增量更新 | 建立增量同步与删除机制，元数据带版本号 |
| 权限越界 | 检索时没做过滤 | 过滤前置到检索阶段，不在生成后补救 |
| 长文档问答成本高 | 每次塞太多 chunk | Top-K 控制、压缩、父子块 |

## 与 Agent 的结合

RAG 通常不是一个独立产品，而是 Agent 的一个**工具**：`search_docs(query)`。让模型自己决定「要不要查、查几次、要不要换关键词」，比强行每次都检索更省也更准。相关的循环设计见 [Agent 循环与编排](/ai-agent/08-agent-loop-and-orchestration)。

## 动手任务

1. 把本站 `content/` 下的 Markdown 按标题分块入库，保留 `path` 与 `title` 元数据。
2. 实现「向量检索 + 关键词检索」混合召回，对比纯向量的 Recall@5。
3. 写 20 条评测问题（含 3 条「资料里根本没有答案」的题），统计忠实度与拒答率。
4. 把检索封装成工具，接入 [工具调用](/ai-agent/05-tool-calling) 的 loop，让模型自主决定检索次数。

参考：[RAG 原始论文](https://arxiv.org/abs/2005.11401)、[LlamaIndex 文档](https://docs.llamaindex.ai/)、[Qdrant 文档](https://qdrant.tech/documentation/)、[pgvector](https://github.com/pgvector/pgvector)
