<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
        <p class="model-id">{{ modelId }}</p>
        </ion-buttons>
   
        <ion-buttons slot="end">
             <ion-button @click="newConversation">
            <ion-icon :icon="addCircleOutline"></ion-icon>
        </ion-button>
          <ion-button @click="toggleSidebar(true)">
           <ion-icon :icon="chatboxEllipsesOutline"></ion-icon>
        </ion-button>
         
          <!-- <ion-button @click="clearChat" :disabled="isStreaming">清空</ion-button> -->
          <ion-button @click="openSettings">
        <ion-icon :icon="settingsOutline"></ion-icon>    
        </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <!-- 历史侧边栏 -->
      <div v-if="sidebarOpen" class="history-sidebar">
        <div class="history-header">
          <div class="title"></div>
          <ion-buttons>
            <ion-button size="small" @click="toggleSidebar(false)">Close</ion-button>
          </ion-buttons>
        </div>
        <!-- <div style="padding: 6px 8px; display:flex; gap:8px;">
          <ion-button size="small" @click="newConversation">{{ t('webllm.sidebar.newConversation') }}</ion-button>
          <ion-button size="small" color="medium" @click="refreshList">{{ t('webllm.sidebar.refresh') }}</ion-button>
        </div> -->
        <ion-list>
          <ion-item v-for="conv in conversations" :key="conv.id" lines="none">
            <ion-label @click="loadConversation(conv.id)" style="cursor:pointer;">
              <div style="font-weight:600">{{ conv.title || conv.id }}</div>
              <div style="font-size:12px;color:var(--ion-color-medium)">{{ formatTimestamp(conv.timestamp) }}</div>
            </ion-label>
            <ion-buttons slot="end">
              <ion-button size="small" @click="exportConv(conv)">{{ t('webllm.sidebar.export') }}</ion-button>
              <ion-button size="small" color="danger" @click="removeConversation(conv.id)">{{ t('webllm.sidebar.delete') }}</ion-button>
            </ion-buttons>
          </ion-item>
          <ion-item v-if="conversations.length === 0" lines="none">
            <ion-label>{{ t('webllm.sidebar.empty') }}</ion-label>
          </ion-item>
        </ion-list>
      </div>

      <div class="container">
        <div v-if="!hasWebGPU" class="warning">
          {{ t('webllm.warning.noWebGPU') }}
        </div>

        <div class="controls">
          <ion-item lines="none">
            <ion-label>
              <div>{{ t('webllm.controls.currentModel') }} {{ modelId }}</div>
              <div>{{ t('webllm.controls.runtimeMode') }} {{ runtimeMode }}</div>
            </ion-label>
          </ion-item>
          <!-- <ion-item lines="none" class="model-item">
            <ion-label>{{ t('webllm.controls.model') }}</ion-label>
            <ion-input v-model="modelInput" :placeholder="t('webllm.controls.modelPlaceholder')" />
            <ion-button @click="applyModel" :disabled="isInitializing">{{ t('webllm.common.apply') }}</ion-button>
          </ion-item> -->

          <!-- <div v-if="isInitializing" class="progress">
            <ion-progress-bar :value="(initProgress?.progress ?? 0)" />
            <div class="progress-text">{{ initProgress?.text || 'Loading...' }}</div>
          </div>

          <div v-if="!engineReady" class="consent">
            <div class="consent-text">{{ t('webllm.consent.tip') }}</div>
            <ion-buttons>
              <ion-button color="primary" @click="requestConsent">{{ t('webllm.consent.loadDefault') }}</ion-button>
              <ion-button color="medium" @click="openSettings">{{ t('webllm.settings.more') }}</ion-button>
            </ion-buttons>
          </div> -->
        </div>

        <ion-list class="message-list">
          <ion-item v-for="(msg, idx) in messages" :key="idx" lines="none">
            <div :class="['bubble', msg.role, msg.streaming ? 'streaming' : '']">
              <div class="content" v-html="formatContent(msg.content)"></div>
            </div>
          </ion-item>
        </ion-list>
      </div>
    </ion-content>

    <ion-footer>
      <ion-toolbar>
        <!-- 图片预览（移动到输入框上方） -->
        <div v-if="attachedImageDataUrl" class="attachment-preview">
          <img :src="attachedImageDataUrl" alt="" />
          <ion-button size="small" fill="clear" color="medium" @click="clearAttachment" class="remove-attachment">
            <ion-icon :icon="closeOutline"></ion-icon>
            <span>Cancel</span>
          </ion-button>
        </div>
        <div class="input-bar">
              <ion-button fill="clear" class="image-upload-button">
              <label style="cursor:pointer; display:flex; align-items:center;">
                <ion-icon  :icon="imageOutline"></ion-icon>
                <input type="file" accept="image/*" style="display:none" @change="onAttachImage" />
              </label>
            </ion-button>
          <ion-textarea
            v-model="inputText"
            auto-grow
            :rows="1"
            placeholder="Ask any..."
            :disabled="isStreaming"
          />
        

            <!-- 发送/停止：使用过渡与图标按钮 -->
            <div class="button-container">
              <transition name="button-fade" mode="out-in">
                <ion-button
                  v-if="isStreaming"
                  key="stop"
              
                  fill="solid"
                  @click="stopStreaming"
                  class="stop-button action-button"
                >
                  <ion-icon :icon="stopOutline"></ion-icon>
                </ion-button>
                <ion-button
                  v-else
                  key="send"
                  color="primary"
                  fill="solid"
                  :disabled="!canSend"
                  @click="send"
                  class="send-button action-button"
                >
                  <ion-icon :icon="sendOutline"></ion-icon>
                </ion-button>
              </transition>
            </div>
          </div>
    
      </ion-toolbar>
    </ion-footer>

    <!-- 设置模态 -->
    <ion-modal :is-open="isSettingsOpen" @didDismiss="closeSettings">
      <ion-header>
        <ion-toolbar>
          <ion-title>{{ t('webllm.settings.title') }}</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="closeSettings">{{ t('webllm.settings.close') }}</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <div class="settings-wrap">
          <ion-list>
            <ion-item lines="full">
              <ion-label>{{ t('webllm.settings.runtimeMode') }}</ion-label>
            </ion-item>
            <ion-item lines="none">
              <ion-segment :value="runtimePreference" @ionChange="onRuntimeChange">
                <ion-segment-button value="auto">
                  <ion-label>Auto</ion-label>
                </ion-segment-button>
                <ion-segment-button value="gpu">
                  <ion-label>GPU</ion-label>
                </ion-segment-button>
                <ion-segment-button value="cpu">
                  <ion-label>CPU</ion-label>
                </ion-segment-button>
              </ion-segment>
            </ion-item>
            <ion-item>
              <ion-label>{{ t('webllm.settings.webgpuAvailable') }}</ion-label>
              <div>{{ hasWebGPU ? t('webllm.common.available') : t('webllm.common.unavailable') }}</div>
            </ion-item>
          </ion-list>

          <ion-list>
            <ion-item lines="full">
              <ion-label>{{ t('webllm.settings.installedModels') }}</ion-label>
            </ion-item>
            <ion-item v-if="installedModels.length === 0" lines="none">
              <ion-label>{{ t('webllm.settings.noInstalledModels') }}</ion-label>
            </ion-item>
            <ion-item v-for="mid in installedModels" :key="mid" lines="none">
              <ion-label>
                {{ mid }}
                <ion-badge v-if="mid === modelId" color="success" style="margin-left:8px;">{{ t('webllm.settings.inUse') }}</ion-badge>
              </ion-label>
              <ion-buttons slot="end">
                <ion-button @click="useInstalled(mid)">{{ t('webllm.settings.use') }}</ion-button>
                <ion-button color="danger" @click="deleteInstalled(mid)">{{ t('webllm.settings.delete') }}</ion-button>
              </ion-buttons>
            </ion-item>
          </ion-list>

          <ion-list>
            <ion-item lines="full">
              <ion-label>{{ t('webllm.settings.builtInModels') }}</ion-label>
            </ion-item>
            <ion-item v-for="m in builtInModels" :key="m.id" lines="none">
              <ion-label>
                <div style="font-weight:600">{{ m.name }}</div>
                <div style="font-size:12px;color:var(--ion-color-medium)">{{ m.id }} · {{ m.sizeMB }} · {{ m.notes }}</div>
              </ion-label>
              <ion-buttons slot="end">
                <ion-button @click="applyBuiltIn(m.id)" :disabled="isInitializing">{{ t('webllm.settings.use') }}</ion-button>
                <ion-badge v-if="m.id === modelId" color="success" style="margin-left:8px;">{{ t('webllm.settings.inUse') }}</ion-badge>
              </ion-buttons>
            </ion-item>
            <!-- 自定义远程模型拉取输入框：置于本地导入项上方 -->
            <ion-item lines="none">
              <ion-label>{{ t('webllm.settings.pullRemoteModel') }}</ion-label>
              <ion-input v-model="pullModelId" :placeholder="t('webllm.settings.remoteModelPlaceholder')" />
              <ion-buttons slot="end">
                <ion-button @click="pullModel" :disabled="isInitializing">{{ t('webllm.settings.pullAndUse') }}</ion-button>
              </ion-buttons>
            </ion-item>
            <ion-item lines="none">
              <ion-label>{{ t('webllm.settings.importLocal') }}</ion-label>
              <input type="file" @change="onLocalImport" accept=".bin,.mlc,.json" />
            </ion-item>
          </ion-list>

          <ion-list>
            <ion-item lines="full">
              <ion-label>{{ t('webllm.settings.generationParams') }}</ion-label>
            </ion-item>
            <ion-item>
              <ion-label>Temperature</ion-label>
              <ion-input type="number" step="0.1" min="0" max="2" v-model="temperatureStr" />
            </ion-item>
            <ion-item>
              <ion-label>Top P</ion-label>
              <ion-input type="number" step="0.05" min="0" max="1" v-model="topPStr" />
            </ion-item>
            <ion-item>
              <ion-label>Max Tokens</ion-label>
              <ion-input type="number" step="32" min="64" max="4096" v-model="maxTokensStr" />
            </ion-item>
            <ion-item>
              <ion-label>Presence Penalty</ion-label>
              <ion-input type="number" step="0.1" min="-2" max="2" v-model="presencePenaltyStr" />
            </ion-item>
            <ion-item>
              <ion-label>Frequency Penalty</ion-label>
              <ion-input type="number" step="0.1" min="-2" max="2" v-model="frequencyPenaltyStr" />
            </ion-item>
            <ion-item>
              <ion-label>Context Window</ion-label>
              <ion-input type="number" step="64" min="512" max="131072" v-model="contextWindowSizeStr" />
            </ion-item>
            <ion-item>
              <ion-label>{{ t('webllm.settings.enableThinking') }}</ion-label>
              <ion-toggle :checked="enableThinking" @ionChange="onThinkingToggle" />
            </ion-item>
            <ion-item>
              <ion-label>{{ t('webllm.settings.logLevel') }}</ion-label>
              <ion-segment :value="logLevel" @ionChange="onLogLevelChange">
                <ion-segment-button value="TRACE"><ion-label>TRACE</ion-label></ion-segment-button>
                <ion-segment-button value="DEBUG"><ion-label>DEBUG</ion-label></ion-segment-button>
                <ion-segment-button value="INFO"><ion-label>INFO</ion-label></ion-segment-button>
                <ion-segment-button value="WARN"><ion-label>WARN</ion-label></ion-segment-button>
                <ion-segment-button value="ERROR"><ion-label>ERROR</ion-label></ion-segment-button>
                <ion-segment-button value="SILENT"><ion-label>SILENT</ion-label></ion-segment-button>
              </ion-segment>
            </ion-item>
          </ion-list>

          <!-- 自动回复设置 -->
          <ion-list>
            <ion-item lines="full">
              <ion-label>{{ t('webllm.autoreply.title') }}</ion-label>
            </ion-item>
            <ion-item>
              <ion-label>{{ t('webllm.autoreply.replyAll') }}</ion-label>
              <ion-toggle :checked="autoReplyAllEnabled" @ionChange="onAutoReplyAllToggle" />
            </ion-item>
            <ion-item>
              <ion-label>{{ t('webllm.autoreply.targeted') }}</ion-label>
              <ion-toggle :checked="targetedReplyEnabled" @ionChange="onTargetedReplyToggle" />
            </ion-item>
            <ion-item v-if="targetedReplyEnabled" lines="none">
              <ion-label>{{ t('webllm.autoreply.selectBuddies') }}</ion-label>
            </ion-item>
            <ion-item v-if="targetedReplyEnabled" v-for="friend in buddyList" :key="friend.pub" lines="none">
              <ion-label>{{ getAliasRealtime(friend.pub) || friend.pub.slice(0, 8) + '…' }}</ion-label>
              <ion-checkbox :checked="targetedBuddyPubs.includes(friend.pub)" @ionChange="(ev) => onToggleBuddy(friend.pub, ev)" />
            </ion-item>
          </ion-list>
        </div>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFooter,
  IonButtons,
  IonBackButton,
  IonButton,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonList,
  IonProgressBar,
  IonModal,
  IonToggle,
  IonSegment,
  IonSegmentButton,
  IonBadge,
  IonCheckbox,
  IonIcon,
} from '@ionic/vue';
import { ref, computed, nextTick, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useWebLLMChat } from '@/composables/useWebLLMChat';
import { getTalkFlowCore } from '@/composables/TalkFlowCore';
import { sendOutline, stopOutline, imageOutline, closeOutline, settingsOutline, createOutline, addCircleOutline, chatboxEllipsesOutline } from 'ionicons/icons';
import {
  useChatHistory,
  addConversation,
  updateConversation,
  deleteConversation,
  getConversation,
  generateConversationId,
  deriveTitleFromMessages,
} from '@/composables/useChatHistory';

