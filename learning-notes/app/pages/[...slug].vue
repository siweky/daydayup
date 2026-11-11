<script setup lang="ts">
const route = useRoute()
const router = useRouter()

// Determine which collection to query based on the path
const pathParts = computed(() => {
  const p = route.params.slug
  if (Array.isArray(p)) return p
  return p ? [p] : []
})

// 路径首段，用于面包屑与「返回列表」
const section = computed(() => pathParts.value[0] || '')

// 路径段 -> 内容集合键（ai-agent 目录对应 content.config.ts 中的 aiAgent）
const collectionKeyMap: Record<string, string> = {
  notes: 'notes',
  nuxt: 'nuxt',
  nitro: 'nitro',
  python: 'python',
  'ai-agent': 'aiAgent',
}

const collectionName = computed(() => collectionKeyMap[section.value] || '')

const fullPath = computed(() => '/' + pathParts.value.join('/'))

// Query the correct collection
const { data: page } = await useAsyncData(
  `page-${fullPath.value}`,
  async () => {
    const col = collectionName.value
    if (col) {
      return queryCollection(col as 'notes' | 'nuxt' | 'nitro' | 'python' | 'aiAgent')
        .path(fullPath.value)
        .first()
    }
    return null
  }
)

if (!page.value) {
  throw createError({
    statusCode: 404,
    statusMessage: '页面未找到',
    fatal: true,
  })
}

// Build breadcrumb
const breadcrumbs = computed(() => {
  const parts = pathParts.value
  const crumbs = [{ label: '首页', path: '/' }]

  const categoryLabels: Record<string, string> = {
    notes: '笔记',
    nuxt: 'Nuxt',
    nitro: 'Nitro',
    python: 'Python',
    'ai-agent': 'AI Agent',
    aiAgent: 'AI Agent',
  }

  if (parts.length > 0 && categoryLabels[parts[0]]) {
    crumbs.push({
      label: categoryLabels[parts[0]],
      path: `/${parts[0]}`,
    })
  }

  if (page.value?.title) {
    crumbs.push({
      label: page.value.title,
      path: fullPath.value,
    })
  }

  return crumbs
})

// Extract headings for TOC
const tocHeadings = computed(() => {
  if (!page.value?.body) return []
  const headings: Array<{ id: string; text: string; depth: number }> = []

  function walkTree(node: any) {
    if (!node) return
    if (Array.isArray(node)) {
      node.forEach(walkTree)
      return
    }
    if (typeof node === 'object') {
      if (node.tag && /^h[2-3]$/.test(node.tag)) {
        const text = extractText(node)
        const id = node.props?.id || slugify(text)
        headings.push({
          id,
          text,
          depth: parseInt(node.tag.charAt(1)),
        })
      }
      if (node.children) {
        walkTree(node.children)
      }
    }
  }

  function extractText(node: any): string {
    if (typeof node === 'string') return node
    if (Array.isArray(node)) return node.map(extractText).join('')
    if (node?.children) return extractText(node.children)
    return ''
  }

  function slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  walkTree(page.value.body)
  return headings
})

function goBack() {
  const col = section.value
  if (collectionKeyMap[col]) {
    router.push(`/${col}`)
  } else {
    router.push('/')
  }
}

function getCategoryLabel(col: string): string {
  const labels: Record<string, string> = {
    notes: '笔记',
    nuxt: 'Nuxt',
    nitro: 'Nitro',
    python: 'Python',
    'ai-agent': 'AI Agent',
    aiAgent: 'AI Agent',
  }
  return labels[col] || col
}
</script>

<template>
  <div class="container page-container">
    <ClientOnly>
      <div v-if="page">
        <!-- Breadcrumb -->
        <a-breadcrumb style="margin-bottom: 1rem">
          <a-breadcrumb-item v-for="(crumb, index) in breadcrumbs" :key="crumb.path">
            <NuxtLink v-if="index < breadcrumbs.length - 1" :to="crumb.path">
              {{ crumb.label }}
            </NuxtLink>
            <span v-else>{{ crumb.label }}</span>
          </a-breadcrumb-item>
        </a-breadcrumb>

        <!-- Article Header -->
        <div class="article-header">
          <div class="article-meta">
            <a-tag v-if="collectionName" color="blue">
              {{ getCategoryLabel(collectionName) }}
            </a-tag>
            <span v-if="page.date">{{ page.date }}</span>
          </div>
          <h1>{{ page.title }}</h1>
        </div>

        <!-- Article Layout -->
        <div class="article-layout">
          <div class="article-content">
            <ContentRenderer :value="page" />

            <a-button @click="goBack" style="margin-top: 2rem">
              <template #icon><ArrowLeftOutlined /></template>
              返回列表
            </a-button>
          </div>

          <!-- Table of Contents -->
          <aside v-if="tocHeadings.length > 0" class="toc-sidebar">
            <h4>目录</h4>
            <ul>
              <li v-for="heading in tocHeadings" :key="heading.id">
                <a
                  :href="`#${heading.id}`"
                  :class="{ 'depth-3': heading.depth === 3 }"
                >
                  {{ heading.text }}
                </a>
              </li>
            </ul>
          </aside>
        </div>
      </div>

      <template #fallback>
        <div class="empty-state"><div class="loading-spinner"></div><p>加载中...</p></div>
      </template>
    </ClientOnly>
  </div>
</template>
