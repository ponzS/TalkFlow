<template>
    <IonPage>
      <ion-content :fullscreen="true" class="beijing">
        <!-- 全屏毛玻璃遮罩 -->
        <transition name="fade">
          <div v-if="showOverlay" class="glass-overlay"></div>
        </transition>
  
        <!-- 相机预览覆盖层，始终显示 -->
        <div class="scanner-overlay">
          <div :class="['scan-window', { 'searching': isSearching }]"></div>
        </div>
  
        <!-- 返回按钮 -->
        <div class="back-button" @click="stopRealtimeScanAndGoBack">
          <div class="i-material-symbols-arrow-back-ios-new-rounded"></div>
        </div>
  
        <!-- 从相册或拍照解析 -->
        <button class="qr-photo" @click="pickPhoto">
          <ion-icon slot="start" :icon="imageOutline" />
        </button>
  
        <!-- 模态窗口：显示扫描结果或错误信息 -->
        <transition name="fade">
          <div v-if="modalContent" class="modal-overlay" @click="closeModal">
            <div class="modal-content" @click.stop>
              <p v-if="modalType === 'error'" class="error-text">{{ modalContent }}</p>
              <p v-else-if="modalType === 'text'" class="result-text">{{ modalContent }}</p>
              <div v-else-if="modalType === 'http-confirm'" class="confirm-box">
                <p>No https，Do you want to visit？</p>
                <p>{{ modalContent }}</p>
                <div class="confirm-buttons">
                  <button @click="confirmHttpOpen" class="confirm-btn">Yes</button>
                  <button @click="closeModal" class="cancel-btn">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        </transition>
  
        <!-- 图片预览 -->
        <transition name="fade-slide">
          <div v-if="photoSrc" class="photo-preview">
            <img :src="photoSrc"  />
          </div>
        </transition>
      </ion-content>
    </IonPage>
  </template>
  
  <script setup lang="ts">
  import { ref, onMounted, onBeforeUnmount } from 'vue';
  import { useRouter } from 'vue-router';
  import { IonPage, IonContent } from '@ionic/vue';
  import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
  import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
  import { BrowserQRCodeReader } from '@zxing/browser';
  import { getTalkFlowCore } from '@/composables/TalkFlowCore';
  import { Browser } from '@capacitor/browser';
  import { imageOutline } from 'ionicons/icons';
  
  const router = useRouter();
  const chatFlowStore = getTalkFlowCore();
  const { searchUserProfile, buddyList } = chatFlowStore;
  
  const scanning = ref(false);
  const isSearching = ref(false);
  const scannedData = ref<string | null>(null);
  const errorMsg = ref<string | null>(null);
  const photoSrc = ref<string | null>(null);
  const showOverlay = ref(true);
  
  // 模态窗口状态
  const modalContent = ref<string | null>(null);
  const modalType = ref<'error' | 'text' | 'http-confirm' | null>(null);
  
  // 常见 TLD 列表（可扩展）
  const tldList = [
    '.com', '.org', '.net', '.edu', '.gov', '.mil', '.biz', '.info', '.co', '.io', '.me', '.tv', '.us', '.uk', '.de', 
    '.fr', '.jp', '.cn', '.ru', '.br', '.au', '.ca', '.in', '.it', '.es', '.mx', '.nl', '.se', '.no', '.ch', '.kr', 
    '.tw', '.za', '.nz', '.sg', '.hk', '.eu', '.online', '.site', '.store', '.tech', '.app', '.dev', '.xyz', '.club', 
    '.shop', '.blog', '.live', '.work', '.world', '.pro', '.name', '.mobi', '.email', '.solutions', '.guru'
  ];
  
  async function checkBarcodePermission() {
    const status = await BarcodeScanner.checkPermission({ force: true });
    if (status.granted) return true;
    if (status.denied) {
      alert('The camera permission has been rejected.if you need,try agin please.');
      return false;
    }
    return false;
  }
  
  async function startRealtimeScan() {
    resetState();
    const hasPermission = await checkBarcodePermission();
    if (!hasPermission) return;
  
    try {
      scanning.value = true;
      document.body.classList.add('scanner-active');
      await BarcodeScanner.hideBackground();
      const result = await BarcodeScanner.startScan();
      if (result.hasContent) {
        scannedData.value = result.content;
        await handleScanResult(result.content);
      }
    } catch (err: any) {
      scanning.value = false;
      await BarcodeScanner.showBackground();
      document.body.classList.remove('scanner-active');
      showModal('error', err?.message || 'error about scanner');
    }
  }
  
  async function stopRealtimeScanAndGoBack() {
    await stopRealtimeScan();
    
    router.go(-1);
  }
  
  async function stopRealtimeScan() {
    scanning.value = false;
    await BarcodeScanner.showBackground();
    await BarcodeScanner.stopScan();
    document.body.classList.remove('scanner-active');
  }
  
  async function pickPhoto() {
    resetState();
  
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt,
        allowEditing: false,
      });
  
      if (photo?.dataUrl) {
        photoSrc.value = photo.dataUrl;
        await decodeQrFromDataUrl(photo.dataUrl);
      }
    } catch (err: any) {
      showModal('error', err?.message || 'error about photo');
    }
  }
  
  async function decodeQrFromDataUrl(dataUrl: string) {
    try {
      const codeReader = new BrowserQRCodeReader();
      const result = await codeReader.decodeFromImageUrl(dataUrl);
      scannedData.value = result.getText();
      await handleScanResult(result.getText());
    } catch (err: any) {
      showModal('error', `Unable to parse the QR code：${err?.message || err}`);
    }
  }
  
  async function handleScanResult(content: string) {
    if (isPotentialPublicKey(content)) {
      await handlePublicKey(content);
    } else if (isValidHttpUrl(content)) {
      await handleUrl(content);
    } else if (isPotentialDomain(content)) {
      await tryOpenDomain(content);
    } else {
      showModal('text', content);
    }
  }
  
  function isValidHttpUrl(text: string) {
    try {
      const url = new URL(text);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (e) {
      return false;
    }
  }
  
  function isPotentialPublicKey(text: string) {
    return text.startsWith('pubkey:');
  }
  
  function isPotentialDomain(text: string) {
    const lowerText = text.toLowerCase();
    return tldList.some(tld => lowerText.endsWith(tld));
  }
  
  async function handlePublicKey(content: string) {
    const pub = content.replace('pubkey:', '');
    isSearching.value = true;
    try {
      const userExists = await searchUserProfile(pub);
      if (userExists) {
        const isFriend = buddyList.value.some(b => b.pub === pub);
        if (isFriend) {
          router.push({ path: '/friend-profile', query: { pub } });
        } else {
          router.push({ path: '/stranger-profile', query: { pub } });
        }
      } else {
        showModal('error', 'No user');
      }
    } catch (err) {
      showModal('error', 'check you net please');
      // console.error('搜索用户失败:', err);
    } finally {
      isSearching.value = false;
    }
  }
  
  async function handleUrl(content: string) {
    const url = new URL(content);
    if (url.protocol === 'https:') {
      await openUrlInBrowser(content);
    } else if (url.protocol === 'http:') {
      showModal('http-confirm', content);
    }
  }
  
  async function tryOpenDomain(domain: string) {
    const httpsUrl = `https://${domain}`;
    const httpUrl = `http://${domain}`;
  
    try {
      await fetch(httpsUrl, { method: 'HEAD', mode: 'no-cors' });
      await openUrlInBrowser(httpsUrl);
    } catch (httpsErr) {
      try {
        await fetch(httpUrl, { method: 'HEAD', mode: 'no-cors' });
        showModal('http-confirm', httpUrl);
      } catch (httpErr) {
        showModal('error', `${domain} Unable to access (HTTPS and HTTP)`);
        console.error('Domain access failed:', httpErr);
      }
    }
  }
  
  async function openUrlInBrowser(url: string) {
    try {
      await Browser.open({ url });
      resetState();
    } catch (err) {
      showModal('error', 'open failed');
      console.error('Browser open failed:', err);
    }
  }
  
  // 模态窗口控制
  function showModal(type: 'error' | 'text' | 'http-confirm', content: string) {
    modalType.value = type;
    modalContent.value = content;
  }
  
  function closeModal() {
    modalContent.value = null;
    modalType.value = null;
  }
  
  async function confirmHttpOpen() {
    if (modalType.value === 'http-confirm' && modalContent.value) {
      await openUrlInBrowser(modalContent.value);
    }
    closeModal();
  }
  
  function resetState() {
    scannedData.value = null;
    errorMsg.value = null;
    photoSrc.value = null;
    closeModal();
  }
  
  onMounted(() => {
   
    setTimeout(() => {
      showOverlay.value = false;
      startRealtimeScan();
    document.body.style.backgroundColor = 'transparent';
    }, 1000);
    
  });
  
  onBeforeUnmount(() => {
    stopRealtimeScan();
    document.body.style.backgroundColor = '';
  });
  </script>
  
  <style scoped>
  .beijing {
    --background: transparent;
    background: transparent;
    height: 100%;
  }
  
  .glass-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgb(0, 0, 0);
    backdrop-filter: blur(50px);
    z-index: 1000;
  }
  
  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.5s ease;
  }
  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
  }
  
  .scanner-active {
    background: transparent !important;
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
    transition: border-color 0.3s ease, box-shadow 0.3s ease, animation 0.3s ease;
  }
  
  .scan-window.searching {
    border-color: #00CED1;
    box-shadow: 0 8px 24px rgba(0, 206, 209, 0.5);
    animation: morph 1s ease-in-out infinite;
  }
  
  @keyframes morph {
    0% { border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%; }
    25% { border-radius: 60% 40% 50% 50% / 50% 60% 40% 50%; }
    50% { border-radius: 50% 50% 40% 60% / 60% 40% 50% 50%; }
    75% { border-radius: 40% 60% 60% 40% / 50% 50% 40% 60%; }
    100% { border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%; }
  }
  
  .scan-window:hover {
    transform: translate(-50%, -50%) scale(1.05);
    transition: transform 0.3s ease;
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
  
  .qr-photo {
    background-color: var(--background-color);
    color: var(--text-color);
    border-radius: 10px;
    padding: 10px 20px;
    font-size: 39px;
    position: fixed;
    bottom: 100px;
    right: 10px;
    z-index: 20;
  }
  
  .photo-preview img {
    width: 200px;
    margin-top: 1rem;
    border: 1px solid #ccc;
    z-index: 20;
    position: relative;
  }
  
  /* 模态窗口样式 */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;
  }
  
  .modal-content {
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 20px;
    border-radius: 10px;
    max-width: 80%;
    max-height: 60vh;
    overflow-y: auto;
    text-align: center;
  }
  
  .error-text {
    color: #ff4d4d;
  }
  
  .result-text {
    white-space: pre-wrap;
    word-break: break-all;
  }
  
  .confirm-box p {
    margin: 10px 0;
  }
  
  .confirm-buttons {
    margin-top: 20px;
    display: flex;
    justify-content: center;
    gap: 20px;
  }
  
  .confirm-btn, .cancel-btn {
    padding: 10px 20px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 16px;
  }
  
  .confirm-btn {
    background: #00ff00;
    color: black;
  }
  
  .cancel-btn {
    background: #ff4d4d;
    color: white;
  }
  
  .fade-slide-enter-active,
  .fade-slide-leave-active {
    transition: all 0.3s ease;
  }
  
  .fade-slide-enter-from,
  .fade-slide-leave-to {
    opacity: 0;
    transform: translateY(10px);
  }
  </style>