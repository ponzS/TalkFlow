<template>
  <ion-page>
    <!-- 顶部工具栏 -->
    <ion-header :translucent="true"  class="ion-no-border" >
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button color="dark" @click="closeWindow">
            <ion-icon style="font-size:20px;margin-left:10px;" color="dark" :icon="chevronBackOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>
          <!-- 群成员头像 -->
          <div class="avatar-container">
            <img
              v-for="(member, index) in displayedMembers"
              :key="member.pubKey"
              class="header-avatar"
              :src="getGunAvatar(member.pubKey)"
              alt=""
              :style="{ 'z-index': displayedMembers.length - index }"
            />
          </div>
          <span class="chat-name">{{ currentGroupName }}</span>
        </ion-title>
        <ion-buttons slot="end">
          <ion-checkbox color="light" v-model="encryptMessages"></ion-checkbox>
          <ion-checkbox color="dark" v-model="decryptMessages"></ion-checkbox>
          <ion-button @click="gotoMembers">
            <ion-icon style="font-size:20px;" color="dark" :icon="peopleOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <!-- 模糊罩和浮层消息 -->
    <div v-if="selectedMessage" class="blur-overlay">
      <div class="center-message-popup">
        <div v-if="selectedMsgObj" class="center-message-bubble" :class="selectedMsgObj.sender === safeUserAlias ? 'my-message' : 'other-message'">
          <template v-if="selectedMsgObj.text">
            <div class="meta-text-container" :class="selectedMsgObj.sender === safeUserAlias ? 'my-message' : 'other-message'">
              <div
                v-for="(seg, i) in parseMetaSegments(selectedMsgObj.text).filter(s => s.type === 'about')"
                :key="'about'+i"
                class="about-block"
                :class="selectedMsgObj.sender === safeUserAlias ? 'about-own' : 'about-other'"
              >
                <ion-icon :icon="attachOutline" class="meta-icon" />
                <span v-for="(part, j) in extractUrls(seg.content)" :key="j">
                  <a v-if="part.isUrl" @click.stop="openUrl(part.text)" class="url-link">{{ part.text }}</a>
                  <span v-else>{{ part.text }}</span>
                </span>
              </div>
              <div
                v-for="(seg, i) in parseMetaSegments(selectedMsgObj.text).filter(s => s.type === 'think')"
                :key="'think'+i"
                class="think-block"
                :class="selectedMsgObj.sender === safeUserAlias ? 'think-own' : 'think-other'"
              >
                <span v-if="seg.alias" class="think-reply-user">@{{ seg.alias }}:</span>
                <template v-if="isBase64Image(seg.content)">
                  <img :src="seg.content" class="media-element" alt="" />
                </template>
                <template v-else-if="isBase64Audio(seg.content)">
                  <ion-button @click.stop="toggleVoicePlayback(seg.content)">Music</ion-button>
                </template>
                <template v-else-if="isBase64Video(seg.content)">
                  <video controls playsinline class="media-element" :src="seg.content" preload="none"></video>
                </template>
                <template v-else-if="seg.content.startsWith('Number:')">
                  <div class="number-message">
                    <span class="number-badge">{{ seg.content.replace('Number:', '') }}</span>
                  </div>
                </template>
                <template v-else>
                  {{ truncateContent(seg.content, 200) }}
                </template>
              </div>
              <div v-for="(seg, k) in parseMetaSegments(selectedMsgObj.text).filter(s => s.type === 'normal')" :key="'normal'+k">
                <template v-if="isBase64Image(seg.content)">
                  <img :src="seg.content" class="media-element" alt="" />
                </template>
                <template v-else-if="isBase64Audio(seg.content)">
                  <ion-button @click.stop="toggleVoicePlayback(seg.content)">Music</ion-button>
                </template>
                <template v-else-if="isBase64Video(seg.content)">
                  <video controls playsinline class="media-element" :src="seg.content" preload="none"></video>
                </template>
                <template v-else-if="isSingleEmoji(seg.content)">
                  <div class="emoji-message-big">{{ seg.content }}</div>
                </template>
                <template v-else-if="seg.content.startsWith('Number:')">
                  <div class="number-message">
                    <span class="number-badge">{{ seg.content.replace('Number:', '') }}</span>
                  </div>
                </template>
                <template v-else>
                  <div
                    :class="['textchat', selectedMsgObj.sender === safeUserAlias ? 'my-message' : 'other-message']"
                    class="native-selectable markdown-content"
                    v-html="renderMarkdown(seg.content)"
                  ></div>
                </template>
              </div>
            </div>
          </template>
        </div>
        <div class="center-timestamp">
          <ion-button fill="clear" @click="deleteMessage(selectedMsgObj)">
            <ion-icon :icon="trashOutline" color="danger"></ion-icon>
          </ion-button>
          <ion-button fill="clear" @click="copyText(selectedMsgObj!.text)" v-if="selectedMsgObj!.text">
            <ion-icon :icon="copyOutline"></ion-icon>
          </ion-button>
          <ion-button fill="clear" @click="onSelectThink(selectedMsgObj)">
            <ion-icon :icon="chatbubbleEllipsesOutline"></ion-icon>
          </ion-button>
          <ion-button fill="clear" @click="showEmojiPicker = !showEmojiPicker">
            <span style="font-size:22px;">😊</span>
          </ion-button>
          <ion-button fill="clear" @click="cancelSelectionMode">
            <ion-icon :icon="closeCircleOutline" color="dark"></ion-icon>
          </ion-button>
        </div>
      </div>
    </div>

    <!-- Emoji选择器 -->
    <transition name="slide">
      <div v-if="showEmojiPicker" class="emoji-picker-overlay" @click.self="showEmojiPicker = false">
        <div class="emoji-picker-panel">
          <div class="emoji-list">
            <span
              v-for="(emoji, idx) in emojiList"
              :key="idx"
              class="emoji-item"
              @click="sendThinkAndEmojiReply(emoji)"
            >
              {{ emoji }}
            </span>
          </div>
        </div>
      </div>
    </transition>

    <ion-content :fullscreen="true" :scroll-y="false" :style="{ '--content-bottom': keyboardHeight + 'px' }">
      <!-- 加载进度条 -->
      <!-- <ion-progress-bar
        :value="uploadProgress"
        v-if="uploadProgress > 0"
        color="primary"
        style="position: absolute; top: 0; width: 100%;"
      ></ion-progress-bar> -->
      <transition name="fade">
        <div v-if="showOverlay" class="glass-overlay"></div>
      </transition>
      <!-- 骨架屏 -->
      <div v-if="isLoadingMessages" class="skeleton-container">
        <div class="skeleton-message" v-for="n in 10" :key="n" :class="{ 'my-message': n % 2 === 0 }">
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

      <!-- 消息列表 -->
      <div
        class="message-container"
        @touchstart="handleLongPress1($event)"
        @touchend="clearLongPress()"
        @touchmove="clearLongPress()"
      >
        <DynamicScroller
          class="scroller"
          :items="currentMessages"
          :buffer="3000"
          :min-item-size="50"
          key-field="id"
          v-slot="{ item, index, active }"
          ref="scrollerRef"
          @scroll.passive="onScrollerScroll"
        >
          <!-- Load More Button -->
          <!-- <div v-if="index === 0 && hasMoreMessages" class="load-more-container">
            <ion-button v-if="!isLoadingOlderMessages" @click="loadOlderMessages" color="primary" size="small">
              Load More Messages
            </ion-button>
            <ion-spinner v-else name="crescent"></ion-spinner>
          </div> -->

          <DynamicScrollerItem
            :item="item"
            :active="active"
            :data-index="index"
            :size-dependencies="[item.text, item.timestamp, currentMessages.length]"
          >
            <div
              :class="[
                'chat-container',
                item.sender === safeUserAlias ? 'my-message' : 'other-message',
                selectedMessage === item.id ? 'highlighted-message' : ''
              ]"
              style="padding-bottom: 5px;"
            >
              <div class="message-wrapper">
                <div v-if="isSelectMode" class="message-checkbox">
                  <ion-checkbox
                    :checked="selectedMessages.includes(item.id)"
                    @ionChange="(e) => onSelectCheckbox(item, e)"
                    @click.stop
                  />
                </div>
                <template v-if="item.sender !== safeUserAlias">
                  <img
                    v-if="isLastInSequence(index)"
                    class="message-avatar"
                    :src="getGunAvatar(item.senderPub || 'unknown')"
                    alt=""
                    @click="goToProfile(item.senderPub)"
                  />
                </template>
                <div
                  :class="[
                    'message-bubble',
                    item.status === 'failed' ? 'failed-message' : '',
                    item.status === 'pending' && item.isSending ? 'pending-message' : ''
                  ]"
                  @touchstart="onBubbleTouchStart(item, $event)"
                  @touchend="onBubbleTouchEnd(item, $event)"
                  @mousedown="onBubbleMouseDown(item, $event)"
                  @mouseup="onBubbleMouseUp(item, $event)"
                >
                  <template v-if="item.text">
                    <template v-if="isBase64Image(item.text)">
                      <div class="image-container">
                        <img v-lazy="item.text" class="media-element"  />
                      </div>
                    </template>
                    <template v-else-if="isBase64Audio(item.text)">
                      <ion-button @click.stop="toggleVoicePlayback(item)">Music</ion-button>
                    </template>
                    <template v-else-if="isBase64Video(item.text)">
                      <div class="video-container" :data-msgid="item.id">
                        <div v-if="!loadedVideos[item.id]" class="video-placeholder" @click.stop="loadAndPlayVideo(item)">
                          <p class="video-placeholder-text">Video - E2EE</p>
                          <ion-icon :icon="lockClosedOutline" class="play-icon"></ion-icon>
                        </div>
                        <video
                          v-else
                          controls
                          playsinline
                          class="media-element"
                          :src="item.text"
                          :poster="item.text"
                          preload="none"
                          ref="video-${item.id}"
                        ></video>
                      </div>
                    </template>
                    <template v-else>
                      <div class="meta-text-container" :class="item.sender === safeUserAlias ? 'my-message' : 'other-message'">
                        <div
                          v-for="(seg, i) in parseMetaSegments(item.text).filter(s => s.type === 'about')"
                          :key="'about' + i"
                          class="about-block native-selectable"
                          :class="item.sender === safeUserAlias ? 'about-own' : 'about-other'"
                        >
                          <ion-icon :icon="attachOutline" class="meta-icon" />
                          <span v-for="(part, j) in extractUrls(seg.content)" :key="j">
                            <a v-if="part.isUrl" @click.stop="openUrl(part.text)" class="url-link">{{ part.text }}</a>
                            <span v-else>{{ part.text }}</span>
                          </span>
                        </div>
                        <div
                          v-for="(seg, i) in parseMetaSegments(item.text).filter(s => s.type === 'think')"
                          :key="'think' + i"
                          class="think-block native-selectable"
                          :class="item.sender === safeUserAlias ? 'think-own' : 'think-other'"
                        >
                          <span v-if="seg.alias" class="think-reply-user">@{{ seg.alias }}:</span>
                          <template v-if="isBase64Image(seg.content)">
                            <img :src="seg.content" class="media-element" />
                          </template>
                          <template v-else-if="isBase64Audio(seg.content)">
                            <ion-button @click.stop="toggleVoicePlayback(seg.content)">Music</ion-button>
                          </template>
                          <template v-else-if="isBase64Video(seg.content)">
                            <video controls playsinline class="media-element" :src="seg.content" preload="none"></video>
                          </template>
                          <template v-else-if="seg.content.startsWith('Number:')">
                            <div class="number-message">
                              <span class="number-badge">{{ seg.content.replace('Number:', '') }}</span>
                            </div>
                          </template>
                          <template v-else>
                            {{ truncateContent(seg.content, 200) }}
                          </template>
                        </div>
                        <div v-for="(seg, k) in parseMetaSegments(item.text).filter(s => s.type === 'normal')" :key="'normal' + k">
                          <template v-if="isSingleEmoji(seg.content)">
                            <div class="emoji-message-big">{{ seg.content }}</div>
                          </template>
                          <template v-else-if="seg.content.startsWith('Number:')">
                            <div class="number-message">
                              <span class="number-badge">{{ seg.content.replace('Number:', '') }}</span>
                            </div>
                          </template>
                          <template v-else>
                            <div
                              :class="['textchat', item.sender === safeUserAlias ? 'my-message' : 'other-message']"
                              class="native-selectable markdown-content"
                              v-html="renderMarkdown(seg.content)"
                              @contextmenu.prevent="showDeleteOption(item, $event)"
                            ></div>
                          </template>
                        </div>
                      </div>
                    </template>
                  </template>
                </div>
                <template v-if="item.sender === safeUserAlias">
                  <img
                    v-if="isLastInSequence(index)"
                    class="message-avatar"
                    :src="getGunAvatar(item.senderPub || 'unknown')"
                    alt=""
                  />
                </template>
              </div>
              <div
                v-if="isLastInSequence(index)"
                :class="['timestamp-container', item.sender === safeUserAlias ? 'my-timestamp' : 'other-timestamp']"
              >
                <span v-if="item.sender !== safeUserAlias" class="sender-nickname">{{ item.sender }}</span>
                <span class="timestamp">{{ formatLastTime(item.timestamp) }}</span>
                <span
                  v-if="item.status === 'pending' && item.isSending && item.sender === safeUserAlias"
                  class="pending-status"
                >pending...</span>
              </div>
            </div>
          </DynamicScrollerItem>
        </DynamicScroller>
      </div>

      <!-- 选择模式操作栏 -->
      <transition name="slide-up">
        <div v-if="isSelectMode" class="selection-action-bar">
          <div class="selection-actions">
            <ion-button fill="clear" @click="copySelectedMessages" :disabled="!canCopySelected" class="action-button">
              <ion-icon :icon="copyOutline" :color="canCopySelected ? 'primary' : 'medium'"></ion-icon>
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
        <div
          v-for="(meta, index) in typedMeta"
          :key="index"
          class="meta-card"
          :class="meta.type === 'about' ? 'about-card' : 'think-card'"
        >
          <span v-if="meta.type === 'think' && meta.alias" class="think-reply-user1">@{{ meta.alias }}: </span>
          <span class="meta-content">{{ meta.content.length > 30 ? meta.content.slice(0, 30) + '…' : meta.content }}</span>
          <div style="display: flex;justify-content: center;align-items: center;" fill="clear" size="small" @click="removeMeta(index)">
            <ion-icon :icon="closeOutline" color="medium"></ion-icon>
          </div>
        </div>
      </div>

      <ion-toolbar class="input-toolbar" :style="{ transform: `translateY(-${keyboardHeight}px)` }">
        <div class="input-capsule" ref="capsuleRef" :class="{ 'shift-up': isDrawerOpen }">
          <ion-button class="drawer-toggle" fill="clear" @click="triggerFileUpload">
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
       
            <div class="text-input" :class="inputMode" v-if="!isVoiceMode">
              <textarea
                v-model="newMessage"
                @input="adjustHeight"
                @focus="onFocus"
                @blur="onBlur"
                @keydown.enter.prevent="handleEnterKey"
                placeholder=""
                enterkeyhint="send"
                rows="1"
                ref="textInputRef"
              ></textarea>
           
            </div>
            <div
              v-else
              class="voice-input"
              :class="{ recording: voiceBar.isRecording.value, 'cancel-recording': cancelRecording }"
              @touchstart="startVoiceRecording"
              @touchmove="handleVoiceMove"
              @touchend="stopVoiceRecording"
              @touchcancel="cancelVoiceRecording"
            >
              <span v-if="voiceBar.isRecording.value">{{ cancelRecording ? 'Cancel' : 'Recording' }}</span>
              <span v-else>Voice</span>
              <ion-button
                v-if="inputMode !== 'default'"
                class="confirm-button"
                fill="clear"
                @click="confirmInput"
                color="dark"
              >
                <ion-icon color="dark" slot="icon-only" :icon="checkmarkOutline" ></ion-icon>
              </ion-button>
            </div>
         
          </div>
          <ion-button class="drawer-toggle" fill="clear" @click="toggleInputMode" >
              <ion-icon color="dark" slot="icon-only" :icon="isVoiceMode ? chatbubbleEllipsesOutline : micOutline" style="padding-left: 10px;"></ion-icon>
            </ion-button>
        </div>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script lang="ts" setup>
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonCheckbox,
  IonButtons,
  IonIcon,
  IonProgressBar,
  IonSpinner,
  IonFooter,
} from '@ionic/vue';
import {
  chevronBackOutline,
  peopleOutline,
  attachOutline,
  chatbubbleEllipsesOutline,
  addCircleOutline,
  closeOutline,
  checkmarkOutline,
  trashOutline,
  copyOutline,
  lockClosedOutline,
  closeCircleOutline,
  micOutline,
} from 'ionicons/icons';
import { useGroupChat } from '@/composables/useGroupChat';
import { useRouter, useRoute } from 'vue-router';
import { getTalkFlowCore } from '@/composables/TalkFlowCore';
import { computed, ref, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import { mountClass, gunAvatar } from 'gun-avatar';
import { useTheme } from '@/composables/useTheme';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import { Browser } from '@capacitor/browser';
import { useDateFormatter } from '@/composables/useDateFormatter';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import javascript from 'highlight.js/lib/languages/javascript';
import python from 'highlight.js/lib/languages/python';
import java from 'highlight.js/lib/languages/java';
import 'highlight.js/styles/github.css';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import { useGroupVoiceBar } from '@/composables/useVoiceBarGroup';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('java', java);

marked.setOptions({
  highlight: (code: string, lang: string) => {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  },
  breaks: true,
  gfm: true,
});

const { formatLastTime } = useDateFormatter();
mountClass();
const { isDark } = useTheme();
const router = useRouter();
const route = useRoute();
const {
  messagesByGroup,
  newMessage,
  encryptMessages,
  decryptMessages,
  currentGroup,
  currentGroupName,
  safeUserAlias,
  sendMessage,
  sendImage,
  membersByGroup,
  loadGroupMessages,
  loadMoreMessages,
  setCurrentGroup,
  loadGroups,
} = useGroupChat();
const chatFlow = getTalkFlowCore();

const {
triggerLightHaptic,
 
} = chatFlow;
const showOverlay = ref(true);
// 加载相关
const isLoadingMessages = ref(true);
const isLoadingOlderMessages = ref(false);
const hasMoreMessages = ref(true); // 🔧 假设总是有更多消息，让加载函数自己判断
const uploadProgress = ref(0);
// 键盘相关
const keyboardHeight = ref(0);
const inputFocused = ref(false);
const isDrawerOpen = ref(false);
// 输入相关
const textInputRef = ref<HTMLTextAreaElement | null>(null);
const capsuleRef = ref<HTMLDivElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

// 滚动相关
const scrollerRef = ref<any>(null);
const scrollerEl = ref<HTMLElement | null>(null);
const isInitialLoad = ref(true);

// 选择模式相关
const isSelectMode = ref(false);
const selectedMessages = ref<string[]>([]);
const canCopySelected = computed(() => {
  return selectedMessages.value.length > 0 &&
    selectedMessages.value.some(msgId => {
      const msg = findMessageById(msgId);
      return msg && msg.text;
    });
});

// 上下文菜单相关
const selectedMessage = ref<string | null>(null);
const contextMenu = ref<{
  visible: boolean;
  x: number;
  y: number;
  content: string;
  item: any | null;
  scaleAnimation: boolean;
}>({
  visible: false,
  x: 0,
  y: 0,
  content: '',
  item: null,
  scaleAnimation: false,
});

// 删除按钮相关
const deleteButtonVisible = ref(false);
const deleteButtonPos = ref({ x: 0, y: 0 });
const deleteTargetMessage = ref<any | null>(null);

// 视频相关
const loadedVideos = ref<{ [msgId: string]: boolean }>({});

// 输入模式相关
interface Meta {
  type: 'about' | 'think';
  content: string;
  from?: string;
  alias?: string;
}
const typedMeta = ref<Meta[]>([]);
const inputMode = ref<'default' | 'about' | 'think'>('default');

// Emoji选择器
const showEmojiPicker = ref(false);
const emojiList = [
  "👍", "😂", "😅", "😍", "🤔", "🥹", "👏", "🔥", "😳", "🥲", "😭", "🤝", "🫶", "🙏",
  "💯", "😡", "😎", "🙌", "😉", "😐", "❤️", "💩", "🌈", "😊"
];

// 当前消息列表
const currentMessages = computed(() => {
  return currentGroup.value ? messagesByGroup.value[currentGroup.value] || [] : [];
});

// 群成员列表，最多显示8个
const displayedMembers = computed(() => {
  const members = currentGroup.value ? membersByGroup.value[currentGroup.value] || [] : [];
  return members.slice(0, 8);
});

// 选中的消息对象
const selectedMsgObj = computed(() => {
  if (!selectedMessage.value || !currentGroup.value) return null;
  return (messagesByGroup.value[currentGroup.value] || []).find(msg => msg.id === selectedMessage.value) || null;
});

// 语音模块
const voiceBar = useGroupVoiceBar();
const { isRecording, recordingDuration, playingAudio, startRecording, stopRecording, sendVoiceMessage, playVoice, stopVoice, formatDuration } = voiceBar;
const isVoiceMode = ref(false);
const cancelRecording = ref(false);
let touchStartY = 0;
const audioMap = ref<Record<string, HTMLAudioElement>>({});
const remainingMs = ref<Record<string, number>>({});

// 页面加载
onMounted(async () => {
  scrollerEl.value = scrollerRef.value?.$el;
  
  // 🔧 修复：从URL参数获取群组pub并初始化
  const groupPub = route.params.pub as string;
  console.log('🎯 GroupMessages页面初始化，群组pub:', groupPub);
  
  if (groupPub) {
    try {
      // 先加载群组数据，确保群组存在
      await loadGroups();
      console.log('📊 群组加载完成');
      
      // 🔧 直接设置群组，selectGroup会检查群组是否存在
      
      // 设置当前群组（这会启动监听器和设置基本状态）
      setCurrentGroup(groupPub);
      console.log('✅ 当前群组设置完成:', currentGroup.value);
      console.log('🏷️ 当前群组名称:', currentGroupName.value);
      
      // 🔧 确保消息加载完成
      if (currentGroup.value) {
        // 等待一小段时间让异步加载完成
        setTimeout(() => {
          isLoadingMessages.value = false;
          scrollToBottomInitial();
        }, 500);
      }
    } catch (error) {
      console.error('❌ 页面初始化失败:', error);
      isLoadingMessages.value = false;
    }
  } else {
    console.error('❌ 未找到群组pub参数');
    isLoadingMessages.value = false;
  }

  try {
    Keyboard.setResizeMode({ mode: KeyboardResize.None });
    Keyboard.addListener('keyboardWillShow', async (info) => {
      keyboardHeight.value = info.keyboardHeight;
      inputFocused.value = true;
      nextTick(() => scrollToBottom());
    });
    Keyboard.addListener('keyboardWillHide', () => {
      keyboardHeight.value = 0;
      inputFocused.value = false;
      nextTick(async () => {
        if (scrollerRef.value) {
          scrollerRef.value.reset();
          // setTimeout(() => scrollToBottom(), 100);
          setTimeout(() => scrollToBottom(), 300);
        }
        if (capsuleRef.value) capsuleRef.value.style.transform = 'none';
      });
    });
  } catch (err) {
    //console.error('键盘设置失败:', err);
  }
  setTimeout(() => scrollToBottom(), 300);

 // setTimeout(() => scrollToBottom(), 500);
  document.addEventListener('click', handleGlobalClick);
});

onUnmounted(() => {
  document.removeEventListener('click', handleGlobalClick);
  Keyboard.removeAllListeners();
  Object.values(audioMap.value).forEach(a => a.pause());
  audioMap.value = {};
});

// 工具函数
function isLastInSequence(index: number) {
  const currentMessage = currentMessages.value[index];
  const nextMessage = currentMessages.value[index + 1];
  return !nextMessage || nextMessage.sender !== currentMessage.sender;
}

function getGunAvatar(pub: string) {
  return gunAvatar({
    pub: pub,
    round: false,
    size: 200,
    dark: isDark.value,
    svg: true,
  });
}

function parseMetaSegments(text: string): Array<{ content: string; type: 'normal' | 'think' | 'about'; from?: string; alias?: string }> {
  if (!text) return [];
  const regex = /<(think|about)(?:\s+from="(.*?)"(?:\s+alias="(.*?)")?)?>([\s\S]*?)<\/\1>/g;
  const segs: { content: string; type: 'normal' | 'think' | 'about'; from?: string; alias?: string }[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    const [full, tag, from, alias, inner] = m;
    if (m.index > lastIndex) {
      segs.push({ type: 'normal', content: text.slice(lastIndex, m.index) });
    }
    segs.push({ type: tag as 'think' | 'about', content: inner, from, alias });
    lastIndex = m.index + full.length;
  }
  if (lastIndex < text.length) {
    segs.push({ type: 'normal', content: text.slice(lastIndex) });
  }
  return segs;
}

function renderMarkdown(content: string): string {
  if (!content) return "";
  const rawHtml = marked(content);
  return DOMPurify.sanitize(rawHtml as any);
}

function stripThinkTags(text: string): string {
  const thinkRegex = /<think(?:\s+from=".*?"(?:\s+alias=".*?")?)?>[\s\S]*?<\/think>/g;
  return text.replace(thinkRegex, '').trim();
}

function isBase64Audio(text: string | undefined): boolean {
  if (!text || typeof text !== 'string') return false;
  return /^data:audio\/[\w+.-]+;base64,/.test(text);
}

function isBase64Image(text: string | undefined): boolean {
  if (!text || typeof text !== 'string') return false;
  return /^data:image\/[\w+.-]+;base64,/.test(text);
}

function isBase64Video(text: string | undefined): boolean {
  if (!text || typeof text !== 'string') return false;
  return /^data:video\/[\w+.-]+;base64,/.test(text);
}

function isSingleEmoji(text: string): boolean {
  const emojiRegex = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)$/u;
  return emojiRegex.test(text.trim());
}

