<template>
  <IonPage>
    <ion-content :fullscreen="true" class="beijing"  collapse="fade">
      <!-- 相机预览覆盖层，保持显示 -->
      <div class="scanner-overlay">
        <div class="scan-window"></div>
      </div>

      <!-- 返回按钮 -->
      <div class="back-button" @click="goBack">
        <div class="i-material-symbols-arrow-back-ios-new-rounded"></div>
      </div>

      <!-- 扫描内容展示 -->
      <div class="content-box">
        <h2>content</h2>
        <p>{{ scannedContent }}</p>
      </div>
    </ion-content>
  </IonPage>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { IonPage, IonContent } from '@ionic/vue';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';

const router = useRouter();
const route = useRoute();

const scannedContent = ref<string>('');

// 获取扫描内容
onMounted(() => {
  document.body.classList.add('scanner-active');
  BarcodeScanner.hideBackground();
  scannedContent.value = route.query.content as string || '无内容';
});

onBeforeUnmount(() => {
  document.body.classList.remove('scanner-active');
});

function goBack() {
  router.go(-1); // 返回扫码页面
}
</script>

<style scoped>
.beijing {
  --background: transparent;
  background: transparent;
  height: 100%;
}

.scanner-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 10;
  pointer-events: none;
}

.scan-window {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 250px;
  height: 250px;
  border: 2px solid #00ff00;
  box-shadow: 0 8px 24px rgba(0, 255, 0, 0.5);
  animation: morph 8s ease-in-out infinite;
}

@keyframes morph {
  0% { border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%; }
  25% { border-radius: 60% 40% 50% 50% / 50% 60% 40% 50%; }
  50% { border-radius: 50% 50% 40% 60% / 60% 40% 50% 50%; }
  75% { border-radius: 40% 60% 60% 40% / 50% 50% 40% 60%; }
  100% { border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%; }
}

.back-button {
  position: fixed;
  top: 80px;
  left: 20px;
  z-index: 20;
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

.content-box {
  position: relative;
  z-index: 20;
  text-align: center;
  margin-top: 300px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 10px;
  max-width: 80%;
  margin-left: auto;
  margin-right: auto;
}

.content-box h2 {
  font-size: 24px;
  margin-bottom: 10px;
}

.content-box p {
  font-size: 18px;
  word-break: break-all;
}
</style>