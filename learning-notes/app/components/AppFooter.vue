<script setup lang="ts">
const currentYear = new Date().getFullYear()
</script>

<template>
  <footer class="app-footer">
    <div class="footer-inner">
      <p>Powered by <a href="https://nuxt.com" target="_blank" rel="noopener">Nuxt</a> & <a href="https://nitro.unjs.io" target="_blank" rel="noopener">Nitro</a></p>
      <p>&copy; {{ currentYear }} 学习笔记 &middot; <a href="https://github.com" target="_blank" rel="noopener">GitHub</a></p>
    </div>
  </footer>
</template>