function truncateContent(content: string, maxLength: number) {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength) + '...';
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
      parts.push({ text: text.slice(lastIndex, startIndex), isUrl: false });
    }
    parts.push({ text: url, isUrl: true });
    lastIndex = urlRegex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), isUrl: false });
  }
  if (parts.length === 0) {
    parts.push({ text: text, isUrl: false });
  }
  return parts;
}

async function openUrl(url: string) {
  try {
    const formattedUrl = url.match(/^https?:\/\//) ? url : `http://${url}`;
    await Browser.open({ url: formattedUrl });
  } catch (error) {
    console.error('无法打开链接:', error);
  }
}

function findMessageById(msgId: string): any | undefined {
  if (!currentGroup.value) return undefined;
  const messages = messagesByGroup.value[currentGroup.value] || [];
  return messages.find(msg => msg.id === msgId);
}

function toggleMessageSelection(item: any) {
  if (!item.id) return;
  const index = selectedMessages.value.indexOf(item.id);
  if (index === -1) {
    selectedMessages.value.push(item.id);
  } else {
    selectedMessages.value.splice(index, 1);
  }
}

function copyText(content: string) {
  const cleanedContent = stripThinkTags(content);
  if (cleanedContent) {
    navigator.clipboard.writeText(cleanedContent).then(() => console.log('已复制'));
  }
  cancelSelectionMode();
}

function copySelectedMessages() {
  if (selectedMessages.value.length === 0) return;
  const textsToCopy = selectedMessages.value
    .map(msgId => findMessageById(msgId))
    .filter(msg => msg && msg.text)
    .map(msg => stripThinkTags(msg!.text))
    .filter(Boolean)
    .join('\n\n');
  if (textsToCopy) {
    navigator.clipboard.writeText(textsToCopy).then(() => {
      cancelSelectionMode();
    });
  }
}

async function deleteMessage(item: any | null) {
  cancelSelectionMode();
  if (!item?.id || !currentGroup.value) return;
  console.log('删除消息:', item.id);
}

function cancelSelectionMode() {
  selectedMessage.value = null;
  contextMenu.value.visible = false;
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
    contextMenu.value.visible = false;
  }
  if (!isConfirmButton && !isModeButton && !isCopyButton) {
    const inputContainer = capsuleRef.value;
    if (inputContainer && !inputContainer.contains(target) && !target.closest('.keyboard') && inputFocused.value) {
      inputFocused.value = false;
      if (textInputRef.value) textInputRef.value.blur();
    }
  }
}

