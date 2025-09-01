<template>
  <ion-page>
    <!-- <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button color="dark"></ion-back-button>
        </ion-buttons>
        <ion-title>Soul for D-AI</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="fetchModels1">
            <ion-icon :icon="refreshOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header> -->
    
    <ion-content :fullscreen="true" class="ion-padding">
      <!-- API Configuration Section -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>
            <ion-icon :icon="settingsOutline" style="margin: 0 10px;"></ion-icon>
            API Configuration 
          </ion-card-title>
       
        </ion-card-header>
        <ion-card-content>
 
          <!-- Current API URL Display -->
          <ion-item lines="none" class="ion-margin-bottom">
            <ion-label>
              <h3>Current API URL</h3>
              <p class="ion-text-wrap">{{ currentApiUrl }}</p>
            </ion-label>
          </ion-item>

          <!-- Set New API URL -->
          <ion-item lines="none" class="ion-margin-bottom">
            <ion-label position="stacked">Set New API URL</ion-label>
            <ion-input
              v-model="newApiUrl"
              placeholder="Enter new API URL (e.g., http://localhost:3939)"
              class="ion-margin-top"
            ></ion-input>
          </ion-item>
          <ion-button 
            expand="block" 
            @click="updateApiUrl" 
            :disabled="!newApiUrl"
            class="ion-margin-top"
          >
            Save API URL
          </ion-button>
        </ion-card-content>
      </ion-card>

      <!-- Auto-Reply Configuration Section -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>
            <ion-icon :icon="chatbubbleOutline" style="margin: 0 10px;"></ion-icon>
            Auto-Reply Settings
          </ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <!-- Global Auto-Reply Toggle -->
          <ion-item lines="none" class="ion-margin-bottom">
            <ion-label>
              <h3>Enable AI Auto-Reply</h3>
              <p>Enable automatic AI responses for incoming messages</p>
            </ion-label>
            <ion-toggle v-model="isAutoReplyEnabled" @ionChange="toggleGlobalAutoReply"></ion-toggle>
          </ion-item>

          <!-- Buddy-Specific Auto-Reply -->
          <ion-item lines="none" button @click="showBuddyModal = true">
            <ion-label>
              <h3>Auto-Reply for Buddies</h3>
              <p>{{ enabledBuddies.length }} buddy(s) enabled</p>
            </ion-label>
            <ion-icon :icon="chevronForward" slot="end"></ion-icon>
          </ion-item>
        </ion-card-content>
      </ion-card>

      <!-- Model Configuration Section -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>
            <ion-icon :icon="hardwareChipOutline" style="margin: 0 10px;"></ion-icon>
            Model Configuration
          </ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <!-- Model Selection -->
          <ion-item lines="none" class="ion-margin-bottom">
            <ion-label>
              <h3>Selected Model</h3>
              <p>{{ conversationModel || 'No model selected' }}</p>
            </ion-label>
            <ion-select
              v-model="conversationModel"
              placeholder="Select a model"
              interface="popover"
              @ionChange="updateSettings"
              class="ion-margin-top"
            >
              <ion-select-option v-for="model in models" :key="model" :value="model">
                {{ model }}
              </ion-select-option>
            </ion-select>
          </ion-item>

          <!-- Advanced Settings Button -->
          <ion-button 
            expand="block" 
            fill="outline" 
            @click="showSettings = true"
            class="ion-margin-top"
          >
            <ion-icon :icon="settingsOutline" slot="start"></ion-icon>
            Advanced Settings
          </ion-button>

          <!-- Debug Info Button -->
          <ion-button 
            expand="block" 
            fill="clear" 
            @click="showDebugInfo = true"
            class="ion-margin-top"
            size="small"
          >
            <ion-icon :icon="informationCircleOutline" slot="start"></ion-icon>
            View Config File Info
          </ion-button>
        </ion-card-content>
      </ion-card>

      <!-- Model Management Section -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>
            <ion-icon :icon="constructOutline" style="margin: 0 10px;"></ion-icon>
            Model Management
          </ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-accordion-group>
            <!-- Create Model -->
            <ion-accordion value="create">
              <ion-item slot="header" color="light">
                <ion-icon :icon="addCircleOutline" slot="start"></ion-icon>
                <ion-label>Create Model</ion-label>
              </ion-item>
              <div slot="content" class="ion-padding">
                <ion-item lines="none" class="ion-margin-bottom">
                  <ion-label position="stacked">Model Name</ion-label>
                  <ion-input v-model="createModelName" placeholder="Enter model name"></ion-input>
                </ion-item>
                <ion-item lines="none" class="ion-margin-bottom">
                  <ion-label position="stacked">Modelfile</ion-label>
                  <ion-textarea 
                    v-model="createModelfile" 
                    placeholder="Enter modelfile content"
                    :rows="4"
                  ></ion-textarea>
                </ion-item>
                <ion-item lines="none" class="ion-margin-bottom">
                  <ion-label>Stream Response</ion-label>
                  <ion-toggle v-model="createStream"></ion-toggle>
                </ion-item>
                <ion-button expand="block" @click="createModel" :disabled="!createModelName">
                  Create Model
                </ion-button>
                <ion-text v-if="createResponse" class="response-text">{{ createResponse }}</ion-text>
              </div>
            </ion-accordion>

            <!-- Delete Model -->
            <ion-accordion value="delete">
              <ion-item slot="header" color="light">
                <ion-icon :icon="trashOutline" slot="start"></ion-icon>
                <ion-label>Delete Model</ion-label>
              </ion-item>
              <div slot="content" class="ion-padding">
                <ion-item lines="none" class="ion-margin-bottom">
                  <ion-label position="stacked">Model Name</ion-label>
                  <ion-input v-model="deleteModelName" placeholder="Enter model name"></ion-input>
                </ion-item>
                <ion-button expand="block" @click="deleteModel" :disabled="!deleteModelName" color="danger">
                  Delete Model
                </ion-button>
                <ion-text v-if="deleteResponse" class="response-text">{{ deleteResponse }}</ion-text>
              </div>
            </ion-accordion>

            <!-- Copy Model -->
            <ion-accordion value="copy">
              <ion-item slot="header" color="light">
                <ion-icon :icon="copyOutline" slot="start"></ion-icon>
                <ion-label>Copy Model</ion-label>
              </ion-item>
              <div slot="content" class="ion-padding">
                <ion-item lines="none" class="ion-margin-bottom">
                  <ion-label position="stacked">Source Model</ion-label>
                  <ion-input v-model="copySource" placeholder="Enter source model"></ion-input>
                </ion-item>
                <ion-item lines="none" class="ion-margin-bottom">
                  <ion-label position="stacked">Destination Model</ion-label>
                  <ion-input v-model="copyDestination" placeholder="Enter destination model"></ion-input>
                </ion-item>
                <ion-button expand="block" @click="copyModel" :disabled="!copySource || !copyDestination">
                  Copy Model
                </ion-button>
                <ion-text v-if="copyResponse" class="response-text">{{ copyResponse }}</ion-text>
              </div>
            </ion-accordion>

            <!-- Show Model Info -->
            <ion-accordion value="show">
              <ion-item slot="header" color="light">
                <ion-icon :icon="informationCircleOutline" slot="start"></ion-icon>
                <ion-label>Show Model Info</ion-label>
              </ion-item>
              <div slot="content" class="ion-padding">
                <ion-item lines="none" class="ion-margin-bottom">
                  <ion-label position="stacked">Model Name</ion-label>
                  <ion-input v-model="showModelName" placeholder="Enter model name"></ion-input>
                </ion-item>
                <ion-button expand="block" @click="showModel" :disabled="!showModelName">
                  Show Info
                </ion-button>
                <ion-text v-if="showResponse" class="response-text">{{ JSON.stringify(showResponse, null, 2) }}</ion-text>
              </div>
            </ion-accordion>

            <!-- Pull Model -->
            <ion-accordion value="pull">
              <ion-item slot="header" color="light">
                <ion-icon :icon="downloadOutline" slot="start"></ion-icon>
                <ion-label>Pull Model</ion-label>
              </ion-item>
              <div slot="content" class="ion-padding">
                <ion-item lines="none" class="ion-margin-bottom">
                  <ion-label position="stacked">Model Name</ion-label>
                  <ion-input 
                    v-model="pullModelName" 
                    placeholder="e.g., llama3.1:8b, llava:latest"
                    :disabled="isPulling"
                  ></ion-input>
                </ion-item>

                <!-- Progress Display -->
                <div v-if="isPulling || pullProgress.status" class="progress-container">
                  <div class="progress-header">
                    <h4>{{ pullProgress.status }}</h4>
                    <ion-button 
                      v-if="isPulling" 
                      fill="clear" 
                      size="small" 
                      color="danger"
                      @click="cancelPullModel"
                    >
                      <ion-icon :icon="closeOutline" slot="icon-only"></ion-icon>
                    </ion-button>
                  </div>

                  <!-- Progress Bar -->
                  <div v-if="pullProgress.percent !== undefined" class="progress-bar-container">
                    <div class="progress-bar">
                      <div 
                        class="progress-fill" 
                        :style="{ width: pullProgress.percent + '%' }"
                      ></div>
                    </div>
                    <span class="progress-percent">{{ pullProgress.percent }}%</span>
                  </div>

                  <!-- Download Details -->
                  <div v-if="pullProgress.total || pullProgress.digest" class="download-details">
                    <div v-if="pullProgress.total" class="detail-row">
                      <span class="detail-label">Model Size:</span>
                      <span class="detail-value">{{ formatBytes(pullProgress.total) }}</span>
                    </div>
                    <div v-if="pullProgress.completed && pullProgress.total" class="detail-row">
                      <span class="detail-label">Progress:</span>
                      <span class="detail-value">
                        {{ formatBytes(pullProgress.completed) }} / {{ formatBytes(pullProgress.total) }}
                      </span>
                    </div>
                    <div v-if="pullProgress.speed" class="detail-row">
                      <span class="detail-label">Est. Speed:</span>
                      <span class="detail-value">{{ pullProgress.speed }}</span>
                    </div>
                    <div v-if="pullProgress.eta" class="detail-row">
                      <span class="detail-label">Est. Time:</span>
                      <span class="detail-value">{{ pullProgress.eta }}</span>
                    </div>
                    <div v-if="pullProgress.digest" class="detail-row">
                      <span class="detail-label">Layer:</span>
                      <span class="detail-value digest">{{ pullProgress.digest }}...</span>
                    </div>
                  </div>

                  <!-- Spinning indicator for non-download status -->
                  <div v-else-if="isPulling" class="spinner-container">
                    <ion-spinner name="crescent"></ion-spinner>
                  </div>
                </div>

                <!-- Action Buttons -->
                <div class="button-group">
                  <ion-button 
                    expand="block" 
                    @click="pullModel" 
                    :disabled="!pullModelName || isPulling"
                    :color="isPulling ? 'medium' : 'primary'"
                  >
                    <ion-icon 
                      :icon="isPulling ? hourglassOutline : downloadOutline" 
                      slot="start"
                    ></ion-icon>
                    {{ isPulling ? 'Pulling...' : 'Pull Model' }}
                  </ion-button>
                  
                  <ion-button 
                    expand="block" 
                    fill="outline"
                    @click="testConnection" 
                    :disabled="isPulling"
                    color="secondary"
                  >
                    <ion-icon :icon="analyticsOutline" slot="start"></ion-icon>
                    Test Connection
                  </ion-button>
                </div>

                <!-- Model Suggestions -->
                <div v-if="!isPulling" class="model-suggestions">
                  <h5>Popular Models:</h5>
                  <div class="suggestion-chips">
                    <ion-chip 
                      v-for="model in popularModels" 
                      :key="model"
                      @click="pullModelName = model"
                      :outline="pullModelName !== model"
                    >
                      {{ model }}
                    </ion-chip>
                  </div>
                </div>

                <!-- Response Log -->
                <div v-if="pullResponse" class="response-container">
                  <h5>详细日志:</h5>
                  <ion-text class="response-text">{{ pullResponse }}</ion-text>
                </div>
              </div>
            </ion-accordion>

            <!-- Push Model -->
            <ion-accordion value="push">
              <ion-item slot="header" color="light">
                <ion-icon :icon="cloudUploadOutline" slot="start"></ion-icon>
                <ion-label>Push Model</ion-label>
              </ion-item>
              <div slot="content" class="ion-padding">
                <ion-item lines="none" class="ion-margin-bottom">
                  <ion-label position="stacked">Model Name</ion-label>
                  <ion-input v-model="pushModelName" placeholder="Enter model name"></ion-input>
                </ion-item>
                <ion-item lines="none" class="ion-margin-bottom">
                  <ion-label>Stream Response</ion-label>
                  <ion-toggle v-model="pushStream"></ion-toggle>
                </ion-item>
                <ion-button expand="block" @click="pushModel" :disabled="!pushModelName">
                  Push Model
                </ion-button>
                <ion-text v-if="pushResponse" class="response-text">{{ pushResponse }}</ion-text>
              </div>
            </ion-accordion>

            <!-- Generate Embeddings -->
            <ion-accordion value="embeddings">
              <ion-item slot="header" color="light">
                <ion-icon :icon="analyticsOutline" slot="start"></ion-icon>
                <ion-label>Generate Embeddings</ion-label>
              </ion-item>
              <div slot="content" class="ion-padding">
                <ion-item lines="none" class="ion-margin-bottom">
                  <ion-label position="stacked">Model</ion-label>
                  <ion-input v-model="embedModel" placeholder="Enter model name"></ion-input>
                </ion-item>
                <ion-item lines="none" class="ion-margin-bottom">
                  <ion-label position="stacked">Prompt</ion-label>
                  <ion-textarea 
                    v-model="embedPrompt" 
                    placeholder="Enter prompt"
                    :rows="3"
                  ></ion-textarea>
                </ion-item>
                <ion-button expand="block" @click="generateEmbeddings" :disabled="!embedModel || !embedPrompt">
                  Generate Embeddings
                </ion-button>
                <ion-text v-if="embedResponse" class="response-text">{{ JSON.stringify(embedResponse, null, 2) }}</ion-text>
              </div>
            </ion-accordion>
          </ion-accordion-group>
        </ion-card-content>
      </ion-card>

      <!-- Buddy Selection Modal -->
      <ion-modal :is-open="showBuddyModal" @didDismiss="showBuddyModal = false">
        <ion-header>
          <ion-toolbar>
            <ion-title>Select Buddies for Auto-Reply</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="showBuddyModal = false">Done</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <ion-list>
            <ion-item v-for="buddy in buddyList" :key="buddy.pub" lines="full">
              <!-- <ion-avatar slot="start">
          
          <img
         
            :src="buddy.pub"
        
         
            
          /> 
              </ion-avatar> -->
              <ion-label>
                <h3>{{ getAliasRealtime(buddy.pub) || buddy.pub.slice(0, 8) }}</h3>
                <p>{{ buddy.pub.slice(0, 16) }}...</p>
              </ion-label>
              <ion-toggle
                :checked="enabledBuddies.includes(buddy.pub)"
                @ionChange="toggleBuddyAutoReply(buddy.pub, $event.detail.checked)"
              ></ion-toggle>
            </ion-item>
          </ion-list>
        </ion-content>
      </ion-modal>

      <!-- Settings Modal -->
      <ion-modal :is-open="showSettings" @didDismiss="showSettings = false">
        <ion-header>
          <ion-toolbar>
            <ion-title>Advanced AI Settings</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="showSettings = false">Done</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <ion-list>
            <ion-item lines="none" class="ion-margin-bottom">
              <ion-label>
                <h3>Mode</h3>
                <p>Select the conversation mode</p>
              </ion-label>
              <ion-select 
                v-model="conversationMode" 
                placeholder="Select mode" 
                @ionChange="updateSettings"
                interface="popover"
              >
                <ion-select-option value="chat">Chat</ion-select-option>
                <ion-select-option value="generate">Generate</ion-select-option>
              </ion-select>
            </ion-item>
            
            <ion-item lines="none" class="ion-margin-bottom">
              <ion-label>
                <h3>Stream Response</h3>
                <p>Enable streaming for real-time responses</p>
              </ion-label>
              <ion-toggle v-model="conversationStream" @ionChange="updateSettings"></ion-toggle>
            </ion-item>
            
            <ion-item lines="none" class="ion-margin-bottom">
              <ion-label position="stacked">
                <h3>Reply Delay (ms)</h3>
                <p>Delay before sending auto-reply</p>
              </ion-label>
              <ion-input
                type="number"
                v-model="replyDelay"
                placeholder="Enter delay in milliseconds"
                @ionChange="updateSettings"
                class="ion-margin-top"
              ></ion-input>
            </ion-item>
          </ion-list>
        </ion-content>
      </ion-modal>

      <!-- Debug Info Modal -->
      <ion-modal :is-open="showDebugInfo" @didDismiss="showDebugInfo = false">
        <ion-header>
          <ion-toolbar>
            <ion-title>AI Auto-Reply Config Debug Info</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="showDebugInfo = false">Close</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <ion-card>
            <ion-card-header>
              <ion-card-title>Configuration File</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-item lines="none" class="ion-margin-bottom">
                <ion-label>
                  <h3>File Path</h3>
                  <p class="ion-text-wrap">{{ aiAutoReply.getConfigFilePath() }}</p>
                </ion-label>
              </ion-item>
              <ion-item lines="none" class="ion-margin-bottom">
                <ion-label>
                  <h3>Current State</h3>
                  <p class="debug-json">{{ JSON.stringify(aiAutoReply.state, null, 2) }}</p>
                </ion-label>
              </ion-item>
            </ion-card-content>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>Quick Actions</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-button 
                expand="block" 
                fill="outline"
                @click="refreshDebugInfo"
                class="ion-margin-bottom"
              >
                <ion-icon :icon="refreshOutline" slot="start"></ion-icon>
                Refresh State
              </ion-button>
              <ion-button 
                expand="block" 
                fill="outline"
                color="warning"
                @click="resetAutoReplySettings"
                class="ion-margin-bottom"
              >
                <ion-icon :icon="trashOutline" slot="start"></ion-icon>
                Reset to Defaults
              </ion-button>
            </ion-card-content>
          </ion-card>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton,
  IonIcon, IonModal, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
  IonToggle, IonList, IonTextarea, IonAccordionGroup, IonAccordion, IonText,
  IonBackButton, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonAvatar,
  IonSpinner, IonChip,
} from '@ionic/vue';
import { 
  settingsOutline, refreshOutline, peopleOutline, chatbubbleOutline, 
  hardwareChipOutline, constructOutline, addCircleOutline, trashOutline, 
  copyOutline, informationCircleOutline, downloadOutline, cloudUploadOutline, 
  analyticsOutline, personOutline, chevronForward, closeOutline, hourglassOutline
} from 'ionicons/icons';
import { useAIAutoReply } from '@/composables/useAIAutoReply';
import { getTalkFlowCore } from '@/composables/TalkFlowCore';
import { fetchModels, generateReply, getApiUrl, setApiUrl } from '@/composables/ollamaService';
import { showToast } from '@/composables/useToast';

