<template>
    <ion-page>
      <ion-header :translucent="true" collapse="fade">
        <ion-toolbar>
          <ion-title>{{$t('datamigration')}}</ion-title>
          <ion-buttons slot="start">
              <ion-back-button :text="$t('back')" ></ion-back-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding migration-content">
                <ion-header collapse="condense" >
          <ion-toolbar>
            <h1 style="margin: 10px;font-weight: 900;font-size: 39px;">
{{$t('datamigration')}}
            </h1>
          </ion-toolbar>
        </ion-header>
        <div class="description-container">
          <p class="description-text">{{$t('datamigrationtalk')}}</p>
        </div>
        <div class="button-container">
          <ion-button color="dark" expand="block" @click="goToExport" class="migration-button">
            {{$t('exportdata')}}
          </ion-button>
          <ion-button color="dark" expand="block" @click="goToImport" class="migration-button">
            {{$t('importdata')}}
          </ion-button>
          <!-- <ion-button color="medium" expand="block" @click="showUserKeyPair" class="migration-button">
            显示当前用户密钥对
          </ion-button> -->
        </div>
        
        <!-- 密钥对显示模态框 -->
        <ion-modal :is-open="isKeyPairModalOpen" @did-dismiss="closeKeyPairModal">
          <ion-header>
            <ion-toolbar>
              <ion-title>当前用户密钥对</ion-title>
              <ion-buttons slot="end">
                <ion-button @click="closeKeyPairModal">
                  <ion-icon :icon="closeOutline"></ion-icon>
                </ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>
          <ion-content class="ion-padding">
            <div v-if="userKeyPair" class="keypair-display">
              <pre>{{ JSON.stringify(userKeyPair, null, 2) }}</pre>
              <ion-button color="dark" expand="block" @click="copyKeyPair" class="copy-button">
                复制密钥对
              </ion-button>
            </div>
            <div v-else class="no-keypair">
              <p>未找到用户密钥对，请确保已登录</p>
            </div>
          </ion-content>
        </ion-modal>
      </ion-content>
    </ion-page>
  </template>
  
  <script setup lang="ts">
  import { ref } from 'vue';
  import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons, IonBackButton, IonModal, IonIcon } from '@ionic/vue';
  import { useRouter } from 'vue-router';
  import { getTalkFlowCore } from '@/composables/TalkFlowCore';
  import { useToast } from '@/composables/useToast';
  import { Clipboard } from '@capacitor/clipboard';
  import { closeOutline } from 'ionicons/icons';
  
  const router = useRouter();
  const { currentUserPair, storageServ } = getTalkFlowCore();
  const { showToast } = useToast();
  
  const isKeyPairModalOpen = ref(false);
  const userKeyPair = ref<any>(null);
  
  const goToExport = () => router.push('/MigrationExport');
  const goToImport = () => router.push('/MigrationImport');
  
  // 从数据库获取密钥对的函数
  const getKeyPairFromDatabase = async () => {
    try {
      // 首先尝试从localStorage获取
      const encryptedCredentials = localStorage.getItem('userCredentials');
      
      if (encryptedCredentials) {
        const pair = JSON.parse(encryptedCredentials);
        if (pair.pub && pair.priv && pair.epub && pair.epriv) {
          return pair;
        }
      }
      
      // 如果localStorage没有，尝试从SQLite获取
      const credentialsResult = await storageServ.query('SELECT value FROM credentials WHERE key = ?', ['userCredentials']);
      
      if (credentialsResult.values && credentialsResult.values.length > 0) {
        const pair = JSON.parse(credentialsResult.values[0].value as string);
        if (pair.pub && pair.priv && pair.epub && pair.epriv) {
          return pair;
        }
      }
      
      return null;
    } catch (error) {
      console.error('获取密钥对失败:', error);
      return null;
    }
  };
  
  const showUserKeyPair = async () => {
    // 首先检查内存中的密钥对
    if (currentUserPair) {
      userKeyPair.value = currentUserPair;
      isKeyPairModalOpen.value = true;
      return;
    }
    
    // 如果内存中没有，尝试从数据库获取
    showToast('正在从数据库获取密钥对...', 'info');
    const keyPair = await getKeyPairFromDatabase();
    
    if (keyPair) {
      userKeyPair.value = keyPair;
      isKeyPairModalOpen.value = true;
      showToast('密钥对获取成功', 'success');
    } else {
      showToast('未找到用户密钥对，请确保已登录', 'warning');
    }
  };
  
  const closeKeyPairModal = () => {
    isKeyPairModalOpen.value = false;
    userKeyPair.value = null;
  };
  
  const copyKeyPair = async () => {
    if (userKeyPair.value) {
      try {
        await Clipboard.write({ string: JSON.stringify(userKeyPair.value, null, 2) });
        showToast('密钥对已复制到剪贴板', 'success');
      } catch (error) {
        showToast('复制失败', 'error');
      }
    }
  };
  </script>
  
  <style scoped>
  .migration-content {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  
  .description-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
  }
  
  .description-text {
    font-size: 16px;
    line-height: 1.6;
    color: var(--ion-color-medium);
    text-align: center;
    margin: 0;
    max-width: 400px;
  }
  
  .button-container {
    padding: 20px 0 40px 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  
  .migration-button {
    height: 48px;
    font-weight: 600;
    --border-radius: 12px;
    margin: 0;
  }
  
  .keypair-display {
    background: var(--ion-color-light);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
  }
  
  .keypair-display pre {
    background: var(--ion-color-dark);
    color: var(--ion-color-light);
    padding: 16px;
    border-radius: 8px;
    font-size: 12px;
    line-height: 1.4;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
    margin: 0 0 16px 0;
  }
  
  .copy-button {
    --border-radius: 8px;
  }
  
  .no-keypair {
    text-align: center;
    padding: 40px 20px;
    color: var(--ion-color-medium);
  }
  
  /* 响应式设计 */
  @media (max-width: 768px) {
    .description-container {
      padding: 30px 16px;
    }
    
    .description-text {
      font-size: 15px;
    }
    
    .button-container {
      padding: 16px 0 30px 0;
      gap: 12px;
    }
    
    .migration-button {
      height: 44px;
    }
  }
  </style>