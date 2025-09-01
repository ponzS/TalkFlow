<template>

  <ion-page v-if="!hasPadChat">
  <ion-content :fullscreen="true" style="width:100%;height:100%;">
      <ponzsColor1></ponzsColor1>
  </ion-content>
  
  </ion-page>
  
  
  
  <ion-page v-if="hasPadChat">
    <ion-header :translucent="true" collapse="fade" class="ion-no-border toolbar1">
      <ion-toolbar class="toolbar1">
        <ion-buttons slot="start">
          <div color="dark" @click="closeWindow">
            <ion-icon style="font-size:25px;margin-left:10px;" color="dark" :ios="chevronBackOutline" :md="chevronBackOutline"></ion-icon>
          </div>
        </ion-buttons>
        <ion-title>
          <span class="chat-name">{{ getDisplayName(currentChatPub!) }}</span>
        </ion-title>
        <ion-buttons slot="end">
          <div @click="goToFriendProfile">
            <img
              v-if="userAvatars[currentChatPub!]"
              :src="userAvatars[currentChatPub!]"
              alt=""
              class="gun-avatar"
            />
            <img
              v-else
              :src="getGunAvatar(currentChatPub!)"
              alt=""
              class="gun-avatar"
            />
          </div>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" :scroll-y="false" :style="{ '--content-bottom': keyboardHeight + 'px' }">
      <transition name="fade">
        <div v-if="showOverlay" class="glass-overlay"></div>
      </transition>
      <ion-progress-bar 
        :value="uploadProgress" 
        v-if="uploadProgress > 0" 
        color="primary" 
        style="position: absolute; top: 0; width: 100%;"
      ></ion-progress-bar>
      <!-- 骨架屏 -->
      <div v-if="isLoadingMessages" class="skeleton-container">
        <div class="skeleton-message" v-for="n in 15" :key="n" :class="{ 'my-message': n % 2 === 0 }">
          <template v-if="n % 2 === 0">
            <div class="skeleton-bubble" :style="{ width: `${80 + Math.random() * 120}px` }"></div>
            <div class="skeleton-avatar"></div>
          </template>
          <template v-else>
            <div class="skeleton-avatar"></div>
            <div class="skeleton-bubble" :style="{ width: `${80 + Math.random() * 120}px` }"></div>
          </template>
        </div>
      </div>

      <div v-if="currentChatPub" class="message-container" 
           @touchstart="handleLongPress1($event)"
           @touchend="clearLongPress()"
           @touchmove="clearLongPress()">
        <DynamicScroller
          class="scroller"
          :items="currentChatMessages"
          :buffer="2000" 
          :min-item-size="50"
          key-field="msgId"
          v-slot="{ item, index, active }"
          ref="scrollerRef"
          @scroll.passive="onScrollerScroll"
        >
          <DynamicScrollerItem
            :item="item"
            :active="active"
            :data-index="index"
            :size-dependencies="[
              item.text, 
              item.audioUrl, 
              item.status, 
              item.isSending,
              item.timestamp,
              currentChatMessages.length
            ]"
          >
            <div v-if="isValidMessage(item)" :class="['chat-container', item.from === currentUserPub ? 'my-message' : 'other-message']" style="padding-bottom: 5px;">
              <div class="message-wrapper">
                <div v-if="isSelectMode" class="message-checkbox">
                  <ion-checkbox :checked="selectedMessages.includes(item.msgId!)" @click="toggleMessageSelection(item)"></ion-checkbox>
                </div>
                <template v-if="item.from !== currentUserPub">
                  <img 
                    v-if="userAvatars[item.from] && isLastInSequence(index)" 
                    class="message-avatar" 
                    :src="userAvatars[item.from]" 
                    @click="goToProfile(item.from)" 
                    alt=""
                  />
                  <img 
                    v-else-if="isLastInSequence(index)" 
                    class="message-avatar" 
                    :src="getGunAvatar(item.from)" 
                    alt="" 
                    @click="goToProfile(item.from)" 
                  />
                </template>
                <div :class="['message-bubble', 
                            item.type === 'voice' ? 'voice-bubble' : '',
                            item.status === 'failed' ? 'failed-message' : '',
                            item.status === 'pending' && item.isSending ? 'pending-message' : '',
                            selectedMessage === item.msgId ? 'selected-message' : '']"
                            @click.stop="handleMessageClick(item, $event)">
                  <template v-if="item.type === 'text' && item.text">
                    <!-- 1) 图片 -->
                    <template v-if="isBase64Image(item.text)">
                      <div class="image-container">
                        <photo-provider :photo-closable="true">
                          <photo-consumer :src="item.text" :visible="false" :shouldTransition="false" :toggleOverlay="false" :intro="false">
                            <img v-lazy="item.text" class="media-element" alt="" />
                          </photo-consumer>
                        </photo-provider>
                      </div>
                    </template>
                    <!-- 2) 视频 -->
                    <template v-else-if="isBase64Video(item.text)">
                      <div class="video-container" :data-msgid="item.msgId">
                        <div v-if="!loadedVideos[item.msgId]" class="video-placeholder" @click.stop="loadAndPlayVideo(item)">
                          <p class="video-placeholder-text">Video - E2EE</p>
                          <ion-icon :icon="lockClosedOutline" class="play-icon"></ion-icon>
                        </div>
                        <video v-else controls playsinline class="media-element" :src="item.text" :poster="item.text" preload="none"></video>
                      </div>
                    </template>
                    <!-- 3) 文本 + about + think + Markdown -->
                    <template v-else>
                      <div class="meta-text-container">
                        <!-- about -->
                        <div
                          v-for="(seg, i) in parseMetaSegments(item.text).filter(s => s.type === 'about')"
                          :key="'about'+i"
                          class="about-block native-selectable"
                          :class="item.from === currentUserPub ? 'about-own' : 'about-other'"
                        >
                          <ion-icon :icon="attachOutline" class="meta-icon" />
                          <span v-for="(part, j) in extractUrls(seg.content)" :key="j">
                            <a v-if="part.isUrl" @click.stop="openUrl(part.text)" class="url-link">{{ part.text }}</a>
                            <span v-else>{{ part.text }}</span>
                          </span>
                        </div>
                        <!-- think -->
                        <div
                          v-for="(seg, i) in parseMetaSegments(item.text).filter(s => s.type === 'think')"
                          :key="'think'+i"
                          class="think-block native-selectable"
                          :class="item.from === currentUserPub ? 'think-own' : 'think-other'"
                        >
                          <ion-icon :icon="chatbubbleEllipsesOutline" class="meta-icon" />
                          {{ seg.content }}
                        </div>
                        <!-- normal (with Markdown support and copy button for code) -->
                        <div
                          v-for="(seg, k) in parseMetaSegments(item.text).filter(s => s.type === 'normal')"
                          :key="'normal'+k"
                          class="text-message-content native-selectable markdown-content"
                          v-html="renderMarkdown(seg.content)"
                          v-copy-code
                          @contextmenu.prevent="showDeleteOption(item, $event)"
                        ></div>
                      </div>
                    </template>
                  </template>
                  <template v-else-if="item.type === 'voice'">
                    <div v-if="item.audioUrl" class="voice-bar"
                      :class="{ 
                        'failed-voice': item.status === 'failed', 
                        'pending-voice': item.status === 'pending' && item.isSending,
                        'playing': voiceBar.playingAudio.value === item.msgId 
                      }"
                      :style="{ width: calculateVoiceBarWidth(item.duration || 0) }"
                      @click.stop="isSelectMode ? toggleMessageSelection(item) : toggleVoicePlayback(item)">
                      <span class="duration">
                        <template v-if="remainingMs[item.msgId] != null">
                          {{ (remainingMs[item.msgId] / 1000).toFixed(1) }}"
                        </template>
                        <template v-else>
                          {{ ((item.duration || 0) / 1000).toFixed(1) }}"
                        </template>
                      </span>
                    </div>
                    <p v-else class="error-text">Loading failed-voice</p>
                    <p v-if="voiceBar.transcriptions.value[item.msgId!]" class="transcription">{{ voiceBar.transcriptions.value[item.msgId!] }}</p>
                  </template>
                </div>
                <template v-if="item.from === currentUserPub">
                  <img 
                    v-if="userAvatars[item.from] && isLastInSequence(index)" 
                    class="message-avatar" 
                    :src="userAvatars[item.from]" 
                  />
                  <img 
                    v-else-if="isLastInSequence(index)" 
                    class="message-avatar" 
                    :src="getGunAvatar(item.from)" 
                    alt="" 
                  />
                </template>
              </div>
              <div 
                v-if="isLastInSequence(index)" 
                :class="['timestamp-container', item.from === currentUserPub ? 'my-timestamp' : 'other-timestamp']"
              >
                {{ formatLastTime(item.timestamp) }}
                <ion-button 
                  v-if="item.status === 'failed' && item.from === currentUserPub" 
                  size="small" 
                  fill="clear" 
                  @click="resendMessage(currentChatPub, item)"
                >
                  <ion-icon color="dark" slot="icon-only" :icon="refreshOutline"></ion-icon>
                </ion-button>
                <span 
                  v-else-if="item.status === 'pending' && item.isSending && item.from === currentUserPub" 
                  class="pending-status"
                >{{ $t('sending') }}...</span>
              </div>
            </div>
          </DynamicScrollerItem>
        </DynamicScroller>
      </div>

      <!-- 上下文菜单 -->
      <div v-if="contextMenu.visible" class="context-menu" :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }">
        <ion-button fill="clear" class="context-button" @click="onSelectQuote(contextMenu.item)">
          <ion-icon :icon="attachOutline"></ion-icon>
        </ion-button>
        <ion-button fill="clear" class="context-button" @click="onSelectThink(contextMenu.item)">
          <ion-icon :icon="chatbubbleEllipsesOutline"></ion-icon>
        </ion-button>
        <ion-button fill="clear" class="context-button" @click="copyText(contextMenu.content)" v-if="contextMenu.type === 'text'">
          <ion-icon :icon="copyOutline"></ion-icon>
        </ion-button>
        <ion-button fill="clear" class="context-button" @click="deleteMessage(contextMenu.item)">
          <ion-icon :icon="trashOutline" color="danger"></ion-icon>
        </ion-button>
      </div>

      <transition name="slide-up">
        <div v-if="isSelectMode" class="selection-action-bar">
          <div class="selection-actions">
            <ion-button fill="clear" @click="copySelectedMessages" :disabled="!canCopySelected" class="action-button">
              <ion-icon :icon="copyOutline" :color="canCopySelected ? 'primary' : 'medium'"></ion-icon>
            </ion-button>
            <ion-button fill="clear" @click="deleteSelectedMessages" :disabled="selectedMessages.length === 0" class="action-button">
              <ion-icon :icon="trashOutline" :color="selectedMessages.length > 0 ? 'danger' : 'medium'"></ion-icon>
            </ion-button>
            <ion-button fill="clear" @click="cancelSelectionMode" class="action-button">
              <ion-icon :icon="closeCircleOutline" color="medium"></ion-icon>
            </ion-button>
          </div>
        </div>
      </transition>
    </ion-content>

    <ion-footer collapse="fade" class="ion-no-border">
      <!-- Meta cards display -->
      <div class="meta-cards" v-if="typedMeta.length" :style="{ bottom: keyboardHeight + 'px' }">
        <div v-for="(meta, index) in typedMeta" :key="index" 
             class="meta-card" 
             :class="meta.type === 'about' ? 'about-card' : 'think-card'">
          <ion-icon :icon="meta.type === 'about' ? attachOutline : chatbubbleEllipsesOutline" class="meta-icon" />
          <span class="meta-content">{{ meta.content }}</span>
          <ion-button fill="clear" size="small" @click="removeMeta(index)">
            <ion-icon :icon="closeOutline" color="medium"></ion-icon>
          </ion-button>
        </div>
      </div> 

      <ion-toolbar class="input-toolbar" :style="{ transform: `translateY(-${keyboardHeight}px)` }">
        <!-- Mode selection buttons -->
        <div :class="!showtools ? 'mode-selection' : 'mode-selection1'">
          <ion-button fill="clear" @click="triggerFileUpload">
            <ion-icon color="dark" class="meta-icon" :icon="imageOutline"></ion-icon>
          </ion-button>
          <ion-button fill="clear" @click.prevent.stop="setMode('about')" :color="inputMode === 'about' ? 'primary' : 'medium'">
            <ion-icon :icon="attachOutline" class="meta-icon" />
          </ion-button>
          <ion-button fill="clear" @click.prevent.stop="setMode('think')" :color="inputMode === 'think' ? 'primary' : 'medium'">
            <ion-icon :icon="chatbubbleEllipsesOutline" class="meta-icon" />
          </ion-button>
        </div>

        <div class="input-capsule" ref="capsuleRef" :class="{ 'shift-up': isDrawerOpen }">
          <ion-button class="drawer-toggle" fill="clear" @click="toolsopen">
            <ion-icon color="dark" slot="icon-only" :icon="addCircleOutline"></ion-icon>
          </ion-button>
          <input
            type="file"
            ref="fileInput"
            @change="handleFileUpload"
            accept="image/*,video/*"
            multiple
            style="display: none"
          />
          <div class="input-container">
            <div v-if="!isVoiceMode" class="text-input" :class="inputMode">
              <textarea
                v-model="newMsg"
                @input="adjustHeight"
                @focus="onFocus"
                @blur="onBlur"
                @keydown.enter.prevent="handleEnterKey"
                @submit.prevent
                placeholder=""
                enterkeyhint="send"
                rows="1"
                ref="textInputRef"
              ></textarea>
              <ion-button 
                v-if="inputMode !== 'default'" 
                class="confirm-button" 
                fill="clear" 
                @click="confirmInput"
              >
                <ion-icon slot="icon-only" :icon="checkmarkOutline" color="primary"></ion-icon>
              </ion-button>
            </div>
            <div v-else class="voice-input" :class="{ recording: voiceBar.isRecording.value, 'cancel-recording': cancelRecording }"
              @touchstart="startVoiceRecording" @touchmove="handleVoiceMove" @touchend="stopVoiceRecording" @touchcancel="cancelVoiceRecording">
              <span v-if="voiceBar.isRecording.value">{{ cancelRecording ? 'Cancel the sliding' : 'Recording' }}</span>
            </div>
          </div>
          <ion-button class="action-button" fill="clear" @click="handleActionButtonClick">
            <ion-icon slot="icon-only" color="dark" v-if="!newMsg && !isVoiceMode" :icon="micOutline" key="voice"></ion-icon>
            <ion-icon slot="icon-only" color="dark" v-else-if="newMsg && !isVoiceMode" :icon="returnDownBackOutline" key="send"></ion-icon>
            <ion-icon slot="icon-only" color="dark" v-else-if="isVoiceMode" :icon="chatboxOutline" key="keyboard"></ion-icon>
          </ion-button>
        </div>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted, Directive } from 'vue';
