<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted, Directive } from 'vue';
import { useRouter } from 'vue-router';
import { debounce } from 'lodash';
import { getTalkFlowCore, LocalChatMessage, MessageType } from '@/composables/TalkFlowCore';
import { useVoiceBar } from '@/composables/useVoiceBar';
import { useGroupChat } from '@/composables/useGroupChat';
import { 
  IonBackButton, IonButton, IonButtons, IonIcon, IonTitle, IonToolbar, IonHeader, 
  IonFooter, IonPage, IonCheckbox, IonProgressBar, IonModal, IonContent ,toastController 
} from '@ionic/vue';
import {
  ellipsisHorizontal, ellipsisVertical, playOutline, pauseOutline, refreshOutline,
  ellipsisHorizontalCircleOutline, micOutline, chatboxOutline, copyOutline, trashOutline,
  returnDownBackOutline, closeCircleOutline, lockClosedOutline, chevronBackOutline,
  chatbubbleEllipsesOutline, attachOutline, closeOutline, checkmarkOutline,
  addCircleOutline, imageOutline, peopleOutline,
  addOutline,
  sendOutline,
  notificationsCircleOutline,
  callOutline
} from 'ionicons/icons';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
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
const showToast = async (message: string, color: 'success' | 'warning' | 'danger' = 'success') => {
  const toast = await toastController.create({
    message,
    duration: 2000,
    color,
    position: 'top'
  });
  await toast.present();
};
const { formatLastTime } = useDateFormatter();

const chatFlow = getTalkFlowCore();
const voiceBar = useVoiceBar();
const {
  closeChat, currentChatPub, getAliasRealtime, newMsg, sendChat, resendMessage,
  chatMessages, userAvatars, formatTimestamp, currentUserPub, loadMoreChatHistory,
  isLoadingHistory, generateChatId, retractMessage, triggerLightHaptic,
  friendRemarks,currentUserAlias
} = chatFlow;
const { isRecording, recordingDuration, playingAudio, transcriptions, startRecording, 
        stopRecording, sendVoiceMessage, playVoice, stopVoice, initialize
} = voiceBar;
mountClass();
import { useTheme } from '@/composables/useTheme';
import { useBarkNotification } from '@/composables/useBarkNotification';
import SpinningLoader from '@/components/ui/SpinningLoader.vue';
import VoiceBar from '@/components/VoiceBar.vue';
import ImageMessage from '@/components/ui/ImageMessage.vue';
import HlsVideoPlayer from '@/components/ui/HlsVideoPlayer.vue';
const { isDark } = useTheme();

const barkNotification = useBarkNotification();
const { 
  initBarkSettings,
  currentChatBarkConfig,
  setBarkConfigForPubKey,
} = barkNotification;
const uploadProgress = ref(0);
const loadedVideos = ref<{ [msgId: string]: boolean }>({});
const videoRefs = ref<{ [msgId: string]: HTMLVideoElement }>({});
const isLoadingMessages = ref(true);

interface Meta { type: 'about' | 'think'; content: string; from?: string; alias?: string }

const typedMeta = ref<Meta[]>([]);
const inputMode = ref<'default' | 'about' | 'think'>('default');

const getGunAvatar = (pub: string) => {
  return gunAvatar({
    pub: pub,
    round: false,
    size: 200,
    dark: isDark.value,
    svg: true
  } as any);
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

// 模态窗口状态
const isModalOpen = ref(false);

// 打开模态窗口
function openModal() {
  isModalOpen.value = true;
}

// 关闭模态窗口
function closeModal() {
  isModalOpen.value = false;
}

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

// =================== Think/Reply 解析加强 ===================
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
  const pubKey = currentChatPub.value || "";
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



function stripThinkTags(text: any): string {
  // 匹配 <think> 标签，包括带有 from 和 alias 属性的情况
  const thinkRegex = /<think(?:\s+from=".*?"(?:\s+alias=".*?")?)?>[\s\S]*?<\/think>/g;
  // 移除所有 <think> 标签及其内容
  return text.replace(thinkRegex, '').trim();
}

// 支持 think from/alias
function onSelectThink(item: LocalChatMessage | null) {
  if (item && item.text && !typedMeta.value.some(m => m.content === stripThinkTags(item.text))) {
    typedMeta.value.push({
      type: 'think',
      content: stripThinkTags(item.text),
      from: item.from,
      alias: getDisplayName(item.from)
    });
    //  inputMode.value = 'think';
    // if (textInputRef.value) {
    //   textInputRef.value.focus();
    // }
  }
  cancelSelectionMode(); 
  //  hideContextMenu();
}
// 选中模式下取消选中
function cancelSelectionMode() {
  selectedMessage.value = null;
  contextMenu.value.visible = false;
  //  isSelectMode.value = false;
  //  selectedMessages.value = [];
}

function copyText(content: string) {
  const cleanedContent = stripThinkTags(content);
  if (cleanedContent) {
    navigator.clipboard.writeText(cleanedContent).then(() => showToast('copied', 'success'));
  }
  cancelSelectionMode(); // 直接退出全屏
}


async function deleteMessage(item: LocalChatMessage | null) {
  cancelSelectionMode();
  if (!item?.msgId || !currentChatPub.value) return;
  const chatId = generateChatId(currentUserPub.value!, currentChatPub.value);
  await retractMessage(chatId, item.msgId);
  // hideContextMenu();

  // await cancelSelectionMode()
}

function copySelectedMessages1() {
  if (selectedMessages.value.length === 0) return;
  const textsToCopy = selectedMessages.value
    .map(msgId => findMessageById(msgId))
    .filter(msg => msg && msg.type === 'text')
    .map(msg => msg!.text)
    .filter(Boolean)
    .join('\n\n');
  if (textsToCopy) {
    navigator.clipboard.writeText(textsToCopy).then(() => {
      hideContextMenu();
    });
  }
}

async function deleteSelectedMessages1() {
  if (selectedMessages.value.length === 0 || !currentChatPub.value) return;
  const chatId = generateChatId(currentUserPub.value!, currentChatPub.value);
  for (const msgId of selectedMessages.value) {
    await retractMessage(chatId, msgId);
  }
  hideContextMenu();
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

// 支持备注优先
function getDisplayName(pub: string): string {
  const remark = chatFlow.friendRemarks.value[pub]?.remark;
  return remark && remark.trim() !== '' ? remark : getAliasRealtime(pub);
}

// 判断下一条消息是否在1分钟内，用于决定是否使用全圆角
function shouldUseFullRadius(index: number): boolean {
  if (!currentChatMessages.value || index >= currentChatMessages.value.length - 1) {
    return false;
  }
  
  const currentMsg = currentChatMessages.value[index];
  const nextMsg = currentChatMessages.value[index + 1];
  
  if (!currentMsg.timestamp || !nextMsg.timestamp) {
    return false;
  }
  
  // 计算时间差（毫秒）
  const timeDiff = Math.abs(nextMsg.timestamp - currentMsg.timestamp);
  const oneMinute = 60 * 1000; // 1分钟 = 60秒 * 1000毫秒
  
  return timeDiff <= oneMinute;
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
     isSelectMode.value = false;
   selectedMessages.value = [];
  contextMenu.value.visible = false;
  setTimeout(() => selectedMessage.value = null, 200);
}

function goToFriendProfile() {

  if (currentChatPub.value) {
    router.push({ path: '/friend-profile', query: { pub: currentChatPub.value } });
  }
  
}

async function startVoiceRecording(event: TouchEvent) {
  
  triggerLightHaptic();
  event.preventDefault();
  touchStartY = event.touches[0].clientY;
  await startRecording();
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
}

async function cancelVoiceRecording() {
  if (isRecording.value) {
    await stopRecording();
    cancelRecording.value = false;
  }
}

 async function handleActionButtonClick() {

  if (isVoiceMode.value) {
    isVoiceMode.value = false;
  } else if (newMsg.value) {
   await  sendChat('text', newMsg.value);
   await  testFriendBarkNotification();
      newMsg.value = '';
  typedMeta.value = [];
  inputMode.value = 'default';
  setTimeout(() => scrollToBottom(), 150);
  resetHeight();
  if (inputFocused.value) {
    nextTick(() => {
      if (textInputRef.value) {
        textInputRef.value.focus();
        adjustHeight();
      
        scrollToBottom();
      }
    });
  }
    // newMsg.value += '\n';
    // nextTick(() => {
    //   if (textInputRef.value) {
    //     textInputRef.value.focus();
    //     adjustHeight();
    //   }
    // });
  } else {
   
    isVoiceMode.value = true;
   initialize(); 
  }
}

function removeMeta(index: number) {
  typedMeta.value.splice(index, 1);
}

// ========== think 发送时自动写 from/alias ==========
function handleEnterKey(event: KeyboardEvent) {
  event.preventDefault();
  scrollToBottom();
  if (!newMsg.value.trim() && !typedMeta.value.length) return;

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

  const trimmedMsg = newMsg.value.trim();
  if (trimmedMsg && /^\d+$/.test(trimmedMsg)) {
    full += `Number:${trimmedMsg}`;
  } else if (trimmedMsg) {
    full += trimmedMsg;
  }

  sendChat('text', full);
  newMsg.value = '';
  typedMeta.value = [];
  inputMode.value = 'default';
  setTimeout(() => scrollToBottom(), 150);
  resetHeight();
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
      video.play().catch((err) => {/* Playback failed */});
    }
  });
}

// HLS视频播放器事件处理
function onVideoLoaded(msgId: string) {
  loadedVideos.value[msgId] = true;
  console.log('Video loaded:', msgId);
}

function onVideoError(msgId: string, error: any) {
  console.error('Video error for', msgId, ':', error);
  showToast('Video loading failed', 'danger');
}

function onVideoPlay(msgId: string) {
  console.log('Video playing:', msgId);
}

function onVideoPause(msgId: string) {
  console.log('Video paused:', msgId);
}

function adjustHeight() {
  const el = textInputRef.value;
  if (el) {
    el.style.height = 'auto'; // Reset height to auto to get correct scrollHeight
    const newHeight = Math.min(el.scrollHeight, 120);
    el.style.height = `${newHeight}px`;
    if (capsuleRef.value) capsuleRef.value.style.height = `${newHeight + 6}px`; // Account for input-capsule padding
  }
}

