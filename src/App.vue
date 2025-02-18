<template>
  <ion-app>
    <!-- <app-menu /> -->
    <ion-router-outlet />
    <transition name="fade">
      <div v-if="isLoading" class="loading-overlay">
        <p class="talkflow-title-text"><span style="color: black">Talk</span><span>Flow</span></p>
      </div>
    </transition>
  </ion-app>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { IonApp, IonRouterOutlet } from '@ionic/vue'
import chatFlowStore from '@/composables/TalkFlowCore'
import AppMenu from '@/components/AppMenu.vue';
import { useRouter, useRoute } from 'vue-router'
import { BackgroundMode } from '@ionic-native/background-mode/ngx';


const route = useRoute()
const swipeBackDisabled = computed(() => {
  return route.meta.disableSwipeBack === true
})
// 定义控制加载遮罩的状态
const isLoading = ref(true)
const { restoreLoginState, closeChat } = chatFlowStore

onMounted(async () => {
  // 首先恢复登录状态
  await restoreLoginState()
  // 恢复完状态后延时一小段时间，再移除遮罩（使过渡更平滑）
  setTimeout(() => {
    isLoading.value = false
  }, 1000)
// 注入 BackgroundMode 并调用 enable() 方法
document.addEventListener('deviceready', () => {
    if (window.cordova &&
        window.cordova.plugins &&
        window.cordova.plugins.backgroundMode) {
      // 启用后台模式
      window.cordova.plugins.backgroundMode.enable();
      console.log('Background mode enabled');
    } else {
      console.warn('Background mode plugin is not available');
    }
  }, false);

})
  // 禁止右键菜单
  // document.addEventListener('contextmenu', (event) => {
  //   event.preventDefault()
  // })

// router.beforeEach((to, from, next) => {
//   // 如果用户没有登录，且访问的不是 'i18n.vue' 页面，则重定向到 'i18n.vue'
//   if (!isLoggedIn.value && to.path !== '/') {
//     next('/');  // 重定向到 i18n 页面
//   } else {
//     next();  // 允许访问目标路由
//   }
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
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
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

/* 简单的加载 spinner 样式 */
.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
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
  width: 100vw;
  height: 100vh;
  touch-action: none;
  touch-action: pan-x pan-y;
  /* touch-action: manipulation; */
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  background-color: transparent;

  /* color: var(--ion-text-color); */

  overflow-x: hidden;
}



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
</style>
