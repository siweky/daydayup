<script setup lang="ts">
</script>

<template>
  <div class="app-wrapper">
    <ClientOnly>
      <ParticleBackground />
    </ClientOnly>
    <AppNavBar />
    <main class="main-content">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>

<style scoped>
.app-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  position: relative;
  z-index: 1;
}

.main-content {
  flex: 1;
}
</style>
