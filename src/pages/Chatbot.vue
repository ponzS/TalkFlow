<template>
    <ion-page>
      <ion-header>
        <ion-toolbar>
          <ion-buttons slot="start">
          <ion-back-button color="dark"></ion-back-button>
        </ion-buttons>
          <ion-title>Ollama API Interface</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="fetchModels">
              <ion-icon :icon="refreshOutline"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content :fullscreen="true">
        <div class="flex flex-col h-full">
          <!-- Model Selection and Settings -->
          <ion-item class="ion-padding">
            <ion-label>Selected Model: {{ conversationModel || 'None' }}</ion-label>
            <ion-select
              v-model="conversationModel"
              placeholder="Select a model"
              interface="popover"
              @ionChange="fetchModels"
            >
              <ion-select-option v-for="model in models" :key="model.name" :value="model.name">
                {{ model.name }}
              </ion-select-option>
            </ion-select>
            <ion-button slot="end" fill="clear" @click="showSettings = true">
              <ion-icon :icon="settingsOutline"></ion-icon>
            </ion-button>
          </ion-item>
  
          <!-- Settings Modal -->
          <ion-modal :is-open="showSettings" @didDismiss="showSettings = false">
            <ion-header>
              <ion-toolbar>
                <ion-title>Chat Settings</ion-title>
                <ion-buttons slot="end">
                  <ion-button @click="showSettings = false">Close</ion-button>
                </ion-buttons>
              </ion-toolbar>
            </ion-header>
            <ion-content class="ion-padding">
              <ion-item>
                <ion-label>Mode</ion-label>
                <ion-select v-model="conversationMode" placeholder="Select mode">
                  <ion-select-option value="chat">Chat</ion-select-option>
                  <ion-select-option value="generate">Generate</ion-select-option>
                </ion-select>
              </ion-item>
              <ion-item>
                <ion-label>Stream</ion-label>
                <ion-toggle v-model="conversationStream"></ion-toggle>
              </ion-item>
            </ion-content>
          </ion-modal>
  
          <!-- Chat Interface -->
          <ion-list class="flex-grow overflow-y-auto p-4" ref="chatList">
            <ion-item
              v-for="(msg, index) in conversationMessages"
              :key="index"
              :class="{
                'ion-margin-bottom': true,
                'flex justify-end': msg.role === 'user',
                'flex justify-start': msg.role !== 'user'
              }"
              lines="none"
            >
              <div
                :class="{
                  'max-w-[70%] p-3 rounded-lg': true,
                  'bg-blue-500 text-white': msg.role === 'user',
                  'bg-gray-200 text-black': msg.role !== 'user'
                }"
              >
                <ion-label class="whitespace-pre-wrap">
                  <strong>{{ msg.role }}:</strong> {{ msg.content }}
                </ion-label>
              </div>
            </ion-item>
          </ion-list>
          <div class="p-4 bg-gray-100">
            <ion-item class="rounded-lg">
              <ion-textarea
                v-model="conversationInput"
                placeholder="Type your message..."
                auto-grow
                @keyup.enter="sendMessage"
              ></ion-textarea>
              <ion-button slot="end" fill="clear" @click="sendMessage">
                <ion-icon :icon="sendOutline"></ion-icon>
              </ion-button>
            </ion-item>
          </div>
  
          <!-- Other API Tests -->
          <ion-accordion-group class="ion-padding">
            <!-- Create Model -->
            <ion-accordion value="create">
              <ion-item slot="header">
                <ion-label>Create Model</ion-label>
              </ion-item>
              <div slot="content">
                <ion-item>
                  <ion-label>Name</ion-label>
                  <ion-input v-model="createModelName" placeholder="Enter model name"></ion-input>
                </ion-item>
                <ion-item>
                  <ion-label>Modelfile</ion-label>
                  <ion-textarea v-model="createModelfile" placeholder="Enter modelfile content"></ion-textarea>
                </ion-item>
                <ion-item>
                  <ion-label>Stream</ion-label>
                  <ion-toggle v-model="createStream"></ion-toggle>
                </ion-item>
                <ion-button @click="createModel">Create Model</ion-button>
                <ion-text v-if="createResponse" class="block mt-2">{{ createResponse }}</ion-text>
              </div>
            </ion-accordion>
  
            <!-- Delete Model -->
            <ion-accordion value="delete">
              <ion-item slot="header">
                <ion-label>Delete Model</ion-label>
              </ion-item>
              <div slot="content">
                <ion-item>
                  <ion-label>Model Name</ion-label>
                  <ion-input v-model="deleteModelName" placeholder="Enter model name"></ion-input>
                </ion-item>
                <ion-button @click="deleteModel">Delete Model</ion-button>
                <ion-text v-if="deleteResponse" class="block mt-2">{{ deleteResponse }}</ion-text>
              </div>
            </ion-accordion>
  
            <!-- Copy Model -->
            <ion-accordion value="copy">
              <ion-item slot="header">
                <ion-label>Copy Model</ion-label>
              </ion-item>
              <div slot="content">
                <ion-item>
                  <ion-label>Source</ion-label>
                  <ion-input v-model="copySource" placeholder="Enter source model"></ion-input>
                </ion-item>
                <ion-item>
                  <ion-label>Destination</ion-label>
                  <ion-input v-model="copyDestination" placeholder="Enter destination model"></ion-input>
                </ion-item>
                <ion-button @click="copyModel">Copy Model</ion-button>
                <ion-text v-if="copyResponse" class="block mt-2">{{ copyResponse }}</ion-text>
              </div>
            </ion-accordion>
  
            <!-- Show Model Info -->
            <ion-accordion value="show">
              <ion-item slot="header">
                <ion-label>Show Model Info</ion-label>
              </ion-item>
              <div slot="content">
                <ion-item>
                  <ion-label>Model Name</ion-label>
                  <ion-input v-model="showModelName" placeholder="Enter model name"></ion-input>
                </ion-item>
                <ion-button @click="showModel">Show Info</ion-button>
                <ion-text v-if="showResponse" class="block mt-2">{{ JSON.stringify(showResponse) }}</ion-text>
              </div>
            </ion-accordion>
  
            <!-- Pull Model -->
            <ion-accordion value="pull">
              <ion-item slot="header">
                <ion-label>Pull Model</ion-label>
              </ion-item>
              <div slot="content">
                <ion-item>
                  <ion-label>Model Name</ion-label>
                  <ion-input v-model="pullModelName" placeholder="Enter model name"></ion-input>
                </ion-item>
                <ion-item>
                  <ion-label>Stream</ion-label>
                  <ion-toggle v-model="pullStream"></ion-toggle>
                </ion-item>
                <ion-button @click="pullModel">Pull Model</ion-button>
                <ion-text v-if="pullResponse" class="block mt-2">{{ pullResponse }}</ion-text>
              </div>
            </ion-accordion>
  
            <!-- Push Model -->
            <ion-accordion value="push">
              <ion-item slot="header">
                <ion-label>Push Model</ion-label>
              </ion-item>
              <div slot="content">
                <ion-item>
                  <ion-label>Model Name</ion-label>
                  <ion-input v-model="pushModelName" placeholder="Enter model name"></ion-input>
                </ion-item>
                <ion-item>
                  <ion-label>Stream</ion-label>
                  <ion-toggle v-model="pushStream"></ion-toggle>
                </ion-item>
                <ion-button @click="pushModel">Push Model</ion-button>
                <ion-text v-if="pushResponse" class="block mt-2">{{ pushResponse }}</ion-text>
              </div>
            </ion-accordion>
  
            <!-- Generate Embeddings -->
            <ion-accordion value="embeddings">
              <ion-item slot="header">
                <ion-label>Generate Embeddings</ion-label>
              </ion-item>
              <div slot="content">
                <ion-item>
                  <ion-label>Model</ion-label>
                  <ion-input v-model="embedModel" placeholder="Enter model name"></ion-input>
                </ion-item>
                <ion-item>
                  <ion-label>Prompt</ion-label>
                  <ion-textarea v-model="embedPrompt" placeholder="Enter prompt"></ion-textarea>
                </ion-item>
                <ion-button @click="generateEmbeddings">Generate Embeddings</ion-button>
                <ion-text v-if="embedResponse" class="block mt-2">{{ JSON.stringify(embedResponse) }}</ion-text>
              </div>
            </ion-accordion>
          </ion-accordion-group>
        </div>
      </ion-content>
    </ion-page>
  </template>
  
  <script setup lang="ts">
  import { ref, onMounted, nextTick } from 'vue';
  import {
    IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton,
    IonIcon, IonModal, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
    IonToggle, IonList, IonTextarea, IonAccordionGroup, IonAccordion, IonText,IonBackButton,
 
  } from '@ionic/vue';
  import { settingsOutline, sendOutline, refreshOutline } from 'ionicons/icons';
  
  // API Base URL
  const API_URL = 'http://localhost:3939';
  
  // Chat State
  const conversationModel = ref('');
  const conversationMode = ref<'chat' | 'generate'>('chat');
  const conversationStream = ref(false);
  const conversationInput = ref('');
  const conversationMessages = ref<{ role: string; content: string }[]>([]);
  const showSettings = ref(false);
  const chatList = ref<HTMLElement | null>(null);
  
  // State for Model List
  const models = ref<any[]>([]);
  
  // State for Create Model
  const createModelName = ref('');
  const createModelfile = ref('');
  const createStream = ref(false);
  const createResponse = ref('');
  
  // State for Delete Model
  const deleteModelName = ref('');
  const deleteResponse = ref('');
  
  // State for Copy Model
  const copySource = ref('');
  const copyDestination = ref('');
  const copyResponse = ref('');
  
  // State for Show Model Info
  const showModelName = ref('');
  const showResponse = ref<any>(null);
  
  // State for Pull Model
  const pullModelName = ref('');
  const pullStream = ref(false);
  const pullResponse = ref('');
  
  // State for Push Model
  const pushModelName = ref('');
  const pushStream = ref(false);
  const pushResponse = ref('');
  
  // State for Embeddings
  const embedModel = ref('');
  const embedPrompt = ref('');
  const embedResponse = ref<any>(null);
  
  // Scroll to bottom of chat
  const scrollToBottom = async () => {
    await nextTick();
    if (chatList.value) {
      chatList.value.scrollTop = chatList.value.scrollHeight;
    }
  };
  
  // Fetch Models
  const fetchModels = async () => {
    try {
      const response = await fetch(`${API_URL}/api/models`);
      const data = await response.json();
      models.value = data;
    } catch (error) {
      console.error('Error fetching models:', error);
    }
  };
  
  // Send Message
  const sendMessage = async () => {
    if (!conversationInput.value.trim() || !conversationModel.value) return;
  
    conversationMessages.value.push({
      role: 'user',
      content: conversationInput.value,
    });
  
    const endpoint = conversationMode.value === 'chat' ? '/api/chat' : '/api/generate';
    const body = conversationMode.value === 'chat'
      ? {
          model: conversationModel.value,
          messages: [{ role: 'user', content: conversationInput.value }],
          stream: conversationStream.value,
        }
      : {
          model: conversationModel.value,
          prompt: conversationInput.value,
          stream: conversationStream.value,
        };
  
    conversationInput.value = '';
    scrollToBottom();
  
    if (conversationStream.value) {
      const eventSource = new EventSource(`${API_URL}${endpoint}`);
      let responseContent = '';
  
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        responseContent += conversationMode.value === 'chat' ? (data.message?.content || '') : (data.response || '');
        updateLastMessage(responseContent);
        scrollToBottom();
      };
  
      eventSource.onerror = () => {
        eventSource.close();
      };
  
      await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } else {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      const content = conversationMode.value === 'chat' ? (data.message?.content || data.error) : (data.response || data.error);
      conversationMessages.value.push({
        role: conversationMode.value === 'chat' ? 'assistant' : 'system',
        content,
      });
      scrollToBottom();
    }
  };
  
  // Update last message in streaming mode
  const updateLastMessage = (content: string) => {
    if (conversationMessages.value.length === 0) {
      conversationMessages.value.push({
        role: conversationMode.value === 'chat' ? 'assistant' : 'system',
        content,
      });
    } else {
      conversationMessages.value[conversationMessages.value.length - 1] = {
        role: conversationMode.value === 'chat' ? 'assistant' : 'system',
        content,
      };
    }
  };
  
  // Create Model
  const createModel = async () => {
    createResponse.value = '';
    if (createStream.value) {
      const eventSource = new EventSource(`${API_URL}/api/models/create`);
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        createResponse.value += JSON.stringify(data) + '\n';
      };
      eventSource.onerror = () => {
        eventSource.close();
      };
      await fetch(`${API_URL}/api/models/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createModelName.value,
          modelfile: createModelfile.value,
          stream: true,
        }),
      });
    } else {
      const response = await fetch(`${API_URL}/api/models/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createModelName.value,
          modelfile: createModelfile.value,
        }),
      });
      const data = await response.json();
      createResponse.value = JSON.stringify(data);
    }
  };
  
  // Delete Model
  const deleteModel = async () => {
    const response = await fetch(`${API_URL}/api/models/${deleteModelName.value}`, {
      method: 'DELETE',
    });
    const data = await response.json();
    deleteResponse.value = data.message || data.error;
  };
  
  // Copy Model
  const copyModel = async () => {
    const response = await fetch(`${API_URL}/api/models/copy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: copySource.value,
        destination: copyDestination.value,
      }),
    });
    const data = await response.json();
    copyResponse.value = data.message || data.error;
  };
  
  // Show Model Info
  const showModel = async () => {
    const response = await fetch(`${API_URL}/api/models/${showModelName.value}`);
    const data = await response.json();
    showResponse.value = data;
  };
  
  // Pull Model
  const pullModel = async () => {
    pullResponse.value = '';
    if (pullStream.value) {
      const eventSource = new EventSource(`${API_URL}/api/models/pull`);
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        pullResponse.value += JSON.stringify(data) + '\n';
      };
      eventSource.onerror = () => {
        eventSource.close();
      };
      await fetch(`${API_URL}/api/models/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: pullModelName.value,
          stream: true,
        }),
      });
    } else {
      const response = await fetch(`${API_URL}/api/models/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: pullModelName.value,
        }),
      });
      const data = await response.json();
      pullResponse.value = JSON.stringify(data);
    }
  };
  
  // Push Model
  const pushModel = async () => {
    pushResponse.value = '';
    if (pushStream.value) {
      const eventSource = new EventSource(`${API_URL}/api/models/push`);
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        pushResponse.value += JSON.stringify(data) + '\n';
      };
      eventSource.onerror = () => {
        eventSource.close();
      };
      await fetch(`${API_URL}/api/models/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: pushModelName.value,
          stream: true,
        }),
      });
    } else {
      const response = await fetch(`${API_URL}/api/models/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: pushModelName.value,
        }),
      });
      const data = await response.json();
      pushResponse.value = JSON.stringify(data);
    }
  };
  
  // Generate Embeddings
  const generateEmbeddings = async () => {
    const response = await fetch(`${API_URL}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: embedModel.value,
        prompt: embedPrompt.value,
      }),
    });
    const data = await response.json();
    embedResponse.value = data;
  };
  
  // Initialize
  onMounted(() => {
    fetchModels();
    scrollToBottom();
  });
  </script>
  
  <style scoped>
  ion-list {
    background: transparent;
  }
  .bg-blue-500 {
    background-color: #3b82f6;
  }

  .whitespace-pre-wrap {
    white-space: pre-wrap;
  }
  ion-text.block {
    display: block;
    white-space: pre-wrap;
  }
  </style>