let longPressTimer: number | NodeJS.Timeout | null = null;
const LONG_PRESS_DELAY = 400;

function handleLongPress1(event: TouchEvent) {
 // triggerLightHaptic();
  clearLongPress();
  const touch = event.touches[0];
  const node = document.elementFromPoint(touch.clientX, touch.clientY);
  if (node?.closest('.message-bubble')) return;
  longPressTimer = window.setTimeout(() => {
    isSelectMode.value = true;
   // console.log('进入选择模式');
  }, LONG_PRESS_DELAY);
}

function clearLongPress() {
  if (longPressTimer !== null) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
}

let pressTimer: any = null;
let pressStartPosition: { x: number, y: number } | null = null;

function clearPressTimer() {
  if (pressTimer) {
    clearTimeout(pressTimer);
    pressTimer = null;
  }
  pressStartPosition = null;
}

function movedFarEnough(e: TouchEvent | MouseEvent) {
 // triggerLightHaptic();
  if (!pressStartPosition) return false;
  let x: number, y: number;
  if ((e as TouchEvent).touches && (e as TouchEvent).touches.length) {
    x = (e as TouchEvent).touches[0].clientX;
    y = (e as TouchEvent).touches[0].clientY;
  } else {
    x = (e as MouseEvent).clientX;
    y = (e as MouseEvent).clientY;
  }
  const dx = Math.abs(x - pressStartPosition.x);
  const dy = Math.abs(y - pressStartPosition.y);
  return dx > 10 || dy > 10;
}

