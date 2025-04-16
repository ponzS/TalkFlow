<template>
    <ion-page>
      <ion-header>
        <ion-toolbar>
          <ion-buttons slot="start">
            <ion-back-button color="dark"></ion-back-button>
          </ion-buttons>
          <ion-title>AI Auto-Reply Configuration</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="fetchModels1">
              <ion-icon :icon="refreshOutline"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content :fullscreen="true">
        <div class="flex flex-col h-full">
          <!-- Global Auto-Reply Toggle -->
          <ion-item class="ion-padding">
            <ion-label>Enable AI Auto-Reply</ion-label>
            <ion-toggle v-model="isAutoReplyEnabled" @ionChange="toggleGlobalAutoReply"></ion-toggle>
          </ion-item>
  
          <!-- Buddy-Specific Auto-Reply -->
          <ion-item class="ion-padding">
            <ion-label>Auto-Reply for Buddies</ion-label>
            <ion-button slot="end" fill="clear" @click="showBuddyModal = true">
              <ion-icon :icon="peopleOutline"></ion-icon>
            </ion-button>
          </ion-item>
  
          <!-- Buddy Selection Modal -->
          <ion-modal :is-open="showBuddyModal" @didDismiss="showBuddyModal = false">
            <ion-header>
              <ion-toolbar>
                <ion-title>Select Buddies for Auto-Reply</ion-title>
                <ion-buttons slot="end">
                  <ion-button @click="showBuddyModal = false">Close</ion-button>
                </ion-buttons>
              </ion-toolbar>
            </ion-header>
            <ion-content class="ion-padding">
              <ion-list>
                <ion-item v-for="buddy in buddyList" :key="buddy.pub">
                  <ion-label>{{ getAliasRealtime(buddy.pub) || buddy.pub.slice(0, 8) }}</ion-label>
                  <ion-toggle
                    :checked="enabledBuddies.includes(buddy.pub)"
                    @ionChange="toggleBuddyAutoReply(buddy.pub, $event.detail.checked)"
                  ></ion-toggle>
                </ion-item>
              </ion-list>
            </ion-content>
          </ion-modal>
  
          <!-- Model Selection and Settings -->
          <ion-item class="ion-padding">
            <ion-label>Selected Model: {{ conversationModel || 'None' }}</ion-label>
            <ion-select
              v-model="conversationModel"
              placeholder="Select a model"
              interface="popover"
              @ionChange="updateSettings"
            >
              <ion-select-option v-for="model in models" :key="model" :value="model">
                {{ model }}
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
                <ion-title>AI Settings</ion-title>
                <ion-buttons slot="end">
                  <ion-button @click="showSettings = false">Close</ion-button>
                </ion-buttons>
              </ion-toolbar>
            </ion-header>
            <ion-content class="ion-padding">
              <ion-item>
                <ion-label>Mode</ion-label>
                <ion-select v-model="conversationMode" placeholder="Select mode" @ionChange="updateSettings">
                  <ion-select-option value="chat">Chat</ion-select-option>
                  <ion-select-option value="generate">Generate</ion-select-option>
                </ion-select>
              </ion-item>
              <ion-item>
                <ion-label>Stream</ion-label>
                <ion-toggle v-model="conversationStream" @ionChange="updateSettings"></ion-toggle>
              </ion-item>
              <ion-item>
                <ion-label>Reply Delay (ms)</ion-label>
                <ion-input
                  type="number"
                  v-model="replyDelay"
                  placeholder="Enter delay in milliseconds"
                  @ionChange="updateSettings"
                ></ion-input>
              </ion-item>
            </ion-content>
          </ion-modal>
  
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
  import { ref, computed, onMounted } from 'vue';
  import {
    IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton,
    IonIcon, IonModal, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
    IonToggle, IonList, IonTextarea, IonAccordionGroup, IonAccordion, IonText,
    IonBackButton, IonSelectPopover,
  } from '@ionic/vue';
  import { settingsOutline, refreshOutline, peopleOutline } from 'ionicons/icons';
  import { useAIAutoReply } from '@/composables/useAIAutoReply';
  import { getTalkFlowCore } from '@/composables/TalkFlowCore';
  import { fetchModels, generateReply } from '@/composables/ollamaService';
  import { showToast } from '@/composables/useToast';
  
  const { storageServ, buddyList, getAliasRealtime } = getTalkFlowCore();
  const aiAutoReply = useAIAutoReply(storageServ);
  
  // API Base URL
  const API_URL = 'http://localhost:3939';
  
  // State
  const isAutoReplyEnabled = ref(aiAutoReply.state.isEnabled);
  const enabledBuddies = ref(aiAutoReply.state.enabledBuddies);
  const conversationModel = ref(aiAutoReply.state.settings.model);
  const conversationMode = ref(aiAutoReply.state.settings.mode);
  const conversationStream = ref(aiAutoReply.state.settings.stream);
  const replyDelay = ref(aiAutoReply.state.settings.replyDelay);
  const showSettings = ref(false);
  const showBuddyModal = ref(false);
  const models = ref<string[]>([]);
  
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
  
  // Fetch Models
  const fetchModels1 = async () => {
    models.value = await fetchModels();
    if (models.value.length && !conversationModel.value) {
      conversationModel.value = models.value[0];
      updateSettings();
    }
  };
  
  // Toggle Global Auto-Reply
  const toggleGlobalAutoReply = async () => {
    await aiAutoReply.toggleAutoReply(isAutoReplyEnabled.value);
  };
  
  // Toggle Buddy Auto-Reply
  const toggleBuddyAutoReply = async (buddyPub: string, enable: boolean) => {
    await aiAutoReply.toggleBuddyAutoReply(buddyPub, enable);
    enabledBuddies.value = aiAutoReply.state.enabledBuddies;
  };
  
  // Update Settings
  const updateSettings = async () => {
    await aiAutoReply.updateSettings({
      model: conversationModel.value,
      mode: conversationMode.value,
      stream: conversationStream.value,
      replyDelay: Number(replyDelay.value),
    });
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
        showToast('Error creating model', 'error');
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
      try {
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
        showToast('Model created successfully', 'success');
      } catch (error) {
        createResponse.value = 'Error creating model';
        showToast('Error creating model', 'error');
      }
    }
  };
  
  // Delete Model
  const deleteModel = async () => {
    try {
      const response = await fetch(`${API_URL}/api/models/${deleteModelName.value}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      deleteResponse.value = data.message || data.error;
      showToast(data.message || 'Model deleted successfully', data.error ? 'error' : 'success');
    } catch (error) {
      deleteResponse.value = 'Error deleting model';
      showToast('Error deleting model', 'error');
    }
  };
  
  // Copy Model
  const copyModel = async () => {
    try {
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
      showToast(data.message || 'Model copied successfully', data.error ? 'error' : 'success');
    } catch (error) {
      copyResponse.value = 'Error copying model';
      showToast('Error copying model', 'error');
    }
  };
  
  // Show Model Info
  const showModel = async () => {
    try {
      const response = await fetch(`${API_URL}/api/models/${showModelName.value}`);
      const data = await response.json();
      showResponse.value = data;
      showToast('Model info retrieved successfully', 'success');
    } catch (error) {
      showResponse.value = { error: 'Error fetching model info' };
      showToast('Error fetching model info', 'error');
    }
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
        showToast('Error pulling model', 'error');
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
      try {
        const response = await fetch(`${API_URL}/api/models/pull`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: pullModelName.value,
          }),
        });
        const data = await response.json();
        pullResponse.value = JSON.stringify(data);
        showToast('Model pulled successfully', 'success');
      } catch (error) {
        pullResponse.value = 'Error pulling model';
        showToast('Error pulling model', 'error');
      }
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
        showToast('Error pushing model', 'error');
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
      try {
        const response = await fetch(`${API_URL}/api/models/push`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: pushModelName.value,
          }),
        });
        const data = await response.json();
        pushResponse.value = JSON.stringify(data);
        showToast('Model pushed successfully', 'success');
      } catch (error) {
        pushResponse.value = 'Error pushing model';
        showToast('Error pushing model', 'error');
      }
    }
  };
  
  // Generate Embeddings
  const generateEmbeddings = async () => {
    try {
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
      showToast('Embeddings generated successfully', 'success');
    } catch (error) {
      embedResponse.value = { error: 'Error generating embeddings' };
      showToast('Error generating embeddings', 'error');
    }
  };
  
  // Initialize
  onMounted(() => {
    fetchModels();
  });
  </script>
  
  <style scoped>
  ion-list {
    background: transparent;
  }
  ion-text.block {
    display: block;
    white-space: pre-wrap;
  }
  </style>