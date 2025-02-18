<template>
  <div class="aurora-background">
    <!-- 渲染 Three.js 场景的 canvas 元素 -->
    <canvas ref="canvas" />
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, onBeforeUnmount, ref } from 'vue'
import * as THREE from 'three'

export default defineComponent({
  name: 'AuroraBackground',
  setup() {
    const canvas = ref<HTMLCanvasElement | null>(null) // 获取 canvas 元素

    let scene: THREE.Scene // Three.js 场景
    let camera: THREE.PerspectiveCamera // 透视摄像机
    let renderer: THREE.WebGLRenderer // WebGL 渲染器
    let clock: THREE.Clock // 用于获取时间
    let object: THREE.Mesh // 动态物体

    // 组件挂载后初始化 Three.js 场景
    onMounted(() => {
      if (canvas.value) {
        initThreeJS(canvas.value)
        // 页面尺寸变化时更新渲染器和摄像机
        window.addEventListener('resize', onWindowResize)
      }
    })

    // 组件卸载时清理事件监听
    onBeforeUnmount(() => {
      window.removeEventListener('resize', onWindowResize)
    })

    // 初始化 Three.js 场景
    const initThreeJS = (canvas: HTMLCanvasElement) => {
      scene = new THREE.Scene()
      camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000) // 创建透视摄像机
      renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true, // 设置渲染背景为透明
      }) // 创建 WebGL 渲染器
      renderer.setSize(window.innerWidth, window.innerHeight) // 设置渲染器大小
      renderer.setPixelRatio(window.devicePixelRatio) // 适配高分辨率屏幕
      clock = new THREE.Clock() // 创建时钟对象，用于计时

      // 创建动态极光效果的物体
      createAuroraObject()

      camera.position.set(0, 0, 22) // 设置摄像机的位置
      camera.lookAt(0, 0, 0) // 摄像机指向场景中心

      animate() // 启动动画循环
    }

    // 创建动态的极光物体
    const createAuroraObject = () => {
      // 创建一个光滑的几何体（使用 icosahedronGeometry，细分程度决定光滑程度）
      const geometry = new THREE.IcosahedronGeometry(10, 4) // 4 表示细分次数
      geometry.computeVertexNormals() // 计算顶点法线，确保光滑效果

      // 创建 ShaderMaterial 材质，应用动态渐变效果
      const material = new THREE.ShaderMaterial({
        vertexShader: vertexShader(), // 顶点着色器
        fragmentShader: fragmentShader(), // 片段着色器
        uniforms: {
          time: { value: 0 }, // 动态时间，用于控制物体形状变化
          color1: { value: new THREE.Color(0x20e6df) }, // 浅青色
          color2: { value: new THREE.Color(0xaf2ab8) }, // 紫红色
          color3: { value: new THREE.Color(0x6d274f) }, // 深紫色
        },
        side: THREE.DoubleSide, // 双面渲染
        wireframe: false, // 不使用线框模式，显示表面
      })

      // 创建一个网格对象并添加到场景中
      object = new THREE.Mesh(geometry, material)
      scene.add(object)
    }

    // 顶点着色器：控制物体的动态变化（使用噪声函数来拉伸物体的顶点）
    const vertexShader = () => `
      uniform float time;  // 声明 'time' 作为 uniform 变量
      varying vec3 vPosition;  // 传递顶点位置到片段着色器
      varying float vNoise;  // 传递噪声值到片段着色器
      void main() {
        vPosition = position;  // 将顶点的位置传递到片段着色器
        vNoise = sin(position.x * 10.0 + time) * 0.5;  // 根据时间变化生成噪声
        vec3 newPosition = position + normal * vNoise;  // 在法线方向上拉伸顶点
        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);  // 计算顶点的屏幕空间位置
      }
    `

    // 片段着色器：实现动态渐变效果（基于时间和噪声值的颜色混合）
    const fragmentShader = () => `
      uniform vec3 color1;  // 浅青色
      uniform vec3 color2;  // 紫红色
      uniform vec3 color3;  // 深紫色
      varying float vNoise;  // 从顶点着色器传递过来的噪声值
      void main() {
        vec3 color = mix(color1, color2, vNoise);  // 根据噪声值在颜色1和颜色2之间进行混合
        color = mix(color, color3, abs(sin(vNoise * 2.0)));  // 进一步与颜色3混合，增加动态感
        gl_FragColor = vec4(color, 1.0);  // 设置片段的最终颜色
      }
    `

    // 动画循环：每帧更新物体的形状和颜色
    const animate = () => {
      requestAnimationFrame(animate)

      const time = clock.getElapsedTime() // 获取当前的时间

      // 更新物体材质中的时间值
      const material = object.material as THREE.ShaderMaterial
      material.uniforms.time.value = time

      // 应用物体的旋转，增加动态效果
      object.rotation.x += 0.005
      object.rotation.y += 0.005

      // 渲染场景
      renderer.render(scene, camera)
    }

    // 窗口大小改变时，更新渲染器和摄像机的视口
    const onWindowResize = () => {
      if (renderer && camera) {
        const width = window.innerWidth
        const height = window.innerHeight

        renderer.setSize(width, height) // 更新渲染器的大小
        camera.aspect = width / height // 更新摄像机的宽高比
        camera.updateProjectionMatrix() // 更新投影矩阵
      }
    }

    return {
      canvas, // 返回 canvas 引用
    }
  },
})
</script>

<style scoped>
.aurora-background {
  width: 100dvw;
  height: 100dvh;
  margin: 0;
  position: fixed;
  top: 0;
  left: 0;
  z-index: -1;
  background-color: black; /* 设置背景透明 */
  pointer-events: none;
}
</style>
