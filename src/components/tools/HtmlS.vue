<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar class="liquid-toolbar">
        <ion-buttons slot="start">
          <ion-back-button default-href="/" color="dark"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ $t('EncryptContent') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="liquid-content">
      <div class="content-container">
        <div v-if="!orderCreated">
          <!-- Input Form -->
          <ion-list class="input-list">
            <ion-item lines="none">
              <ion-label position="stacked">{{ $t('Content') }}</ion-label>
              <ion-textarea
                v-model="description"
                :placeholder="$t('EnterFileDescription')"
                auto-grow
                rows="4"
              ></ion-textarea>
            </ion-item>
            <ion-item lines="none">
              <ion-label position="stacked">{{ $t('SetPassword') }}</ion-label>
              <ion-input
                type="password"
                v-model="password"
                :placeholder="$t('EnterPassword')"
              ></ion-input>
            </ion-item>
          </ion-list>

          <ion-button expand="block" class="liquid-btn" @click="generateOrder">
            {{ $t('Encrypt') }}
          </ion-button>
        </div>

        <div v-else>
          <!-- Generated Link -->
          <ion-list class="result-list">
            <ion-item lines="none">
              <ion-label position="stacked">Link</ion-label>
              <ion-input :value="orderPageUrl" readonly></ion-input>
            </ion-item>
          </ion-list>

          <div class="button-group">
            <ion-button expand="block" class="liquid-btn" @click="copyLink">
              {{ $t('CopyLink') }}
            </ion-button>
            <ion-button expand="block" fill="outline" color="medium" @click="goBack">
              {{ $t('Back') }}
            </ion-button>
          </div>
        </div>
      </div>

      <!-- Toast for Copy Feedback -->
      <ion-toast
        :is-open="toastOpen"
        :message="$t('LinkCopied')"
        :duration="1500"
        position="bottom"
        @didDismiss="toastOpen = false"
      ></ion-toast>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent,
  IonList, IonItem, IonLabel, IonTextarea, IonInput, IonButton, IonToast,
} from '@ionic/vue';

const router = useRouter();

const orderCreated = ref(false);
const orderPageUrl = ref('');
const description = ref('');
const password = ref('');
const toastOpen = ref(false);

const generateOrder = () => {
  const formattedDescription = description.value.replace(/\n/g, '<br>');

  const orderHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>TalkFlow</title>
      <style>
    body {
      font-family: 'Arial', sans-serif;
      background: #000; 
      color: #fff; 
      padding: 20px;
      margin: 0;
      line-height: 1.6; 
    }
    .content-wrapper {
      max-width: 800px; 
      margin: 0 auto; 
    }
    p {
      font-size: 1.1rem; 
      margin-bottom: 1rem;
      word-wrap: break-word; 
    }
  
      </style>
    </head>
    <body>
      <div id="content" class="content-wrapper">
        <div>
          <p>${formattedDescription}</p>
        </div>
      </div>
      <script>
        var correctPassword = \`${password.value}\`;
        function askForPassword() {
          var userPassword = prompt("Input password:");
          if (userPassword === correctPassword) {
            document.getElementById("content").style.display = "block";
          } else {
            alert("False password");
            askMathQuestion();
          }
        }
        function askMathQuestion() {
          var num1 = Math.floor(Math.random() * 100) + 1;
          var num2 = Math.floor(Math.random() * 100) + 1;
          var correctAnswer = num1 + num2;
          var userAnswer = prompt("AI Check: " + num1 + " + " + num2 + " = ?");
          if (parseInt(userAnswer, 10) === correctAnswer) {
            askForPassword();
          } else {
            alert("Try again");
            askMathQuestion();
          }
        }
        askMathQuestion();
      <\/script>
    </body>
    </html>
  `.trim();

  orderPageUrl.value = `data:text/html;charset=utf-8,${encodeURIComponent(orderHtml)}`;
  orderCreated.value = true;
};

const copyLink = async () => {
  const textField = document.createElement('textarea');
  textField.innerText = orderPageUrl.value;
  document.body.appendChild(textField);
  textField.select();
  document.execCommand('copy');
  textField.remove();
  toastOpen.value = true; // Show toast instead of alert
};

const goBack = () => {
  orderCreated.value = false;
  description.value = '';
  password.value = '';
};
</script>

<style scoped>
/* Liquid Toolbar */
.liquid-toolbar {
  --border-color: transparent;
 
}

/* Content */
.liquid-content {
  --background: linear-gradient(45deg, #00000000, #5151E5);
  --padding-top: 20px;
  --padding-bottom: 20px;
  --padding-start: 20px;
  --padding-end: 20px;
}

/* Content Container */
.content-container {
  max-width: 600px;
  margin: 0 auto;
}

/* Input List */
.input-list {
  background: transparent;
  margin-bottom: 20px;
}

.input-list ion-item {
  --background: rgba(255, 255, 255, 0.2);
  --border-radius: 12px;
  --padding-start: 12px;
  --padding-end: 12px;
  margin-bottom: 15px;
}

.input-list ion-label {

  font-weight: 500;
  margin-bottom: 5px;
}

.input-list ion-textarea,
.input-list ion-input {
  /* --background: transparent; */
  border-radius: 10px;
  /* --placeholder-color: rgba(255, 255, 255, 0.7); */
  --padding-top: 10px;
  --padding-bottom: 10px;
}

/* Result List */
.result-list {
  background: transparent;
  margin-bottom: 20px;
}

.result-list ion-item {
 
  --border-radius: 12px;
  --padding-start: 12px;
  --padding-end: 12px;
}

.result-list ion-label {
 
  font-weight: 500;
  margin-bottom: 5px;
}

.result-list ion-input {
  --background: transparent;

}

/* Button Group */
.button-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Liquid Button */
.liquid-btn {
  --background: linear-gradient(45deg, #72EDF2, #5151E5);
  --border-radius: 12px;

  height: 44px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.liquid-btn:hover {
  --background: linear-gradient(45deg, #82f5fc, #5d5dff);
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

/* Back Button (Outline) */
ion-button[color="medium"] {
  --border-radius: 12px;

}
</style>