function resetHeight() {
  if (!newMsg.value && textInputRef.value && capsuleRef.value && !inputFocused.value) {
    textInputRef.value.style.height = '40px'; // Reset to min-height for textarea
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
   // showToast('无法打开链接', 'error');
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
    
    // 检查新消息中是否有删除证书消息
    if (newMessages.length > (oldMessages?.length || 0)) {
      const newMsgs = newMessages.slice(oldMessages?.length || 0);
      newMsgs.forEach(msg => {
        if (msg.type === 'text' && msg.text && isDeleteCertMessage(msg.text)) {
          // 异步处理删除证书消息，避免阻塞UI
          nextTick(() => {
            handleDeleteCertMessage(msg.text, msg.from, msg.msgId);
          });
        }
      });
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
// 当前选择的配置类型：'self' 或 'friend'
const configType = ref<'self' | 'friend'>('self');

// 当前选择的好友公钥（用于设置好友的Bark配置）
const selectedFriendPub = ref<string>('');

onMounted(async () => {
  // 初始化 Bark 设置
  await initBarkSettings();
  
  // 如果当前有聊天对象，默认选择好友配置
  if (currentChatPub.value) {
    configType.value = 'friend';
    selectedFriendPub.value = currentChatPub.value;
  }
  

  setTimeout(async () => {
   await scrollToBottom()
    showOverlay.value = false;
  }, 10);
  //  initializeAudioPermissions();
   scrollToBottomInitial();
  scrollerEl.value = scrollerRef.value?.$el;


  
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
   // console.error('Keyboard setup failed:', err);
  }

  document.addEventListener('click', handleGlobalClick);

  if (currentChatMessages.value.length > 0) {
    const pubKey = currentChatPub.value || '';
    chatMessages.value[pubKey] = chatMessages.value[pubKey].sort((a, b) => (a.id || 0) - (b.id || 0));
    chatMessages.value = { ...chatMessages.value };
    scrollToBottomInitial();
  }

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
    // closeChat();
    Keyboard.removeAllListeners();
    // 清理所有定时器和间隔器
    cleanupAllTimers();
    // 清理长按定时器
    clearPressTimer();
  });
});


// 使用Set管理定时器和间隔器，避免内存泄漏
const activeTimers = new Set<NodeJS.Timeout>();
const activeIntervals = new Set<NodeJS.Timeout>();

const addTimer = (timer: NodeJS.Timeout) => {
  activeTimers.add(timer);
  return timer;
};

// 清理所有定时器的函数
const cleanupAllTimers = () => {
  activeTimers.forEach(timer => {
    try {
      clearTimeout(timer);
    } catch (error) {
      // Failed to clear timer
    }
  });
  activeTimers.clear();
  
  activeIntervals.forEach(interval => {
    try {
      clearInterval(interval);
    } catch (error) {
      // Failed to clear interval
    }
  });
  activeIntervals.clear();
};

function showContextMenuEdgeLimited(item: LocalChatMessage, clientX: number, clientY: number) {
  const menuWidth = 160; // 选项栏宽度，根据实际宽度调整
  const menuHeight = 46; // 高度
  const padding = 6;
  let x = clientX;
  let y = clientY - menuHeight -20;
  // 边缘处理
  if (x + menuWidth > window.innerWidth - padding) {
    x = window.innerWidth - menuWidth - padding;
  }
  if (x < padding) x = padding;
  if (y + menuHeight > window.innerHeight - padding) {
    y = window.innerHeight - menuHeight - padding;
  }
  if (y < padding) y = padding;
  contextMenu.value = {
    visible: true,
    x,
    y,
    type: item.type,
    content: item.text || '',
    item,
    scaleAnimation: true
  };
  selectedMessage.value = item.msgId || null;
}

let pressTimer: NodeJS.Timeout | null = null;
let pressStartPosition: {x: number, y: number} | null = null;

function clearPressTimer() {
  if (pressTimer) {
    clearTimeout(pressTimer);
    if (activeTimers.has(pressTimer)) {
      activeTimers.delete(pressTimer);
    }
    pressTimer = null;
  }
  pressStartPosition = null;
}

// 移动超过一定距离算取消
function movedFarEnough(e: TouchEvent | MouseEvent) {
  if (!pressStartPosition) return false;
  let x: number, y: number;
  if ((e as TouchEvent).touches && (e as TouchEvent).touches.length) {
    x = (e as TouchEvent).touches[0].clientX;
    y = (e as TouchEvent).touches[0].clientY ;
  } else {
    x = (e as MouseEvent).clientX;
    y = (e as MouseEvent).clientY;
  }
  const dx = Math.abs(x - pressStartPosition.x);
  const dy = Math.abs(y - pressStartPosition.y);
  return dx > 10 || dy > 10;
}

// 移动中取消
function onBubbleTouchMove(event: TouchEvent) {
  if (movedFarEnough(event)) clearPressTimer();
}

function onBubbleTouchStart(item: LocalChatMessage, event: TouchEvent) {
  if ((item.type !== 'text' && item.type !== 'voice') || isSelectMode.value) return;
  pressStartPosition = {
    x: event.touches[0].clientX,
    y: event.touches[0].clientY
  };
  pressTimer = addTimer(setTimeout(() => {
    showContextMenuEdgeLimited(item, event.touches[0].clientX, event.touches[0].clientY);
    triggerLightHaptic();
  }, 450));
  event.target?.addEventListener(
  'touchmove',
  (e) => onBubbleTouchMove(e as TouchEvent),
  { passive: false }
);

}
function onBubbleTouchEnd(item: LocalChatMessage, event: TouchEvent) {
  clearPressTimer();
  event.target?.removeEventListener(
  'touchmove',
  (e) => onBubbleTouchMove(e as TouchEvent)
);

}
function onBubbleMouseDown(item: LocalChatMessage, event: MouseEvent) {
  if ((item.type !== 'text' && item.type !== 'voice') || isSelectMode.value) return;
  pressStartPosition = { x: event.clientX, y: event.clientY };
  pressTimer = addTimer(setTimeout(() => {
    showContextMenuEdgeLimited(item, event.clientX, event.clientY);
    triggerLightHaptic();
  }, 450));
}
function onBubbleMouseUp(item: LocalChatMessage, event: MouseEvent) {
  clearPressTimer();
}



const selectedMsgObj = computed(() => {
  if (!selectedMessage.value || !currentChatPub.value) return null;
  return (chatMessages.value[currentChatPub.value] || []).find(msg => msg.msgId === selectedMessage.value) || null;
});


function onSelectCheckbox(item: LocalChatMessage, e: CustomEvent) {
  triggerLightHaptic();
  const checked = e.detail.checked; // true/false
  const idx = selectedMessages.value.indexOf(item.msgId!);
  if (checked && idx === -1) {
    selectedMessages.value.push(item.msgId!);
  } else if (!checked && idx !== -1) {
    selectedMessages.value.splice(idx, 1);
  }
}

const showEmojiPicker = ref(false);
const emojiList = [
  "👍", "😂", "😅", "😍", "🤔", "🥹", "👏", "🔥", "😳", "🥲", "😭", "🤝", "🫶", "🙏",
  "💯", "😡", "😎", "🙌", "😉", "😐", "❤️", "💩", "🌈","😊"
]; 

function sendThinkAndEmojiReply(emoji: string) {

  if (selectedMsgObj.value) {
    const from = selectedMsgObj.value.from;
    const alias = getDisplayName(from);
    const cleanText = stripThinkTags(selectedMsgObj.value.text || '');
    const thinkBlock = `<think from="${from}" alias="${alias}">${cleanText}</think>`+ emoji;
    sendChat('text', thinkBlock);
  }
  showEmojiPicker.value = false;
  cancelSelectionMode();
  triggerLightHaptic();
  addTimer(setTimeout(() => scrollToBottom(), 100));
}

function isSingleEmoji(text: string): boolean {
  const emojiRegex = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)$/u;
  return emojiRegex.test(text.trim());
}

function truncateContent(content: string, maxLength: number) {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength) + '...';
}

// 群聊邀请相关函数
function isGroupInvitationMessage(text: string): boolean {
  // 🔧 修复：支持新的XML标签格式和旧格式
  return text.includes('🎯GROUP_INVITATION_START🎯') && text.includes('🎯GROUP_INVITATION_END🎯') ||
         text.startsWith('GroupInvitation:');
}

// API URL 消息相关函数
function isApiUrlMessage(text: string): boolean {
  return text.includes('<apiurl>') && text.includes('</apiurl>') && !text.includes('<delete>');
}

function parseApiUrlMessage(text: string): string {
  const match = text.match(/<apiurl>(.*?)<\/apiurl>/);
  return match ? match[1] : '';
}

function getApiUrlDisplayText(text: string): string {
  const apiUrl = t('chatPageRemoteNotificationCertificate') ;
  if (!apiUrl) return text;
  
  // 隐藏完整的API URL，只显示服务器域名
  try {
    const url = new URL(apiUrl);
    return ` ${url.hostname}`;
  } catch {
    return t('chatPageRemoteNotificationCertificate');
  }
}

// 处理API URL消息点击
async function handleApiUrlClick(text: string, fromPub: string, msgId?: string) {
  const apiUrl = parseApiUrlMessage(text);
  if (!apiUrl || !fromPub) return;
  
  try {
    // 先删除旧的配置（如果存在）
    await barkNotification.deleteBarkConfigForPubKey(fromPub);
    
    // 添加新的API URL配置
    await setBarkConfigForPubKey(fromPub, apiUrl);
    
    showToast(t('chatPageAcceptedRemoteNotificationCertificate'), 'success');
    
    // 如果提供了msgId，删除原消息并发送已接受的文本消息
    if (msgId && currentChatPub.value) {
      // 找到要删除的消息
      const messages = chatMessages.value[fromPub] || [];
      const messageToDelete = messages.find(msg => msg.msgId === msgId);
      
      if (messageToDelete) {
        // 删除原消息
        await deleteMessage(messageToDelete);
        
        // 发送已接受的文本消息
        const acceptedMessage = t('chatPageAcceptedRemoteNotificationCertificate');
        await sendChat('text', acceptedMessage);
      }
    }
  } catch (error) {
    console.error('保存API URL失败:', error);
   // showToast('保存失败，请检查API URL格式', 'error');
  }
}

// 删除证书消息相关函数
function isDeleteCertMessage(text: string): boolean {
  return text.includes('<delete>') && text.includes('</delete>') && text.includes('<pub>') && text.includes('<apiurl>');
}

function parseDeleteCertMessage(text: string): { targetPub: string; apiUrl: string } | null {
  const deleteMatch = text.match(/<delete>(.*?)<\/delete>/);
  if (!deleteMatch) return null;
  
  const content = deleteMatch[1];
  
  // 解析pub标签
  const pubMatch = content.match(/<pub>(.*?)<\/pub>/);
  if (!pubMatch) return null;
  
  // 解析apiurl标签
  const apiUrlMatch = content.match(/<apiurl>(.*?)<\/apiurl>/);
  if (!apiUrlMatch) return null;
  
  return {
    targetPub: pubMatch[1].trim(),
    apiUrl: apiUrlMatch[1].trim()
  };
}