import { useRouter } from 'vue-router';
import { debounce } from 'lodash';
import { getTalkFlowCore, LocalChatMessage, MessageType } from '@/composables/TalkFlowCore';
import { useVoiceBar } from '@/composables/useVoiceBar';
import { 
  IonBackButton, IonButton, IonButtons, IonIcon, IonTitle, IonToolbar, IonHeader, 
  IonFooter, IonPage, IonCheckbox, IonProgressBar 
} from '@ionic/vue';
import {
  ellipsisHorizontal, ellipsisVertical, playOutline, pauseOutline, refreshOutline,
  ellipsisHorizontalCircleOutline, micOutline, chatboxOutline, copyOutline, trashOutline,
  returnDownBackOutline, closeCircleOutline, lockClosedOutline, chevronBackOutline,
  chatbubbleEllipsesOutline, attachOutline, closeOutline, checkmarkOutline,
  addCircleOutline, imageOutline
} from 'ionicons/icons';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import { mountClass, gunAvatar } from 'gun-avatar';
import { Browser } from '@capacitor/browser';
import { useDateFormatter } from '@/composables/useDateFormatter';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import javascript from 'highlight.js/lib/languages/javascript';
import python from 'highlight.js/lib/languages/python';
import java from 'highlight.js/lib/languages/java';
import 'highlight.js/styles/github.css';

// Register languages for highlight.js
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('java', java);

