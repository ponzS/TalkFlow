<template>
  <div ref="container" class="particle-background" @click="lockPointer">
    <div class="speed-max">
      <div class="speed-gauge1">
        <span class="speed-gauge">{{ MOVE_SPEED.toFixed(2) }}</span>
        <span style="color: white; font-size: 20px">KM</span>
        <span class="speed-gauge" style="font-size: 20px">/</span>
        <span style="color: white; font-size: 19px">s</span>
      </div>
    </div>
    <!-- <div class="npc-container">
      <NPCs />
    </div> -->
  </div>
  
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, provide } from 'vue'
import * as THREE from 'three'
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { World, Body, Sphere, Vec3, Material, ContactMaterial } from 'cannon-es'
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js'

provide('toggleMovement', toggleMovement)

const container = ref<HTMLElement | null>(null)
const isMoving = ref(false)
const isPaused = ref(false)
const MOVE_SPEED = ref(0)
const targetSpeed = ref(100)
const acceleration = 20
const deceleration = 20
const maxManualSpeed = 300
const autoFlightAcceleration = 100
const friction = 0.92
const currentVelocity = ref(new THREE.Vector3())

let animationId = 0
let glitchTimeout: number
let spawnIntervalId: number

let scene: THREE.Scene
let planetScene: THREE.Scene | null = null
let currentScene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let composer: EffectComposer
let renderScene: RenderPass
let glitchPass: GlitchPass
let bloomPass: UnrealBloomPass
let isInPlanet = ref(false)
let planetTheme: { baseColor: THREE.Color; auroraColor?: THREE.Color } | null = null

