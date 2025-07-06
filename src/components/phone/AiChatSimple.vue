<template>
  <ion-page>
    <!-- Sidebar Menu -->
    <ion-menu side="start" menuId="chat-history-menu" content-id="main-content">
      <ion-header>
        <ion-toolbar>
          <ion-buttons slot="start">
            <ion-button @click="toggleEditMode" fill="clear" v-if="conversationHistory.length > 0">
              <ion-icon :icon="isEditMode ? checkmarkOutline : createOutline"></ion-icon>
            </ion-button>
          
          </ion-buttons>
          <ion-title>{{ $t('Chat History') || 'Chat History' }}</ion-title>
          <ion-buttons slot="end">
         
            <ion-button @click="createNewChat" fill="clear">
              <ion-icon :icon="addOutline"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="menu-content">
        <div class="conversation-list-container">
          <ion-list class="conversation-list">
            <ion-item-sliding 
              v-for="(conversation, index) in conversationHistory" 
              :key="conversation.id"
              :disabled="isEditMode"
            >
              <ion-item 
                button 
                @click="!isEditMode && loadConversation(conversation.id)"
                :class="{ 
                  'active-conversation': currentConversationId === conversation.id,
                  'edit-mode': isEditMode 
                }"
              >
                <ion-checkbox 
                  v-if="isEditMode" 
                  slot="start" 
                  :checked="selectedConversations.includes(conversation.id)"
                  @ionChange="toggleConversationSelection(conversation.id)"
                  class="conversation-checkbox"
                ></ion-checkbox>
                
                <div class="conversation-item">
                  <div class="conversation-main">
                    <h3 class="conversation-title">{{ conversation.title }}</h3>
                    <p class="conversation-preview">{{ conversation.lastMessage }}</p>
                    <div class="conversation-meta">
                      <span class="conversation-time">{{ formatDate(conversation.updatedAt) }}</span>
                      <span v-if="conversation.model" class="conversation-model">{{ conversation.model }}</span>
                    </div>
                  </div>
                  
                  <ion-button 
                    v-if="!isEditMode"
                    fill="clear" 
                    size="small" 
                    color="medium"
                    @click.stop="deleteConversation(conversation.id)"
                    class="delete-button"
                  >
                    <ion-icon :icon="trashOutline"></ion-icon>
                  </ion-button>
                </div>
              </ion-item>
              
              <!-- 滑动删除选项保留为备用 -->
              <ion-item-options side="end" v-if="!isEditMode">
                <ion-item-option color="danger" @click="deleteConversation(conversation.id)">
                  <ion-icon :icon="trashOutline"></ion-icon>
                </ion-item-option>
              </ion-item-options>
            </ion-item-sliding>
          </ion-list>
          
          <!-- Empty state for no conversations -->
          <div v-if="conversationHistory.length === 0" class="empty-history">
            <ion-icon :icon="chatbubbleOutline" class="empty-icon"></ion-icon>
            <p>{{ $t('No conversations yet') || 'No conversations yet' }}</p>
            <p class="empty-hint">{{ $t('Start a new chat to begin') || 'Start a new chat to begin' }}</p>
          </div>
        </div>
        
        <!-- 批量删除工具栏 -->
        <div v-if="isEditMode" class="bulk-actions">
          <ion-button 
            expand="block" 
            color="danger" 
            fill="outline"
            @click="deleteSelectedConversations"
            :disabled="selectedConversations.length === 0"
          >
            <ion-icon :icon="trashOutline" slot="start"></ion-icon>
            {{ $t('Delete Selected') || 'Delete Selected' }} ({{ selectedConversations.length }})
          </ion-button>
        </div>
      </ion-content>
    </ion-menu>

    <div id="main-content">
      <ion-header :translucent="true" class="ion-no-border">
        <ion-toolbar class="liquid-toolbar">
          <ion-buttons slot="start">
            <ion-button @click="openMenu" fill="clear">
              <ion-icon :icon="menuOutline"></ion-icon>
            </ion-button>
          </ion-buttons>
          <ion-title>
            <div class="title-content">
              <span class="main-title">Gun AI</span>
              <span v-if="selectedModel" class="model-name">{{ selectedModel }}</span>
            </div>
          </ion-title>
          <ion-buttons slot="end">
            <ion-button @click="createNewChat" fill="clear">
              <ion-icon :icon="addOutline"></ion-icon>
            </ion-button>
            <ion-button @click="showSettings = true" fill="clear">
              <ion-icon :icon="settingsOutline"></ion-icon>
            </ion-button>
            <!-- <ion-button @click="clearChat" fill="clear">
              <ion-icon :icon="trashOutline"></ion-icon>
            </ion-button> -->
            
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      <ion-content :fullscreen="true" class="chat-content" ref="contentRef" :style="{ 
        '--content-bottom': keyboardHeight + 'px',
        '--keyboard-offset': Math.min(keyboardHeight * 0.4, 120) + 'px'
      }">
        <div class="messages-container">
          <div 
            v-for="(message, index) in messages" 
            :key="index" 
            class="message"
            :class="{ 'user-message': message.role === 'user', 'ai-message': message.role === 'assistant' }"
          >
            <div class="message-bubble" :class="{ 'streaming': message.isStreaming }">
              <div class="message-content">{{ message.content }}</div>
              <div class="message-time">{{ formatTime(message.timestamp) }}</div>
              <ion-spinner 
                v-if="message.isStreaming" 
                name="dots" 
                class="streaming-indicator"
              ></ion-spinner>
            </div>
          </div>
          
          <!-- 空状态 -->
          <div v-if="messages.length === 0" class="empty-state">
            <!-- <ion-icon :icon="sparklesOutline" class="empty-icon"></ion-icon> -->
            <div class="empty-icon svg-icon"></div>
            <h3>{{ $t('Welcome To TalkFlow') || 'Welcome to TalkFlow' }}</h3>
            <p>{{ $t('Enjoy the FREEDOM and GUN power') || 'Enjoy the GUN power' }}</p>
            <p v-if="!selectedModel" class="model-warning">
              <ion-icon :icon="warningOutline"></ion-icon>
              {{ $t('Please select a model first') || 'Please select a model first' }}
            </p>
          </div>
          
          <!-- AI输入状态 -->
          <div v-if="isAiTyping" class="message ai-message">
            <div class="message-bubble typing">
              <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </div>
      </ion-content>
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

          <!-- API URL Setting -->
          <ion-item lines="none" class="setting-item">
            <ion-label>
              <h3>{{ $t('API URL') || 'API URL' }}</h3>
              <p>{{ apiUrl }}</p>
            </ion-label>
          </ion-item>
          <ion-item lines="none" class="api-input-item">
            <ion-input
              v-model="apiUrl"
              :placeholder="$t('Enter API URL') || 'Enter API URL'"
              @ionInput="saveApiUrl"
              class="api-input"
            ></ion-input>
            <ion-button 
              slot="end" 
              fill="clear" 
              @click="loadModels"
              :disabled="isLoadingModels"
            >
              <ion-spinner v-if="isLoadingModels" name="crescent"></ion-spinner>
              <ion-icon v-else :icon="refreshOutline"></ion-icon>
            </ion-button>
          </ion-item>

          <!-- Storage Statistics -->
          <ion-item lines="none" class="setting-item">
            <ion-label>
              <h3>{{ $t('Storage Status') || 'Storage Status' }}</h3>
              <p v-if="storageStats">
                SQLite: {{ storageStats.sqliteEnabled ? 'Enabled' : 'Disabled' }} | 
                IndexedDB: {{ storageStats.indexedDBEnabled ? 'Enabled' : 'Disabled' }} | 
                Conversations: {{ storageStats.conversationCount }} | 
                Messages: {{ storageStats.totalMessages }}
              </p>
              <p v-else>Loading...</p>
            </ion-label>
            <ion-button 
              slot="end" 
              fill="clear" 
              @click="refreshStorageStats"
              :disabled="isLoadingStats"
            >
              <ion-spinner v-if="isLoadingStats" name="crescent"></ion-spinner>
              <ion-icon v-else :icon="refreshOutline"></ion-icon>
            </ion-button>
          </ion-item>

          <!-- Debug Tools -->
          <!-- <ion-item lines="none" class="setting-item">
            <ion-label>
              <h3>{{ $t('Debug Tools') || 'Debug Tools' }}</h3>
              <p>Test persistence functionality</p>
            </ion-label>
            <ion-button 
              slot="end" 
              fill="outline" 
              size="small"
              @click="debugPersistence"
            >
              {{ $t('Test') || 'Test' }}
            </ion-button>
          </ion-item> -->
        </ion-list>
      </ion-content>
    </ion-modal>

    <!-- 大屏模式时的底部输入框 -->
    <div v-if="isLargeScreen" class="bottom-container-desktop" :style="{ transform: `translateX(-50%) translateY(-${keyboardHeight}px)` }">
      <div class="bottom-input-container-desktop">
        <input 
          type="text" 
          :placeholder="$t('Talk to AI...') || 'Talk to AI...'"
          class="bottom-input-desktop"
          :class="{ 'with-button': (bottomInputValue.trim() || isSending) }"
          v-model="bottomInputValue"
          @keydown.enter="sendToAIDesktop"
          @focus="onInputFocus"
          @blur="onInputBlur"
          ref="bottomInputRef"
          enterkeyhint="send"
          autocomplete="off"
        />
        
        <!-- 发送按钮容器 -->
        <div class="button-container-desktop">
          <transition name="button-fade" mode="out-in">
            <button 
              v-if="isSending"
              key="stop"
              @click="stopGeneration" 
              class="stop-button action-button-desktop"
              
            >
              <ion-icon :icon="stopOutline"></ion-icon>
            </button>
            <button 
              v-else-if="bottomInputValue.trim()" 
              key="send"
              @click="sendToAIDesktop" 
              class="send-button action-button-desktop"
            >
              <ion-icon :icon="sendOutline"></ion-icon>
            </button>
          </transition>
        </div>
      </div>
    </div>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonButtons, IonButton,
  IonModal, IonItem, IonLabel, IonSelect, IonSelectOption, IonToggle, IonList, 
  IonRange, IonChip, IonSpinner, IonInput, IonMenu, IonItemSliding, IonItemOptions, IonItemOption,
  IonCheckbox, menuController
} from '@ionic/vue';
import { 
  sparklesOutline, settingsOutline, trashOutline, warningOutline, refreshOutline, addOutline, menuOutline, chatbubbleOutline,
  checkmarkOutline, createOutline, stopOutline, sendOutline
} from 'ionicons/icons';
import { getTalkFlowCore } from '@/composables/TalkFlowCore';
import { fetchModels, getApiUrl, setApiUrl, streamChat, chat } from '@/composables/ollamaService';
import { showToast } from '@/composables/useToast';
import { aiChatPersistenceServ } from '@/services/globalServices';
import { type ChatMessage as PersistenceChatMessage, type Conversation as PersistenceConversation } from '@/services/aiChatPersistenceService';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';