// Extend MarkedOptions to include highlight
declare module 'marked' {
  interface MarkedOptions {
    highlight?: (code: string, lang: string) => string | undefined;
  }
}

// Configure marked to use highlight.js for code blocks
marked.setOptions({
  highlight: (code: string, lang: string) => {
    console.log('Highlighting code:', { lang, code }); // Debug log
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  },
  breaks: true,
  gfm: true,
});

const { formatLastTime } = useDateFormatter();

const chatFlow = getTalkFlowCore();
const voiceBar = useVoiceBar();
const {
  closeChat, currentChatPub, getAliasRealtime, newMsg, sendChat, resendMessage,
  chatMessages, userAvatars, formatTimestamp, currentUserPub, loadMoreChatHistory,
  isLoadingHistory, generateChatId, showToast, retractMessage, triggerLightHaptic,hasPadChat
} = chatFlow;
const { isRecording, recordingDuration, playingAudio, transcriptions, startRecording, 
        stopRecording, sendVoiceMessage, playVoice, stopVoice, transcribeAudio, formatDuration 
} = voiceBar;
mountClass();
import { useTheme } from '@/composables/useTheme';
const { isDark } = useTheme();
const showtools = ref(false);
const uploadProgress = ref(0);
const loadedVideos = ref<{ [msgId: string]: boolean }>({});
const videoRefs = ref<{ [msgId: string]: HTMLVideoElement }>({});
const isLoadingMessages = ref(true);

interface Meta { type: 'about' | 'think'; content: string }

const typedMeta = ref<Meta[]>([]);
const inputMode = ref<'default' | 'about' | 'think'>('default');

const getGunAvatar = (pub: string) => {
  return gunAvatar({
    pub: pub,
    round: false,
    size: 200,
    dark: isDark.value,
    svg: true
  });
};

function toolsopen() {
  showtools.value = !showtools.value;
}

const { setSelectedFriendPub } = getTalkFlowCore();

const goToProfile = (userPub: string) => {
  if (userPub === currentUserPub.value) {
    router.push('/MyMoments');
  } else {
    setSelectedFriendPub(userPub);
    router.push('/FriendMoments');
  }
};

const audioMap = ref<Record<string, HTMLAudioElement>>({});
const router = useRouter();
const keyboardHeight = ref(0);
const isVoiceMode = ref(false);
const inputFocused = ref(false);
const isDrawerOpen = ref(false);
const textInputRef = ref<HTMLTextAreaElement | null>(null);
const capsuleRef = ref<HTMLDivElement | null>(null);
const scrollerRef = ref<any>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const isInitialLoad = ref(true);
let lastScrollTop = 0;
const selectedMessage = ref<string | null>(null);
const cancelRecording = ref(false);
let touchStartY = 0;
const scrollerEl = ref<HTMLElement | null>(null);
const deleteButtonVisible = ref(false);
const deleteButtonPos = ref({ x: 0, y: 0 });
const deleteTargetMessage = ref<LocalChatMessage | null>(null);

const contextMenu = ref<{
  visible: boolean;
  x: number;
  y: number;
  type: MessageType;
  content: string;
  item: LocalChatMessage | null;
  scaleAnimation: boolean;
}>({
  visible: false,
  x: 0,
  y: 0,
  type: 'text',
  content: '',
  item: null,
  scaleAnimation: false
});

// Store MutationObservers in a WeakMap
const observerMap = new WeakMap<HTMLElement, MutationObserver>();

// Custom directive to add copy buttons to code blocks with MutationObserver
const vCopyCode: Directive = {
  mounted(el: HTMLElement) {
    console.log('v-copy-code mounted on element:', el); // Debug log
    const applyCopyButtons = () => {
      const preElements = el.querySelectorAll('pre:not(.code-block-wrapper pre)');
      console.log('Found pre elements:', preElements.length); // Debug log
      preElements.forEach((pre) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'code-block-wrapper';
        pre.parentNode?.insertBefore(wrapper, pre);
        wrapper.appendChild(pre);

        const copyButton = document.createElement('button');
        copyButton.className = 'copy-code-button';
        copyButton.innerHTML = `<ion-icon name="copy-outline"></ion-icon>`;
        copyButton.onclick = () => {
          const code = pre.querySelector('code')?.textContent || '';
          navigator.clipboard.writeText(code).then(() => {
            showToast('Code copied', 'success');
          }).catch(() => {
            showToast('Failed to copy code', 'error');
          });
        };
        wrapper.appendChild(copyButton);
      });
    };

    // Initial application
    applyCopyButtons();

    // Observe DOM changes to handle dynamic v-html updates
    const observer = new MutationObserver(() => {
      console.log('DOM mutated, reapplying copy buttons'); // Debug log
      applyCopyButtons();
    });
    observer.observe(el, { childList: true, subtree: true });

    // Store observer in WeakMap
    observerMap.set(el, observer);
  },
  unmounted(el: HTMLElement) {
    // Cleanup observer
    const observer = observerMap.get(el);
    if (observer) {
      observer.disconnect();
      observerMap.delete(el);
    }
  }
};

onMounted(async () => {
  setTimeout(() => {
    showOverlay.value = false;
  }, 500);

  scrollToBottomInitial();
  scrollerEl.value = scrollerRef.value.$el;

  if (currentChatMessages.value.length > 0) {
    isLoadingMessages.value = false;
  } else {
    isLoadingMessages.value = true;
  }

  try {
    Keyboard.setResizeMode({ mode: KeyboardResize.None });
    Keyboard.addListener('keyboardWillShow', (info: { keyboardHeight: any }) => {
      keyboardHeight.value = info.keyboardHeight;
      inputFocused.value = true;
      nextTick(() => scrollToBottom());
    });
    Keyboard.addListener('keyboardWillHide', () => {
      keyboardHeight.value = 0;
      inputFocused.value = false;
      nextTick(() => {
        if (scrollerRef.value) {
          scrollerRef.value.reset();
          setTimeout(() => scrollToBottom(), 100);
        }
        if (capsuleRef.value) capsuleRef.value.style.transform = 'none';
      });
    });
  } catch (err) {
    console.error('Keyboard setup failed:', err);
  }

  document.addEventListener('click', handleGlobalClick);

  if (currentChatMessages.value.length > 0) {
    const pubKey = currentChatPub.value || '';
    chatMessages.value[pubKey] = chatMessages.value[pubKey].sort((a, b) => (a.id || 0) - (b.id || 0));
    chatMessages.value = { ...chatMessages.value };
    scrollToBottomInitial();
  }

  let menuStabilityInterval = setInterval(() => {
    if (selectedMessage.value && !contextMenu.value.visible) {
      const messageEl = document.querySelector(`.message-bubble[data-msgid="${selectedMessage.value}"]`);
      if (messageEl) {
        const rect = messageEl.getBoundingClientRect();
        const item = currentChatMessages.value.find(msg => msg.msgId === selectedMessage.value);
        if (item) {
          contextMenu.value = {
            visible: true,
            x: rect.left + 20,
            y: rect.top - 50,
            type: item.type,
            content: item.type === 'text' ? item.text || '' : '',
            item,
            scaleAnimation: false
          };
        }
      }
    }
  }, 1000);

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: '50px' }
  );

  nextTick(() => {
    document.querySelectorAll('.video-container').forEach(el => observer.observe(el));
  });

  onUnmounted(() => {
    document.removeEventListener('click', handleGlobalClick);
    closeChat();
    Keyboard.removeAllListeners();
    if (menuStabilityInterval) {
      clearInterval(menuStabilityInterval);
    }
  });
});

function parseMetaSegments(text: string): Array<{ content: string; type: 'normal' | 'think' | 'about' }> {
  const regex = /<(think|about)>([\s\S]*?)<\/\1>/g;
  const segs: { content: string; type: 'normal' | 'think' | 'about' }[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    const [full, tag, inner] = m;
    if (m.index > lastIndex) {
      segs.push({ type: 'normal', content: text.slice(lastIndex, m.index) });
    }
    segs.push({ type: tag === 'think' ? 'think' : 'about', content: inner });
    lastIndex = m.index + full.length;
  }
  if (lastIndex < text.length) {
    segs.push({ type: 'normal', content: text.slice(lastIndex) });
  }
  return segs;
}

