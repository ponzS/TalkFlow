<template>
  <ion-page>
    <!-- <ion-header> -->
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button text="" @click="router.go(-1)" color="dark"></ion-back-button>
        </ion-buttons>
        <!-- <ion-title>{{ $t('AI Chat') || 'D-AI Chat' }}</ion-title> -->
        <ion-buttons slot="end">
          <ion-button @click="showTemplates = true" fill="clear">
            <ion-icon :icon="bulbOutline"></ion-icon>
          </ion-button>
          <ion-button @click="showImageGeneration = true" fill="clear">
            <ion-icon :icon="imageOutline"></ion-icon>
          </ion-button>
          <ion-button @click="showImageRecognition = true" fill="clear">
            <ion-icon :icon="eyeOutline"></ion-icon>
          </ion-button>
          <ion-button @click="goToUserGuide" fill="clear">
            <ion-icon :icon="bookOutline"></ion-icon>
          </ion-button>
          <ion-button @click="clearChat" fill="clear">
            <ion-icon :icon="trashOutline"></ion-icon>
          </ion-button>
          <ion-button @click="showSettings = true" fill="clear">
            <ion-icon :icon="settingsOutline"></ion-icon>
          </ion-button>
          <ion-button @click="toggleDebugMode()" fill="clear" :color="debugMode ? 'success' : 'warning'">
            <ion-icon :icon="bugOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    <!-- </ion-header> -->
    
    <ion-content :fullscreen="true" class="chat-content" ref="contentRef" :style="{ '--content-bottom': keyboardHeight + 'px' }">
      <!-- Connection Status Banner -->
      <div v-if="!isConnected" class="connection-banner">
        <ion-chip color="warning">
          <ion-icon :icon="warningOutline"></ion-icon>
          <ion-label>{{ $t('Connection Error') || 'API Connection Error' }}</ion-label>
        </ion-chip>
      </div>

      <!-- Chat Messages List -->
      <div class="chat-container" ref="chatContainer">
        <!-- Welcome Message -->
        <div v-if="messages.length === 0" class="welcome-message">
          <div class="welcome-card">
            <ion-icon :icon="sparklesOutline" class="welcome-icon"></ion-icon>
            <h2>{{ $t('Welcome to TalkFlow') || 'Welcome to TalkFlow' }}</h2>
            <p>{{ $t('Start conversation by typing a message') || 'Start conversation by typing a message' }}</p>
            <ion-button 
              @click="goToUserGuide" 
              fill="outline" 
              size="default"
              class="user-guide-button"
            >
              <ion-icon :icon="bookOutline" slot="start"></ion-icon>
                              {{ $t('userGuideButton') || 'User Guide' }}
            </ion-button>
          </div>
        </div>

                <!-- Messages List -->
        <div 
          v-for="(message, index) in messages" 
          :key="index" 
          class="message-group"
        >
          <!-- Think Bubble (if exists) -->
          <div 
            v-if="message.thinkContent" 
            class="message-wrapper think-message"
          >
            <div class="message-bubble think-bubble">
              <div class="message-header">
                <ion-avatar class="message-avatar think-avatar">
                  <ion-icon 
                    :icon="sparklesOutline" 
                    class="avatar-icon"
                  ></ion-icon>
                </ion-avatar>
                <div class="message-info">
                  <span class="message-sender">{{ $t('AI Thinking') || 'AI Thinking' }}</span>
                  <span class="message-time">{{ formatTime(message.timestamp) }}</span>
                </div>
              </div>
              <div class="message-content think-content">
                <MarkdownRenderer 
                  :content="message.thinkContent"
                  :is-streaming="false"
                />
              </div>
            </div>
          </div>

          <!-- Main Message Bubble -->
          <div 
            class="message-wrapper"
            :class="{ 
              'user-message': message.role === 'user', 
              'ai-message': message.role === 'assistant',
              'streaming': message.isStreaming 
            }"
          >
            <div class="message-bubble">
              <div class="message-header">
                <ion-avatar class="message-avatar">
                  <ion-icon 
                    :icon="message.role === 'user' ? personOutline : hardwareChipOutline" 
                    class="avatar-icon"
                  ></ion-icon>
                </ion-avatar>
                <div class="message-info">
                  <span class="message-sender">{{ message.role === 'user' ? ($t('You') || 'You') : 'AI' }}</span>
                  <span class="message-time">{{ formatTime(message.timestamp) }}</span>
                </div>
                <ion-spinner 
                  v-if="message.isStreaming" 
                  name="dots" 
                  class="streaming-indicator"
                ></ion-spinner>
              </div>
              <div class="message-content">
                <div v-if="message.role === 'user'" class="user-content">
                  <!-- Images Display -->
                  <div v-if="message.images && message.images.length > 0" class="message-images">
                    <!-- 🔍 Temporary Debug Info -->
                    <div style="font-size: 10px; color: #666; margin-bottom: 4px;">
                      DEBUG: {{ message.images.length }} image(s) - 
                      URLs: {{ message.images.map(img => img.url ? (img.url.startsWith('data:') ? 'data-uri' : 'blob') : 'none').join(', ') }}
                    </div>
                    <div 
                      v-for="(image, imgIndex) in message.images" 
                      :key="imgIndex" 
                      class="message-image-item"
                    >
                      <img :src="image.url" :alt="image.name" class="message-image" />
                      <div style="font-size: 10px; color: #999;">{{ image.name }}</div>
                    </div>
                  </div>
                  <!-- Text Content -->
                  <div v-if="message.content.trim()" class="message-text">
                    {{ message.content }}
                  </div>
                </div>
                <div v-else class="ai-content">
                  <MarkdownRenderer 
                    v-if="message.content" 
                    :content="message.content"
                    :is-streaming="message.isStreaming"
                    @thinkContent="handleThinkContent(message, $event)"
                  />
                  <div v-else-if="message.isStreaming" class="streaming-placeholder">
                    <ion-skeleton-text animated style="width: 60%"></ion-skeleton-text>
                    <ion-skeleton-text animated style="width: 40%"></ion-skeleton-text>
                  </div>
                  <div v-else class="empty-response">
                    {{ $t('No response') || 'No response' }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Typing Indicator -->
        <div v-if="isTyping" class="typing-indicator">
          <div class="typing-bubble">
            <div class="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <ion-fab v-if="messages.length > 0" vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button 
          color="medium" 
          size="small"
          @click="scrollToBottom"
        >
          <ion-icon :icon="chevronDownOutline"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>

    <!-- Chat Input Area -->
    <div class="chat-input-container" :style="{ transform: `translateY(-${keyboardHeight}px)` }">
      <ion-card class="input-card">
        <ion-card-content class="input-content">
                     <div class="input-wrapper">
             <ion-button 
               @click="showTemplates = true"
               class="template-button"
               fill="clear"
               color="medium"
               size="small"
             >
               <ion-icon :icon="bulbOutline" slot="icon-only"></ion-icon>
             </ion-button>
             <ion-button 
               @click="showImageGeneration = true"
               class="image-gen-button"
               fill="clear"
               color="medium"
               size="small"
             >
               <ion-icon :icon="imageOutline" slot="icon-only"></ion-icon>
             </ion-button>
             <ChatImageUpload
               ref="chatImageUpload"
               @imagesSelected="handleImagesSelected"
               @uploadError="handleImageUploadError"
             />
             <ion-textarea
               v-model="userInput"
               :placeholder="$t('Type your message or paste documents here...') || 'Type your message or paste documents here...'"
               :rows="1"
               auto-grow
               class="message-input"
               @keydown.enter.exact.prevent="sendMessage"
               @keydown.enter.shift.exact="newLine"
               @ionFocus="onInputFocus"
               @ionBlur="onInputBlur"
               :disabled="isSending"
             ></ion-textarea>
             <div class="input-actions">
               <ion-button 
                 v-if="isSending"
                 @click="stopGeneration" 
                 class="stop-button"
                 fill="clear"
                 color="danger"
               >
                 <ion-icon :icon="stopOutline" slot="icon-only"></ion-icon>
               </ion-button>
               <ion-button 
                 v-else
                 @click="sendMessage" 
                 :disabled="(!userInput.trim() && selectedImages.length === 0) || !selectedModel"
                 class="send-button"
                 fill="clear"
                 color="primary"
               >
                 <ion-icon :icon="sendOutline" slot="icon-only"></ion-icon>
               </ion-button>
             </div>
           </div>
          <!-- Input Hints -->
          <div class="input-hint">
            <span class="char-count">{{ userInput.length.toLocaleString() }} {{ $t('characters') || 'characters' }}</span>
            <span v-if="userInput.length > 1000" class="long-text-hint">{{ $t('Long document detected') || 'Long document detected' }}</span>
            <span class="keyboard-hint">{{ $t('Enter to send, Shift+Enter for new line') || 'Enter to send, Shift+Enter for new line' }}</span>
          </div>
        </ion-card-content>
      </ion-card>
    </div>

    <!-- Settings Modal -->
    <ion-modal :is-open="showSettings" @didDismiss="showSettings = false">
      <ion-header>
        <ion-toolbar>
          <ion-title>{{ $t('Chat Settings') || 'Chat Settings' }}</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="showSettings = false">
              {{ $t('Done') || 'Done' }}
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <ion-list>
          <!-- Model Selection -->
          <ion-item lines="none" class="setting-item">
            <ion-label>
              <h3>{{ $t('AI Model') || 'AI Model' }}</h3>
              <p>{{ selectedModel || ($t('No model selected') || 'No model selected') }}</p>
            </ion-label>
            <ion-select 
              v-model="selectedModel" 
              :placeholder="$t('Select model') || 'Select model'" 
              interface="popover"
              @ionChange="saveSettings"
            >
              <ion-select-option v-for="model in models" :key="model" :value="model">
                {{ model }}
              </ion-select-option>
            </ion-select>
          </ion-item>
          
          <!-- Chat Mode Selection -->
          <ion-item lines="none" class="setting-item">
            <ion-label>
              <h3>{{ $t('Chat Mode') || 'Chat Mode' }}</h3>
              <p>{{ chatMode === 'chat' ? ($t('Chat') || 'Chat') : ($t('Generate') || 'Generate') }}</p>
            </ion-label>
            <ion-select 
              v-model="chatMode" 
              interface="popover"
              @ionChange="saveSettings"
            >
              <ion-select-option value="chat">{{ $t('Chat') || 'Chat' }}</ion-select-option>
              <ion-select-option value="generate">{{ $t('Generate') || 'Generate' }}</ion-select-option>
            </ion-select>
          </ion-item>
          
          <!-- Stream Response Toggle -->
          <ion-item lines="none" class="setting-item">
            <ion-label>
              <h3>{{ $t('Stream Response') || 'Stream Response' }}</h3>
              <p>{{ $t('Enable real-time streaming') || 'Enable real-time streaming' }}</p>
            </ion-label>
            <ion-toggle 
              v-model="streamEnabled" 
              @ionChange="saveSettings"
            ></ion-toggle>
          </ion-item>
          
          <!-- Temperature Control -->
          <ion-item lines="none" class="setting-item">
            <ion-label>
              <h3>{{ $t('Temperature') || 'Temperature' }} ({{ temperature }})</h3>
              <p>{{ $t('Control response randomness') || 'Control response randomness' }}</p>
            </ion-label>
          </ion-item>
          <ion-range 
            v-model="temperature" 
            :min="0" 
            :max="1" 
            :step="0.1"
            :pin="true"
            @ionInput="saveSettings"
            class="temperature-range"
          >
            <ion-label slot="start">0</ion-label>
            <ion-label slot="end">1</ion-label>
          </ion-range>

          <!-- API Settings -->
          <ion-item lines="none" class="setting-item">
            <ion-label>
              <h3>{{ $t('API URL') || 'API URL' }}</h3>
              <p>{{ apiUrl }}</p>
            </ion-label>
            <ion-button fill="clear" @click="openApiSettings">
              <ion-icon :icon="linkOutline"></ion-icon>
            </ion-button>
          </ion-item>
        </ion-list>
      </ion-content>
    </ion-modal>

    <!-- Message Templates Component -->
    <MessageTemplates 
      :is-open="showTemplates"
      @close="showTemplates = false"
      @selectTemplate="handleTemplateSelect"
    />

    <!-- Image Generation Modal -->
    <ion-modal :is-open="showImageGeneration" @didDismiss="showImageGeneration = false">
      <ion-header>
        <ion-toolbar>
          <ion-title>{{ $t('Image Generation') || 'Image Generation' }}</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="showImageGenerationSettings = !showImageGenerationSettings" fill="clear">
              <ion-icon :icon="settingsOutline"></ion-icon>
            </ion-button>
            <ion-button @click="showImageGeneration = false">
              {{ $t('Close') || 'Close' }}
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
        
        <!-- Generation Mode Switch -->
        <ion-toolbar v-if="!showImageGenerationSettings">
          <ion-segment 
            v-model="imageGenerationMode" 
            @ionChange="onImageGenerationModeChange"
            class="generation-mode-segment"
          >
            <ion-segment-button value="cloud">
              <ion-icon :icon="cloudOutline"></ion-icon>
              <ion-label>{{ $t('Cloud AI') || 'Cloud AI' }}</ion-label>
            </ion-segment-button>
            <ion-segment-button value="local">
              <ion-icon :icon="desktopOutline"></ion-icon>
              <ion-label>{{ $t('Local') || 'Local' }}</ion-label>
            </ion-segment-button>
          </ion-segment>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <!-- Image Generation Settings -->
        <div v-if="showImageGenerationSettings" class="settings-panel">
          <!-- Cloud Settings -->
          <div v-if="imageGenerationMode === 'cloud'">
            <ImageGenerationSettings
              @settingsSaved="onImageSettingsSaved"
              @settingsError="onImageSettingsError"
              @testSuccess="onImageTestSuccess"
              @testError="onImageTestError"
            />
          </div>
          
          <!-- Local Settings -->
          <div v-else>
            <LocalImageSettings
              @settingsSaved="onLocalImageSettingsSaved"
              @settingsError="onLocalImageSettingsError"
              @testSuccess="onLocalImageTestSuccess"
              @testError="onLocalImageTestError"
            />
          </div>
        </div>
        
        <!-- Image Generation Interface -->
        <div v-else class="generation-panel">
          <!-- Cloud Generation -->
          <div v-if="imageGenerationMode === 'cloud'">
            <ImageGenerationPanel
              @imageGenerated="onImageGenerated"
              @sendImage="onSendImageToChat"
            />
          </div>
          
          <!-- Local Generation -->
          <div v-else>
            <LocalImageGenerationPanel
              @imageGenerated="onLocalImageGenerated"
              @sendImage="onSendImageToChat"
            />
          </div>
        </div>
      </ion-content>
    </ion-modal>

    <!-- Image Recognition Modal -->
    <ion-modal :is-open="showImageRecognition" @didDismiss="showImageRecognition = false">
      <ion-header>
        <ion-toolbar>
          <ion-title>{{ $t('Image Recognition') || 'Image Recognition' }}</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="showImageRecognitionSettings = !showImageRecognitionSettings" fill="clear">
              <ion-icon :icon="settingsOutline"></ion-icon>
            </ion-button>
            <ion-button @click="showImageRecognition = false">
              {{ $t('Close') || 'Close' }}
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <!-- Image Recognition Settings -->
        <div v-if="showImageRecognitionSettings" class="settings-panel">
          <ImageRecognitionSettings
            @settingsSaved="onImageRecognitionSettingsSaved"
            @settingsError="onImageRecognitionSettingsError"
            @testResult="onImageRecognitionTestResult"
          />
        </div>
        
        <!-- Image Recognition Interface -->
        <div v-else class="recognition-panel">
          <div class="recognition-description">
            <h3>
              <ion-icon :icon="eyeOutline"></ion-icon>
              {{ $t('AI Image Recognition') || 'AI Image Recognition' }}
            </h3>
            <p>{{ $t('Upload an image to let AI analyze and describe its content') || 'Upload an image to let AI analyze and describe its content' }}</p>
          </div>
          
          <ImageUpload
            @imageAnalyzed="onImageAnalyzed"
            @sendToChat="onSendRecognitionToChat"
          />
        </div>
      </ion-content>
    </ion-modal>
 
  
  <!-- Debug Settings Modal -->
  <ion-modal :is-open="showDebugModal" @didDismiss="showDebugModal = false">
    <ion-header>
      <ion-toolbar>
        <ion-title>Debug Panel</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="showDebugModal = false">
            {{ $t('Close') || 'Close' }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <!-- Debug Toggle Toolbar -->
      <ion-toolbar>
        <div class="debug-controls">
          <ion-item lines="none" class="debug-toggle-item">
            <ion-icon :icon="bugOutline" slot="start" :class="{ 'debug-active': debugMode }"></ion-icon>
            <ion-label>
              <h3>Debug Mode</h3>
              <p>{{ debugMode ? 'Enabled - Recording detailed logs' : 'Disabled - Saving system resources' }}</p>
            </ion-label>
            <ion-toggle 
              :checked="debugMode" 
              @ionChange="debugMode ? disableDebugMode() : enableDebugMode()"
              slot="end"
            ></ion-toggle>
          </ion-item>
          
          <div v-if="debugMode" class="debug-actions">
            <ion-button 
              @click="debugLogger?.show(); testDebugger()" 
              fill="outline" 
              size="small"
              color="primary"
            >
              <ion-icon :icon="playOutline" slot="start"></ion-icon>
              Run Test
            </ion-button>
            <ion-button 
              @click="debugLogger?.clear()" 
              fill="outline" 
              size="small"
              color="medium"
            >
              <ion-icon :icon="trashOutline" slot="start"></ion-icon>
              Clear Logs
            </ion-button>
          </div>
        </div>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div v-if="!debugMode" class="debug-info">
        <div class="info-card">
          <ion-icon :icon="informationCircleOutline" color="primary" class="info-icon"></ion-icon>
          <h3>Debug Mode Description</h3>
          <p>When debug mode is enabled, the system will record detailed operation logs, including:</p>
          <ul>
            <li>📋 Keyboard show/hide events</li>
            <li>🖼️ Image selection and processing</li>
            <li>🔗 API request and response data</li>
            <li>⚠️ Error and warning information</li>
            <li>🔧 System status changes</li>
          </ul>
          <p class="performance-note">
            <ion-icon :icon="speedometerOutline" color="warning"></ion-icon>
            <strong>Performance Note:</strong> Debug mode may slightly affect performance. It's recommended to enable only when troubleshooting issues.
          </p>
        </div>
      </div>
      
      <div v-else class="debug-active-info">
        <div class="active-card">
          <ion-icon :icon="checkmarkCircleOutline" color="success" class="success-icon"></ion-icon>
          <h3>Debug Mode Enabled</h3>
          <p>The system is now recording detailed debug information. You can:</p>
          <ul>
            <li>View real-time logs while using features</li>
            <li>Check error details when encountering issues</li>
            <li>Share debug information with developers</li>
          </ul>
          
          <div class="debug-stats">
            <ion-chip color="primary">
              <ion-icon :icon="timeOutline"></ion-icon>
              <ion-label>Runtime: {{ formatTime(new Date()) }}</ion-label>
            </ion-chip>
            <ion-chip color="success">
              <ion-icon :icon="layersOutline"></ion-icon>
              <ion-label>Logging: Active</ion-label>
            </ion-chip>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-modal>
  
  <!-- Debug Logger Component -->
  <DebugLogger ref="debugLogger" />
</ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch, onUnmounted } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton,
  IonIcon, IonModal, IonItem, IonLabel, IonSelect, IonSelectOption,
  IonToggle, IonList, IonTextarea, IonBackButton, IonCard, IonCardContent,
  IonFab, IonFabButton, IonSpinner, IonRange, IonAvatar, IonChip,
  IonSkeletonText, IonSegment, IonSegmentButton, IonAlert,
} from '@ionic/vue';
import { 
  sendOutline, settingsOutline, trashOutline, personOutline, 
  hardwareChipOutline, sparklesOutline, warningOutline, chevronDownOutline,
  stopOutline, linkOutline, bulbOutline, imageOutline, cloudOutline, desktopOutline,
  eyeOutline, bugOutline, playOutline, informationCircleOutline, speedometerOutline,
  checkmarkCircleOutline, timeOutline, layersOutline, bookOutline
} from 'ionicons/icons';
import { fetchModels, getApiUrl, streamChat, chat } from '@/composables/ollamaService';
import { showToast } from '@/composables/useToast';
import { useRouter } from 'vue-router';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import MarkdownRenderer from '@/components/ui/MarkdownRenderer.vue';
import MessageTemplates from '@/components/ui/MessageTemplates.vue';
import ImageGenerationPanel from '@/components/ui/ImageGenerationPanel.vue';
import ImageGenerationSettings from '@/components/ui/ImageGenerationSettings.vue';
import LocalImageGenerationPanel from '@/components/ui/LocalImageGenerationPanel.vue';
import LocalImageSettings from '@/components/ui/LocalImageSettings.vue';
import ImageUpload from '@/components/ui/ImageUpload.vue';
import ImageRecognitionSettings from '@/components/ui/ImageRecognitionSettings.vue';
import ChatImageUpload, { type ImageFile } from '@/components/ui/ChatImageUpload.vue';
import DebugLogger from '@/components/ui/DebugLogger.vue';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  thinkContent?: string;
  images?: ImageFile[];
  isImageMessage?: boolean;
}

