<template>
  <ion-app>
    <WindowControls />
    <!-- <GlobalToast />
 
 <div style="display: none;">
<RelayMode/>
 </div> -->


    <ion-router-outlet v-if="!isLoading" />


    <transition name="fade">
      <div v-if="isLoading" class="loading-overlay">
        <p class="talkflow-title-text"><span style="color: black">Talk</span><span>Flow</span></p>
      </div>
    </transition>
  </ion-app>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import { getTalkFlowCore } from '@/composables/TalkFlowCore';
import { useRouter } from 'vue-router';
//import { useNotification } from '@/composables/useNotification';
import { useLanguage } from '@/composables/useLanguage';
const { languages, selectedLanguage, selectLanguage: selectLang, initLanguage } = useLanguage();
// import { useNetworkStatus,cleanupNetworkStatus } from '@/composables/useNetworkStatus';
import { VoiceRecorder } from 'capacitor-voice-recorder';
//import { initializeRoomTables } from '@/composables/useRoomChat';
import RelayMode from './components/GUNtest/RelayMode.vue';
const chatFlowStore = getTalkFlowCore();
// const networkStatusStore = useNetworkStatus();




const { 
  restoreLoginState, 
  storageServ, 
  offlineNotice, 
  // pingNetworkAndPeers, 
  showToast, 
  isLoggedIn, 
  currentUserPub, 
  // restoreLoginState1,
  isLoading,
  gun,
  currentUserPair,
  isLargeScreen,
  updateScreenSize
} = chatFlowStore;
const router = useRouter();
//const notification = useNotification();


// 初始化网络状态检查
// async function initializeNetworkStatus() {
//   const isNetworkAvailable = await pingNetworkAndPeers();
//   if (!isNetworkAvailable) {
//     offlineNotice.value = '您已离线，消息发送将失败';
//     showToast(offlineNotice.value, 'warning');
//     console.log('应用启动时检测到离线状态');
//   } else {
//     offlineNotice.value = null;
//     console.log('应用启动时检测到在线状态');
//   }
// }

// 网络状态监听器
function setupNetworkListener() {
  let debounceTimer: NodeJS.Timeout;
  window.addEventListener('online', async () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      console.log('网络恢复');
      offlineNotice.value = null;
      // if (isLoggedIn.value && currentUserPub.value && router.currentRoute.value.path !== '/index') {
      //   // await restoreLoginState1();
      //   router.replace('/index');
      // } else if (!isLoggedIn.value && router.currentRoute.value.path !== '/') {
      //   router.replace('/');
      // }
      // if (!(await pingNetworkAndPeers())) {
      //   showToast('节点不可达', 'warning');
      // }
    }, 100); // 防抖 500ms
  });
  // window.addEventListener('offline', () => {
  //   console.log('网络断开');
  //   offlineNotice.value = '您已离线';
  //   showToast(offlineNotice.value, 'warning');
  // });
}
// 初始化音频权限
async function initializeAudioPermissions() {
  try {
    const perm = await VoiceRecorder.hasAudioRecordingPermission();
    if (!perm.value) {
      const request = await VoiceRecorder.requestAudioRecordingPermission();
      if (request.value) {
        // console.log('音频权限已授予');
      } else {
        showToast('未授予音频权限，可能影响语音功能', 'warning');
        // console.log('用户拒绝了音频权限');
      }
    } else {
      console.log('已具备音频权限');
    }
  } catch (err) {
    console.error('初始化音频权限失败:', err);
  }
}
// 模拟录音重置音频状态
// async function resetAudioState() {
//   try {
//     console.log('开始模拟重置音频状态');
//     const context = new AudioContext();
//     if (context.state === 'suspended') {
//       await context.resume();
//       console.log('AudioContext 已激活');
//     }

//     // 使用 VoiceRecorder 模拟短暂录音重置
//     const perm = await VoiceRecorder.hasAudioRecordingPermission();
//     if (perm.value) {
//       await VoiceRecorder.startRecording();
//       await new Promise(resolve => setTimeout(resolve, 50)); // 极短时间
//       await VoiceRecorder.stopRecording();
//       console.log('通过 VoiceRecorder 模拟录音完成，音频状态已重置');
//     } else {
//       // 回退到 Web Audio 模拟
//       const silentAudio = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=');
//       silentAudio.play().then(() => {
//         setTimeout(() => {
//           silentAudio.pause();
//           silentAudio.src = '';
//           context.close();
//           console.log('Web Audio 模拟录音完成，音频状态已重置');
//         }, 100);
//       }).catch(err => console.error('模拟音频播放失败:', err));
//     }
//   } catch (err) {
//     console.error('模拟重置音频状态失败:', err);
//   }
// }

