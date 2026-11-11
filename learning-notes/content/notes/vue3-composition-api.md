---
title: "Vue 3 Composables 与组件设计实战"
description: "组合式函数契约、异步竞态与资源清理、依赖注入类型安全、响应式性能与组件接口设计"
category: "notes"
date: "2026-11-11"
---

> `ref`、`computed`、`watch` 的基础用法见 [Vue 3 基础入门](/notes/vue3-basics)。这一篇讲「怎么把逻辑组织成可复用、可测试、不出竞态 bug 的代码」。

## 一、Composable 不是「把代码搬进函数」

一个可靠的 composable 有四条契约：

| 契约 | 说明 |
|---|---|
| 输入可响应 | 参数支持 `Ref` / getter / 普通值，内部用 `toValue()` 统一 |
| 输出可控 | 状态用 `readonly()` 暴露，只通过返回的函数修改 |
| 自清理 | 定时器、事件监听、请求订阅在作用域销毁时自动释放 |
| 无隐藏全局状态 | 每次调用独立；确实要共享时用模块级单例并显式命名 |

反例（调用方改了 state 却没人知道，且 watch 永远不释放）：

```ts
// ❌
export function useCounter() {
  const count = ref(0)
  setInterval(() => count.value++, 1000)
  return { count } // 组件卸载后定时器还在跑
}
```

正解：

```ts
import { ref, readonly, onScopeDispose, toValue, watch, type MaybeRefOrGetter } from 'vue'

export function useAutoRefresh(interval: MaybeRefOrGetter<number>) {
  const tick = ref(0)
  let timer: ReturnType<typeof setInterval> | undefined

  const restart = () => {
    if (timer) clearInterval(timer)
    timer = setInterval(() => tick.value++, toValue(interval))
  }

  watch(() => toValue(interval), restart, { immediate: true })
  onScopeDispose(() => { if (timer) clearInterval(timer) })

  return { tick: readonly(tick), restart }
}
```

`onScopeDispose` 比 `onUnmounted` 更通用：composable 在组件里、在 `effectScope` 里、在测试里都能正确清理。

## 二、异步状态：竞态、取消与错误

这是 Vue 项目里最高频的一类 bug：快速切换筛选条件时，旧请求后返回并覆盖了新结果。

```ts
import { ref, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue'

export function useResource<T>(source: MaybeRefOrGetter<string | null>) {
  const data = shallowRef<T | null>(null)
  const error = ref<Error | null>(null)
  const loading = ref(false)
  let controller: AbortController | null = null

  watch(() => toValue(source), async (url) => {
    controller?.abort()               // 关键 1：取消上一次请求
    controller = new AbortController()
    const { signal } = controller

    data.value = null
    error.value = null
    if (!url) return

    loading.value = true
    try {
      const res = await fetch(url, { signal })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (!signal.aborted) data.value = json   // 关键 2：再确认一次没被取消
    } catch (e) {
      if ((e as Error).name !== 'AbortError') error.value = e as Error
    } finally {
      if (!signal.aborted) loading.value = false
    }
  }, { immediate: true })

  return { data, error, loading }
}
```

要点：

- `AbortController` 要一路传到 `fetch`，只改前端标志位不算取消。
- 取消错误不要塞进 `error`，否则界面会闪一个「请求失败」。
- 大对象用 `shallowRef`，避免深层响应式代理的开销。
- 这类逻辑在 [AI Agent 流式交互](/ai-agent/10-frontend-integration) 里同样适用，只是取消还要传到服务端 loop。

## 三、effectScope：批量管理一组副作用

```ts
import { effectScope, onScopeDispose } from 'vue'

const scope = effectScope()
scope.run(() => {
  const a = useAutoRefresh(1000)
  const b = useResource(() => '/api/notes')
  // 内部的 watch / computed / onScopeDispose 全部归属这个 scope
})
scope.stop() // 一次性全部停止
```

适合：弹窗/抽屉内的一组逻辑、单元测试中隔离副作用、临时预览态。

## 四、provide / inject 的类型安全写法

```ts
import { inject, provide, type InjectionKey, type Ref } from 'vue'

export const ThemeKey: InjectionKey<Ref<'light' | 'dark'>> = Symbol('theme')
export const ConfigKey: InjectionKey<{ apiBase: string }> = Symbol('config')

// 祖先组件
const theme = ref<'light' | 'dark'>('light')
provide(ThemeKey, theme)

// 后代组件（类型自动推导，且能处理「未提供」的情况）
const theme = inject(ThemeKey)
if (!theme) throw new Error('ThemeKey 必须由祖先组件 provide')
```