// 🔧 Super safe message creator - multiple string protection
const createSafeMessage = (role: 'user' | 'assistant', content: any, options?: Partial<ChatMessage>): ChatMessage => {
  let safeContent = '';
  
  try {
    // First layer: null value handling
    if (content === null || content === undefined) {
      safeContent = '';
    }
    // Second layer: strings pass directly
    else if (typeof content === 'string') {
      safeContent = content;
    }
    // Third layer: smart object extraction
    else if (typeof content === 'object') {
      console.warn('🚨 Creating message with object content, applying smart extraction:', content);
      
      // Try to extract text fields
      if (content.text) {
        safeContent = String(content.text);
        console.log('🔧 Extracted message from object.text');
      } else if (content.content) {
        safeContent = String(content.content);
        console.log('🔧 Extracted message from object.content');
      } else if (content.message) {
        safeContent = String(content.message);
        console.log('🔧 Extracted message from object.message');
      } else if (Array.isArray(content)) {
        safeContent = content.map(item => String(item)).join(' ');
        console.log('🔧 Converted array to string message');
      } else {
        // JSON序列化但美化显示
        const jsonStr = JSON.stringify(content, null, 2);
        // 尝试让JSON看起来更像普通文本
        safeContent = jsonStr
          .replace(/[\{\}"]/g, '')
          .replace(/,\s*\n/g, '\n')
          .replace(/:\s*/g, ': ')
          .trim();
        
        // If it still looks too much like JSON, wrap it
        if (safeContent.includes(':') && safeContent.includes('\n')) {
          safeContent = 'Content structure:\n' + safeContent;
        }
        
        console.warn('🔧 Object converted to readable text format');
      }
    }
    // Fourth layer: Force conversion for other types
    else {
      safeContent = String(content);
      console.log('🔧 Basic type converted to string:', typeof content);
    }
    
    // Fifth layer: Final validation and cleanup
    if (typeof safeContent !== 'string') {
      console.error('💥 CRITICAL: Message content is still not string after all conversions!');
      safeContent = '[CRITICAL_MESSAGE_TYPE_ERROR]';
    }
    
    // Only clean actual object pollution markers
    if (safeContent.includes('[object Object]')) {
      console.warn('🚨 Cleaning object pollution from message content');
      safeContent = safeContent.replace(/\[object Object\]/g, '');
    }
    
  } catch (conversionError) {
    console.error('❌ Message content conversion completely failed:', conversionError);
    safeContent = '[MESSAGE_CREATION_FAILED: ' + typeof content + ']';
  }
  
  // Final verification
  const finalMessage = {
    role,
    content: String(safeContent), // Double protection
    timestamp: new Date(),
    ...options
  };
  
  // Verify created message
  if (typeof finalMessage.content !== 'string') {
    console.error('💥 FATAL: Final message content is not string!');
    finalMessage.content = '[FINAL_MESSAGE_TYPE_ERROR]';
  }
  
  return finalMessage;
};

// Router
const router = useRouter();

// Reactive state
const messages = ref<ChatMessage[]>([]);
const userInput = ref('');
const isSending = ref(false);
const isTyping = ref(false);
const showSettings = ref(false);
const showTemplates = ref(false);
const showImageGeneration = ref(false);
const showImageGenerationSettings = ref(false);
const showImageRecognition = ref(false);
const showImageRecognitionSettings = ref(false);
const showDebugModal = ref(false);
const imageGenerationMode = ref<'cloud' | 'local'>('cloud');
const isConnected = ref(true);

// Chat image related
const chatImageUpload = ref<InstanceType<typeof ChatImageUpload>>();
const selectedImages = ref<ImageFile[]>([]);

// Settings state
const models = ref<string[]>([]);
const selectedModel = ref('');
const chatMode = ref<'chat' | 'generate'>('chat');
const streamEnabled = ref(false);
const temperature = ref(0.7);
const apiUrl = ref(getApiUrl());

// Keyboard adaptation state
const keyboardHeight = ref(0);
const inputFocused = ref(false);

// DOM references
const contentRef = ref();
const chatContainer = ref();

// Debug mode
const debugMode = ref(false);

// Stop generation control
let abortController: AbortController | null = null;

// Navigate to User Guide
const goToUserGuide = () => {
  router.push('/user-guide');
};

// Initialization
onMounted(async () => {
  await loadSettings();
  await loadModels();
  scrollToBottom();
  
  // Setup keyboard listeners
  try {
    Keyboard.setResizeMode({ mode: KeyboardResize.None });
    
    Keyboard.addListener('keyboardWillShow', (info: { keyboardHeight: number }) => {
      keyboardHeight.value = info.keyboardHeight;
      inputFocused.value = true;
      nextTick(() => scrollToBottom());
      
      logDebugInfo('Keyboard Show', {
        keyboardHeight: info.keyboardHeight,
        timestamp: new Date().toISOString()
      });
    });
    
    Keyboard.addListener('keyboardWillHide', () => {
      keyboardHeight.value = 0;
      inputFocused.value = false;
      
      nextTick(() => {
        setTimeout(() => scrollToBottom(), 100);
      });
      
      logDebugInfo('Keyboard Hide', {
        timestamp: new Date().toISOString()
      });
    });
  } catch (err) {
    console.warn('Keyboard setup failed:', err);
    logDebugWarning('Keyboard Setup Failed', { error: err });
  }
});

// Cleanup
onUnmounted(() => {
  if (abortController) {
    abortController.abort();
  }
  
  // Cleanup keyboard listeners
  try {
    Keyboard.removeAllListeners();
  } catch (err) {
    console.warn('Keyboard cleanup failed:', err);
  }
});

// Watch for message changes and auto-scroll
watch(messages, () => {
  nextTick(() => scrollToBottom());
}, { deep: true });

// Watch for input focus changes and auto-scroll
watch(inputFocused, (focused) => {
  if (focused) {
    nextTick(() => {
      setTimeout(() => scrollToBottom(), 300);
    });
  }
});

// Load settings
const loadSettings = async () => {
  try {
    const saved = localStorage.getItem('aiChatSettings');
    if (saved) {
      const settings = JSON.parse(saved);
      selectedModel.value = settings.selectedModel || '';
      chatMode.value = settings.chatMode || 'chat';
      streamEnabled.value = settings.streamEnabled ?? false;
      temperature.value = settings.temperature ?? 0.7;
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
};

// Save settings
const saveSettings = async () => {
  try {
    const settings = {
      selectedModel: selectedModel.value,
      chatMode: chatMode.value,
      streamEnabled: streamEnabled.value,
      temperature: temperature.value,
    };
    localStorage.setItem('aiChatSettings', JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
};

// Load models
const loadModels = async () => {
  try {
    models.value = await fetchModels();
    isConnected.value = true;
    
    if (models.value.length > 0 && !selectedModel.value) {
      selectedModel.value = models.value[0];
      await saveSettings();
    }
  } catch (error) {
    console.error('Failed to fetch models:', error);
    isConnected.value = false;
    showToast('Failed to connect to AI service', 'error');
  }
};

// Send message
const sendMessage = async () => {
  if ((!userInput.value.trim() && selectedImages.value.length === 0) || isSending.value) return;
  
  if (!selectedModel.value) {
    showToast('Please select a model first', 'warning');
    return;
  }

  // 🔍 调试：检查发送前的图片数据
  const sendingLogData = {
    hasImages: selectedImages.value.length > 0,
    imageCount: selectedImages.value.length,
    imageData: selectedImages.value.map(img => ({
      name: img.name,
      hasUrl: !!img.url,
      hasBase64: !!img.base64,
      urlPreview: img.url ? img.url.substring(0, 50) + '...' : 'none',
      base64Preview: img.base64 ? img.base64.substring(0, 50) + '...' : 'none'
    }))
  };
  
  logImageSending(sendingLogData);

  // 使用安全的消息创建器，包含图片信息
  const userMessage = createSafeMessage('user', userInput.value.trim(), {
    images: selectedImages.value.length > 0 ? selectedImages.value.map(img => ({
      ...img,
      // 确保使用base64数据URI作为显示URL，这样图片不会因为blob URL失效而无法显示
      url: img.base64.startsWith('data:') ? img.base64 : img.url
    })) : undefined,
    isImageMessage: selectedImages.value.length > 0
  });
  
  // 🔍 调试：检查创建的用户消息
  const userMessageLogData = {
    hasImages: !!userMessage.images,
    imageCount: userMessage.images?.length || 0,
    isImageMessage: userMessage.isImageMessage,
    messagePreview: userMessage.content.substring(0, 100)
  };
  
  logUserMessage(userMessageLogData);
  
  messages.value.push(userMessage);
  
  const currentInput = userInput.value.trim();
  const currentImages = selectedImages.value.length > 0 ? [...selectedImages.value] : [];
  
  // Clear input
  userInput.value = '';
  if (chatImageUpload.value) {
    chatImageUpload.value.clearImages();
  }
  selectedImages.value = [];
  
  isSending.value = true;
  isTyping.value = true;

  // Prepare conversation history (before adding AI message placeholder)
  const conversationHistory = messages.value
    .filter(msg => msg.content && msg.content.trim())
    .map(msg => {
      const historyMessage: any = { 
        role: msg.role, 
        content: String(msg.content) // 确保内容是字符串
      };
      
      // If it's an image message, add image data
      if (msg.isImageMessage && msg.images && msg.images.length > 0) {
        // ollama API needs pure base64 strings, not complete data URIs
        historyMessage.images = msg.images.map(img => {
          // If base64 is a complete data URI, extract the pure base64 part
          let base64Data = '';
          if (img.base64.startsWith('data:')) {
            base64Data = img.base64.split(',')[1];
          } else {
            base64Data = img.base64;
          }
          
          // 🔍 验证base64数据质量
          logDebugInfo('Image Data Validation', {
            originalFormat: img.base64.startsWith('data:') ? 'dataURI' : 'raw',
            mimeType: img.base64.startsWith('data:') ? img.base64.split(';')[0] : 'unknown',
            base64Length: base64Data.length,
            isValidBase64: /^[A-Za-z0-9+/]*={0,2}$/.test(base64Data),
            sizeEstimate: Math.round(base64Data.length * 0.75 / 1024) + 'KB'
          });
          
          return base64Data;
        });
        
        // 🔍 调试：检查API发送的图片数据
        const apiPrepareLogData = {
          originalImageCount: msg.images.length,
          apiImageCount: historyMessage.images.length,
          apiImagePreviews: historyMessage.images.map((base64, idx) => ({
            index: idx,
            wasDataURI: msg.images![idx].base64.startsWith('data:'),
            extractedLength: base64.length,
            preview: base64.substring(0, 50) + '...'
          }))
        };
        
        logApiPrepare(apiPrepareLogData);
      }
      
      return historyMessage;
    });

  // 🔍 调试：检查最终的API请求数据
  const finalLogData = {
    totalMessages: conversationHistory.length,
    messagesWithImages: conversationHistory.filter(msg => msg.images).length,
    lastMessage: conversationHistory[conversationHistory.length - 1]
  };
  
  logApiRequest(finalLogData);

  // 创建 AI 消息占位符 - 使用安全创建器
  const aiMessage = createSafeMessage('assistant', '', {
    isStreaming: streamEnabled.value
  });

  messages.value.push(aiMessage);

  try {
    abortController = new AbortController();

    // 调试：输出对话历史
    logDebugInfo('Conversation History', conversationHistory);
    logDebugInfo('Current User Input', currentInput);
    
    // 🔍 模型和配置验证
    const isVisionModel = selectedModel.value && (
      selectedModel.value.includes('llava') || 
      selectedModel.value.includes('vision') || 
      selectedModel.value.includes('minicpm-v') ||
      selectedModel.value.includes('llama3.2-vision')
    );
    
    logDebugWarning('Model Validation', {
      selectedModel: selectedModel.value,
      isVisionModel: isVisionModel,
      hasImages: conversationHistory.some(msg => msg.images && msg.images.length > 0),
      suggestion: isVisionModel ? '✅ Vision model selected' : '⚠️ Recommend using llama3.2-vision:11b or other vision models'
    });

    if (streamEnabled.value) {
      // Stream response
      await streamChat(
        selectedModel.value,
        conversationHistory,
        (chunk: any) => {
          // 🔧 超强化字符串转换 - 四重保护机制
          let safeChunk = '';
          
          try {
            // 第一重：空值检查
            if (chunk === null || chunk === undefined) {
              console.warn('⚠️ Received null/undefined chunk, skipping');
              return;
            }
            
            // 第二重：类型强制转换
            if (typeof chunk === 'string') {
              safeChunk = chunk;
            } else if (typeof chunk === 'object') {
              console.warn('🚨 CRITICAL: Chunk is object in callback:', chunk);
              
              // 尝试智能提取文本
              if (chunk.text) {
                safeChunk = String(chunk.text);
                console.log('🔧 Extracted from chunk.text');
              } else if (chunk.content) {
                safeChunk = String(chunk.content);
                console.log('🔧 Extracted from chunk.content');
              } else if (chunk.message) {
                safeChunk = String(chunk.message);
                console.log('🔧 Extracted from chunk.message');
              } else if (Array.isArray(chunk)) {
                safeChunk = chunk.map(item => String(item)).join('');
                console.log('🔧 Converted array to string');
              } else {
                // 最后手段：JSON序列化但美化
                const jsonStr = JSON.stringify(chunk, null, 0);
                // 去除外层引号和转义，让对象内容看起来像普通文本
                safeChunk = jsonStr
                  .replace(/^"|"$/g, '')
                  .replace(/\\"/g, '"')
                  .replace(/\\n/g, '\n')
                  .replace(/\\t/g, '\t');
                console.warn('🔧 Emergency object serialization applied');
              }
            } else {
              safeChunk = String(chunk);
              console.log('🔧 Basic string conversion');
            }
            
            // 第三重：内容验证和清理
            if (typeof safeChunk !== 'string') {
              console.error('💥 FATAL: Chunk still not string after conversion!');
              safeChunk = '[CHUNK_TYPE_ERROR]';
            }
            
            // 第四重：只清理真正的对象污染
            if (safeChunk.includes('[object Object]')) {
              console.warn('🚨 Cleaning object pollution from chunk');
              safeChunk = safeChunk.replace(/\[object Object\]/g, '');
            }
              
          } catch (conversionError) {
            console.error('❌ All chunk conversion methods failed:', conversionError);
            safeChunk = '[CHUNK_CONVERSION_CRITICAL_FAILURE]';
          }
          
          // 只有真正有内容才处理
          if (safeChunk && safeChunk.length > 0) {
            // 强制类型验证
            const previousContentType = typeof aiMessage.content;
            const previousLength = String(aiMessage.content).length;
            
            // 确保 aiMessage.content 也是字符串
            if (typeof aiMessage.content !== 'string') {
              console.error('🚨 CRITICAL: aiMessage.content is not string:', typeof aiMessage.content);
              aiMessage.content = String(aiMessage.content || '');
            }
            
            // 安全地追加内容
            aiMessage.content += safeChunk;
            isTyping.value = false;
            
            console.log('📥 Chunk processed successfully:', {
              originalChunkType: typeof chunk,
              finalChunkType: typeof safeChunk,
              chunkLength: safeChunk.length,
              previousContentType: previousContentType,
              previousLength: previousLength,
              newTotalLength: aiMessage.content.length,
              contentSample: safeChunk.substring(0, 50) + '...'
            });
            
            // 最终验证：确保总内容是字符串
            if (typeof aiMessage.content !== 'string') {
              console.error('💥 FATAL: Final content is not string, emergency fix!');
              aiMessage.content = String(aiMessage.content);
            }
            
            // 更新响应式状态
            const lastIndex = messages.value.length - 1;
            if (lastIndex >= 0 && messages.value[lastIndex].role === 'assistant') {
              // 确保更新的内容也是字符串
              const finalContent = String(aiMessage.content);
              messages.value[lastIndex] = { ...messages.value[lastIndex], content: finalContent };
            }
          }
        },
        chatMode.value,
        { temperature: temperature.value }
      );
      
      logDebugInfo('Stream Response Complete', { 
        finalContentLength: aiMessage.content.length,
        contentPreview: aiMessage.content.substring(0, 100) + '...'
      });
    } else {
      // 非流式响应 - 强化字符串转换
      isTyping.value = true;
      const response = await chat(
        selectedModel.value,
        conversationHistory,
        chatMode.value,
        { temperature: temperature.value }
      );
      
      // 🔧 超强化非流式响应转换
      try {
        console.log('📨 Processing non-stream response:', {
          type: typeof response,
          value: response,
          isNull: response === null,
          isUndefined: response === undefined
        });
        
        let safeResponse = '';
        
        // 第一层：空值处理
        if (response === null || response === undefined) {
          safeResponse = 'Sorry, I received an empty response. Please try again.';
        }
        // 第二层：字符串处理
        else if (typeof response === 'string') {
          safeResponse = response;
        }
        // 第三层：对象智能提取
        else if (typeof response === 'object') {
          console.warn('🚨 Non-stream response is object, applying smart extraction:', response);
          
          const responseObj = response as any; // 类型断言以避免TypeScript错误
          
          // 尝试提取有意义的文本
          if (responseObj.text) {
            safeResponse = String(responseObj.text);
            console.log('🔧 Extracted from response.text');
          } else if (responseObj.content) {
            safeResponse = String(responseObj.content);
            console.log('🔧 Extracted from response.content');
          } else if (responseObj.message) {
            safeResponse = String(responseObj.message);
            console.log('🔧 Extracted from response.message');
          } else if (responseObj.response) {
            safeResponse = String(responseObj.response);
            console.log('🔧 Extracted from response.response');
          } else if (Array.isArray(responseObj)) {
            safeResponse = responseObj.map((item: any) => String(item)).join('\n');
            console.log('🔧 Converted array response to string');
          } else {
            // 美化JSON显示
            const jsonStr = JSON.stringify(responseObj, null, 2);
            safeResponse = `Response received as structured data:\n\n${jsonStr}`;
            console.warn('🔧 Object response converted to readable format');
          }
        }
        // 第四层：其他类型强制转换
        else {
          safeResponse = String(response);
          console.log('🔧 Basic type conversion for response:', typeof response);
        }
        
        // 第五层：验证和清理
        if (typeof safeResponse !== 'string') {
          console.error('💥 CRITICAL: Response is still not string after conversion!');
          safeResponse = '[NON_STREAM_RESPONSE_TYPE_ERROR]';
        }
        
        // 清理对象污染
        safeResponse = safeResponse
          .replace(/\[object Object\]/g, '[Response Object Error]')
          .replace(/\[STREAM_OBJECT_CLEANED\]/g, '')
          .replace(/\[OBJECT_CLEANED\]/g, '');
        
        // 确保有内容
        if (!safeResponse || safeResponse.trim() === '') {
          safeResponse = 'I received an empty response. Please try asking again.';
        }
        
        // 最终安全赋值
        aiMessage.content = String(safeResponse);
        
        logDebugInfo('Non-Stream Response Processing Complete', {
          originalType: typeof response,
          finalLength: aiMessage.content.length,
          preview: aiMessage.content.substring(0, 100) + '...'
        });
        
      } catch (conversionError) {
        console.error('❌ Non-stream response conversion completely failed:', conversionError);
        aiMessage.content = '[NON_STREAM_CONVERSION_FAILED]';
      }
      
      isTyping.value = false;
    }

    // 最终内容验证和修复
    if (!aiMessage.content.trim()) {
      aiMessage.content = 'Sorry, I didn\'t receive any response. Please try again.';
    } else {
      // 检查最终内容的完整性
      if (aiMessage.content.includes('[object Object]')) {
        console.error('🚨 FINAL CHECK: Object corruption detected in final message!', {
          contentLength: aiMessage.content.length,
          preview: aiMessage.content.substring(0, 200)
        });
        
        // 尝试最后的修复
        try {
          aiMessage.content = aiMessage.content.replace(/\[object Object\]/g, '\n<!-- Content corrupted during transmission -->\n');
          console.log('🔧 Applied emergency content repair');
        } catch (e) {
          console.error('❌ Emergency repair failed:', e);
        }
      }
      
      console.log('✅ Final message verification:', {
        length: aiMessage.content.length,
        hasError: aiMessage.content.includes('[object Object]'),
        preview: aiMessage.content.substring(0, 100)
      });
    }

  } catch (error: any) {
    logDebugError('Chat Error', { 
      errorName: error.name,
      errorMessage: error.message,
      isAbortError: error.name === 'AbortError'
    });
    
    // 🔍 图片识别问题诊断
    if (currentImages.length > 0) {
      logDebugWarning('Image Recognition Issue Diagnosis', {
        possibleCauses: [
          '1. Model may not support vision features',
          '2. Image format or size issues',
          '3. Network connection problems',
          '4. API configuration errors'
        ],
        suggestions: [
          '• Ensure using llama3.2-vision:11b or other vision models',
          '• Try uploading smaller PNG/JPEG images',
          '• Check network connection status',
          '• Restart ollama service'
        ]
      });
    }
    
    console.error('Chat error:', error);
    isTyping.value = false;
    
    if (error.name === 'AbortError') {
      aiMessage.content = 'Response was cancelled.';
    } else {
      aiMessage.content = 'Sorry, I encountered an error. Please check your connection and try again.';
      showToast('Failed to get AI response', 'error');
    }
  } finally {
    aiMessage.isStreaming = false;
    isSending.value = false;
    isTyping.value = false;
    abortController = null;
    
    // 确保 UI 更新
    messages.value = [...messages.value];
    await nextTick();
    scrollToBottom();
  }
};

// 停止生成
const stopGeneration = () => {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  isSending.value = false;
  isTyping.value = false;
  
  // 停止当前流式消息
  const lastMessage = messages.value[messages.value.length - 1];
  if (lastMessage && lastMessage.isStreaming) {
    lastMessage.isStreaming = false;
    if (!lastMessage.content.trim()) {
      lastMessage.content = 'Response was cancelled.';
    }
  }
};

// 换行
const newLine = () => {
  userInput.value += '\n';
};

// 清空聊天
const clearChat = async () => {
  messages.value = [];
  showToast('Chat cleared', 'success');
};

// 打开 API 设置
const openApiSettings = () => {
  showSettings.value = false;
  router.push('/aisetting');
};

// 处理模板选择
const handleTemplateSelect = (template: any) => {
  // 确保模板内容是纯文本字符串
  let content = '';
  
  if (!template) {
    showToast('Invalid template', 'error');
    return;
  }
  
  if (template.content !== null && template.content !== undefined) {
    if (typeof template.content === 'object') {
      // 如果是对象，尝试JSON序列化（这通常表示数据损坏）
      try {
        content = JSON.stringify(template.content, null, 2);
        console.warn('⚠️ Template content was an object, converted to JSON:', template);
      } catch (e) {
        content = '[Invalid Template Content - Please recreate this template]';
        console.error('❌ Failed to serialize template object:', e);
      }
    } else {
      content = String(template.content);
    }
  }
  
  // 只清理不需要的HTML实体，保留Markdown格式
  content = content
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
  
  // 移除可能的HTML标签（除了think标签，因为这是我们的特殊标记）
  content = content.replace(/<(?!\/?(think))[^>]*>/g, '');
  
  if (!content) {
    showToast('Template content is empty', 'warning');
    return;
  }
  
  userInput.value = content;
  showTemplates.value = false;
  showToast(`Template "${template.title || 'Unnamed'}" applied`, 'success');
  
  console.log('✅ Applied template:', {
    title: template.title,
    contentLength: content.length,
    preview: content.substring(0, 100) + '...'
  });
};

// 处理think内容
const handleThinkContent = (message: ChatMessage, thinkContent: string) => {
  if (thinkContent && !message.thinkContent) {
    message.thinkContent = thinkContent;
    // 触发响应式更新
    messages.value = [...messages.value];
  }
};

// 格式化时间
const formatTime = (date: Date) => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// 滚动到底部
const scrollToBottom = async () => {
  await nextTick();
  if (contentRef.value) {
    contentRef.value.$el.scrollToBottom(300);
  }
};

// 图像生成相关处理函数
const onImageSettingsSaved = () => {
  showToast('Image generation settings saved', 'success');
};

const onImageSettingsError = (error: string) => {
  showToast(`Settings error: ${error}`, 'error');
};

const onImageTestSuccess = (result: any) => {
  showToast('Image generation test successful', 'success');
  console.log('Image test result:', result);
};

const onImageTestError = (error: string) => {
  showToast(`Test failed: ${error}`, 'error');
};

const onImageGenerated = (result: any) => {
  console.log('Image generated:', result);
  showToast('Image generated successfully', 'success');
};

const onSendImageToChat = (imageUrl: string, prompt: string) => {
  // 创建包含图像的消息
  const imageMessage = createSafeMessage('user', `![Generated Image](${imageUrl})\n\n**Prompt:** ${prompt}`);
  messages.value.push(imageMessage);
  
  // 关闭图像生成界面
  showImageGeneration.value = false;
  showImageGenerationSettings.value = false;
  
  showToast('Image sent to chat', 'success');
  
  // 自动滚动到底部
  nextTick(() => scrollToBottom());
};

// 图像生成模式切换
const onImageGenerationModeChange = () => {
  showToast(`Switched to ${imageGenerationMode.value === 'cloud' ? 'Cloud AI' : 'Local'} generation`, 'success');
};

// 本地图像生成事件处理
const onLocalImageSettingsSaved = () => {
  showToast('Local image settings saved', 'success');
};

const onLocalImageSettingsError = (error: string) => {
  showToast(`Settings error: ${error}`, 'error');
};

const onLocalImageTestSuccess = (result: any) => {
  console.log('Local image test successful:', result);
  showToast('Local image generation test successful', 'success');
};

const onLocalImageTestError = (error: string) => {
  showToast(`Local test failed: ${error}`, 'error');
};

const onLocalImageGenerated = (result: any) => {
  console.log('Local image generated:', result);
  showToast('Local image generated successfully', 'success');
};

// 图像识别事件处理
const onImageRecognitionSettingsSaved = () => {
  showToast('Image recognition settings saved', 'success');
};

const onImageRecognitionSettingsError = (error: string) => {
  showToast(`Settings error: ${error}`, 'error');
};

const onImageRecognitionTestResult = (result: any) => {
  if (result.success) {
    showToast('Image recognition test successful', 'success');
  } else {
    showToast('Image recognition test failed', 'error');
  }
  console.log('Image recognition test result:', result);
};

const onImageAnalyzed = (result: any) => {
  console.log('Image analyzed:', result);
  if (result.success) {
    showToast('Image analyzed successfully', 'success');
  } else {
    showToast(`Image analysis failed: ${result.error}`, 'error');
  }
};

const onSendRecognitionToChat = (content: string) => {
  // 创建包含图像识别结果的消息
  const recognitionMessage = createSafeMessage('user', content);
  messages.value.push(recognitionMessage);
  
  // 关闭图像识别界面
  showImageRecognition.value = false;
  showImageRecognitionSettings.value = false;
  
  showToast('Image analysis sent to chat', 'success');
  
  // 自动滚动到底部
  nextTick(() => scrollToBottom());
};

// 聊天图片处理函数
const handleImagesSelected = (images: ImageFile[]) => {
  const logData = {
    count: images.length,
    images: images.map(img => ({
      name: img.name,
      size: img.size,
      hasUrl: !!img.url,
      hasBase64: !!img.base64,
      urlType: img.url ? (img.url.startsWith('blob:') ? 'blob' : 'other') : 'none',
      base64Type: img.base64 ? (img.base64.startsWith('data:') ? 'dataURI' : 'raw') : 'none'
    }))
  };
  
  logImageSelected(logData);
  selectedImages.value = images;
};

const handleImageUploadError = (error: string) => {
  showToast(`图片上传错误: ${error}`, 'error');
};

const debugLogger = ref<InstanceType<typeof DebugLogger>>();

// 测试调试器功能
const testDebugger = () => {
  // 这里直接调用debugLogger，因为这是测试函数，只有在调试模式开启时才会被调用
  debugLogger.value?.logInfo('Debugger Test', { message: 'This is a test log', timestamp: new Date() });
  debugLogger.value?.logWarning('Warning Test', { warning: 'This is a warning log' });
  debugLogger.value?.logError('Error Test', { error: 'This is an error log' });
  
  // Add keyboard adaptation feature test
  debugLogger.value?.logInfo('Keyboard Adaptation Status', {
    keyboardHeight: keyboardHeight.value,
    inputFocused: inputFocused.value,
    isCapacitorAvailable: !!(window as any).Capacitor,
    platform: (window as any).Capacitor?.getPlatform?.() || 'web',
    description: 'Keyboard adaptation feature is enabled, works best on mobile devices'
  });
};

// 调试日志包装函数
const logDebugInfo = (message: string, data?: any) => {
  if (debugMode.value) {
    debugLogger.value?.logInfo(message, data);
  }
};

const logDebugWarning = (message: string, data?: any) => {
  if (debugMode.value) {
    debugLogger.value?.logWarning(message, data);
  }
};

const logDebugError = (message: string, data?: any) => {
  if (debugMode.value) {
    debugLogger.value?.logError(message, data);
  }
};

const logImageSending = (data: any) => {
  if (debugMode.value) {
    debugLogger.value?.logImageSending(data);
  }
};

const logUserMessage = (data: any) => {
  if (debugMode.value) {
    debugLogger.value?.logUserMessage(data);
  }
};

const logApiPrepare = (data: any) => {
  if (debugMode.value) {
    debugLogger.value?.logApiPrepare(data);
  }
};

const logApiRequest = (data: any) => {
  if (debugMode.value) {
    debugLogger.value?.logApiRequest(data);
  }
};

const logImageSelected = (data: any) => {
  if (debugMode.value) {
    debugLogger.value?.logImageSelected(data);
  }
};

// 切换调试模式
const toggleDebugMode = () => {
  showDebugModal.value = true;
};

// 开启调试模式
const enableDebugMode = () => {
  debugMode.value = true;
  showToast('Debug mode enabled', 'success');
  // 立即显示调试面板并运行测试
  nextTick(() => {
    debugLogger.value?.show();
    testDebugger();
  });
};

// 关闭调试模式
const disableDebugMode = () => {
  debugMode.value = false;
  showToast('Debug mode disabled', 'success');
  debugLogger.value?.hide();
};

// 输入焦点事件
const onInputFocus = () => {
  inputFocused.value = true;
  logDebugInfo('Input Focus Gained', {
    timestamp: new Date().toISOString(),
    keyboardHeight: keyboardHeight.value
  });
  
  // 延迟滚动确保键盘完全显示
  nextTick(() => {
    setTimeout(() => scrollToBottom(), 500);
  });
};

// 输入失去焦点事件  
const onInputBlur = () => {
  inputFocused.value = false;
  logDebugInfo('Input Focus Lost', {
    timestamp: new Date().toISOString()
  });
};
</script>

<style scoped>
/* 基础布局 */
.chat-content {
  --padding-top: 8px;
  --padding-bottom: 120px;
  --background: var(--ion-color-step-50, #f8f9fa);
  padding-bottom: calc(120px + var(--content-bottom, 0px));
  transition: padding-bottom 0.3s ease;
}

.chat-container {
  padding: 16px;
  min-height: 100%;
}

/* 连接状态横幅 */
.connection-banner {
  position: sticky;
  top: 0;
  z-index: 10;
  padding: 8px 16px;
  background: var(--ion-background-color);
  border-bottom: 1px solid var(--ion-color-step-100);
  display: flex;
  justify-content: center;
}

/* 欢迎消息 */
.welcome-message {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  text-align: center;
}

.welcome-card {
  background: var(--ion-background-color);
  border-radius: 16px;
  padding: 32px 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  max-width: 300px;
}

.welcome-icon {
  font-size: 48px;
  color: var(--ion-color-primary);
  margin-bottom: 16px;
}

.welcome-card h2 {
  margin: 0 0 8px 0;
  color: var(--ion-color-primary);
  font-size: 20px;
  font-weight: 600;
}

.welcome-card p {
  margin: 0;
  color: var(--ion-color-medium);
  font-size: 14px;
  line-height: 1.4;
}

.user-guide-button {
  margin-top: 16px;
  --border-width: 2px;
  --border-color: var(--ion-color-primary);
  --color: var(--ion-color-primary);
  --background: transparent;
  transition: all 0.3s ease;
}

.user-guide-button:hover {
  --background: var(--ion-color-primary);
  --color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(var(--ion-color-primary-rgb), 0.3);
}

/* 消息样式 */
.message-group {
  margin-bottom: 16px;
}

.message-wrapper {
  margin-bottom: 8px;
  display: flex;
  flex-direction: column;
  animation: fadeInUp 0.3s ease-out;
}

.message-wrapper:last-child {
  margin-bottom: 0;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.user-message {
  align-items: flex-end;
}

.ai-message {
  align-items: flex-start;
}

.think-message {
  align-items: flex-start;
  opacity: 0.9;
  transform: scale(0.95);
}

.message-bubble {
  max-width: 85%;
  border-radius: 20px;
  padding: 12px 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  transition: all 0.2s ease;
}

.user-message .message-bubble {
  background: linear-gradient(135deg, var(--ion-color-primary) 0%, var(--ion-color-primary-shade) 100%);
  color: white;
  border-bottom-right-radius: 6px;
}

.ai-message .message-bubble {
  background: var(--ion-background-color);
  color: var(--ion-text-color);
  border-bottom-left-radius: 6px;
  border: 1px solid var(--ion-color-step-100);
}

.think-bubble {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 2px dashed var(--ion-color-warning);
  border-radius: 16px;
  position: relative;
  box-shadow: 0 2px 12px rgba(251, 191, 36, 0.15);
}

.think-bubble::before {
  content: '';
  position: absolute;
  top: -8px;
  left: 20px;
  width: 16px;
  height: 16px;
  background: var(--ion-color-warning);
  border-radius: 50%;
  opacity: 0.6;
  animation: thinkPulse 2s infinite;
}

.think-bubble::after {
  content: '';
  position: absolute;
  top: -4px;
  left: 40px;
  width: 8px;
  height: 8px;
  background: var(--ion-color-warning);
  border-radius: 50%;
  opacity: 0.4;
  animation: thinkPulse 2s infinite 0.3s;
}

@keyframes thinkPulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.8;
  }
}

.streaming .message-bubble {
  background: linear-gradient(90deg, var(--ion-background-color) 0%, var(--ion-color-step-50) 50%, var(--ion-background-color) 100%);
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.message-header {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  gap: 8px;
}

.message-avatar {
  width: 24px;
  height: 24px;
  background: var(--ion-color-step-100);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-icon {
  font-size: 14px;
  color: var(--ion-color-medium);
}

.user-message .avatar-icon {
  color: white;
}

.think-avatar {
  background: linear-gradient(135deg, var(--ion-color-warning) 0%, var(--ion-color-warning-shade) 100%);
}

.think-avatar .avatar-icon {
  color: white;
  animation: thinkSpin 3s infinite linear;
}

@keyframes thinkSpin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.think-content {
  color: var(--ion-color-warning-shade);
  font-style: italic;
  opacity: 0.85;
}

.message-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.message-sender {
  font-weight: 600;
  font-size: 12px;
  opacity: 0.9;
}

.message-time {
  font-size: 10px;
  opacity: 0.6;
}

.streaming-indicator {
  color: var(--ion-color-primary);
}

.message-content {
  line-height: 1.5;
  word-wrap: break-word;
}

.user-content {
  white-space: pre-wrap;
}

/* 消息中的图片样式 */
.message-images {
  margin-bottom: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.message-image-item {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.1);
  max-width: 200px;
  transition: transform 0.2s ease;
}

.message-image-item:hover {
  transform: scale(1.02);
  z-index: 10;
}

.message-image {
  width: 100%;
  height: auto;
  max-height: 150px;
  object-fit: cover;
  display: block;
  border-radius: 8px;
}

.message-text {
  margin-top: 8px;
}

.ai-content {
  /* AI内容由MarkdownRenderer组件处理样式 */
}

.streaming-placeholder {
  opacity: 0.6;
}

.empty-response {
  font-style: italic;
  opacity: 0.6;
}

/* 输入指示器 */
.typing-indicator {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 16px;
}

.typing-bubble {
  background: var(--ion-color-step-100);
  border-radius: 20px;
  padding: 12px 16px;
  border-bottom-left-radius: 6px;
}

.typing-dots {
  display: flex;
  gap: 4px;
}

.typing-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--ion-color-medium);
  animation: typing 1.4s infinite;
}

.typing-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-10px);
    opacity: 1;
  }
}

/* 输入区域 */
.chat-input-container {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--ion-background-color);
  padding: 16px;
  border-top: 1px solid var(--ion-color-step-150);
  backdrop-filter: blur(20px);
  z-index: 999;
  transition: transform 0.3s ease;
}

.input-card {
  margin: 0;
  border-radius: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--ion-color-step-100);
}

.input-content {
  padding: 12px 16px 8px 16px;
}

.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.template-button {
  --padding-start: 6px;
  --padding-end: 6px;
  height: 32px;
  width: 32px;
  --border-radius: 50%;
  margin-bottom: 4px;
  flex-shrink: 0;
  --color: #f39c12;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  --background: linear-gradient(135deg, rgba(243, 156, 18, 0.1) 0%, rgba(245, 166, 35, 0.1) 100%);
  position: relative;
  overflow: hidden;
}

.template-button:hover {
  --color: #e67e22;
  transform: scale(1.1) rotate(10deg);
  --background: linear-gradient(135deg, rgba(243, 156, 18, 0.2) 0%, rgba(245, 166, 35, 0.2) 100%);
  box-shadow: 0 4px 12px rgba(243, 156, 18, 0.3);
}

.template-button::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 193, 7, 0.3) 0%, transparent 70%);
  transition: all 0.3s ease;
  transform: translate(-50%, -50%);
  z-index: -1;
}

