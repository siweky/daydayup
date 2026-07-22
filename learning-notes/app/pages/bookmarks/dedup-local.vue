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

const allBookmarks = ref<FlatBookmark[]>([])
const duplicateGroups = ref<DuplicateGroup[]>([])
const sortBy = ref<'count' | 'domain'>('count')
const rawData = ref<any>(null)
const cleanedCount = ref(0)
const exporting = ref(false)
const fileName = ref('')
const fileSize = ref(0)
const hasData = ref(false)
const dragOver = ref(false)
const parseError = ref('')

const fileInputRef = ref<HTMLInputElement | null>(null)

// ── URL 标准化 ──
function normalizeUrl(url: string): string {
  try {
    const u = new URL(url)
    let host = u.hostname.toLowerCase().replace(/^www\./, '')
    let path = u.pathname.replace(/\/+$/, '') || ''
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
  try { return new URL(url).hostname.replace('www.', '') } catch { return url }
}

function getFaviconUrl(url: string): string {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32` } catch { return '' }
}

// ── 统计 ──
const stats = computed(() => {
  const total = allBookmarks.value.length
  const groups = duplicateGroups.value.length
  const removable = duplicateGroups.value.reduce((s, g) => s + g.count - 1, 0)
  return { total, unique: total - removable, groups, removable }
})

const sortedGroups = computed(() => {
  const list = [...duplicateGroups.value]
  if (sortBy.value === 'count') list.sort((a, b) => b.count - a.count)
  else list.sort((a, b) => getDomain(a.url).localeCompare(getDomain(b.url)))
  return list
})

// ── 数据解析 ──
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
      entries.sort((a, b) => a.path.localeCompare(b.path))
      groups.push({ url: entries[0].url, normalizedUrl, entries, count: entries.length })
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
    const children = node.children.map((c: any) => dedupNode(c, seen)).filter(Boolean)
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
          root.children = root.children.map((c: any) => dedupNode(c, seen)).filter(Boolean)
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

// ── 文件处理 ──
function processFile(file: File) {
  parseError.value = ''
  fileName.value = file.name
  fileSize.value = file.size

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const raw = JSON.parse(e.target?.result as string)
      if (!raw.roots) {
        parseError.value = 'JSON 格式不正确：缺少 roots 字段，请确认是 Chrome 书签导出文件'
        return
      }
      rawData.value = raw
      const flat: FlatBookmark[] = []
      for (const key of Object.keys(raw.roots)) {
        const root = raw.roots[key]
        if (root?.children) {
          for (const child of root.children) {
            flat.push(...flattenBookmarks(child, ''))
          }
        }
      }
      allBookmarks.value = flat
      duplicateGroups.value = findDuplicates(flat)
      // 预计算去重数量
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
      for (const key of Object.keys(raw.roots)) {
        const root = raw.roots[key]
        if (root?.children) root.children.forEach((c: any) => countDeduped(c))
      }
      cleanedCount.value = kept
      hasData.value = true
    } catch {
      parseError.value = 'JSON 解析失败，请确认文件格式是否为有效的 Chrome 书签 JSON'
    }
  }
  reader.readAsText(file)
}

function onFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files?.[0]) processFile(input.files[0])
}

function onDrop(e: DragEvent) {
  dragOver.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) processFile(file)
}

function resetData() {
  rawData.value = null
  allBookmarks.value = []
  duplicateGroups.value = []
  cleanedCount.value = 0
  hasData.value = false
  fileName.value = ''
  fileSize.value = 0
  parseError.value = ''
  if (fileInputRef.value) fileInputRef.value.value = ''
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
</script>

<template>
  <div class="container page-container dedup-page">
    <div class="page-header">
      <div class="header-row">
        <div>
          <h1>本地书签查重</h1>
          <p>上传本地 Chrome 书签 JSON 文件，在线分析重复项并导出去重版本</p>
        </div>
        <div class="header-actions">
          <NuxtLink to="/bookmarks/dedup" class="back-to-bookmarks">在线查重</NuxtLink>
          <NuxtLink to="/bookmarks" class="back-to-bookmarks">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 4L6 8L10 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            返回书签
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Upload area -->
    <div
      v-if="!hasData"
      class="upload-zone"
      :class="{ 'drag-over': dragOver, 'has-error': parseError }"
      @dragover.prevent="dragOver = true"
      @dragleave="dragOver = false"
      @drop.prevent="onDrop"
      @click="fileInputRef?.click()"
    >
      <input ref="fileInputRef" type="file" accept=".json" hidden @change="onFileSelect" />
      <svg class="upload-icon" width="48" height="48" viewBox="0 0 48 48" fill="none">
        <path d="M24 32V12M24 12L16 20M24 12L32 20" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M8 32V38C8 39.1046 8.89543 40 10 40H38C39.1046 40 40 39.1046 40 38V32" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <p class="upload-title">拖拽书签文件到此处，或点击选择</p>
      <p class="upload-hint">支持 Chrome 书签 JSON 格式（通常为 Bookmarks 文件）</p>
      <p v-if="parseError" class="upload-error">{{ parseError }}</p>
    </div>

    <!-- Analysis results -->
    <template v-else>
      <!-- File info bar -->
      <div class="file-info-bar">
        <div class="file-meta">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <path d="M4 4C4 2.89543 4.89543 2 6 2H12L16 6V16C16 17.1046 15.1046 18 14 18H6C4.89543 18 4 17.1046 4 16V4Z" stroke="currentColor" stroke-width="1.5"/>
            <path d="M12 2V6H16" stroke="currentColor" stroke-width="1.5"/>
          </svg>
          <span class="file-name">{{ fileName }}</span>
          <span class="file-size">{{ formatSize(fileSize) }}</span>
        </div>
        <button class="re-upload-btn" @click="resetData">重新上传</button>
      </div>

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
              class="dup-favicon" width="20" height="20" alt="" loading="lazy"
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
.header-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
  margin-top: 0.3rem;
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
}
.back-to-bookmarks:hover {
  color: var(--primary, #1677ff);
  border-color: var(--primary, #1677ff);
}

/* Upload zone */
.upload-zone {
  border: 2px dashed var(--border-color, #d9d9d9);
  border-radius: 12px;
  padding: 3.5rem 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.25s;
  background: var(--bg-secondary, #fafafa);
  margin-bottom: 1.5rem;
}
.upload-zone:hover,
.upload-zone.drag-over {
  border-color: var(--primary, #1677ff);
  background: rgba(22, 119, 255, 0.03);
}
.upload-zone.has-error {
  border-color: #f5222d;
}
.upload-icon {
  color: var(--text-secondary, #bbb);
  margin-bottom: 1rem;
}
.upload-zone:hover .upload-icon,
.upload-zone.drag-over .upload-icon {
  color: var(--primary, #1677ff);
}
.upload-title {
  font-size: 1rem;
  font-weight: 500;
  color: var(--text-primary, #333);
  margin: 0 0 0.5rem;
}
.upload-hint {
  font-size: 0.8rem;
  color: var(--text-secondary, #999);
  margin: 0;
}
.upload-error {
  margin: 1rem 0 0;
  font-size: 0.85rem;
  color: #f5222d;
  font-weight: 500;
}

/* File info bar */
.file-info-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 1rem;
  background: var(--bg-secondary, #f6f8fa);
  border: 1px solid var(--border-color, #e8e8e8);
  border-radius: 8px;
  margin-bottom: 1.25rem;
}
.file-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--text-secondary, #666);
}
.file-name {
  font-weight: 500;
  color: var(--text-primary, #333);
}
.file-size {
  color: var(--text-secondary, #999);
  font-size: 0.75rem;
}
.re-upload-btn {
  padding: 0.3rem 0.75rem;
  font-size: 0.8rem;
  border: 1px solid var(--border-color, #d9d9d9);
  border-radius: 4px;
  background: transparent;
  color: var(--text-secondary, #666);
  cursor: pointer;
  transition: all 0.2s;
}
.re-upload-btn:hover {
  border-color: var(--primary, #1677ff);
  color: var(--primary, #1677ff);
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
.stat-label { font-size: 0.8rem; color: var(--text-secondary, #888); }
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
.export-btn:active:not(:disabled) { transform: translateY(0); }
.export-btn:disabled { opacity: 0.6; cursor: not-allowed; }

/* Controls */
.dedup-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.control-label { font-size: 0.8rem; color: var(--text-secondary, #888); margin-right: 0.25rem; }
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
.sort-btn.active { background: var(--primary, #1677ff); border-color: var(--primary, #1677ff); color: #fff; }

/* Duplicate groups */
.dedup-groups { display: flex; flex-direction: column; gap: 0.75rem; }
.dup-group {
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-color, #e8e8e8);
  border-radius: 10px;
  overflow: hidden;
  transition: box-shadow 0.2s;
}
.dup-group:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.dup-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1.125rem;
  border-bottom: 1px solid var(--border-color, #f0f0f0);
}
.dup-favicon { flex-shrink: 0; border-radius: 3px; }
.dup-url-wrap { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.15rem; }
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
.dup-domain { font-size: 0.75rem; color: var(--text-secondary, #999); }
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
.dup-entries { padding: 0.5rem 1.125rem 0.625rem; display: flex; flex-direction: column; gap: 0.375rem; }
.dup-entry { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; padding: 0.3rem 0; }
.path-icon { flex-shrink: 0; color: var(--text-secondary, #bbb); }
.dup-entry-name {
  font-weight: 500; color: var(--text-primary, #333);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;
}
.dup-entry-path {
  color: var(--text-secondary, #999);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

@media (max-width: 640px) {
  .dedup-stats { grid-template-columns: repeat(2, 1fr); }
  .header-row { flex-direction: column; gap: 0.75rem; }
  .header-actions { flex-wrap: wrap; }
  .dup-entry-name { max-width: 120px; }
}
</style>