const GradientShader = {
  uniforms: { topColor: { value: new THREE.Color(0x0000ff) }, bottomColor: { value: new THREE.Color(0x000000) }, uTime: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position, 1.0); }`,
  fragmentShader: `uniform vec3 topColor; uniform vec3 bottomColor; uniform float uTime; varying vec2 vUv; void main(){ float t = vUv.y; vec3 color = mix(bottomColor, topColor, t); gl_FragColor = vec4(color, 1.0); }`,
}
const gradientPass = new ShaderPass(GradientShader)

let world: World
let playerBody: Body
interface PhysicsObject { mesh: THREE.Mesh | THREE.Group; body: Body }
const physicsAsteroidArray: PhysicsObject[] = []
const dynamicObjectsArray: PhysicsObject[] = []

const SPACE_RADIUS = 100000
const STAR_COUNT = 6000
let starGeometry: THREE.BufferGeometry
let starMaterial: THREE.ShaderMaterial
let starPoints: THREE.Points | null = null

const starVertexShader = `uniform float uTime; attribute float aSize; attribute float aPhase; varying float vSize; void main(){ vec3 pos = position; pos.x += sin(uTime + aPhase)*0.3; pos.y += cos(uTime*1.2 + aPhase)*0.2; pos.z += sin(uTime*1.5 + aPhase)*0.2; float factor = 0.3 + 0.2*abs(sin(uTime*2.0 + aPhase)); vSize = aSize*factor; gl_Position = projectionMatrix * modelViewMatrix * vec4(pos,1.0); gl_PointSize = vSize; }`
const starFragmentShader = `uniform sampler2D uMap; void main(){ vec4 color = texture2D(uMap, gl_PointCoord); if(color.a<0.1) discard; gl_FragColor = color; }`

const keysPressed = { w: false, a: false, s: false, d: false, space: false, shift: false }
function onKeyDown(evt: KeyboardEvent) {
  if (evt.key === 'w' || evt.key === 'W') keysPressed.w = true
  if (evt.key === 'a' || evt.key === 'A') keysPressed.a = true
  if (evt.key === 's' || evt.key === 'S') keysPressed.s = true
  if (evt.key === 'd' || evt.key === 'D') keysPressed.d = true
  if (evt.key === ' ') keysPressed.space = true
  if (evt.key === 'Shift') keysPressed.shift = true
}
function onKeyUp(evt: KeyboardEvent) {
  if (evt.key === 'w' || evt.key === 'W') keysPressed.w = false
  if (evt.key === 'a' || evt.key === 'A') keysPressed.a = false
  if (evt.key === 's' || evt.key === 'S') keysPressed.s = false
  if (evt.key === 'd' || evt.key === 'D') keysPressed.d = false
  if (evt.key === ' ') keysPressed.space = false
  if (evt.key === 'Shift') keysPressed.shift = false
}

let pointerControls: PointerLockControls
function lockPointer() {
  if (!isMobile) pointerControls.lock()
}

function createSun(radius: number) {
  const sunGeo = new THREE.SphereGeometry(radius, 64, 64)
  const sunMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0xffcc00, emissiveIntensity: 1.0, roughness: 0.3, metalness: 0.1 })
  const sunMesh = new THREE.Mesh(sunGeo, sunMat)
  const sunLight = new THREE.PointLight(0xffffff, 2.0, SPACE_RADIUS * 2)
  sunMesh.add(sunLight)
  ;(sunMesh as any).rotationAxis = new THREE.Vector3(0, 1, 0)
  ;(sunMesh as any).rotationSpeed = 0.05
  return sunMesh
}

function createEarth(radius: number) {
  const textureLoader = new THREE.TextureLoader()
  const earthColorMap = textureLoader.load('@/assets/diqiu.webp')
  const earthGeo = new THREE.SphereGeometry(radius, 1024, 1024)
  const earthMat = new THREE.MeshStandardMaterial({ map: earthColorMap, emissive: 0x003355, emissiveIntensity: 0.2, roughness: 0.5 })
  const earthMesh = new THREE.Mesh(earthGeo, earthMat)
  earthMesh.castShadow = true
  earthMesh.receiveShadow = true
  ;(earthMesh as any).rotationAxis = new THREE.Vector3(0, 1, 0)
  ;(earthMesh as any).rotationSpeed = 0.1
  return earthMesh
}

function createMoon(radius: number) {
  const textureLoader = new THREE.TextureLoader()
  const moonColorMap = textureLoader.load('@/assets/yueqiu.png')
  const moonGeo = new THREE.SphereGeometry(radius, 64, 64)
  const moonMat = new THREE.MeshStandardMaterial({ map: moonColorMap, roughness: 0.8 })
  const moonMesh = new THREE.Mesh(moonGeo, moonMat)
  moonMesh.castShadow = true
  moonMesh.receiveShadow = true
  ;(moonMesh as any).rotationAxis = new THREE.Vector3(0.1, 1, 0).normalize()
  ;(moonMesh as any).rotationSpeed = 0.05
  return moonMesh
}

function createSwirlAuroraMaterial() {
  const uniforms = { uTime: { value: 0 }, color1: { value: new THREE.Color(`hsl(${Math.random() * 360},100%,65%)`) }, color2: { value: new THREE.Color(`hsl(${Math.random() * 360},100%,35%)`) }, colorAurora: { value: new THREE.Color(`hsl(${Math.random() * 360},80%,70%)`) } }
  const vertexShader = `varying vec3 vPos; void main(){ vPos=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`
  const fragmentShader = `uniform float uTime; uniform vec3 color1; uniform vec3 color2; uniform vec3 colorAurora; varying vec3 vPos; float swirlNoise(vec3 p){ float r = length(p.xy); float angle = atan(p.y,p.x); float swirl = sin(r*0.05 + uTime*0.2 + angle*2.0)*0.5+0.5; return swirl; } void main(){ float swirl = swirlNoise(vPos); vec3 baseColor = mix(color1, color2, swirl); float auroraFactor = smoothstep(-100.0,100.0, vPos.y); vec3 finalColor = mix(baseColor, colorAurora, auroraFactor*0.4); gl_FragColor=vec4(finalColor,1.0); }`
  return new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader })
}

function createSwirlAuroraPlanet(radius: number) {
  const geo = new THREE.SphereGeometry(radius, 64, 64)
  const mat = createSwirlAuroraMaterial()
  const mesh = new THREE.Mesh(geo, mat)
  mesh.castShadow = true
  mesh.receiveShadow = true
  ;(mesh as any).rotationAxis = new THREE.Vector3(Math.random(), 1, Math.random()).normalize()
  ;(mesh as any).rotationSpeed = THREE.MathUtils.randFloat(0.05, 0.3)
  return mesh
}

function createPlanetWithRing(planetRadius: number) {
  const planetGeo = new THREE.SphereGeometry(planetRadius, 64, 64)
  const planetMat = createSwirlAuroraMaterial()
  const planetMesh = new THREE.Mesh(planetGeo, planetMat)
  planetMesh.castShadow = true
  planetMesh.receiveShadow = true

  const ringInner = planetRadius * 1.2
  const ringOuter = planetRadius * 1.7
  const ringCount = 2000
  const ringPositions = new Float32Array(ringCount * 3)
  const ringPhases = new Float32Array(ringCount)

  for (let i = 0; i < ringCount; i++) {
    const r = THREE.MathUtils.randFloat(ringInner, ringOuter)
    const theta = Math.random() * 2 * Math.PI
    const x = r * Math.cos(theta)
    const z = r * Math.sin(theta)
    const y = THREE.MathUtils.randFloat(-0.3, 0.3)
    ringPositions[i * 3 + 0] = x
    ringPositions[i * 3 + 1] = y
    ringPositions[i * 3 + 2] = z
    ringPhases[i] = Math.random() * Math.PI * 2
  }

  const ringGeo = new THREE.BufferGeometry()
  ringGeo.setAttribute('position', new THREE.BufferAttribute(ringPositions, 3))
  ringGeo.setAttribute('aPhase', new THREE.BufferAttribute(ringPhases, 1))

  const ringVertexShader = `uniform float uTime; attribute float aPhase; varying vec2 vUv; void main() { vec3 pos = position; float angle = uTime * 0.5 + aPhase; float r = length(pos.xz); float originalTheta = atan(pos.z, pos.x); float newTheta = originalTheta + angle; pos.x = r * cos(newTheta); pos.z = r * sin(newTheta); vUv = vec2(pos.x, pos.z); gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0); gl_PointSize = 0.4; }`
  const ringFragmentShader = `uniform sampler2D uMap; void main() { vec4 color = texture2D(uMap, gl_PointCoord); if (color.a < 0.1) discard; gl_FragColor = vec4(1.0, 1.0, 1.0, color.a * 0.35); }`
  const ringMat = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uMap: { value: createCircleTexture() } }, vertexShader: ringVertexShader, fragmentShader: ringFragmentShader, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })

  const ringPoints = new THREE.Points(ringGeo, ringMat)
  planetMesh.add(ringPoints)
  ringPoints.rotation.x = Math.random() * Math.PI
  ringPoints.rotation.y = Math.random() * Math.PI

  ;(planetMesh as any).rotationAxis = new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize()
  ;(planetMesh as any).rotationSpeed = THREE.MathUtils.randFloat(0.1, 0.4)
  return planetMesh
}

function createRingedPlanet(radius: number) {
  return createPlanetWithRing(radius)
}

function createRandomSpotPlanet(radius: number) {
  const geo = new THREE.SphereGeometry(radius, 64, 64)
  const texCanvas = createRandomSpotTexture()
  const tex = new THREE.CanvasTexture(texCanvas)
  const mat = new THREE.MeshStandardMaterial({ map: tex, emissive: new THREE.Color(`hsl(${Math.random() * 360},100%,10%)`), emissiveIntensity: 0.2, roughness: 0.4 })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.castShadow = true
  mesh.receiveShadow = true
  ;(mesh as any).rotationAxis = new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize()
  ;(mesh as any).rotationSpeed = THREE.MathUtils.randFloat(0.05, 0.3)
  return mesh
}

function createRandomSpotTexture(): HTMLCanvasElement {
  const resolution = 256
  const canvas = document.createElement('canvas')
  canvas.width = resolution
  canvas.height = resolution
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = 'black'
  ctx.fillRect(0, 0, resolution, resolution)
  const layerCount = THREE.MathUtils.randInt(2, 5)
  for (let i = 0; i < layerCount; i++) {
    const centerX = Math.random() * resolution
    const centerY = Math.random() * resolution
    const radius = Math.random() * resolution * 0.5
    const grd = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
    grd.addColorStop(0, `hsl(${Math.random() * 360},70%,60%)`)
    grd.addColorStop(0.5, `hsl(${Math.random() * 360},80%,50%)`)
    grd.addColorStop(1, `hsl(${Math.random() * 360},90%,30%)`)
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
    ctx.fillStyle = grd
    ctx.fill()
  }
  return canvas
}

interface BlackHoleGroup extends THREE.Group { rotationAxis: THREE.Vector3; rotationSpeed: number }
const blackHoleGroups: BlackHoleGroup[] = []

function createAdvancedBlackHole() {
  const bhGroup = new THREE.Group() as BlackHoleGroup
  const singularityGeo = new THREE.SphereGeometry(30, 32, 32)
  const singularityMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x000022, emissiveIntensity: 0.6, roughness: 0.9 })
  const singularity = new THREE.Mesh(singularityGeo, singularityMat)
  bhGroup.add(singularity)

  const accretionGeo = new THREE.TorusGeometry(60, 10, 32, 100)
  const accretionMat = createAccretionDiskMaterial()
  const accretionDisk = new THREE.Mesh(accretionGeo, accretionMat)
  accretionDisk.rotation.x = Math.PI / 2
  bhGroup.add(accretionDisk)

  bhGroup.rotationAxis = new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize()
  bhGroup.rotationSpeed = THREE.MathUtils.randFloat(0.1, 0.3)
  return bhGroup
}

function createAccretionDiskMaterial(): THREE.ShaderMaterial {
  const uniforms = { uTime: { value: 0 }, colorInner: { value: new THREE.Color(0xff9900) }, colorOuter: { value: new THREE.Color(0x110000) } }
  const vertexShader = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`
  const fragmentShader = `uniform float uTime; uniform vec3 colorInner; uniform vec3 colorOuter; varying vec2 vUv; void main(){ float r = length(vUv-0.5)*2.0; float swirl = sin(uTime + 10.0*r)*0.3; float mixVal = clamp(r+swirl, 0.0,1.0); vec3 col = mix(colorInner, colorOuter, mixVal); gl_FragColor=vec4(col,1.0); }`
  return new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, side: THREE.DoubleSide })
}

