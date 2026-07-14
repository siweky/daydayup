---
title: "Vue 3 基础入门"
description: "Vue 3 核心概念学习笔记，涵盖 Composition API、响应式系统、计算属性、侦听器和生命周期钩子"
category: "notes"
date: "2026-07-01"
---

# Vue 3 基础入门

Vue 3 是 Vue.js 的最新主要版本，带来了全新的 Composition API、更好的 TypeScript 支持以及显著的性能提升。这篇笔记将系统梳理 Vue 3 的核心概念。

## Composition API vs Options API

### Options API（选项式 API）

Vue 2 的传统写法，通过选项对象来组织组件逻辑：

```javascript
export default {
  data() {
    return {
      count: 0,
      name: 'Vue'
    }
  },
  computed: {
    doubleCount() {
      return this.count * 2
    }
  },
  methods: {
    increment() {
      this.count++
    }
  },
  mounted() {
    console.log('组件已挂载')
  }
}
```

**优点**：结构清晰，适合简单组件。
**缺点**：当组件逻辑复杂时，相关的代码会被分散到不同选项中，难以维护和复用。

### Composition API（组合式 API）

Vue 3 引入的新写法，通过函数的方式来组织逻辑：

```vue
<script setup>
import { ref, computed, onMounted } from 'vue'

const count = ref(0)
const name = ref('Vue')

const doubleCount = computed(() => count.value * 2)

function increment() {
  count.value++
}

onMounted(() => {
  console.log('组件已挂载')
})
</script>
```

**优点**：逻辑可以按功能组织在一起，便于复用（通过组合函数 `composables`），TypeScript 支持更好。
**缺点**：对初学者来说概念稍多。

### 何时使用哪种 API？

- **小型项目 / 简单组件**：Options API 足够用
- **中大型项目 / 复杂组件**：推荐 Composition API
- **需要逻辑复用**：Composition API + Composables

## ref vs reactive

Vue 3 提供了两种创建响应式数据的方式：

### ref

`ref` 可以包裹任意类型的值，访问时需要通过 `.value`：

```javascript
import { ref } from 'vue'

// 基本类型
const count = ref(0)
console.log(count.value) // 0
count.value++

// 对象类型（内部会自动调用 reactive）
const user = ref({ name: '张三', age: 25 })
console.log(user.value.name) // '张三'
```

### reactive

`reactive` 只能用于对象类型（Object、Array、Map、Set），访问时不需要 `.value`：

```javascript
import { reactive } from 'vue'

const state = reactive({
  count: 0,
  name: 'Vue',
  items: [1, 2, 3]
})

console.log(state.count) // 0
state.count++

// 注意：不能直接替换整个 reactive 对象
// state = reactive({ count: 1 }) // 这不会触发响应式更新！
```

### 对比总结

| 特性 | `ref` | `reactive` |
|------|-------|------------|
| 适用类型 | 任意类型 | 仅对象类型 |
| 访问方式 | `.value` | 直接访问属性 |
| 解构保持响应 | 否（需 `toRefs`） | 否（需 `toRefs`） |
| 替换整个值 | 支持 | 不支持 |
| 推荐场景 | 基本类型、单一值 | 复杂对象、表单状态 |

### 最佳实践

```javascript
import { ref, reactive, toRefs } from 'vue'

// 推荐：简单值用 ref
const loading = ref(false)
const error = ref(null)

// 推荐：相关联的状态用 reactive
const form = reactive({
  username: '',
  password: '',
  remember: false
})

// 解构 reactive 时保持响应式
const { username, password } = toRefs(form)
```

## computed 计算属性

计算属性基于其依赖的响应式数据进行缓存，只在依赖变化时重新计算：

```javascript
import { ref, computed } from 'vue'

const firstName = ref('张')
const lastName = ref('三')

// 只读计算属性
const fullName = computed(() => firstName.value + lastName.value)

// 可写计算属性
const fullNameWritable = computed({
  get() {
    return firstName.value + lastName.value
  },
  set(newValue) {
    firstName.value = newValue[0]
    lastName.value = newValue.slice(1)
  }
})
```

### 计算属性 vs 方法

```javascript
// 计算属性 —— 有缓存，依赖不变则不重新计算
const reversed = computed(() => items.value.reverse())

// 方法 —— 每次渲染都会重新执行
function getReversed() {
  return items.value.reverse()
}
```

## watch 侦听器

侦听器用于在数据变化时执行副作用（如 API 请求、操作 DOM）：

