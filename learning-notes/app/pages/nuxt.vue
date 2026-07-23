<script setup lang="ts">
const { data: articles } = await useAsyncData('nuxt-page', () =>
  queryCollection('nuxt').all()
)
</script>

<template>
  <div class="container page-container">
    <div class="page-header">
      <h1>Nuxt 学习文档</h1>
      <p>Nuxt 框架深入学习笔记与最佳实践</p>
    </div>

    <ClientOnly>
      <div v-if="articles && articles.length > 0" class="articles-grid">
        <ArticleCard
          v-for="article in articles"
          :key="article.path"
          :title="article.title || '无标题'"
          :description="article.description || article.seo?.description || ''"
          :path="article.path || '/'"
          category="nuxt"
          :date="article.date || ''"
        />
      </div>
      <a-empty v-else description="暂无文档，请在 content/nuxt 目录中添加 Markdown 文件" />
      <template #fallback>
        <div class="empty-state"><div class="loading-spinner"></div><p>加载中...</p></div>
      </template>
    </ClientOnly>
  </div>
</template>