interface WormHoleGroup extends THREE.Group { rotationAxis: THREE.Vector3; rotationSpeed: number }
const wormHoleGroups: WormHoleGroup[] = []

function createAdvancedWormHole() {
  const whGroup = new THREE.Group() as WormHoleGroup
  const coreGeo = new THREE.SphereGeometry(20, 32, 32)
  const coreMat = new THREE.MeshStandardMaterial({ color: 0x5500ff, emissive: 0x220055, emissiveIntensity: 0.5, roughness: 0.5 })
  const coreMesh = new THREE.Mesh(coreGeo, coreMat)
  whGroup.add(coreMesh)

  const ringGeo = new THREE.TorusGeometry(40, 8, 32, 100)
  const ringMat = createWormHoleRingMaterial()
  const ringMesh = new THREE.Mesh(ringGeo, ringMat)
  ringMesh.rotation.x = Math.PI / 2
  whGroup.add(ringMesh)

  whGroup.rotationAxis = new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize()
  whGroup.rotationSpeed = THREE.MathUtils.randFloat(0.05, 0.3)
  return whGroup
}

function createWormHoleRingMaterial(): THREE.ShaderMaterial {
  const uniforms = { uTime: { value: 0 }, colorInner: { value: new THREE.Color(0xaa00ff) }, colorOuter: { value: new THREE.Color(0x000022) } }
  const vertexShader = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`
  const fragmentShader = `uniform float uTime; uniform vec3 colorInner; uniform vec3 colorOuter; varying vec2 vUv; void main(){ float r = length(vUv-0.5)*1.5; float swirl= sin(uTime*1.5+ 8.0*r)*0.3; float mixVal = clamp(r+swirl,0.0,1.0); vec3 col = mix(colorInner, colorOuter, mixVal); gl_FragColor=vec4(col,1.0); }`
  return new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, side: THREE.DoubleSide })
}

function createAsteroids(count: number) {
  for (let i = 0; i < count; i++) {
    const radius = THREE.MathUtils.randFloat(5, 30)
    const asteroidMesh = createOneAsteroid(radius)
    const r = Math.random() * SPACE_RADIUS
    const theta = Math.random() * 2 * Math.PI
    const phi = Math.acos(2 * Math.random() - 1)
    asteroidMesh.position.set(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi))
    scene.add(asteroidMesh)

    const shape = new Sphere(radius)
    const asteroidBody = new Body({
      mass: 1,
      shape,
      position: new Vec3(asteroidMesh.position.x, asteroidMesh.position.y, asteroidMesh.position.z),
      velocity: new Vec3(THREE.MathUtils.randFloatSpread(10), THREE.MathUtils.randFloatSpread(10), THREE.MathUtils.randFloatSpread(10)),
    })
    asteroidBody.addEventListener('collide', (evt: any) => {
      console.log('Asteroid collision detected')
      const mat = asteroidMesh.material as THREE.MeshStandardMaterial
      mat.emissive.set(0xff0000)
      setTimeout(() => mat.emissive.set(0x111111), 300)
    })
    world.addBody(asteroidBody)
    physicsAsteroidArray.push({ mesh: asteroidMesh, body: asteroidBody })
  }
}

function createOneAsteroid(radius: number) {
  const subdivision = 3
  const asteroidGeo = new THREE.IcosahedronGeometry(radius, subdivision)
  const noise = new ImprovedNoise()
  const posAttr = asteroidGeo.attributes.position
  for (let j = 0; j < posAttr.count; j++) {
    const x = posAttr.getX(j)
    const y = posAttr.getY(j)
    const z = posAttr.getZ(j)
    const n = noise.noise(x * 0.1, y * 0.1, z * 0.1)
    const offset = n * 2
    posAttr.setXYZ(j, x + offset, y + offset, z + offset)
  }
  posAttr.needsUpdate = true
  asteroidGeo.computeVertexNormals()

  const textureLoader = new THREE.TextureLoader()
  const asteroidColorMap = textureLoader.load('@/assets/9199c4502853ca342112294e608a011d.jpg')
  const asteroidNormalMap = textureLoader.load('@/assets/9199c4502853ca342112294e608a011d.jpg')
  const asteroidMat = new THREE.MeshStandardMaterial({ map: asteroidColorMap, normalMap: asteroidNormalMap, roughness: 0.9, emissive: new THREE.Color(0x111111), emissiveIntensity: 0.2 })

  const asteroidMesh = new THREE.Mesh(asteroidGeo, asteroidMat)
  asteroidMesh.castShadow = true
  asteroidMesh.receiveShadow = true
  ;(asteroidMesh as any).rotationAxis = new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize()
  ;(asteroidMesh as any).rotationSpeed = THREE.MathUtils.randFloat(0.2, 1.0)
  return asteroidMesh
}

function createDynamicStarField() {
  const positions = new Float32Array(STAR_COUNT * 3)
  const sizes = new Float32Array(STAR_COUNT)
  const phases = new Float32Array(STAR_COUNT)
  for (let i = 0; i < STAR_COUNT; i++) {
    const r = Math.random() * SPACE_RADIUS
    const theta = Math.random() * 2 * Math.PI
    const phi = Math.acos(2 * Math.random() - 1)
    positions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    positions[i * 3 + 2] = r * Math.cos(phi)
    sizes[i] = 1.0 + Math.random() * 2.0
    phases[i] = Math.random() * Math.PI * 2
  }
  starGeometry = new THREE.BufferGeometry()
  starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  starGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  starGeometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))

  const starTex = createCircleTexture()
  starMaterial = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uMap: { value: starTex } }, vertexShader: starVertexShader, fragmentShader: starFragmentShader, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
  starPoints = new THREE.Points(starGeometry, starMaterial)
  scene.add(starPoints)
}

function createCircleTexture(): THREE.CanvasTexture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.2, 'rgba(255,255,255,1)')
  grad.addColorStop(0.4, 'rgba(255,255,255,0.8)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size) 
  return new THREE.CanvasTexture(canvas)
}

function initPhysics() {
  world = new World({ gravity: new Vec3(0, 0, 0) })
  const defaultMat = new Material('default')
  const defaultContactMat = new ContactMaterial(defaultMat, defaultMat, { friction: 0.01, restitution: 0.9 })
  world.addContactMaterial(defaultContactMat)
  world.defaultContactMaterial = defaultContactMat

  playerBody = new Body({ mass: 1, shape: new Sphere(100), position: new Vec3(0, 100, 300) })
  world.addBody(playerBody)
  playerBody.addEventListener('collide', (evt: any) => {
    console.log('Player collided with:', evt.body)
    handleCollision(evt.body)
  })
}

function initThree() {
  if (!container.value) return
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000000)
  currentScene = scene

  const w = container.value.clientWidth
  const h = container.value.clientHeight
  camera = new THREE.PerspectiveCamera(75, w / h, 0.1, SPACE_RADIUS * 2)
  camera.position.set(0, 100, 300)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(w, h)
  renderer.shadowMap.enabled = true
  container.value.appendChild(renderer.domElement)

  const ambient = new THREE.AmbientLight(0xffffff, 0.2)
  scene.add(ambient)
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.6)
  dirLight.position.set(5000, 5000, 5000)
  dirLight.castShadow = true
  scene.add(dirLight)

  initPostProcessing(w, h)

  if (!isMobile) {
    pointerControls = new PointerLockControls(camera, renderer.domElement)
    scene.add(pointerControls.getObject())
  }

  createDynamicStarField()
  const sunMesh = createSun(2000)
  sunMesh.position.set(-7000, 0, 0)
  scene.add(sunMesh)

  const earthMesh = createEarth(80)
  earthMesh.position.set(0, 100, -100)
  scene.add(earthMesh)

  const moonMesh = createMoon(30)
  earthMesh.add(moonMesh)
  moonMesh.position.set(300, 0, 0)

  createAsteroids(80)
}

function initPostProcessing(w: number, h: number) {
  renderScene = new RenderPass(currentScene, camera)
  glitchPass = new GlitchPass()
  glitchPass.enabled = true
  glitchTimeout = window.setTimeout(() => (glitchPass.enabled = false), 3000)
  bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 2.0, 0.3, 0.4)
  composer = new EffectComposer(renderer)
  composer.addPass(gradientPass)
  composer.addPass(renderScene)
  composer.addPass(bloomPass)
  composer.addPass(glitchPass)
}

function toggleMovement() {
  isMoving.value = !isMoving.value
  if (!isMoving.value) currentVelocity.value.multiplyScalar(0.7)
}

function togglePause() {
  isPaused.value = !isPaused.value
  if (!isPaused.value) animate()
}

function handleCollision(body: Body) {
  const target = dynamicObjectsArray.find((obj) => obj.body === body) || physicsAsteroidArray.find((obj) => obj.body === body)
  if (target && !isInPlanet.value) {
    console.log('Entering planet space due to collision with:', target)
    enterPlanetSpace(body)
  }
}

function enterPlanetSpace(body: Body) {
  const physicsObject = dynamicObjectsArray.find((obj) => obj.body === body) || physicsAsteroidArray.find((obj) => obj.body === body)
  if (!physicsObject) return

  const mesh = physicsObject.mesh
  isInPlanet.value = true
  planetTheme = extractThemeFromMesh(mesh)
  planetScene = createPlanetScene(planetTheme)
  currentScene = planetScene
  renderScene.scene = currentScene
  scene.background = null // 移除宇宙背景，避免干扰

  camera.position.set(0, 500, 0)
  playerBody.position.set(0, 500, 0)
  console.log('Switched to planet scene')
  addAtmosphereBoundary()
}

function exitPlanetSpace() {
  isInPlanet.value = false
  currentScene = scene
  renderScene.scene = currentScene
  scene.background = new THREE.Color(0x000000) // 恢复宇宙背景
  planetScene = null
  planetTheme = null

  const offset = new THREE.Vector3(THREE.MathUtils.randFloatSpread(2000), THREE.MathUtils.randFloatSpread(2000), THREE.MathUtils.randFloatSpread(2000))
  camera.position.add(offset)
  playerBody.position.set(camera.position.x, camera.position.y, camera.position.z)
  console.log('Exited planet space')
}

function extractThemeFromMesh(mesh: THREE.Mesh | THREE.Group): { baseColor: THREE.Color; auroraColor?: THREE.Color } {
  let baseColor = new THREE.Color(0xaaaaaa)
  let auroraColor: THREE.Color | undefined

  if (mesh instanceof THREE.Mesh) {
    const mat = mesh.material as THREE.MeshStandardMaterial | THREE.ShaderMaterial
    if (mat instanceof THREE.MeshStandardMaterial && mat.map) {
      baseColor = mat.color || new THREE.Color(0xaaaaaa)
    } else if (mat instanceof THREE.ShaderMaterial) {
      if (mat.uniforms.color1 && mat.uniforms.color2) {
        baseColor = mat.uniforms.color1.value.clone().lerp(mat.uniforms.color2.value, 0.5)
        if (mat.uniforms.colorAurora) auroraColor = mat.uniforms.colorAurora.value
      }
    }
  } else if (mesh instanceof THREE.Group) {
    mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.ShaderMaterial) {
        const mat = child.material
        if (mat.uniforms.colorInner) baseColor = mat.uniforms.colorInner.value
      }
    })
  }
  return { baseColor, auroraColor }
}

function createPlanetScene(theme: { baseColor: THREE.Color; auroraColor?: THREE.Color }): THREE.Scene {
  const newScene = new THREE.Scene()
  const skyGeo = new THREE.SphereGeometry(10000, 64, 64)
  const skyMat = new THREE.ShaderMaterial({
    uniforms: { topColor: { value: theme.auroraColor || theme.baseColor.clone().multiplyScalar(1.5) }, bottomColor: { value: theme.baseColor.clone().multiplyScalar(0.5) }, uTime: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 topColor; uniform vec3 bottomColor; uniform float uTime; varying vec2 vUv; void main() { float t = vUv.y; vec3 color = mix(bottomColor, topColor, t); gl_FragColor = vec4(color, 1.0); }`,
    side: THREE.BackSide,
  })
  const skyMesh = new THREE.Mesh(skyGeo, skyMat)
  newScene.add(skyMesh)

  const groundGeo = new THREE.PlaneGeometry(10000, 10000, 64, 64)
  const noise = new ImprovedNoise()
  const posAttr = groundGeo.attributes.position
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i)
    const z = posAttr.getZ(i)
    const height = noise.noise(x * 0.01, z * 0.01, 0) * 50
    posAttr.setY(i, height)
  }
  posAttr.needsUpdate = true
  groundGeo.computeVertexNormals()
  const groundMat = new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.8, metalness: 0.1 }) // 红色地面，便于区分
  const ground = new THREE.Mesh(groundGeo, groundMat)
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -100
  newScene.add(ground)

  const particleCount = 100
  const particlesGeo = new THREE.BufferGeometry()
  const positions = new Float32Array(particleCount * 3)
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = THREE.MathUtils.randFloatSpread(2000)
    positions[i * 3 + 1] = THREE.MathUtils.randFloat(100, 1000)
    positions[i * 3 + 2] = THREE.MathUtils.randFloatSpread(2000)
  }
  particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const particlesMat = new THREE.PointsMaterial({ color: theme.baseColor, size: 5, transparent: true, blending: THREE.AdditiveBlending })
  const particles = new THREE.Points(particlesGeo, particlesMat)
  newScene.add(particles)

  const ambient = new THREE.AmbientLight(0xffffff, 0.3)
  newScene.add(ambient)
  const sunLight = new THREE.DirectionalLight(theme.baseColor.clone().multiplyScalar(1.2), 0.8)
  sunLight.position.set(500, 1000, 500)
  newScene.add(sunLight)

  newScene.fog = new THREE.Fog(theme.baseColor.clone().multiplyScalar(0.5), 100, 2000)
  return newScene
}