const { storageServ, buddyList, getAliasRealtime } = getTalkFlowCore();
const aiAutoReply = useAIAutoReply();

// State
const isAutoReplyEnabled = ref(aiAutoReply.state.isEnabled);
const enabledBuddies = ref(aiAutoReply.state.enabledBuddies);
const conversationModel = ref(aiAutoReply.state.settings.model);
const conversationMode = ref(aiAutoReply.state.settings.mode);
const conversationStream = ref(aiAutoReply.state.settings.stream);
const replyDelay = ref(aiAutoReply.state.settings.replyDelay);
const showSettings = ref(false);
const showBuddyModal = ref(false);
const showDebugInfo = ref(false);
const models = ref<string[]>([]);
const currentApiUrl = ref(getApiUrl());
const newApiUrl = ref('');

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
const isPulling = ref(false);
const pullProgress = ref<{
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
  percent?: number;
  speed?: string;
  eta?: string;
  successNotified?: boolean;
  modelsRefreshed: boolean;
}>({
  status: '',
  modelsRefreshed: false
});
let pullAbortController: AbortController | null = null;

// State for Push Model
const pushModelName = ref('');
const pushStream = ref(false);
const pushResponse = ref('');

// State for Embeddings
const embedModel = ref('');
const embedPrompt = ref('');
const embedResponse = ref<any>(null);

