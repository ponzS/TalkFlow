<template>
    <!-- <ion-page> -->
      <ion-content :fullscreen="true" class="browser-content">
        <!-- <div class="back-button1">
          <div class="back-button" @click="goBack">
            <div class="i-material-symbols-arrow-back-ios-new-rounded"></div>
          </div>
        </div> -->
  
        <!-- <iframe src="https://gun-vue.js.org/app/#/chat/" class="iframe-container"></iframe> -->
        <div class="container">
          <!-- 胶囊式输入框 -->
          <div class="input-capsule" :class="{ 'focused': isFocused }">
            <input
              v-model="urlInput"
              @focus="isFocused = true"
              @blur="isFocused = false"
              @keyup.enter="openWebsite"
              class="url-input"
              type="text"
             
            />
            <div
              class="send-button"
              @click="openWebsite"
              :class="{ 'disabled': !urlInput }"
            >
              <ion-icon :icon="arrowForwardOutline" />
            </div>
          </div>
  
          <!-- 背景光晕装饰 -->
          <div class="glow-circle glow-1"></div>
          <div class="glow-circle glow-2"></div>
          <div class="glow-circle glow-3"></div>
        </div>
  
        <!-- 模态框用于显示 Data URL 内容 -->
        <ion-modal
          :is-open="showDataModal"
          css-class="data-modal"
          @didDismiss="showDataModal = false"
          :backdrop-dismiss="true"
        >
          <ion-content class="modal-content">
            <ion-header>
              <ion-toolbar class="modal-toolbar">
                <ion-title>Offline Content</ion-title>
                <ion-buttons slot="end">
                  <ion-button @click="showDataModal = false">
                    <ion-icon color="dark" :icon="closeOutline"></ion-icon>
                  </ion-button>
                </ion-buttons>
              </ion-toolbar>
            </ion-header>
            <iframe
              v-if="dataContent"
              :srcdoc="dataContent"
              class="data-iframe"
              frameborder="0"
            ></iframe>
          </ion-content>
        </ion-modal>

        <ion-modal
          :is-open="showDataModal2"
          css-class="data-modal"
          @didDismiss="showDataModal2 = false"
          :backdrop-dismiss="true"
        >
          <ion-content class="modal-content">
            <ion-header>
              <ion-toolbar class="modal-toolbar">
                <ion-title></ion-title>
                <ion-buttons slot="end">
                  <ion-button @click="showDataModal2 = false">
                    <ion-icon color="dark" :icon="closeOutline"></ion-icon>
                  </ion-button>
                </ion-buttons>
              </ion-toolbar>
            </ion-header>
            <iframe
              v-if="dataContent2"
              :src="dataContent2"
              class="data-iframe"
              frameborder="0"
            ></iframe>
          </ion-content>
        </ion-modal>

      </ion-content>
    <!-- </ion-page> -->
  </template>
<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { IonPage, IonContent, IonIcon, IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton } from '@ionic/vue';
import { arrowForwardOutline, closeOutline } from 'ionicons/icons';
import { Browser } from '@capacitor/browser';