interface ChatMessage {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  conversationId?: string;
}

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  createdAt: Date;
  updatedAt: Date;
  model?: string;
  messageCount: number;
}

const chatFlowStore = getTalkFlowCore();
const { isLargeScreen } = chatFlowStore;
const contentRef = ref<any>(null);
const messages = ref<ChatMessage[]>([]);
const isAiTyping = ref(false);
const isSending = ref(false);

// Settings state
const showSettings = ref(false);
const models = ref<string[]>([]);
const selectedModel = ref('');
const chatMode = ref<'chat' | 'generate'>('chat');
const streamEnabled = ref(true); // 默认流式传输
const temperature = ref(0.7);
const apiUrl = ref(getApiUrl());
const isLoadingModels = ref(false);

// Stop generation control
let abortController: AbortController | null = null;

// 完成回调函数
let onCompleteCallback: (() => void) | null = null;

// Conversation history state
const conversationHistory = ref<Conversation[]>([]);
const currentConversationId = ref<string>('');

// Edit mode state
const isEditMode = ref(false);
const selectedConversations = ref<string[]>([]);

// Storage statistics state
const storageStats = ref<{ sqliteEnabled: boolean; indexedDBEnabled: boolean; conversationCount: number; totalMessages: number } | null>(null);
const isLoadingStats = ref(false);

// 底部输入框相关状态
const bottomInputValue = ref('');
const bottomInputRef = ref<HTMLInputElement | null>(null);

// 键盘状态
const keyboardHeight = ref(0);
const isKeyboardVisible = ref(false);

// 存储监听器引用，确保正确清理
let keyboardShowListener: any = null;
let keyboardHideListener: any = null;
const activeTimers = new Set<NodeJS.Timeout>();
const activeIntervals = new Set<NodeJS.Timeout>();

// 添加定时器管理
const addTimer = (timer: NodeJS.Timeout) => {
  activeTimers.add(timer);
  return timer;
};

const addInterval = (interval: NodeJS.Timeout) => {
  activeIntervals.add(interval);
  return interval;
};

// 防抖滚动函数
let scrollTimeout: NodeJS.Timeout | null = null;
const debouncedScrollToBottom = () => {
  if (scrollTimeout) {
    clearTimeout(scrollTimeout);
    activeTimers.delete(scrollTimeout);
  }
  scrollTimeout = setTimeout(() => {
    scrollToBottom();
    if (scrollTimeout) {
      activeTimers.delete(scrollTimeout);
    }
    scrollTimeout = null;
  }, 50);
  addTimer(scrollTimeout);
};

// 键盘监听器初始化和清理函数
const initKeyboardListeners = () => {
  try {
    // 先清理旧的监听器
    cleanupKeyboardListeners();
    
    Keyboard.setResizeMode({ mode: KeyboardResize.None });
    
    keyboardShowListener = Keyboard.addListener('keyboardWillShow', (info: { keyboardHeight: any }) => {
      keyboardHeight.value = info.keyboardHeight;
      isKeyboardVisible.value = true;
      // 使用防抖优化滚动
      debouncedScrollToBottom();
    });
    
    keyboardHideListener = Keyboard.addListener('keyboardWillHide', () => {
      keyboardHeight.value = 0;
      isKeyboardVisible.value = false;
      // 延迟滚动，避免频繁操作
      const timer = setTimeout(() => scrollToBottom(), 100);
      addTimer(timer);
    });
    
  } catch (error) {
    console.warn('⚠️ AiChatSimple failed to register keyboard listeners (may not be on mobile):', error);
  }
};

const cleanupKeyboardListeners = () => {
  try {
    // 清理键盘监听器
    if (keyboardShowListener) {
      keyboardShowListener.remove();
      keyboardShowListener = null;
    }
    if (keyboardHideListener) {
      keyboardHideListener.remove();
      keyboardHideListener = null;
    }
    
    // 清理所有定时器
    activeTimers.forEach(timer => {
      try {
        clearTimeout(timer);
      } catch (error) {
        console.warn('⚠️ Failed to clear timer:', error);
      }
    });
    activeTimers.clear();
    
    // 清理所有间隔器
    activeIntervals.forEach(interval => {
      try {
        clearInterval(interval);
      } catch (error) {
        console.warn('⚠️ Failed to clear interval:', error);
      }
    });
    activeIntervals.clear();
    
    // 清理滚动防抖定时器
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
      scrollTimeout = null;
    }
    
  } catch (error) {
    console.warn('⚠️ AiChatSimple failed to remove keyboard listeners:', error);
  }
};

// Generate unique conversation ID
const generateConversationId = () => {
  return 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

// Generate conversation title from first message
const generateConversationTitle = (firstMessage: string) => {
  const maxLength = 30;
  if (firstMessage.length <= maxLength) {
    return firstMessage;
  }
  return firstMessage.substring(0, maxLength - 3) + '...';
};

// Format date for conversation list
const formatDate = (date: Date) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  if (messageDate.getTime() === today.getTime()) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  } else if (messageDate.getTime() === today.getTime() - 86400000) {
    return '昨天';
  } else if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  } else {
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
  }
};