用 `InjectionKey<T>` 而不是字符串键，能同时拿到类型与避免命名冲突。跨层级共享状态时，也要警惕 SSR 下的**跨请求状态污染**：模块级 `ref` 在服务进程里是全局单例，用户 A 的数据可能泄漏给用户 B。跨请求状态请用 `useState`（Nuxt）或在请求上下文内创建。

## 五、响应式性能：什么时候该「不响应」

| 工具 | 用途 | 典型场景 |
|---|---|---|
| `shallowRef` | 只追踪 `.value` 替换，不深度代理 | 大列表、接口返回的大对象 |
| `markRaw` | 标记对象永不代理 | ECharts 实例、Three.js 对象、第三方类实例 |
| `toRaw` | 取回原始对象 | 传给不接受 Proxy 的库 |
| `v-memo` | 缓存子树，依赖不变不重渲染 | 长列表中未选中项 |
| `computed` | 缓存派生值 | 避免在模板里做重计算 |
| `v-once` | 一次性渲染 | 纯静态内容 |

```ts
// ECharts 实例放进 ref 会被深度代理，导致内部逻辑异常
const chart = shallowRef<echarts.ECharts | null>(null)
chart.value = echarts.init(el) // shallowRef 只代理顶层，实例内部保持原样

// 更保险
const chart = ref(markRaw(echarts.init(el)))
```

另一个常见坑：把整个表格数据放进 `reactive` 后逐行修改，每次都触发大范围依赖更新。改成 `shallowRef` + 整体替换（不可变更新）通常更快也更好调试。

## 六、组件接口设计

```vue
<script setup lang="ts" generic="T extends { id: string }">
interface Props {
  items: T[]
  selectedId?: string
  loading?: boolean
}
const props = withDefaults(defineProps<Props>(), { loading: false })

const emit = defineEmits<{
  select: [item: T]
  retry: []
}>()

// v-model:keyword
const keyword = defineModel<string>('keyword', { default: '' })

defineExpose({ focus: () => inputEl.value?.focus() })
</script>
```

| 决策 | 建议 |
|---|---|
| props 类型 | 用类型声明 + `withDefaults`，别用运行时数组声明丢类型 |
| 事件 | `defineEmits<{...}>()` 具名元组形式，调用方有参数提示 |
| 双向绑定 | `defineModel` 优先，比手动 `emit('update:xxx')` 清爽 |
| 内容扩展 | 用具名插槽 + 作用域插槽，别堆十几个布尔 prop |
| 泛型组件 | `<script setup generic="T">` 让列表类组件保留元素类型 |
| 透传属性 | 多根组件要显式 `defineOptions({ inheritAttrs: false })` 并绑定 `$attrs` |

**组件拆分信号**：一个 `setup` 里出现 3 组互不相关的状态与副作用时，就该拆成 3 个 composable 了。

## 七、测试要点

```ts
import { mount } from '@vue/test-utils'
import { effectScope } from 'vue'

it('切换条件时旧请求不覆盖新结果', async () => {
  // 用可控的 deferred Promise 模拟乱序返回
  const scope = effectScope()
  const { data } = scope.run(() => useResource(source))!
  // ...触发两次 source，先 resolve 旧的、再 resolve 新的
  expect(data.value).toBe(newResult)
  scope.stop()
})
```

必测三类：竞态与取消、副作用清理（卸载后定时器/监听是否还在）、`readonly` 契约（外部不能直接改状态）。

## 动手任务

1. 把项目里一个超过 150 行的组件拆成 2–3 个 composable，用 `onScopeDispose` 保证清理。
2. 给 `useResource` 写乱序返回的单元测试，先让它失败，再补 `AbortController` 让它通过。
3. 用 `shallowRef` + `markRaw` 改造一个接了图表库的组件，对比改造前后的渲染耗时。
4. 把 `provide/inject` 的字符串键全部换成 `InjectionKey<T>`，观察类型提示的变化。

参考：[Vue Composables 指南](https://vuejs.org/guide/reusability/composables.html)、[Vue 性能最佳实践](https://vuejs.org/guide/best-practices/performance.html)、[Vue 3 基础入门](/notes/vue3-basics)