// Popular models for suggestions
const popularModels = ref([
  'llama3.1:8b',
  'llama3.1:70b',
  'llava:latest',
  'llava:7b',
  'llava:13b',
  'mistral:latest',
  'codellama:latest',
  'gemma:2b',
  'gemma:7b',
  'qwen2.5:7b',
  'phi3:latest'
]);

// Fetch Models
const fetchModels1 = async () => {
  models.value = await fetchModels();
  if (models.value.length && !conversationModel.value) {
    conversationModel.value = models.value[0];
    updateSettings();
  }
};

// Update API URL
const updateApiUrl = async () => {
  try {
    await setApiUrl(newApiUrl.value);
    currentApiUrl.value = getApiUrl();
    showToast('API URL updated successfully', 'success');
    newApiUrl.value = '';
  } catch (error) {
    showToast('Error updating API URL', 'error');
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
    const eventSource = new EventSource(`${getApiUrl()}/api/models/create`);
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      createResponse.value += JSON.stringify(data) + '\n';
    };
    eventSource.onerror = () => {
      eventSource.close();
      showToast('Error creating model', 'error');
    };
    await fetch(`${getApiUrl()}/api/models/create`, {
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
      const response = await fetch(`${getApiUrl()}/api/models/create`, {
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
    const response = await fetch(`${getApiUrl()}/api/models/${deleteModelName.value}`, {
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
    const response = await fetch(`${getApiUrl()}/api/models/copy`, {
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
    const response = await fetch(`${getApiUrl()}/api/models/${showModelName.value}`);
    const data = await response.json();
    showResponse.value = data;
    showToast('Model info retrieved successfully', 'success');
  } catch (error) {
    showResponse.value = { error: 'Error fetching model info' };
    showToast('Error fetching model info', 'error');
  }
};

// Format bytes to human readable format
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

// Format duration to human readable format
const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
};

// Pull Model with Real Progress
const pullModel = async () => {
  if (isPulling.value) return;
  
  pullResponse.value = '';
  isPulling.value = true;
  pullProgress.value = {
    status: 'Connecting to ollama...',
    successNotified: false,
    modelsRefreshed: false
  };
  
  // Create new abort controller
  pullAbortController = new AbortController();
  
  try {
    // Starting pull for model
    // API URL
    
    const requestBody = {
      name: pullModelName.value,
      stream: true,
    };
    // Request body
    
    const response = await fetch(`${getApiUrl()}/api/models/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: pullAbortController.signal
    });

    // Response status
    // Response headers

    if (!response.ok) {
      const errorText = await response.text();
      // Response error text
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body reader available');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let totalDownloaded = 0;
    let downloadedChunks = new Map<string, any>(); // Track progress per digest
    let lastActivityTime = Date.now();
    const ACTIVITY_TIMEOUT = 60000; // 60 seconds timeout for no activity

    pullProgress.value.status = 'Reading stream...';

    while (true) {
      // Check for activity timeout
      if (Date.now() - lastActivityTime > ACTIVITY_TIMEOUT) {
        throw new Error('Stream timeout: No data received for 60 seconds');
      }

      const { done, value } = await reader.read();
      if (done) {
        // Stream finished, buffer remaining
        break;
      }

      lastActivityTime = Date.now(); // Reset activity timer
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            // Gun-Ollama-Relay uses SSE format: "data: {...}"
            let jsonLine = line;
            if (line.startsWith('data: ')) {
              jsonLine = line.substring(6); // Remove "data: " prefix
            }
            
            if (jsonLine.trim()) {
              const data = JSON.parse(jsonLine);
              // Received data
            
              // Check for immediate success detection
              let immediateSuccess = false;
            
              // Update status
              pullProgress.value.status = data.status || 'Processing...';
            
              if (data.digest) {
                pullProgress.value.digest = data.digest.substring(7, 19); // Remove sha256: prefix
              }
              
              // Extract real progress from status string if available
              // Status format: "pulling 667b0c19... - 187.7 MB/4.6 GB (4%)"
              const progressMatch = data.status?.match(/pulling\s+\w+\s*-\s*([\d.]+)\s*([KMGT]?B)\s*\/\s*([\d.]+)\s*([KMGT]?B)\s*\((\d+)%\)/);
              if (progressMatch) {
                const [, completedValue, completedUnit, totalValue, totalUnit, percentStr] = progressMatch;
                
                // Convert to bytes
                const parseSize = (value: string, unit: string): number => {
                  const num = parseFloat(value);
                  switch(unit.toUpperCase()) {
                    case 'KB': return num * 1024;
                    case 'MB': return num * 1024 * 1024;
                    case 'GB': return num * 1024 * 1024 * 1024;
                    case 'TB': return num * 1024 * 1024 * 1024 * 1024;
                    default: return num;
                  }
                };
                
                const completed = parseSize(completedValue, completedUnit);
                const total = parseSize(totalValue, totalUnit);
                const percent = parseInt(percentStr);
                
                pullProgress.value.total = total;
                pullProgress.value.completed = completed;
                pullProgress.value.percent = percent;
                
                // Auto-detect success when reaching 100%
                if (percent >= 100) {
                  pullProgress.value.status = 'Successfully pulled model!';
                  immediateSuccess = true;
                  // Detected completion: progress reached 100%
                }
                
                // Calculate real download speed
                const chunkKey = data.digest || 'default';
                if (!downloadedChunks.has(chunkKey)) {
                  downloadedChunks.set(chunkKey, { 
                    firstSeen: Date.now(), 
                    firstCompleted: completed,
                    lastTime: Date.now(),
                    lastCompleted: completed
                  });
                } else {
                  const chunkInfo = downloadedChunks.get(chunkKey);
                  const currentTime = Date.now();
                  const timeDiff = (currentTime - chunkInfo.lastTime) / 1000; // seconds
                  const bytesDiff = completed - chunkInfo.lastCompleted;
                  
                  if (timeDiff > 1 && bytesDiff > 0) { // Update every 1 second
                    const currentSpeed = bytesDiff / timeDiff; // bytes per second
                    pullProgress.value.speed = `${formatBytes(currentSpeed)}/s`;
                    
                    const remaining = total - completed;
                    if (remaining > 0 && currentSpeed > 0) {
                      const eta = remaining / currentSpeed;
                      pullProgress.value.eta = formatDuration(eta);
                    }
                    
                    // Update tracking info
                    chunkInfo.lastTime = currentTime;
                    chunkInfo.lastCompleted = completed;
                    downloadedChunks.set(chunkKey, chunkInfo);
                  }
                }
              } else if (data.completed !== undefined && data.total) {
                // Fallback: use data fields if no progress in status string
                pullProgress.value.total = data.total;
                pullProgress.value.completed = data.completed;
                pullProgress.value.percent = Math.round((data.completed / data.total) * 100);
                
                // Auto-detect success when reaching 100%
                if (pullProgress.value.percent >= 100) {
                  pullProgress.value.status = 'Successfully pulled model!';
                  immediateSuccess = true;
                  // Detected completion: fallback progress reached 100%
                }
              }
            
              // Handle different status types for display
              if (data.status === 'pulling manifest') {
                pullProgress.value.status = 'Pulling manifest...';
                if (!pullProgress.value.percent) pullProgress.value.percent = 5;
              } else if (data.status && data.status.startsWith('pulling')) {
                // Extract layer name from status for better display
                const layerMatch = data.status.match(/pulling (\w+)/);
                const layerName = layerMatch ? layerMatch[1].substring(0, 8) : 'layer';
                pullProgress.value.status = `Downloading ${layerName}...`;
              } else if (data.status === 'verifying sha256 digest') {
                pullProgress.value.status = 'Verifying download...';
                pullProgress.value.percent = Math.max(pullProgress.value.percent || 0, 90);
              } else if (data.status === 'writing manifest') {
                pullProgress.value.status = 'Writing manifest...';
                pullProgress.value.percent = Math.max(pullProgress.value.percent || 0, 95);
              } else if (data.status === 'removing any unused layers') {
                pullProgress.value.status = 'Cleaning up...';
                pullProgress.value.percent = Math.max(pullProgress.value.percent || 0, 98);
              } else if (data.status === 'success' || data.status === 'completed' || data.status.includes('success')) {
                pullProgress.value.status = 'Successfully pulled model!';
                pullProgress.value.percent = 100;
                immediateSuccess = true;
                // Detected success status
              } else {
                // For any other status, show it as-is but check for completion indicators
                pullProgress.value.status = data.status;
                
                // Additional completion detection
                if (data.status && (
                  data.status.includes('complete') ||
                  data.status.includes('finished') ||
                  data.status.includes('done') ||
                  /pulling\s+\w+\s*-\s*[\d.]+\s*[KMGT]?B\s*\/\s*[\d.]+\s*[KMGT]?B\s*\(100%\)/.test(data.status)
                )) {
                  pullProgress.value.status = 'Successfully pulled model!';
                  pullProgress.value.percent = 100;
                  immediateSuccess = true;
                  // Detected completion from status pattern
                }
              }
              
              // Show immediate success notification
              if (immediateSuccess && !pullProgress.value.successNotified) {
                pullProgress.value.successNotified = true;
                showToast('Model pulled successfully! 🎉', 'success');
              }
              
              // Only refresh models if not already done
              if (!pullProgress.value.modelsRefreshed) {
                pullProgress.value.modelsRefreshed = true;
                await fetchModels1(); // Refresh model list
              }
              
              // Store response for debugging
              pullResponse.value += `${data.status}`;
              if (data.total && pullProgress.value.completed) {
                pullResponse.value += ` - ${formatBytes(pullProgress.value.completed)}/${formatBytes(data.total)} (${pullProgress.value.percent || 0}%)`;
              }
              pullResponse.value += '\n';
            }
          } catch (e) {
            // Failed to parse progress line
            // Still show the raw line for debugging
            pullResponse.value += `Raw: ${line}\n`;
          }
        }
      }
    }

    // Check if download was actually successful
    const isSuccessful = pullProgress.value.status === 'Successfully pulled model!' || 
                        pullProgress.value.percent >= 100 ||
                        pullResponse.value.includes('success') ||
                        pullResponse.value.includes('writing manifest') ||
                        pullResponse.value.includes('removing any unused layers');
    
    if (isSuccessful) {
      // Ensure status shows success
      if (pullProgress.value.status !== 'Successfully pulled model!') {
        pullProgress.value.status = 'Successfully pulled model!';
        pullProgress.value.percent = 100;
      }
      
      // Only show toast if not already notified
      if (!pullProgress.value.successNotified) {
        showToast('Model pulled successfully! 🎉', 'success');
        pullProgress.value.successNotified = true;
      }
      
      // Only refresh models if not already done
      if (!pullProgress.value.modelsRefreshed) {
        pullProgress.value.modelsRefreshed = true;
        await fetchModels1(); // Refresh model list
      }
      
      // Model pulled successfully
    } else {
      // Stream ended but didn't reach success state
      pullProgress.value.status = 'Download incomplete or failed';
      pullResponse.value += '\n⚠️ Download stream ended unexpectedly\n';
      showToast('Download may have failed - check logs', 'warning');
      // Download stream ended without clear success indication
    }

  } catch (error: any) {
    // Full error object
    
    if (error.name === 'AbortError') {
      pullProgress.value.status = 'Download cancelled';
      pullResponse.value = 'Download was cancelled by user';
      showToast('Download cancelled', 'warning');
    } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
      pullProgress.value.status = 'Connection error';
      pullResponse.value = `Network error: Cannot connect to ollama service at ${getApiUrl()}. Please check if ollama is running.`;
      showToast('Cannot connect to ollama service', 'error');
    } else if (error.message.includes('timeout')) {
      pullProgress.value.status = 'Request timeout';
      pullResponse.value = 'Request timed out. Large models may take a long time to download. Try again or check your internet connection.';
      showToast('Request timed out', 'error');
    } else {
      pullProgress.value.status = 'Error pulling model';
      pullResponse.value = `Error: ${error.message}\n\nAPI URL: ${getApiUrl()}\nModel: ${pullModelName.value}`;
      showToast(`Error: ${error.message}`, 'error');
    }
    // Pull model error details
  } finally {
    isPulling.value = false;
    pullAbortController = null;
  }
};

// Cancel pull operation
const cancelPullModel = () => {
  if (pullAbortController) {
    pullAbortController.abort();
  }
};

// Test ollama connection
const testConnection = async () => {
  try {
    pullResponse.value = 'Testing connection...\n';
    
    // Testing connection to
    
    // Test models endpoint (Gun-Ollama-Relay uses /api/models instead of /api/tags)
    const modelsResponse = await fetch(`${getApiUrl()}/api/models`);
    if (!modelsResponse.ok) {
      throw new Error(`Models check failed: ${modelsResponse.status}`);
    }
    const modelsData = await modelsResponse.json();
    pullResponse.value += `✓ Gun-Ollama-Relay service connected\n`;
    pullResponse.value += `✓ Found ${modelsData?.length || 0} models\n`;
    
    // Test pull endpoint with a simple request (not streaming)
    const testPullResponse = await fetch(`${getApiUrl()}/api/models/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'llama3.2:1b', // Small model for testing
        stream: false
      })
    });
    
    if (testPullResponse.ok) {
      pullResponse.value += `✓ Pull API endpoint accessible\n`;
      pullResponse.value += `✓ Connection test successful!\n\n`;
      pullResponse.value += `Ready to download models. Large models like llama3.1:8b (4.9GB) may take time.\n`;
      showToast('Connection test successful!', 'success');
    } else {
      const errorText = await testPullResponse.text();
      pullResponse.value += `✗ Pull API test failed: ${testPullResponse.status}\n`;
      pullResponse.value += `Error: ${errorText}\n`;
      showToast('Pull API test failed', 'error');
    }
    
  } catch (error: any) {
    pullResponse.value += `✗ Connection test failed\n`;
    pullResponse.value += `Error: ${error.message}\n`;
    pullResponse.value += `API URL: ${getApiUrl()}\n`;
    showToast('Connection test failed', 'error');
    // Connection test error
  }
};

// Push Model
const pushModel = async () => {
  pushResponse.value = '';
  if (pushStream.value) {
    const eventSource = new EventSource(`${getApiUrl()}/api/models/push`);
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      pushResponse.value += JSON.stringify(data) + '\n';
    };
    eventSource.onerror = () => {
      eventSource.close();
      showToast('Error pushing model', 'error');
    };
    await fetch(`${getApiUrl()}/api/models/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: pushModelName.value,
        stream: true,
      }),
    });
  } else {
    try {
      const response = await fetch(`${getApiUrl()}/api/models/push`, {
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
    const response = await fetch(`${getApiUrl()}/api/embeddings`, {
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

// Debug functions - 调试功能
const refreshDebugInfo = () => {
  // Force reactivity update by accessing the state
  // The debug modal will automatically show updated values
  showToast('Debug info refreshed', 'success');
};

const resetAutoReplySettings = async () => {
  await aiAutoReply.clearSettings();
  // Update local refs to match the reset state
  isAutoReplyEnabled.value = aiAutoReply.state.isEnabled;
  enabledBuddies.value = aiAutoReply.state.enabledBuddies;
  conversationModel.value = aiAutoReply.state.settings.model;
  conversationMode.value = aiAutoReply.state.settings.mode;
  conversationStream.value = aiAutoReply.state.settings.stream;
  replyDelay.value = aiAutoReply.state.settings.replyDelay;
};

// Initialize
onMounted(() => {
  fetchModels1();
});
</script>

<style scoped>
ion-list {
  background: transparent;
}

.response-text {
  display: block;
  white-space: pre-wrap;
  background: var(--ion-color-light);
  padding: 12px;
  border-radius: 8px;
  margin-top: 12px;
  font-family: monospace;
  font-size: 12px;
  max-height: 200px;
  overflow-y: auto;
}

ion-card {
  margin-bottom: 20px;
  margin-left: 8px;
  margin-right: 8px;
}

ion-card-header {
  padding-bottom: 12px;
  padding-top: 16px;
}

ion-card-title {
  font-size: 18px;
  font-weight: 600;
  display: flex;
  align-items: center;
}

ion-card-content {
  padding-top: 8px;
  padding-bottom: 16px;
}

ion-item {
  --padding-start: 0;
  --padding-end: 0;
  --inner-padding-end: 0;
  margin-bottom: 16px;
}

ion-item:last-child {
  margin-bottom: 0;
}

ion-item h3 {
  font-weight: 600;
  margin-bottom: 6px;
  margin-top: 0;
}

ion-item p {
  color: var(--ion-color-medium);
  font-size: 14px;
  margin: 0;
  line-height: 1.4;
}

ion-accordion-group {
  margin-top: 8px;
}

ion-accordion ion-item[slot="header"] {
  --background: var(--ion-color-light);
  --border-radius: 8px;
  margin-bottom: 8px;
  --padding-start: 16px;
  --padding-end: 16px;
}

ion-accordion ion-item[slot="header"] ion-icon {
  color: var(--ion-color-primary);
  margin-right: 12px;
}

ion-accordion div[slot="content"] {
  padding: 16px;
  padding-top: 8px;
}

ion-avatar {
  background: var(--ion-color-light);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
}

ion-avatar ion-icon {
  color: var(--ion-color-medium);
}

/* Modal content spacing */
ion-modal ion-content {
  --padding-start: 16px;
  --padding-end: 16px;
}

ion-modal ion-list {
  margin-top: 8px;
}

ion-modal ion-item {
  margin-bottom: 12px;
}

/* Button spacing */
ion-button {
  margin-top: 16px;
  margin-bottom: 8px;
}

ion-button:last-child {
  margin-bottom: 0;
}

/* Input and textarea spacing */
ion-input, ion-textarea {
  margin-top: 8px;
  margin-bottom: 8px;
}

/* Toggle spacing */
ion-toggle {
  margin-left: 8px;
}

/* Select spacing */
ion-select {
  margin-top: 8px;
  margin-bottom: 8px;
}

/* Icon spacing in headers */
ion-card-title ion-icon {
  margin-right: 8px;
}

/* Response text container */
.response-text {
  margin-top: 16px;
  margin-bottom: 8px;
}

/* Accordion content spacing */
ion-accordion div[slot="content"] ion-item {
  margin-bottom: 12px;
}

ion-accordion div[slot="content"] ion-button {
  margin-top: 12px;
}

/* Modal header spacing */
ion-modal ion-header {
  padding-bottom: 8px;
}

/* Content padding adjustments */
ion-content {
  --padding-start: 8px;
  --padding-end: 8px;
  --padding-top: 8px;
  --padding-bottom: 16px;
}

/* Progress Container Styles */
.progress-container {
  background: var(--ion-color-light);
  border-radius: 12px;
  padding: 16px;
  margin: 16px 0;
  border: 1px solid var(--ion-color-light-shade);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.progress-header h4 {
  margin: 0;
  color: var(--ion-color-primary);
  font-weight: 600;
  font-size: 14px;
}

/* Progress Bar Styles */
.progress-bar-container {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: var(--ion-color-light-shade);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--ion-color-success), var(--ion-color-success-shade));
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-percent {
  font-weight: 600;
  font-size: 12px;
  color: var(--ion-color-success);
  min-width: 35px;
  text-align: right;
}

/* Download Details Styles */
.download-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.detail-label {
  color: var(--ion-color-medium);
  font-weight: 500;
}

.detail-value {
  color: var(--ion-color-dark);
  font-weight: 600;
}

.detail-value.digest {
  font-family: monospace;
  font-size: 11px;
  color: var(--ion-color-medium);
}

/* Spinner Container */
.spinner-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

/* Model Suggestions Styles */
.model-suggestions {
  margin-top: 16px;
  padding: 12px;
  background: var(--ion-color-light);
  border-radius: 8px;
}

.model-suggestions h5 {
  margin: 0 0 8px 0;
  color: var(--ion-color-medium);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.suggestion-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.suggestion-chips ion-chip {
  --background: var(--ion-color-primary-contrast);
  --color: var(--ion-color-primary);
  --border-color: var(--ion-color-primary);
  --border-width: 1px;
  --border-style: solid;
  font-size: 11px;
  height: 28px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.suggestion-chips ion-chip:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(var(--ion-color-primary-rgb), 0.2);
}

.suggestion-chips ion-chip:not([outline]) {
  --background: var(--ion-color-primary);
  --color: var(--ion-color-primary-contrast);
}

/* Button Group Styles */
.button-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 16px 0;
}

.button-group ion-button {
  margin: 0;
}

/* Response Container Styles */
.response-container {
  margin-top: 16px;
}

.response-container h5 {
  margin: 0 0 8px 0;
  color: var(--ion-color-medium);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Debug Info Styles */
.debug-json {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 11px;
  background: var(--ion-color-light);
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--ion-color-light-shade);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 300px;
  overflow-y: auto;
  color: var(--ion-color-dark);
  margin: 8px 0;
  line-height: 1.4;
}
</style>