function renderMarkdown(content: string): string {
  if (!content) return '';
  const rawHtml = marked(content);
  return DOMPurify.sanitize(rawHtml as any);
}

const isLastInSequence = (index: number) => {
  const currentMessage = currentChatMessages.value[index];
  const nextMessage = currentChatMessages.value[index + 1];
  return !nextMessage || nextMessage.from !== currentMessage.from;
};

const isSelectMode = ref(false);
const selectedMessages = ref<string[]>([]);

let longPressTimer: number | NodeJS.Timeout | null = null;
let longPressItem: LocalChatMessage | null = null;
const LONG_PRESS_DELAY = 400;

const isAtEarliest = computed(() => {
  if (!currentChatPub.value || !currentUserPub.value) return false;
  const oldestMsg = chatMessages.value[currentChatPub.value]?.[0];
  return oldestMsg?.id === 1 || !oldestMsg;
});

const currentChatMessages = computed(() => {
  const pubKey = currentChatPub.value || '';
  const messages = chatMessages.value[pubKey] || [];
  return messages.filter((msg) => isValidMessage(msg));
});

const canCopySelected = computed(() => {
  return selectedMessages.value.length > 0 && 
         selectedMessages.value.some(msgId => {
           const msg = findMessageById(msgId);
           return msg && msg.type === 'text';
         });
});

function findMessageById(msgId: string): LocalChatMessage | undefined {
  if (!currentChatPub.value) return undefined;
  const messages = chatMessages.value[currentChatPub.value] || [];
  return messages.find(msg => msg.msgId === msgId);
}

function toggleMessageSelection(item: LocalChatMessage) {
  if (!item.msgId) return;
  const index = selectedMessages.value.indexOf(item.msgId);
  if (index === -1) {
    selectedMessages.value.push(item.msgId);
  } else {
    selectedMessages.value.splice(index, 1);
  }
}

function handleMessageClick(item: LocalChatMessage, event: MouseEvent) {
  if (isSelectMode.value) {
    toggleMessageSelection(item);
  } else if (item.type === 'text' && !isBase64Image(item.text) && !isBase64Video(item.text)) {
    showContextMenu(item, event);
  }
}

function handleLongPress1(event: TouchEvent) {
  clearLongPress();
  const touch = event.touches[0];
  const node = document.elementFromPoint(touch.clientX, touch.clientY);
  if (node?.closest('.message-bubble')) {
    return;
  }
  longPressTimer = window.setTimeout(() => {
    isSelectMode.value = true;
    triggerLightHaptic();
  }, LONG_PRESS_DELAY);
}

function showContextMenu(item: LocalChatMessage, event: MouseEvent) {
  if (item.type !== 'text') return;
  const rect = (event.target as HTMLElement).getBoundingClientRect();
  contextMenu.value = {
    visible: true,
    x: rect.left + 20,
    y: rect.top - 50,
    type: item.type,
    content: item.text || '',
    item,
    scaleAnimation: true
  };
  selectedMessage.value = item.msgId || null;
  triggerLightHaptic();
}

function onSelectQuote(item: LocalChatMessage | null) {
  if (item && item.text && !typedMeta.value.some(m => m.content === item.text)) {
    typedMeta.value.push({ type: 'about', content: item.text });
    inputMode.value = 'about';
    if (textInputRef.value) {
      textInputRef.value.focus();
    }
  }
  hideContextMenu();
}

function onSelectThink(item: LocalChatMessage | null) {
  if (item && item.text && !typedMeta.value.some(m => m.content === item.text)) {
    typedMeta.value.push({ type: 'think', content: item.text });
    inputMode.value = 'think';
    if (textInputRef.value) {
      textInputRef.value.focus();
    }
  }
  hideContextMenu();
}

function copyText(content: string) {
  navigator.clipboard.writeText(content).then(() => showToast('copied', 'success'));
  hideContextMenu();
}

async function deleteMessage(item: LocalChatMessage | null) {
  if (!item?.msgId || !currentChatPub.value) return;
  const chatId = generateChatId(currentUserPub.value!, currentChatPub.value);
  await retractMessage(chatId, item.msgId);
  hideContextMenu();
}

function startSelectionMode(item: LocalChatMessage) {
  if (!item.msgId) return;
  isSelectMode.value = true;
  selectedMessages.value = [item.msgId];
}

function copySelectedMessages() {
  if (selectedMessages.value.length === 0) return;
  const textsToCopy = selectedMessages.value
    .map(msgId => findMessageById(msgId))
    .filter(msg => msg && msg.type === 'text')
    .map(msg => msg!.text)
    .filter(Boolean)
    .join('\n\n');
  if (textsToCopy) {
    navigator.clipboard.writeText(textsToCopy).then(() => {
      cancelSelectionMode();
    });
  }
}

async function deleteSelectedMessages() {
  if (selectedMessages.value.length === 0 || !currentChatPub.value) return;
  const chatId = generateChatId(currentUserPub.value!, currentChatPub.value);
  for (const msgId of selectedMessages.value) {
    await retractMessage(chatId, msgId);
  }
  cancelSelectionMode();
}

function cancelSelectionMode() {
  isSelectMode.value = false;
  selectedMessages.value = [];
}

function handleGlobalClick(event: MouseEvent) {
  const menu = document.querySelector('.context-menu');
  const selectionBar = document.querySelector('.selection-action-bar');
  const chatContainer = document.querySelector('.message-container');
  const target = event.target as HTMLElement;
  const isInSelectionBar = selectionBar && selectionBar.contains(target);
  const isInChatContainer = chatContainer && chatContainer.contains(target);
  const isCheckbox = target.closest('ion-checkbox');
  const isConfirmButton = target.closest('.confirm-button');
  const isModeButton = target.closest('.mode-selection ion-button');
  const isCopyButton = target.closest('.copy-code-button');
  if (isSelectMode.value && !isInSelectionBar && !isCheckbox && !isInChatContainer && !isCopyButton) {
    cancelSelectionMode();
  }
  if (contextMenu.value.visible && menu && !menu.contains(target) && !isCopyButton) {
    hideContextMenu();
  }
  if (!isConfirmButton && !isModeButton && !isCopyButton) {
    const inputContainer = capsuleRef.value;
    if (inputContainer && !inputContainer.contains(target) && !target.closest('.keyboard') && inputFocused.value) {
      inputFocused.value = false;
      if (textInputRef.value) textInputRef.value.blur();
    }
  }
}

function isValidMessage(item: any): boolean {
  return item && item.msgId && item.type && (item.text || item.audioUrl);
}

function getDisplayName(pub: string): string {
  const remark = chatFlow.friendRemarks.value[pub]?.remark;
  return remark && remark.trim() !== '' ? remark : getAliasRealtime(pub);
}

const remainingMs = ref<Record<string, number>>({});

function toggleVoicePlayback(item: LocalChatMessage) {
  const msgId = item.msgId!;
  const totalMs = item.duration || 0;
  if (voiceBar.playingAudio.value === item.msgId) {
    voiceBar.stopVoice();
  }
  if (audioMap.value[msgId]) {
    audioMap.value[msgId].pause();
    delete audioMap.value[msgId];
    delete remainingMs.value[msgId];
    return;
  }
  Object.values(audioMap.value).forEach(a => a.pause());
  Object.keys(audioMap.value).forEach(id => delete remainingMs.value[id]);
  audioMap.value = {};
  const audio = new Audio(item.audioUrl!);
  audioMap.value[msgId] = audio;
  remainingMs.value[msgId] = totalMs;
  audio.addEventListener('timeupdate', () => {
    const left = Math.max(0, totalMs - audio.currentTime * 1000);
    remainingMs.value[msgId] = left;
  });
  audio.addEventListener('ended', () => {
    delete audioMap.value[msgId];
    delete remainingMs.value[msgId];
  });
  audio.play();
  voiceBar.playVoice(item.audioUrl!, item.msgId!);
}

function hideContextMenu() {
  contextMenu.value.visible = false;
  setTimeout(() => selectedMessage.value = null, 200);
}

function goToFriendProfile() {
  if (currentChatPub.value) {
    router.push({ path: '/friend-profile', query: { pub: currentChatPub.value } });
  }
}