// 保存原始 console.warn
 const originalConsoleWarn = console.warn;

// 过滤 Gun.js 警告
function filterGunWarnings(...args: any[]) {
  const message = args[0]?.toString() || '';
  if (message.includes('Deprecated internal utility will break in next version')) {
    return; // 忽略 Gun.js 警告
  }
  originalConsoleWarn.apply(console, args); // 输出其他警告
}




// const { listenRooms } = useRoomChat(gun, storageServ);
onMounted(async () => {
   console.warn = filterGunWarnings;
  // notification.requestNotificationPermission();


  isLoading.value = true;


  window.addEventListener('resize', updateScreenSize);
  
  await initLanguage();
  await storageServ.initializeDatabase();

  //await initializeRoomTables(storageServ);
  // const { listenRooms } = useRoomChat(gun, storageServ);
  // listenRooms();
  await setupNetworkListener(); 
  await restoreLoginState();
  // await initializeNetworkStatus(); 
  
  await initializeAudioPermissions();
  // await resetAudioState();
  // 确保 networkStatusStore 已加载持久化状态
  // console.log('App initialized with enabledPeer:', networkStatusStore.enabledPeer.value);
  // setTimeout(() => {
  //   listenRooms();
  //   // console.log('群聊监听已启动');
  // }, 0);
  setTimeout(() => {
    isLoading.value = false;
  }, 1000);

  //   const { listenRooms } = useRoomChat(gun, storageServ);
  // listenRooms();
  // document.addEventListener('deviceready', () => {
  //   if (window.cordova && window.cordova.plugins && window.cordova.plugins.backgroundMode) {
  //     window.cordova.plugins.backgroundMode.enable();
  //     console.log('Background mode enabled');
  //   } else {
  //     console.warn('Background mode plugin is not available');
  //   }
  // }, false);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateScreenSize);
});

// onUnmounted(() => {

//   window.removeEventListener('online', () => {});
//   window.removeEventListener('offline', () => {});
// });
</script>

<style scoped>
/* 加载遮罩层样式（毛玻璃效果） */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  /* background: rgba(0, 50, 50, 0.2); */
  backdrop-filter: blur(20px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Fade 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.fade-enter-to,
.fade-leave-from {
  opacity: 1;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 0px; /* 滚动条宽度 */
  background-color: transparent; /* 透明背景 */
}

/* 滚动条滑块 */
::-webkit-scrollbar-thumb {
  background-color: transparent; /* 半透明的滑块颜色 */
  border-radius: 4px; /* 圆角 */
}

/* 滚动条轨道 */
::-webkit-scrollbar-track {
  background-color: transparent; /* 透明轨道 */
}

.talkflow-title-text {
  font-size: 20vw;
  font-weight: bold;
  color: transparent;
  text-shadow: 0 0 10px 0 rgba(0, 255, 217, 0.5);
  -webkit-text-stroke: 1px rgba(0, 0, 0, 0);
  background: linear-gradient(-45deg, #52eed1, #000000, #23d5b4, #23d5ab);
  -webkit-background-clip: text;
  background-clip: text;
  z-index: 9999;
  background-size: 200% 200%;
  animation: gradientBreath 10s ease infinite;
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    Oxygen,
    Ubuntu,
    Cantarell,
    'Open Sans',
    'Helvetica Neue',
    sans-serif;
}

@keyframes gradientBreath {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

body.scanner-active,
ion-app.scanner-active {
  background: transparent !important;
  --background: transparent !important;
  overflow: hidden;
}

ion-content.scanner-active {
  --background: transparent !important;
  background: transparent !important;
}

.ion-page,
ion-content {
  background: transparent !important;
  --background: transparent !important;
}

html,
body,
#app {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  /* touch-action: none;
  touch-action: pan-x pan-y;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none; */
  background-color: transparent;
  overflow: hidden;
}

/* ion-page {
  width: 100% !important;
}

ion-content {
    width: 100% !important;
  }
@media (max-width: 768px) {
  ion-content {
    width: 100% !important;
  }
} */
body {
  font-family:
    Inter,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    Oxygen,
    Ubuntu,
    Cantarell,
    'Fira Sans',
    'Droid Sans',
    'Helvetica Neue',
    sans-serif;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>