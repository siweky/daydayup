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
      <ClientOnly>
        <!-- Statistics -->
        <div class="stats-grid">
          <div class="stat-card stat-notes">
            <span class="stat-number">{{ notesCount }}</span>
            <span class="stat-label">个人笔记</span>
          </div>
          <div class="stat-card stat-nuxt">
            <span class="stat-number">{{ nuxtCount }}</span>
            <span class="stat-label">Nuxt 文档</span>
          </div>
          <div class="stat-card stat-nitro">
            <span class="stat-number">{{ nitroCount }}</span>
            <span class="stat-label">Nitro 文档</span>
          </div>
          <div class="stat-card stat-python">
            <span class="stat-number">{{ pythonCount }}</span>
            <span class="stat-label">Python 文档</span>
          </div>
        </div>

        <!-- Category Cards -->
        <h2 class="section-title">分类浏览</h2>
        <div class="category-grid">
          <NuxtLink to="/notes" class="category-card cat-notes">
            <div class="cat-icon">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
            <div class="cat-info">
              <h3>个人笔记</h3>
              <p>日常学习笔记与心得体会</p>
            </div>
            <svg class="cat-arrow" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </NuxtLink>
          <NuxtLink to="/nuxt" class="category-card cat-nuxt">
            <div class="cat-icon">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="12 2 2 22 22 22"/>
              </svg>
            </div>
            <div class="cat-info">
              <h3>Nuxt 学习文档</h3>
              <p>Nuxt 框架深入学习笔记</p>
            </div>
            <svg class="cat-arrow" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </NuxtLink>
          <NuxtLink to="/nitro" class="category-card cat-nitro">
            <div class="cat-icon">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>
            <div class="cat-info">
              <h3>Nitro 学习文档</h3>
              <p>Nitro 服务端引擎学习笔记</p>
            </div>
            <svg class="cat-arrow" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </NuxtLink>
          <NuxtLink to="/python" class="category-card cat-python">
            <div class="cat-icon">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
              </svg>
            </div>
            <div class="cat-info">
              <h3>Python 学习文档</h3>
              <p>Python 编程语言学习笔记</p>
            </div>
            <svg class="cat-arrow" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
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
        <a-empty v-else description="暂无文章，请先添加 Markdown 内容到 content 目录" />

        <template #fallback>
          <div class="stats-grid">
            <div class="stat-card"><span class="stat-number">-</span><span class="stat-label">加载中...</span></div>
          </div>
        </template>
      </ClientOnly>
    </div>
  </div>
</template>
