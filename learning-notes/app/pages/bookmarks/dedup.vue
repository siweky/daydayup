<script setup lang="ts">
interface FlatBookmark {
  name: string
  url: string
  path: string
}

interface DuplicateGroup {
  url: string
  normalizedUrl: string
  entries: FlatBookmark[]
  count: number
}

const loading = ref(true)
const allBookmarks = ref<FlatBookmark[]>([])
const duplicateGroups = ref<DuplicateGroup[]>([])
const sortBy = ref<'count' | 'domain'>('count')
const rawData = ref<any>(null)
const cleanedCount = ref(0)
const exporting = ref(false)

// ── URL 标准化（去协议、www、尾部斜杠、常见追踪参数）──
function normalizeUrl(url: string): string {
  try {
    const u = new URL(url)
    let host = u.hostname.toLowerCase().replace(/^www\./, '')
    let path = u.pathname.replace(/\/+$/, '') || ''
    // 移除常见追踪参数
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ref', 'from', 'spm', 'scm']
    const params = new URLSearchParams(u.search)
    for (const p of trackingParams) params.delete(p)
    const qs = params.toString()
    return `${host}${path}${qs ? '?' + qs : ''}${u.hash}`
  } catch {
    return url.trim().toLowerCase()
  }
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url
  }
}

function getFaviconUrl(url: string): string {
  try {
    const u = new URL(url)
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=32`
  } catch {
    return ''
  }
}

// ── 统计 ──
const stats = computed(() => {
  const total = allBookmarks.value.length
  const unique = allBookmarks.value.length - duplicateGroups.value.reduce((s, g) => s + g.count - 1, 0)
  const groups = duplicateGroups.value.length
  const removable = duplicateGroups.value.reduce((s, g) => s + g.count - 1, 0)
  return { total, unique, groups, removable }
})

const sortedGroups = computed(() => {
  const list = [...duplicateGroups.value]
  if (sortBy.value === 'count') {
    list.sort((a, b) => b.count - a.count)
  } else {
    list.sort((a, b) => getDomain(a.url).localeCompare(getDomain(b.url)))
  }
  return list
})

// ── 数据加载 ──
function flattenBookmarks(node: any, parentPath: string): FlatBookmark[] {
  const results: FlatBookmark[] = []
  if (node.type === 'url') {
    results.push({ name: node.name, url: node.url, path: parentPath || '根目录' })
    return results
  }
  if (node.children) {
    const currentPath = parentPath ? `${parentPath} / ${node.name}` : node.name
    for (const child of node.children) {
      results.push(...flattenBookmarks(child, currentPath))
    }
  }
  return results
}

function findDuplicates(bookmarks: FlatBookmark[]): DuplicateGroup[] {
  const map = new Map<string, FlatBookmark[]>()
  for (const bm of bookmarks) {
    const key = normalizeUrl(bm.url)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(bm)
  }
  const groups: DuplicateGroup[] = []
  for (const [normalizedUrl, entries] of map) {
    if (entries.length > 1) {
      // 按路径排序，便于比较
      entries.sort((a, b) => a.path.localeCompare(b.path))
      groups.push({
        url: entries[0].url,
        normalizedUrl,
        entries,
        count: entries.length,
      })
    }
  }
  return groups.sort((a, b) => b.count - a.count)
}

// ── 去重树遍历 ──
function dedupNode(node: any, seen: Set<string>): any | null {
  if (node.type === 'url') {
    const key = normalizeUrl(node.url)
    if (seen.has(key)) return null
    seen.add(key)
    return { ...node }
  }
  if (node.children) {
    const children = node.children
      .map((c: any) => dedupNode(c, seen))
      .filter(Boolean)
    if (children.length === 0) return null
    return { ...node, children }
  }
  return { ...node }
}

function exportDeduped() {
  if (!rawData.value) return
  exporting.value = true
  try {
    const seen = new Set<string>()
    const deduped = JSON.parse(JSON.stringify(rawData.value))
    if (deduped.roots) {
      for (const key of Object.keys(deduped.roots)) {
        const root = deduped.roots[key]
        if (root?.children) {
          root.children = root.children
            .map((c: any) => dedupNode(c, seen))
            .filter(Boolean)
        }
      }
    }
    const json = JSON.stringify(deduped, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const now = new Date()
    const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
    a.download = `bookmarks_deduped_${ts}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } finally {
    exporting.value = false
  }
}