.template-button:hover::before {
  width: 40px;
  height: 40px;
}

.image-gen-button {
  --padding-start: 6px;
  --padding-end: 6px;
  height: 32px;
  width: 32px;
  --border-radius: 50%;
  margin-bottom: 4px;
  flex-shrink: 0;
  --color: #667eea;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  --background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(90, 103, 216, 0.1) 100%);
  position: relative;
  overflow: hidden;
  margin-left: 4px;
}

.image-gen-button:hover {
  --color: #5a67d8;
  transform: scale(1.1) rotate(-5deg);
  --background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(90, 103, 216, 0.2) 100%);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.image-gen-button::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(102, 126, 234, 0.3) 0%, transparent 70%);
  transition: all 0.3s ease;
  transform: translate(-50%, -50%);
  z-index: -1;
}

.image-gen-button:hover::before {
  width: 40px;
  height: 40px;
}

.image-recognition-button {
  --padding-start: 6px;
  --padding-end: 6px;
  height: 32px;
  width: 32px;
  --border-radius: 50%;
  margin-bottom: 4px;
  flex-shrink: 0;
  --color: #48bb78;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  --background: linear-gradient(135deg, rgba(72, 187, 120, 0.1) 0%, rgba(56, 178, 172, 0.1) 100%);
  position: relative;
  overflow: hidden;
  margin-left: 4px;
}

