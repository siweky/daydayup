<template>
  <a-alert :message="''" :style="{ 'border-color': color }">
    <template #description>
      <slot></slot>
    </template>
  </a-alert>
</template>

<script setup lang="ts">
const { color } = defineProps({
  color: {
    type: String,
    default: 'orange'
  }
})
</script>