function isDeleteOkMessage(text: string): boolean {
  return text.includes(`<deleteok>${t('chatPageSecurityCertificateDeleted')}</deleteok>`);
}

// 检测是否为远程通知相关的消息
function isRemoteNotificationMessage(text: string): boolean {
  return isGroupInvitationMessage(text) || 
         isApiUrlMessage(text) || 
         isDeleteCertMessage(text) || 
         isDeleteOkMessage(text);
}

// 已处理的删除消息ID集合
const processedDeleteMessages = new Set<string>();

// 处理删除证书消息
async function handleDeleteCertMessage(text: string, fromPub: string, msgId: string) {
  // 检查是否已经处理过这条消息
  if (processedDeleteMessages.has(msgId)) {
    return;
  }
  
  const deleteData = parseDeleteCertMessage(text);
  if (!deleteData || !fromPub) return;
  
  // 检查发送者是否是自己，如果是自己则不执行删除操作
  if (fromPub === currentUserPub.value) {
    return;
  }
  
  // 检查删除请求中的公钥是否与发送者匹配
  if (deleteData.targetPub !== fromPub) {
    return;
  }
  
  // 检查下一条消息是否是删除确认消息
  const messages = chatMessages.value[fromPub] || [];
  const currentIndex = messages.findIndex(msg => msg.msgId === msgId);
  if (currentIndex !== -1 && currentIndex < messages.length - 1) {
    const nextMessage = messages[currentIndex + 1];
    if (nextMessage && isDeleteOkMessage(nextMessage.text)) {
      // 下一条消息是删除确认，不执行删除
      return;
    }
  }
  
  try {
    // 执行删除操作
    await barkNotification.deleteBarkConfigForPubKey(fromPub);
    
    // 标记消息已处理
    processedDeleteMessages.add(msgId);
    
    // 发送删除确认消息
    await sendChat('text', `<deleteok>${t('chatPageSecurityCertificateDeleted')}</deleteok>`);
    
    showToast(t('chatPageRemoteNotificationCertificateDeleted'), 'success');
  } catch (error) {
    console.error('删除证书失败:', error);
  //  showToast('删除证书失败', 'error');
  }
}

function parseGroupInvitationMessage(text: string): string {
  try {
    // 🔧 修复：支持新的XML标签格式
    if (text.includes('🎯GROUP_INVITATION_START🎯') && text.includes('🎯GROUP_INVITATION_END🎯')) {
      const startMarker = '🎯GROUP_INVITATION_START🎯';
      const endMarker = '🎯GROUP_INVITATION_END🎯';
      const startIndex = text.indexOf(startMarker) + startMarker.length;
      const endIndex = text.indexOf(endMarker);
      const xmlContent = text.substring(startIndex, endIndex);
      
      // 解析XML标签获取群聊名称
      const groupMatch = xmlContent.match(/<group>(.*?)<\/group>/);
      const groupName = groupMatch ? groupMatch[1] : 'group';
      
      return `Invite you to join the group"${groupName}"`;
    } 
    // 兼容旧格式
    else if (text.startsWith('GroupInvitation:')) {
      const jsonStr = text.replace('GroupInvitation:', '');
      const invitationData = JSON.parse(jsonStr);
      return invitationData.message || `Invite you to join the group"${invitationData.groupName || 'group'}"`;
    } 
    else {
      return 'Invite you to join the group';
    }
  } catch (error) {
   // console.error('解析群聊邀请消息失败:', error);
    return 'Invite you to join the group';
  }
}

function extractGroupInvitationData(text: string): any | null {
  try {
    // 🔧 修复：支持新的XML标签格式
    if (text.includes('🎯GROUP_INVITATION_START🎯') && text.includes('🎯GROUP_INVITATION_END🎯')) {
      const startMarker = '🎯GROUP_INVITATION_START🎯';
      const endMarker = '🎯GROUP_INVITATION_END🎯';
      const startIndex = text.indexOf(startMarker) + startMarker.length;
      const endIndex = text.indexOf(endMarker);
      const xmlContent = text.substring(startIndex, endIndex);
      
     // console.log('🔍 解析XML内容:', xmlContent);
      
      // 解析各个XML标签
      const groupMatch = xmlContent.match(/<group>(.*?)<\/group>/);
      const pubMatch = xmlContent.match(/<pub>(.*?)<\/pub>/);
      const privMatch = xmlContent.match(/<priv>(.*?)<\/priv>/);
      const epubMatch = xmlContent.match(/<epub>(.*?)<\/epub>/);
      const eprivMatch = xmlContent.match(/<epriv>(.*?)<\/epriv>/);
      const inviterMatch = xmlContent.match(/<inviter>(.*?)<\/inviter>/);
      const timeMatch = xmlContent.match(/<time>(.*?)<\/time>/);
      
      if (!pubMatch || !privMatch || !epubMatch || !eprivMatch) {
     //   console.error('❌ 缺少必要的密钥字段');
        return null;
      }
      
      // 构建完整的密钥对对象
      const keyPair = {
        pub: pubMatch[1],
        priv: privMatch[1],
        epub: epubMatch[1],
        epriv: eprivMatch[1]
      };
      
     // console.log('🔐 解析出的密钥对:', keyPair);
      
      return {
        groupName: groupMatch ? groupMatch[1] : 'group',
        keyPair: keyPair,
        invitedBy: inviterMatch ? inviterMatch[1] : 'unknown',
        inviteTime: timeMatch ? timeMatch[1] : new Date().toISOString()
      };
    } 
    // 兼容旧格式
    else if (text.startsWith('GroupInvitation:')) {
      const jsonStr = text.replace('GroupInvitation:', '');
      return JSON.parse(jsonStr);
    } 
    else {
      return null;
    }
  } catch (error) {
    // console.error('提取群聊邀请数据失败:', error);
    return null;
  }
}

async function acceptGroupInvitation(item: LocalChatMessage) {
  try {
    if (!item.text || !isGroupInvitationMessage(item.text)) return;
    
    const invitationData = extractGroupInvitationData(item.text);
    if (!invitationData) {
     // showToast('邀请信息无效', 'error');
      return;
    }
    
    // console.log('📥 收到邀请数据:', invitationData);
    
    // 使用群聊密钥加入群聊
    if (invitationData.keyPair) {
      const { joinGroupWithKeyPair, groups, selectGroup } = useGroupChat();
      
      // 🚀 直接使用解析出的密钥对对象
      const keyPair = invitationData.keyPair;
      const groupPub = keyPair.pub;
      
    // console.log('🔐 使用的密钥对:', keyPair);
      // console.log('🎯 群聊Pub:', groupPub);
      
      // 检查是否已经加入该群聊
      const existingGroup = groups.value.find(group => group.pub === groupPub);
      
      if (existingGroup) {
        // 已经加入，直接跳转到群聊页面
        selectGroup(groupPub);
        router.push(`/group/${groupPub}/messages`);
        showToast(`You have joined the group"${existingGroup.name}"`, 'success');
        return;
      }
      
      // 未加入，尝试加入群聊
      // 将密钥对对象转换为JSON字符串给joinGroupWithKeyPair函数
      const keyPairJson = JSON.stringify(keyPair);
      await joinGroupWithKeyPair(keyPairJson);
      
      showToast(`You have joined the group"${invitationData.groupName}"`, 'success');
        
      // 自动跳转到群聊页面
      selectGroup(keyPair.pub);
      router.push(`/group/${keyPair.pub}/messages`);

    } 
    // 兼容旧格式处理
    else if (invitationData.groupKey) {
      const { joinGroupWithKeyPair, groups, selectGroup } = useGroupChat();
      
      // 旧格式的兼容处理（之前的修复逻辑）
      const completeKeyPairJson = `{${invitationData.groupKey}}`;
    // console.log('🔧 兼容模式重建密钥对JSON:', completeKeyPairJson);
      
      try {
        const keyPair = JSON.parse(completeKeyPairJson);
        const groupPub = keyPair.pub;
        
        const existingGroup = groups.value.find(group => group.pub === groupPub);
        if (existingGroup) {
          selectGroup(groupPub);
          router.push(`/group/${groupPub}/messages`);
          showToast(`You have joined the group"${existingGroup.name}"`, 'success');
          return;
        }
        
        await joinGroupWithKeyPair(completeKeyPairJson);
        
        showToast(`You have joined the group"${invitationData.groupName}"`, 'success');
        selectGroup(keyPair.pub);
        router.push(`/group/${keyPair.pub}/messages`);

      } catch (parseError) {
       // console.error('兼容模式解析失败:', parseError);
     //   showToast('Key format error', 'error');
      }
    } 
    else {
    //  showToast('Invitation information is invalid', 'error');
    }
    
  } catch (error) {
    // console.error('处理群聊邀请失败:', error);
   // showToast('Failed to join the group', 'error');
  }
}

async function testFriendBarkNotification() {
  if (!currentChatBarkConfig.value?.enabled || !currentChatPub.value) {
    await showToast(t('friendConfigNotEnabled'), 'warning');
    return;
  }
  
  const title = currentUserAlias.value;
  const content = newMsg.value.trim() ;
  const testUrl = ref('talkflow://');
const testIcon = ref('https://github.com/user-attachments/assets/0027f593-e971-412a-bfbf-18c7f92781ff');

  const success = await barkNotification.sendBarkNotification(
    title,
    content,
    currentChatBarkConfig.value.deviceKey,
    currentChatBarkConfig.value.serverUrl,
    testUrl.value.trim() || undefined,
    testIcon.value.trim() || undefined
  );
  
  if (success) {
   
    await showToast(t('testNotificationSentSuccessfully'), 'success');
  } else {
    await showToast(t('testNotificationSendFailed'), 'danger');
  }
}
</script>



<template>

  <ion-page>
    <ion-header :translucent="true"  collapse="fade"  >
      <ion-toolbar >
        <ion-buttons slot="start">
      
           <ion-back-button :text="$t('back')" ></ion-back-button>
        </ion-buttons>
        <ion-title @click="goToFriendProfile" >
          <div style="height:5px"></div>
          <div class="header-title">
          <div class="avatar-container">

            <img
              v-if="userAvatars[currentChatPub!]"
              :src="userAvatars[currentChatPub!]"
              alt=""
              class="header-avatar"
            />
            <img
              v-else
              :src="getGunAvatar(currentChatPub!)"
              alt=""
              class="header-avatar"
            />
          </div>
          <span class="chat-name">{{ getDisplayName(currentChatPub!) }}</span>
       </div>
        </ion-title>
        <ion-buttons slot="end">
            <ion-button @click="router.push('/CallPage')">
            <ion-icon   :icon="callOutline"></ion-icon>
          </ion-button>
          <ion-button @click="openModal">
            <ion-icon   :icon="notificationsCircleOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>



<transition name="slide-up">
  <div v-if="selectedMessage" >

  </div>
