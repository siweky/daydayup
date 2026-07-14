<script setup lang="ts">
interface Props {
  title: string
  description?: string
  path: string
  category?: string
  date?: string
}

const props = withDefaults(defineProps<Props>(), {
  description: '',
  category: '',
  date: '',
})

const router = useRouter()

function navigate() {
  router.push(props.path)
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function getCategoryLabel(cat: string): string {
  const labels: Record<string, string> = {
    notes: '笔记',
    nuxt: 'Nuxt',
    nitro: 'Nitro',
  }
  return labels[cat] || cat
}
</script>

<template>
  <div class="article-card" @click="navigate">
    <div class="article-card-body">
      <span v-if="category" class="card-category">{{ getCategoryLabel(category) }}</span>
      <h3>{{ title }}</h3>
      <p v-if="description" class="card-description">{{ description }}</p>
      <div class="card-meta">
        <span v-if="date">{{ formatDate(date) }}</span>
        <span>阅读更多 &rarr;</span>
      </div>
    </div>
  </div>
</template>