// i18n translation function
const { t } = useI18n();

const {
  isInitializing,
  initProgress,
  hasWebGPU,
  runtimeMode,
  runtimePreference,
  builtInModels,
  messages,
  isStreaming,
  modelId,
  initEngine,
  reloadModel,
  clearChat,
  sendMessage,
  stopStreaming,
  setRuntimePreference,
  installedModels,
  removeInstalledModel,
  temperature,
  topP,
  maxTokens,
  setTemperature,
  setTopP,
  setMaxTokens,
  presencePenalty,
  frequencyPenalty,
  contextWindowSize,
  enableThinking,
  logLevel,
  setPresencePenalty,
  setFrequencyPenalty,
  setContextWindowSize,
  setEnableThinking,
  setLogLevel,
  attachImageFile,
  attachedImageDataUrl,
  // auto-reply settings
  autoReplyAllEnabled,
  targetedReplyEnabled,
  targetedBuddyPubs,
  setAutoReplyAllEnabled,
  setTargetedReplyEnabled,
  setTargetedBuddyPubs,
} = useWebLLMChat();

// 好友列表（用于针对性自动回复选择）
const talkFlow = getTalkFlowCore();
const { buddyList, getAliasRealtime } = talkFlow;

const inputText = ref('');
const canSend = computed(() => inputText.value.trim().length > 0);
const modelInput = ref<string>('');
const engineReady = ref(false);
const isSettingsOpen = ref(false);
const pullModelId = ref('');
const userConsented = ref<boolean>(localStorage.getItem('webllm_user_consented') === 'true');

