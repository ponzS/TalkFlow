<!-- src/views/NotificationSettings.vue -->
<template>
    <ion-page>
      <ion-header :translucent="true" collapse="fade">
        <ion-toolbar class="liquid-toolbar">
          <ion-buttons slot="start">
            <ion-back-button color="dark" ></ion-back-button>
          </ion-buttons>
          <ion-title>Settings</ion-title>
        </ion-toolbar>
      </ion-header>
  
      <ion-content :fullscreen="true" class="liquid-content">
        <div class="settings-container">
          <div class="section-card">
            <ion-item lines="none">
              <ion-label>{{$t('notify')}}</ion-label>
              <ion-toggle slot="end" v-model="globalEnabled" @ionChange="toggleGlobal"></ion-toggle>
            </ion-item>
            <ion-item lines="none">
              <ion-label>{{$t('Toast')}}</ion-label>
              <ion-toggle slot="end" v-model="isToastEnabled" @ionChange="toggleToastSetting"></ion-toggle>
            </ion-item>
          </div>
  
          <div class="section-card">
            <h2 class="section-title">{{$t('colosenotify')}}</h2>
            <ion-list>
              <ion-item v-for="pub in disabledPubs" :key="pub" lines="none">
                <ion-label>{{ getAliasRealtime(pub) }}</ion-label>
                <ion-button slot="end" fill="clear" color="danger" @click="enableNotification(pub)">
                  open
                </ion-button>
              </ion-item>
              <ion-item v-if="disabledPubs.length === 0" lines="none">
                <ion-label>NULL</ion-label>
              </ion-item>
            </ion-list>
          </div>
        </div>
      </ion-content>
    </ion-page>
  </template>
  
  <script setup lang="ts">
  import { useNotification } from '@/composables/useNotification';
  import { getTalkFlowCore } from '@/composables/TalkFlowCore';
  import { useToast } from '@/composables/useToast';
  import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
  import {
    IonPage,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonItem,
    IonLabel,
    IonToggle,
    IonButton,
    IonList,
    IonButtons,
    IonBackButton,
  } from '@ionic/vue';
  import { onMounted } from 'vue';
  
  const notification = useNotification();
  const { globalEnabled, disabledPubs, toggleGlobalNotification, toggleFriendNotification } = notification;
  const chatFlow = getTalkFlowCore();
  const { getAliasRealtime } = chatFlow;
  const toast = useToast();
  const { isEnabled: isToastEnabled, toggleToast } = toast;
  
  onMounted(async () => {
    // 加载持久化的提示设置
    const settings = await loadToastSettings();
    toggleToast(settings.isToastEnabled);
    isToastEnabled.value = settings.isToastEnabled;
  });
  
  async function toggleGlobal() {
    await toggleGlobalNotification(globalEnabled.value);
  }
  
  async function enableNotification(pub: string) {
    await toggleFriendNotification(pub, false);
  }
  
  async function toggleToastSetting() {
    toggleToast(isToastEnabled.value);
    await saveToastSettings({ isToastEnabled: isToastEnabled.value });
  }
  
  // 加载提示设置
  async function loadToastSettings(): Promise<{ isToastEnabled: boolean }> {
    const defaultSettings = { isToastEnabled: true };
    try {
      const result = await Filesystem.readFile({
        path: 'toast_settings.json',
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });
      const data = typeof result.data === 'string' ? result.data : await result.data.text();
      return JSON.parse(data) || defaultSettings;
    } catch (err) {
      console.log('未找到提示设置文件，使用默认值');
      return defaultSettings;
    }
  }
  
  // 保存提示设置
  async function saveToastSettings(settings: { isToastEnabled: boolean }): Promise<void> {
    try {
      await Filesystem.writeFile({
        path: 'toast_settings.json',
        data: JSON.stringify(settings),
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });
      console.log('提示设置已保存:', settings);
      toast.showToast(`提示已${settings.isToastEnabled ? '启用' : '禁用'}`, 'success');
    } catch (err) {
      console.error('保存提示设置失败:', err);
      toast.showToast('保存提示设置失败', 'error');
    }
  }
  </script>
  
  <style scoped>
  .settings-container {
    padding: 1rem 0.5rem;
    margin: 0 auto;
  }
  
  .section-card {
    background: rgba(146, 145, 145, 0.106);
    border-radius: 16px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(8px);
  }
  
  .section-title {
    font-size: 1.2rem;
    font-weight: 600;
    color: #2c3e50;
    margin-bottom: 1rem;
   
  }
  
  ion-item {
    --background: transparent;
    --border-width: 0;
    --padding-start: 0;
    --inner-padding-end: 0;
    margin-bottom: 1rem;
   
  }
  
  /* ion-label {
    color: #7f8c8d !important;
    font-weight: 500;
  } */
  

  </style>