async function startVoiceRecording(event: TouchEvent) {
  event.preventDefault();
  touchStartY = event.touches[0].clientY;
  await startRecording();
}

function handleVoiceMove(event: TouchEvent) {
  if (!isRecording.value) return;
  const currentY = event.touches[0].clientY;
  const deltaY = touchStartY - currentY;
  cancelRecording.value = deltaY > 50;
}

async function stopVoiceRecording(event: TouchEvent) {
  if (!isRecording.value) return;
  event.preventDefault();
  if (cancelRecording.value) {
    await stopRecording();
  } else {
    await sendVoiceMessage();
    nextTick(() => scrollToBottom());
  }
  cancelRecording.value = false;
}

async function cancelVoiceRecording() {
  if (isRecording.value) {
    await stopRecording();
    cancelRecording.value = false;
  }
}

function handleActionButtonClick() {
  if (isVoiceMode.value) {
    isVoiceMode.value = false;
  } else if (newMsg.value) {
    newMsg.value += '\n';
    nextTick(() => {
      if (textInputRef.value) {
        textInputRef.value.focus();
        adjustHeight();
      }
    });
  } else {
    isVoiceMode.value = true;
  }
}

function setMode(mode: 'default' | 'about' | 'think') {
  if (inputMode.value === mode) return;
  if (inputMode.value !== 'default' && newMsg.value.trim() && !typedMeta.value.some(m => m.content === newMsg.value.trim())) {
    typedMeta.value.push({ type: inputMode.value as 'about' | 'think', content: newMsg.value.trim() });
    newMsg.value = '';
  }
  inputMode.value = mode;
  if (textInputRef.value) {
    nextTick(() => textInputRef.value!.focus());
  }
}

function confirmInput() {
  if (inputMode.value !== 'default' && newMsg.value.trim() && !typedMeta.value.some(m => m.content === newMsg.value.trim())) {
    typedMeta.value.push({ type: inputMode.value as 'about' | 'think', content: newMsg.value.trim() });
    newMsg.value = '';
  }
  inputMode.value = 'default';
  if (textInputRef.value) {
    nextTick(() => textInputRef.value!.focus());
  }
}

function removeMeta(index: number) {
  typedMeta.value.splice(index, 1);
}

function handleEnterKey(event: KeyboardEvent) {
  event.preventDefault();
  scrollToBottom();
  if (!newMsg.value.trim() && !typedMeta.value.length) return;

  let full = '';
  typedMeta.value.forEach(m => {
    full += `<${m.type}>${m.content}</${m.type}>\n`;
  });
  if (newMsg.value.trim()) {
    full += newMsg.value.trim();
  }

  sendChat('text', full);
  newMsg.value = '';
  typedMeta.value = [];
  inputMode.value = 'default';
  setTimeout(() => scrollToBottom(), 150);
  if (inputFocused.value) {
    nextTick(() => {
      if (textInputRef.value) {
        textInputRef.value.focus();
        adjustHeight();
        scrollToBottom();
      }
    });
  }
}

function triggerFileUpload() {
  if (fileInput.value) {
    fileInput.value.click();
  }
}

async function compressImage(file: File, maxWidth: number = 800, quality: number = 0.7): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target!.result as string;
      img.onload = () => {
        const scale = maxWidth / img.width;
        const width = img.width > maxWidth ? maxWidth : img.width;
        const height = img.width > maxWidth ? img.height * scale : img.height;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
    };
    reader.readAsDataURL(file);
  });
}

async function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function handleFileUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files || !currentChatPub.value) return;
  const files = Array.from(input.files);
  if (files.length === 0) return;
  for (const file of files) {
    try {
      if (file.type.startsWith('image/')) {
        const compressedBase64 = await compressImage(file, 800, 0.7);
        await sendChat('text', compressedBase64);
      } else if (file.type.startsWith('video/')) {
        if (file.size > 100 * 1024 * 1024) {
          showToast('Max100MB', 'warning');
          continue;
        }
        uploadProgress.value = 0.1;
        const base64 = await fileToBase64(file);
        uploadProgress.value = 0.5;
        await sendChat('text', base64);
        uploadProgress.value = 1;
        setTimeout(() => (uploadProgress.value = 0), 500);
      }
    } catch (err: any) {
      uploadProgress.value = 0;
    }
  }
  nextTick(() => scrollToBottom());
  input.value = '';
}

function isBase64Image(text: string | undefined): boolean {
  if (!text || typeof text !== 'string') return false;
  return /^data:image\/[\w+.-]+;base64,/.test(text);
}

function isBase64Video(text: string | undefined): boolean {
  if (!text || typeof text !== 'string') return false;
  return /^data:video\/[\w+.-]+;base64,/.test(text);
}

function loadAndPlayVideo(item: LocalChatMessage) {
  if (!item.msgId) return;
  loadedVideos.value[item.msgId] = true;
  nextTick(() => {
    const video = videoRefs.value[item.msgId];
    if (video) {
      video.play().catch((err) => console.error('Playback failed:', err));
    }
  });
}

function adjustHeight() {
  const el = textInputRef.value;
  if (el) {
    el.style.height = '46px';
    const newHeight = Math.min(el.scrollHeight, 120);
    el.style.height = `${newHeight}px`;
    if (capsuleRef.value) capsuleRef.value.style.height = `${newHeight}px`;
  }
}

function resetHeight() {
  if (!newMsg.value && textInputRef.value && capsuleRef.value && !inputFocused.value) {
    textInputRef.value.style.height = '40px';
    capsuleRef.value.style.height = '46px';
  }
}

function onFocus() {
  inputFocused.value = true;
}

function onBlur(event: FocusEvent) {
  event.preventDefault();
  if (!inputFocused.value) resetHeight();
}

function closeWindow() {
 hasPadChat.value = false;
}

const debouncedLoadMore = debounce(async () => {
  if (!currentChatPub.value || isLoadingHistory.value || !scrollerRef.value) return;
  const scroller = scrollerRef.value.$el;
  const scrollTop = scroller.scrollTop;
  if (scrollTop < 20 && !isAtEarliest.value) {
    const messages = currentChatMessages.value;
    const earliestMsgId = messages.length > 0 ? messages[0].id : undefined;
    const prevHeight = scroller.scrollHeight;
    const prevScrollTop = scroller.scrollTop;
    await loadMoreChatHistory(currentChatPub.value, earliestMsgId);
    nextTick(async () => {
      if (scrollerRef.value) {
        const newHeight = scroller.scrollHeight;
        scroller.scrollTop = prevScrollTop + (newHeight - prevHeight);
        scrollerRef.value.reset();
      }
    });
  }
}, 300);

function scrollToBottom() {
  if (scrollerEl.value) {
    scrollerEl.value.scrollTo({ top: scrollerEl.value.scrollHeight, behavior: 'smooth' });
  }
}

function scrollToBottomInitial() {
  if (!scrollerRef.value || !currentChatMessages.value.length) return;
  nextTick(() => {
    const lastIndex = currentChatMessages.value.length - 1;
    scrollerRef.value.scrollToItem(lastIndex, 'end');
    isInitialLoad.value = false;
    const scroller = scrollerRef.value.$el;
    setTimeout(() => {
      const isAtBottom = scroller.scrollHeight - (scroller.scrollTop + scroller.clientHeight) < 10;
      if (!isAtBottom) {
        scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'auto' });
      }
    }, 100);
  });
}

function onScrollerScroll(event: Event) {
  const target = event.target as HTMLElement;
  lastScrollTop = target.scrollTop;
  debouncedLoadMore();
}

function isNearBottom(): boolean {
  if (!scrollerRef.value || !scrollerRef.value.$el) return false;
  const { scrollTop, scrollHeight, clientHeight } = scrollerRef.value.$el;
  return scrollHeight - (scrollTop + clientHeight) <= 100;
}

const showOverlay = ref(true);

function calculateVoiceBarWidth(duration: number): string {
  const durationInSeconds = duration / 1000;
  if (durationInSeconds <= 5) return '100px';
  else if (durationInSeconds >= 10) return '200px';
  else return `${100 + (durationInSeconds - 5) * 20}px`;
}