let atmosphereBoundaryBody: Body
function addAtmosphereBoundary() {
  const boundaryRadius = 1500
  atmosphereBoundaryBody = new Body({ mass: 0, shape: new Sphere(boundaryRadius), position: new Vec3(0, 0, 0) })
  world.addBody(atmosphereBoundaryBody)
  atmosphereBoundaryBody.addEventListener('collide', (evt: any) => {
    console.log('Collided with boundary')
    if (evt.body === playerBody && isInPlanet.value) exitPlanetSpace()
  })
}

function spawnRandomObjectAtPlayerVicinity() {
  const randType = THREE.MathUtils.randInt(0, 6)
  let mesh: THREE.Mesh | THREE.Group
  let radius = 50

  if (randType === 0) { mesh = createSwirlAuroraPlanet(THREE.MathUtils.randFloat(50, 120)); radius = 80 }
  else if (randType === 1) { mesh = createRingedPlanet(THREE.MathUtils.randFloat(60, 120)); radius = 90 }
  else if (randType === 2) { mesh = createRandomSpotPlanet(THREE.MathUtils.randFloat(40, 100)); radius = 70 }
  else if (randType === 3) { const bh = createAdvancedBlackHole(); mesh = bh; radius = 60 }
  else if (randType === 4) { const wh = createAdvancedWormHole(); mesh = wh; radius = 50 }
  else if (randType === 5) { mesh = createOneAsteroid(THREE.MathUtils.randFloat(10, 40)); radius = 30 }
  else { mesh = createOneSmallStar(THREE.MathUtils.randFloat(3, 10)); radius = 10 }

  const dist = THREE.MathUtils.randFloat(500, 1000) // 减小生成距离
  const theta = Math.random() * 2 * Math.PI
  const phi = Math.acos(2 * Math.random() - 1)
  const offsetX = dist * Math.sin(phi) * Math.cos(theta)
  const offsetY = dist * Math.sin(phi) * Math.sin(theta)
  const offsetZ = dist * Math.cos(phi)
  const playerPos = camera.position.clone()
  mesh.position.set(playerPos.x + offsetX, playerPos.y + offsetY, playerPos.z + offsetZ)
  scene.add(mesh)

  const shape = new Sphere(radius)
  const body = new Body({
    mass: 1,
    shape,
    position: new Vec3(mesh.position.x, mesh.position.y, mesh.position.z),
    velocity: new Vec3(THREE.MathUtils.randFloatSpread(20), THREE.MathUtils.randFloatSpread(20), THREE.MathUtils.randFloatSpread(20)),
  })
  body.addEventListener('collide', (evt: any) => {
    console.log('Dynamic object collision detected')
    if (mesh instanceof THREE.Group) {
      mesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) child.material.emissive.set(0xff0000)
      })
      setTimeout(() => {
        mesh.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) child.material.emissive.set(0x000000)
        })
      }, 300)
    } else {
      const mat = mesh.material as THREE.MeshStandardMaterial
      mat.emissive.set(0xff0000)
      setTimeout(() => mat.emissive.set(0x111111), 300)
    }
  })
  world.addBody(body)
  dynamicObjectsArray.push({ mesh, body })
}

