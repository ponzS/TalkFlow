<template>
  <ion-page>
    <!-- <ion-header :translucent="true" collapse="fade">
      <ion-toolbar class="liquid-toolbar">
        <ion-buttons slot="start">
          <ion-back-button text="Discover" color="dark"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ $t('EncryptContent') }}</ion-title>

        <ion-buttons slot="end">
          <ion-button color="dark" @click="showHelpModal = true">
            <ion-icon :icon="helpCircleOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header> -->

    <ion-content :fullscreen="true" class="liquid-content" :scroll-y="true" :style="{ '--content-bottom': keyboardHeight + 'px' }">
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
                ref="textareaRef"
                @focus="onInputFocus"
                @blur="onInputBlur"
              ></ion-textarea>
            </ion-item>
            <ion-item lines="none">
              <ion-label position="stacked">{{ $t('SetPassword') }}</ion-label>
              <ion-input
                type="password"
                v-model="password"
                :placeholder="$t('EnterPassword')"
                ref="inputRef"
                @focus="onInputFocus"
                @blur="onInputBlur"
              ></ion-input>
            </ion-item>
          </ion-list>

          <ion-button expand="block" color="dark" @click="generateOrder">
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
            <ion-button expand="block" color="dark" @click="copyLink">
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

      <!-- Help Modal -->
      <ion-modal
        :is-open="showHelpModal"
        css-class="help-modal"
        @didDismiss="showHelpModal = false"
        :backdrop-dismiss="true"
        :initial-breakpoint="0.75"
        :breakpoints="[0, 0.75, 1]"
      >
        <ion-content class="ion-padding">
          <ion-header>
            <ion-toolbar>
              <ion-title>{{ $t('Help') }}</ion-title>
              <ion-buttons slot="end">
                <ion-button @click="showHelpModal = false">
                  <ion-icon color="dark" :icon="closeOutline"></ion-icon>
                </ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>

          <div class="help-content">
            <h2>{{ $t('HowToUse') }}</h2>
            <ion-list>
              <ion-item lines="none">
                <ion-label class="ion-text-wrap">
                  {{ $t('htmltalk') }}
                </ion-label>
              </ion-item>
           
            </ion-list>

          
          </div>

          <ion-button expand="block" color="dark" @click="showHelpModal = false">
            {{ $t('Close') }}
          </ion-button>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup >
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useKeyboardState } from '@/composables/useKeyboardState';
import {
  IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent,
  IonList, IonItem, IonLabel, IonTextarea, IonInput, IonButton, IonToast,
  IonModal, IonIcon
} from '@ionic/vue';
import { helpCircleOutline, closeOutline } from 'ionicons/icons';

const router = useRouter();

const orderCreated = ref(false);
const orderPageUrl = ref('');
const description = ref('');
const password = ref('');
const toastOpen = ref(false);
const { keyboardHeight, inputFocused, initKeyboard } = useKeyboardState();
const textareaRef = ref(null);
const inputRef = ref(null);
const showHelpModal = ref(false);

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
  toastOpen.value = true;
};

const goBack = () => {
  orderCreated.value = false;
  description.value = '';
  password.value = '';
};

const onInputFocus = () => {
  inputFocused.value = true;
  nextTick(() => scrollToBottom());
};

const onInputBlur = () => {
  inputFocused.value = false;
};

const scrollToBottom = () => {
  const content = document.querySelector('ion-content');
  if (content) {
    content.scrollToBottom(200);
  }
};

onMounted(() => {
  // 初始化共享键盘状态（Capacitor）
  initKeyboard();
  // Web fallback：使用 visualViewport 同步共享 keyboardHeight
  if (!window.Capacitor) {
    window.visualViewport?.addEventListener('resize', () => {
      const vh = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
      const wh = window.innerHeight;
      keyboardHeight.value = wh - vh;
      nextTick(() => {
        if (inputFocused.value) {
          scrollToBottom();
        }
      });
    });
  }
});

onUnmounted(() => {
  if (window.Capacitor) {
// 使用共享键盘状态，无需移除所有监听
  } else {
    window.visualViewport?.removeEventListener('resize', () => {});
  }
});
</script>

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
  --content-bottom: 0px;
  transition: all 0.2s ease;
}

/* Content Container */
.content-container {
  max-width: 600px;
  margin: 0 auto;
  padding-bottom: var(--content-bottom);
}

/* Input List */
.input-list {
  background: transparent;
  margin-bottom: 20px;
}

.input-list ion-item {
  --background: rgba(131, 131, 131, 0.2);
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
  border-radius: 10px;
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
ion-button[color="dark"] {
  --background: #333;
  --border-radius: 12px;
  height: 44px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

ion-button[color="dark"]:hover {
  --background: #444;
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

/* Back Button (Outline) */
ion-button[color="medium"] {
  --border-radius: 12px;
}

/* Help Modal */
.help-modal {
  --border-radius: 16px;
  /* --background: #fff; */
}

.help-modal ion-toolbar {
  --border-width: 0;
  --background: transparent;
}

.help-content {
  padding: 0 0 20px;
}

.help-content h2 {
  font-size: 1.25rem;
  margin: 20px 0 10px;
  color: #333;
}

.help-content h3 {
  font-size: 1.1rem;
  margin: 15px 0 10px;
  color: #333;
}

.help-content ion-list {
  background: transparent;
  margin-bottom: 15px;
}

.help-content ion-item {
  --background: transparent;
  --padding-start: 0;
  --inner-padding-end: 0;
}

.help-content ion-label {
  color: #666 !important;
  font-size: 1rem;
}
</style>