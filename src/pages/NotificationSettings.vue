<template>
    <ion-page>
      <ion-header :translucent="true" collapse="fade">
        <ion-toolbar class="liquid-toolbar">
          <ion-buttons slot="start">
           <ion-back-button :text="$t('back')" ></ion-back-button>
          </ion-buttons>
          <ion-title>{{ $t('notificationSettingsTitle') }}</ion-title>
        </ion-toolbar>
      </ion-header>

      <ion-content :fullscreen="true" class="liquid-content">


            <ion-header collapse="condense" >
          <ion-toolbar>
            <h1 style="margin: 10px;font-weight: 900;font-size: 39px;">
{{ $t('notificationSettingsTitle') }}
            </h1>
          </ion-toolbar>
        </ion-header>


        <div class="guide-container">
          <!-- 介绍说明 -->
          <div class="intro-card">
            <ion-icon :icon="notificationsCircleOutline" class="intro-icon"></ion-icon>
            <h2 class="intro-title">{{ $t('aboutRemoteNotifications') }}</h2>
            <div class="intro-content">
              <p>{{ $t('iosNotificationDescription') }}</p>
              
              <p>{{ $t('linuxAndroidPwaDescription') }}</p>
              
              <p>{{ $t('privacyConsiderationDescription') }}</p>
              
              <p>{{ $t('respectConsiderationDescription') }}</p>
              
              <ion-note class="privacy-note">
                <ion-icon :icon="shieldCheckmarkOutline" class="note-icon"></ion-icon>
                <strong>{{ $t('finalReminderLabel') }}</strong>{{ $t('finalReminderDescription') }}
              </ion-note>
            </div>
          </div>

          <!-- Bark配置步骤 -->
          <div class="steps-card">
            <h2 class="steps-title">
              <ion-icon :icon="saveOutline" class="title-icon"></ion-icon>
              {{ $t('barkConfigurationSteps') }}
            </h2>
            
            <!-- 第一步 -->
            <div class="step-item">
              <div class="step-number">1</div>
              <div class="step-content">
                <h3>{{ $t('step1Title') }}</h3>
                <p>{{ $t('step1Description') }}</p>
                <ion-button fill="outline" size="small" @click="openAppStore">
                  <ion-icon :icon="logoApple" slot="start"></ion-icon>
                  {{ $t('goToAppStore') }}
                </ion-button>

                   <ion-button fill="outline" size="small" @click="openGitHub">
                  <ion-icon :icon="logoGithub"  slot="start"></ion-icon>
                  {{ $t('goToGitHub') }}
                </ion-button>
              </div>
            </div>

            <!-- 第二步 -->
            <div class="step-item">
              <div class="step-number">2</div>
              <div class="step-content">
                <h3>{{ $t('step2Title') }}</h3>
                <p>{{ $t('step2Description1') }}</p>
                <div class="code-block">
                  <code>https://api.day.app/your-device-key</code>
                </div>
                <p>{{ $t('step2Description2') }}</p>
                <ion-note>
                  <ion-icon :icon="keyOutline" class="note-icon"></ion-icon>
                  {{ $t('deviceKeyNote') }}
                </ion-note>
              </div>
            </div>

            <!-- 第三步 -->
            <div class="step-item">
              <div class="step-number">3</div>
              <div class="step-content">
                <h3>{{ $t('step3Title') }}</h3>
                <p>{{ $t('step3Description') }}</p>
               
              </div>
            </div>
          </div>

          <!-- 功能特性 -->
          <div class="features-card">
            <h2 class="features-title">
              <ion-icon :icon="star" class="title-icon"></ion-icon>
              {{ $t('features') }}
            </h2>
            
            <div class="feature-list">
              <div class="feature-item">
                <ion-icon :icon="shieldCheckmarkOutline"  class="feature-icon"></ion-icon>
                <div class="feature-text">
                  <h4>{{ $t('privacyProtectionFeature') }}</h4>
                  <p>{{ $t('privacyProtectionDescription') }}</p>
                </div>
              </div>
              
              <div class="feature-item">
                <ion-icon :icon="notificationsCircleOutline" class="feature-icon"></ion-icon>
                <div class="feature-text">
                  <h4>{{ $t('instantNotificationFeature') }}</h4>
                  <p>{{ $t('instantNotificationDescription') }}</p>
                </div>
              </div>
              
              <div class="feature-item">
                <ion-icon :icon="options" class="feature-icon"></ion-icon>
                <div class="feature-text">
                  <h4>{{ $t('certificateControlFeature') }}</h4>
                  <p>{{ $t('certificateControlDescription') }}</p>
                </div>
              </div>
              
              <div class="feature-item">
                <ion-icon :icon="lockClosed" class="feature-icon"></ion-icon>
                <div class="feature-text">
                  <h4>{{ $t('endToEndEncryptionFeature') }}</h4>
                  <p>{{ $t('endToEndEncryptionDescription') }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- 帮助链接 -->
          <div class="help-card">
            <h3>{{ $t('needHelp') }}</h3>
            <p>{{ $t('helpDescription') }}</p>
            <div class="help-buttons">
              <ion-button fill="outline" size="small" @click="openBarkDocs">
            
                {{ $t('barkOfficialDocs') }}
              </ion-button>
              <ion-button fill="outline" size="small" @click="openTalkFlowDocs">
               
                {{ $t('talkFlowHelp') }}
              </ion-button>
            </div>
          </div>
        </div>
      </ion-content>
    </ion-page>
  </template>
  
  <script setup lang="ts">
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonButtons,
  IonBackButton,
  IonNote,
  IonIcon,
} from '@ionic/vue';
import { Browser } from '@capacitor/browser';
import { useRouter } from 'vue-router';
import { 
shieldCheckmarkOutline,
  saveOutline,
  notificationsCircleOutline,
  logoGithub,
  logoApple,
  keyOutline,
  star,
  options,
  lockClosed,
  documentText,
  helpCircleOutline,
} from 'ionicons/icons';
const router = useRouter();