function createOneSmallStar(radius: number) {
  const starGeo = new THREE.SphereGeometry(radius, 16, 16)
  const starMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.0, roughness: 0.2 })
  const starMesh = new THREE.Mesh(starGeo, starMat)
  ;(starMesh as any).rotationAxis = new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize()
  ;(starMesh as any).rotationSpeed = THREE.MathUtils.randFloat(0.05, 0.3)
  return starMesh
}

function startAutoSpawn() {
  spawnIntervalId = window.setInterval(() => {
    const num = THREE.MathUtils.randInt(1, 3)
    for (let i = 0; i < num; i++) spawnRandomObjectAtPlayerVicinity()
  }, 5 * 1000)
}

function animate() {
  if (isPaused.value) return
  const clock = new THREE.Clock()
  let accumulator = 0
  const fixedTimeStep = 1.0 / 60.0
  let elapsed = 0

  function render() {
    if (isPaused.value) return
    animationId = requestAnimationFrame(render)
    const delta = clock.getDelta()
    elapsed += delta
    accumulator += delta

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize()
    const right = new THREE.Vector3().copy(forward).cross(camera.up).normalize()
    const moveDirection = new THREE.Vector3()

    if (keysPressed.w) moveDirection.add(forward)
    if (keysPressed.s) moveDirection.add(forward.clone().multiplyScalar(-1))
    if (keysPressed.a) moveDirection.add(right.clone().multiplyScalar(-1))
    if (keysPressed.d) moveDirection.add(right)
    if (keysPressed.space) moveDirection.add(camera.up)
    if (keysPressed.shift) moveDirection.add(camera.up.clone().multiplyScalar(-1))
    if (isMoving.value) moveDirection.add(forward.clone().multiplyScalar(2))

    const moveSpeed = isInPlanet.value ? 500 : 300
    if (moveDirection.length() > 0) {
      moveDirection.normalize()
      currentVelocity.value.add(moveDirection.multiplyScalar((isMoving.value ? autoFlightAcceleration : acceleration) * delta))
    }
    currentVelocity.value.multiplyScalar(friction)
    const speedLimit = isMoving.value ? targetSpeed.value : maxManualSpeed
    if (currentVelocity.value.length() > speedLimit) currentVelocity.value.normalize().multiplyScalar(speedLimit)
    camera.position.add(currentVelocity.value.clone().multiplyScalar(delta * 60))

    while (accumulator >= fixedTimeStep) {
      world.step(fixedTimeStep)
      accumulator -= fixedTimeStep
    }
    playerBody.position.set(camera.position.x, camera.position.y, camera.position.z)

    if (isInPlanet.value && planetScene) {
      planetScene.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.material instanceof THREE.ShaderMaterial) {
          obj.material.uniforms.uTime.value = elapsed
        }
      })
      if (camera.position.y > -90) {
        camera.position.y -= 200 * delta
        playerBody.position.y = camera.position.y
      }
      const upVec = camera.up.clone().normalize()
      const dir = new THREE.Vector3()
      if (keysPressed.w) dir.add(forward)
      if (keysPressed.s) dir.addScaledVector(forward, -1)
      if (keysPressed.a) dir.addScaledVector(right, -1)
      if (keysPressed.d) dir.add(right)
      if (keysPressed.space) dir.add(upVec)
      if (keysPressed.shift) dir.addScaledVector(upVec, -1)
      if (dir.length() > 0) {
        dir.normalize()
        camera.position.addScaledVector(dir, moveSpeed * delta)
      }
    } else {
      if (starMaterial) starMaterial.uniforms.uTime.value = elapsed
      scene.traverse((obj) => {
        if (obj instanceof THREE.Points && obj.material instanceof THREE.ShaderMaterial) {
          if (obj.material.uniforms.uTime) obj.material.uniforms.uTime.value = elapsed
        }
      })
      physicsAsteroidArray.forEach(({ mesh, body }) => {
        mesh.position.set(body.position.x, body.position.y, body.position.z)
        mesh.quaternion.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w)
        const ax = (mesh as any).rotationAxis
        const sp = (mesh as any).rotationSpeed
        if (ax && sp) mesh.rotateOnAxis(ax, sp * delta)
      })
      dynamicObjectsArray.forEach(({ mesh, body }) => {
        mesh.position.set(body.position.x, body.position.y, body.position.z)
        mesh.quaternion.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w)
        const ax = (mesh as any).rotationAxis
        const sp = (mesh as any).rotationSpeed
        if (ax && sp) mesh.rotateOnAxis(ax, sp * delta)
      })
      blackHoleGroups.forEach((grp) => {
        grp.rotateOnAxis(grp.rotationAxis, grp.rotationSpeed * delta)
        grp.children.forEach((child) => {
          if ((child as THREE.Mesh).material instanceof THREE.ShaderMaterial) {
            const mat = (child as THREE.Mesh).material as THREE.ShaderMaterial
            if (mat.uniforms && mat.uniforms.uTime) mat.uniforms.uTime.value = elapsed
          }
        })
      })
      wormHoleGroups.forEach((grp) => {
        grp.rotateOnAxis(grp.rotationAxis, grp.rotationSpeed * delta)
        grp.children.forEach((child) => {
          if ((child as THREE.Mesh).material instanceof THREE.ShaderMaterial) {
            const mat = (child as THREE.Mesh).material as THREE.ShaderMaterial
            if (mat.uniforms && mat.uniforms.uTime) mat.uniforms.uTime.value = elapsed
          }
        })
      })
      scene.traverse((obj) => {
        if (obj.type === 'Mesh' && (obj as any).rotationAxis) {
          const axis = (obj as any).rotationAxis
          const speed = (obj as any).rotationSpeed
          if (axis && speed) obj.rotateOnAxis(axis, speed * delta)
          const mat = (obj as THREE.Mesh).material as THREE.ShaderMaterial
          if (mat && mat.uniforms && mat.uniforms.uTime) mat.uniforms.uTime.value = elapsed
        }
      })

      const upVec = camera.up.clone().normalize()
      const dir = new THREE.Vector3()
      if (keysPressed.w) dir.add(forward)
      if (keysPressed.s) dir.addScaledVector(forward, -1)
      if (keysPressed.a) dir.addScaledVector(right, -1)
      if (keysPressed.d) dir.add(right)
      if (keysPressed.space) dir.add(upVec)
      if (keysPressed.shift) dir.addScaledVector(upVec, -1)
      if (dir.length() > 0) {
        dir.normalize()
        camera.position.addScaledVector(dir, moveSpeed * delta)
      }
    }

    if (isMoving.value) {
      if (MOVE_SPEED.value < targetSpeed.value) {
        MOVE_SPEED.value += acceleration * delta
        if (MOVE_SPEED.value > targetSpeed.value) MOVE_SPEED.value = targetSpeed.value
      } else if (MOVE_SPEED.value > targetSpeed.value) {
        MOVE_SPEED.value -= deceleration * delta
        if (MOVE_SPEED.value < targetSpeed.value) MOVE_SPEED.value = targetSpeed.value
      } else {
        MOVE_SPEED.value += THREE.MathUtils.randFloat(-1, 1) * 0.1
      }
      camera.position.addScaledVector(forward, MOVE_SPEED.value * delta)
    } else {
      if (MOVE_SPEED.value > 0) {
        MOVE_SPEED.value -= deceleration * delta
        if (MOVE_SPEED.value < 0) MOVE_SPEED.value = 0
      }
    }
    gradientPass.material.uniforms.uTime.value = elapsed
    renderScene.scene = currentScene // 强制更新渲染场景
    composer.render()
    console.log('Rendering scene:', currentScene === scene ? 'Universe' : 'Planet') // 调试当前渲染场景
  }
  render()
}

