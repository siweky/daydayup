<script setup lang="ts">
import * as echarts from 'echarts'

// ── 配置状态 ──
const config = reactive({
  // 模板
  templateName: '系统默认',
  // 颜色
  textColor: '#333333',
  revenueColor: '#C00000',
  indexColor: '#264C91',
  excessColor: '#F2BA02',
  netValueColor: '#264C91',
  drawdownColor: '#264C91',
  scaleColor: '#ECECEC',
  // 布局
  canvasWidth: 1200,
  canvasHeight: 900,
  titleFontSize: 28,
  titleWeight: 600,
  titleAreaHeight: 64,
  axisTickFontSize: 18,
  axisLabelFontSize: 18,
  legendFontSize: 22,
  legendSwatchSize: 14,
  xAxisRotation: -45,
})

const defaultConfig = { ...config }
const activeScene = ref('业绩')
const chartRef = ref<HTMLElement | null>(null)
const previewRef = ref<HTMLElement | null>(null)
const chartScale = ref(1)
let chartInstance: echarts.ECharts | null = null
let resizeObserver: ResizeObserver | null = null

const scenes = ['业绩', '回撤', '规模']

// ── 示例数据 ──
const dates = [
  '2022-07-01','2022-08-30','2022-11-28','2023-01-27','2023-04-27',
  '2023-06-26','2023-09-24','2023-11-23','2024-02-21','2024-04-21',
  '2024-07-20','2024-09-18','2024-12-17','2025-02-15','2025-05-16',
]
const revenueData = [-5, 2, 12, 18, 25, 35, 42, 48, 55, 62, 70, 80, 88, 95, 105]
const indexData = [-8, -2, 5, 10, 15, 22, 28, 32, 38, 44, 50, 56, 62, 68, 75]
const excessData = [3, 4, 7, 8, 10, 13, 14, 16, 17, 18, 20, 24, 26, 27, 30]

// ── 构建 ECharts 配置 ──
function getChartOption() {
  const c = config
  return {
    title: {
      text: '示例产品运作以来业绩走势图',
      left: 'center',
      top: c.titleAreaHeight / 2 - c.titleFontSize / 2,
      textStyle: {
        fontSize: c.titleFontSize,
        fontWeight: c.titleWeight,
        color: c.textColor,
      },
    },
    legend: {
      top: c.titleAreaHeight + 8,
      itemWidth: c.legendSwatchSize,
      itemHeight: c.legendSwatchSize,
      textStyle: { fontSize: c.legendFontSize, color: c.textColor },
      data: ['产品累计收益率', '指数累计收益率', '超额累计收益率'],
    },
    grid: {
      top: c.titleAreaHeight + c.legendFontSize + 48,
      bottom: 80,
      left: 80,
      right: 40,
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: {
        fontSize: c.axisTickFontSize,
        color: c.textColor,
        rotate: c.xAxisRotation,
      },
      axisLine: { lineStyle: { color: '#ddd' } },
    },
    yAxis: {
      type: 'value',
      name: '收益率 (%)',
      nameTextStyle: { fontSize: c.axisLabelFontSize, color: c.textColor },
      axisLabel: {
        fontSize: c.axisTickFontSize,
        color: c.textColor,
        formatter: '{value}%',
      },
      splitLine: { lineStyle: { color: '#f0f0f0' } },
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        let tip = `${params[0].axisValue}<br/>`
        for (const p of params) {
          tip += `${p.marker} ${p.seriesName}: ${p.value}%<br/>`
        }
        return tip
      },
    },
    series: [
      {
        name: '产品累计收益率',
        type: 'line',
        data: revenueData,
        smooth: true,
        lineStyle: { width: 2.5, color: c.revenueColor },
        itemStyle: { color: c.revenueColor },
        symbol: 'circle',
        symbolSize: 6,
      },
      {
        name: '指数累计收益率',
        type: 'line',
        data: indexData,
        smooth: true,
        lineStyle: { width: 2.5, color: c.indexColor },
        itemStyle: { color: c.indexColor },
        symbol: 'circle',
        symbolSize: 6,
      },
      {
        name: '超额累计收益率',
        type: 'line',
        data: excessData,
        smooth: true,
        lineStyle: { width: 2.5, color: c.excessColor },
        itemStyle: { color: c.excessColor },
        symbol: 'circle',
        symbolSize: 6,
      },
    ],
  }
}