// 历史记录管理
const { conversations, sidebarOpen, refreshList, toggleSidebar, exportConversation } = useChatHistory();
const currentConversationId = ref<string>(generateConversationId());
const hasBeenSaved = ref<boolean>(false);

// 数值输入的字符串代理，确保 v-model 工作并同步到 composable
const temperatureStr = computed({
  get: () => String(temperature.value),
  set: (v: string) => setTemperature(Math.max(0, Math.min(2, Number(v) || 0)))
});
const topPStr = computed({
  get: () => String(topP.value),
  set: (v: string) => setTopP(Math.max(0, Math.min(1, Number(v) || 0)))
});
const maxTokensStr = computed({
  get: () => String(maxTokens.value),
  set: (v: string) => setMaxTokens(Math.max(64, Math.min(4096, Math.round(Number(v) || 64))))
});
const presencePenaltyStr = computed({
  get: () => String(presencePenalty.value),
  set: (v: string) => setPresencePenalty(Math.max(-2, Math.min(2, Number(v) || 0)))
});
const frequencyPenaltyStr = computed({
  get: () => String(frequencyPenalty.value),
  set: (v: string) => setFrequencyPenalty(Math.max(-2, Math.min(2, Number(v) || 0)))
});
const contextWindowSizeStr = computed({
  get: () => String(contextWindowSize.value),
  set: (v: string) => setContextWindowSize(Math.max(512, Math.min(131072, Math.round(Number(v) || 4096))))
});

