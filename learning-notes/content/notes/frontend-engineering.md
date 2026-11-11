---
title: "前端工程化与性能优化"
description: "构建工具链、代码分割、Core Web Vitals、渲染性能、测试策略与发布监控的完整实践清单"
category: "notes"
date: "2026-11-11"
---

## 一、构建工具链：dev 与 build 是两套机制

| 阶段 | Vite 的做法 | 关键结论 |
|---|---|---|
| 开发 | 原生 ESM 按需提供模块 + esbuild 预构建依赖 | 启动快，改一个文件只失效相关模块 |
| 生产 | Rollup 打包 + tree-shaking + chunk 分割 | 输出体积与缓存策略才是重点 |
| 热更新 | HMR 通过 WebSocket 推送模块替换 | 状态保持依赖框架适配层 |

常见误解：「dev 很快所以 build 也该很快」「开发环境能跑生产就没问题」。实际上 SSR/水合、动态 import、原生依赖、baseURL 相关的问题**只在构建产物里出现**，所以每次发版前必须跑一次 `npm run build` 并实际预览产物。

### 代码分割的三个层次

```ts
// 1. 路由级：按页面拆（Nuxt 自动做）
// 2. 组件级：重组件按需加载
const Chart = defineAsyncComponent(() => import('./HeavyChart.vue'))

// 3. 依赖级：手动分块，避免三方库把主包撑大
export default defineNuxtConfig({
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            charts: ['echarts'],
            ui: ['ant-design-vue'],
          },
        },
      },
    },
  },
})
```

本站把 `ant-design-vue`、`echarts`、`three` 分开优化依赖（`optimizeDeps.include`），就是为了避免开发期反复预构建。

## 二、工程规范：把「能跑」变成「能协作」

| 项 | 建议 |
|---|---|
| TypeScript | 开 `strict`，公共 API 显式返回类型，见 [类型系统进阶](/notes/typescript-types) |
| 代码风格 | ESLint + Prettier 提交前自动跑，规则有分歧时写进 ADR 而不是吵架 |
| 提交规范 | Conventional Commits + 变更日志自动生成 |
| 目录约定 | 按「特性」而非「文件类型」组织，避免全局 `utils/` 变成垃圾桶 |
| 环境配置 | `.env.example` 入库，真实值不入库；区分构建期与运行期变量 |
| CI | 类型检查 → lint → 单测 → build → 预览产物，任何一步失败阻断合并 |
| 依赖 | 锁文件入库；定期审计，升级前看 changelog 与 breaking changes |

## 三、性能指标：先测再优化

| 指标 | 含义 | 常见优化 |
|---|---|---|
| LCP | 最大内容绘制时间 | 优先加载首屏资源、图片尺寸与格式、SSR/预渲染、CDN |
| INP | 交互到下一次绘制 | 拆分长任务、减少主线程工作、避免同步大计算 |
| CLS | 布局偏移 | 图片/字体预留尺寸、避免异步插入未占位内容 |

工具链：`Lighthouse`（实验室数据）→ `Performance` 面板看长任务 → `Network` 看 waterfall → `bundle analyzer` 看体积 → RUM（真实用户数据）验证。

**优化顺序**：先定位瓶颈（哪一帧、哪个请求、哪个 chunk），再动手。凭感觉加 `memo` / `v-memo` 往往既没效果又增加复杂度。

### 资源加载

```html
<!-- 关键字体/样式提前发现 -->
<link rel="preload" href="/fonts/main.woff2" as="font" type="font/woff2" crossorigin>
<!-- 首屏图片优先 -->
<img src="/hero.webp" width="1200" height="600" fetchpriority="high" alt="...">
<!-- 非首屏图片懒加载 -->
<img src="/below.webp" loading="lazy" width="600" height="400" alt="...">
```

要点：图片显式写 `width/height`（防 CLS）、用 AVIF/WebP、`preload` 只给真正关键的资源（滥用会挤掉更重要的请求）、第三方脚本延迟加载。