// 打开App Store
const openAppStore = async () => {
  await Browser.open({
    url: 'https://apps.apple.com/us/app/bark-custom-notifications/id1403753865?l=en-GB'
  });
};
const openGitHub = async () => {
  await Browser.open({
    url: 'https://github.com/finb/bark'
  });
};
// 前往通知设置页面
const goToSettings = () => {
  // 这里可以导航到实际的设置页面
  router.push('/settings/notification-config');
};

// 打开Bark官方文档
const openBarkDocs = async () => {
  await Browser.open({
    url: 'https://github.com/finb/bark'
  });
};

// 打开TalkFlow帮助文档
const openTalkFlowDocs = async () => {
  await Browser.open({
    url: 'https://github.com/ponzS/TalkFlow'
  });
};
</script>
  
  <style scoped>
.guide-container {
  padding: 1rem;
  max-width: 800px;
  margin: 0 auto;
  background: var(--ion-background-color);
}

/* 介绍卡片 */
.intro-card {
  background: linear-gradient(135deg, rgba(74, 144, 226, 0.1), rgba(80, 200, 120, 0.1));
  border-radius: 20px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid var(--ion-color-step-200, rgba(255, 255, 255, 0.2));
}

.intro-icon {
  font-size: 3rem;
  color: var(--ion-color-primary, #4a90e2);
  margin-bottom: 1rem;
}

.intro-title {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--ion-text-color);
  margin-bottom: 1.5rem;
  text-align: center;
}

.intro-content p {
  font-size: 1rem;
  line-height: 1.6;
  color: var(--ion-text-color);
  margin-bottom: 1rem;
  text-align: justify;
}

