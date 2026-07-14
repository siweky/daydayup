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
    <div v-else class="empty-state">
      <div class="empty-icon">📝</div>
      <p>暂无笔记，请在 content/notes 目录中添加 Markdown 文件</p>
    </div>
  </div>
</template>
