<template>
    <div id="starfield" class="starfield-canvas"></div>
  </template>
  
  <script setup lang="ts">
  import { ref, shallowRef, onMounted, onUnmounted, watch } from 'vue'

  import * as THREE from 'three'
  // 创建圆形纹理
  const createStarTexture = () => {
    const size = 64
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const context = canvas.getContext('2d')
    if (context) {
      const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
      gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)')
      gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)')
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
      context.fillStyle = gradient
      context.fillRect(0, 0, size, size)
    }
    return new THREE.CanvasTexture(canvas)
  }
  
  // Three.js 星空背景
  onMounted(() => {
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x000000, 0) // 透明背景
    document.getElementById('starfield')?.appendChild(renderer.domElement)
  
    // 创建星星粒子
    const starGeometry = new THREE.BufferGeometry()
    const starCount = 5000
    const positions = new Float32Array(starCount * 3)
    const colors = new Float32Array(starCount * 3)
    const sizes = new Float32Array(starCount)
  
    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 2000
      positions[i * 3 + 1] = (Math.random() - 0.5) * 2000
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2000
  
      colors[i * 3] = Math.random() * 0.5 + 0.5 // R
      colors[i * 3 + 1] = Math.random() * 0.5 + 0.5 // G
      colors[i * 3 + 2] = Math.random() * 0.8 + 0.2 // B
  
      sizes[i] = Math.random() * 2 + 0.5
    }
  
    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    starGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
  
    const starMaterial = new THREE.PointsMaterial({
      size: 3,
      map: createStarTexture(),
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false // 防止深度测试裁切光晕
    })
  
    const stars = new THREE.Points(starGeometry, starMaterial)
    scene.add(stars)
  
    camera.position.z = 500
  
    // 动画
    const animate = () => {
      requestAnimationFrame(animate)
      stars.rotation.y += 0.0005
      renderer.render(scene, camera)
    }
    animate()
  
    // 窗口大小调整
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', handleResize)
  
    // 清理
    onUnmounted(() => {
      window.removeEventListener('resize', handleResize)
      renderer.domElement.remove()
    })
  })
  </script>
  
  <style scoped>
  
  .starfield-canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: -1;
    pointer-events: none;
  }
  
  </style>