## 四、运行时渲染性能

| 问题 | 手段 |
|---|---|
| 长列表卡顿 | 虚拟滚动；`v-memo` 缓存未变化项 |
| 高频更新掉帧 | 按 `requestAnimationFrame` 批量刷新，而非每次数据变化都写响应式状态 |
| 大对象代理开销 | `shallowRef` / `markRaw`，见 [Composables 实战](/notes/vue3-composition-api) |
| 重计算重复执行 | `computed` 缓存派生值；Web Worker 处理 CPU 密集任务 |
| 输入卡顿 | 防抖（搜索）、节流（滚动）、`AbortController` 取消旧请求 |

高频流式更新是典型场景：逐 token 直接改 `ref` 会触发几十次渲染，正确做法是先把增量攒进缓冲区，按帧统一写入。这个模式在 [Agent 流式 UI](/ai-agent/10-frontend-integration) 里有完整实现。

```ts
let pending = ''
let raf = 0
function append(text: string) {
  pending += text
  if (!raf) raf = requestAnimationFrame(() => {
    answer.value += pending
    pending = ''
    raf = 0
  })
}
```

## 五、测试策略

```text
        E2E（Playwright）：关键业务链路，少量、稳定、跑在 CI
     组件测试（Vitest + @vue/test-utils）：交互与状态契约
   单元测试（Vitest）：纯函数、composable、工具、类型推导
  静态检查：tsc --noEmit、ESLint
```

| 原则 | 说明 |
|---|---|
| 业务逻辑放纯函数 | 不依赖 DOM/框架，最容易测，见 [类型系统进阶](/notes/typescript-types) |
| 优先测失败路径 | 竞态、取消、超时、错误回退比 happy path 更值钱 |
| 别测实现细节 | 断言行为与输出，别断言内部 ref 的名字 |
| 关键类型也要测 | `expectTypeOf` / `tsd` 防止重构破坏类型推导 |
| E2E 数据可控 | 用固定 fixture 与 mock 接口，别依赖真实第三方服务 |

## 六、发布与监控

- **Source Map**：上传给错误监控平台，生产环境不对外暴露 `.map` 文件。
- **灰度与回滚**：静态资源带内容哈希，回滚只需把 HTML 指回上一版资源清单。
- **错误上报**：全局 `onErrorCaptured` + `window.onerror` / `unhandledrejection`，带版本号与用户环境。
- **RUM**：采集真实 LCP/INP/CLS，比实验室数据更能反映用户设备。
- **告警**：JS 错误率、接口 5xx、白屏率超过阈值触发，别等用户反馈。

## 检查清单

```text
[ ] npm run build 通过，且预览过构建产物（不只是 dev 能跑）
[ ] 首屏 JS 体积有基线，新增依赖前评估成本
[ ] 图片有尺寸与懒加载，关键字体/样式有 preload
[ ] 高频更新路径做了批量刷新 / 虚拟列表 / 取消旧请求
[ ] 关键链路有单测，至少一条 E2E，类型检查进 CI
[ ] 生产有 sourcemap 上报、错误率告警与一键回滚
[ ] Core Web Vitals 有真实用户数据，不是只看 Lighthouse 分数
```

## 动手任务

1. 用 bundle analyzer 找出本站最大的三个 chunk，评估哪些能改成异步加载。
2. 给一个 200 条消息的列表加虚拟滚动，记录滚动时的帧率与脚本耗时。
3. 把逐 token 追加改成按帧批量刷新，对比 1000 token 下的渲染次数与总耗时。
4. 在 CI 里加上 `tsc --noEmit` 和一条 E2E（打开首页 → 进入 AI Agent 分类 → 打开一篇文章）。

延伸：[浏览器与网络基础](/notes/browser-and-network)、[web.dev 性能指南](https://web.dev/learn/performance)、[Vite 文档](https://vite.dev/guide/)