const router = useRouter();
const urlInput = ref('');
const isFocused = ref(false);
const showDataModal = ref(false);
const showDataModal2 = ref(false);
const dataContent = ref('');
const dataContent2 = ref('');
async function openWebsite() {
    if (!urlInput.value) return;

    const trimmedInput = urlInput.value.trim().toLowerCase(); // 不区分大小写
    const chatPrefix = 'chatroom';
    const grokPrefix = 'grok';
    const deepseekPrefix = 'deepseek';
    const chatgptPrefix = 'chatgpt';
    const ponzsPrefix = 'ponzs';
    const relayPrefix = 'relay';
    const ponzsPrefix2 = 'talkflow';
    const chatroomPrefix = 'chat';
    const youtubePrefix = 'youtube';
    const videoPrefix = 'video';
    const bilibiliPrefix = 'bilibili';
    const tiktokPrefix = 'tiktok';
    const douyinPrefix = '抖音';
    const githubPrefix = 'github';
    const xPrefix = 'x';

    if (trimmedInput === xPrefix) {
        try {
           const xUrl = 'https://www.x.com'; 
        
        await Browser.open({ url: xUrl });
        urlInput.value = '';
        } catch (error) { 

        }
        return;
    }

   if (trimmedInput === githubPrefix) {
        try {
           const githubUrl = 'https://www.github.com'; 
        
        await Browser.open({ url: githubUrl });
        urlInput.value = '';
        } catch (error) { 

        }
        return;
    }


    if (trimmedInput === douyinPrefix) {
        try {
           const douyinUrl = 'https://www.douyin.com'; 
        
        await Browser.open({ url: douyinUrl });
        urlInput.value = '';
        } catch (error) { 

        }
        return;
    }


    if (trimmedInput === tiktokPrefix) {
        try {
           const tiktokUrl = 'https://www.tiktok.com'; 
        
        await Browser.open({ url: tiktokUrl });
        urlInput.value = '';
        } catch (error) { 

        }
        return;
    }



    if (trimmedInput === bilibiliPrefix) {
        try {
          const bilibiliUrl = 'https://www.bilibili.com'; 
        
        await Browser.open({ url: bilibiliUrl });
        urlInput.value = '';
        } catch (error) {

        }
        return;
    }

    if (trimmedInput === youtubePrefix) {
        try {
          const youtubeUrl = 'https://www.youtube.com'; 
        
        await Browser.open({ url: youtubeUrl });
        urlInput.value = '';
        } catch (error) {

        }
        return;
    }

    if (trimmedInput === videoPrefix) {
        try {
            dataContent2.value = "https://air.tls.moe/";
            showDataModal2.value = true;
            urlInput.value = '';
        } catch (error) {
          
        }
        return;
    }

    if (trimmedInput === chatroomPrefix) {
        try {
            dataContent2.value = "https://gun-vue.js.org/app/";
            showDataModal2.value = true;
            urlInput.value = '';
        } catch (error) {
          
        }
        return;
    }


    if (trimmedInput === ponzsPrefix2) {
        try {
            dataContent2.value = "https://ponzs.com";
            showDataModal2.value = true;
            urlInput.value = '';
        } catch (error) {
          
        }
        return;
    }

    if (trimmedInput === grokPrefix) {
        try {
    
            const grokUrl = 'https://grok.x.ai'; 
          
            await Browser.open({ url: grokUrl });
            urlInput.value = '';
        } catch (error) {
          
        }
        return;
    }
    if (trimmedInput === deepseekPrefix) {
        try {
   
            const grokUrl = 'https://www.deepseek.com'; 
        
            await Browser.open({ url: grokUrl });
            urlInput.value = '';
        } catch (error) {
           
        }
        return;
    }

    if (trimmedInput === chatgptPrefix) {
        try {
            const chatUrl = `https://chatgpt.com`;
       
            await Browser.open({ url: chatUrl });
            urlInput.value = '';
        } catch (error) {
         
        }
        return;
    }
    if (trimmedInput === ponzsPrefix) {
        try {
            const chatUrl = `https://ponzs.com`;
          
            await Browser.open({ url: chatUrl });
            urlInput.value = '';
        } catch (error) {
         
        }
        return;
    }
    if (trimmedInput === relayPrefix) {
        try {
            const relayUrl = `https://github.com/ponzS/GunRelay-TalkFlow`;
          
            await Browser.open({ url: relayUrl });
            urlInput.value = '';
        } catch (error) {
            console.error('Failed to open relay URL:', error);
        }
        return;
    }
    
    // 检查是否为聊天房间指令
    if (trimmedInput.startsWith(chatPrefix)) {
        try {
            const chatUrl = `https://gun-vue.js.org/app/#/chat/`;
          
            await Browser.open({ url: chatUrl });
            urlInput.value = '';
        } catch (error) {
            console.error('Failed to open chat room:', error);
        }
        return;
    }

    // 检查是否为 data:text/html 格式的链接
    if (trimmedInput.startsWith('data:text/html')) {
        try {
            const base64Content = trimmedInput.split(',')[1];
            const decodedContent = decodeURIComponent(base64Content);
            dataContent.value = decodedContent;
            showDataModal.value = true;
            urlInput.value = '';
        } catch (error) {
            console.error('Failed to process Data URL:', error);
        }
    } 
    // 检查是否为有效的URL
    else if (isValidUrl(trimmedInput)) {
        let formattedUrl = trimmedInput;
        if (!formattedUrl.match(/^https?:\/\//)) {
            formattedUrl = `https://${formattedUrl}`;
        }
        try {
            await Browser.open({ url: formattedUrl });
            urlInput.value = '';
        } catch (error) {
            console.error('Failed to open URL:', error);
        }
    } 
    // 如果不是URL也不是Data URL，则执行Google搜索
    else {
        try {
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(trimmedInput)}`;
            await Browser.open({ url: searchUrl });
            urlInput.value = '';
        } catch (error) {
            console.error('Failed to perform search:', error);
        }
    }
}

// 验证URL的辅助函数
function isValidUrl(string: string): boolean {
    try {
        const urlPattern = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w- ./?%&=]*)?$/i;
        return urlPattern.test(string);
    } catch (error) {
        return false;
    }
}

function goBack() {
    router.go(-1);
}
</script>
  
  <style scoped>
  .browser-content {
    --background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    width:100%;
    overflow: hidden;
  }
  
  .container {
    position: relative;
    width: 100%;
   
    padding: 20px;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
  }
  
  /* 胶囊式输入框 */
  .input-capsule {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
    max-width: 500px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50px;
    padding: 8px 5px;
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    transition: all 0.3s ease;
    z-index: 10;
  }
  
  .input-capsule.focused {
    background: rgba(255, 255, 255, 0.15);
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.2),
                0 0 40px rgba(255, 255, 255, 0.1);
    transform: scale(1.02);
  }
  
  .url-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: #ffffff;
    font-size: 16px;
    padding: 12px 16px;
    width: 100%;
    transition: all 0.3s ease;
  }
  
  .url-input::placeholder {
    color: rgba(255, 255, 255, 0.6);
    transition: all 0.3s ease;
  }
  
  .input-capsule.focused .url-input::placeholder {
    color: rgba(255, 255, 255, 0.8);
  }
  
  /* 发送按钮 */
  .send-button {
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    width: 40px;
    height: 40px;
    margin: 0 4px;
    transition: all 0.3s ease;
    cursor: pointer;
  }
  
  .send-button:hover:not(.disabled) {
    background: #23d5ab;
    transform: scale(1.1);
    box-shadow: 0 6px 20px rgba(0, 205, 137, 0.6);
  }
  
  .send-button ion-icon {
    color: #ffffff;
    font-size: 20px;
  }
  
  .send-button.disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: scale(1);
  }
  
  /* 光晕效果 */
  .glow-circle {
    position: absolute;
    border-radius: 50%;
    filter: blur(60px);
    opacity: 0.3;
    animation: float 8s ease-in-out infinite;
    z-index: 1;
  }
  
  .glow-1 {
    width: 300px;
    height: 300px;
    background: radial-gradient(circle, #00cd89 0%, transparent 70%);
    top: 10%;
    left: 20%;
    animation-delay: 0s;
  }
  
  .glow-2 {
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, #23d5ab 0%, transparent 70%);
    bottom: 15%;
    right: 15%;
    animation-delay: 2s;
  }
  
  .glow-3 {
    width: 250px;
    height: 250px;
    background: radial-gradient(circle, #52eed1 0%, transparent 70%);
    top: 50%;
    left: 50%;
    animation-delay: 4s;
  }
  
  /* 返回按钮 */
  .back-button1 {
    position: fixed;
    top: 70px;
    left: 20px;
    z-index: 9999;
  }
  
  .back-button {
    background-color: rgba(127, 127, 127, 0.24);
    width: 40px;
    height: 40px;
    border-radius: 50%;
    padding-right: 4px;
    display: flex;
    justify-content: center;
    align-items: center;
    transition: all 0.3s ease-in-out;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    backdrop-filter: blur(10px);
  }
  
  .back-button:active {
    background-color: #5151E5;
    transform: scale(0.95);
  }
  
  .i-material-symbols-arrow-back-ios-new-rounded {
    --un-icon: url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 24 24' width='1.2em' height='1.2em' xmlns='http://www.w3.org/2000/svg' %3E%3Cpath fill='currentColor' d='m9.55 12l7.35 7.35q.375.375.363.875t-.388.875t-.875.375t-.875-.375l-7.7-7.675q-.3-.3-.45-.675t-.15-.75t.15-.75t.45-.675l7.7-7.7q.375-.375.888-.363t.887.388t.375.875t-.375.875z'/%3E%3C/svg%3E");
    -webkit-mask: var(--un-icon) no-repeat;
    mask: var(--un-icon) no-repeat;
    -webkit-mask-size: 100% 100%;
    mask-size: 100% 100%;
    background-color: #ffffff;
    width: 1.5em;
    height: 1.5em;
  }
  
  /* 模态框样式 */
  .data-modal {
    --background: linear-gradient(135deg, #0f0c29, #302b63);
    --border-radius: 16px;
  }
  
  .modal-content {
    --background: transparent;
  }
  
  .modal-toolbar {
    --background: transparent;
    --color: #ffffff;
  }
  
  .data-iframe {
    width: 100%;
    height: 100%;
    background: #000;
    color: #fff;
  }
  
  /* 动画 */
  @keyframes float {
    0% { transform: translateY(0) scale(1); opacity: 0.3; }
    50% { transform: translateY(-20px) scale(1.05); opacity: 0.5; }
    100% { transform: translateY(0) scale(1); opacity: 0.3; }
  }
  
  /* 响应式调整 */
  @media (max-width: 768px) {
    .input-capsule {
      max-width: 90%;
    }
    .glow-circle {
      transform: scale(0.7);
    }
  }
  </style>