.image-recognition-button:hover {
  --color: #38a169;
  transform: scale(1.1) rotate(5deg);
  --background: linear-gradient(135deg, rgba(72, 187, 120, 0.2) 0%, rgba(56, 178, 172, 0.2) 100%);
  box-shadow: 0 4px 12px rgba(72, 187, 120, 0.3);
}

.image-recognition-button::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(72, 187, 120, 0.3) 0%, transparent 70%);
  transition: all 0.3s ease;
  transform: translate(-50%, -50%);
  z-index: -1;
}

.image-recognition-button:hover::before {
  width: 40px;
  height: 40px;
}

.message-input {
  flex: 1;
  --padding-start: 0;
  --padding-end: 0;
  --padding-top: 8px;
  --padding-bottom: 8px;
  font-size: 16px;
  line-height: 1.4;
  max-height: 300px;
  overflow-y: auto;
  resize: vertical;
}

.input-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.send-button, .stop-button {
  --padding-start: 8px;
  --padding-end: 8px;
  height: 40px;
  width: 40px;
  --border-radius: 50%;
}

.send-button {
  --color: var(--ion-color-primary);
}

.send-button:disabled {
  --color: var(--ion-color-medium);
}

.stop-button {
  --color: var(--ion-color-danger);
}

.input-hint {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  font-size: 11px;
  color: var(--ion-color-medium);
}

