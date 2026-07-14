<script setup lang="ts">
import * as THREE from 'three'

const canvasRef = ref<HTMLCanvasElement>()
const { isDark } = useTheme()

let animationId: number
let renderer: THREE.WebGLRenderer
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let particles: THREE.Points
let linesMesh: THREE.LineSegments
let mouseX = 0
let mouseY = 0
let targetRotationX = 0
let targetRotationY = 0

const PARTICLE_COUNT = 300
const CONNECTION_DISTANCE = 100
const SPREAD = 600

function getColors() {
  const dark = document.documentElement.classList.contains('dark')
  return {
    particle: dark ? 0x818cf8 : 0x6366f1,
    line: dark ? 0x6366f1 : 0xa5b4fc,
    background: 0x000000,
    particleOpacity: dark ? 0.5 : 0.35,
    lineOpacity: dark ? 0.15 : 0.12,
  }
}

function createCircleTexture(): THREE.CanvasTexture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const half = size / 2

  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half)
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
  gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)')
  gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)')
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

function initScene() {
  const canvas = canvasRef.value
  if (!canvas) return

  const width = window.innerWidth
  const height = window.innerHeight

  // Scene
  scene = new THREE.Scene()

  // Camera
  camera = new THREE.PerspectiveCamera(60, width / height, 1, 1000)
  camera.position.z = 300

  // Renderer
  renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)

  // Particles
  createParticles()

  // Connection lines
  createLines()

  // Event listeners
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('resize', onResize)

  // Start animation
  animate()
}

function createParticles() {
  const colors = getColors()
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(PARTICLE_COUNT * 3)
  const velocities = new Float32Array(PARTICLE_COUNT * 3)
  const sizes = new Float32Array(PARTICLE_COUNT)

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    positions[i * 3] = (Math.random() - 0.5) * SPREAD
    positions[i * 3 + 1] = (Math.random() - 0.5) * SPREAD
    positions[i * 3 + 2] = (Math.random() - 0.5) * SPREAD

    velocities[i * 3] = (Math.random() - 0.5) * 0.3
    velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.3
    velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.3

    sizes[i] = Math.random() * 3 + 1.5
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3))
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

  const circleTexture = createCircleTexture()

  const material = new THREE.PointsMaterial({
    color: colors.particle,
    size: 5,
    map: circleTexture,
    transparent: true,
    opacity: colors.particleOpacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  })

  particles = new THREE.Points(geometry, material)
  scene.add(particles)
}

function createLines() {
  const colors = getColors()
  const maxLines = PARTICLE_COUNT * 6
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(maxLines * 6)
  const lineColors = new Float32Array(maxLines * 6)

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3))
  geometry.setDrawRange(0, 0)

  const material = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: colors.lineOpacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })

  linesMesh = new THREE.LineSegments(geometry, material)
  scene.add(linesMesh)
}

function updateConnections() {
  const colors = getColors()
  const positions = particles.geometry.attributes.position.array as Float32Array
  const linePositions = linesMesh.geometry.attributes.position.array as Float32Array
  const lineColors = linesMesh.geometry.attributes.color.array as Float32Array

  const color = new THREE.Color(colors.line)
  let lineIndex = 0

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    for (let j = i + 1; j < PARTICLE_COUNT; j++) {
      const dx = positions[i * 3] - positions[j * 3]
      const dy = positions[i * 3 + 1] - positions[j * 3 + 1]
      const dz = positions[i * 3 + 2] - positions[j * 3 + 2]
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)

      if (distance < CONNECTION_DISTANCE) {
        const alpha = 1 - distance / CONNECTION_DISTANCE

        linePositions[lineIndex * 6] = positions[i * 3]
        linePositions[lineIndex * 6 + 1] = positions[i * 3 + 1]
        linePositions[lineIndex * 6 + 2] = positions[i * 3 + 2]
        linePositions[lineIndex * 6 + 3] = positions[j * 3]
        linePositions[lineIndex * 6 + 4] = positions[j * 3 + 1]
        linePositions[lineIndex * 6 + 5] = positions[j * 3 + 2]

        lineColors[lineIndex * 6] = color.r * alpha
        lineColors[lineIndex * 6 + 1] = color.g * alpha
        lineColors[lineIndex * 6 + 2] = color.b * alpha
        lineColors[lineIndex * 6 + 3] = color.r * alpha
        lineColors[lineIndex * 6 + 4] = color.g * alpha
        lineColors[lineIndex * 6 + 5] = color.b * alpha

        lineIndex++
        if (lineIndex >= PARTICLE_COUNT * 6) break
      }
    }
    if (lineIndex >= PARTICLE_COUNT * 6) break
  }

  linesMesh.geometry.setDrawRange(0, lineIndex * 2)
  linesMesh.geometry.attributes.position.needsUpdate = true
  linesMesh.geometry.attributes.color.needsUpdate = true
}

