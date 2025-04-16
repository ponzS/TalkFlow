<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Node.js HTTP Test App</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-card>
        <ion-card-header>
          <ion-card-title>Node.js HTTP Test</ion-card-title>
          <ion-card-subtitle>Test communication with Bare backend using HTTP</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          <ion-button expand="block" color="success" @click="runSimpleScript">Run Simple Script</ion-button>
          <ion-button expand="block" color="warning" @click="performCalculation">Perform Calculation</ion-button>
          <ion-text class="output" v-if="output">
            <h3>Output:</h3>
            <p>{{ output }}</p>
          </ion-text>
          <ion-text class="error" v-if="error">
            <h3>Error:</h3>
            <p>{{ error }}</p>
          </ion-text>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonText,
} from '@ionic/vue';

const output = ref<string>('');
const error = ref<string>('');

const sendCommand = async (command: string) => {
  try {
    const response = await fetch('http://localhost:6000/command', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ command }),
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    return data.result;
  } catch (err: any) {
    throw new Error('Failed to send command: ' + err.message);
  }
};

const runSimpleScript = async () => {
  try {
    output.value = '';
    error.value = '';
    const response = await sendCommand('run-simple-script');
    output.value = response;
  } catch (err: any) {
    console.error('Error running simple script:', err);
    error.value = err.message || 'Failed to run simple script';
  }
};

const performCalculation = async () => {
  try {
    output.value = '';
    error.value = '';
    const response = await sendCommand('perform-calculation');
    output.value = response;
  } catch (err: any) {
    console.error('Error performing calculation:', err);
    error.value = err.message || 'Failed to perform calculation';
  }
};
</script>

<style scoped>
.ion-padding {
  padding: 16px;
}
.output, .error {
  margin-top: 16px;
  display: block;
  word-wrap: break-word;
}
.output h3, .error h3 {
  color: #333;
  font-size: 1.2em;
}
.output p {
  color: #4CAF50;
  font-size: 1em;
}
.error p {
  color: #F44336;
  font-size: 1em;
}
ion-button {
  margin-bottom: 10px;
}
</style>