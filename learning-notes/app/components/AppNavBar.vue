<script setup lang="ts">
const { isDark, toggleTheme } = useTheme()

const mobileMenuOpen = ref(false)
const searchQuery = ref('')

const navLinks = [
  { label: '首页', to: '/' },
  { label: '笔记', to: '/notes' },
  { label: 'Nuxt', to: '/nuxt' },
  { label: 'Nitro', to: '/nitro' },
  { label: 'Python', to: '/python' },
  { label: '书签', to: '/bookmarks' },
  { label: '小工具', to: '/tools' },
  { label: '管理', to: '/manage' },
]

function closeMobile() {
  mobileMenuOpen.value = false
}

const route = useRoute()

watch(() => route.path, () => {
  closeMobile()
})
</script>

<template>
  <nav class="navbar">
    <div class="navbar-inner">
      <NuxtLink to="/" class="navbar-brand">
        <span class="logo-icon">📚</span>
        <span>学习笔记</span>
      </NuxtLink>

      <ul class="navbar-links">
        <li v-for="link in navLinks" :key="link.to">
          <NuxtLink :to="link.to">{{ link.label }}</NuxtLink>
        </li>
      </ul>

      <div class="navbar-actions">
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="搜索文章..."
        />
        <button class="theme-toggle" :title="isDark ? '切换亮色模式' : '切换暗色模式'" @click="toggleTheme">
          {{ isDark ? '☀️' : '🌙' }}
        </button>
        <button class="hamburger" @click="mobileMenuOpen = !mobileMenuOpen">
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </div>
  </nav>

  <div class="mobile-nav" :class="{ open: mobileMenuOpen }">
    <NuxtLink v-for="link in navLinks" :key="link.to" :to="link.to" @click="closeMobile">
      {{ link.label }}
    </NuxtLink>
  </div>
</template>