function animate() {
  animationId = requestAnimationFrame(animate)

  const positions = particles.geometry.attributes.position.array as Float32Array
  const velocities = particles.geometry.attributes.velocity.array as Float32Array

  // Update particle positions
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    positions[i * 3] += velocities[i * 3]
    positions[i * 3 + 1] += velocities[i * 3 + 1]
    positions[i * 3 + 2] += velocities[i * 3 + 2]

    // Boundary wrapping
    const halfSpread = SPREAD / 2
    if (positions[i * 3] > halfSpread) positions[i * 3] = -halfSpread
    if (positions[i * 3] < -halfSpread) positions[i * 3] = halfSpread
    if (positions[i * 3 + 1] > halfSpread) positions[i * 3 + 1] = -halfSpread
    if (positions[i * 3 + 1] < -halfSpread) positions[i * 3 + 1] = halfSpread
    if (positions[i * 3 + 2] > halfSpread) positions[i * 3 + 2] = -halfSpread
    if (positions[i * 3 + 2] < -halfSpread) positions[i * 3 + 2] = halfSpread
  }

  particles.geometry.attributes.position.needsUpdate = true

  // Mouse interaction - gentle rotation
  targetRotationX += (mouseY * 0.0002 - targetRotationX) * 0.05
  targetRotationY += (mouseX * 0.0002 - targetRotationY) * 0.05

  scene.rotation.x += (targetRotationX - scene.rotation.x) * 0.02
  scene.rotation.y += (targetRotationY - scene.rotation.y) * 0.02

  // Auto rotation
  scene.rotation.y += 0.0008
  scene.rotation.x += 0.0003

  // Update connections
  updateConnections()

  renderer.render(scene, camera)
}

function onMouseMove(event: MouseEvent) {
  mouseX = (event.clientX / window.innerWidth) * 2 - 1
  mouseY = -(event.clientY / window.innerHeight) * 2 + 1
}

function onResize() {
  if (!canvasRef.value || !camera || !renderer) return

  const width = window.innerWidth
  const height = window.innerHeight

  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

// Watch theme changes
watch(isDark, () => {
  if (!particles || !linesMesh) return
  const colors = getColors()

  (particles.material as THREE.PointsMaterial).color.setHex(colors.particle)
  (particles.material as THREE.PointsMaterial).opacity = colors.particleOpacity
  (linesMesh.material as THREE.LineBasicMaterial).opacity = colors.lineOpacity
})

onMounted(() => {
  nextTick(() => initScene())
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animationId)
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('resize', onResize)

  if (particles) {
    const mat = particles.material as THREE.PointsMaterial
    mat.map?.dispose()
    mat.dispose()
    particles.geometry.dispose()
  }
  if (linesMesh) {
    linesMesh.geometry.dispose()
    ;(linesMesh.material as THREE.Material).dispose()
  }
  if (renderer) {
    renderer.dispose()
  }
})
</script>

<template>
  <canvas ref="canvasRef" class="particle-canvas" />
</template>

<style scoped>
.particle-canvas {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 0;
}
</style>