.char-count {
  font-weight: 500;
  color: var(--ion-color-primary);
}

.char-count::after {
  content: '';
  display: inline-block;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--ion-color-primary);
  margin-left: 8px;
  margin-right: 8px;
  opacity: 0.6;
  vertical-align: middle;
}

.keyboard-hint {
  opacity: 0.7;
}

.long-text-hint {
  color: var(--ion-color-success-tint);
  font-weight: 500;
  font-size: 10px;
  background: var(--ion-color-success-tint);
  padding: 2px 6px;
  border-radius: 10px;
  border: 1px solid var(--ion-color-success);
  animation: pulse-hint 2s infinite;
}

@keyframes pulse-hint {
  0%, 100% {
    opacity: 0.8;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.02);
  }
}

/* 设置样式 */
.setting-item {
  margin-bottom: 16px;
  --padding-start: 0;
  --padding-end: 0;
}

.setting-item h3 {
  font-weight: 600;
  margin-bottom: 4px;
  color: var(--ion-color-primary);
}

.setting-item p {
  color: var(--ion-color-medium);
  font-size: 14px;
  margin: 0;
}

.temperature-range {
  margin-top: 8px;
  padding: 0 16px;
}

/* 悬浮按钮 */
ion-fab-button {
  --background: var(--ion-color-step-100);
  --color: var(--ion-color-medium);
  --box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .message-bubble {
    max-width: 90%;
  }
  
  .think-message {
    transform: scale(0.98);
  }
  
  .think-bubble::before {
    left: 16px;
    width: 12px;
    height: 12px;
  }
  
  .think-bubble::after {
    left: 32px;
    width: 6px;
    height: 6px;
  }
  
  .chat-container {
    padding: 12px;
  }
  
  .chat-input-container {
    padding: 12px;
  }
  
  .message-input {
    max-height: 200px;
  }

  .welcome-card {
    margin: 0 16px;
    padding: 24px 20px;
  }
  
  .user-guide-button {
    margin-top: 16px;
  }
}