// Open sidebar menu
const openMenu = async () => {
  await menuController.open('chat-history-menu');
};

// Load conversation history from persistence service
const loadConversationHistory = async () => {
  try {
    const history = await aiChatPersistenceServ.getConversations();
    conversationHistory.value = history.map((conv: PersistenceConversation) => ({
      id: conv.id,
      title: conv.title,
      lastMessage: conv.lastMessage,
      createdAt: new Date(conv.createdAt),
      updatedAt: new Date(conv.updatedAt),
      model: conv.model,
      messageCount: conv.messageCount
    }));
    console.log('📚 Loaded conversation history:', conversationHistory.value.length);
  } catch (error) {
    console.error('Failed to load conversation history:', error);
  }
};

// Save current chat state to persistence service
const saveCurrentChatState = async () => {
  try {
    const currentState = {
      currentConversationId: currentConversationId.value,
      selectedModel: selectedModel.value,
      timestamp: new Date().toISOString()
    };
    
    await aiChatPersistenceServ.saveCurrentState(currentState);
    
    console.log('💾 Current chat state saved:', {
      conversationId: currentConversationId.value,
      messageCount: messages.value.length,
      model: selectedModel.value
    });
  } catch (error) {
    console.error('Failed to save current chat state:', error);
  }
};

// Load current chat state from persistence service
const loadCurrentChatState = async () => {
  try {
    const state = await aiChatPersistenceServ.getCurrentState();
    
    if (state) {
      // 恢复当前对话ID和消息
      if (state.currentConversationId) {
        currentConversationId.value = state.currentConversationId;
        
        // 加载对话消息
        const persistenceMessages = await aiChatPersistenceServ.getMessages(state.currentConversationId);
        messages.value = persistenceMessages.map((msg: PersistenceChatMessage) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          isStreaming: msg.isStreaming,
          conversationId: msg.conversationId
        }));
      }
      
      // 恢复模型选择（只有在模型列表非空且包含该模型时才恢复）
      if (state.selectedModel && models.value.length > 0 && models.value.includes(state.selectedModel)) {
        selectedModel.value = state.selectedModel;
        console.log('🤖 Model restored:', state.selectedModel);
      } else if (state.selectedModel && models.value.length === 0) {
        // 如果模型列表还没加载，暂时保存状态中的模型，等模型加载完成后再判断
        console.log('⏳ Model list not loaded yet, will check later:', state.selectedModel);
      }
      
      console.log('🔄 Current chat state restored:', {
        conversationId: currentConversationId.value,
        messageCount: messages.value.length,
        model: selectedModel.value,
        timestamp: state.timestamp
      });
      
      // 如果有消息，滚动到底部
      if (messages.value.length > 0) {
        nextTick(() => {
          scrollToBottom();
        });
      }
    }
  } catch (error) {
    console.error('Failed to load current chat state:', error);
  }
};

// Save current conversation
const saveCurrentConversation = async () => {
  if (messages.value.length === 0) return;
  
  const now = new Date();
  const lastMessage = messages.value[messages.value.length - 1];
  const lastMessageContent = lastMessage.content.substring(0, 50) + (lastMessage.content.length > 50 ? '...' : '');
  
  if (currentConversationId.value) {
    // Update existing conversation
    const existingConv = conversationHistory.value.find(conv => conv.id === currentConversationId.value);
    
    // 使用最后一条消息的时间戳作为对话的更新时间
    const lastMessageTime = lastMessage.timestamp || now;
    
    const conversation: PersistenceConversation = {
      id: currentConversationId.value,
      title: existingConv?.title || 'Chat',
      lastMessage: lastMessageContent,
      createdAt: existingConv?.createdAt.toISOString() || now.toISOString(),
      updatedAt: lastMessageTime.toISOString(), // 使用最后一条消息的时间戳
      model: selectedModel.value,
      messageCount: messages.value.length
    };
    
    await aiChatPersistenceServ.saveConversation(conversation);
    
    // Update local conversation history
    const index = conversationHistory.value.findIndex(conv => conv.id === currentConversationId.value);
    if (index !== -1) {
      conversationHistory.value[index] = {
        id: conversation.id,
        title: conversation.title,
        lastMessage: conversation.lastMessage,
        createdAt: new Date(conversation.createdAt),
        updatedAt: new Date(conversation.updatedAt), // 现在使用的是最后一条消息的时间戳
        model: conversation.model,
        messageCount: conversation.messageCount
      };
      
      console.log('🔄 Updated conversation in history list:', conversation.title, `(${conversation.messageCount} messages)`);
      
      // 重新排序对话列表
      conversationHistory.value.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    } else {
      console.warn('⚠️ Conversation not found in local history, this should not happen:', currentConversationId.value);
    }
  } else {
    console.warn('⚠️ saveCurrentConversation called but no currentConversationId found. This should not happen with new logic.');
    return;
  }
  
  // 确保所有消息都被正确保存（补救机制）
  console.log(`💾 Saving ${messages.value.length} messages for conversation:`, currentConversationId.value);
  let savedCount = 0;
  
  for (const message of messages.value) {
    if (message.content && message.content.trim()) {
      const persistenceMessage: PersistenceChatMessage = {
        conversationId: currentConversationId.value,
        role: message.role,
        content: message.content.trim(),
        timestamp: message.timestamp.toISOString(),
        isStreaming: message.isStreaming || false
      };
      
      try {
        await aiChatPersistenceServ.saveMessage(persistenceMessage);
        savedCount++;
      } catch (error) {
        console.error('Failed to save message during conversation save:', error);
      }
    }
  }
  
  console.log(`✅ Successfully saved ${savedCount} messages for conversation:`, currentConversationId.value);
};

// Toggle edit mode
const toggleEditMode = () => {
  isEditMode.value = !isEditMode.value;
  selectedConversations.value = [];
};

// Toggle conversation selection
const toggleConversationSelection = (conversationId: string) => {
  const index = selectedConversations.value.indexOf(conversationId);
  if (index > -1) {
    selectedConversations.value.splice(index, 1);
  } else {
    selectedConversations.value.push(conversationId);
  }
};

// Delete selected conversations
const deleteSelectedConversations = async () => {
  if (selectedConversations.value.length === 0) return;
  
  const toDelete = [...selectedConversations.value];
  let currentConversationDeleted = false;
  
  try {
    for (const conversationId of toDelete) {
      // Delete from persistence service
      await aiChatPersistenceServ.deleteConversation(conversationId);
      
      // Remove from local conversation history
      const index = conversationHistory.value.findIndex(conv => conv.id === conversationId);
      if (index !== -1) {
        conversationHistory.value.splice(index, 1);
      }
      
      // If deleting current conversation, clear chat
      if (currentConversationId.value === conversationId) {
        messages.value = [];
        currentConversationId.value = '';
        currentConversationDeleted = true;
      }
    }
    
    // 如果删除了当前对话，保存清空后的状态
    if (currentConversationDeleted) {
      await saveCurrentChatState();
    }
    
    selectedConversations.value = [];
    isEditMode.value = false;
    
    showToast(`Deleted ${toDelete.length} conversation(s)`, 'success');
  } catch (error) {
    console.error('Failed to delete conversations:', error);
    showToast('Failed to delete conversations', 'error');
  }
};

