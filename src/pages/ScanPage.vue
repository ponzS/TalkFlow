<template>
  <IonPage>
    <IonContent>
      <!-- 返回按钮（若也需要动画，可同理处理） -->
      <div class="back-button" @click="() => router.go(-1)">
        <div class="i-material-symbols-arrow-back-ios-new-rounded"></div>
      </div>

      <!-- 从相册或拍照解析 -->
      <button class="qr-photo" @click="pickPhoto">从相册/拍照解析</button>

      <!-- 实时扫描时，可根据 scanning 是否显示提示或遮罩等，也可加动画 -->
      <!-- 例如，当 scanning = true 时，显示“正在扫描...”提示 -->
      <!-- <transition name="fade-slide">
        <div v-if="scanning" class="scanning-tip">正在扫描...</div>
      </transition> -->
      <CyberpunkScanner :visible="scanning" />

      <!-- 扫描结果 -->
      <transition name="fade-slide">
        <div v-if="scannedData" class="result-box">扫描结果：{{ scannedData }}</div>
      </transition>

      <!-- 错误信息 -->
      <transition name="fade-slide">
        <div v-if="errorMsg" class="error-box">
          {{ errorMsg }}
        </div>
      </transition>

      <!-- 图片预览 -->
      <transition name="fade-slide">
        <div v-if="photoSrc" class="photo-preview">
          <img :src="photoSrc" alt="photo preview" />
        </div>
      </transition>
    </IonContent>
  </IonPage>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import { onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'

// Ionic 组件
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton } from '@ionic/vue'

// 1) 实时扫码
import { BarcodeScanner } from '@capacitor-community/barcode-scanner'

// 2) 拍照/选图
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'

// 3) 解析静态图片二维码
import { BrowserQRCodeReader } from '@zxing/browser'

const router = useRouter()

// 状态
const scanning = ref(false) // 是否正在实时扫码
const scannedData = ref<string | null>(null)
const errorMsg = ref<string | null>(null)
const photoSrc = ref<string | null>(null)

/**
 * ================ 实时扫码相关 ================
 */

/** 检查相机权限 */
async function checkBarcodePermission() {
  const status = await BarcodeScanner.checkPermission({ force: true })
  if (status.granted) {
    return true
  } else if (status.denied) {
    alert('相机权限被拒绝，请到系统设置中开启')
    return false
  }
  return false
}

/** 开始实时扫描 */
async function startRealtimeScan() {
  resetState()

  const hasPermission = await checkBarcodePermission()
  if (!hasPermission) return

  try {
    scanning.value = true
    // 将 WebView 背景设为透明，让相机可穿透
    await BarcodeScanner.hideBackground()

    // 启动扫码（此函数会阻塞，直到检测到二维码或用户中断）
    const result = await BarcodeScanner.startScan()

    // 扫描结束时恢复背景
    await BarcodeScanner.showBackground()
    scanning.value = false

    // 如果有内容
    if (result.hasContent) {
      scannedData.value = result.content
      handleScanResult(result.content)
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    scanning.value = false
    await BarcodeScanner.showBackground()
    errorMsg.value = err?.message || '实时扫描出错'
  }
}

/** 停止实时扫描（显式调用 stopScan 关闭摄像头） */
async function stopRealtimeScan() {
  scanning.value = false
  await BarcodeScanner.showBackground()
  await BarcodeScanner.stopScan()
}

/**
 * ================ 拍照/相册解析 ================
 */
async function pickPhoto() {
  resetState()

  try {
    const photo = await Camera.getPhoto({
      quality: 90,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt,
      allowEditing: false,
    })

    if (photo?.dataUrl) {
      photoSrc.value = photo.dataUrl
      await decodeQrFromDataUrl(photo.dataUrl)
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    errorMsg.value = err?.message || '选取图片出错'
  }
}

/** 解析图片中的二维码 */
async function decodeQrFromDataUrl(dataUrl: string) {
  try {
    const codeReader = new BrowserQRCodeReader()
    const result = await codeReader.decodeFromImageUrl(dataUrl)
    scannedData.value = result.getText()
    handleScanResult(scannedData.value)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    errorMsg.value = `无法解析二维码：${err?.message || err}`
  }
}

/**
 * ================ 通用处理逻辑 ================
 * 如果是 URL，则新窗口打开，否则跳到 /scan-result
 */
function handleScanResult(content: string) {
  if (isValidHttpUrl(content)) {
    window.open(content, '_blank')
  } else {
    router.push({
      name: 'ScanResult',
      query: { data: content },
    })
  }
}

/** 判断是否是URL */
function isValidHttpUrl(text: string) {
  let url
  try {
    url = new URL(text)
  } catch (e) {
    return false
  }
  return url.protocol === 'http:' || url.protocol === 'https:'
}

/** 重置状态 */
function resetState() {
  scanning.value = false
  scannedData.value = null
  errorMsg.value = null
  photoSrc.value = null
}

/** 生命周期：进入页面就开始扫码；离开页面时关闭 */
onMounted(() => {
  document.body.style.backgroundColor = 'transparent'
  startRealtimeScan() // 自动开始扫描
})

onBeforeUnmount(() => {
  document.body.style.backgroundColor = ''
  stopRealtimeScan() // 自动停止扫描
})
</script>

<style scoped>
.back-button {
  position: fixed;
  top: 80px;
  left: 20px;
}
.i-material-symbols-arrow-back-ios-new-rounded {
  --un-icon: url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 24 24' width='1.2em' height='1.2em' xmlns='http://www.w3.org/2000/svg' %3E%3Cpath fill='currentColor' d='m9.55 12l7.35 7.35q.375.375.363.875t-.388.875t-.875.375t-.875-.375l-7.7-7.675q-.3-.3-.45-.675t-.15-.75t.15-.75t.45-.675l7.7-7.7q.375-.375.888-.363t.887.388t.375.875t-.375.875z'/%3E%3C/svg%3E");
  -webkit-mask: var(--un-icon) no-repeat;
  mask: var(--un-icon) no-repeat;
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  background-color: currentColor;
  color: var(--background-color);
  width: 1.5em;
  height: 1.5em;
}
.container {
  text-align: center;
  padding: 1rem;
}
.result-box,
.error-box {
  margin-top: 1rem;
}
.photo-preview img {
  width: 200px;
  margin-top: 1rem;
  border: 1px solid #ccc;
}
.qr-photo {
  background-color: var(--background-color);
  color: var(--text-color);
  border-radius: 10px;
  padding: 10px 20px;
  font-size: 16px;
  position: fixed;
  bottom: 100px;
  right: 10px;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}

/* 进入时的初始状态（尚未插入 DOM 时） */
.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

/* 离开时的结束状态（即将从 DOM 中移除） */
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.scanning-tip {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.6);
  color: #fff;
  padding: 1rem;
  border-radius: 8px;
}
</style>