const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
let touchStartX = 0
let touchStartY = 0
let isTouching = false
let initialPinchDistance = 0
let initialCameraFov = 75
let initialRotation = { x: 0, y: 0 }
let lastRotation = { x: 0, y: 0 }
const touchSensitivity = 0.002

function getDistance(touch1: Touch, touch2: Touch): number {
  const dx = touch2.clientX - touch1.clientX
  const dy = touch2.clientY - touch1.clientY
  return Math.sqrt(dx * dx + dy * dy)
}

function onTouchStart(e: TouchEvent) {
  if (e.touches.length === 1) {
    isTouching = true
    touchStartX = e.touches[0].clientX
    touchStartY = e.touches[0].clientY
  } else if (e.touches.length === 2) {
    isTouching = false
    initialPinchDistance = getDistance(e.touches[0], e.touches[1])
    initialCameraFov = camera.fov
    lastRotation = { x: camera.rotation.x, y: camera.rotation.y }
    initialRotation = { x: (e.touches[1].clientY - e.touches[0].clientY) / 2, y: (e.touches[1].clientX - e.touches[0].clientX) / 2 }
  }
}

function onTouchMove(e: TouchEvent) {
  if (isTouching && e.touches.length === 1) {
    const touchX = e.touches[0].clientX
    const touchY = e.touches[0].clientY
    const deltaX = (touchX - touchStartX) * touchSensitivity
    const deltaY = (touchY - touchStartY) * touchSensitivity
    camera.rotation.y -= deltaX
    camera.rotation.x -= deltaY
    touchStartX = touchX
    touchStartY = touchY
  } else if (e.touches.length === 2) {
    e.preventDefault()
    const touch1 = e.touches[0]
    const touch2 = e.touches[1]
    const currentDistance = getDistance(touch1, touch2)
    const distanceDelta = currentDistance - initialPinchDistance
    const zoomSensitivity = 0.05
    camera.fov = initialCameraFov - distanceDelta * zoomSensitivity
    camera.fov = THREE.MathUtils.clamp(camera.fov, 30, 100)
    camera.updateProjectionMatrix()

    const currentRotation = { x: (touch2.clientY - touch1.clientY) / 2, y: (touch2.clientX - touch1.clientX) / 2 }
    const deltaRotation = { x: currentRotation.x - initialRotation.x, y: currentRotation.y - initialRotation.y }
    camera.rotation.x = lastRotation.x - deltaRotation.x * touchSensitivity
    camera.rotation.y = lastRotation.y - deltaRotation.y * touchSensitivity
  }
}