// Load conversation
const loadConversation = async (conversationId: string) => {
  const conversation = conversationHistory.value.find(conv => conv.id === conversationId);
  if (conversation) {
    try {
      console.log('🔍 Loading conversation:', conversationId, 'Expected messages:', conversation.messageCount);
      
      // Load messages from persistence service
      const persistenceMessages = await aiChatPersistenceServ.getMessages(conversationId);
      console.log('📨 Loaded messages from persistence:', persistenceMessages.length);
      
      if (persistenceMessages.length === 0) {
        console.warn('⚠️ No messages found for conversation:', conversationId);
        showToast('No messages found in this conversation', 'warning');
      }
      
      messages.value = persistenceMessages.map((msg: PersistenceChatMessage) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        isStreaming: msg.isStreaming,
        conversationId: msg.conversationId
      }));
      
      console.log('✅ Messages mapped to UI:', messages.value.length);
      console.log('📝 First few messages:', messages.value.slice(0, 3).map(m => `${m.role}: ${m.content.substring(0, 30)}...`));
      
      currentConversationId.value = conversationId;
      
      // Switch to conversation's model if different
      if (conversation.model && conversation.model !== selectedModel.value) {
        selectedModel.value = conversation.model;
        await saveSettings();
      }
      
      // 保存加载对话后的状态
      await saveCurrentChatState();
      
      await menuController.close('chat-history-menu');
      
      nextTick(() => {
        scrollToBottom();
      });
      
      showToast(`Conversation loaded (${messages.value.length} messages)`, 'success');
    } catch (error) {
      console.error('Failed to load conversation messages:', error);
      showToast('Failed to load conversation', 'error');
    }
  } else {
    console.error('Conversation not found in history:', conversationId);
    showToast('Conversation not found', 'error');
  }
};

// Create new chat
const createNewChat = async () => {
  try {
    console.log('🆕 Creating new chat...');
    
    // Save current conversation before creating new one
    if (messages.value.length > 0) {
      console.log('💾 Saving current conversation before creating new one...');
      await saveCurrentConversation();
    }
    
    // Clear current chat
    messages.value = [];
    currentConversationId.value = '';
    console.log('🗑️ Cleared current chat state');
    
    // Save new chat state
    await saveCurrentChatState();
    console.log('💾 Saved new chat state');
    
    // Close menu if open
    try {
      await menuController.close('chat-history-menu');
    } catch (menuError) {
      console.warn('⚠️ Failed to close menu (may not be open):', menuError);
    }
    
    showToast('New chat created', 'success');
    console.log('✅ New chat created successfully');
  } catch (error) {
    console.error('❌ Failed to create new chat:', error);
    showToast('Failed to create new chat', 'error');
  }
};

// Delete conversation
const deleteConversation = async (conversationId: string) => {
  try {
    // Delete from persistence service
    await aiChatPersistenceServ.deleteConversation(conversationId);
    
    // Remove from local conversation history
    const index = conversationHistory.value.findIndex(conv => conv.id === conversationId);
    if (index !== -1) {
      conversationHistory.value.splice(index, 1);
    }
    
    // If deleting current conversation, clear chat
    if (currentConversationId.value === conversationId) {
      messages.value = [];
      currentConversationId.value = '';
      // 保存清空后的状态
      await saveCurrentChatState();
    }
    
    showToast('Conversation deleted', 'success');
  } catch (error) {
    console.error('Failed to delete conversation:', error);
    showToast('Failed to delete conversation', 'error');
  }
};