.privacy-note {
  background: rgba(231, 76, 60, 0.1);
  border-left: 4px solid var(--ion-color-danger, #e74c3c);
  padding: 1rem;
  border-radius: 8px;
  margin-top: 1.5rem;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.note-icon {
  font-size: 1.2rem;
  color: var(--ion-color-danger, #e74c3c);
  margin-top: 0.2rem;
}

/* 步骤卡片 */
.steps-card {
  background: var(--ion-background-color);
  border-radius: 20px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid var(--ion-color-step-150, rgba(0, 0, 0, 0.1));
}

.steps-title {
  font-size: 1.6rem;
  font-weight: 600;
  color: var(--ion-text-color);
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.title-icon {
  font-size: 1.5rem;
  color: var(--ion-color-primary, #4a90e2);
}

.step-item {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 2rem;
  align-items: flex-start;
}

.step-number {
  background: linear-gradient(135deg, #4a90e2, #50c878);
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1.2rem;
  flex-shrink: 0;
}

.step-content h3 {
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--ion-text-color);
  margin-bottom: 0.5rem;
}

.step-content p {
  font-size: 1rem;
  line-height: 1.5;
  color: var(--ion-text-color);
  margin-bottom: 1rem;
}

.code-block {
  background: var(--ion-color-step-50, #f8f9fa);
  border: 1px solid var(--ion-color-step-150, #e9ecef);
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.code-block code {
  color: var(--ion-color-danger, #e74c3c);
  font-weight: 500;
}

/* 功能特性卡片 */
.features-card {
  background: rgba(155, 89, 182, 0.1);
  border-radius: 20px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid var(--ion-color-step-150, rgba(0, 0, 0, 0.1));
}

.features-title {
  font-size: 1.6rem;
  font-weight: 600;
  color: var(--ion-text-color);
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.feature-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.feature-item {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  padding: 1rem;
  background: var(--ion-color-step-50, rgba(255, 255, 255, 0.5));
  border-radius: 12px;
  transition: transform 0.2s ease;
  border: 1px solid var(--ion-color-step-100, rgba(0, 0, 0, 0.05));
}

.feature-item:hover {
  transform: translateY(-2px);
}

.feature-icon {
  font-size: 2rem;
  color: var(--ion-color-secondary, #9b59b6);
  flex-shrink: 0;
}

.feature-text h4 {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--ion-text-color);
  margin-bottom: 0.5rem;
}

.feature-text p {
  font-size: 0.9rem;
  color: var(--ion-color-medium, #7f8c8d);
  line-height: 1.4;
}

/* 帮助卡片 */
.help-card {
  background: rgba(52, 152, 219, 0.1);
  border-radius: 16px;
  padding: 1.5rem;
  text-align: center;
  border: 1px solid var(--ion-color-step-150, rgba(0, 0, 0, 0.1));
}

.help-card h3 {
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--ion-text-color);
  margin-bottom: 1rem;
}

.help-card p {
  font-size: 1rem;
  color: var(--ion-text-color);
  margin-bottom: 1.5rem;
}

.help-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

/* 按钮样式 */
ion-button {
  --border-radius: 12px;
  margin: 0.5rem 0;
  font-weight: 500;
}

ion-button[fill="solid"] {
  --background: linear-gradient(135deg, #4a90e2, #50c878);
  --color: white;
}

ion-button[fill="outline"] {
  --border-color: #4a90e2;
  --color: #4a90e2;
}

ion-button[size="small"] {
  --padding-top: 8px;
  --padding-bottom: 8px;
  --padding-start: 16px;
  --padding-end: 16px;
  font-size: 0.9rem;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .guide-container {
    padding: 0.5rem;
  }
  
  .intro-card,
  .steps-card,
  .features-card {
    padding: 1.5rem;
  }
  
  .step-item {
    gap: 1rem;
  }
  
  .feature-list {
    grid-template-columns: 1fr;
  }
  
  .help-buttons {
    flex-direction: column;
    align-items: center;
  }
}
</style>