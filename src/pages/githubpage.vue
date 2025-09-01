<!-- eslint-disable vue/multi-word-component-names -->
<template>
    <ion-page>
      <ion-header :translucent="true" collapse="fade">
        <ion-toolbar >
          <ion-buttons slot="start">
            <ion-back-button @click="router.go(-1)" color="dark"></ion-back-button>
          </ion-buttons>
          <ion-title>{{$t('github')}}</ion-title>
        </ion-toolbar>
      </ion-header>
  
      <!-- Main Content -->
      <ion-content :fullscreen="true">

        <ion-header collapse="condense" >
          <ion-toolbar>
            <ion-title size="large">{{ $t('github') }}</ion-title>
          </ion-toolbar>
        </ion-header>


        <div class="content-wrapper">
          <!-- Image Preview -->
          <div class="image-preview">
            <p class="preview-label">Windows&Linux&MacOS</p>
            <img
              src="./relay.png"
            
              class="preview-image"
            />
            <p class="preview-note">*{{$t('github1')}}</p>
          </div>
  
          <!-- Title and Subtitle -->
          <div class="header-text">
            <h1 class="title">GunRelay-TalkFlow</h1>
            <p class="subtitle">
                {{$t('github2')}}
            </p>
          </div>
  
          <!-- Intro Text -->
          <div class="intro-text">
            <p>
              <strong>GunRelay-TalkFlow</strong> {{$t('github3')}}
            </p>
            <p>
                {{$t('github5')}}
            </p>
          </div>
  
          <!-- GitHub Link -->
          <ion-button expand="block" class="github-button" @click="openGitHub">
            <ion-icon :icon="logoGithub" slot="start"></ion-icon>
            {{$t('github4')}}
          </ion-button>
        </div>
      </ion-content>
    </ion-page>
  </template>
  
  <script setup lang="ts">
  import { IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonButton, IonIcon, IonButtons, IonBackButton } from '@ionic/vue'
  import { logoGithub } from 'ionicons/icons'
  import { useRouter } from 'vue-router'
  
  const router = useRouter()
  
  // Function to open GitHub link
  const openGitHub = () => {
    window.open('https://github.com/ponzS/GunRelay-TalkFlow', '_blank')
  }
  </script>
  
  <style scoped>
  /* Cosmic Background */
  .content-wrapper {
    padding: 20px;
    min-height: 100%;
    background: linear-gradient(180deg, #0a0a23 0%, #1a1a3d 100%);
    background-image: url('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Ccircle cx="10" cy="10" r="1"/%3E%3Ccircle cx="90" cy="20" r="2"/%3E%3Ccircle cx="50" cy="80" r="1"/%3E%3Ccircle cx="30" cy="50" r="2"/%3E%3C/g%3E%3C/svg%3E');
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
    /* color: #b0b0ff; */
    font-family: 'Montserrat', sans-serif;
    font-size: 1rem;
    margin-top: 8px;
  }
  
  /* Intro Text */
  .intro-text {
    /* color: #d0d0ff; */
    font-family: 'Montserrat', sans-serif;
    font-size: 1rem;
    line-height: 1.6;
    margin-bottom: 20px;
  }
  
  .intro-text strong {
    color: #6b6bff;
  }
  
  /* GitHub Button */
  .github-button {
    --background: #6b6bff;
    --background-activated: #5a5aff;
    --color: #ffffff;
    margin: 20px 0;
    border-radius: 8px;
    font-family: 'Montserrat', sans-serif;
    font-weight: 600;
    transition: transform 0.2s ease;
    margin-bottom: 139px;
  }
  
  .github-button:hover {
    transform: scale(1.05);
  }
  
  /* Image Preview */
  .image-preview {
    margin: 20px 0;
    text-align: center;
  }
  
  .preview-label {
    /* color: #ffffff; */
    font-family: 'Montserrat', sans-serif;
    font-size: 1.2rem;
    font-weight: 600;
    margin-bottom: 10px;
  }
  
  .preview-image {
    max-width: 100%;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  }
  
  .preview-note {
    /* color: #b0b0ff; */
    font-size: 0.9rem;
    margin-top: 8px;
    font-style: italic;
  }
  </style>