// Load settings from localStorage
const loadSettings = async () => {
  try {
    const saved = localStorage.getItem('aiChatSimpleSettings');
    if (saved) {
      const settings = JSON.parse(saved);
      selectedModel.value = settings.selectedModel || '';
      chatMode.value = settings.chatMode || 'chat';
      streamEnabled.value = settings.streamEnabled ?? false; // 默认关闭
      temperature.value = settings.temperature ?? 0.7;
      if (settings.apiUrl) {
        apiUrl.value = settings.apiUrl;
      }
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
};

// Save settings to localStorage
const saveSettings = async () => {
  try {
    const settings = {
      selectedModel: selectedModel.value,
      chatMode: chatMode.value,
      streamEnabled: streamEnabled.value,
      temperature: temperature.value,
      apiUrl: apiUrl.value,
    };
    localStorage.setItem('aiChatSimpleSettings', JSON.stringify(settings));
    
    // 保存当前聊天状态（包括模型选择）
    await saveCurrentChatState();
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
};

// Save API URL
const saveApiUrl = async () => {
  try {
    setApiUrl(apiUrl.value);
    await saveSettings();
  } catch (error) {
    console.error('Failed to save API URL:', error);
  }
};

// Refresh storage statistics
const refreshStorageStats = async () => {
  isLoadingStats.value = true;
  try {
    storageStats.value = await aiChatPersistenceServ.getStorageStats();
    console.log('📊 Storage stats refreshed:', storageStats.value);
  } catch (error) {
    console.error('Failed to refresh storage stats:', error);
    showToast('Failed to load storage statistics', 'error');
  } finally {
    isLoadingStats.value = false;
  }
};

// Debug persistence functionality
const debugPersistence = async () => {
  try {
    console.log('🔍 === DEBUG PERSISTENCE START ===');
    
    // Test current state
    console.log('Current conversation ID:', currentConversationId.value);
    console.log('Current messages count:', messages.value.length);
    
    // Test loading current state
    const currentState = await aiChatPersistenceServ.getCurrentState();
    console.log('Saved current state:', currentState);
    
    // Test loading conversations
    const conversations = await aiChatPersistenceServ.getConversations();
    console.log('All conversations:', conversations);
    
    // Test loading messages for current conversation
    if (currentConversationId.value) {
      const savedMessages = await aiChatPersistenceServ.getMessages(currentConversationId.value);
      console.log(`Messages for conversation ${currentConversationId.value}:`, savedMessages);
      
      if (savedMessages.length !== messages.value.length) {
        console.warn(`⚠️ Message count mismatch! UI: ${messages.value.length}, Saved: ${savedMessages.length}`);
      }
    }
    
    // Test storage stats
    const stats = await aiChatPersistenceServ.getStorageStats();
    console.log('Storage statistics:', stats);
    
    console.log('🔍 === DEBUG PERSISTENCE END ===');
    showToast('Debug completed - check console', 'success');
  } catch (error) {
    console.error('Debug persistence failed:', error);
    showToast('Debug failed - check console', 'error');
  }
};

// Load available models
const loadModels = async () => {
  isLoadingModels.value = true;
  try {
    models.value = await fetchModels();
    
    // 检查保存的状态中是否有模型选择
    let savedModel = null;
    try {
      const savedState = await aiChatPersistenceServ.getCurrentState();
      if (savedState) {
        savedModel = savedState.selectedModel;
      }
    } catch (e) {
      console.warn('Failed to get saved state for model check:', e);
    }
    
    // 优先恢复保存的模型，其次使用设置中的模型，最后使用第一个可用模型
    if (savedModel && models.value.includes(savedModel)) {
      selectedModel.value = savedModel;
      console.log('🤖 Restored model from saved state:', savedModel);
    } else if (models.value.length > 0 && !selectedModel.value) {
      selectedModel.value = models.value[0];
      console.log('🤖 Using default model:', models.value[0]);
    }
    
    if (selectedModel.value) {
      await saveSettings();
    }
    
    showToast('Models loaded successfully', 'success');
    console.log('📡 Available models:', models.value);
  } catch (error) {
    console.error('Failed to fetch models:', error);
    showToast('Failed to connect to AI service', 'error');
  } finally {
    isLoadingModels.value = false;
  }
};

// Clear chat
const clearChat = async () => {
  // Save current conversation before clearing
  if (messages.value.length > 0) {
    await saveCurrentConversation();
  }
  
  messages.value = [];
  currentConversationId.value = '';
  
  // 保存清空后的状态
  await saveCurrentChatState();
  
  showToast('Chat cleared', 'success');
};

// 添加消息
const addMessage = async (content: string, role: 'user' | 'assistant' = 'user', options?: Partial<ChatMessage>) => {
  let isNewConversation = false;
  
  // 如果是新对话且没有对话ID，先生成一个
  if (!currentConversationId.value && content.trim()) {
    currentConversationId.value = generateConversationId();
    isNewConversation = true;
    console.log('🆕 Generated new conversation ID:', currentConversationId.value);
  }
  
  const message: ChatMessage = {
    role,
    content,
    timestamp: new Date(),
    conversationId: currentConversationId.value,
    ...options
  };
  
  messages.value.push(message);
  
  // 如果是新对话的第一条用户消息，立即创建对话记录
  if (isNewConversation && role === 'user' && content.trim()) {
    const now = new Date();
    const title = generateConversationTitle(content);
    
    const newConversation: Conversation = {
      id: currentConversationId.value,
      title,
      lastMessage: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
      createdAt: now,
      updatedAt: now,
      model: selectedModel.value,
      messageCount: 1
    };
    
    // 立即添加到本地对话历史
    conversationHistory.value.unshift(newConversation);
    console.log('📋 New conversation added to history list:', title);
    
    // 保存到持久化服务
    const persistenceConversation: PersistenceConversation = {
      id: newConversation.id,
      title: newConversation.title,
      lastMessage: newConversation.lastMessage,
      createdAt: newConversation.createdAt.toISOString(),
      updatedAt: newConversation.updatedAt.toISOString(),
      model: newConversation.model,
      messageCount: newConversation.messageCount
    };
    
    aiChatPersistenceServ.saveConversation(persistenceConversation).catch(error => {
      console.error('Failed to save new conversation to persistence:', error);
    });
  }
  
  // 保存消息到持久化服务（保存所有消息，包括AI的占位符消息）
  if (currentConversationId.value && (content.trim() || message.role === 'assistant')) {
    const persistenceMessage: PersistenceChatMessage = {
      conversationId: currentConversationId.value,
      role: message.role,
      content: message.content.trim() || (message.role === 'assistant' ? 'AI is thinking...' : ''),
      timestamp: message.timestamp.toISOString(),
      isStreaming: message.isStreaming || false
    };
    
    // 🔧 关键修复：改为同步等待，确保消息保存完成
    try {
      await aiChatPersistenceServ.saveMessage(persistenceMessage);
      console.log('💾 Message saved to persistence:', message.role, 
        message.role === 'assistant' && !content.trim() ? '[AI placeholder]' : content.substring(0, 50) + '...');
    } catch (error) {
      console.error('Failed to save message to persistence:', error);
      // 保存失败时显示用户提示
      if (message.role === 'user') {
        showToast('Failed to save message, please try again', 'error');
      }
    }
    
    // 实时更新本地对话历史中的最后消息时间和内容
    if (!isNewConversation) {
      const conversationIndex = conversationHistory.value.findIndex(conv => conv.id === currentConversationId.value);
      if (conversationIndex !== -1) {
        conversationHistory.value[conversationIndex].lastMessage = content.substring(0, 50) + (content.length > 50 ? '...' : '');
        conversationHistory.value[conversationIndex].updatedAt = message.timestamp;
        conversationHistory.value[conversationIndex].messageCount = messages.value.length;
        
        // 重新排序对话列表，将最新的对话移到顶部
        conversationHistory.value.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      }
    }
  } else if (!content || !content.trim()) {
    console.log('⏭️ Skipping empty message save (user message):', message.role);
  }
  
  // 自动保存当前状态
  await saveCurrentChatState();
  
  nextTick(() => {
    scrollToBottom();
  });
  
  return message;
};

// 滚动到底部 - 使用ion-content的内置方法
const scrollToBottom = () => {
  if (contentRef.value) {
    // 使用ion-content的scrollToBottom方法，这是最可靠的
    contentRef.value.$el.scrollToBottom(300);
    console.log('📱 Scrolled to bottom');
  }
};

// 格式化时间
const formatTime = (timestamp: Date) => {
  return timestamp.toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

// 停止生成
const stopGeneration = () => {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  isSending.value = false;
  isAiTyping.value = false;
  
  // 停止当前流式消息
  const lastMessage = messages.value[messages.value.length - 1];
  if (lastMessage && lastMessage.isStreaming) {
    lastMessage.isStreaming = false;
    if (!lastMessage.content.trim()) {
      lastMessage.content = 'Response was cancelled.';
    }
  }
  
  // 调用完成回调（停止时也需要重置父组件状态）
  if (onCompleteCallback) {
    setTimeout(() => {
      onCompleteCallback?.();
      onCompleteCallback = null;
    }, 100);
  }
};

// 真实的AI回复
const getAiResponse = async (userMessage: string) => {
  if (!selectedModel.value) {
    showToast('Please select a model first', 'warning');
    return;
  }

  isSending.value = true;
  isAiTyping.value = true;

  // 准备对话历史 - 过滤掉空内容，但保留已完成的消息
  const conversationHistory = messages.value
    .filter(msg => msg.content && msg.content.trim())
    .map(msg => ({
      role: msg.role,
      content: msg.content
    }));

  // 调试：输出对话历史
  console.log('📝 Conversation History:', conversationHistory);
  console.log('🗣️ Total messages in history:', conversationHistory.length);
  console.log('📊 Context analysis:', {
    totalMessages: messages.value.length,
    filteredMessages: conversationHistory.length,
    userMessages: conversationHistory.filter(msg => msg.role === 'user').length,
    assistantMessages: conversationHistory.filter(msg => msg.role === 'assistant').length,
    lastFewMessages: conversationHistory.slice(-3).map(msg => `${msg.role}: ${msg.content.substring(0, 50)}...`)
  });

  // 创建 AI 消息占位符
  const aiMessage = await addMessage('', 'assistant', {
    isStreaming: streamEnabled.value
  });

  try {
    abortController = new AbortController();

    if (streamEnabled.value) {
      // 流式响应
      console.log('🌊 Starting stream chat with context...');
      await streamChat(
        selectedModel.value,
        conversationHistory,
        (chunk: string) => {
          if (chunk && typeof chunk === 'string') {
            aiMessage.content += chunk;
            isAiTyping.value = false;
            
            // 更新响应式状态
            const lastIndex = messages.value.length - 1;
            if (lastIndex >= 0 && messages.value[lastIndex].role === 'assistant') {
              messages.value[lastIndex] = { ...messages.value[lastIndex], content: aiMessage.content };
            }
          }
        },
        chatMode.value,
        { temperature: temperature.value }
      );
    } else {
      // 非流式响应
      console.log('💬 Starting non-stream chat with context...');
      const response = await chat(
        selectedModel.value,
        conversationHistory,
        chatMode.value,
        { temperature: temperature.value }
      );
      
      if (typeof response === 'string') {
        aiMessage.content = response;
      } else {
        aiMessage.content = 'Sorry, I received an invalid response. Please try again.';
      }
      
      isAiTyping.value = false;
    }

    // 最终内容验证
    if (!aiMessage.content.trim()) {
      aiMessage.content = 'Sorry, I didn\'t receive any response. Please try again.';
    } else {
      console.log('✅ AI Response received:', aiMessage.content.substring(0, 100) + '...');
    }

    // 在流式响应完成后，更新AI消息的完整内容
    if (currentConversationId.value && aiMessage.content.trim()) {
      // 先删除占位符消息（基于时间戳和角色查找）
      try {
        await aiChatPersistenceServ.updateAssistantMessage(
          currentConversationId.value,
          aiMessage.timestamp.toISOString(),
          aiMessage.content,
          false
        );
        console.log('💾 AI response updated in persistence');
      } catch (error) {
        console.error('Failed to update AI response in persistence:', error);
        // 如果更新失败，尝试直接保存
        try {
          const persistenceMessage: PersistenceChatMessage = {
            conversationId: currentConversationId.value,
            role: 'assistant',
            content: aiMessage.content,
            timestamp: aiMessage.timestamp.toISOString(),
            isStreaming: false
          };
          await aiChatPersistenceServ.saveMessage(persistenceMessage);
          console.log('💾 AI response saved as new message to persistence');
        } catch (saveError) {
          console.error('Failed to save AI response as new message:', saveError);
        }
      }
    }

  } catch (error: any) {
    console.error('AI response error:', error);
    isAiTyping.value = false;
    
    if (error.name === 'AbortError') {
      aiMessage.content = 'Response was cancelled.';
    } else {
      aiMessage.content = 'Sorry, I encountered an error. Please check your connection and try again.';
      showToast('Failed to get AI response', 'error');
    }
  } finally {
    console.log('🔄 Cleaning up AI response...');
    
    // 确保流式状态被正确清除
    if (aiMessage.isStreaming) {
      aiMessage.isStreaming = false;
    }
    
    // 更新响应式数组中的消息状态
    const lastIndex = messages.value.length - 1;
    if (lastIndex >= 0 && messages.value[lastIndex].role === 'assistant') {
      messages.value[lastIndex] = { 
        ...messages.value[lastIndex], 
        content: aiMessage.content,
        isStreaming: false 
      };
    }
    
    // 强制重置所有相关状态
    isSending.value = false;
    isAiTyping.value = false;
    abortController = null;
    
    console.log('🔄 State reset - isSending:', isSending.value, 'isAiTyping:', isAiTyping.value);
    
    // 强制触发响应式更新
    await nextTick(() => {
      // 确保状态在下一个渲染周期中正确
      if (isSending.value || isAiTyping.value) {
        console.warn('⚠️ State not properly reset, forcing reset...');
        isSending.value = false;
        isAiTyping.value = false;
      }
    });
    
    // 确保 UI 更新
    messages.value = [...messages.value];
    await nextTick();
    scrollToBottom();
    
    // 自动保存对话
    try {
      await saveCurrentConversation();
    } catch (saveError) {
      console.error('❌ Failed to save conversation after AI response:', saveError);
    }
    
    // 保存当前聊天状态
    await saveCurrentChatState();
    
    // 调用完成回调（延迟一点确保UI完全更新）
    if (onCompleteCallback) {
      setTimeout(() => {
        onCompleteCallback?.();
        onCompleteCallback = null; // 清空回调
      }, 500);
    }
  }
};

// 处理新消息（从外部输入框发送的消息）
const handleNewMessage = async (message: string, onComplete?: () => void) => {
  if (!message.trim()) return;
  
  // 保存完成回调
  onCompleteCallback = onComplete || null;
  
  await addMessage(message, 'user');
  getAiResponse(message);
};

// 大屏模式输入框处理函数
const onInputFocus = () => {
  console.log('🎯 Input focused');
  isKeyboardVisible.value = true;
  // 键盘事件监听器会自动处理滚动和布局调整
};

const onInputBlur = () => {
  console.log('🎯 Input blurred');
  // 键盘事件监听器会自动处理键盘隐藏
};

const sendToAIDesktop = async () => {
  if (!bottomInputValue.value.trim()) return;
  
  const message = bottomInputValue.value.trim();
  bottomInputValue.value = '';
  
  // 调用现有的handleNewMessage方法，支持连续对话
  await handleNewMessage(message, () => {
    // AI回复完成后重新聚焦输入框
    nextTick(() => {
      if (bottomInputRef.value) {
        bottomInputRef.value.focus();
        console.log('🎯 Desktop input refocused for continuous conversation');
      }
    });
  });
  
  // 🔄 发送消息后保持键盘打开，支持连续对话
  // 不调用 blur()，保持输入框聚焦状态
  console.log('📝 Desktop message sent, keeping keyboard open for continuous chat');
};

// 等待持久化服务就绪
const waitForPersistenceService = async (maxAttempts = 5, delay = 1000): Promise<void> => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await aiChatPersistenceServ.getStorageStats();
      console.log('✅ Persistence service is ready');
      return;
    } catch (error) {
      console.warn(`⚠️ Persistence service not ready (attempt ${attempt}/${maxAttempts}):`, error);
      if (attempt === maxAttempts) {
        throw new Error('Persistence service failed to initialize');
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// 检查并恢复应急备份
const checkEmergencyBackup = async (): Promise<boolean> => {
  try {
    const emergencyBackupData = localStorage.getItem('aiChatEmergencyBackup');
    if (!emergencyBackupData) return false;
    
    const backup = JSON.parse(emergencyBackupData);
    const backupTime = new Date(backup.timestamp);
    const timeDiff = Date.now() - backupTime.getTime();
    
    // 如果备份时间在10分钟内，且当前没有数据，则尝试恢复
    if (timeDiff < 10 * 60 * 1000 && messages.value.length === 0 && backup.currentConversationId) {
      console.log('🔍 Found recent emergency backup, attempting recovery...');
      
      try {
        // 尝试从持久化服务恢复完整数据
        const persistenceMessages = await aiChatPersistenceServ.getMessages(backup.currentConversationId);
        if (persistenceMessages.length > 0) {
          messages.value = persistenceMessages.map((msg: any) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.timestamp),
            isStreaming: msg.isStreaming,
            conversationId: msg.conversationId
          }));
          currentConversationId.value = backup.currentConversationId;
          
          showToast('Data recovered from emergency backup', 'success');
          console.log('✅ Emergency backup recovery successful');
          
          // 清除应急备份
          localStorage.removeItem('aiChatEmergencyBackup');
          return true;
        }
      } catch (error) {
        console.warn('⚠️ Failed to recover from persistence, using emergency backup data');
        
        // 如果持久化恢复失败，使用应急备份中的最后几条消息
        if (backup.lastMessages && backup.lastMessages.length > 0) {
          messages.value = backup.lastMessages.map((msg: any) => ({
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.timestamp),
            conversationId: backup.currentConversationId
          }));
          currentConversationId.value = backup.currentConversationId;
          
          showToast('Partial data recovered from emergency backup', 'warning');
          console.log('⚠️ Partial emergency backup recovery');
          return true;
        }
      }
    }
    
    // 清除过期的应急备份
    if (timeDiff > 10 * 60 * 1000) {
      localStorage.removeItem('aiChatEmergencyBackup');
      console.log('🗑️ Removed expired emergency backup');
    }
    
    return false;
  } catch (error) {
    console.error('❌ Emergency backup check failed:', error);
    localStorage.removeItem('aiChatEmergencyBackup'); // 清除损坏的备份
    return false;
  }
};

// 处理初始化结果
const handleInitializationResults = async (results: PromiseSettledResult<any>[]): Promise<void> => {
  const [settingsResult, modelsResult, historyResult, stateResult, statsResult] = results;
  
  let hasErrors = false;
  
  if (settingsResult.status === 'rejected') {
    console.error('❌ Failed to load settings:', settingsResult.reason);
    // 使用默认设置
    hasErrors = true;
  }
  
  if (modelsResult.status === 'rejected') {
    console.error('❌ Failed to load models:', modelsResult.reason);
    showToast('Failed to load AI models - some features may be unavailable', 'warning');
    hasErrors = true;
  }
  
  if (historyResult.status === 'rejected') {
    console.error('❌ Failed to load conversation history:', historyResult.reason);
    showToast('Failed to load conversation history', 'warning');
    hasErrors = true;
  }
  
  if (stateResult.status === 'rejected') {
    console.error('❌ Failed to load current chat state:', stateResult.reason);
    // 尝试应急备份恢复
    const recovered = await checkEmergencyBackup();
    if (!recovered) {
      hasErrors = true;
    }
  } else {
    // 即使正常加载成功，也检查应急备份以防数据不完整
    await checkEmergencyBackup();
  }
  
  if (statsResult.status === 'rejected') {
    console.warn('⚠️ Failed to load storage stats:', statsResult.reason);
    // 统计信息不是关键功能
  }
  
  if (hasErrors) {
    console.warn('⚠️ Some components failed to initialize, running in degraded mode');
    showToast('Some features may be limited due to initialization issues', 'warning');
  } else {
    console.log('✅ All components initialized successfully');
  }
};

// 暴露方法和状态给父组件
defineExpose({
  handleNewMessage,
  stopGeneration,
  isSending,
  isAiTyping,
  messages,
  // 🔄 暴露键盘重新初始化方法
  reinitKeyboardListeners: initKeyboardListeners
});

onMounted(async () => {
  try {
    console.log('🚀 Loading AI Chat component...');
    
    // 确保持久化服务就绪
    await waitForPersistenceService();
    
    // 分阶段加载，使用 Promise.allSettled 避免单点失败
    const results = await Promise.allSettled([
      loadSettings(),
      loadModels(),
      loadConversationHistory(),
      loadCurrentChatState(),
      refreshStorageStats()
    ]);
    
    // 处理部分失败情况
    await handleInitializationResults(results);
  
  // 应急备份关键数据（同步操作）
  const createEmergencyBackup = (): void => {
    try {
      const emergencyData = {
        currentConversationId: currentConversationId.value,
        messageCount: messages.value.length,
        lastMessages: messages.value.slice(-5).map(m => ({
          role: m.role,
          content: m.content.substring(0, 200), // 限制内容长度
          timestamp: m.timestamp.toISOString()
        })),
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem('aiChatEmergencyBackup', JSON.stringify(emergencyData));
      console.log('🆘 Emergency backup created');
    } catch (error) {
      console.error('❌ Emergency backup failed:', error);
    }
  };
  
  // 监听页面卸载事件，确保在页面关闭/刷新时保存状态
  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    console.log('🔄 Page unloading, creating emergency backup...');
    
    // 同步创建应急备份
    createEmergencyBackup();
    
    // 尝试快速异步保存（可能被中断）
    if (messages.value.length > 0) {
      saveCurrentConversation().catch(error => {
        console.warn('⚠️ Failed to save conversation during unload:', error);
      });
    }
    saveCurrentChatState().catch(error => {
      console.warn('⚠️ Failed to save state during unload:', error);
    });
    
    // 不阻止页面卸载
  };
  
  // 监听页面可见性变化（如切换标签页、最小化等）
  const handleVisibilityChange = async () => {
    if (document.hidden) {
      console.log('🔄 Page hidden, saving current state...');
      createEmergencyBackup(); // 先创建应急备份
      
      try {
        if (messages.value.length > 0) {
          await saveCurrentConversation();
        }
        await saveCurrentChatState();
      } catch (error) {
        console.error('❌ Failed to save during visibility change:', error);
      }
    }
  };
  
  // 定期自动保存（每30秒）
  const autoSaveInterval = setInterval(async () => {
    if (messages.value.length > 0) {
      console.log('⏰ Auto-saving current state...');
      await saveCurrentChatState();
    }
  }, 30000);
  
  // 监听存储空间满的事件
  const handleStorageFull = (event: CustomEvent) => {
    const { usagePercent } = event.detail;
    showToast(`Storage space is full (${usagePercent}%). Please delete some old conversations manually.`, 'warning');
    console.warn('🚨 Storage quota exceeded. User needs to manually delete conversations.');
  };
  
  // 🎯 初始化键盘监听器
  console.log('🎯 AiChatSimple initializing keyboard listeners...');
  nextTick(() => {
    initKeyboardListeners();
  });
  
  // 监听键盘调整事件，用于小屏模式下的滚动同步
  const handleKeyboardAdjusted = () => {
    console.log('📱 Received keyboard adjustment event, scrolling simultaneously...');
    // 立即滚动，与动画同步
    scrollToBottom();
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('aiChatStorageFull', handleStorageFull as EventListener);
  document.addEventListener('keyboard-adjusted', handleKeyboardAdjusted);
  
  // 组件卸载时清理事件监听器
  onUnmounted(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('aiChatStorageFull', handleStorageFull as EventListener);
    document.removeEventListener('keyboard-adjusted', handleKeyboardAdjusted);
    clearInterval(autoSaveInterval);
    
    // 清理键盘监听器
    cleanupKeyboardListeners();
    console.log('🔧 AiChatSimple: Component unmounting, all listeners cleaned up');
  });
  
    console.log('🚀 AI Chat initialized with persistence enabled');
  } catch (error) {
    console.error('❌ Failed to initialize AI Chat:', error);
    showToast('Failed to initialize chat persistence', 'error');
  }
});
</script>

<style scoped>
.liquid-toolbar {
  --border-color: transparent;
  --background: var(--background-color-no);
  backdrop-filter: blur(10px);
}

.chat-content {
  --background: transparent;
  position: relative;
  overflow: visible;
  /* 键盘适配 - 使用CSS变量调整内容底部间距 */
  padding-bottom: var(--content-bottom, 0px);
}

.messages-container {
  padding: 16px;
  padding-bottom: calc(200px + var(--content-bottom, 0px)); /* 根据键盘高度动态调整底部空间 */
  min-height: calc(100% - var(--keyboard-offset, 0px)); /* 根据键盘偏移调整容器高度 */
  transform: translateY(calc(-1 * var(--keyboard-offset, 0px))); /* 对话内容跟随键盘上移 */
  transition: transform 0.3s ease, min-height 0.3s ease; /* 平滑过渡动画 */
}

.message {
  margin-bottom: 16px;
  display: flex;
  animation: messageSlideIn 0.3s ease-out;
}

.user-message {
  justify-content: flex-end;
}

.ai-message {
  justify-content: flex-start;
}

.message-bubble {
  max-width: 80%;
  padding: 12px 16px;
  border-radius: 18px;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.user-message .message-bubble {
  background: var(--ion-color-primary);
  color: white;
  border-bottom-right-radius: 6px;
}

.ai-message .message-bubble {
  background: var(--ion-background-color);
  color: var(--ion-text-color);
  border-bottom-left-radius: 6px;
  border: 1px solid var(--ion-color-step-100);
}

.streaming .message-bubble {
  background: linear-gradient(90deg, var(--ion-background-color) 0%, var(--ion-color-step-50) 50%, var(--ion-background-color) 100%);
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.message-content {
  font-size: 16px;
  line-height: 1.4;
  margin-bottom: 4px;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.message-time {
  font-size: 12px;
  opacity: 0.7;
  text-align: right;
}

.ai-message .message-time {
  text-align: left;
}

.streaming-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  color: var(--ion-color-primary);
  font-size: 16px;
}

/* 输入状态动画 */
.typing {
  background: var(--ion-color-light) !important;
  padding: 16px !important;
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
  animation: typingDots 1.4s infinite ease-in-out;
}

.typing-dots span:nth-child(1) {
  animation-delay: -0.32s;
}

.typing-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes typingDots {
  0%, 80%, 100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 空状态样式 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--ion-color-medium);
  margin-top: 100px;
}

.empty-icon {
  font-size: 100px;
  margin-bottom: 20px;
  max-width: 100%;
  max-height: 300px;
  color: var(--ion-text-color);
}

.svg-icon {
  width: min(400px, 80vw);
  height: min(400px, 80vw);
  max-width: 400px;
  max-height: 400px;
  background-color: var(--ion-text-color);
  mask: url('@/assets/gun.svg') no-repeat center;
  mask-size: contain;
  -webkit-mask: url('@/assets/gun.svg') no-repeat center;
  -webkit-mask-size: contain;
  margin: 0 auto 30px auto;
  transition: all 0.3s ease;
  cursor: pointer;
}

.svg-icon:hover {
  background-color: var(--ion-text-color);
  transform: scale(1.05);
}

.empty-state h3 {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 12px 0;
  color: var(--ion-text-color);
}

.empty-state p {
  font-size: 16px;
  line-height: 1.5;
  margin: 0 0 8px 0;
  opacity: 0.8;
}

.model-warning {
  color: var(--ion-color-warning) !important;
  font-weight: 500;
  margin-top: 16px !important;
  padding: 8px 16px;
  background: rgba(var(--ion-color-warning-rgb), 0.1);
  border-radius: 8px;
  border: 1px solid rgba(var(--ion-color-warning-rgb), 0.3);
}

.model-warning ion-icon {
  margin-right: 8px;
  vertical-align: middle;
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

.api-input-item {
  --padding-start: 0;
  --padding-end: 0;
  margin-bottom: 16px;
}

.api-input {
  --padding-start: 16px;
  --padding-end: 16px;
  --background: var(--ion-color-step-50);
  --border-radius: 8px;
  border: 1px solid var(--ion-color-step-150);
  font-size: 14px;
}

.temperature-range {
  margin-top: 8px;
  padding: 0 16px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .message-bubble {
    max-width: 85%;
  }
  
  .messages-container {
    padding: 12px;
    padding-bottom: 220px; /* 移动端需要更多底部空间 */
  }
  
  .svg-icon {
    width: min(250px, 70vw);
    height: min(250px, 70vw);
    margin-bottom: 20px;
  }
}

/* 标题栏样式 */
.title-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.main-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--ion-text-color);
}

.model-name {
  font-size: 12px;
  font-weight: 400;
  color: var(--ion-color-medium);
  opacity: 0.8;
  background: rgba(var(--ion-color-primary-rgb), 0.1);
  padding: 2px 8px;
  border-radius: 10px;
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.2);
}

