<!-- src/views/Language.vue -->
<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <ion-page>
    <ion-header :translucent="true" collapse="fade">
      <ion-toolbar class="liquid-toolbar">
        <ion-buttons slot="start">
          <ion-back-button color="dark"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ $t('language') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="liquid-content">
      <div class="brand">{{ $t('hello') }}</div>

      <ion-list class="language-options">
        <ion-item
          v-for="lang in languages"
          :key="lang.code"
          :class="{ active: lang.code === selectedLanguage }"
        >
          <ion-label class="language-label">{{ lang.name }}</ion-label>
          <ion-toggle
            slot="end"
            :checked="lang.code === selectedLanguage"
            @ionChange="selectLanguage(lang)"
            color="dark"
          ></ion-toggle>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { useLanguage } from '@/composables/useLanguage';
import { onMounted } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonList, IonItem, IonLabel, IonToggle,
} from '@ionic/vue';

const { languages, selectedLanguage, selectLanguage, initLanguage } = useLanguage();

onMounted(async () => {
  await initLanguage(); // 初始化时加载保存的语言
});
</script>

<style scoped>
/* Liquid Toolbar */
.liquid-toolbar {
  --border-color: transparent;
}

/* Liquid Content */
.liquid-content {
  --padding-top: 20px;
  --padding-bottom: 20px;
}

/* Brand */
.brand {
  font-size: 1.75em;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  text-align: center;
  padding: 20px 0;
  animation: float 3s ease-in-out infinite;
}

/* Language Options */
.language-options {
  --background: rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  margin: 0 auto 20px auto;
  overflow-y: auto;
  backdrop-filter: blur(10px);
}

.language-options::-webkit-scrollbar {
  width: 8px;
}

.language-options::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.language-options::-webkit-scrollbar-thumb {
  background: linear-gradient(45deg, #66ccff, #99eeff);
  border-radius: 4px;
}

/* Language Item */
.language-item {
  --background: rgba(255, 255, 255, 0.2);
  --border-radius: 15px;
  --padding-start: 20px;
  --padding-end: 20px;
  --min-height: 60px;
  margin-bottom: 12px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.language-item:hover {
  transform: scale(1.02);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.language-item.active {
  --background: linear-gradient(45deg, #66ccff, #99eeff);
  transform: scale(1.02);
}

.language-label {
  font-size: 1.2rem;
  line-height: 1.5;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

/* Toggle Styling */
ion-toggle {
  --background: rgba(255, 255, 255, 0.3);
  --background-checked: linear-gradient(45deg, #66ccff, #99eeff);
  --handle-background: #fff;
  --handle-background-checked: #fff;
  width: 50px;
  height: 24px;
}

/* Animations */
@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}
</style>