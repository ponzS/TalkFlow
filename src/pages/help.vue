<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <ion-page>
    <ion-header :translucent="true" collapse="fade">
      <ion-toolbar >
        <ion-buttons slot="start">
        <ion-back-button :text="$t('back')" ></ion-back-button>
        </ion-buttons>
        <ion-title>Help & Support</ion-title>
      </ion-toolbar>
    </ion-header>

    <!-- Preloader -->
    <transition name="fade">
      <div v-if="isLoading && shouldShowPreloader" class="loading-overlay">
        <div class="title-container">
          <p class="grok-title-text">TalkFlow</p>
          <p class="version-text">v1.0</p>
        </div>
      </div>
    </transition>

    <!-- Main Content -->
    <ion-content :fullscreen="true" v-if="!isLoading">
      <div class="content-wrapper">
        <!-- Title and Subtitle -->
        <div class="header-text">
          <h1 class="title">Welcome to TalkFlow</h1>
          <!-- <p class="subtitle">
            Your gateway to assistance. Contact us via the channels below.
          </p> -->
        </div>

        <!-- Contact List -->
        <ion-list>
          <ion-item>
            <ion-icon :icon="mailOutline" slot="start"></ion-icon>
            <ion-label>
              <h3>Email</h3>
              <p>
                <a href="mailto:zhangguoai888@gmail.com" class="contact-link">
                  zhangguoai888@gmail.com
                </a>
              </p>
            </ion-label>
          </ion-item>

          <ion-item>
            <ion-icon :icon="logoTwitter" slot="start"></ion-icon>
            <ion-label>
              <h3>X</h3>
              <p>
                <a href="https://x.com/GuoaiZ11355" target="_blank" class="contact-link">
                  @GuoaiZ11355
                </a>
              </p>
            </ion-label>
          </ion-item>

          <ion-item>
            <ion-icon :icon="globeOutline" slot="start"></ion-icon>
            <ion-label>
              <h3>Website</h3>
              <p>
                <a href="https://ponzs.com" target="_blank" class="contact-link">
                  ponzs.com
                </a>
              </p>
              <p>
                <a href="https://talkflow.team" target="_blank" class="contact-link">
                  talkflow.team
                </a>
              </p>
            </ion-label>
          </ion-item>
        </ion-list>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonButtons,
  IonBackButton
} from '@ionic/vue'
import { mailOutline, logoTwitter, globeOutline } from 'ionicons/icons'
import { useRouter } from 'vue-router'

const router = useRouter()

// State
const isLoading = ref(true)
const shouldShowPreloader = ref(false)

// Check first visit
const checkFirstVisit = () => {
  const hasVisited = localStorage.getItem('hasVisited')
  if (!hasVisited) {
    shouldShowPreloader.value = true
    localStorage.setItem('hasVisited', 'true')
  } else {
    isLoading.value = false
    shouldShowPreloader.value = false
  }
}

// Lifecycle
onMounted(() => {
  checkFirstVisit()
  if (shouldShowPreloader.value) {
    setTimeout(() => {
      isLoading.value = false
    }, 2000) // Preloader duration: 2 seconds
  }
})
</script>

<style scoped>
/* Cosmic Background */
.content-wrapper {
  padding: 20px;
  min-height: 100%;
  background: linear-gradient(180deg, #0a0a23 0%, #1a1a3d 100%);
  background-image: url('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Ccircle cx="10" cy="10" r="1"/%3E%3Ccircle cx="90" cy="20" r="2"/%3E%3Ccircle cx="50" cy="80" r="1"/%3E%3Ccircle cx="30" cy="50" r="2"/%3E%3C/g%3E%3C/svg%3E');
}

/* Toolbar */


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
  color: #b0b0ff;
  font-family: 'Montserrat', sans-serif;
  font-size: 1rem;
  margin-top: 8px;
}

/* List Items */
ion-list {
  background: transparent;
}

ion-item {
  --background: transparent;
  --border-color: rgba(255, 255, 255, 0.1);

  margin-bottom: 12px;
  transition: transform 0.2s ease;
}

ion-item:hover {
  transform: translateX(5px);
}

ion-icon {
  color: #6b6bff;
}

ion-label h3 {
  
  font-family: 'Montserrat', sans-serif;
  font-weight: 600;
  font-size: 1.1rem;
}

.contact-link {
  color: #6b6bff;
  text-decoration: none;
  font-weight: 500;
}

.contact-link:hover {

  text-decoration: underline;
}

/* Preloader */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #0a0a23;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.grok-title-text {
  font-size: 15vw;
  font-family: 'Orbitron', sans-serif;
  font-weight: 900;
  background: linear-gradient(-45deg, #6b6bff, #ffffff, #6b6bff);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  background-size: 200% 200%;
  animation: gradientBreath 6s ease infinite;
}

.version-text {
  font-size: 1.2rem;
 
  margin-top: 1rem;
  font-family: 'Montserrat', sans-serif;
}

@keyframes gradientBreath {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>