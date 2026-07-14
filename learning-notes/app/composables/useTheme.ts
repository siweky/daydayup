export function useTheme() {
  const theme = useCookie<'light' | 'dark'>('theme', {
    default: () => 'light',
    watch: true,
  })

  const isDark = computed(() => theme.value === 'dark')

  function applyTheme(value: 'light' | 'dark') {
    if (import.meta.client) {
      const html = document.documentElement
      if (value === 'dark') {
        html.classList.add('dark')
      } else {
        html.classList.remove('dark')
      }
    }
  }

  function toggleTheme() {
    theme.value = isDark.value ? 'light' : 'dark'
    applyTheme(theme.value)
  }

  function initTheme() {
    if (import.meta.client) {
      const stored = theme.value
      if (stored) {
        applyTheme(stored)
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        theme.value = prefersDark ? 'dark' : 'light'
        applyTheme(theme.value)
      }
    }
  }

  return {
    theme: readonly(theme),
    isDark,
    toggleTheme,
    initTheme,
  }
}
