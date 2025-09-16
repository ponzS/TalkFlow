<!-- src/views/LanguageSelectionPage.vue -->
<!-- eslint-disable vue/multi-word-component-names -->
<template>

   <div class="aurora-background1" @click="winupStart">
  </div>

    <canvas ref="canvas" class="aurora-background" @click="winupStart"/>

  

 
</template>

<style scoped>






.aurora-background {
  width: 100%;
  height: 100%;
  margin: 0;
  /* position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0; */

  z-index: -3;

}
/* .aurora-background1 {
  width: 100%;
  height: 100%;
  margin: 0;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  backdrop-filter: blur(20px);
  transition: all 0.3s ease-in-out;

  z-index: -2;

} */

/* @media (max-width: 768px) {
  .aurora-background {
    transform: scale(1);
    transition: all 0.5s ease-in-out;
  }
} */


canvas {
  filter: blur(10px);
  width: 100% !important;
  height: 100% !important;
  background: transparent !important;
  position: absolute;
  top: 0;
  left: 0;
  /* right: 0;
  bottom: 0; */
  z-index: -3; /* 确保可见，但不遮挡内容 */
}


</style>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'

const canvas = ref<HTMLCanvasElement | null>(null);



const purpleColors = {
  color1: new THREE.Color(0xd8a7f7), // 淡紫色
  color2: new THREE.Color(0x9b7bde), // 柔和的紫色
  color3: new THREE.Color(0x7c56b8), // 浅紫色
}
const purpleColors1 = {
  color1: new THREE.Color(0xd8a7f7), // 淡紫色
  color2: new THREE.Color(0x9b7bde), // 柔和的紫色
  color3: new THREE.Color(0x7c56b8), // 浅紫色
}

const neonColors = {
  color1: new THREE.Color(0x00f0ff), // 明亮的蓝色
  color2: new THREE.Color(0x00b8b8), // 蓝绿色
  color3: new THREE.Color(0x005555), // 深色调
}

const auroraColors = {
  color1: new THREE.Color(0xffc0cb), // 浅粉色
  color2: new THREE.Color(0xffa7c7), // 柔和的粉色
  color3: new THREE.Color(0xff77a9), // 中等粉色
}

const sunsetColors = {
  color1: new THREE.Color(0x000000), // 纯黑色
  color2: new THREE.Color(0x808080), // 中灰色
  color3: new THREE.Color(0xffffff), // 纯白色
}
// const vibrantOrangeColors = {
//   color1: new THREE.Color(0xff6600), // 深橙色
//   color2: new THREE.Color(0xff9900), // 明亮的橙黄色
//   color3: new THREE.Color(0xffcc00), // 明黄色
//   color4: new THREE.Color(0xff5733), // 较深的红橙色
//   color5: new THREE.Color(0xd35400), // 暗橙色
//   color6: new THREE.Color(0x8b3e2f), // 带点红棕色的暗橙色
// }
const deepSpaceColors = {
  color1: new THREE.Color(0x132742), // 深空蓝
  color2: new THREE.Color(0x2e1b47), // 深紫色
  color3: new THREE.Color(0x005555), // 黑色
}
const ponzsColors = {
  color1: new THREE.Color(0x20e6df),
  color2: new THREE.Color(0xaf2ab8),
  color3: new THREE.Color(0x6d274f),
}
const ponzsColors1 = {
  color1: new THREE.Color(0x20e6df),
  color2: new THREE.Color(0xaf2ab8),
  color3: new THREE.Color(0x6d274f),
}
// 当前和目标色系
const colors = ref(ponzsColors)
const targetColors = ref(ponzsColors)
const transitionSpeed = 0.05 // 渐变速度

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let clock: THREE.Clock
let object: THREE.Mesh




// 初始化 Three.js 场景
const initThreeJS = (canvas: HTMLCanvasElement) => {
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000)

// 设置 alpha: true 以启用透明背景
renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  
  // 清除默认背景颜色
  renderer.setClearColor(0x000000, 0); // 第二个参数 0 表示完全透明



  // renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  clock = new THREE.Clock()

  createAuroraObject()

  camera.position.set(0, 0, 15)
  camera.lookAt(0, 0, 0)

  animate()
}

