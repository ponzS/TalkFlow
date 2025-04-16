<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <ion-page>
  
      <IndexPage />
      <!-- <VoiceCall/> -->
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonContent,
} from '@ionic/vue'
// import { useChatFlow } from '@/composables/TalkFlowCore'
// import { useRouter } from 'vue-router'
// const router = useRouter()
// import { Keyboard, KeyboardResize } from '@capacitor/keyboard'

// 页面挂载时设置键盘不调整 WebView 大小
// onMounted(() => {


//   if (router.currentRoute.value.path !== '/chatpage') {

// closeChat() 
// }
// })

// 页面离开时恢复默认模式（例如 native）
// onBeforeUnmount(() => {
//   Keyboard.setResizeMode({ mode: KeyboardResize.Ionic });
// })
// const {
 
//   isLoggedIn,


//   closeChat,

  

// } = useChatFlow()


// import { watch } from 'vue'

// watch(isLoggedIn, () => {
//   if (isLoggedIn.value === false) {

//       router.push('/')
  
//   }
// })



</script>