/* 图像生成样式 */
.generation-mode-segment {
  --background: var(--ion-color-step-50);
  margin: 8px 16px;
  border-radius: 12px;
  background: var(--ion-color-step-50);
}

.generation-mode-segment ion-segment-button {
  --color: var(--ion-color-medium);
  --color-checked: var(--ion-color-primary);
  --background-checked: var(--ion-background-color);
  --border-radius: 8px;
  margin: 4px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.generation-mode-segment ion-segment-button:hover {
  transform: translateY(-1px);
}

.generation-mode-segment ion-segment-button.segment-button-checked {
  box-shadow: 0 2px 8px rgba(var(--ion-color-primary-rgb), 0.3);
}

.settings-panel, .generation-panel, .recognition-panel {
  max-width: 100%;
  margin: 0 auto;
}

.settings-panel {
  animation: fadeInLeft 0.3s ease-out;
}

.generation-panel {
  animation: fadeInRight 0.3s ease-out;
}

.recognition-panel {
  animation: fadeInUp 0.3s ease-out;
}

.recognition-description {
  text-align: center;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: var(--ion-color-step-50);
  border-radius: 12px;
  border: 1px solid var(--ion-color-step-150);
}

.recognition-description h3 {
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: var(--ion-color-primary);
  font-size: 1.2rem;
}

.recognition-description p {
  margin: 0;
  color: var(--ion-color-medium);
  font-size: 0.9rem;
  line-height: 1.4;
}

@keyframes fadeInLeft {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes fadeInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 图像生成按钮样式 */
ion-button[aria-label="Image Generation"] {
  --color: #667eea;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

ion-button[aria-label="Image Generation"]:hover {
  --color: #5a67d8;
  transform: scale(1.05);
}

ion-button[aria-label="Image Generation"]::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(102, 126, 234, 0.2) 0%, transparent 70%);
  transition: all 0.3s ease;
  transform: translate(-50%, -50%);
  z-index: -1;
}

ion-button[aria-label="Image Generation"]:hover::before {
  width: 40px;
  height: 40px;
}

/* 暗色主题适配 */
@media (prefers-color-scheme: dark) {
  .message-bubble {
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  }
  
  .ai-message .message-bubble {
    background: var(--ion-color-step-100);
    border-color: var(--ion-color-step-200);
  }
  
  .think-bubble {
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
    border-color: var(--ion-color-warning);
    box-shadow: 0 2px 12px rgba(251, 191, 36, 0.25);
  }
  
  .think-content {
    color: var(--ion-color-warning-tint);
  }
  
  .welcome-card {
    background: var(--ion-color-step-100);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }
  
  .template-button {
    --color: #ffa726;
    --background: linear-gradient(135deg, rgba(255, 167, 38, 0.15) 0%, rgba(255, 183, 77, 0.15) 100%);
  }
  
  .template-button:hover {
    --color: #ff9800;
    --background: linear-gradient(135deg, rgba(255, 167, 38, 0.25) 0%, rgba(255, 183, 77, 0.25) 100%);
    box-shadow: 0 4px 12px rgba(255, 167, 38, 0.4);
  }
  
  .template-button::before {
    background: radial-gradient(circle, rgba(255, 193, 7, 0.4) 0%, transparent 70%);
  }
  
  .image-gen-button {
    --color: #818cf8;
    --background: linear-gradient(135deg, rgba(129, 140, 248, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%);
  }
  
  .image-gen-button:hover {
    --color: #6366f1;
    --background: linear-gradient(135deg, rgba(129, 140, 248, 0.25) 0%, rgba(99, 102, 241, 0.25) 100%);
    box-shadow: 0 4px 12px rgba(129, 140, 248, 0.4);
  }
  
  .image-gen-button::before {
    background: radial-gradient(circle, rgba(129, 140, 248, 0.4) 0%, transparent 70%);
  }
  
  .image-recognition-button {
    --color: #68d391;
    --background: linear-gradient(135deg, rgba(104, 211, 145, 0.15) 0%, rgba(56, 178, 172, 0.15) 100%);
  }
  
  .image-recognition-button:hover {
    --color: #48bb78;
    --background: linear-gradient(135deg, rgba(104, 211, 145, 0.25) 0%, rgba(56, 178, 172, 0.25) 100%);
    box-shadow: 0 4px 12px rgba(104, 211, 145, 0.4);
  }
  
  .image-recognition-button::before {
    background: radial-gradient(circle, rgba(104, 211, 145, 0.4) 0%, transparent 70%);
  }
  
  .long-text-hint {
    color: var(--ion-color-success-tint);
    background: var(--ion-color-success-shade);
    border-color: var(--ion-color-success-tint);
  }
}

/* 移动端键盘适应增强优化 */
@media (max-width: 768px) {
  .chat-content {
    --padding-bottom: 140px;
  }
  
  .chat-input-container {
    will-change: transform;
  }
  
  .input-card {
    border-radius: 20px;
  }
  
  .message-input {
    font-size: 16px; /* 防止iOS自动缩放 */
  }
}

/* iOS安全区域适配 */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .chat-input-container {
    padding-bottom: calc(16px + env(safe-area-inset-bottom));
  }
}

/* 高DPI设备优化 */
@media (-webkit-min-device-pixel-ratio: 2) {
  .chat-input-container {
    border-top: 0.5px solid var(--ion-color-step-150);
  }
}

/* 调试模态框样式 */
.debug-controls {
  padding: 12px;
  width: 100%;
}

.debug-toggle-item {
  --padding-start: 0;
  --padding-end: 0;
  margin-bottom: 12px;
}

.debug-toggle-item ion-icon {
  font-size: 20px;
  color: var(--ion-color-medium);
  transition: all 0.3s ease;
}

.debug-toggle-item ion-icon.debug-active {
  color: var(--ion-color-success);
  animation: debugPulse 2s infinite;
}

@keyframes debugPulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
}