// 创建动态物体
const createAuroraObject = () => {
  const geometry = new THREE.IcosahedronGeometry(10, 4)
  geometry.computeVertexNormals()

  const material = new THREE.ShaderMaterial({
    vertexShader: vertexShader(),
    fragmentShader: fragmentShader(),
    uniforms: {
      time: { value: 0 },
      color1: { value: colors.value.color1 },
      color2: { value: colors.value.color2 },
      color3: { value: colors.value.color3 },
    },
    side: THREE.DoubleSide,
    wireframe: false,
  })

  object = new THREE.Mesh(geometry, material)
  scene.add(object)
}

// 顶点着色器
const vertexShader = () => `
  uniform float time;
  varying vec3 vPosition;
  varying float vNoise;
  void main() {
    vPosition = position;
    vNoise = sin(position.x * 10.0 + time) * 0.5;
    vec3 newPosition = position + normal * vNoise;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`

// 片段着色器
const fragmentShader = () => `
  uniform vec3 color1;
  uniform vec3 color2;
  uniform vec3 color3;
  varying float vNoise;
  void main() {
    vec3 color = mix(color1, color2, vNoise);
    color = mix(color, color3, abs(sin(vNoise * 2.0)));
    gl_FragColor = vec4(color, 1.0);
  }
`

// 动画循环
const animate = () => {
  requestAnimationFrame(animate)

  const time = clock.getElapsedTime()
  const material = object.material as THREE.ShaderMaterial
  material.uniforms.time.value = time

  // 更新颜色渐变
  updateColorTransition()

  object.rotation.x += 0.002
  object.rotation.y += 0.002

  renderer.render(scene, camera)
}

// 颜色渐变：每一帧逐步插值至目标颜色
const updateColorTransition = () => {
  colors.value.color1.lerpHSL(targetColors.value.color1, transitionSpeed)
  colors.value.color2.lerpHSL(targetColors.value.color2, transitionSpeed)
  colors.value.color3.lerpHSL(targetColors.value.color3, transitionSpeed)

  const material = object.material as THREE.ShaderMaterial
  material.uniforms.color1.value = colors.value.color1
  material.uniforms.color2.value = colors.value.color2
  material.uniforms.color3.value = colors.value.color3
}

// 窗口大小变化时，更新渲染器和摄像机
const onWindowResize = () => {
  if (renderer && camera) {
    const width = window.innerWidth
    const height = window.innerHeight

    renderer.setSize(width, height)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }
}
const selectedColor = ref<string>('purple')
// 色系切换函数
const setDefaultColors = () => {
  targetColors.value = purpleColors
  selectedColor.value = 'purple'
}

const setPurpleColors = () => {
  targetColors.value = purpleColors1
  selectedColor.value = 'purple'
}

const setNeonColors = () => {
  targetColors.value = neonColors
  selectedColor.value = 'neon'
}

const setAuroraColors = () => {
  targetColors.value = auroraColors
  selectedColor.value = 'aurora'
}

const setSunsetColors = () => {
  targetColors.value = sunsetColors
  selectedColor.value = 'sunset'
}

const setDeepSpaceColors = () => {
  targetColors.value = deepSpaceColors
  selectedColor.value = 'deepSpace'
}

const setPonzsColors = () => {
  targetColors.value = ponzsColors
  selectedColor.value = 'ponzs'
}
const setPonzsColors1 = () => {
  targetColors.value = ponzsColors1
  selectedColor.value = 'ponzs1'
}

const setcolor = ref(false);

const winupStart = () => {
  setcolor.value = !setcolor.value;
  if(setcolor.value === false){
    setNeonColors();
   
  }else{
    setPonzsColors1();
 
  }
};


onMounted(async () => {




  if (canvas.value) {
    console.log('找到 Canvas，开始初始化 Three.js');
    try {
      await initThreeJS(canvas.value as HTMLCanvasElement);
      window.addEventListener('resize', onWindowResize);
      console.log('Three.js 初始化成功');
    } catch (err) {
      console.error('Three.js 初始化失败:', err);
    }
  } else {
    console.error('未找到 Canvas 元素');
  }
});



// 组件卸载时清理事件监听
onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize)
})

</script> 