function onBubbleTouchMove(event: TouchEvent) {
 // triggerLightHaptic();
  if (movedFarEnough(event)) clearPressTimer();
}

function onBubbleTouchStart(item: any, event: TouchEvent) {
  if (isSelectMode.value) return;
  pressStartPosition = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  pressTimer = setTimeout(() => {
    showContextMenuEdgeLimited(item, event.touches[0].clientX, event.touches[0].clientY);
   // console.log('长按触发');
  }, 450);
//  triggerLightHaptic();
  event.target?.addEventListener('touchmove', (e) => onBubbleTouchMove(e as TouchEvent), { passive: false });
}

function onBubbleTouchEnd(item: any, event: TouchEvent) {
  clearPressTimer();
  event.target?.removeEventListener('touchmove', (e) => onBubbleTouchMove(e as TouchEvent));
}

function onBubbleMouseDown(item: any, event: MouseEvent) {
  if (isSelectMode.value) return;
  pressStartPosition = { x: event.clientX, y: event.clientY };
  pressTimer = setTimeout(() => {
    showContextMenuEdgeLimited(item, event.clientX, event.clientY);
    console.log('长按触发');
  }, 450);

}

function onBubbleMouseUp(item: any, event: MouseEvent) {
  clearPressTimer();
 
}

