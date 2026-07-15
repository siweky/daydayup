<script setup lang="ts">
interface FileItem {
  name: string
  category: string
  path: string
}

interface PendingFile {
  file: File
  name: string
  size: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  message?: string
}

const selectedCategory = ref('notes')
const selectOpen = ref(false)
const pendingFiles = ref<PendingFile[]>([])
const uploading = ref(false)
const uploadStatus = ref<{ type: 'success' | 'error'; message: string } | null>(null)
const fileList = ref<FileItem[]>([])
const loading = ref(false)
const isDragOver = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

const categories = [
  { value: 'notes', label: '个人笔记' },
  { value: 'nuxt', label: 'Nuxt 文档' },
  { value: 'nitro', label: 'Nitro 文档' },
  { value: 'python', label: 'Python 文档' },
]

const selectedCategoryLabel = computed(() => {
  const found = categories.find(c => c.value === selectedCategory.value)
  return found?.label || selectedCategory.value
})

const pendingCount = computed(() => pendingFiles.value.filter(f => f.status === 'pending').length)
const allUploaded = computed(() => pendingFiles.value.length > 0 && pendingFiles.value.every(f => f.status === 'success'))

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// ---- File handling ----

function addFiles(files: FileList | File[]) {
  const validExts = ['.md', '.markdown']
  for (const file of Array.from(files)) {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
    if (!validExts.includes(ext)) continue
    // Skip duplicates
    if (pendingFiles.value.some(f => f.name === file.name && f.status === 'pending')) continue
    pendingFiles.value.push({
      file,
      name: file.name,
      size: file.size,
      status: 'pending',
    })
  }
  uploadStatus.value = null
}

function removePendingFile(index: number) {
  pendingFiles.value.splice(index, 1)
}

function clearPendingFiles() {
  pendingFiles.value = []
}

function onFileInputChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files?.length) {
    addFiles(target.files)
    target.value = '' // reset so same file can be re-selected
  }
}

// ---- Drag and drop ----

function onDragEnter(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = true
}

function onDragLeave(e: DragEvent) {
  e.preventDefault()
  // Only set false if we're actually leaving the drop zone
  const relatedTarget = e.relatedTarget as HTMLElement | null
  if (!relatedTarget || !(e.currentTarget as HTMLElement).contains(relatedTarget)) {
    isDragOver.value = false
  }
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = false
  if (e.dataTransfer?.files?.length) {
    addFiles(e.dataTransfer.files)
  }
}

// ---- Upload ----

async function uploadAllFiles() {
  const toUpload = pendingFiles.value.filter(f => f.status === 'pending')
  if (toUpload.length === 0) return

  uploading.value = true
  uploadStatus.value = null
  let successCount = 0
  let errorCount = 0

  for (const item of toUpload) {
    item.status = 'uploading'
    try {
      const formData = new FormData()
      formData.append('file', item.file)
      formData.append('category', selectedCategory.value)

      await $fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      item.status = 'success'
      successCount++
    } catch (e: any) {
      item.status = 'error'
      item.message = e?.data?.message || '上传失败'
      errorCount++
    }
  }

  uploading.value = false

  if (errorCount === 0) {
    uploadStatus.value = { type: 'success', message: `成功上传 ${successCount} 个文件` }
  } else {
    uploadStatus.value = {
      type: 'error',
      message: `上传完成：${successCount} 个成功，${errorCount} 个失败`,
    }
  }

  await fetchFiles()
}

// ---- Server file list ----

async function fetchFiles() {
  loading.value = true
  try {
    const data = await $fetch<{ files: FileItem[] }>('/api/files')
    fileList.value = data.files || []
  } catch {
    fileList.value = []
  } finally {
    loading.value = false
  }
}

async function deleteFile(filePath: string) {
  if (!confirm('确定要删除此文件吗？')) return

  try {
    await $fetch('/api/files/delete', {
      method: 'POST',
      body: { path: filePath },
    })
    uploadStatus.value = { type: 'success', message: '文件已删除' }
    await fetchFiles()
  } catch (e: any) {
    uploadStatus.value = {
      type: 'error',
      message: e?.data?.message || '删除失败，请重试',
    }
  }
}

function getCategoryLabel(cat: string): string {
  const found = categories.find(c => c.value === cat)
  return found?.label || cat
}

function getCategoryIcon(cat: string): string {
  const icons: Record<string, string> = {
    notes: '📝',
    nuxt: '💚',
    nitro: '⚡',
    python: '🐍',
  }
  return icons[cat] || '📄'
}

onMounted(() => {
  fetchFiles()
})
</script>

