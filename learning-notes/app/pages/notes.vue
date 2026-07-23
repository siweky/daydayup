<script setup lang="ts">
const { data: articles } = await useAsyncData('notes-page', () =>
  queryCollection('notes').all()
)
</script>

<template>
  <div class="container page-container">
    <div class="page-header">
      <h1>个人笔记</h1>
      <p>日常学习笔记与心得体会</p>
    </div>

    <ClientOnly>
      <div v-if="articles && articles.length > 0" class="articles-grid">
        <ArticleCard
          v-for="article in articles"
          :key="article.path"
          :title="article.title || '无标题'"
          :description="article.description || article.seo?.description || ''"
          :path="article.path || '/'"
          category="notes"
          :date="article.date || ''"
        />
      </div>
      <a-empty v-else description="暂无笔记，请在 content/notes 目录中添加 Markdown 文件" />
      <template #fallback>
        <div class="empty-state"><div class="loading-spinner"></div><p>加载中...</p></div>
      </template>
    </ClientOnly>
  </div>
</template>
