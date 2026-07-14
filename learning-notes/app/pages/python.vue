<script setup lang="ts">
const { data: articles } = await useAsyncData('python-page', () =>
  queryCollection('python').all()
)
</script>

<template>
  <div class="container page-container">
    <div class="page-header">
      <h1>Python 学习文档</h1>
      <p>Python 编程语言学习笔记与实战总结</p>
    </div>

    <div v-if="articles && articles.length > 0" class="articles-grid">
      <ArticleCard
        v-for="article in articles"
        :key="article.path"
        :title="article.title || '无标题'"
        :description="article.description || article.seo?.description || ''"
        :path="article.path || '/'"
        category="python"
        :date="article.date || ''"
      />
    </div>
    <div v-else class="empty-state">
      <div class="empty-icon">🐍</div>
      <p>暂无文档，请在 content/python 目录中添加 Markdown 文件</p>
    </div>
  </div>
</template>