</transition>

<transition name="slide">

  <div v-if="showEmojiPicker" class="emoji-picker-overlay" @click.self="showEmojiPicker = false">
    <div class="emoji-picker-panel" >
      <div class="emoji-list">
        <span v-for="(emoji, idx) in emojiList"
              :key="idx"
              class="emoji-item"
              @click="sendThinkAndEmojiReply(emoji)">
          {{ emoji }}
        </span>
      </div>
    </div>
  </div>
</transition>


    <ion-content :fullscreen="true" :scroll-y="false" :style="{ '--content-bottom': keyboardHeight + 'px' }">

      <div v-if="selectedMessage" class="blur-overlay">
  <div class="center-message-popup">
    <div v-if="selectedMsgObj" class="center-message-bubble" :class="selectedMsgObj.from === currentUserPub ? 'my-message' : 'other-message'">
      <template v-if="selectedMsgObj.type === 'text' && selectedMsgObj.text">
        <!-- 群聊邀请 -->
        <template v-if="selectedMsgObj.text && isGroupInvitationMessage(selectedMsgObj.text)">
          <div class="group-invitation-card">
            <div class="invitation-header">
              <ion-icon :icon="peopleOutline" class="invitation-icon"></ion-icon>
              <span class="invitation-title">{{ $t('GroupChatInvitation') || 'Group Invitation' }}</span>
            </div>
            <div class="invitation-content">
              <p class="invitation-message">{{ parseGroupInvitationMessage(selectedMsgObj.text) }}</p>
            </div>
            <div class="invitation-actions">
              <ion-button 
                size="small" 
                color="primary"
                @click="acceptGroupInvitation(selectedMsgObj)"
              >
                {{ $t('JoinGroup') }}
              </ion-button>
            </div>
          </div>
        </template>
        
        <!-- API URL 消息 -->
        <template v-else-if="selectedMsgObj.text && isApiUrlMessage(selectedMsgObj.text)">
          <div class="api-url-card">
            <div class="api-url-header">
              <ion-icon :icon="notificationsCircleOutline" class="api-url-icon"></ion-icon>
              <span class="api-url-title">{{ getApiUrlDisplayText(selectedMsgObj.text) }}</span>
            </div>
            <div class="api-url-content" v-if="selectedMsgObj.from !== currentUserPub">
              <p class="api-url-message">{{ t('chatPageClickToAcceptRemoteNotification') }}</p>
            </div>
            <div class="api-url-actions" v-if="selectedMsgObj.from !== currentUserPub">
              <ion-button 
                size="small" 
                color="primary"
                @click="handleApiUrlClick(selectedMsgObj.text, selectedMsgObj.from, selectedMsgObj.msgId)"
              >
                {{ t('chatPageAccept') }}
              </ion-button>
            </div>
          </div>
        </template>
        
        <!-- 删除证书请求消息 -->
        <template v-else-if="selectedMsgObj.text && isDeleteCertMessage(selectedMsgObj.text)">
          <div class="delete-cert-request-card">
            <div class="delete-cert-request-content">
              <ion-icon :icon="trashOutline" class="delete-cert-request-icon"></ion-icon>
              <span class="delete-cert-request-title">{{ t('chatPageRevokeRemoteNotificationCertificate') }}</span>
            </div>
          </div>
        </template>
        
        <!-- 删除确认消息 -->
        <template v-else-if="selectedMsgObj.text && isDeleteOkMessage(selectedMsgObj.text)">
          <div class="delete-ok-card">
            <div class="delete-ok-header">
              <ion-icon :icon="checkmarkOutline" class="delete-ok-icon"></ion-icon>
              <span class="delete-ok-title">{{ t('chatPageSecurityCertificateDeleted') }}</span>
            </div>
            <div class="delete-ok-content">
              <p class="delete-ok-message">{{ t('chatPageRemoteNotificationCertificateSuccessfullyRevoked') }}</p>
            </div>
          </div>
        </template>
        
        <!-- 普通文本消息 -->
        <template v-else>
          <div class="meta-text-container" :class="selectedMsgObj.from === currentUserPub ? 'my-message' : 'other-message'">
            <div v-for="(seg, i) in parseMetaSegments(selectedMsgObj.text).filter(s => s.type === 'about')" :key="'about'+i"
                 class="about-block" :class="selectedMsgObj.from === currentUserPub ? 'about-own' : 'about-other'">
              <ion-icon :icon="attachOutline" class="meta-icon" />
              <span v-for="(part, j) in extractUrls(seg.content)" :key="j">
                <a v-if="part.isUrl" @click.stop="openUrl(part.text)" class="url-link">{{ part.text }}</a>
                <span v-else>{{ part.text }}</span>
              </span>
            </div>
            <div v-for="(seg, i) in parseMetaSegments(selectedMsgObj.text).filter(s => s.type === 'think')" :key="'think'+i"
                 class="think-block" :class="selectedMsgObj.from === currentUserPub ? 'think-own' : 'think-other'">
              <span v-if="seg.alias" class="think-reply-user">@{{ seg.alias }}</span>
              <template v-if="isBase64Image(seg.content)">
                <img :src="seg.content" class="media-element" alt="" />
              </template>
              <template v-else-if="isBase64Video(seg.content)">
                <HlsVideoPlayer
                  :msg-id="`${selectedMsgObj.msgId}-seg-${i}`"
                  :base64-video="seg.content"
                  @loaded="onVideoLoaded"
                  @error="onVideoError"
                  @play="onVideoPlay"
                  @pause="onVideoPause"
                />
              </template>
              <template v-else-if="seg.content.startsWith('Number:')">
                <div class="number-message">
                  <span class="number-badge">{{ seg.content.replace('Number:', '') }}</span>
                </div>
              </template>
              <template v-else>
                {{ seg.content }}
              </template>
            </div>
            <div v-for="(seg, k) in parseMetaSegments(selectedMsgObj.text).filter(s => s.type === 'normal')" :key="'normal'+k">
              <template v-if="isBase64Image(seg.content)">
                <img :src="seg.content" class="media-element" alt="" />
              </template>
              <template v-else-if="isBase64Video(seg.content)">
                <HlsVideoPlayer
                  :msg-id="`${selectedMsgObj.msgId}-normal-${k}`"
                  :base64-video="seg.content"
                  @loaded="onVideoLoaded"
                  @error="onVideoError"
                  @play="onVideoPlay"
                  @pause="onVideoPause"
                />
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
                <div :class="['textchat', selectedMsgObj.from === currentUserPub ? 'my-message' : 'other-message']"
                     class="native-selectable markdown-content" v-html="renderMarkdown(seg.content)"></div>
              </template>
            </div>
          </div>
        </template>
      </template>
      <template v-else-if="selectedMsgObj.type === 'voice' && selectedMsgObj.audioUrl">
        <!-- Voice message rendering -->
        <VoiceBar
          :is-playing="voiceBar.playingAudio.value === selectedMsgObj.msgId"
          :is-pending="selectedMsgObj.status === 'pending' && selectedMsgObj.isSending"
          :is-failed="false"
          :is-my-message="selectedMsgObj.from === currentUserPub"
          :duration="selectedMsgObj.duration || 0"
          :remaining-time="remainingMs[selectedMsgObj.msgId]"
          @click="toggleVoicePlayback(selectedMsgObj)"
        />
        <p v-if="voiceBar.transcriptions.value[selectedMsgObj.msgId!]" class="transcription">
          {{ voiceBar.transcriptions.value[selectedMsgObj.msgId!] }}
        </p>
      </template>
    </div>
    <div class="center-timestamp">
      <ion-button fill="clear" @click="deleteMessage(selectedMsgObj)">
        <ion-icon :icon="trashOutline" color="danger"></ion-icon>
      </ion-button>
      <ion-button 
        fill="clear" 
        @click="copyText(selectedMsgObj!.text!)" 
        v-if="selectedMsgObj!.type === 'text' && !isRemoteNotificationMessage(selectedMsgObj.text)"
      >
        <ion-icon :icon="copyOutline"></ion-icon>
      </ion-button>
      <ion-button 
        fill="clear" 
        @click="onSelectThink(selectedMsgObj)" 
        v-if="selectedMsgObj!.type === 'text' && !isRemoteNotificationMessage(selectedMsgObj.text)"
      >
        <ion-icon :icon="chatbubbleEllipsesOutline"></ion-icon>
      </ion-button>
      <ion-button 
        fill="clear" 
        @click="showEmojiPicker = !showEmojiPicker" 
        v-if="selectedMsgObj!.type === 'text' && !isRemoteNotificationMessage(selectedMsgObj.text)"
      >
        <span style="font-size:22px;">😊</span>
      </ion-button>
      <ion-button fill="clear" @click="cancelSelectionMode">
        <ion-icon :icon="closeCircleOutline" color="dark"></ion-icon>
      </ion-button>
    </div>
  </div>
</div>



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
      <!-- <div v-if="isLoadingMessages" class="skeleton-container">
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
      </div> -->

      <div v-if="currentChatPub" class="message-container"
           @touchstart="handleLongPress1($event)"
           @touchend="clearLongPress()"
           @touchmove="clearLongPress()">
        <DynamicScroller
          class="scroller ion-content-scroll-host"
          :items="currentChatMessages"
          :buffer="3000"
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
            <div v-if="isValidMessage(item)" :class="['chat-container', 
            item.from === currentUserPub ? 'my-message' : 'other-message',
            selectedMessage === item.msgId ? 'highlighted-message' : ''
            ]" 
            
            style="padding-bottom: 5px;">
              <div class="message-wrapper">
                <div v-if="isSelectMode" class="message-checkbox">
                  <ion-checkbox
  :checked="selectedMessages.includes(item.msgId!)"
  @ionChange="(e) => onSelectCheckbox(item, e)"
  @click.stop
