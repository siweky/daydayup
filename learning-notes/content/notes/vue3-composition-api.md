---
title: 'Vue 3 组合式 API 学习笔记'
description: '深入理解 Vue 3 Composition API 的核心概念与用法'
date: '2024-12-01'
---

# Vue 3 组合式 API 学习笔记

## 什么是组合式 API

组合式 API（Composition API）是 Vue 3 引入的一组新的 API，它允许我们使用函数的方式来组织组件逻辑。

与选项式 API 相比，组合式 API 有以下优势：

- **更好的逻辑复用**：通过组合函数（composables）复用逻辑
- **更灵活的代码组织**：可以按功能而非选项来组织代码
- **更好的类型推导**：对 TypeScript 更友好

## 核心概念

### ref 与 reactive

```ts
import { ref, reactive } from 'vue'

// ref 适用于基本类型
const count = ref(0)
count.value++

// reactive 适用于对象
const state = reactive({
  name: '张三',
  age: 25
})
```

### computed 计算属性

```ts
import { ref, computed } from 'vue'

const price = ref(100)
const quantity = ref(3)
const total = computed(() => price.value * quantity.value)
```

### watch 侦听器

```ts
import { ref, watch } from 'vue'

const keyword = ref('')

watch(keyword, (newVal, oldVal) => {
  console.log(`关键词从 ${oldVal} 变为 ${newVal}`)
})
```

## 总结

组合式 API 让 Vue 3 的代码组织更加灵活，特别是在处理复杂组件时，能够将相关逻辑集中在一起，提高代码的可维护性。