function onTouchEnd(e: TouchEvent) {
  if (e.touches.length < 2) initialPinchDistance = 0
  if (e.touches.length === 0) isTouching = false
}

function onWindowResize() {
  if (!container.value) return
  const w = container.value.clientWidth
  const h = container.value.clientHeight
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h)
  composer.setSize(w, h)
}

onMounted(() => {
  initPhysics()
  initThree()
  window.addEventListener('resize', onWindowResize)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  if (isMobile) {
    window.addEventListener('touchstart', onTouchStart, { passive: false })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd, { passive: false })
  }
  animate()
  startAutoSpawn()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  if (isMobile) {
    window.removeEventListener('touchstart', onTouchStart)
    window.removeEventListener('touchmove', onTouchMove)
    window.removeEventListener('touchend', onTouchEnd)
  }
  cancelAnimationFrame(animationId)
  renderer.dispose()
  if (glitchTimeout) clearTimeout(glitchTimeout)
  if (spawnIntervalId) clearInterval(spawnIntervalId)

  if (starPoints) {
    scene.remove(starPoints)
    starGeometry.dispose()
    starMaterial.dispose()
  }
  dynamicObjectsArray.forEach(({ mesh }) => {
    scene.remove(mesh)
    if (mesh instanceof THREE.Mesh) {
      mesh.geometry.dispose()
      ;(mesh.material as any).dispose()
    } else {
      mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose()
          ;(child.material as any).dispose()
        }
      })
    }
  })
})
</script>

<style scoped>
.particle-background {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100dvh;
  background-color: black;
  overflow: hidden;
}

@media (max-width: 768px) {
  .move-button { display: none; }
}

.move-button {
  display: block;
  position: fixed;
  padding: 10px 20px;
  background-color: rgba(255, 255, 255, 0.08);
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  z-index: 2;
  color: #fff;
}
.move-button:hover { background-color: rgba(255, 255, 255, 0.277); }

.npc-container {
  position: fixed;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 100%;
  z-index: 2000;
}

.speed-max {
  position: absolute;
  top: 10px;
  right: 2px;
  padding: 10px;
  border-radius: 5px;
  z-index: 2;
  font-size: 14px;
}

.speed-gauge1 {
  font-size: 30px;
  font-family: Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif;
}

.speed-gauge {
  font-size: 30px;
  font-family: Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif;
  color: transparent;
  background: linear-gradient(270deg, #39ffc0, #69fadb, #68e1ff, #9f9eff, #ff73c9, #ff738a, #39ffc0);
  background-size: 600% 600%;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: auroraFlow 6s ease-in-out infinite;
}

@keyframes auroraFlow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@media (max-width: 768px) {
  .speed-max { top: 60px; right: 2px; }
}
</style>