function openSettings() {
  isSettingsOpen.value = true;
}
function closeSettings() {
  isSettingsOpen.value = false;
}

function formatContent(text: string) {
  // Basic escape to avoid raw HTML issues
  return text
    .replace(/\n/g, '<br/>');
}

async function send() {
  const text = inputText.value.trim();
  if (!text) return;
  inputText.value = '';
  // 若首次发送且尚未同意模型下载，则触发同意流程
  if (!engineReady.value && !userConsented.value) {
    await ensureConsent(async () => {
      engineReady.value = true; // 允许发送并隐藏提示区
    });
  }
  // 先基于草稿消息进行首存，以避免用户立即刷新导致丢失
  const draftMessages = toPlainMessages([...(messages as any).value]);
  draftMessages.push({ role: 'user', content: text, timestamp: Date.now() } as any);
  if (!hasBeenSaved.value) {
    await addConversation({
      id: currentConversationId.value,
      title: deriveTitleFromMessages(draftMessages),
      timestamp: Date.now(),
      messages: draftMessages,
    } as any);
    hasBeenSaved.value = true;
    await refreshList();
  }

  await sendMessage(text);
  await nextTick();

  // 流式结束或更新时再精确更新到最新消息
  const conv = {
    id: currentConversationId.value,
    title: deriveTitleFromMessages(messages.value),
    timestamp: Date.now(),
    messages: toPlainMessages(messages.value as any),
  };
  await updateConversation(conv);
  await refreshList();
}

