<script setup lang="ts">
interface BookmarkNode {
  id: string
  name: string
  type: 'url' | 'folder'
  url?: string
  path: string
  children?: BookmarkNode[]
  count?: number
}

interface FlatBookmark {
  name: string
  url: string
  path: string
}

const searchQuery = ref('')
const loading = ref(true)
const treeData = ref<BookmarkNode[]>([])
const flatBookmarks = ref<FlatBookmark[]>([])
const searchResults = ref<FlatBookmark[]>([])
const isSearchMode = ref(false)
const totalBookmarks = ref(0)
const selectedFolder = ref<BookmarkNode | null>(null)
const expandedFolders = ref<Set<string>>(new Set())
const sidebarCollapsed = ref(false)

// Build a flat list from the sidebar tree for rendering with indentation
const sidebarTreeItems = computed(() => {
  const items: Array<{ node: BookmarkNode; depth: number; isExpanded: boolean; hasChildren: boolean }> = []

  function walk(nodes: BookmarkNode[], depth: number) {
    for (const node of nodes) {
      if (node.type !== 'folder' || (node.count || 0) === 0) continue
      const childFolders = getFolderChildren(node)
      const isExpanded = expandedFolders.value.has(node.id)
      items.push({
        node,
        depth,
        isExpanded,
        hasChildren: childFolders.length > 0,
      })
      if (isExpanded) {
        walk(childFolders, depth + 1)
      }
    }
  }

  walk(topLevelFolders.value, 0)
  return items
})

// ---- Client-side parsing & search ----

function parseNode(node: any, parentPath: string): BookmarkNode | null {
  const currentPath = parentPath ? `${parentPath} / ${node.name}` : node.name
  if (node.type === 'url') {
    return { id: node.id, name: node.name, type: 'url', url: node.url, path: parentPath }
  }
  if (node.children || node.type === 'folder') {
    const children: BookmarkNode[] = []
    for (const child of (node.children || [])) {
      const parsed = parseNode(child, currentPath)
      if (parsed) children.push(parsed)
    }
    return { id: node.id, name: node.name, type: 'folder', path: currentPath, children, count: countUrls(node) }
  }
  return null
}

function countUrls(node: any): number {
  if (node.type === 'url') return 1
  if (!node.children) return 0
  return node.children.reduce((sum: number, c: any) => sum + countUrls(c), 0)
}

function flattenBookmarks(node: any, parentPath: string): FlatBookmark[] {
  const results: FlatBookmark[] = []
  if (node.type === 'url') {
    results.push({ name: node.name, url: node.url, path: parentPath })
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

// Debounced search (client-side)
let searchTimer: ReturnType<typeof setTimeout> | null = null

function doSearch(q: string) {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    if (!q.trim()) {
      isSearchMode.value = false
      return
    }
    const keyword = q.trim().toLowerCase()
    searchResults.value = flatBookmarks.value.filter(
      b => b.name.toLowerCase().includes(keyword) || b.url.toLowerCase().includes(keyword) || b.path.toLowerCase().includes(keyword)
    ).slice(0, 200)
    isSearchMode.value = true
  }, 300)
}

watch(searchQuery, (val) => doSearch(val))

async function fetchData() {
  loading.value = true
  try {
    const raw = await $fetch<any>('/bookmarks.json')
    const bookmarkBar = raw.roots?.bookmark_bar
    const tree: BookmarkNode[] = []
    const flat: FlatBookmark[] = []

    if (bookmarkBar?.children) {
      for (const child of bookmarkBar.children) {
        const parsed = parseNode(child, '')
        if (parsed) tree.push(parsed)
        flat.push(...flattenBookmarks(child, ''))
      }
    }

    treeData.value = tree
    flatBookmarks.value = flat
    totalBookmarks.value = flat.length
    isSearchMode.value = false
  } catch {
    treeData.value = []
  } finally {
    loading.value = false
  }
}