```javascript
import { ref, watch, watchEffect } from 'vue'

const keyword = ref('')
const userId = ref(1)

// 侦听单个 ref
watch(keyword, (newValue, oldValue) => {
  console.log(`关键词从 "${oldValue}" 变为 "${newValue}"`)
})

// 侦听多个数据源
watch([keyword, userId], ([newKeyword, newUserId], [oldKeyword, oldUserId]) => {
  console.log('多个值变化了')
})

// 立即执行 + 深度侦听
watch(userId, (newId) => {
  fetchUserData(newId)
}, {
  immediate: true,   // 创建时立即执行一次
  deep: true          // 深度侦听对象内部变化
})

// watchEffect —— 自动追踪依赖
watchEffect(() => {
  console.log(`当前用户 ID: ${userId.value}`)
  // userId 会被自动追踪为依赖
})
```

### watch vs watchEffect

| 特性 | `watch` | `watchEffect` |
|------|---------|---------------|
| 指定侦听源 | 需要明确指定 | 自动追踪 |
| 获取旧值 | 支持 | 不支持 |
| 执行时机 | 惰性（变化时才执行） | 立即执行一次 |
| 适用场景 | 精确控制 | 简单的副作用 |

## 生命周期钩子

Vue 3 的 Composition API 中，生命周期钩子以 `on` 前缀的函数形式使用：

```javascript
import {
  onBeforeMount,
  onMounted,
  onBeforeUpdate,
  onUpdated,
  onBeforeUnmount,
  onUnmounted,
  onErrorCaptured
} from 'vue'

// 组件挂载前
onBeforeMount(() => {
  console.log('DOM 还未生成')
})

// 组件挂载后 —— 最常用，适合发起 API 请求、操作 DOM
onMounted(() => {
  console.log('组件已挂载，DOM 可用')
  fetchInitialData()
})

// 响应式数据变化导致组件更新前
onBeforeUpdate(() => {
  console.log('组件即将重新渲染')
})

// 组件更新后
onUpdated(() => {
  console.log('组件已重新渲染')
})

// 组件卸载前 —— 适合清理定时器、取消订阅
onBeforeUnmount(() => {
  clearInterval(timer)
  unsubscribe()
})

// 组件卸载后
onUnmounted(() => {
  console.log('组件已销毁')
})

// 捕获子孙组件的错误
onErrorCaptured((err, instance, info) => {
  console.error('捕获到子组件错误:', err)
  return false // 返回 false 阻止错误继续向上传播
})
```

### 生命周期图示

```
beforeCreate → created
    ↓
beforeMount → mounted        ← 组件进入页面
    ↓
beforeUpdate → updated       ← 数据变化触发重新渲染
    ↓
beforeUnmount → unmounted    ← 组件离开页面
```

## 模板语法

Vue 3 的模板语法在 Vue 2 的基础上增加了一些新特性：

### 文本插值与指令

```html
<!-- 文本插值 -->
<p>{{ message }}</p>

<!-- v-bind 绑定属性（可简写为 :） -->
<img :src="imageUrl" :alt="imageAlt" />
<a :href="url">链接</a>

<!-- v-on 绑定事件（可简写为 @） -->
<button @click="handleClick">点击</button>
<input @input="handleInput" @keyup.enter="submit" />

<!-- v-model 双向绑定 -->
<input v-model="username" placeholder="输入用户名" />
<select v-model="selected">
  <option value="a">选项 A</option>
  <option value="b">选项 B</option>
</select>
```

### 条件渲染与列表渲染

```html
<!-- v-if / v-else-if / v-else -->
<div v-if="status === 'loading'">加载中...</div>
<div v-else-if="status === 'error'">出错了！</div>
<div v-else>
  <p>{{ data }}</p>
</div>

<!-- v-show（通过 CSS display 控制显隐，不会销毁元素） -->
<p v-show="isVisible">这段文字可以切换显示/隐藏</p>

<!-- v-for 列表渲染 -->
<ul>
  <li v-for="(item, index) in items" :key="item.id">
    {{ index + 1 }}. {{ item.name }}
  </li>
</ul>
```

### Vue 3 新增：多根节点（Fragments）

Vue 3 允许模板有多个根节点，不再需要单个 `<div>` 包裹：

```html
<!-- Vue 3 支持 -->
<template>
  <header>头部</header>
  <main>主内容</main>
  <footer>底部</footer>
</template>
```

### Vue 3 新增：v-memo

```html
<!-- 缓存子树，只有依赖变化时才重新渲染 -->
<div v-memo="[selectedId === item.id]">
  <p>{{ item.name }}</p>
  <p>{{ item.description }}</p>
</div>
```

## 小结

Vue 3 的核心变化：

1. **Composition API** 让逻辑组织更灵活，便于复用
2. **ref 和 reactive** 提供了两种响应式数据的创建方式
3. **computed 和 watch** 处理派生状态和副作用
4. **生命周期钩子** 以 `on` 前缀函数的方式使用
5. **模板语法** 新增了 Fragments、v-memo 等特性

建议通过实际项目练习来加深对这些概念的理解。