/>


                </div>
                <template v-if="item.from !== currentUserPub">
                  <img 
                    v-if="userAvatars[item.from] && isLastInSequence(index)" 
                    class="message-avatar" 
                    :src="userAvatars[item.from]" 
                    @click="goToFriendProfile"
                    alt=""
                  />
                  <img 
                    v-else-if="isLastInSequence(index)" 
                    class="message-avatar" 
                    :src="getGunAvatar(item.from)" 
                    alt="" 
                 @click="goToFriendProfile"
                  />
                </template>
                <div :class="['message-bubble', 
                            item.type === 'voice' ? 'voice-bubble' : '',
                            item.status === 'failed' ? 'failed-message' : '',
                            item.status === 'pending' && item.isSending ? 'pending-message' : '',
                            shouldUseFullRadius(index) ? 'full-radius' : '']"
                             @touchstart="onBubbleTouchStart(item, $event)"
  @touchend="onBubbleTouchEnd(item, $event)"
  @mousedown="onBubbleMouseDown(item, $event)"
  @mouseup="onBubbleMouseUp(item, $event)"
                           
                            >
                  <template v-if="item.type === 'text' && item.text">
                    <!-- 图片 -->
                    <template v-if="isBase64Image(item.text)">
                      <ImageMessage 
                        :image-src="item.text" 
                        :alt="''"
                        max-width="280px"
                        max-height="200px"
                      />
                    </template>
                    <!-- 视频 -->
                    <template v-else-if="isBase64Video(item.text)">
                      <HlsVideoPlayer
                        :msg-id="item.msgId!"
                        :base64-video="item.text"
                        @loaded="onVideoLoaded"
                        @error="onVideoError"
                        @play="onVideoPlay"
                        @pause="onVideoPause"
                      />
                    </template>
                    <!-- 群聊邀请 -->
                    <template v-else-if="item.text && isGroupInvitationMessage(item.text)">
                      <div class="group-invitation-card">
                        <div class="invitation-header">
                          <ion-icon :icon="peopleOutline" class="invitation-icon"></ion-icon>
                          <span class="invitation-title">{{ $t('GroupChatInvitation') || 'Group Invitation' }}</span>
                        </div>
                        <div class="invitation-content">
                          <p class="invitation-message">{{ parseGroupInvitationMessage(item.text) }}</p>
                        </div>
                        <div class="invitation-actions">
                      
                          <ion-button 
                            size="small" 
                            color="primary"
                            @click="acceptGroupInvitation(item)"
                          >
                            {{ $t('JoinGroup') }}
                          </ion-button>
                        </div>
                      </div>
                    </template>
                    
                    <!-- API URL 消息 -->
                    <template v-else-if="item.text && isApiUrlMessage(item.text)">
                      <div class="api-url-card">
                        <div class="api-url-header">
                          <ion-icon :icon="notificationsCircleOutline" class="api-url-icon"></ion-icon>
                          <span class="api-url-title">{{ getApiUrlDisplayText(item.text) }}</span>
                        </div>
                        <div class="api-url-content" v-if="item.from !== currentUserPub">
                          <p class="api-url-message">{{ t('chatPageClickToAcceptRemoteNotification') }}</p>
                        </div>
                        <div class="api-url-actions" v-if="item.from !== currentUserPub">
                          <ion-button 
                            size="small" 
                            color="primary"
                            @click="handleApiUrlClick(item.text, item.from, item.msgId)"
                          >
                            {{ t('chatPageAccept') }}
                          </ion-button>
                        </div>
                      </div>
                    </template>
                    
                    <!-- 删除证书请求消息 -->
                    <template v-else-if="item.text && isDeleteCertMessage(item.text)">
                      <div class="delete-cert-request-card">
                        <div class="delete-cert-request-content">
                          <ion-icon :icon="trashOutline" class="delete-cert-request-icon"></ion-icon>
                          <span class="delete-cert-request-title">{{ t('chatPageRevokeRemoteNotificationCertificate') }}</span>
                        </div>
                      </div>
                    </template>
                    
                    <!-- 删除确认消息 -->
                    <template v-else-if="item.text && isDeleteOkMessage(item.text)">
                      <div class="delete-ok-card">
                        <div class="delete-ok-header">
                          <ion-icon :icon="checkmarkOutline" class="delete-ok-icon"></ion-icon>
                          <span class="delete-ok-title">{{ t('chatPageSecurityCertificateDeleted') }}</span>
                        </div>
                        <div class="delete-ok-content">
                          <p class="delete-ok-message">{{ t('chatPageRemoteNotificationCertificateSuccessfullyRevoked') }}</p>
                        </div>
                      </div>
                    </template>
                    
                    <!-- 文本、about、think、Markdown -->
                    <template v-else>
                      <div class="meta-text-container"
                       :class="item.from === currentUserPub ? 'my-message' : 'other-message'"
                      >
                        
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
                    
                     <!-- think部分 -->
<div
  v-for="(seg, i) in parseMetaSegments(item.text).filter(s => s.type === 'think')"
  :key="'think'+i"
  class="think-block native-selectable"
  :class="item.from === currentUserPub ? 'think-own' : 'think-other'"
>
  <span v-if="seg.alias" class="think-reply-user">@{{ seg.alias }}</span>
  
   <!-- 判断是否图片/视频 -->
   <template v-if="isBase64Image(seg.content)">
    <img :src="seg.content" class="media-element" alt="" />
  </template>
  <template v-else-if="item.type === 'voice'">
                    <div v-if="item.audioUrl" class="voice-bar"
                      :class="{ 
                        
                        'pending-voice': item.status === 'pending' && item.isSending,
                        'playing': voiceBar.playingAudio.value === item.msgId,
                        'full-radius': shouldUseFullRadius(index)
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
  <template v-else-if="isBase64Video(seg.content)">
    <HlsVideoPlayer
      :msg-id="`${item.msgId}-content-${i}`"
      :base64-video="seg.content"
      @loaded="onVideoLoaded"
      @error="onVideoError"
      @play="onVideoPlay"
      @pause="onVideoPause"
    />
  </template>
  <template v-else-if="seg.content.startsWith('Number:')" >
    <div class="number-message">
    <span class="number-badge">{{ seg.content.replace('Number:', '') }}</span>
  </div>
  </template>

  <template v-else>

    <!-- {{ seg.content }} -->
    {{ truncateContent(seg.content, 200) }}

  </template>
</div>

<!-- 普通文本部分（只把普通消息的背景变透明并放大emoji） -->
<div v-for="(seg, k) in parseMetaSegments(item.text).filter(s => s.type === 'normal')" :key="'normal'+k">
  
  <div
    v-if="isSingleEmoji(seg.content)"
    class="emoji-message-big"
  >{{ seg.content }}</div>

  <div v-else-if="item.text.startsWith('Number:')" class="number-message">
    <span class="number-badge">{{ item.text.replace('Number:', '') }}</span>
  </div>
  <div
    v-else
    :class="['textchat ', item.from === currentUserPub ? 'my-message' : 'other-message',
      selectedMessage === item.msgId ? 'selected-message' : '',
      shouldUseFullRadius(index) ? 'full-radius' : ''
    ]"
    class="native-selectable markdown-content "
    v-html="renderMarkdown(seg.content.replace('Number:', ''))"
    @contextmenu.prevent="showDeleteOption(item, $event)"
  ></div>
</div>

                      </div>
                    </template>
                
                  </template>
                  <template v-else-if="item.type === 'voice'">
                    <VoiceBar
                      v-if="item.audioUrl"
                      :is-playing="voiceBar.playingAudio.value === item.msgId"
                      :is-pending="item.status === 'pending' && item.isSending"
                      :is-failed="false"
                      :is-my-message="item.from === currentUserPub"
                      :duration="item.duration || 0"
                      :remaining-time="remainingMs[item.msgId]"
                      @click="isSelectMode ? toggleMessageSelection(item) : toggleVoicePlayback(item)"
                    />
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
                <SpinningLoader 
                  v-if="item.status === 'pending' && item.isSending && item.from === currentUserPub" 
                  size="small" 
                  theme="primary"
                  class="pending-status"
                />
                <div 
                  v-else-if="item.status === 'sent' && item.justSent && item.from === currentUserPub"
                  class="sent-confirmation"
                >
                  <ion-icon :icon="checkmarkOutline" class="checkmark-icon"></ion-icon>
                </div>
              </div>
            </div>
          </DynamicScrollerItem>
        </DynamicScroller>
      </div>



      <transition name="slide-up">
        <div v-if="isSelectMode" class="selection-action-bar">
          <div class="selection-actions">
            <ion-button fill="clear" @click="copySelectedMessages1" :disabled="!canCopySelected" class="action-button">
              <ion-icon :icon="copyOutline" :color="canCopySelected ? 'primary' : 'medium'"></ion-icon>
            </ion-button>
            <ion-button fill="clear" @click="deleteSelectedMessages1" :disabled="selectedMessages.length === 0" class="action-button">
              <ion-icon :icon="trashOutline" :color="selectedMessages.length > 0 ? 'danger' : 'medium'"></ion-icon>
            </ion-button>
            <ion-button fill="clear" @click="hideContextMenu();" class="action-button">
              <ion-icon :icon="closeCircleOutline" color="medium"></ion-icon>
            </ion-button>
          </div>
        </div>
      </transition>

      
    </ion-content>

    <ion-footer   :translucent="true"  collapse="fade">
            

      <ion-toolbar class="input-toolbar" :style="{ transform: `translateY(-${keyboardHeight}px)` }">
        <!-- <div style="height: 30px;"></div> -->
        <!-- Mode selection buttons -->
        <div class="mode-selection1">
          <div class="meta-cards " v-if="typedMeta.length" >
        <div v-for="(meta, index) in typedMeta" :key="index" 
             class="meta-card" 
             :class="meta.type === 'about' ? 'about-card' : 'think-card'">
          <!-- <ion-icon :icon="meta.type === 'about' ? attachOutline : chatbubbleEllipsesOutline" class="meta-icon" /> -->
          <span v-if="meta.type === 'think' && meta.alias" class="think-reply-user1">@{{ meta.alias }}: </span>
          <!-- <span class="meta-content">{{ meta.content }}</span> -->
          <span class="meta-content">
  {{ meta.content.length > 30 ? meta.content.slice(0, 30) + '…' : meta.content }}