function showContextMenuEdgeLimited(item: any, clientX: number, clientY: number) {
  const menuWidth = 160;
  const menuHeight = 46;
  const padding = 6;
  let x = clientX;
  let y = clientY - menuHeight - 20;
  if (x + menuWidth > window.innerWidth - padding) x = window.innerWidth - menuWidth - padding;
  if (x < padding) x = padding;
  if (y + menuHeight > window.innerHeight - padding) y = window.innerHeight - menuHeight - padding;
  if (y < padding) y = padding;
  contextMenu.value = { visible: true, x, y, content: item.text || '', item, scaleAnimation: true };
  selectedMessage.value = item.id || null;
}

function onSelectThink(item: any | null) {
  triggerLightHaptic();
  if (item && item.text && !typedMeta.value.some(m => m.content === stripThinkTags(item.text))) {
    typedMeta.value.push({
      type: 'think',
      content: stripThinkTags(item.text),
      from: item.senderPub,
      alias: item.sender
    });
  }
  cancelSelectionMode();
}

function sendThinkAndEmojiReply(emoji: string) {
  triggerLightHaptic();
  if (selectedMsgObj.value) {
    const from = selectedMsgObj.value.senderPub;
    const alias = selectedMsgObj.value.sender;
    const cleanText = stripThinkTags(selectedMsgObj.value.text || '');
    const thinkBlock = `<think from="${from}" alias="${alias}">${cleanText}</think>${emoji}`;
    sendMessage(thinkBlock);
  }
  showEmojiPicker.value = false;
  cancelSelectionMode();
  setTimeout(() => scrollToBottom(), 100);
}

function onSelectCheckbox(item: any, e: CustomEvent) {

  const checked = e.detail.checked;
  const idx = selectedMessages.value.indexOf(item.id);
  if (checked && idx === -1) {
    selectedMessages.value.push(item.id);
  } else if (!checked && idx !== -1) {
    selectedMessages.value.splice(idx, 1);
  }
}

function showDeleteOption(item: any, event: MouseEvent | TouchEvent) {
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
    setTimeout(() => {
      if (deleteButtonVisible.value) deleteButtonVisible.value = false;
    }, 6000);
  }, 50);
}

function loadAndPlayVideo(item: any) {
  if (!item.id) return;
  loadedVideos.value[item.id] = true;
  nextTick(() => {
    const video = document.querySelector(`video[data-msgid="${item.id}"]`) as HTMLVideoElement;
    if (video) {
      video.play().catch((err) => console.error('播放失败:', err));
    }
  });
}

function confirmInput() {
  if (
    inputMode.value !== 'default' &&
    newMessage.value.trim() &&
    !typedMeta.value.some((m) => m.content === newMessage.value.trim())
  ) {
    typedMeta.value.push({ type: inputMode.value as 'about' | 'think', content: newMessage.value.trim() });
    newMessage.value = '';
  }
  inputMode.value = 'default';
  if (textInputRef.value) {
    nextTick(() => textInputRef.value!.focus());
  }
}

function removeMeta(index: number) {
  typedMeta.value.splice(index, 1);
}

function triggerFileUpload() {
  if (fileInput.value) fileInput.value.click();
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
  if (!input.files || !currentGroup.value) return;
  const files = Array.from(input.files);
  if (files.length === 0) return;
  for (const file of files) {
    try {
      if (file.type.startsWith('image/')) {
        const compressedBase64 = await compressImage(file, 800, 0.7);
        await sendImage(compressedBase64);
      } else if (file.type.startsWith('video/')) {
        if (file.size > 100 * 1024 * 1024) {
          console.log('视频最大支持100MB');
          continue;
        }
        uploadProgress.value = 0.1;
        const base64 = await fileToBase64(file);
        uploadProgress.value = 0.5;
        await sendMessage(base64);
        uploadProgress.value = 1;
        setTimeout(() => (uploadProgress.value = 0), 500);
      }
    } catch (err: any) {
      uploadProgress.value = 0;
      console.error('文件上传失败:', err);
    }
  }
  nextTick(() => scrollToBottom());
  input.value = '';
}

