<script setup lang="ts">
const { data: articles } = await useAsyncData('ai-agent-page', () =>
  queryCollection('aiAgent').all()
)

// 文件名以 01~12 开头，按 path 排序即可得到路线顺序
const sortedArticles = computed(() =>
  [...(articles.value || [])].sort((a, b) =>
    String(a.path || '').localeCompare(String(b.path || ''))
  )
)

// 模块首页直接给出学习路线，点击阶段可跳到对应文章
const phases = [
  {
    no: '01',
    title: '建立体感',
    period: '第 1–2 周',
    goal: '搞懂 LLM 怎么被调用：Token、上下文、消息角色、流式输出与结构化结果',
    links: [
      { label: '学习路线总览', to: '/ai-agent/01-roadmap' },
      { label: 'LLM 基础', to: '/ai-agent/03-llm-fundamentals' },
    ],
  },
  {
    no: '02',
    title: '让模型能做事',
    period: '第 3–6 周',
    goal: '提示词与上下文工程、Function Calling 工具循环、MCP 工具生态',
    links: [
      { label: '提示词与上下文', to: '/ai-agent/04-prompt-and-context' },
      { label: '工具调用', to: '/ai-agent/05-tool-calling' },
      { label: 'MCP 协议', to: '/ai-agent/06-mcp' },
    ],
  },
  {
    no: '03',
    title: '有知识、有章法',
    period: '第 7–10 周',
    goal: 'RAG 检索增强、Agent 循环与编排、记忆分层与框架选型',
    links: [
      { label: 'RAG', to: '/ai-agent/07-rag' },
      { label: '编排与记忆', to: '/ai-agent/08-agent-loop-and-orchestration' },
      { label: '框架选型', to: '/ai-agent/09-frameworks' },
    ],
  },
  {
    no: '04',
    title: '前端主场 + 生产化',
    period: '第 11–14 周',
    goal: '流式交互与 Agent UI、评估与可观测性、成本/安全/容错',
    links: [
      { label: '前端集成', to: '/ai-agent/10-frontend-integration' },
      { label: '生产化', to: '/ai-agent/11-production-engineering' },
    ],
  },
  {
    no: '05',
    title: '作品与求职',
    period: '持续',
    goal: '完成 4 个递进实战项目，形成公开作品集与可量化的项目描述',
    links: [
      { label: '技能地图', to: '/ai-agent/02-skills-map' },
      { label: '项目与资源', to: '/ai-agent/12-projects-and-resources' },
    ],
  },
]

const skillGroups = [
  {
    tag: '直接复用',
    desc: 'TypeScript / async 与 Stream / SSE / Vue 状态管理 / Node BFF / 工程化与性能意识',
    tone: 'reuse',
  },
  {
    tag: '重点补齐',
    desc: 'LLM API 与上下文预算 / 工具 Schema 设计 / 向量检索 / Agent 编排 / 评估与 Tracing',
    tone: 'learn',
  },
  {
    tag: '暂缓深入',
    desc: 'Transformer 底层推导 / 模型训练与微调 / 分布式推理 —— 应用开发阶段用不上',
    tone: 'defer',
  },
]
</script>

<template>
  <div class="container page-container">
    <div class="page-header">
      <h1>AI Agent 学习模块</h1>
      <p>面向前端工程师的转型路线：从「调用大模型」到「交付可上线的智能体」</p>
    </div>

    <ClientOnly>
      <!-- 学习路线 -->
      <section class="roadmap-block">
        <h2 class="section-title">学习路线</h2>
        <div class="phase-list">
          <div v-for="phase in phases" :key="phase.no" class="phase-card">
            <div class="phase-head">
              <span class="phase-no">{{ phase.no }}</span>
              <div>
                <h3>{{ phase.title }}</h3>
                <span class="phase-period">{{ phase.period }}</span>
              </div>
            </div>
            <p class="phase-goal">{{ phase.goal }}</p>
            <div class="phase-links">
              <NuxtLink v-for="link in phase.links" :key="link.to" :to="link.to">
                {{ link.label }}
              </NuxtLink>
            </div>
          </div>
        </div>
      </section>

      <!-- 必要技能速览 -->
      <section class="skills-block">
        <h2 class="section-title">必要技能速览</h2>
        <div class="skills-grid">
          <div v-for="group in skillGroups" :key="group.tag" class="skill-card" :class="'tone-' + group.tone">
            <span class="skill-tag">{{ group.tag }}</span>
            <p>{{ group.desc }}</p>
          </div>
        </div>
        <p class="skills-hint">
          完整技能矩阵与优先级见 <NuxtLink to="/ai-agent/02-skills-map">《必要技能地图》</NuxtLink>，
          阶段目标与验收标准见 <NuxtLink to="/ai-agent/01-roadmap">《学习路线总览》</NuxtLink>。
        </p>
      </section>

      <!-- 全部文档 -->
      <h2 class="section-title">全部文档（按路线顺序）</h2>
      <div v-if="sortedArticles.length > 0" class="articles-grid">
        <ArticleCard
          v-for="article in sortedArticles"
          :key="article.path"
          :title="article.title || '无标题'"
          :description="article.description || article.seo?.description || ''"
          :path="article.path || '/'"
          category="ai-agent"
          :date="article.date || ''"
        />
      </div>
      <a-empty v-else description="暂无文档，请在 content/ai-agent 目录中添加 Markdown 文件" />

      <template #fallback>
        <div class="empty-state"><div class="loading-spinner"></div><p>加载中...</p></div>
      </template>
    </ClientOnly>
  </div>
</template>

<style scoped>
.roadmap-block,
.skills-block {
  margin-bottom: 0.5rem;
}

.phase-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.phase-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-left: 3px solid var(--accent);
  border-radius: var(--radius-md);
  padding: 1.125rem 1.25rem;
  box-shadow: var(--shadow-sm);
  transition: all var(--transition);
}

.phase-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.phase-head {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.phase-no {
  font-size: 1.5rem;
  font-weight: 800;
  line-height: 1;
  color: var(--accent);
  opacity: 0.75;
}

.phase-head h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
}

.phase-period {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.phase-goal {
  margin: 0.75rem 0;
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--text-secondary);
}

.phase-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.phase-links a {
  font-size: 0.75rem;
  padding: 0.2rem 0.55rem;
  border-radius: var(--radius-sm);
  background: var(--accent-light);
  color: var(--accent);
  text-decoration: none;
  border: 1px solid var(--border);
}

.phase-links a:hover {
  border-color: var(--accent);
}

.skills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
}

.skill-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 1rem 1.125rem;
}

.skill-card p {
  margin: 0.5rem 0 0;
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--text-secondary);
}

.skill-tag {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-sm);
}

.tone-reuse .skill-tag { background: rgba(5, 150, 105, 0.12); color: #059669; }
.tone-learn .skill-tag { background: rgba(79, 70, 229, 0.12); color: var(--accent); }
.tone-defer .skill-tag { background: rgba(156, 163, 175, 0.15); color: var(--text-muted); }

.skills-hint {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin: 0.75rem 0 0;
}

.skills-hint a {
  color: var(--accent);
}

@media (max-width: 640px) {
  .phase-list,
  .skills-grid {
    grid-template-columns: 1fr;
  }
}
</style>
