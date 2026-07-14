<script setup lang="ts">
const { data: notesArticles } = await useAsyncData('notes-list', () =>
  queryCollection('notes').all()
)

const { data: nuxtArticles } = await useAsyncData('nuxt-list', () =>
  queryCollection('nuxt').all()
)

const { data: nitroArticles } = await useAsyncData('nitro-list', () =>
  queryCollection('nitro').all()
)

const { data: pythonArticles } = await useAsyncData('python-list', () =>
  queryCollection('python').all()
)

const notesCount = computed(() => notesArticles.value?.length ?? 0)
const nuxtCount = computed(() => nuxtArticles.value?.length ?? 0)
const nitroCount = computed(() => nitroArticles.value?.length ?? 0)
const pythonCount = computed(() => pythonArticles.value?.length ?? 0)
const totalCount = computed(() => notesCount.value + nuxtCount.value + nitroCount.value + pythonCount.value)

const allArticles = computed(() => {
  const all = [
    ...(notesArticles.value || []).map(a => ({ ...a, category: 'notes' })),
    ...(nuxtArticles.value || []).map(a => ({ ...a, category: 'nuxt' })),
    ...(nitroArticles.value || []).map(a => ({ ...a, category: 'nitro' })),
    ...(pythonArticles.value || []).map(a => ({ ...a, category: 'python' })),
  ]
  return all
    .sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0
      const dateB = b.date ? new Date(b.date).getTime() : 0
      return dateB - dateA
    })
    .slice(0, 6)
})

function getArticlePath(article: any): string {
  return article.path || '/'
}

function getArticleDescription(article: any): string {
  return article.description || article.seo?.description || ''
}

function getArticleDate(article: any): string {
  return article.date || ''
}
</script>

<template>
  <div>
    <!-- Hero Section -->
    <section class="hero">
      <div class="container hero-content">
        <h1>我的学习空间</h1>
        <p class="subtitle">记录学习旅程，分享技术笔记 — Nuxt、Nitro、Python 与更多</p>
      </div>
    </section>

    <div class="container page-container">
      <!-- Statistics -->
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-number">{{ notesCount }}</span>
          <span class="stat-label">个人笔记</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">{{ nuxtCount }}</span>
          <span class="stat-label">Nuxt 文档</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">{{ nitroCount }}</span>
          <span class="stat-label">Nitro 文档</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">{{ pythonCount }}</span>
          <span class="stat-label">Python 文档</span>
        </div>
      </div>

      <!-- Category Cards -->
      <h2 class="section-title">分类浏览</h2>
      <div class="category-grid">
        <NuxtLink to="/notes" class="category-card">
          <div class="category-icon">📝</div>
          <h3>个人笔记</h3>
          <p>日常学习笔记与心得体会</p>
        </NuxtLink>
        <NuxtLink to="/nuxt" class="category-card">
          <div class="category-icon">💚</div>
          <h3>Nuxt 学习文档</h3>
          <p>Nuxt 框架深入学习笔记</p>
        </NuxtLink>
        <NuxtLink to="/nitro" class="category-card">
          <div class="category-icon">⚡</div>
          <h3>Nitro 学习文档</h3>
          <p>Nitro 服务端引擎学习笔记</p>
        </NuxtLink>
        <NuxtLink to="/python" class="category-card">
          <div class="category-icon">🐍</div>
          <h3>Python 学习文档</h3>
          <p>Python 编程语言学习笔记</p>
        </NuxtLink>
      </div>

      <!-- Recent Articles -->
      <h2 class="section-title">最近更新</h2>
      <div v-if="allArticles.length > 0" class="articles-grid">
        <ArticleCard
          v-for="article in allArticles"
          :key="article.path"
          :title="article.title || '无标题'"
          :description="getArticleDescription(article)"
          :path="getArticlePath(article)"
          :category="article.category"
          :date="getArticleDate(article)"
        />
      </div>
      <div v-else class="empty-state">
        <div class="empty-icon">📄</div>
        <p>暂无文章，请先添加 Markdown 内容到 content 目录</p>
      </div>
    </div>
  </div>
</template>