// 将消息转换为可持久化的纯对象，避免响应式 Proxy 写入导致异常
function toPlainMessages(msgs: any[]): any[] {
  try {
    return (msgs || []).map((m: any) => ({
      role: m.role,
      content: String(m.content ?? ''),
      timestamp: Number(m.timestamp ?? Date.now()),
      streaming: false, // 持久化时不保留流式标记
    }));
  } catch {
    // 兜底：JSON 深拷贝
    return JSON.parse(JSON.stringify(msgs || []));
  }
}

async function applyModel() {
  const id = modelInput.value.trim() || modelId.value;
  await ensureConsent(async () => {
    await reloadModel(id);
    engineReady.value = true;
  });
}

async function applyBuiltIn(id: string) {
  await ensureConsent(async () => {
    await reloadModel(id);
    engineReady.value = true;
  });
}

onMounted(async () => {
  // 默认不自动下载模型，需用户同意并手动加载
  await refreshList();
});

// 当消息变化时，如果当前会话已保存，则持续更新到 IndexedDB（覆盖最新内容）
watch(messages, async (val) => {
  try {
    if (!hasBeenSaved.value) return;
    await updateConversation({
      id: currentConversationId.value,
      title: deriveTitleFromMessages(val as any),
      timestamp: Date.now(),
      messages: toPlainMessages(val as any),
    } as any);
    await refreshList();
  } catch {}
}, { deep: true });

async function requestConsent() {
  await ensureConsent(async () => {
    await initEngine(modelId.value);
    engineReady.value = true;
  });
}

async function ensureConsent(task: () => Promise<void>) {
  if (userConsented.value) {
    await task();
    return;
  }
  const ok = window.confirm(t('webllm.consent.confirm'));
  if (ok) {
    localStorage.setItem('webllm_user_consented', 'true');
    userConsented.value = true;
    await task();
  }
}

function onRuntimeChange(ev: CustomEvent) {
  const value = (ev as any).detail?.value as 'auto' | 'gpu' | 'cpu' | undefined;
  if (!value) return;
  setRuntimePreference(value);
}

async function useInstalled(mid: string) {
  await ensureConsent(async () => {
    await reloadModel(mid);
    engineReady.value = true;
  });
}

async function deleteInstalled(mid: string) {
  await removeInstalledModel(mid);
}

async function pullModel() {
  const id = pullModelId.value.trim();
  if (!id) return;
  await ensureConsent(async () => {
    await reloadModel(id);
    engineReady.value = true;
  });
}

function onLocalImport(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  alert(t('webllm.import.notSupported'));
}

async function onAttachImage(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  await attachImageFile(file);
}

function clearAttachment() {
  // 简单清理：重新设定为空
  (attachedImageDataUrl as any).value = null;
}

function onThinkingToggle(ev: CustomEvent) {
  const checked = (ev as any).detail?.checked as boolean;
  setEnableThinking(!!checked);
}

function onLogLevelChange(ev: CustomEvent) {
  const value = (ev as any).detail?.value as string | undefined;
  if (value) setLogLevel(value);
}