// ── 自适应缩放 ──
function updateScale() {
  if (!previewRef.value) return
  const containerWidth = previewRef.value.clientWidth - 40 // account for padding
  chartScale.value = Math.min(1, containerWidth / config.canvasWidth)
}

// ── 渲染图表 ──
function renderChart() {
  if (!chartRef.value) return
  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value, undefined, {
      width: config.canvasWidth,
      height: config.canvasHeight,
    })
  } else {
    chartInstance.resize({ width: config.canvasWidth, height: config.canvasHeight })
  }
  chartInstance.setOption(getChartOption(), true)
}

watch(config, () => { updateScale(); renderChart() }, { deep: true })

onMounted(() => {
  nextTick(() => {
    renderChart()
    if (previewRef.value) {
      resizeObserver = new ResizeObserver(() => updateScale())
      resizeObserver.observe(previewRef.value)
    }
    updateScale()
  })
})

onUnmounted(() => {
  chartInstance?.dispose()
  resizeObserver?.disconnect()
})

// ── 操作 ──
function resetConfig() {
  Object.assign(config, defaultConfig)
}

function exportPNG() {
  if (!chartInstance) return
  const url = chartInstance.getDataURL({
    type: 'png',
    pixelRatio: 2,
    backgroundColor: '#fff',
  })
  const a = document.createElement('a')
  a.href = url
  a.download = `chart_${new Date().toISOString().slice(0, 10)}.png`
  a.click()
}

function shareConfig() {
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(config))))
  const url = `${window.location.origin}${window.location.pathname}?cfg=${encoded}`
  navigator.clipboard.writeText(url).then(() => {
    alert('配置链接已复制到剪贴板')
  }).catch(() => {
    prompt('复制以下链接分享配置：', url)
  })
}