function handleEnterKey(event: KeyboardEvent) {
  
  event.preventDefault();
  scrollToBottom();
  if (!newMessage.value.trim() && !typedMeta.value.length) return;

  let full = '';
  typedMeta.value.forEach(m => {
    if (m.type === 'think') {
      const from = m.from ? ` from="${m.from}"` : '';
      const alias = m.alias ? ` alias="${m.alias}"` : '';
      full += `<think${from}${alias}>${m.content}</think>\n`;
    } else if (m.type === 'about') {
      full += `<about>${m.content}</about>\n`;
    }
  });

  const trimmedMsg = newMessage.value.trim();
  if (trimmedMsg && /^\d+$/.test(trimmedMsg)) {
    full += `Number:${trimmedMsg}`;
  } else if (trimmedMsg) {
    full += trimmedMsg;
  }

  sendMessage(full);
  newMessage.value = '';
  typedMeta.value = [];
  inputMode.value = 'default';
  setTimeout(() => scrollToBottom(), 150);
  triggerLightHaptic();
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
  if (!newMessage.value && textInputRef.value && capsuleRef.value && !inputFocused.value) {
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
  router.go(-1);
}

function gotoMembers() {
  router.push(`/group/${currentGroup.value}/members`);
}

function goToProfile(userPub: string) {
  router.push(`/friend-profile?pub=${userPub}`);
}

function scrollToBottom() {
  if (scrollerEl.value) {
    scrollerEl.value.scrollTo({ top: scrollerEl.value.scrollHeight, behavior: 'smooth' });
  }
}

function scrollToBottomInitial() {
   if (!scrollerRef.value || !currentMessages.value.length) return;
  nextTick(async () => {
    const lastIndex = currentMessages.value.length - 1;
    await scrollerRef.value.scrollToItem(lastIndex, 'end');

    // scrollToBottom();
     const scroller = scrollerRef.value.$el;
    // setTimeout(() => {
    //   const isAtBottom = scroller.scrollHeight - (scroller.scrollTop + scroller.clientHeight) < 10;
    //   if (!isAtBottom) {
    //     scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'auto' });
    //   }
    // }, 300);
    // setTimeout(() => {
    //   const isAtBottom = scroller.scrollHeight - (scroller.scrollTop + scroller.clientHeight) < 10;
    //   if (!isAtBottom) {
    //     scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'auto' });
    //   }
    // }, 500);
    setTimeout(() => {
      const isAtBottom = scroller.scrollHeight - (scroller.scrollTop + scroller.clientHeight) < 10;
      if (!isAtBottom) {
        scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'auto' });
      }
    }, 100);
    // setTimeout(() => scrollToBottom(), 100);
      setTimeout(() => scrollerRef.value.scrollToItem(lastIndex, 'end'), 100);
  await    setTimeout(() => scrollerRef.value.scrollToItem(lastIndex, 'end'), 300);
 await   setTimeout(() => scrollToBottom(), 500);
   await  triggerLightHaptic();
     isInitialLoad.value = false;
     showOverlay.value = false;
     setTimeout(() => scrollToBottom(), 850);
  });
}

async function loadOlderMessages() {
  if (!currentGroup.value || isLoadingOlderMessages.value || !hasMoreMessages.value) return;
  
  console.log('🔄 开始加载更多群聊历史消息...');
  isLoadingOlderMessages.value = true;
  
  const prevMessagesLength = currentMessages.value.length;
  const prevHeight = scrollerRef.value?.$el?.scrollHeight || 0;
  const prevScrollTop = scrollerRef.value?.$el?.scrollTop || 0;
  
  try {
    await loadMoreMessages(currentGroup.value);
    
    // 检查是否真的加载了新消息
    const newMessagesLength = currentMessages.value.length;
    console.log(`📊 群聊消息数量变化: ${prevMessagesLength} → ${newMessagesLength}`);
    
    if (newMessagesLength === prevMessagesLength) {
      hasMoreMessages.value = false;
      console.log('📭 没有更多历史消息了');
    } else {
      console.log(`✅ 成功加载 ${newMessagesLength - prevMessagesLength} 条历史消息`);
    }
    
    // 保持滚动位置
    await nextTick();
    if (scrollerRef.value?.$el) {
      const newHeight = scrollerRef.value.$el.scrollHeight;
      const heightDiff = newHeight - prevHeight;
      scrollerRef.value.$el.scrollTop = prevScrollTop + heightDiff;
      scrollerRef.value.reset();
      console.log(`📍 滚动位置调整: ${prevScrollTop} → ${scrollerRef.value.$el.scrollTop} (高度增加: ${heightDiff}px)`);
    }
  } catch (error) {
    console.error('加载更多群聊消息失败:', error);
    hasMoreMessages.value = false;
  } finally {
    isLoadingOlderMessages.value = false;
  }
}

function onScrollerScroll(event: Event) {
  const target = event.target as HTMLElement;
  const scrollTop = target.scrollTop;
  
  // 🔧 优化触发条件：滚动到接近顶部时触发加载
  if (scrollTop < 200 && !isLoadingOlderMessages.value && hasMoreMessages.value && currentGroup.value) {
    console.log(`📜 触发滚动加载: scrollTop=${scrollTop}, 当前消息数=${currentMessages.value.length}`);
    loadOlderMessages();
  }
}

function isNearBottom(): boolean {
  if (!scrollerRef.value || !scrollerRef.value.$el) return false;
  const { scrollTop, scrollHeight, clientHeight } = scrollerRef.value.$el;
  return scrollHeight - (scrollTop + clientHeight) <= 100;
}