// 自动回复设置事件
function onAutoReplyAllToggle(ev: CustomEvent) {
  const checked = (ev as any).detail?.checked as boolean;
  setAutoReplyAllEnabled(!!checked);
}
function onTargetedReplyToggle(ev: CustomEvent) {
  const checked = (ev as any).detail?.checked as boolean;
  setTargetedReplyEnabled(!!checked);
}
function onToggleBuddy(pub: string, ev: CustomEvent) {
  const checked = (ev as any).detail?.checked as boolean;
  const set = new Set<string>(targetedBuddyPubs.value);
  if (checked) set.add(pub); else set.delete(pub);
  setTargetedBuddyPubs(Array.from(set));
}

// 历史记录相关方法
function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

async function loadConversation(id: string) {
  const conv = await getConversation(id);
  if (!conv) return;
  // 加载消息到当前聊天
  (messages as any).value = [...conv.messages];
  currentConversationId.value = id;
  hasBeenSaved.value = true;
  toggleSidebar(false);
}

async function removeConversation(id: string) {
  await deleteConversation(id);
  await refreshList();
  // 如果删除的是当前会话，则重置为新会话且不在列表中
  if (id === currentConversationId.value) {
    (messages as any).value = [];
    currentConversationId.value = generateConversationId();
    hasBeenSaved.value = false;
  }
}

function exportConv(conv: any) {
  exportConversation(conv);
}

function newConversation() {
  (messages as any).value = [];
  currentConversationId.value = generateConversationId();
  hasBeenSaved.value = false;
}
</script>

<style scoped>
.container {
  max-width: 900px;
  margin: 0 auto;
  padding: 12px;
}
.warning {
  background: #fff7e6;
  color: #ad6800;
  border: 1px solid #ffd591;
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 8px;
}
.controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 8px;
}
.model-item {
  --padding-start: 0;
}
.consent { display:flex; align-items:center; gap:8px; }
.consent-text { color: var(--ion-color-medium); }
.progress {
  display: flex;
  align-items: center;
  gap: 8px;
}
.progress-text {
  font-size: 12px;
  color: var(--ion-color-medium);
}
.message-list {
  background: transparent;
}
.bubble {
  max-width: 100%;
  display: inline-block;
  padding: 10px 12px;
  border-radius: 14px;
  margin: 5px 0;
}
.bubble.user {
  background: #0165d7;
  color: #fff;
  border-top-right-radius: 4px;
  margin-left: auto; /* 右侧对齐 */
}
.bubble.assistant {
  background: #f1f2f3;
  color: #222;
  border-top-left-radius: 4px;
  margin-right: auto; /* 左侧对齐 */
}
.bubble.system {
  background: #e6f4ff;
  color: #1d39c4;
}
.bubble.streaming {
  animation: pulse 1.2s infinite ease-in-out;
}
@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.75; }
  100% { opacity: 1; }
}
.content {
  word-wrap: break-word;
  white-space: pre-wrap;
}
.input-bar {
  display: flex;
  gap: 8px;
  align-items: flex-end;

}
.input-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.button-container {
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-button {
  width: 50px;
  height: 50px;
  --border-radius: 50%;
  padding: 0;
  --padding-start: 0;
  --padding-end: 0;
  margin:0 5px;
}
.action-button ion-icon {
  display: flex;
  align-items: center;
  justify-content: center;

  font-size: 20px;

}
/* 发送/停止按钮过渡动画 */
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

/* 图片预览区域 */
.attachment-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
}
.attachment-preview img {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--ion-color-step-150);
}
.remove-attachment {
  --padding-start: 6px;
  --padding-end: 6px;
}
.settings-wrap { padding: 12px; }


/* 历史侧边栏样式 */
.history-sidebar {
  position: fixed;
  top: 56px; /* below header */
  right: 0;
  width: 320px;
  height: calc(100vh - 56px);
  background: #fff;
  box-shadow: -2px 0 8px rgba(0,0,0,0.08);
  border-left: 1px solid #eee;
  z-index: 1000;
  padding: 8px;
}
.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
}
.history-header .title {
  font-weight: 600;
}
.model-id{
    font-size: 12px;
    color: var(--ion-color-medium);
    margin-left:10px;
}
</style>
const { t } = useI18n();
