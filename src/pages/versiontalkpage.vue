<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import {
  IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent,
  IonList, IonItem, IonLabel, IonIcon,
} from '@ionic/vue';
import { helpCircleOutline } from 'ionicons/icons';

const router = useRouter();
const { t } = useI18n({ useScope: 'global' });

// 处理版本说明文本的 computed 属性，增强容错性
const versionData = computed(() => {
  const fullText = t('versiontalk1') || 'No version information available.';
  
  // 尝试按句号分割，如果没有则按完整文本处理
  let intro = fullText;
  let current = '';
  const currentSplit = fullText.split(/。当前版本中的|\. In the current version,/i); // 支持中英文分隔
  if (currentSplit.length > 1) {
    [intro, current] = currentSplit;
    current = `当前版本中的${current}`; // 默认中文，稍后可根据语言调整
  }

  // 提取正在开发中的功能
  let inProgressItems: string[] = [];
  const inProgressMatch = intro.match(/正在进行中的有(.+?)(?=。|$)/) || intro.match(/Currently in progress:(.+?)(?=\. In the current version|$)/i);
  if (inProgressMatch) {
    const inProgressRaw = inProgressMatch[1];
    inProgressItems = inProgressRaw.split(/[-–—]/).filter(item => item.trim()); // 支持多种连字符
    intro = intro.split(/正在进行中的有|Currently in progress:/i)[0];
  } else {
    inProgressItems = ['No features in progress listed.'];
  }

  return {
    intro: intro.trim(),
    inProgress: inProgressItems,
    current: current.trim() || 'No current version info available.'
  };
});
</script>

<template>
  <ion-page>
    <ion-header :translucent="true"  collapse="fade">
      <ion-toolbar class="liquid-toolbar">
        <ion-buttons slot="start">
          <ion-back-button default-href="/" color="dark"></ion-back-button>
        </ion-buttons>
        <ion-title>Version Info</ion-title>
   
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="liquid-content">
      <div class="version-container">
        <!-- 简介 -->
        <div class="section intro">
          <ion-label>{{ $t('versiontalk1') }}</ion-label>
        </div>

     
        <!-- <div class="section in-progress">
          <h2>Ongoing Development</h2>
          <ion-list>
            <ion-item v-for="(item, index) in versionData.inProgress" :key="index" lines="none">
              <ion-label class="ion-text-wrap">
                {{ index + 1 }}. {{ item }}
              </ion-label>
            </ion-item>
          </ion-list>
        </div>

        <div class="section current">
          <h2>Current Version</h2>
          <ion-label class="ion-text-wrap">{{ versionData.current }}</ion-label>
        </div> -->
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
/* Liquid Toolbar */
.liquid-toolbar {
  --border-color: transparent;
}

/* Content */
.liquid-content {
  --padding-top: 20px;
  --padding-bottom: 20px;
  --padding-start: 20px;
  --padding-end: 20px;

}

/* Version Container */
.version-container {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Sections */
.section {
  background: rgba(130, 130, 130, 0.1);
  padding: 15px;
  border-radius: 15px;
  transition: transform 0.3s ease;
}

.section:hover {
  transform: scale(1.02);
}

.section h2 {
  font-size: 1.25rem;
  margin: 0 0 15px;
  color: #333;
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

/* Intro Section */
.intro ion-label {
  font-size: 1rem;
  color: #666;
  line-height: 1.6;
}

/* In Progress Section */
.in-progress ion-list {
  background: transparent;
}

.in-progress ion-item {
  --background: transparent;
  --padding-start: 0;
  --padding-end: 0;
  --inner-padding-end: 0;
  margin-bottom: 10px;
}

.in-progress ion-label {
  color: #666 !important;
  font-size: 1rem;
  line-height: 1.5;
}

/* Current Section */
.current ion-label {
  font-size: 1rem;
  color: #666;
  line-height: 1.6;
  display: block;
}
</style>