watch(
  () => currentMessages.value,
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

watch(inputFocused, (focused) => {
  if (focused) nextTick(() => scrollToBottom());
});

// 语音相关
function toggleInputMode() {
  
  isVoiceMode.value = !isVoiceMode.value;
  if (!isVoiceMode.value && textInputRef.value) {
    nextTick(() => textInputRef.value!.focus());
  }
}

function startVoiceRecording(event: TouchEvent) {
  triggerLightHaptic();
  event.preventDefault();
  if (isSelectMode.value) return;
  touchStartY = event.touches[0].clientY;
  startRecording();
}

function handleVoiceMove(event: TouchEvent) {
  triggerLightHaptic();
  if (!isRecording.value) return;
  const currentY = event.touches[0].clientY;
  const deltaY = touchStartY - currentY;
  cancelRecording.value = deltaY > 50;
}

async function stopVoiceRecording(event: TouchEvent) {
  triggerLightHaptic();
  if (!isRecording.value) return;
  event.preventDefault();
  if (cancelRecording.value) {
    await stopRecording();
  } else {
    await sendVoiceMessage();
    nextTick(() => scrollToBottom());
  }
  cancelRecording.value = false;
  isVoiceMode.value = false;
}

async function cancelVoiceRecording() {
  triggerLightHaptic();
  if (isRecording.value) {
    await stopRecording();
    cancelRecording.value = false;
    isVoiceMode.value = false;
  }
}

function toggleVoicePlayback(item: any) {
  triggerLightHaptic();
  const msgId = item.id || item;
  const audioUrl = typeof item === 'string' ? item : item.text;
  const totalMs = item.duration || 60000; // Default to 60s if no duration
  if (playingAudio.value === msgId) {
    stopVoice();
    if (audioMap.value[msgId]) {
      audioMap.value[msgId].pause();
      delete audioMap.value[msgId];
      delete remainingMs.value[msgId];
    }
    return;
  }
  Object.values(audioMap.value).forEach(a => a.pause());
  Object.keys(audioMap.value).forEach(id => delete remainingMs.value[id]);
  audioMap.value = {};
  const audio = new Audio(audioUrl);
  audioMap.value[msgId] = audio;
  remainingMs.value[msgId] = totalMs;
  audio.addEventListener('timeupdate', () => {
    const left = Math.max(0, totalMs - audio.currentTime * 1000);
    remainingMs.value[msgId] = left;
  });
  audio.addEventListener('ended', () => {
    delete audioMap.value[msgId];
    delete remainingMs.value[msgId];
    stopVoice();
  });
  audio.play().catch(err => {
    console.error('播放语音失败:', err);
    delete audioMap.value[msgId];
    delete remainingMs.value[msgId];
    stopVoice();
  });
  playVoice(audioUrl, msgId);
}
</script>

<style scoped>

.toolbar1 {
  --background: var(--background-color-no);
  background: var(--background-color-no);
  /* overflow: visible; */
}

.input-toolbar {
  transition: all 0.2s ease;
  position: relative;
  bottom: 0;
  width: 100%;
  --background: transparent;
  background: var(--background-color-no);
  backdrop-filter: blur(10px);
}

/* === Message Container === */
.message-container {
  height: calc(100vh - var(--content-bottom));
}

.scroller {
  height: calc(100vh - var(--content-bottom));
  overflow-y: auto;
  margin-top: -100px;
  padding-top:120px;
  padding-bottom: 160px;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  
}

/* === Load More Button === */
.load-more-container {
  display: flex;
  justify-content: center;
  padding: 10px 0;
}

/* === Message Components === */
.chat-container {
  padding-bottom: 5px;
}

.chat-container.my-message .message-wrapper {
  justify-content: flex-end;
}

.message-wrapper {
  display: flex;
  align-items: flex-end;
  margin: 5px 0;
  position: relative;
}

.message-bubble {
  padding: 0;
  border-radius: 30px 30px 30px 5px !important;
  color: var(--ion-color-dark-tint, #333);
  cursor: pointer;
  margin-left: 10px;
  max-width: 80%;
}

.message-bubble:has(.image-container),
.message-bubble:has(.video-container) {
  padding: 0;
}

.my-message .message-bubble {
  color: #fff;
  border-radius: 30px 30px 5px 30px !important;
  margin-right: 10px;
}

.textchat {
  padding:10px 16px;
  font-size: 13px;
  display: inline-block;
  text-align: left;
  max-width: 100%;
  border-radius: 30px 30px 30px 5px !important;
  background: var(--ion-color-dark-contrast, #e0e0e0);
  z-index: 9999;
  line-height: 1.4;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.textchat.my-message {
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
}

.highlighted-message {
  box-shadow: 0 0 10px rgba(82, 238, 209, 0.7), 0 0 20px rgba(35, 213, 171, 0.5);
  color: #fff;
  transition: all 0.3s ease-in-out;
  z-index: 9999;
}

.message-avatar {
  width: 35px;
  height: 35px;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.649);
  margin-left: 10px;
  border: 2px solid black;
}

.my-message .message-avatar {
  margin-left: 0;
  margin-right: 10px;
}

.timestamp-container {
  font-size: 8px;
  color: #bbb;
  display: flex;
  align-items: center;
}

.my-timestamp {
  justify-content: flex-end;
  margin-right: 50px;
}

.other-timestamp {
  justify-content: flex-start;
  margin-left: 50px;
}

.pending-status {
  color: #00ffbb;
  font-style: italic;
  margin-left: 2px;
}

.sender-nickname {
  font-size: 10px;
  color: #888;
  margin-right: 5px;
  font-weight: 500;
}

/* === Media Elements === */
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
  background: #f0f0f0 url('loading.gif') no-repeat center;
}

.media-element[lazy="loaded"] {
  opacity: 1;
}

/* === Voice Components === */
.voice-bar {
  height: 40px;
  background: var(--ion-color-dark-contrast, #e0e0e0);
  border-radius: 30px 30px 30px 5px;
  display: flex;
  align-items: center;
  padding: 0 10px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.my-message .voice-bar {
  background: #01b872;
  border-radius: 30px 30px 5px 30px;
}

.voice-bar.playing {
  background: rgba(0, 205, 137, 0.7);
}

.failed-voice {
  background: #ff4d4d !important;
  opacity: 0.8;
}
.glass-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: var(--ion-background-color); z-index: 3; }
.pending-voice {
  background-size: 200% 200%;
  animation: gradientBreath 6s ease infinite;
}

.voice-bar .duration {
  color: #fff;
  font-size: 12px;
  font-weight: 500;
}

.my-message .voice-bar .duration {
  color: #fff;
}

.voice-input {
  flex: 1;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(0, 0, 0);
  border-radius: 20px;
  color: #fff;
  font-size: 14px;
  text-align: center;
  user-select: none;
  touch-action: none;

  padding: 5px;
  width: 100%;
}

.voice-input.recording {
  background: rgba(0, 205, 137, 0.7);
}

.voice-input.cancel-recording {
  background: rgba(255, 77, 77, 0.7);
}

/* === Input Area === */
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
  color:var(--ion-text-color);
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
}

.drawer-toggle,
.action-button {
  --padding-start: 8px;
  --padding-end: 8px;
}

/* === Meta Data === */
.meta-cards {
  position: relative;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--ion-background-color, #ffffff);
  z-index: 1000;
  transition: bottom 0.2s ease;
  width: 100%;
}

.meta-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  border-radius: 30px;
  font-size: 14px;
}

.meta-content {
  flex: 1;
  word-break: break-word;
  font-size: 13px;
}

.meta-icon {
  font-size: 20px;
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
  box-shadow: 0 2px 6px rgba(255, 255, 255, 0.71);
  z-index: 100;
}

.about-own {
  right: 0;
  top: 0;
  left: auto;
}

.about-other {
  left: 0;
  top: 0;
  right: auto;
}

.think-block {
  position: relative;
  align-self: start;
  padding: 7px 9px 15px;
  border-radius: 23px;
  font-style: italic;
  font-size: 9px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
  background: rgba(255, 255, 255, 0.165);
  color: #acacac;
  box-shadow: 0 2px 3px rgba(0, 0, 0, 0.171);
  z-index: -1;
  pointer-events: none;
  max-width: 90%;
  min-width: 39px;
  overflow: visible;
}

.think-own {
  right: -10px;
  top: 13px;
  left: auto;
}

.think-other {
  left: -10px;
  top: 13px;
  right: auto;
}

.think-reply-user {
  font-weight: bold;
  font-size: 7px;
  position: absolute;
  top: -10px;
  overflow: visible;
}

.think-reply-user1 {
  font-weight: bold;
  font-size: 13px;
  overflow: visible;
}

/* === Selection Mode === */
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

/* === Context Menu === */
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

/* === Emoji Picker === */
.emoji-picker-overlay {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  top: 0;
  z-index: 2200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  transition: all 0.3s ease-in-out;
}

.emoji-picker-panel {
  background: var(--ion-background-color, #ffffff);
  border-radius: 20px 20px 0 0;
  width: 100%;
  padding: 24px 16px 40px 16px;
  box-shadow: 0 -3px 30px rgba(0, 0, 0, 0.18);
  overflow-y: auto;
  height: 300px;
  backdrop-filter: blur(10px);
}

.emoji-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: center;
  align-items: center;
}

.emoji-item {
  font-size: 30px;
  cursor: pointer;
  transition: transform 0.12s;
  border-radius: 8px;
  padding: 6px 10px;
  user-select: none;
}

.emoji-message-big {
  font-size: 3.2rem;
  background: transparent !important;
  box-shadow: none;
  border-radius: 0;
  padding: 0 6px;
  line-height: 1.1;
  display: inline-block;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}

.slide-enter-to,
.slide-leave-from {
  transform: translateX(0);
}

/* === Blur Overlay === */
.blur-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1998;
  backdrop-filter: blur(12px);
  background: rgba(0, 0, 0, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
}

.center-message-popup {
  position: relative;
  max-width: 100vw;
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.center-message-bubble {
  min-width: 220px;
  max-width: 100%;
  max-height: 600px;
  min-height: 40px;
  border-radius: 30px 30px 30px 8px;
  box-shadow: 0 4px 40px rgba(0, 0, 0, 0.18);
  font-size: 15px;
  margin-bottom: 20px;
  word-break: break-all;
  overflow-y: auto;
  padding: 20px;
}

.center-message-bubble.my-message {
  color: #fff !important;
  border-radius: 30px 30px 8px 30px;
}

.center-timestamp {
  color: #bbb;
  font-size: 11px;
  text-align: center;
  background: var(--ion-background-color, #ffffff);
  border-radius: 20px;
  position: fixed;
  bottom: 5%;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* === Markdown Content === */
.meta-text-container {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.meta-text-container.my-message {
  align-items: flex-end;
}

.markdown-content {
  word-break: break-word;
  overflow-wrap: break-word;
  line-height: 1.3;
  font-size: 13px;
  max-width: 100%;
  overflow-x: auto;
}

.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4),
.markdown-content :deep(h5),
.markdown-content :deep(h6) {
  margin: 10px 0;
  font-weight: bold;
  max-width: 100%;
  overflow-x: auto;
  word-break: break-all;
  white-space: pre-wrap;
  box-sizing: border-box;
}

.markdown-content :deep(h1) { font-size: 1.5em; }
.markdown-content :deep(h2) { font-size: 1.4em; }
.markdown-content :deep(h3) { font-size: 1.3em; }
.markdown-content :deep(h4) { font-size: 1.2em; }
.markdown-content :deep(h5) { font-size: 1.1em; }
.markdown-content :deep(h6) { font-size: 1em; }

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin: 8px 0;
  padding-left: 20px;
  max-width: 100%;
  overflow-x: auto;
  word-break: break-all;
  white-space: pre-wrap;
  box-sizing: border-box;
}

.markdown-content :deep(li) {
  margin: 4px 0;
}

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

.markdown-content :deep(blockquote) {
  border-left: 4px solid #ccc;
  margin: 8px 0;
  padding-left: 10px;
  color: #666;
  max-width: 100%;
  overflow-x: auto;
  word-break: break-all;
  white-space: pre-wrap;
  box-sizing: border-box;
}

.markdown-content :deep(code) {
  padding: 2px 4px;
  border-radius: 4px;
  font-family: monospace;
  max-width: 100%;
  overflow-x: auto;
  word-break: break-all;
  white-space: pre-wrap;
  box-sizing: border-box;
}

.markdown-content :deep(pre) {
  background: rgba(0, 0, 0, 0.1);
  padding: 10px;
  border-radius: 8px;
  overflow-x: auto;
  font-family: monospace;
  position: relative;
  max-width: 100%;
  overflow-x: auto;
  word-break: break-all;
  white-space: pre-wrap;
  box-sizing: border-box;
}

.copy-code-button {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(255, 255, 255, 0.8);
  border: none;
  border-radius: 4px;
  padding: 4px;
  cursor: pointer;
  z-index: 9999;
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

.markdown-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  max-width: 100%;
  overflow-x: auto;
  word-break: break-all;
  white-space: pre-wrap;
  box-sizing: border-box;
}

.markdown-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 8px 0;
  max-width: 100%;
  overflow-x: auto;
  word-break: break-all;
  white-space: pre-wrap;
  box-sizing: border-box;
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

.my-message .markdown-content :deep(a) {
  color: #5900cd;
  text-decoration: underline;
}

.my-message .markdown-content :deep(blockquote) {
  border-left-color: #fff;
  color: #ddd;
}

.my-message .copy-code-button {
  background: rgba(0, 184, 114, 0.8);
}

.my-message .copy-code-button:hover {
  background: rgba(0, 184, 114, 1);
}

.my-message .copy-code-button ion-icon {
  color: #fff;
}

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

.markdown-content :deep(.hljs-comment),
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
  color: #ddd;
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

/* === Number Message === */
.number-message {
  display: inline-block;
  color: rgb(143, 143, 143);
  font-weight: bold;
  font-size: 30px;
  animation: numberPop 0.3s ease-in-out;
}

.number-badge {
  display: inline-block;
  transform: scale(1);
  transition: transform 0.2s ease;
}

/* === Header and Avatars === */
.chat-name {
  font-size: 15px;
}

.avatar-container {
  display: flex;
  justify-content: center;
  align-items: start;
}

.header-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.843);
  border: 2px solid black;
}

.header-avatar:not(:first-child) {
  margin-left: -10px;
}

/* === Skeleton Screen === */
.skeleton-container {
  height: 100vh;
  z-index: 9999;
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
  border-radius: 13px 13px 13px 0;
  background: #fbfbfb;
  animation: pulse 1.5s infinite ease-in-out;
}

.skeleton-message.my-message .skeleton-bubble {
  background: #01b872;
  border-radius: 13px 13px 0 13px;
}

/* === URL Links === */
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

/* === Animations === */
@keyframes gradientBreath {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes numberPop {
  0% { transform: scale(0.8); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
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

/* === Miscellaneous === */
.textchat p {
  margin: 0;
  padding: 0;
  font-size: 13px;
  line-height: 1.4;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.native-selectable {
  user-select: text;
  -webkit-user-select: text;
  cursor: text;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>