</span>

          <div style="display: flex;justify-content: center;align-items: center;" fill="clear" size="small" @click="removeMeta(index)">
            <ion-icon :icon="closeOutline" color="medium"></ion-icon>
          </div>
        </div>
      </div> 
        </div>

   

        <div class="input-capsule" ref="capsuleRef" :class="{ 'shift-up': isDrawerOpen }">
          <ion-button class="drawer-toggle" fill="clear" @click="triggerFileUpload">
            <ion-icon :icon="addOutline"></ion-icon>
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

            
            <transition name="button-fade" mode="out-in">
              <div v-if="!isVoiceMode" class="text-input" :class="inputMode" key="text-input">


                <!--   @keydown.enter.prevent="handleEnterKey"  enterkeyhint="send"-->
                <textarea
                  v-model="newMsg"
                  @input="adjustHeight"
                  @focus="onFocus"
                  @blur="onBlur"
                  
                  @submit.prevent
                  placeholder="Message"
                 
                  rows="1"
                  ref="textInputRef"
                  
                ></textarea>
                <!-- <ion-button 
                  v-if="inputMode !== 'default'" 
                  class="confirm-button" 
                  fill="clear" 
                  @click="confirmInput"
                >
                  <ion-icon slot="icon-only" :icon="checkmarkOutline" color="primary"></ion-icon>
                </ion-button> -->
              </div>
              <div v-else class="voice-input" :class="{ recording: voiceBar.isRecording.value, 'cancel-recording': cancelRecording }" 
                @touchstart="startVoiceRecording" @touchmove="handleVoiceMove" @touchend="stopVoiceRecording" @touchcancel="cancelVoiceRecording" key="voice-input">
                <span v-if="voiceBar.isRecording.value">{{ cancelRecording ? 'Cancel the sliding' : 'Recording' }}</span>
                  <span v-else>Hold to record</span>
              </div>
            </transition>
          </div>

          <ion-button class="action-button" fill="clear" @click="handleActionButtonClick">
            <transition name="button-fade" mode="out-in">
              <ion-icon slot="icon-only" v-if="!newMsg && !isVoiceMode" :icon="micOutline" key="voice" ></ion-icon>
              <ion-icon slot="icon-only" v-else-if="newMsg && !isVoiceMode" :icon="notificationsCircleOutline" key="send"></ion-icon>
              <ion-icon slot="icon-only" v-else-if="isVoiceMode" :icon="chatbubbleEllipsesOutline" key="keyboard"></ion-icon>
            </transition>
          </ion-button>
          <transition name="button-fade" mode="out-in">
              <ion-button
                v-if="newMsg.length > 0"
                key="send-button"
                fill="clear"
                class="send-button"
                @click="handleEnterKey"
              >
                <ion-icon slot="icon-only" :icon="sendOutline"></ion-icon>
              </ion-button>
            </transition>
        </div>
      </ion-toolbar>
    </ion-footer>

  
    <!-- 模态窗口 -->
    <ion-modal :is-open="isModalOpen" @did-dismiss="closeModal">
      <ion-header>
        <ion-toolbar>
          <ion-title>Remote notification</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="closeModal">
              <ion-icon color="dark" :icon="closeOutline"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <div class="modal-content">
         <RemoteMD />
        </div>
      </ion-content>
    </ion-modal>
  
  </ion-page>
</template>



<style scoped>
.center-message-bubble .voice-bar {
  margin: 10px auto;
  transform: scale(1.2); /* Slightly larger for emphasis in full-screen */
  min-width: 120px;
  max-width: 240px;
  height: 39px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 30px 30px 30px 5px !important;
}

.center-message-bubble.my-message .voice-bar {
  border-radius: 30px 30px 5px 30px !important;
}

.center-message-bubble .transcription {
  margin-top: 10px;
  font-size: 14px;
  padding: 8px 12px;
  border-radius: 8px;
  background: #f5f5f5;
  color: #333;
  text-align: center;
  max-width: 80%;
}

.center-message-bubble.my-message .transcription {
  background: #e0fff0;
}

.number-message {
  display: inline-block;
  /* padding: 5px 12px; */
  /* border-radius: 20px; */
  /* background: linear-gradient(45deg, #4facfe, #00f2fe); */
  color: rgb(143, 143, 143);
  font-weight: bold;
  font-size: 30px;
  /* box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); */
  animation: numberPop 0.3s ease-in-out;
}

.number-badge {
  display: inline-block;
  transform: scale(1);
  transition: transform 0.2s ease;
}

/* .number-message:hover .number-badge {
  transform: scale(1.2);
} */