// Folder tree interaction
function toggleFolder(node: BookmarkNode) {
  const id = node.id
  if (expandedFolders.value.has(id)) {
    expandedFolders.value.delete(id)
  } else {
    expandedFolders.value.add(id)
  }
}

function selectFolder(node: BookmarkNode) {
  selectedFolder.value = node
  sidebarCollapsed.value = false
}

function getFolderChildren(node: BookmarkNode): BookmarkNode[] {
  return (node.children || []).filter(c => c.type === 'folder')
}

function getFolderUrls(node: BookmarkNode): BookmarkNode[] {
  return (node.children || []).filter(c => c.type === 'url')
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

// Top-level folders for sidebar
const topLevelFolders = computed(() => {
  return treeData.value.filter(n => n.type === 'folder' && (n.count || 0) > 0)
})

// Currently displayed bookmarks
const currentBookmarks = computed(() => {
  if (isSearchMode.value) return searchResults.value
  if (selectedFolder.value) return getFolderUrls(selectedFolder.value)
  // Default: show all top-level bookmarks (URLs at root)
  return treeData.value.filter(n => n.type === 'url')
})

// Breadcrumb for current folder
const breadcrumb = computed(() => {
  if (!selectedFolder.value) return []
  return selectedFolder.value.path.split(' / ').filter(Boolean)
})

function goBack() {
  if (!selectedFolder.value) return
  const pathParts = selectedFolder.value.path.split(' / ').filter(Boolean)
  if (pathParts.length <= 1) {
    selectedFolder.value = null
  } else {
    // Find parent folder
    const parentPath = pathParts.slice(0, -1).join(' / ')
    const parent = findFolderByPath(treeData.value, parentPath)
    if (parent) selectedFolder.value = parent
    else selectedFolder.value = null
  }
}

function findFolderByPath(nodes: BookmarkNode[], path: string): BookmarkNode | null {
  for (const node of nodes) {
    if (node.type === 'folder' && node.path === path) return node
    if (node.children) {
      const found = findFolderByPath(node.children, path)
      if (found) return found
    }
  }
  return null
}

function clearSearch() {
  searchQuery.value = ''
  isSearchMode.value = false
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="container page-container bookmarks-page">
    <div class="page-header">
      <h1>书签收藏</h1>
      <p>共 {{ totalBookmarks }} 个书签，分类整理便于查阅</p>
    </div>

    <!-- Search Bar -->
    <div class="bookmarks-search">
      <svg class="search-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="2"/>
        <path d="M13.5 13.5L17 17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <input
        v-model="searchQuery"
        type="text"
        class="bookmarks-search-input"
        placeholder="搜索书签名称、网址或路径..."
      />
      <button v-if="searchQuery" class="search-clear" @click="clearSearch">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    </div>

    <div class="bookmarks-layout" :class="{ 'sidebar-collapsed': sidebarCollapsed, 'no-sidebar': isSearchMode }">
      <!-- Sidebar -->
      <aside v-if="!isSearchMode" class="bookmarks-sidebar" :class="{ collapsed: sidebarCollapsed }">
        <button class="sidebar-toggle" @click="sidebarCollapsed = !sidebarCollapsed">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path v-if="!sidebarCollapsed" d="M10 4L6 8L10 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path v-else d="M6 4L10 8L6 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <div v-show="!sidebarCollapsed" class="sidebar-content">
          <h3 class="sidebar-title">分类目录</h3>
          <!-- All bookmarks root -->
          <div
            class="sidebar-item root-item"
            :class="{ active: !selectedFolder }"
            @click="selectedFolder = null"
          >
            <span class="expand-spacer"></span>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M3 7L10 2L17 7V16C17 16.5523 16.5523 17 16 17H4C3.44772 17 3 16.5523 3 16V7Z" stroke="currentColor" stroke-width="1.5"/>
              <path d="M8 17V11H12V17" stroke="currentColor" stroke-width="1.5"/>
            </svg>
            <span>全部书签</span>
          </div>

          <!-- Tree items with depth -->
          <div
            v-for="item in sidebarTreeItems"
            :key="item.node.id"
            class="sidebar-item"
            :class="{ active: selectedFolder?.id === item.node.id }"
            :style="{ paddingLeft: (0.75 + item.depth * 1.125) + 'rem' }"
            @click="selectFolder(item.node)"
          >
            <button
              v-if="item.hasChildren"
              class="expand-btn"
              :class="{ expanded: item.isExpanded }"
              @click.stop="toggleFolder(item.node)"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <span v-else class="expand-spacer"></span>
            <svg class="folder-icon" width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M2 5C2 3.89543 2.89543 3 4 3H8L10 5H16C17.1046 5 18 5.89543 18 7V15C18 16.1046 17.1046 17 16 17H4C2.89543 17 2 16.1046 2 15V5Z" stroke="currentColor" stroke-width="1.5"/>
            </svg>
            <span class="sidebar-label">{{ item.node.name }}</span>
            <span class="sidebar-count">{{ item.node.count }}</span>
          </div>
        </div>
      </aside>

      <!-- Main Content -->
      <div class="bookmarks-main">
        <!-- Breadcrumb -->
        <div v-if="selectedFolder && !isSearchMode" class="bookmarks-breadcrumb">
          <button class="back-link" @click="goBack">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 4L6 8L10 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            返回
          </button>
          <span class="breadcrumb-path">
            <span v-for="(part, i) in breadcrumb" :key="i" class="breadcrumb-segment">
              <span v-if="i > 0" class="breadcrumb-sep">/</span>
              {{ part }}
            </span>
          </span>
        </div>

        <!-- Search mode header -->
        <div v-if="isSearchMode" class="search-result-header">
          <span>搜索 "{{ searchQuery }}" 找到 <strong>{{ searchResults.length }}</strong> 个结果</span>
        </div>

        <!-- Sub-folders grid (when a folder is selected) -->
        <div v-if="selectedFolder && !isSearchMode && getFolderChildren(selectedFolder).length > 0" class="subfolder-grid">
          <div
            v-for="child in getFolderChildren(selectedFolder)"
            :key="child.id"
            class="subfolder-card"
            @click="selectFolder(child)"
          >
            <svg class="subfolder-icon" width="28" height="28" viewBox="0 0 20 20" fill="none">
              <path d="M2 5C2 3.89543 2.89543 3 4 3H8L10 5H16C17.1046 5 18 5.89543 18 7V15C18 16.1046 17.1046 17 16 17H4C2.89543 17 2 16.1046 2 15V5Z" stroke="currentColor" stroke-width="1.5"/>
            </svg>
            <span class="subfolder-name">{{ child.name }}</span>
            <span class="subfolder-count">{{ child.count }} 个</span>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="empty-state">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>

        <!-- Bookmarks grid -->
        <div v-else-if="currentBookmarks.length > 0" class="bookmark-grid">
          <a
            v-for="(bm, index) in currentBookmarks"
            :key="index"
            :href="bm.url || '#'"
            target="_blank"
            rel="noopener noreferrer"
            class="bookmark-card"
          >
            <img
              :src="getFaviconUrl(bm.url || '')"
              class="bookmark-favicon"
              width="20"
              height="20"
              alt=""
              loading="lazy"
              @error="($event.target as HTMLImageElement).style.display='none'"
            />
            <div class="bookmark-info">
              <span class="bookmark-name">{{ bm.name }}</span>
              <span class="bookmark-domain">{{ getDomain(bm.url || '') }}</span>
            </div>
          </a>
        </div>

        <!-- Empty -->
        <div v-else class="empty-state">
          <svg class="empty-icon-svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
            <path d="M8 12L24 4L40 12V28C40 36 32 42 24 44C16 42 8 36 8 28V12Z" stroke="currentColor" stroke-width="2.5"/>
            <path d="M18 24L22 28L30 20" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <p>{{ isSearchMode ? '未找到匹配的书签' : '该目录下暂无书签' }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
