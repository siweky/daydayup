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
const pendingFiles = ref<PendingFile[]>([])
const uploading = ref(false)
const uploadStatus = ref<{ type: 'success' | 'error'; message: string } | null>(null)
const fileList = ref<FileItem[]>([])
const loading = ref(false)

const categories = [
  { value: 'notes', label: '个人笔记' },
  { value: 'nuxt', label: 'Nuxt 文档' },
  { value: 'nitro', label: 'Nitro 文档' },
  { value: 'python', label: 'Python 文档' },
]

const pendingCount = computed(() => pendingFiles.value.filter(f => f.status === 'pending').length)

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

function beforeUpload(file: File) {
  addFiles([file])
  return false
}

function removePendingFile(index: number) {
  pendingFiles.value.splice(index, 1)
}

function clearPendingFiles() {
  pendingFiles.value = []
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

const pendingUploadList = computed(() =>
  pendingFiles.value.map((f, i) => ({
    uid: String(i),
    name: f.name,
    status: f.status === 'pending' ? 'done' : f.status === 'uploading' ? 'uploading' : f.status,
  }))
)

onMounted(() => {
  fetchFiles()
})
</script>

<template>
  <div class="container page-container">
    <ClientOnly>
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
          <a-select
            v-model:value="selectedCategory"
            :options="categories"
            size="large"
            style="width: 240px"
          />
        </div>

        <!-- Drag & Drop Zone -->
        <div class="form-group">
          <label>选择 Markdown 文件</label>
          <a-upload-dragger
            :multiple="true"
            accept=".md,.markdown"
            :before-upload="beforeUpload"
            :show-upload-list="false"
          >
            <p class="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p class="ant-upload-text">点击或将文件拖拽到此区域上传</p>
            <p class="ant-upload-hint">支持 .md、.markdown 格式，可同时选择多个文件</p>
          </a-upload-dragger>
        </div>

        <!-- Pending Files List -->
        <div v-if="pendingFiles.length > 0" class="pending-files">
          <div class="pending-header">
            <span class="pending-title">待上传文件 ({{ pendingFiles.length }})</span>
            <a-button type="link" size="small" danger @click="clearPendingFiles">清空列表</a-button>
          </div>
          <a-list :data-source="pendingFiles" size="small">
            <template #renderItem="{ item, index }">
              <a-list-item class="pending-list-item" :class="item.status">
                <template #actions>
                  <a-button
                    v-if="item.status === 'pending'"
                    type="text"
                    size="small"
                    danger
                    @click="removePendingFile(index)"
                  >
                    <template #icon><CloseCircleOutlined /></template>
                  </a-button>
                </template>
                <a-list-item-meta>
                  <template #avatar>
                    <CheckCircleOutlined v-if="item.status === 'success'" style="color: #52c41a; font-size: 20px" />
                    <CloseCircleOutlined v-else-if="item.status === 'error'" style="color: #ff4d4f; font-size: 20px" />
                    <LoadingOutlined v-else-if="item.status === 'uploading'" style="color: #1677ff; font-size: 20px" spin />
                    <FileOutlined v-else style="color: #999; font-size: 20px" />
                  </template>
                  <template #title>{{ item.name }}</template>
                  <template #description>
                    {{ formatFileSize(item.size) }}
                    <template v-if="item.status === 'error'"> — {{ item.message }}</template>
                    <template v-else-if="item.status === 'uploading'"> — 上传中...</template>
                    <template v-else-if="item.status === 'success'"> — 已上传</template>
                  </template>
                </a-list-item-meta>
              </a-list-item>
            </template>
          </a-list>
        </div>

        <!-- Upload Button -->
        <a-button
          type="primary"
          size="large"
          :loading="uploading"
          :disabled="pendingCount === 0"
          class="upload-btn"
          @click="uploadAllFiles"
        >
          <template #icon><UploadOutlined /></template>
          {{ uploading ? '上传中...' : pendingCount > 0 ? `上传 ${pendingCount} 个文件` : '上传文件' }}
        </a-button>

        <!-- Status -->
        <a-alert
          v-if="uploadStatus"
          :type="uploadStatus.type"
          :message="uploadStatus.message"
          show-icon
          closable
          style="margin-top: 1rem"
          @close="uploadStatus = null"
        />
      </div>

      <!-- File List Section -->
      <div class="manage-section">
        <h2>已上传文件</h2>
        <a-spin :spinning="loading">
          <a-list v-if="fileList.length > 0" :data-source="fileList" item-layout="horizontal">
            <template #renderItem="{ item }">
              <a-list-item>
                <template #actions>
                  <a-popconfirm
                    title="确定要删除此文件吗？"
                    ok-text="删除"
                    cancel-text="取消"
                    ok-type="danger"
                    @confirm="deleteFile(item.path)"
                  >
                    <a-button type="text" danger size="small">
                      <template #icon><DeleteOutlined /></template>
                      删除
                    </a-button>
                  </a-popconfirm>
                </template>
                <a-list-item-meta :description="`${getCategoryIcon(item.category)} ${getCategoryLabel(item.category)}`">
                  <template #title>{{ item.name }}</template>
                  <template #avatar>
                    <FileOutlined style="font-size: 24px; color: #999" />
                  </template>
                </a-list-item-meta>
              </a-list-item>
            </template>
          </a-list>
          <a-empty v-else description="暂无已上传的文件" />
        </a-spin>
      </div>

      <template #fallback>
        <div class="page-header">
          <h1>文档管理</h1>
          <p>上传和管理 Markdown 文档</p>
        </div>
        <div class="empty-state">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<style scoped>
.manage-section {
  margin-bottom: 2rem;
}
.manage-section h2 {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--text-primary, #1a1a1a);
}
.form-group {
  margin-bottom: 1.25rem;
}
.form-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary, #666);
  margin-bottom: 0.5rem;
}
.pending-files {
  margin-bottom: 1.25rem;
  border: 1px solid var(--border, #e8e8e8);
  border-radius: 8px;
  overflow: hidden;
}
.pending-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: var(--bg-secondary, #fafafa);
  border-bottom: 1px solid var(--border, #e8e8e8);
}
.pending-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary, #333);
}
.pending-list-item.error {
  background: rgba(255, 77, 79, 0.04);
}
.pending-list-item.success {
  background: rgba(82, 196, 26, 0.04);
}
.upload-btn {
  margin-top: 0.5rem;
}
</style>