function showDeleteOption(item: LocalChatMessage, event: MouseEvent | TouchEvent) {
  const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
  const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
  setTimeout(() => {
    const viewportWidth = window.innerWidth;
    const buttonSize = 44;
    deleteButtonPos.value = {
      x: Math.min(clientX + 60, viewportWidth - buttonSize),
      y: Math.max(clientY - 100, 60)
    };
    deleteTargetMessage.value = item;
    deleteButtonVisible.value = true;
    triggerLightHaptic();
    setTimeout(() => {
      if (deleteButtonVisible.value) deleteButtonVisible.value = false;
    }, 6000);
  }, 50);
}

function showNativeMenu(item: LocalChatMessage, event: MouseEvent) {
  if (window.innerWidth >= 768) showDeleteOption(item, event);
}

function clearLongPress() {
  if (longPressTimer !== null) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
  longPressItem = null;
}

const urlRegex = /(https?:\/\/[^\s]+|\b\w+\.(com|cn|org|net|edu|gov|io|co)(?:\.\w+)?(?:\/[^\s]*)?)/gi;

function extractUrls(text: string): { text: string; isUrl: boolean }[] {
  const parts = [];
  let lastIndex = 0;
  let match;
  while ((match = urlRegex.exec(text)) !== null) {
    const url = match[0];
    const startIndex = match.index;
    if (startIndex > lastIndex) {
      parts.push({
        text: text.slice(lastIndex, startIndex),
        isUrl: false
      });
    }
    parts.push({
      text: url,
      isUrl: true
    });
    lastIndex = urlRegex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push({
      text: text.slice(lastIndex),
      isUrl: false
    });
  }
  if (parts.length === 0) {
    parts.push({
      text: text,
      isUrl: false
    });
  }
  return parts;
}

async function openUrl(url: string) {
  try {
    const formattedUrl = url.match(/^https?:\/\//) ? url : `http://${url}`;
    await Browser.open({ url: formattedUrl });
  } catch (error) {
    showToast('无法打开链接', 'error');
  }
}

watch(inputFocused, (focused) => {
  if (focused) nextTick(() => scrollToBottom());
});

watch(
  () => currentChatMessages.value,
  (newMessages, oldMessages) => {
    if (!newMessages || newMessages.length === 0) {
      isLoadingMessages.value = true;
    } else {
      isLoadingMessages.value = false;
    }
    if (isInitialLoad.value && newMessages?.length > 0) {
      nextTick(() => scrollToBottomInitial());
    } else if (newMessages.length > (oldMessages?.length || 0) && isNearBottom()) {
      nextTick(() => scrollToBottom());
    }
  },
  { deep: true, immediate: true }
);

watch(currentChatPub, (newPub) => {
  if (newPub) {
    nextTick(() => {
      if (isInitialLoad.value) {
        scrollToBottomInitial();
      } else {
        scrollToBottom();
      }
    });
  }
});
</script>

<style scoped>
/* Styles for Markdown content within chat messages */
.markdown-content {
  word-break: break-word;
  line-height: 1.5;
  font-size: 13px; /* Matches message-bubble font-size */
}

/* Paragraphs */
.markdown-content :deep(p) {
  margin: 8px 0;
}

/* Headings */
.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4),
.markdown-content :deep(h5),
.markdown-content :deep(h6) {
  margin: 10px 0;
  font-weight: bold;
}

.markdown-content :deep(h1) { font-size: 1.5em; }
.markdown-content :deep(h2) { font-size: 1.4em; }
.markdown-content :deep(h3) { font-size: 1.3em; }
.markdown-content :deep(h4) { font-size: 1.2em; }
.markdown-content :deep(h5) { font-size: 1.1em; }
.markdown-content :deep(h6) { font-size: 1em; }

/* Lists */
.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin: 8px 0;
  padding-left: 20px;
}

.markdown-content :deep(li) {
  margin: 4px 0;
}

/* Links */
.markdown-content :deep(a) {
  color: #5900cd;
  background-color: rgb(0, 247, 255);
  border-radius: 5px;
  padding: 0 2px;
  text-decoration: underline;
  cursor: pointer;
  word-break: break-all;
}

.markdown-content :deep(a:hover) {
  color: #5900cd;
  text-decoration: underline;
}

/* Blockquotes */
.markdown-content :deep(blockquote) {
  border-left: 4px solid #ccc;
  margin: 8px 0;
  padding-left: 10px;
  color: #666;
}

/* Inline code */
.markdown-content :deep(code) {
  background: rgba(0, 0, 0, 0.1);
  padding: 2px 4px;
  border-radius: 4px;
  font-family: monospace;
}

/* Code blocks */
.markdown-content :deep(pre) {
  background: rgba(0, 0, 0, 0.1);
  padding: 10px;
  border-radius: 8px;
  overflow-x: auto;
  font-family: monospace;
  position: relative;
}

/* Code block wrapper for copy button */
.code-block-wrapper {
  position: relative;
  margin: 8px 0;
}

/* Copy button */
.copy-code-button {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(255, 255, 255, 0.8);
  border: none;
  border-radius: 4px;
  padding: 4px;
  cursor: pointer;
  z-index: 10;
  transition: transform 0.2s ease, background 0.2s ease;
}

.copy-code-button ion-icon {
  font-size: 16px;
  color: #333;
}

.copy-code-button:hover {
  transform: scale(1.1);
  background: rgba(255, 255, 255, 1);
}

.copy-code-button:active {
  transform: scale(0.95);
}

/* Images */
.markdown-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
}

/* Tables */
.markdown-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 8px 0;
}

.markdown-content :deep(th),
.markdown-content :deep(td) {
  border: 1px solid #ccc;
  padding: 6px;
  text-align: left;
}

.markdown-content :deep(th) {
  background: rgba(0, 0, 0, 0.05);
}

/* Styles for my-message to ensure consistency */
.my-message .markdown-content :deep(a) {
  color: #5900cd;
  text-decoration: underline;
}

.my-message .markdown-content :deep(code),
.my-message .markdown-content :deep(pre) {
  background: rgba(255, 255, 255, 0.2);
}

.my-message .markdown-content :deep(blockquote) {
  border-left-color: #fff;
  color: #ddd;
}

.my-message .copy-code-button {
  background: rgba(0, 184, 114, 0.8); /* Matches my-message green (#01b872) */
}

.my-message .copy-code-button:hover {
  background: rgba(0, 184, 114, 1);
}

.my-message .copy-code-button ion-icon {
  color: #fff;
}

/* Ensure highlight.js styles are scoped and adjusted */
.markdown-content :deep(.hljs) {
  background: transparent;
  padding: 0;
}

.markdown-content :deep(.hljs-keyword),
.markdown-content :deep(.hljs-selector-tag),
.markdown-content :deep(.hljs-subst) {
  color: #2f6f9f;
}

.markdown-content :deep(.hljs-string),
.markdown-content :deep(.hljs-attr),
.markdown-content :deep(.hljs-symbol),
.markdown-content :deep(.hljs-bullet) {
  color: #d14;
}

.mongodb-content :deep(.hljs-comment),
.markdown-content :deep(.hljs-quote) {
  color: #998;
  font-style: italic;
}

.markdown-content :deep(.hljs-number),
.markdown-content :deep(.hljs-regexp),
.markdown-content :deep(.hljs-literal) {
  color: #099;
}

.markdown-content :deep(.hljs-title),
.markdown-content :deep(.hljs-section),
.markdown-content :deep(.hljs-function) {
  color: #900;
  font-weight: bold;
}

.my-message .markdown-content :deep(.hljs) {
  color: #ddd; /* Lighter text for my-message to contrast with green background */
}

.my-message .markdown-content :deep(.hljs-keyword),
.my-message .markdown-content :deep(.hljs-selector-tag),
.my-message .markdown-content :deep(.hljs-subst) {
  color: #a1c0e4;
}

.my-message .markdown-content :deep(.hljs-string),
.my-message .markdown-content :deep(.hljs-attr),
.my-message .markdown-content :deep(.hljs-symbol),
.my-message .markdown-content :deep(.hljs-bullet) {
  color: #ff8787;
}

.my-message .markdown-content :deep(.hljs-comment),
.my-message .markdown-content :deep(.hljs-quote) {
  color: #bbb;
}

.my-message .markdown-content :deep(.hljs-number),
.my-message .markdown-content :deep(.hljs-regexp),
.my-message .markdown-content :deep(.hljs-literal) {
  color: #0cc;
}