@keyframes numberPop {
  0% { transform: scale(0.8); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.textchat p {
  margin: 0;
  padding: 0;
  font-size: 13px;
  line-height: 1.5;
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
.emoji-message-normal {
  font-size: 2.2rem;
  background: transparent !important;
  box-shadow: none;
  border-radius: 0;
  padding: 0 6px;
  line-height: 1.1;
  display: inline-block;
}


.emoji-picker-overlay {
  position: fixed; left: 0; right: 0; bottom: 0; top: 0;
  z-index: 2200;
  /* background: rgba(0,0,0,0.13); */
  display: flex; align-items: flex-end; justify-content: center;
  transition: all 0.3 ease-in-out;
}


.slide-enter-active, .slide-leave-active {
  transition: transform 0.3s ease;
}
.slide-enter-from, .slide-leave-to {
  transform: translateX(100%); /* 从右侧滑入/滑出 */
}
.slide-enter-to, .slide-leave-from {
  transform: translateX(0);
}

.emoji-picker-panel {
  background: var(--background-color-no);
  border-radius: 20px 20px 0 0;
  width: 100%;
  padding: 24px 16px 40px 16px;
  box-shadow: 0 -3px 30px rgba(0,0,0,0.18);
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
/* .emoji-item:hover { background: #e0e0e0; transform: scale(1.2);} */

.blur-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  z-index: 1998;
  backdrop-filter: blur(12px);
  background: rgba(0,0,0,0.25);
  display: flex; align-items: center; justify-content: center;
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
  /* background: var(--ion-background-color, #fff); */
  box-shadow: 0 4px 40px rgba(0,0,0,0.18);
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

  color: #bbb; font-size: 11px; margin-top: 0px; text-align: center;
  background: var(--background-color-no);
  border-radius: 20px;
  position: fixed;
  bottom: 5%;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 固定底部操作栏 */
.center-action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 2100;
  background: rgba(0, 0, 0, 0.153);
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 28px;
  padding: 16px 0 28px 0;
  box-shadow: 0 -6px 24px 0 rgba(0,0,0,0.07);
  border-top: 1px solid rgba(0,0,0,0.08);
}
.center-action-bar ion-button { --padding-start:12px; --padding-end:12px; }

.meta-text-container{
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  
}
.meta-text-container.my-message{

  align-items: flex-end;
}

/* Markdown内容支持 */
.markdown-content {
  word-break: break-word;
  overflow-wrap: break-word;
  line-height: 1.3;
  font-size: 13px;
  max-width: 100%;
  overflow-x: auto;
  white-space: pre-wrap;
}

/* 标题 */
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
  /* 让英文单词也能断 */
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
.markdown-content :deep(li) { margin: 4px 0; }

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


.code-block-wrapper { position: relative; margin: 8px 0; }
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
.copy-code-button ion-icon { font-size: 16px; color: #333; }
.copy-code-button:hover { transform: scale(1.1); background: rgba(255, 255, 255, 1); }
.copy-code-button:active { transform: scale(0.95); }

.markdown-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  max-width: 100%;
  overflow-x: auto;
  /* 让英文单词也能断 */
  word-break: break-all;
  white-space: pre-wrap;
  box-sizing: border-box;
}

/* 表格 */
.markdown-content :deep(table) {
  width: 100%;
  
  border-collapse: collapse;
  margin: 8px 0;
  max-width: 100%;
  overflow-x: auto;
  /* 让英文单词也能断 */
  word-break: break-all;
  white-space: pre-wrap;
  box-sizing: border-box;
}
.markdown-content :deep(th), .markdown-content :deep(td) {
  border: 1px solid #ccc;
  padding: 6px;
  text-align: left;
}
.markdown-content :deep(th) {
  background: rgba(0, 0, 0, 0.05);
}

.my-message .markdown-content :deep(a) { color: #5900cd; text-decoration: underline; }
.my-message .markdown-content :deep(blockquote) { border-left-color: #fff; color: #ddd; }
.my-message .copy-code-button { background: rgba(0, 184, 114, 0.8); }
.my-message .copy-code-button:hover { background: rgba(0, 184, 114, 1); }
.my-message .copy-code-button ion-icon { color: #fff; }

/* highlight.js代码主题局部适配 */
.markdown-content :deep(.hljs) { background: transparent; padding: 0; }
.markdown-content :deep(.hljs-keyword), .markdown-content :deep(.hljs-selector-tag), .markdown-content :deep(.hljs-subst) { color: #2f6f9f; }
.markdown-content :deep(.hljs-string), .markdown-content :deep(.hljs-attr), .markdown-content :deep(.hljs-symbol), .markdown-content :deep(.hljs-bullet) { color: #d14; }
.markdown-content :deep(.hljs-comment), .markdown-content :deep(.hljs-quote) { color: #998; font-style: italic; }
.markdown-content :deep(.hljs-number), .markdown-content :deep(.hljs-regexp), .markdown-content :deep(.hljs-literal) { color: #099; }
.markdown-content :deep(.hljs-title), .markdown-content :deep(.hljs-section), .markdown-content :deep(.hljs-function) { color: #900; font-weight: bold; }
.my-message .markdown-content :deep(.hljs) { color: #ddd; }
.my-message .markdown-content :deep(.hljs-keyword), .my-message .markdown-content :deep(.hljs-selector-tag), .my-message .markdown-content :deep(.hljs-subst) { color: #a1c0e4; }
.my-message .markdown-content :deep(.hljs-string), .my-message .markdown-content :deep(.hljs-attr), .my-message .markdown-content :deep(.hljs-symbol), .my-message .markdown-content :deep(.hljs-bullet) { color: #ff8787; }
.my-message .markdown-content :deep(.hljs-comment), .my-message .markdown-content :deep(.hljs-quote) { color: #bbb; }
.my-message .markdown-content :deep(.hljs-number), .my-message .markdown-content :deep(.hljs-regexp), .my-message .markdown-content :deep(.hljs-literal) { color: #0cc; }
.my-message .markdown-content :deep(.hljs-title), .my-message .markdown-content :deep(.hljs-section), .my-message .markdown-content :deep(.hljs-function) { color: #f66; }

.chat-name { font-size: 15px;font-family:Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif; }
.avatar-container { display: flex; justify-content: center; align-items: start; }
.header-title {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0px;
 
}
.header-avatar {
  width: 33px; height: 33px; border-radius: 50%; object-fit: cover;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.843); border: 2px solid var(--ion-background-color);
}

.gradient-mask {
  position: fixed; top: 0; left: 0; width: 100vw; height: 20vh;
  background: linear-gradient(to bottom, var(--ion-background-color) 60%, rgba(0, 0, 0, 0) 100%);
  pointer-events: none; overflow:visible; z-index: 1;
}

/* about/think 块 */
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
}
.about-own { right:0px; top: 0px; left: auto; transform: none; }
.about-other { left: 0px; top: 0px; right: auto; transform: none; }

.think-block {
  position: relative;
  align-self: start;
  padding:7px 9px;
  padding-bottom: 15px;
  border-radius: 23px;
  font-style: italic;
  font-size: 9px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
  background: rgba(255, 255, 255, 0.165);
  color: #acacac;
  box-shadow: 0px 2px 3px rgba(0, 0, 0, 0.171);
  z-index: -1;
  pointer-events: none;
  max-width: 90%;
  min-width: 39px;
  overflow: visible;
}
.think-own { right:-10px; top: 13px; left: auto; transform: none; }
.think-other { left: -10px; top: 13px; right: auto; transform: none; }

.think-reply-user {
  /* color: #ffffff; */
  font-weight: bold;
  font-size: 7px;
  /* margin-right: 3px; */
  position: absolute;
  top: -10px;
}
.think-reply-user1 {
  /* color: #ffffff; */
  font-weight: bold;
  font-size: 13px;
  /* margin-right: 3px; */
  /* position: absolute; */
  /* top: -10px; */
}

.pending-meta { display: flex; align-items: center; gap: 8px; padding: 6px 12px; background: rgba(0,0,0,0.05); font-size: 14px; }
.avatar-placeholder { width: 39px; height: 39px; flex-shrink: 0; }
.video-placeholder-text { position: absolute; left: 0; bottom: 0; font-size: 12px; color: #666; padding-left: 20px; }
ion-content { --content-bottom: 0px; transition: all 0.2s ease; }
.toolbar1 { overflow:visible;--background: var(--background-color-no); }

.input-toolbar {
  transition: all 0.2s ease;
  position: relative; bottom: 0; width: 100vw; overflow:visible;
  /* --background: linear-gradient(to top, var(--ion-background-color) 70%, rgba(0, 0, 0, 0) 100%);
  */
  /* --background: var(--background-color-no);
    background: var(--background-color-no);
    */
    backdrop-filter: blur(10px);
}

.message-container { height: 100vh;}


.scroller {
  height: calc(100% - var(--content-bottom));
  overflow-y: auto;
  margin-top: -100px;
  padding-top:120px;
  padding-bottom: 120px;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
 
}

.message-bubble {
  padding: 0px;
  border-radius: 30px 30px 30px 5px !important;
  color: var(--ion-color-dark-tint);
  cursor: pointer;
  transform-origin: center;
  margin-left: 10px;
  max-width: 80%;

}
.message-bubble:has(.image-container), .message-bubble:has(.video-container) { padding: 0; }
.my-message .message-bubble {
  color: #fff;
  border-radius: 30px 30px 5px 30px !important;
  margin-right: 10px;
}
.textchat{

  font-size: 15px;
  display: inline-block;
  text-align: left;
  max-width: 100%;
  transform-origin: center;
  border-radius: 30px 30px 30px 5px !important;
  background: #898a8a26;
  z-index: 9999;
backdrop-filter: blur(10px);
  padding: 16px;
  padding-bottom: 0px;
}
.textchat.my-message{

  font-size: 13px;
  display: inline-block;
  text-align: left;
  max-width: 100%;
  transform-origin: center;
  border-radius: 30px 30px 5px 30px !important;
  background: #0165d7;
  z-index: 9999;
  
}
.failed-message { background: #ff4d4d !important; opacity: 0.8; }
.pending-message {
  background-size: 200% 200%;
  animation: gradientBreath 6s ease infinite;
  /* box-shadow: 0 0 10px rgba(82, 238, 209, 0.7), 0 0 20px rgba(35, 213, 171, 0.5); */
}



.voice-bubble { background: transparent !important; padding: 0 !important; }
.voice-bar {
  display: flex; align-items: center; border-radius: 30px 30px 30px 5px !important; gap: 8px;
  height: 39px; background: var(--ion-color-dark-contrast);
  cursor: pointer; transition: background 0.5s ease, box-shadow 0.5s ease, width 0.3s ease, transform 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); touch-action: manipulation; min-width: 100px; max-width: 200px;
  transform-origin: center;
}
.my-message .voice-bar { color: #fff; background: #0165d7; border-radius: 30px 30px 5px 30px !important; }
.failed-voice { background: #ff9999 !important; opacity: 0.8; }
.pending-voice {
  animation: gradientBreath 6s ease infinite;
  box-shadow: 0 0 10px rgba(82, 238, 209, 0.7), 0 0 20px rgba(35, 213, 171, 0.5);
  opacity: 0.7;
}
.voice-bar.playing, .my-message .voice-bar.playing {
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

.play-icon { font-size: 16px; touch-action: manipulation; }
.duration { font-size: 12px; color: #666; padding-left: 13px; }
.my-message .duration { color: #fff; }
.my-message .play-icon { color: #fff; }
.transcription { margin-top: 4px; font-size: 14px; color: #555; background: #f5f5f5; padding: 4px 8px; border-radius: 8px; }
.my-message .transcription { background: #e0fff0; color: #333; }
.error-text { font-size: 12px; color: #ff4d4d; font-style: italic; }

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
.context-button:hover { transform: scale(1.1); background: rgba(0, 205, 137, 0.2); }
.context-button ion-icon { font-size: 20px; color: #333; }

.message-wrapper { display: flex; align-items: flex-end; margin: 5px 0; position: relative; }
.chat-container.my-message .message-wrapper { justify-content: flex-end; }
.gun-avatar { width: 30px; height: 30px; border-radius:50%; margin-right:10px; object-fit: cover; box-shadow: 0 2px 4px rgba(0, 0, 0, 0); }
.message-avatar {
  width: 35px; height: 35px; border-radius:50%; object-fit: cover;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.649); margin-left:10px; border: 2px solid var(--ion-background-color);
}
.my-message .message-avatar{ border-radius:50%; margin-left:0px; margin-right:10px; }

.image-container { width: 180px; height: 180px; overflow: hidden; position: relative; object-fit: cover; object-position: center; }
.video-container { width: 230px; height: 180px; overflow: hidden; position: relative; object-fit: cover; padding: 0; margin: 0; object-position: center; }
.video-placeholder {
  width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
  background: #171717; cursor: pointer; position: relative;
}
.thumbnail { width: 100%; height: 100%; object-fit: cover; }
.play-icon { font-size: 48px; color: #666; position: absolute; z-index: 1; }
.media-element { width: 100%; height: 180px; padding: 0; margin: 0; border-radius: 13px 13px 13px 5px !important; object-fit: cover; object-position: center; }
.my-message .media-element { border-radius: 13px 13px 5px 13px !important; }
.media-element[lazy="loading"] { opacity: 0.5; background: #f0f0f0 url('@/assets/loading.gif') no-repeat center; }
.media-element[lazy="loaded"] { opacity: 1; }

.timestamp-container { font-size: 8px; color: #bbb; display: flex; align-items: center; }
.my-timestamp { justify-content: flex-end; margin-right:50px; }
.other-timestamp { justify-content: flex-start; margin-left:50px; }
.pending-status { color: #00ffbb; font-style: italic;margin: 0 2px; }

.sent-confirmation {
  display: inline-flex;
  align-items: center;
  margin: 0 2px;
  animation: sentSuccess 1.5s ease-in-out;
}

.checkmark-icon {
  font-size: 16px;
  color: #00d4aa;
  animation: checkmarkPop 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

@keyframes sentSuccess {
  0% { opacity: 0; transform: scale(0.5); }
  20% { opacity: 1; transform: scale(1.2); }
  40% { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(0.8); }
}

@keyframes checkmarkPop {
  0% { transform: scale(0) rotate(-45deg); opacity: 0; }
  50% { transform: scale(1.3) rotate(0deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}

.input-capsule {
  display: flex; align-items: end;
   background: rgba(133, 133, 133, 0.123); 
   border-radius: 30px;
  width: 96%; margin: 3px auto; height: 46px; transition: all 0.2s ease;

  padding: 3px;
}
.input-container { 
  flex: 1; display: flex; 
  align-items:center;
  justify-content: center;
  width: 100%;
}
.text-input {  flex: 1;  width: 100%; display: flex; align-items: flex-end; justify-content: space-between; }


textarea {
  flex-grow: 1; 
  color: var(--ion-text-color);
  /* font-size: 16px; */
  /* line-height: 1; */
  outline: none;
  height: auto;
  max-height: 120px;
  overflow-y: auto;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px ;
 min-height: 40px;
 
  border-radius: 24px;

 
}

.text-input.about textarea {
  background: rgb(1, 255, 238); box-shadow: 0 2px 8px rgb(1, 255, 238); color: black;
}
.text-input.think textarea {
  background: rgb(0, 0, 0); box-shadow: 0 2px 8px rgb(0, 0, 0); color: #fff;
}
.confirm-button { position: absolute; right: 0; }

.voice-input {
  width: 100%; height: 39px; display: flex; align-items: center; justify-content: center; gap: 8px;
  border-radius: 20px; background: #0165d7; font-size: 16px; font-weight: 500;
  cursor: pointer; user-select: none; touch-action: manipulation; transition: all 0.3s ease-in-out; overflow: visible; left: 0px;
 
}
.voice-input.recording {
  border-radius: 30px; width: 100%; height: 39px;
  background: linear-gradient(-45deg, #00ffaa, #ff9999, #fff, #00cd89);
  background-size: 200% 200%;
  animation: gradientBreath 6s ease infinite;
  z-index: 9999; transition: all 0.3s ease-in-out; overflow: visible;
  /* transform: translateY(-20px); */
}
.voice-input.cancel-recording {
  border-radius: 30px; background: #ff4d4d; transform: translateY(-20px);
  transition: all 0.3s ease-in-out; overflow: visible;
}
.voice-input span { font-size: 14px; }

.drawer-toggle{
  
  --padding-start: 5px;
  --padding-end: 5px;
  --background: rgb(38, 38, 38);
  --color: #6e6e6e;
--border-radius: 50%;
width: 35px; /* Make it a circle */
height: 35px;
min-width: 35px;
min-height: 35px;
/* margin-right: -5px; */

margin:2px;

}
.action-button{
  
  --padding-start: 5px;
  --padding-end: 5px;
--background: rgb(38, 38, 38);
--color: #6e6e6e;
--border-radius: 50%;
width: 35px; /* Make it a circle */
height: 35px;
min-width: 35px;
min-height: 35px;
/* margin-right: -5px; */

margin:2px;

}
.send-button{
  
  --padding-start: 9px;
  --padding-end: 9px;
  --background: rgb(38, 38, 38);
  --color: #6e6e6e;
--border-radius: 50%;
width: 35px; /* Make it a circle */
height: 35px;
min-width: 35px;
min-height: 35px;
/* margin-right: -5px; */

margin:2px;

}


.image-preview-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.9); z-index: 2000;
  display: flex; flex-direction: column; justify-content: center; align-items: center;
}
.image-preview-container {
  width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; overflow: hidden; touch-action: none;
}
.preview-image {
  max-width: 100%; max-height: 100%; object-fit: contain; user-select: none; -webkit-user-select: none; touch-action: none;
}
.close-button { position: absolute; bottom: 5%; right: 20px; padding: 0; z-index: 2100; }
.close-button ion-icon { font-size: 39px; }
.liquid-fade-enter-active, .liquid-fade-leave-active { transition: opacity 0.3s ease; }
.liquid-fade-enter-from, .liquid-fade-leave-to { opacity: 0; }
.native-selectable { user-select: text; -webkit-user-select: text; cursor: text; }
.delete-button {
  position: fixed; min-width: 70px; height: 44px; border-radius: 8px;
  background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px);
  display: flex; align-items: center; justify-content: center; gap: 6px; padding: 0 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15); z-index: 1100; cursor: pointer;
  animation: fade-in 0.3s ease; transform-origin: center; transition: transform 0.2s ease, background 0.2s ease;
  border: 0.5px solid rgba(0, 0, 0, 0.1);
}
.delete-button:hover { transform: scale(1.05); background: rgba(248, 248, 248, 1); }
.delete-button:active { transform: scale(0.95); background: rgba(240, 240, 240, 1); }
.delete-button ion-icon { font-size: 18px; color: #ff3b30; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.message-checkbox { display: flex; align-items: center; justify-content: center; margin-right: 5px; opacity: 0.9; }
.selection-action-bar {
  position: fixed; bottom: 0; left: 0; right: 0; background: var(--ion-background-color, #ffffff);
  backdrop-filter: blur(10px); box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.08);
  padding: 15px; z-index: 1000; display: flex; align-items: center; justify-content: center;
  border-top: 1px solid var(--ion-border-color, rgba(0, 0, 0, 0.1));
}
.selection-actions { display: flex; justify-content: space-around; align-items: center; width: 100%; max-width: 300px; }
.selection-actions ion-button {
  height: 60px; width: 60px; --border-radius: 50%; --background: var(--ion-item-background, transparent);
  --color: var(--ion-text-color, #000000); --box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}
.selection-actions ion-button:hover { --background: var(--ion-color-step-50, rgba(0, 0, 0, 0.05)); }
.selection-actions ion-button:active { --background: var(--ion-color-step-150, rgba(0, 0, 0, 0.1)); }
.selection-actions ion-button ion-icon { font-size: 26px; color: var(--ion-text-color, #000000); }
ion-button[disabled] ion-icon { opacity: 0.4; }
.slide-up-enter-active, .slide-up-leave-active { transition: transform 0.3s ease; }
.slide-up-enter-from, .slide-up-leave-to { transform: translateY(100%); }

.url-link { color: #5900cd; background-color: rgb(0, 247, 255); border-radius: 5px; padding: 0 2px; text-decoration: underline; cursor: pointer; word-break: break-all; }
.url-link:hover { color: #5900cd; text-decoration: underline; }
.my-message .url-link { color: #5900cd; text-decoration: underline; }
.my-message .url-link:hover { color: #5900cd; }

.skeleton-container { height: 100vh; z-index:9999; }
.skeleton-message { display: flex; align-items: flex-end; gap: 9px; margin: 15px 0; animation: fade 1.5s infinite ease-in-out; }
.skeleton-message.my-message { justify-content: flex-end; }
.skeleton-avatar { width: 39px; height: 39px; border-radius: 50%; background: #e0e0e0; animation: pulse 1.5s infinite ease-in-out; }
.skeleton-bubble { height: 39px; border-radius: 13px 13px 13px 0px; background: #fbfbfb; animation: pulse 1.5s infinite ease-in-out; }
.skeleton-message.my-message .skeleton-bubble { background: #01b872; border-radius: 13px 13px 0px 13px; }
@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }
@keyframes fade { 0% { opacity: 0.8; } 50% { opacity: 1; } 100% { opacity: 0.8; } }
.glass-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: var(--ion-background-color); z-index: 3; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.5s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* 群聊邀请卡片样式 - 符合消息模版主题 */
.group-invitation-card {
  background: var(--ion-background-color);
  border: none;
  border-radius: 30px 30px 30px 5px;
  padding: 18px;
  margin: 8px 0;
  box-shadow: 0 2px 4px rgba(126, 126, 126, 0.146);
  max-width: 280px;
  color: var(--ion-text-color);
  transition: all 0.3s ease;
  transform-origin: center;
  /* backdrop-filter: blur(10px); */
}

/* API URL 卡片样式 - 基于群聊邀请卡片 */
.api-url-card {
  background: var(--ion-color-dark-contrast);
  border: none;
  border-radius: 30px 30px 30px 5px;
  padding: 18px;
  margin: 8px 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  max-width: 280px;
  color: var(--ion-text-color);
  transition: all 0.3s ease;
  transform-origin: center;
}

.my-message .group-invitation-card {
  background: #0165d7;
  border-radius: 30px 30px 5px 30px;
  color: #fff;
}

.my-message .api-url-card {
  background: #0165d7;
  border-radius: 30px 30px 5px 30px;
  color: #fff;
}

.invitation-header, .api-url-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.invitation-icon, .api-url-icon {
  font-size: 20px;
  color: #8a8a8a;
  /* background: rgba(82, 238, 209, 0.1);
  border-radius: 50%; */
  
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.api-url-icon {
  color: #ff9500;
  background: rgba(255, 149, 0, 0.1);
}

.my-message .invitation-icon, .my-message .api-url-icon {
  color: #fff;
 
}

.invitation-title, .api-url-title {
  font-weight: 600;
  font-size: 15px;
  color: var(--ion-text-color);
  flex: 1;
}

.my-message .invitation-title, .my-message .api-url-title {
  color: #fff;
}

.invitation-content, .api-url-content {
  margin-bottom: 16px;
}

.invitation-message, .api-url-message {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--ion-color-medium-shade);
  background: rgba(0, 0, 0, 0.03);
  padding: 12px;
  border-radius: 16px;
  /* border-left: 3px solid #0165d7; */
}

.api-url-message {
  border-left-color: #ff9500;
}

.my-message .invitation-message, .my-message .api-url-message {
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.1);
  border-left-color: #fff;
}

.invitation-actions, .api-url-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.invitation-actions ion-button, .api-url-actions ion-button {
  --border-radius: 20px;
  --padding-start: 16px;
  --padding-end: 16px;
  font-size: 13px;
  font-weight: 500;
  height: 36px;
  transition: all 0.2s ease;
}

.invitation-actions ion-button[fill="outline"], .api-url-actions ion-button[fill="outline"] {
  --border-color: var(--ion-color-medium);
  --color: var(--ion-color-medium);
  --background: transparent;
}

.invitation-actions ion-button[fill="outline"]:hover, .api-url-actions ion-button[fill="outline"]:hover {
  --background: rgba(0, 0, 0, 0.05);
  transform: scale(1.05);
}

.invitation-actions ion-button[color="primary"], .api-url-actions ion-button[color="primary"] {
  --background: linear-gradient(135deg, #52eed1, #23d5ab);
  --color: #000;
  font-weight: 600;
}

.invitation-actions ion-button[color="primary"]:hover, .api-url-actions ion-button[color="primary"]:hover {
  transform: scale(1.05);
  /* box-shadow: 0 4px 12px rgba(82, 238, 209, 0.3); */
}

.my-message .invitation-actions ion-button[color="primary"], .my-message .api-url-actions ion-button[color="primary"] {
  --background: #fff;
  --color: #01b872;
}

.my-message .invitation-actions ion-button[fill="outline"], .my-message .api-url-actions ion-button[fill="outline"] {
  --border-color: rgba(255, 255, 255, 0.6);
  --color: rgba(255, 255, 255, 0.9);
}

.my-message .invitation-actions ion-button[fill="outline"]:hover, .my-message .api-url-actions ion-button[fill="outline"]:hover {
  --background: rgba(255, 255, 255, 0.1);
}

/* 删除证书请求消息样式 */
.delete-cert-request-card {
  background: #f44336;
  border-radius: 16px;
  padding: 16px;
  margin: 8px auto;
  max-width: 280px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(244, 67, 54, 0.3);
  transition: all 0.2s ease;
}

.delete-cert-request-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.delete-cert-request-icon {
  font-size: 20px;
  color: #fff;
}

.delete-cert-request-title {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

/* 删除确认消息样式 */
.delete-ok-card {
  background: linear-gradient(135deg, #e8f5e8, #f0f8f0);
  border: 1px solid #4caf50;
  border-radius: 16px;
  padding: 16px;
  margin: 8px 0;
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.15);
  transition: all 0.2s ease;
}

.delete-ok-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.delete-ok-icon {
  font-size: 20px;
  color: #4caf50;
  background: rgba(76, 175, 80, 0.1);
  border-radius: 50%;
  padding: 6px;
  width: 32px;
  height: 32px;
}

.delete-ok-title {
  font-size: 16px;
  font-weight: 600;
  color: #2e7d32;
  flex: 1;
}

.delete-ok-content {
  margin-bottom: 0;
}

.delete-ok-message {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: #388e3c;
  background: rgba(76, 175, 80, 0.05);
  padding: 12px;
  border-radius: 12px;
  border-left: 3px solid #4caf50;
}

.my-message .delete-ok-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.1));
  border-color: rgba(138, 136, 136, 0.3);
}

.my-message .delete-ok-title {
  color: var(--ion-text-color);
}

.my-message .delete-ok-icon {
  color: var(--ion-text-color);
  background: rgba(143, 142, 142, 0.2);
}

.my-message .delete-ok-message {
  color: var(--ion-text-color);
  background: rgba(255, 255, 255, 0.1);
  border-left-color: var(--ion-text-color);
}


.mode-selection1 {  border-radius: 30px; display: flex; justify-content: start; transform: translateX(0); transition: transform 0.3s ease-in-out; z-index: 9999; }


.meta-cards {

  padding: 10px;
  display: flex;
  flex-direction: column;

  background: var(--ion-background-color);
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

.meta-content { flex: 1; word-break: break-word; font-size: 13px; }
.meta-icon { font-size: 20px; }

/* 全圆角样式和动画 */
.message-bubble.full-radius {
  border-radius: 30px !important;
  transition: border-radius 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.textchat.full-radius {
  border-radius: 30px !important;
  transition: border-radius 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 语音消息的全圆角 */
.voice-bar.full-radius {
  border-radius: 30px !important;
  transition: border-radius 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 动画效果：从聊天泡泡变为全圆角 */
@keyframes bubbleToFullRadius {
  0% {
    border-radius: 30px 30px 30px 5px;
  }
  100% {
    border-radius: 30px;
  }
}

@keyframes bubbleToFullRadiusMy {
  0% {
    border-radius: 30px 30px 5px 30px;
  }
  100% {
    border-radius: 30px;
  }
}

/* 应用动画 */
.message-bubble.full-radius:not(.my-message) {
  animation: bubbleToFullRadius 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.message-bubble.full-radius.my-message {
  animation: bubbleToFullRadiusMy 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.textchat.full-radius:not(.my-message) {
  animation: bubbleToFullRadius 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.textchat.full-radius.my-message {
  animation: bubbleToFullRadiusMy 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

/* 语音消息的全圆角动画 */
.voice-bar.full-radius:not(.my-message) {
  animation: bubbleToFullRadius 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.voice-bar.full-radius.my-message {
  animation: bubbleToFullRadiusMy 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
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
</style>