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
    <div v-else class="empty-state">
      <div class="empty-icon">💚</div>
      <p>暂无文档，请在 content/nuxt 目录中添加 Markdown 文件</p>
    </div>
  </div>
</template>