.debug-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
  padding-left: 36px;
}

.debug-info, .debug-active-info {
  animation: fadeInUp 0.3s ease-out;
}

.info-card, .active-card {
  background: var(--ion-color-step-50);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid var(--ion-color-step-150);
  text-align: center;
}

.info-icon, .success-icon {
  font-size: 48px;
  margin-bottom: 16px;
  display: block;
}

.info-card h3, .active-card h3 {
  margin: 0 0 12px 0;
  color: var(--ion-color-primary);
  font-size: 18px;
  font-weight: 600;
}

.info-card p, .active-card p {
  margin: 12px 0;
  color: var(--ion-color-step-600);
  line-height: 1.5;
}

.info-card ul, .active-card ul {
  text-align: left;
  margin: 16px 0;
  padding-left: 0;
  list-style: none;
}

.info-card li, .active-card li {
  padding: 4px 0;
  color: var(--ion-color-step-600);
}

.performance-note {
  background: var(--ion-color-warning-tint);
  border: 1px solid var(--ion-color-warning);
  border-radius: 8px;
  padding: 12px;
  margin-top: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.performance-note ion-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.debug-stats {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 16px;
}

.debug-stats ion-chip {
  --background: var(--ion-color-step-100);
}

/* 暗色主题适配 */
@media (prefers-color-scheme: dark) {
  .info-card, .active-card {
    background: var(--ion-color-step-100);
    border-color: var(--ion-color-step-200);
  }
  
  .performance-note {
    background: rgba(var(--ion-color-warning-rgb), 0.1);
    border-color: var(--ion-color-warning-tint);
  }
}
</style> 