function exportOption() {
  const option = getChartOption()
  const json = JSON.stringify(option, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const ts = new Date().toISOString().slice(0, 10)
  a.download = `echarts_option_${ts}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// 加载分享的配置
onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  const cfg = params.get('cfg')
  if (cfg) {
    try {
      const parsed = JSON.parse(decodeURIComponent(escape(atob(cfg))))
      Object.assign(config, parsed)
    } catch {}
  }
})

// ── 滑块辅助 ──
function sliderRow(label: string, key: keyof typeof config, min: number, max: number, step = 1) {
  return { label, key, min, max, step }
}

const sliders = [
  sliderRow('画布宽度', 'canvasWidth', 600, 2400, 10),
  sliderRow('画布高度', 'canvasHeight', 400, 1600, 10),
  sliderRow('标题字号', 'titleFontSize', 12, 48),
  sliderRow('标题区高度', 'titleAreaHeight', 32, 120),
  sliderRow('轴刻度字号', 'axisTickFontSize', 10, 30),
  sliderRow('轴标题字号', 'axisLabelFontSize', 10, 30),
  sliderRow('图例字号', 'legendFontSize', 12, 36),
  sliderRow('图例色块', 'legendSwatchSize', 8, 28),
  sliderRow('横轴旋转角', 'xAxisRotation', -90, 0, 5),
]

const colors = [
  { label: '文字颜色', key: 'textColor' as keyof typeof config },
  { label: '收益颜色', key: 'revenueColor' as keyof typeof config },
  { label: '指数颜色', key: 'indexColor' as keyof typeof config },
  { label: '超额颜色', key: 'excessColor' as keyof typeof config },
  { label: '净值颜色', key: 'netValueColor' as keyof typeof config },
  { label: '回撤颜色', key: 'drawdownColor' as keyof typeof config },
  { label: '规模颜色', key: 'scaleColor' as keyof typeof config },
]
</script>

<template>
  <div class="container page-container playground-page">
    <div class="page-header">
      <div class="header-row">
        <div>
          <h1>图表 Playground</h1>
          <p>调整样式参数，实时预览图表效果，满意后导出为 PNG</p>
        </div>
        <div class="header-actions">
          <button class="btn-ghost" @click="resetConfig">重置</button>
          <button class="btn-ghost" @click="shareConfig">分享</button>
          <button class="btn-ghost" @click="exportOption">导出配置</button>
          <button class="btn-primary" @click="exportPNG">导出 PNG</button>
          <NuxtLink to="/tools" class="back-link">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M10 4L6 8L10 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            返回
          </NuxtLink>
        </div>
      </div>
    </div>

    <div class="playground-layout">
      <!-- Left: Config Panel -->
      <aside class="config-panel">
        <!-- Scene tabs -->
        <div class="scene-tabs">
          <button
            v-for="s in scenes" :key="s"
            class="scene-tab" :class="{ active: activeScene === s }"
            @click="activeScene = s"
          >{{ s }}</button>
        </div>

        <!-- Colors -->
        <div class="config-section">
          <h4 class="section-title">颜色设置</h4>
          <div class="config-row" v-for="c in colors" :key="c.key">
            <label>{{ c.label }}</label>
            <div class="color-input-wrap">
              <input type="color" v-model="(config as any)[c.key]" class="color-picker" />
              <input type="text" v-model="(config as any)[c.key]" class="color-text" maxlength="7" />
            </div>
          </div>
        </div>

        <!-- Font weight -->
        <div class="config-section">
          <h4 class="section-title">标题字重</h4>
          <div class="weight-btns">
            <button
              v-for="w in [400, 500, 600, 700]" :key="w"
              class="weight-btn" :class="{ active: config.titleWeight === w }"
              @click="config.titleWeight = w"
            >{{ w }}</button>
          </div>
        </div>

        <!-- Sliders -->
        <div class="config-section">
          <h4 class="section-title">布局参数</h4>
          <div class="config-row slider-row" v-for="s in sliders" :key="s.key">
            <label>{{ s.label }}</label>
            <div class="slider-wrap">
              <input
                type="range"
                v-model.number="(config as any)[s.key]"
                :min="s.min" :max="s.max" :step="s.step"
                class="slider"
              />
              <span class="slider-val">{{ (config as any)[s.key] }}</span>
            </div>
          </div>
        </div>
      </aside>

      <!-- Right: Preview -->
      <div ref="previewRef" class="preview-area">
        <div
          class="chart-scale-wrap"
          :style="{
            width: config.canvasWidth + 'px',
            height: config.canvasHeight + 'px',
            transform: `scale(${chartScale})`,
            transformOrigin: 'top left',
          }"
        >
          <div ref="chartRef" class="chart-container"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.playground-page { padding-bottom: 2rem; }

/* ── Header ── */
.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-shrink: 0;
}
.btn-ghost {
  padding: 0.35rem 0.85rem;
  font-size: 0.8rem;
  border: 1px solid var(--border, #e0e0e0);
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary, #666);
  cursor: pointer;
  transition: all 0.15s;
}
.btn-ghost:hover { border-color: var(--primary, #1677ff); color: var(--primary, #1677ff); }
.btn-primary {
  padding: 0.35rem 1rem;
  font-size: 0.8rem;
  font-weight: 500;
  border: none;
  border-radius: 6px;
  background: var(--primary, #1677ff);
  color: #fff;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-primary:hover { background: #4096ff; }
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
  color: var(--text-secondary, #888);
  background: var(--bg-secondary, #f5f5f5);
  border: 1px solid var(--border, #e0e0e0);
  border-radius: 6px;
  text-decoration: none;
  transition: all 0.15s;
  white-space: nowrap;
}
.back-link:hover { color: var(--primary, #1677ff); border-color: var(--primary, #1677ff); }

/* ── Layout: two separate panels ── */
.playground-layout {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 16px;
  align-items: start;
}

/* ── Config Panel ── */
.config-panel {
  border: 1px solid var(--border, #e0e0e0);
  border-radius: 12px;
  padding: 1rem;
  background: var(--bg-card, #fff);
  max-height: calc(100vh - 200px);
  overflow-y: auto;
}
.config-panel::-webkit-scrollbar { width: 3px; }
.config-panel::-webkit-scrollbar-thumb { background: #ccc; border-radius: 2px; }

.scene-tabs {
  display: flex;
  margin-bottom: 1rem;
  background: var(--bg-card, #fff);
  border: 1px solid var(--border, #e0e0e0);
  border-radius: 6px;
  overflow: hidden;
}
.scene-tab {
  flex: 1;
  padding: 0.4rem 0;
  font-size: 0.8rem;
  border: none;
  background: transparent;
  color: var(--text-secondary, #888);
  cursor: pointer;
  transition: all 0.15s;
}
.scene-tab + .scene-tab { border-left: 1px solid var(--border, #e8e8e8); }
.scene-tab.active { background: var(--primary, #1677ff); color: #fff; }
.scene-tab:hover:not(.active) { background: var(--bg-secondary, #f0f0f0); }

.config-section { margin-bottom: 1.1rem; }
.section-title {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-secondary, #999);
  text-transform: uppercase;
  letter-spacing: 0.6px;
  margin: 0 0 0.6rem;
  padding-bottom: 0.35rem;
  border-bottom: 1px solid var(--border, #eee);
}

.config-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.4rem;
}
.config-row label {
  font-size: 0.78rem;
  color: var(--text-primary, #444);
  flex-shrink: 0;
  width: 76px;
}

.color-input-wrap {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}
.color-picker {
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid var(--border, #ddd);
  border-radius: 4px;
  cursor: pointer;
  background: none;
}
.color-picker::-webkit-color-swatch-wrapper { padding: 2px; }
.color-picker::-webkit-color-swatch { border: none; border-radius: 2px; }
.color-text {
  width: 68px;
  padding: 0.2rem 0.35rem;
  font-size: 0.72rem;
  font-family: monospace;
  border: 1px solid var(--border, #ddd);
  border-radius: 4px;
  text-align: center;
  color: var(--text-primary, #444);
  background: var(--bg-card, #fff);
}

.weight-btns { display: flex; gap: 0.3rem; }
.weight-btn {
  flex: 1;
  padding: 0.3rem;
  font-size: 0.78rem;
  border: 1px solid var(--border, #ddd);
  border-radius: 4px;
  background: var(--bg-card, #fff);
  cursor: pointer;
  transition: all 0.15s;
  color: var(--text-secondary, #666);
}
.weight-btn.active { background: var(--primary, #1677ff); color: #fff; border-color: var(--primary, #1677ff); }

.slider-row { gap: 0.4rem; }
.slider-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.slider {
  flex: 1;
  -webkit-appearance: none;
  height: 3px;
  background: var(--border, #ddd);
  border-radius: 2px;
  outline: none;
}
.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--primary, #1677ff);
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}
.slider-val {
  font-size: 0.72rem;
  font-family: monospace;
  color: var(--text-secondary, #888);
  min-width: 32px;
  text-align: right;
}

/* ── Preview Area ── */
.preview-area {
  border: 1px solid var(--border, #e0e0e0);
  border-radius: 12px;
  padding: 1.25rem;
  background: var(--bg-card, #fff);
  overflow: hidden;
  min-width: 0;
}
.chart-scale-wrap {
  position: relative;
}
.chart-container {
  width: 100%;
  height: 100%;
}

@media (max-width: 900px) {
  .playground-layout { grid-template-columns: 1fr; }
  .config-panel {
    max-height: none;
  }
  .header-row { flex-direction: column; align-items: flex-start; gap: 0.5rem; }
  .header-actions { flex-wrap: wrap; }
}
</style>
