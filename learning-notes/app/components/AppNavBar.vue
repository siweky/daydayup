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
        <svg class="logo-svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          <line x1="8" y1="7" x2="16" y2="7"/>
          <line x1="8" y1="11" x2="14" y2="11"/>
        </svg>
        <span>学习笔记</span>
      </NuxtLink>

      <ul class="navbar-links">
        <li v-for="link in navLinks" :key="link.to">
          <NuxtLink :to="link.to">{{ link.label }}</NuxtLink>
        </li>
      </ul>

      <div class="navbar-actions">
        <div class="nav-search">
          <svg class="search-icon-svg" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            class="search-input"
            placeholder="搜索文章..."
          />
        </div>
        <button class="theme-toggle" :title="isDark ? '切换亮色模式' : '切换暗色模式'" @click="toggleTheme">
          <svg v-if="isDark" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
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