.my-message .markdown-content :deep(.hljs-title),
.my-message .markdown-content :deep(.hljs-section),
.my-message .markdown-content :deep(.hljs-function) {
  color: #f66;
}
.chat-name{
  font-size: 23px;
  
}
.gradient-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 20vh;
  background: linear-gradient(to bottom, var(--ion-background-color) 60%, rgba(0, 0, 0, 0) 100%);
  pointer-events: none;
  overflow:visible;
  z-index: 1;
}

.pending-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: rgba(0,0,0,0.05);
  font-size: 14px;
  /* border-top: 1px solid rgba(0,0,0,0.1); */
}

.about-block {
  position: relative;
  align-self: start;
  padding: 15px;
  border-radius: 30px;
  font-style: italic;
  font-size: 12px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
  background: rgb(1, 255, 238);
  color: black;
  box-shadow: 0px 2px 6px rgba(255, 255, 255, 0.71);
  z-index: 100;
  /* pointer-events: none; */
}
.about-own { right: 23px; top: -3px; left: auto; transform: none; }
.about-other { left: 23px; top: -3px; right: auto; transform: none; }

.think-block {
  position: relative;
  align-self: start;
  padding: 15px;
  border-radius: 30px;
  font-style: italic;
  font-size: 12px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
  background: rgb(0, 0, 0);
  color: #acacac;
  box-shadow: 0px 2px 6px rgba(255, 255, 255, 0.71);
  z-index: 100;
  pointer-events: none;
}
.think-own { right: 23px; top: -3px; left: auto; transform: none; }
.think-other { left: 23px; top: -3px; right: auto; transform: none; }

.avatar-placeholder {
  width: 39px;
  height: 39px;
  flex-shrink: 0;
}

.video-placeholder-text {
  position: absolute;
  left: 0;
  bottom: 0;
  font-size: 12px;
  color: #666;
  padding-left: 20px;
}

ion-content {
  --content-bottom: 0px;
  transition: all 0.2s ease;
}

.toolbar1 {
  transition: all 0.2s ease;

 
  width: 100vw;
  /* --background:transparent; */
  overflow:visible;
  /* --background: var(--ion-background-color); */
  /* --background: linear-gradient(to top, var(--ion-background-color) 60%, rgba(0, 0, 0, 0) 100%); */

}



.input-toolbar {
  transition: all 0.2s ease;
  position: relative;
  bottom: 0;
  width: 100vw;
  --background:transparent;
  overflow:visible;
 /* filter: blur(20px); */
  /* --background: var(--ion-background-color); */
  --background: linear-gradient(to top, var(--ion-background-color) 60%, rgba(0, 0, 0, 0) 100%);

}

.message-container {
  height: 100vh;
}

.scroller {
  height: calc(100% - var(--content-bottom));
  overflow-y: auto;
  margin-top: -100px;
  padding-top:120px;
  padding-bottom: 130px;

  /* padding-left: 10px;
  padding-right: 10px; */
}

.message-bubble {
  padding: 0px 15px;
  font-size: 13px;
  text-align: left;
  border-radius: 30px 30px 30px 5px !important;
  min-height: 39px;
  max-width: 80%;
  background: var(--ion-color-dark-contrast);
  color: var(--ion-color-dark-tint);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  transition: background 0.2s ease, transform 0.2s ease;
  cursor: pointer;
  transform-origin: center;
}

.message-bubble:has(.image-container), .message-bubble:has(.video-container) {
  padding: 0;
}

.my-message .message-bubble {
  color: #fff;
  background: #01b872;
  border-radius: 30px 30px 5px 30px !important;
}

.failed-message {
  background: #ff4d4d !important;
  opacity: 0.8;
}

.pending-message {
  background-size: 200% 200%;
  animation: gradientBreath 6s ease infinite;
  box-shadow: 0 0 10px rgba(82, 238, 209, 0.7), 0 0 20px rgba(35, 213, 171, 0.5);
}

.selected-message {
  box-shadow: 0 0 10px rgba(82, 238, 209, 0.7), 0 0 20px rgba(35, 213, 171, 0.5);
  /* background: #000 !important; */
  color: #fff;
  transition: all 0.3s ease-in-out;
  /* transform: scale(1.05); */
}

.voice-bubble {
  background: transparent !important;
  padding: 0 !important;
}

.voice-bar {
  display: flex;
  align-items: center;
  border-radius: 13px 13px 13px 0px !important;
  gap: 8px;
  height: 39px;
  background: var(--ion-color-dark-contrast);
  cursor: pointer;
  transition: background 0.5s ease, box-shadow 0.5s ease, width 0.3s ease, transform 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  touch-action: manipulation;
  min-width: 100px;
  max-width: 200px;
  transform-origin: center;
}

.my-message .voice-bar {
  color: #fff;
  background: #01b872;
  border-radius: 13px 13px 0px 13px !important;
}

.failed-voice {
  background: #ff9999 !important;
  opacity: 0.8;
}

.pending-voice {
  animation: gradientBreath 6s ease infinite;
  box-shadow: 0 0 10px rgba(82, 238, 209, 0.7), 0 0 20px rgba(35, 213, 171, 0.5);
  opacity: 0.7;
}

