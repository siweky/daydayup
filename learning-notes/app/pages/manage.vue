<script setup lang="ts">
interface FileItem {
  name: string
  category: string
  path: string
}

const selectedCategory = ref('notes')
const selectedFile = ref<File | null>(null)
const uploading = ref(false)
const uploadStatus = ref<{ type: 'success' | 'error'; message: string } | null>(null)
const fileList = ref<FileItem[]>([])
const loading = ref(false)

const categories = [
  { value: 'notes', label: '个人笔记' },
  { value: 'nuxt', label: 'Nuxt 文档' },
  { value: 'nitro', label: 'Nitro 文档' },
]

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

async function uploadFile() {
  if (!selectedFile.value) {
    uploadStatus.value = { type: 'error', message: '请选择一个文件' }
    return
  }

  uploading.value = true
  uploadStatus.value = null

  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)
    formData.append('category', selectedCategory.value)

    await $fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })

    uploadStatus.value = { type: 'success', message: '文件上传成功！' }
    selectedFile.value = null
    await fetchFiles()
  } catch (e: any) {
    uploadStatus.value = {
      type: 'error',
      message: e?.data?.message || '上传失败，请重试',
    }
  } finally {
    uploading.value = false
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

function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  selectedFile.value = target.files?.[0] || null
}

function getCategoryLabel(cat: string): string {
  const found = categories.find(c => c.value === cat)
  return found?.label || cat
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
      <div class="form-group">
        <label for="category-select">选择分类</label>
        <select id="category-select" v-model="selectedCategory">
          <option v-for="cat in categories" :key="cat.value" :value="cat.value">
            {{ cat.label }}
          </option>
        </select>
      </div>
      <div class="form-group">
        <label for="file-input">选择 Markdown 文件</label>
        <input
          id="file-input"
          type="file"
          accept=".md,.markdown"
          @change="onFileChange"
        />
      </div>
      <button class="btn btn-primary" :disabled="uploading || !selectedFile" @click="uploadFile">
        {{ uploading ? '上传中...' : '上传文件' }}
      </button>

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
            <span class="file-name">{{ file.name }}</span>
            <span class="file-category">{{ getCategoryLabel(file.category) }}</span>
          </div>
          <button class="btn btn-danger" @click="deleteFile(file.path)">
            删除
          </button>
        </li>
      </ul>
      <div v-else class="empty-state">
        <div class="empty-icon">📁</div>
        <p>暂无已上传的文件</p>
      </div>
    </div>
  </div>
</template>