async function fetchData() {
  loading.value = true
  try {
    const raw = await $fetch<any>('/bookmarks.json')
    rawData.value = raw
    const bookmarkBar = raw.roots?.bookmark_bar
    const flat: FlatBookmark[] = []
    if (bookmarkBar?.children) {
      for (const child of bookmarkBar.children) {
        flat.push(...flattenBookmarks(child, ''))
      }
    }
    // 也处理 other 和 synced
    if (raw.roots?.other?.children) {
      for (const child of raw.roots.other.children) {
        flat.push(...flattenBookmarks(child, ''))
      }
    }
    allBookmarks.value = flat
    duplicateGroups.value = findDuplicates(flat)
    // 预计算去重后的数量
    const seen = new Set<string>()
    let kept = 0
    const countDeduped = (node: any) => {
      if (node.type === 'url') {
        const key = normalizeUrl(node.url)
        if (!seen.has(key)) { seen.add(key); kept++ }
        return
      }
      for (const c of (node.children || [])) countDeduped(c)
    }
    if (raw.roots) {
      for (const key of Object.keys(raw.roots)) {
        const root = raw.roots[key]
        if (root?.children) root.children.forEach((c: any) => countDeduped(c))
      }
    }
    cleanedCount.value = kept
  } catch {
    allBookmarks.value = []
    duplicateGroups.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="container page-container dedup-page">
    <div class="page-header">
      <div class="header-row">
        <div>
          <h1>书签查重</h1>
          <p>分析所有书签的 URL 地址，查找可合并的重复项</p>
        </div>
        <NuxtLink to="/bookmarks" class="back-to-bookmarks">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 4L6 8L10 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          返回书签
        </NuxtLink>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="empty-state">
      <div class="loading-spinner"></div>
      <p>正在分析书签数据...</p>
    </div>

    <template v-else>
      <!-- Stats cards -->
      <div class="dedup-stats">
        <div class="stat-card">
          <span class="stat-value">{{ stats.total }}</span>
          <span class="stat-label">总书签数</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ stats.unique }}</span>
          <span class="stat-label">不重复</span>
        </div>
        <div class="stat-card highlight">
          <span class="stat-value">{{ stats.groups }}</span>
          <span class="stat-label">重复组</span>
        </div>
        <div class="stat-card warn">
          <span class="stat-value">{{ stats.removable }}</span>
          <span class="stat-label">可清理</span>
        </div>
      </div>

      <!-- Action bar -->
      <div class="dedup-action-bar">
        <button class="export-btn" :disabled="exporting" @click="exportDeduped">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <path d="M3 14V16C3 16.5523 3.44772 17 4 17H16C16.5523 17 17 16.5523 17 16V14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M10 3V13M10 13L6 9M10 13L14 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span v-if="exporting">正在生成...</span>
          <span v-else>导出去重书签<template v-if="stats.removable > 0">（{{ stats.total }} → {{ cleanedCount }}）</template></span>
        </button>
      </div>

      <!-- Sort controls -->
      <div v-if="duplicateGroups.length > 0" class="dedup-controls">
        <span class="control-label">排序方式</span>
        <button class="sort-btn" :class="{ active: sortBy === 'count' }" @click="sortBy = 'count'">按数量</button>
        <button class="sort-btn" :class="{ active: sortBy === 'domain' }" @click="sortBy = 'domain'">按域名</button>
      </div>

      <!-- Duplicate groups -->
      <div v-if="sortedGroups.length > 0" class="dedup-groups">
        <div v-for="(group, gi) in sortedGroups" :key="gi" class="dup-group">
          <div class="dup-header">
            <img
              :src="getFaviconUrl(group.url)"
              class="dup-favicon"
              width="20" height="20"
              alt=""
              loading="lazy"
              @error="($event.target as HTMLImageElement).style.display='none'"
            />
            <div class="dup-url-wrap">
              <a :href="group.url" target="_blank" rel="noopener noreferrer" class="dup-url">{{ group.url }}</a>
              <span class="dup-domain">{{ getDomain(group.url) }}</span>
            </div>
            <span class="dup-badge">{{ group.count }} 处</span>
          </div>
          <div class="dup-entries">
            <div v-for="(entry, ei) in group.entries" :key="ei" class="dup-entry">
              <svg class="path-icon" width="14" height="14" viewBox="0 0 20 20" fill="none">
                <path d="M2 5C2 3.89543 2.89543 3 4 3H8L10 5H16C17.1046 5 18 5.89543 18 7V15C18 16.1046 17.1046 17 16 17H4C2.89543 17 2 16.1046 2 15V5Z" stroke="currentColor" stroke-width="1.5"/>
              </svg>
              <span class="dup-entry-name">{{ entry.name }}</span>
              <span class="dup-entry-path">{{ entry.path }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- No duplicates -->
      <div v-else class="empty-state">
        <svg class="empty-icon-svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
          <path d="M18 24L22 28L30 20" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="24" cy="24" r="16" stroke="currentColor" stroke-width="2.5"/>
        </svg>
        <p>没有找到重复的书签，数据很干净</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.dedup-page { padding-bottom: 3rem; }

.header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.back-to-bookmarks {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.85rem;
  font-size: 0.875rem;
  color: var(--text-secondary, #666);
  background: var(--bg-secondary, #f5f5f5);
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 6px;
  text-decoration: none;
  transition: all 0.2s;
  white-space: nowrap;
  margin-top: 0.3rem;
}
.back-to-bookmarks:hover {
  color: var(--primary, #1677ff);
  border-color: var(--primary, #1677ff);
}

/* Stats */
.dedup-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.stat-card {
  background: var(--bg-secondary, #f8f9fa);
  border: 1px solid var(--border-color, #e8e8e8);
  border-radius: 10px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}
.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary, #1a1a1a);
  line-height: 1;
}
.stat-label {
  font-size: 0.8rem;
  color: var(--text-secondary, #888);
}
.stat-card.highlight .stat-value { color: #fa8c16; }
.stat-card.warn .stat-value { color: #f5222d; }

/* Action bar */
.dedup-action-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}
.export-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.55rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #fff;
  background: var(--primary, #1677ff);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 3px rgba(22, 119, 255, 0.2);
}
.export-btn:hover:not(:disabled) {
  background: #4096ff;
  box-shadow: 0 3px 8px rgba(22, 119, 255, 0.3);
  transform: translateY(-1px);
}
.export-btn:active:not(:disabled) {
  transform: translateY(0);
}
.export-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Controls */
.dedup-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.control-label {
  font-size: 0.8rem;
  color: var(--text-secondary, #888);
  margin-right: 0.25rem;
}
.sort-btn {
  padding: 0.3rem 0.75rem;
  font-size: 0.8rem;
  border: 1px solid var(--border-color, #d9d9d9);
  border-radius: 4px;
  background: transparent;
  color: var(--text-secondary, #666);
  cursor: pointer;
  transition: all 0.2s;
}
.sort-btn:hover { border-color: var(--primary, #1677ff); color: var(--primary, #1677ff); }
.sort-btn.active {
  background: var(--primary, #1677ff);
  border-color: var(--primary, #1677ff);
  color: #fff;
}

/* Duplicate groups */
.dedup-groups {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.dup-group {
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-color, #e8e8e8);
  border-radius: 10px;
  overflow: hidden;
  transition: box-shadow 0.2s;
}
.dup-group:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.dup-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1.125rem;
  border-bottom: 1px solid var(--border-color, #f0f0f0);
}
.dup-favicon {
  flex-shrink: 0;
  border-radius: 3px;
}
.dup-url-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.dup-url {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--primary, #1677ff);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dup-url:hover { text-decoration: underline; }
.dup-domain {
  font-size: 0.75rem;
  color: var(--text-secondary, #999);
}
.dup-badge {
  flex-shrink: 0;
  padding: 0.2rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #fa8c16;
  background: #fff7e6;
  border: 1px solid #ffe58f;
  border-radius: 12px;
}

/* Entries (paths) */
.dup-entries {
  padding: 0.5rem 1.125rem 0.625rem;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}
.dup-entry {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  padding: 0.3rem 0;
}
.path-icon {
  flex-shrink: 0;
  color: var(--text-secondary, #bbb);
}
.dup-entry-name {
  font-weight: 500;
  color: var(--text-primary, #333);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}
.dup-entry-path {
  color: var(--text-secondary, #999);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .dedup-stats { grid-template-columns: repeat(2, 1fr); }
  .header-row { flex-direction: column; gap: 0.75rem; }
  .dup-entry-name { max-width: 120px; }
}
</style>
