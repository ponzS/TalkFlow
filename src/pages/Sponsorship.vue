<!-- eslint-disable vue/multi-word-component-names -->
<template>
    <ion-page>
      <ion-header :translucent="true" collapse="fade">
        <ion-toolbar>
          <ion-buttons slot="start">
            <ion-back-button @click="router.go(-1)" color="dark"></ion-back-button>
          </ion-buttons>
          <ion-title>{{ $t('sponsor1') }}</ion-title>
        </ion-toolbar>
      </ion-header>
  
      <!-- Main Content -->
      <ion-content :fullscreen="true">

        <ion-header collapse="condense" >
          <ion-toolbar>
            <ion-title size="large">{{ $t('sponsor1') }}</ion-title>
          </ion-toolbar>
        </ion-header>


        <div class="content-wrapper">
          <!-- Title and Subtitle -->
          <div class="header-text">
            <!-- <h1 class="title">{{ $t('sponsor1') }}</h1> -->
            <p class="subtitle">{{ $t('sponsor2') }}</p>
            <p class="subtitle">{{ $t('sponsor3') }}</p>
            <p class="subtitle">{{ $t('sponsor4') }}</p>
          </div>
  
          <!-- Contact Methods -->
          <div class="contact-section">
            <h2 class="section-title">{{ $t('sponsor5') }}</h2>
            <ion-list>
              <ion-item>
                <ion-icon :icon="logoTwitter" slot="start"></ion-icon>
                <ion-label>
                  <p>
                    X:
                    <a href="https://x.com/GuoaiZ11355" target="_blank" class="contact-link">
                      @GuoaiZ11355
                    </a>
                  </p>
                </ion-label>
              </ion-item>
              <ion-item>
                <ion-icon :icon="mailOutline" slot="start"></ion-icon>
                <ion-label>
                  <p>
                    Email:
                    <a href="mailto:zhangguoai888@gmail.com" class="contact-link">
                      zhangguoai888@gmail.com
                    </a>
                  </p>
                </ion-label>
              </ion-item>
            </ion-list>
          </div>
  
          <!-- Sponsored Individuals -->
          <div class="sponsors-section">
            <h2 class="section-title">{{ $t('sponsor6') }}</h2>
            <ion-list>
              <ion-item>
                <ion-avatar slot="start">
        <img src="@/assets/ponzs.jpg" />
      </ion-avatar>
                <ion-label>
                  <h3>ponzS / GuoAi Zhang</h3>
                  <p>{{ $t('sponsor7') }}</p>
                </ion-label>
              </ion-item>
              <ion-item>
                <ion-avatar slot="start">
        <img src="@/assets/mark.jpg" />
      </ion-avatar>
                <ion-label>
                  <h3>Mark Nadal</h3>
                  <p>{{ $t('sponsor8') }}</p>
                </ion-label>
              </ion-item>
              <ion-item>
                <ion-avatar slot="start">
        <img src="@/assets/davay.jpg" />
      </ion-avatar>
                <ion-label>
                  <h3>Davay / Denis Starov </h3>
                  <p>{{ $t('sponsor9') }}</p>
                </ion-label>
              </ion-item>
              <ion-item>
                <ion-avatar slot="start">
        <img src="@/assets/gun.jpg" />
      </ion-avatar>
                <ion-label>
                  <h3>Gun team</h3>
                  <p>{{ $t('sponsor10') }}</p>
                </ion-label>
              </ion-item>
            </ion-list>
          </div>
  
          <!-- Tools and Languages -->
          <div class="tools-section">
            <h2 class="section-title">{{ $t('sponsor11') }}</h2>
            <p class="tools-text">{{ $t('sponsor12') }}</p>
            <ul class="tools-list">
              <li><strong>{{ $t('sponsor13') }}</strong> TypeScript, JavaScript, Swift</li>
              <li><strong>{{ $t('sponsor14') }}</strong> GunDB, SQLite</li>
              <li><strong>{{ $t('sponsor15') }}</strong> Vue, Vite, ThreeJs, Capacitor, ollama</li>
            </ul>
          </div>
        </div>
      </ion-content>
    </ion-page>
  </template>
  
  <script setup lang="ts">
  import { IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonList, IonItem, IonLabel, IonIcon, IonButtons, IonBackButton } from '@ionic/vue'
  import { logoTwitter, mailOutline } from 'ionicons/icons'
  import { useRouter } from 'vue-router'
  
  const router = useRouter()
  </script>
  
  <style scoped>
  ion-avatar {
  width: 59px; /* Adjust size as needed */
  height: 59px;
  --border-radius: 13px;
  margin-right: 30px; /* Space between avatar and text */
}

ion-avatar img {
  object-fit: cover; /* Ensures the image fills the avatar circle */
}
  /* Cosmic Background */
  .content-wrapper {
    padding: 20px;
    min-height: 100%;
    background: linear-gradient(180deg, #0a0a23 0%, #1a1a3d 100%);
    background-image: url('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Ccircle cx="10" cy="10" r="1"/%3E%3Ccircle cx="90" cy="20" r="2"/%3E%3Ccircle cx="50" cy="80" r="1"/%3E%3Ccircle cx="30" cy="50" r="2"/%3E%3C/g%3E%3C/svg%3E');
  }
  
  /* Toolbar */
  .grok-toolbar {
    --background: rgba(10, 10, 35, 0.9);
  }
  
  /* Header Text */
  .header-text {
    margin: 20px 0;
    text-align: center;
  }
  
  .title {
    font-family: 'Montserrat', sans-serif;
    font-weight: 700;
    font-size: 1.8rem;
    margin: 0;
  }
  
  .subtitle {
    font-family: 'Montserrat', sans-serif;
    font-size: 1rem;
    margin-top: 8px;
  }
  
  /* Section Titles */
  .section-title {
    font-family: 'Montserrat', sans-serif;
    font-weight: 600;
    font-size: 1.4rem;
    margin: 20px 0 10px;
  }
  
  /* Contact Section */
  .contact-section ion-list {
    background: transparent;
  }
  
  .contact-section ion-item {
    --background: transparent;
    --border-color: rgba(255, 255, 255, 0.1);
    margin-bottom: 12px;
    transition: transform 0.2s ease;
  }
  
  .contact-section ion-item:hover {
    transform: translateX(5px);
  }
  
  .contact-section ion-icon {
    color: #6b6bff; /* 图标颜色保留，因为它不影响主题文字 */
  }
  
  .contact-link {
    text-decoration: none;
    font-weight: 500;
  }
  
  .contact-link:hover {
    text-decoration: underline;
  }
  
  /* Sponsors Section */
  .sponsors-section ion-list {
    background: transparent;
  }
  
  .sponsors-section ion-item {
    --background: transparent;
    --border-color: rgba(255, 255, 255, 0.1);
    margin-bottom: 12px;
  }
  
  .sponsors-section ion-label h3 {
    font-family: 'Montserrat', sans-serif;
    font-weight: 600;
    font-size: 1.1rem;
  }
  
  .sponsors-section ion-label p {
    font-size: 0.9rem;
    line-height: 1.4;
  }
  
  /* Tools Section */
  .tools-text {
    font-family: 'Montserrat', sans-serif;
    font-size: 1rem;
    line-height: 1.6;
    margin-bottom: 10px;
  }
  
  .tools-list {
    list-style: none;
    padding: 0;
    font-family: 'Montserrat', sans-serif;
    font-size: 0.9rem;
  }
  
  .tools-list li {
    margin-bottom: 8px;
  }
  
  .tools-list strong {
    color: #6b6bff; /* 保留 strong 的颜色以突出显示 */
  }
  </style>