/* 侧边栏样式 */
.menu-content {
  --background: var(--ion-background-color);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.conversation-list-container {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.conversation-list {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  margin: 0;
}

.conversation-item {
  width: 100%;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 72px;
}

.conversation-main {
  flex: 1;
  min-width: 0; /* 允许文本截断 */
}

.conversation-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 4px 0;
  color: var(--ion-text-color);
  line-height: 1.3;
}

.conversation-preview {
  font-size: 14px;
  color: var(--ion-color-medium);
  margin: 0 0 4px 0;
  line-height: 1.2;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.conversation-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.conversation-time {
  font-size: 12px;
  color: var(--ion-color-medium);
  opacity: 0.7;
}

.conversation-model {
  font-size: 10px;
  color: var(--ion-color-primary);
  background: rgba(var(--ion-color-primary-rgb), 0.1);
  padding: 2px 6px;
  border-radius: 8px;
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.2);
}

.delete-button {
  --color: var(--ion-color-medium);
  --padding-start: 8px;
  --padding-end: 8px;
  margin-left: 8px;
  min-width: 40px;
  height: 40px;
}

.delete-button:hover {
  --color: var(--ion-color-danger);
}

.conversation-checkbox {
  margin-right: 12px;
  --color-checked: var(--ion-color-primary);
}

.edit-mode {
  --background: var(--ion-color-step-50);
}

.bulk-actions {
  padding: 16px;
  background: var(--ion-background-color);
  border-top: 1px solid var(--ion-color-step-150);
}

.empty-hint {
  font-size: 14px;
  margin-top: 8px !important;
  opacity: 0.6;
}

.active-conversation {
  --background: rgba(var(--ion-color-primary-rgb), 0.1);
  --color: var(--ion-color-primary);
  border-left: 3px solid var(--ion-color-primary);
}

.active-conversation .conversation-title {
  color: var(--ion-color-primary);
}

.empty-history {
  text-align: center;
  padding: 60px 20px;
  color: var(--ion-color-medium);
}

.empty-history .empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-history p {
  font-size: 16px;
  margin: 0;
  opacity: 0.8;
}

/* 响应式设计 - 更新 */
@media (max-width: 768px) {
  .title-content {
    gap: 1px;
  }
  
  .main-title {
    font-size: 14px;
  }
  
  .model-name {
    font-size: 10px;
    padding: 1px 6px;
  }
  
  .conversation-item {
    padding: 10px 12px;
    min-height: 68px;
  }
  
  .conversation-title {
    font-size: 15px;
  }
  
  .conversation-preview {
    font-size: 13px;
  }
  
  .conversation-model {
    font-size: 9px;
    padding: 1px 4px;
  }
  
  .delete-button {
    min-width: 36px;
    height: 36px;
    --padding-start: 6px;
    --padding-end: 6px;
  }
  
  .bulk-actions {
    padding: 12px;
  }
  
  .conversation-checkbox {
    margin-right: 8px;
  }
}

/* 暗色主题适配 */
@media (prefers-color-scheme: dark) {
  .message-bubble {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }
  
  .ai-message .message-bubble {
    background: var(--ion-color-step-100);
    border-color: var(--ion-color-step-200);
  }
  
  .model-warning {
    background: rgba(var(--ion-color-warning-rgb), 0.15);
    border-color: rgba(var(--ion-color-warning-rgb), 0.4);
  }
  
  .api-input {
    --background: var(--ion-color-step-100);
    border-color: var(--ion-color-step-200);
  }
  
  .model-name {
    background: rgba(var(--ion-color-primary-rgb), 0.15);
    border-color: rgba(var(--ion-color-primary-rgb), 0.3);
  }
  
  .active-conversation {
    --background: rgba(var(--ion-color-primary-rgb), 0.15);
  }
  
  .conversation-model {
    background: rgba(var(--ion-color-primary-rgb), 0.15);
    border-color: rgba(var(--ion-color-primary-rgb), 0.3);
  }
  
  .edit-mode {
    --background: var(--ion-color-step-100);
  }
  
  .bulk-actions {
    background: var(--ion-background-color);
    border-color: var(--ion-color-step-200);
  }
  
  .delete-button:hover {
    --color: var(--ion-color-danger);
  }
  
  .svg-icon:hover {
    background-color: var(--ion-color-primary);
  }
}

/* 大屏模式底部输入框样式 */
.bottom-container-desktop {
  position: fixed;
  bottom: 24px;
  left: 50%;
  display: flex;
  align-items: center;
  z-index: 1000;
  width: auto;
  max-width: 600px;
  /* 与对话内容动画同步 */
  transition: transform 0.3s ease;
}

.bottom-input-container-desktop {
  display: flex;
  align-items: center;
  position: relative;
  background-color: var(--ion-background-color);
  border-radius: 25px;
  padding: 6px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border: 1px solid var(--ion-color-step-150);
  /* 与对话内容动画同步 */
  transition: all 0.3s ease;
  overflow: visible;
  width: 400px;
}

.bottom-input-desktop {
  padding: 12px 20px;
  border-radius: 20px;
  background-color: transparent;
  border: none;
  outline: none;
  color: var(--ion-text-color);
  font-size: 16px;
  width: 350px;
  text-align: left;
  transition: width 0.3s ease, padding-right 0.3s ease;
  flex-shrink: 0;
  box-sizing: border-box;
}

.bottom-input-desktop.with-button {
  width: 340px;
  padding-right: 12px;
}

.bottom-input-desktop::placeholder {
  color: var(--ion-text-color);
  opacity: 0.6;
}

.button-container-desktop {
  width: 44px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  flex-grow: 0;
  overflow: visible;
  position: relative;
  margin-left: 4px;
}

.action-button-desktop {
  border: none;
  border-radius: 50% !important;
  width: 40px !important;
  height: 40px !important;
  min-width: 40px !important;
  min-height: 40px !important;
  max-width: 40px !important;
  max-height: 40px !important;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
  flex-grow: 0;
  box-sizing: border-box;
}

.action-button-desktop:hover {
  transform: scale(1.05);
}

.action-button-desktop:active {
  transform: scale(0.95);
}

.action-button-desktop.send-button {
  background: var(--ion-color-primary);
  padding: 10px !important;
}

.action-button-desktop.stop-button {
  background: var(--ion-color-danger);
  padding: 10px !important;
}

.action-button-desktop ion-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 20px;
}

/* 按钮过渡动画（桌面版） */
.button-fade-enter-active {
  transition: all 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.175);
}

.button-fade-leave-active {
  transition: all 0.2s cubic-bezier(0.55, 0.055, 0.675, 0.19);
}

.button-fade-enter-from {
  opacity: 0;
  transform: translateX(20px) scale(0.7);
}

.button-fade-leave-to {
  opacity: 0;
  transform: translateX(-15px) scale(0.7);
}

.button-fade-enter-to,
.button-fade-leave-from {
  opacity: 1;
  transform: translateX(0) scale(1);
}

/* 大屏模式特定样式 */
@media (min-width: 768px) {
  .bottom-container-desktop {
    bottom: 30px;
  }
  
  .bottom-input-container-desktop {
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    background-color: rgba(var(--ion-background-color-rgb), 0.9);
  }
}

/* 暗色主题适配（桌面版） */
@media (prefers-color-scheme: dark) {
  .bottom-input-container-desktop {
    background-color: rgba(var(--ion-background-color-rgb), 0.95);
    border-color: var(--ion-color-step-200);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }
}
</style> 