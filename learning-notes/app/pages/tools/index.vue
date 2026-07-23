<script setup lang="ts">
const tools = [
  {
    name: '图表 Playground',
    description: '可视化配置图表样式，实时预览并导出为 PNG',
    to: '/tools/chart-playground',
    icon: 'chart',
  },
]
</script>

<template>
  <div class="container page-container tools-page">
    <ClientOnly>
      <div class="page-header">
        <h1>小工具</h1>
        <p>实用工具集合，持续更新中</p>
      </div>

      <div class="tools-grid">
        <NuxtLink v-for="tool in tools" :key="tool.to" :to="tool.to" class="tool-card">
          <div class="tool-icon-wrap">
            <BarChartOutlined v-if="tool.icon === 'chart'" style="font-size: 28px" />
          </div>
          <div class="tool-info">
            <h3>{{ tool.name }}</h3>
            <p>{{ tool.description }}</p>
          </div>
          <svg class="tool-arrow" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M7 5L12 10L7 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </NuxtLink>
      </div>

      <template #fallback>
        <div class="page-header">
          <h1>小工具</h1>
          <p>加载中...</p>
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<style scoped>
.tools-page { padding-bottom: 3rem; }

.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1rem;
}

.tool-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-color, #e8e8e8);
  border-radius: 12px;
  text-decoration: none;
  color: inherit;
  transition: all 0.25s;
}
.tool-card:hover {
  border-color: var(--primary, #1677ff);
  box-shadow: 0 4px 12px rgba(22, 119, 255, 0.08);
  transform: translateY(-2px);
}

.tool-icon-wrap {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(22, 119, 255, 0.06);
  border-radius: 12px;
  color: var(--primary, #1677ff);
}

.tool-info {
  flex: 1;
  min-width: 0;
}
.tool-info h3 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.25rem;
  color: var(--text-primary, #1a1a1a);
}
.tool-info p {
  font-size: 0.8rem;
  color: var(--text-secondary, #888);
  margin: 0;
  line-height: 1.4;
}

.tool-arrow {
  flex-shrink: 0;
  color: var(--text-secondary, #ccc);
  transition: all 0.2s;
}
.tool-card:hover .tool-arrow {
  color: var(--primary, #1677ff);
  transform: translateX(3px);
}
</style>