.voice-bar.playing {
  background: linear-gradient(-45deg, #52eed1, #000000, #23d5b4, #23d5ab);
  background-size: 200% 200%;
  animation: gradientBreath 6s ease infinite;
  box-shadow: 0 0 10px rgba(82, 238, 209, 0.7), 0 0 20px rgba(35, 213, 171, 0.5);
}

.my-message .voice-bar.playing {
  background: linear-gradient(-45deg, #52eed1, #000000, #23d5b4, #23d5ab);
  background-size: 200% 200%;
  animation: gradientBreath 6s ease infinite;
  box-shadow: 0 0 10px rgba(82, 238, 209, 0.7), 0 0 20px rgba(35, 213, 171, 0.5);
}

@keyframes gradientBreath {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.play-icon {
  font-size: 16px;
  touch-action: manipulation;
}

.duration {
  font-size: 12px;
  color: #666;
  padding-left: 13px;
}

.my-message .duration {
  color: #fff;
}

.my-message .play-icon {
  color: #fff;
}

.transcription {
  margin-top: 4px;
  font-size: 14px;
  color: #555;
  background: #f5f5f5;
  padding: 4px 8px;
  border-radius: 8px;
}

.my-message .transcription {
  background: #e0fff0;
  color: #333;
}

.error-text {
  font-size: 12px;
  color: #ff4d4d;
  font-style: italic;
}

.context-menu {
  position: fixed;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  z-index: 1000;
  display: flex;
  flex-direction: row;
  padding: 5px;
  gap: 8px;
  height: 40px;
  align-items: center;
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease;
  transform: scale(1);
  opacity: 1;
}

.context-button {
  --padding-start: 10px;
  --padding-end: 10px;
  height: 30px;
  transition: transform 0.2s ease, background 0.2s ease;
}

.context-button:hover {
  transform: scale(1.1);
  background: rgba(0, 205, 137, 0.2);
}

.context-button ion-icon {
  font-size: 20px;
  color: #333;
}

.message-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 9px;
  margin: 5px 0;
  position: relative;
}

.chat-container.my-message .message-wrapper {
  justify-content: flex-end;
}

.gun-avatar {
  width: 30px;
  height: 30px;
  border-radius:50%;
  margin-right:10px;
  object-fit: cover;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0);
}

.message-avatar {
  width: 39px;
  height: 39px;
  border-radius:0 50% 50% 0 ;
  
  object-fit: cover;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.my-message .message-avatar{
  
  border-radius:50% 0 0 50%;
}

.image-container {
  width: 180px;
  height: 180px;
  overflow: hidden;
  position: relative;
  object-fit: cover;
  object-position: center;
}

.video-container {
  width: 230px;
  height: 180px;
  overflow: hidden;
  position: relative;
  object-fit: cover;
  padding: 0;
  margin: 0;
  object-position: center;
}

.video-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #171717;
  cursor: pointer;
  position: relative;
}

.thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.play-icon {
  font-size: 48px;
  color: #666;
  position: absolute;
  z-index: 1;
}

.media-element {
  width: 100%;
  height: 180px;
  padding: 0;
  margin: 0;
  border-radius: 13px 13px 13px 5px !important;
  object-fit: cover;
  object-position: center;
}
.my-message .media-element {
  border-radius: 13px 13px 5px 13px !important;
}

.media-element[lazy="loading"] {
  opacity: 0.5;
  background: #f0f0f0 url('@/assets/loading.gif') no-repeat center;
}

.media-element[lazy="loaded"] {
  opacity: 1;
}

.timestamp-container {
  font-size: 8px;
  color: #bbb;
  display: flex;
  align-items: center;
  gap: 6px;
}

.my-timestamp {
  justify-content: flex-end;
}

.other-timestamp {
  justify-content: flex-start;
}

.pending-status {
  color: #00ffbb;
  font-style: italic;
}

.input-capsule {
  display: flex;
  align-items: center;
  background: rgba(133, 133, 133, 0.123);
  border-radius: 30px;
  width: 96%;
  margin: 3px auto;
  height: 46px;
  transition: all 0.2s ease;
}

.input-container {
  flex: 1;
  display: flex;
  align-items: center;
  margin: 0;
  padding: 0;
  
}

.text-input {
  
  width: 100%;
  display: flex;
  align-items: center;
  position: relative;
}

.text-input textarea {
  width: 100%;
  min-height: 39px;
  max-height: 120px;
  padding: 12px;
  border: none;
  border-radius: 30px;
  font-size: 16px;
  outline: none;
  resize: none;
  overflow-y: auto;
  background: transparent;
}

/* .text-input.default textarea {
  background: rgba(255, 255, 255, 0.1);
} */

.text-input.about textarea {
  background: rgb(1, 255, 238);
  box-shadow: 0 2px 8px rgb(1, 255, 238);
  color: black;
}

.text-input.think textarea {
  background: rgb(0, 0, 0);
  box-shadow: 0 2px 8px rgb(0, 0, 0);
  color: #fff;
}

.confirm-button {
  position: absolute;
  right: 0;
  /* top: 50%;
  transform: translateY(-50%); */
}

.voice-input {
  /* position:absolute; */
  width: 100%;
  height: 39px;

  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  /* padding: 20px; */
  border-radius: 20px;
  background: rgba(0, 205, 137, 0.544);
  /* color: #333; */
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  user-select: none;
  /* transition: background 0.2s, transform 0.2s; */
  touch-action: manipulation;
  transition: all 0.3s ease-in-out;
  /* filter: blur(5px); */
  overflow: visible;
  left: 0px;
}

.voice-input.recording {
  
  border-radius: 30px;
  position:absolute;
  /* bottom:0; */
  
  width: 100vw;
  height: 59px;
  background: linear-gradient(-45deg, #00ffaa, #ff9999, #fff, #00cd89);
  background-size: 200% 200%;
  animation: gradientBreath 6s ease infinite;
  z-index: 9999;
  transition: all 0.3s ease-in-out;
  overflow: visible;
}

.voice-input.cancel-recording {
  border-radius: 30px;
  background: #ff4d4d;
  transform: translateY(-20px);
  transition: all 0.3s ease-in-out;
  overflow: visible;
}

.voice-input span {
  font-size: 14px;
}

.drawer-toggle,
.action-button {
  --padding-start: 8px;
  --padding-end: 8px;
}

.image-preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  z-index: 2000;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.image-preview-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  touch-action: none;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
}

.close-button {
  position: absolute;
  bottom: 5%;
  right: 20px;
  padding: 0;
  z-index: 2100;
}

.close-button ion-icon {
  font-size: 39px;
}

.liquid-fade-enter-active,
.liquid-fade-leave-active {
  transition: opacity 0.3s ease;
}

.liquid-fade-enter-from,
.liquid-fade-leave-to {
  opacity: 0;
}

.native-selectable {
  user-select: text;
  -webkit-user-select: text;
  cursor: text;
}

.delete-button {
  position: fixed;
  min-width: 70px;
  height: 44px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1100;
  cursor: pointer;
  animation: fade-in 0.3s ease;
  transform-origin: center;
  transition: transform 0.2s ease, background 0.2s ease;
  border: 0.5px solid rgba(0, 0, 0, 0.1);
}

.delete-button:hover {
  transform: scale(1.05);
  background: rgba(248, 248, 248, 1);
}

.delete-button:active {
  transform: scale(0.95);
  background: rgba(240, 240, 240, 1);
}

.delete-button ion-icon {
  font-size: 18px;
  color: #ff3b30;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.message-checkbox {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 5px;
  opacity: 0.9;
}

.selection-action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--ion-background-color, #ffffff);
  backdrop-filter: blur(10px);
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.08);
  padding: 15px;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  border-top: 1px solid var(--ion-border-color, rgba(0, 0, 0, 0.1));
}

.selection-actions {
  display: flex;
  justify-content: space-around;
  align-items: center;
  width: 100%;
  max-width: 300px;
}

.selection-actions ion-button {
  height: 60px;
  width: 60px;
  --border-radius: 50%;
  --background: var(--ion-item-background, transparent);
  --color: var(--ion-text-color, #000000);
  --box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.selection-actions ion-button:hover {
  --background: var(--ion-color-step-50, rgba(0, 0, 0, 0.05));
}

.selection-actions ion-button:active {
  --background: var(--ion-color-step-150, rgba(0, 0, 0, 0.1));
}

.selection-actions ion-button ion-icon {
  font-size: 26px;
  color: var(--ion-text-color, #000000);
}

ion-button[disabled] ion-icon {
  opacity: 0.4;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}

.url-link {
  color: #5900cd;
  background-color: rgb(0, 247, 255);
  border-radius: 5px;
  padding: 0 2px;
  text-decoration: underline;
  cursor: pointer;
  word-break: break-all;
}

.url-link:hover {
  color: #5900cd;
  text-decoration: underline;
}

.my-message .url-link {
  color: #5900cd;
  text-decoration: underline;
}

.my-message .url-link:hover {
  color: #5900cd;
}

.skeleton-container {
  height: 100vh;
  /* width:100vw; */
  z-index:9999;
  
  /* margin-top: -100px;
  overflow: hidden; */
}

.skeleton-message {
  display: flex;
  align-items: flex-end;
  gap: 9px;
  margin: 15px 0;
  animation: fade 1.5s infinite ease-in-out;
}

.skeleton-message.my-message {
  justify-content: flex-end;
}

.skeleton-avatar {
  width: 39px;
  height: 39px;
  border-radius: 50%;
  background: #e0e0e0;
  animation: pulse 1.5s infinite ease-in-out;
}

.skeleton-bubble {
  height: 39px;
  border-radius: 13px 13px 13px 0px;
  background: #fbfbfb;
  animation: pulse 1.5s infinite ease-in-out;
}

.skeleton-message.my-message .skeleton-bubble {
  background: #01b872;
  border-radius: 13px 13px 0px 13px;
}

@keyframes pulse {
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
}

@keyframes fade {
  0% { opacity: 0.8; }
  50% { opacity: 1; }
  100% { opacity: 0.8; }
}

.scroller {
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

.glass-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--ion-background-color);
  z-index: 3;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.mode-selection {
  display: flex;
  justify-content: start;

  transform: translateX(-200px); /* 向左移动 200px */
  transition: transform 0.3s ease-in-out; /* 平滑移动 */


  z-index: 9999;
}

.mode-selection1 {
  display: flex;
  justify-content: start;

  transform: translateX(0); /* 原位 */
  transition: transform 0.3s ease-in-out; /* 平滑移动 */

z-index: 9999;

}

.mode-selection ion-button {
  transition: all 0.3 ease-in-out;
  --background: transparent;
  --color-activated: var(--ion-color-primary);
  --color: var(--ion-color-medium);
}

.meta-cards {
  position: relative;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--ion-background-color);
  z-index: 1000;
  transition: bottom 0.2s ease;
}

.meta-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 14px;
}

.about-card {
  background: rgba(1, 255, 238, 0.2);
}

.think-card {
  background: rgba(0, 0, 0, 0.2);
}

.meta-content {
  flex: 1;
  word-break: break-word;
}

.meta-icon {
  font-size: 20px;
}
</style>