<template>
  <div class="container page-container">
    <div class="page-header">
      <h1>文档管理</h1>
      <p>上传和管理 Markdown 文档</p>
    </div>

    <!-- Upload Section -->
    <div class="manage-section">
      <h2>上传文档</h2>

      <!-- Category Select -->
      <div class="form-group">
        <label>选择分类</label>
        <div class="custom-select" :class="{ open: selectOpen }">
          <select
            v-model="selectedCategory"
            @focus="selectOpen = true"
            @blur="selectOpen = false"
            @change="selectOpen = false"
          >
            <option v-for="cat in categories" :key="cat.value" :value="cat.value">
              {{ cat.label }}
            </option>
          </select>
          <span class="select-arrow">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        </div>
      </div>

      <!-- Drag & Drop Zone -->
      <div class="form-group">
        <label>选择 Markdown 文件</label>
        <div
          class="upload-dropzone"
          :class="{ 'drag-over': isDragOver, 'has-files': pendingFiles.length > 0 }"
          @dragenter="onDragEnter"
          @dragleave="onDragLeave"
          @dragover="onDragOver"
          @drop="onDrop"
          @click="fileInputRef?.click()"
        >
          <input
            ref="fileInputRef"
            type="file"
            accept=".md,.markdown"
            multiple
            hidden
            @change="onFileInputChange"
          />
          <div class="dropzone-content">
            <div class="dropzone-icon">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <path d="M24 32V16M24 16L18 22M24 16L30 22" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M8 32V36C8 38.2091 9.79086 40 12 40H36C38.2091 40 40 38.2091 40 36V32" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <p class="dropzone-text">
              <span class="dropzone-link">点击选择</span>或将文件拖拽到此区域
            </p>
            <p class="dropzone-hint">支持 .md、.markdown 格式，可同时选择多个文件</p>
          </div>
        </div>
      </div>

      <!-- Pending Files List -->
      <div v-if="pendingFiles.length > 0" class="pending-files">
        <div class="pending-header">
          <span class="pending-title">待上传文件 ({{ pendingFiles.length }})</span>
          <button class="pending-clear" @click="clearPendingFiles">清空列表</button>
        </div>
        <ul class="pending-list">
          <li v-for="(item, index) in pendingFiles" :key="item.name + index" class="pending-item" :class="item.status">
            <div class="pending-icon">
              <svg v-if="item.status === 'pending'" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="3" y="2" width="14" height="16" rx="2" stroke="currentColor" stroke-width="1.5"/>
                <path d="M7 7H13M7 10H13M7 13H10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              <svg v-else-if="item.status === 'uploading'" class="spin-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="2" stroke-dasharray="22 22" stroke-linecap="round"/>
              </svg>
              <svg v-else-if="item.status === 'success'" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.5"/>
                <path d="M6.5 10.5L8.5 12.5L13.5 7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <svg v-else width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.5"/>
                <path d="M7.5 7.5L12.5 12.5M12.5 7.5L7.5 12.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </div>
            <div class="pending-info">
              <span class="pending-name">{{ item.name }}</span>
              <span class="pending-meta">
                {{ formatFileSize(item.size) }}
                <template v-if="item.status === 'error'"> — {{ item.message }}</template>
                <template v-else-if="item.status === 'uploading'"> — 上传中...</template>
                <template v-else-if="item.status === 'success'"> — 已上传</template>
              </span>
            </div>
            <button
              v-if="item.status === 'pending'"
              class="pending-remove"
              title="移除"
              @click.stop="removePendingFile(index)"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
          </li>
        </ul>
      </div>

      <!-- Upload Button -->
      <button
        class="btn btn-primary upload-btn"
        :disabled="uploading || pendingCount === 0"
        @click="uploadAllFiles"
      >
        <svg v-if="uploading" class="spin-icon" width="18" height="18" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="2" stroke-dasharray="22 22" stroke-linecap="round"/>
        </svg>
        <svg v-else width="18" height="18" viewBox="0 0 20 20" fill="none">
          <path d="M10 14V4M10 4L6 8M10 4L14 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M3 14V16C3 16.5523 3.44772 17 4 17H16C16.5523 17 17 16.5523 17 16V14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        {{ uploading ? '上传中...' : pendingCount > 0 ? `上传 ${pendingCount} 个文件` : '上传文件' }}
      </button>

      <!-- Status -->
      <div
        v-if="uploadStatus"
        class="upload-status"
        :class="uploadStatus.type"
      >
        {{ uploadStatus.message }}
      </div>
    </div>

    <!-- File List Section -->
    <div class="manage-section">
      <h2>已上传文件</h2>
      <div v-if="loading" class="empty-state">
        <p>加载中...</p>
      </div>
      <ul v-else-if="fileList.length > 0" class="file-list">
        <li v-for="file in fileList" :key="file.path" class="file-item">
          <div class="file-info">
            <div class="file-icon">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <rect x="3" y="2" width="14" height="16" rx="2" stroke="currentColor" stroke-width="1.5"/>
                <path d="M7 7H13M7 10H13M7 13H10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </div>
            <div class="file-detail">
              <span class="file-name">{{ file.name }}</span>
              <span class="file-category">{{ getCategoryIcon(file.category) }} {{ getCategoryLabel(file.category) }}</span>
            </div>
          </div>
          <button class="btn btn-danger" @click="deleteFile(file.path)">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M2 4H14M5.33 4V2.67C5.33 2.31 5.33 2.14 5.4 2C5.46 1.89 5.55 1.79 5.67 1.73 5.8 1.67 5.97 1.67 6.33 1.67H9.67C10.03 1.67 10.2 1.67 10.33 1.73C10.45 1.79 10.54 1.89 10.6 2C10.67 2.14 10.67 2.31 10.67 2.67V4M12.67 4V13.33C12.67 13.83 12.67 14.08 12.57 14.27C12.49 14.44 12.36 14.57 12.19 14.65C12 14.75 11.75 14.75 11.25 14.75H4.75C4.25 14.75 4 14.75 3.81 14.65C3.64 14.57 3.51 14.44 3.43 14.27C3.33 14.08 3.33 13.83 3.33 13.33V4H12.67Z" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            删除
          </button>
        </li>
      </ul>
      <div v-else class="empty-state">
        <div class="empty-icon">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect x="8" y="6" width="32" height="36" rx="4" stroke="currentColor" stroke-width="2.5"/>
            <path d="M16 16H32M16 22H32M16 28H24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
        </div>
        <p>暂无已上传的文件</p>
      </div>
    </div>
  </div>
</template>
