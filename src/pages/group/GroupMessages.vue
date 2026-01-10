<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { debounce } from 'lodash';
import { useGroupChat, GroupChatMessage } from '@/composables/useGroupChat';
import { useGroupVoiceBar } from '@/composables/useVoiceBarGroup';
import { VoiceRecorder } from 'capacitor-voice-recorder';
import { getTalkFlowCore } from '@/composables/TalkFlowCore';
import { 
  IonButton, IonButtons, IonIcon, IonTitle, IonToolbar, IonHeader, 
  IonFooter, IonPage, IonCheckbox, IonProgressBar,IonBackButton,
} from '@ionic/vue';
import {
  ellipsisHorizontal, playOutline, pauseOutline,
  micOutline, chatboxOutline, copyOutline, trashOutline,
  returnDownBackOutline, closeCircleOutline, lockClosedOutline, chevronBackOutline,
  chatbubbleEllipsesOutline, attachOutline, closeOutline, checkmarkOutline,
  addCircleOutline, peopleOutline, sendOutline, imageOutline, 
  add,
  addOutline,
  callOutline
} from 'ionicons/icons';
import { useKeyboardState } from '@/composables/useKeyboardState';
import { mountClass, gunAvatar } from 'gun-avatar';
import { Browser } from '@capacitor/browser';
import { useDateFormatter } from '@/composables/useDateFormatter';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';
import { useTheme } from '@/composables/useTheme';
import SpinningLoader from '@/components/ui/SpinningLoader.vue';
import VoiceBar from '@/components/VoiceBar.vue';
import ImageMessage from '@/components/ui/ImageMessage.vue';
import HlsVideoPlayer from '@/components/ui/HlsVideoPlayer.vue';
import { useCallOverlay } from '@/composables/useCallOverlay'
const overlay = useCallOverlay()
function onOpenOverlay(){
  overlay.setEnabled(true)
}

marked.setOptions({
  highlight: (code: string, lang: string) => {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  },
  breaks: true,
  gfm: true,
});

const { formatLastTime } = useDateFormatter();
const {
  currentGroup,
  currentGroupName,
  sendMessage,
  messagesByGroup,
  membersByGroup,
  safeUserPub: currentUserPub,
  loadMoreMessages: loadMoreChatHistory,
  selectGroup,
  loadGroups,
  triggerLightHaptic,
  markGroupAsRead,
  isInitialGroupMessageSyncing 
} = useGroupChat();
const { isRecording, playingAudio, startRecording, stopRecording, sendVoiceMessage, playVoice, stopVoice } = useGroupVoiceBar();
mountClass();
const { isDark } = useTheme();

const chatFlow = getTalkFlowCore();
const {
  userAvatars,
  buddyList,
  gun,
} = chatFlow;
const showOverlay = ref(true);

// =================== 新增：音频播放状态管理 ===================
const audioMap = ref<Record<string, HTMLAudioElement>>({});
const remainingMs = ref<Record<string, number>>({});

// =================== 新增：语音播放切换函数 ===================
function toggleVoicePlayback(item: GroupChatMessage) {
  const msgId = item.msg_id;
  const totalMs = item.duration || 0;
  
  // 添加震动反馈
  triggerLightHaptic();
  
  // 如果当前正在播放这个音频，停止播放
  if (playingAudio.value === item.content) {
    stopVoice();
  }
  
  // 如果音频已经在播放，暂停并清理
  if (audioMap.value[msgId]) {
    audioMap.value[msgId].pause();
    delete audioMap.value[msgId];
    delete remainingMs.value[msgId];
    return;
  }
  
  // 停止其他正在播放的音频
  Object.values(audioMap.value).forEach(a => a.pause());
  Object.keys(audioMap.value).forEach(id => delete remainingMs.value[id]);
  audioMap.value = {};
  
  // 创建新的音频元素
  const audio = new Audio(item.content);
  audioMap.value[msgId] = audio;
  remainingMs.value[msgId] = totalMs;
  
  // 添加事件监听器
  audio.addEventListener('timeupdate', () => {
    const left = Math.max(0, totalMs - audio.currentTime * 1000);
    remainingMs.value[msgId] = left;
  });
  
  audio.addEventListener('ended', () => {
    delete audioMap.value[msgId];
    delete remainingMs.value[msgId];
  });
  
  // 播放音频
  audio.play();
  playVoice(item.content, msgId);
}
const router = useRouter();
const route = useRoute();
const { keyboardHeight, inputFocused, initKeyboard } = useKeyboardState();
const isVoiceMode = ref(false);
const cancelRecording = ref(false);
let touchStartY = 0;
const textInputRef = ref<HTMLTextAreaElement | null>(null);
const newMessage = ref('');
const scrollerRef = ref<any>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const isInitialLoad = ref(true);
const capsuleRef = ref<HTMLDivElement | null>(null);

// =================== 新增：消息模板相关状态 ===================
interface Meta { type: 'about' | 'think'; content: string; from?: string; alias?: string }
const typedMeta = ref<Meta[]>([]);
const inputMode = ref<'default' | 'about' | 'think'>('default');

// =================== 新增：emoji快捷回复相关状态 ===================
const showEmojiPicker = ref(false);
const emojiList = [
  "👍", "😂", "😅", "😍", "🤔", "🥹", "👏", "🔥", "😳", "🥲", "😭", "🤝", "🫶", "🙏",
  "💯", "😡", "😎", "🙌", "😉", "😐", "❤️", "💩", "🌈","😊"
];

// =================== 新增：引用消息回复相关状态 ===================
const replyPreview = ref<null | { alias: string; snippet: string }>(null);

const adjustHeight = () => {
  const el = textInputRef.value;
  if (!el) return;
  el.style.height = '38px';
  const newH = Math.min(el.scrollHeight, 120);
  el.style.height = `${newH}px`;
  if (capsuleRef.value) capsuleRef.value.style.height = `${newH + 8}px`;
  
};

const isLoadingOlderMessages = ref(false);
const hasMoreMessages = ref(true);
const scrollerEl = ref<HTMLElement | null>(null);

// —— Long-press to open overlay ——
const selectedMsg = ref<GroupChatMessage | null>(null);
let pressTimer: number | NodeJS.Timeout | null = null;
const LONG_PRESS_DELAY = 400;
let longPressTimer: number | null = null;

const startLongPress = (item: GroupChatMessage) => {
  // triggerLightHaptic();
  clearLongPress();
  pressTimer = window.setTimeout(() => {
    selectedMsg.value = item;
    triggerLightHaptic();
  }, LONG_PRESS_DELAY);
};

const clearLongPress = () => {
  if (pressTimer) {
    clearTimeout(pressTimer as number);
    pressTimer = null;
  }
  if (longPressTimer !== null) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
};

function handleLongPress1(event: TouchEvent) {
  // 不要清除长按，让消息气泡的长按事件正常工作
  const touch = event.touches[0];
  const node = document.elementFromPoint(touch.clientX, touch.clientY);
  if (node?.closest('.message-bubble')) {
    // 如果点击在消息气泡上，不处理容器级别的长按
    return;
  }
  // 只有在空白区域才处理容器级别的长按
  clearLongPress();
  longPressTimer = window.setTimeout(() => {
    // 可以在这里添加选择模式逻辑
    triggerLightHaptic();
  }, LONG_PRESS_DELAY);
}

const closeOverlay = () => {
  selectedMsg.value = null;
};

const copyMsg = async () => {
  if (!selectedMsg.value) return;
  const text = stripHtml(selectedMsg.value.content);
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) { /* ignore */ }
  closeOverlay();
};

// =================== 新增：引用消息回复功能 ===================
const quoteReply = () => {
  if (!selectedMsg.value) return;
  let snippet = '';
  
  if (selectedMsg.value.content_type === 'voice') {
    snippet = '[Voice]';
  } else {

    const plain = stripHtml(selectedMsg.value.content);
    snippet = plain.slice(0, 50);
    
  }
  
  replyPreview.value = {
    alias: selectedMsg.value.sender_alias,
    snippet: snippet
  };

  newMessage.value = '';
  nextTick(() => textInputRef.value?.focus());
  closeOverlay();
};

// =================== 新增：emoji快捷回复功能 ===================
const sendThinkAndEmojiReply = (emoji: string) => {
  if (selectedMsg.value) {
    const from = selectedMsg.value.sender_pub;
    const alias = selectedMsg.value.sender_alias;
    let cleanText = '';
    
    if (selectedMsg.value.content_type === 'voice') {
      cleanText = '[Voice]';
    } else {
      cleanText = stripHtml(selectedMsg.value.content);
    }
    
    const thinkBlock = `<think from="${from}" alias="${alias}">${cleanText}</think>` + emoji;
    sendMessage(thinkBlock);
  }
  showEmojiPicker.value = false;
  closeOverlay();
  triggerLightHaptic();
  nextTick(() => scrollToBottomSmooth());
  setTimeout(() => {
    nextTick(() => scrollToBottomSmooth());
  }, 100);
};

// =================== 新增：消息模板解析功能 ===================
function parseMetaSegments(text: string): Array<{ content: string; type: 'normal' | 'think' | 'about'; from?: string; alias?: string }> {
  // 增强：输入验证
  if (!text || typeof text !== 'string' || text.trim() === '') {
    return []; // 返回空数组，避免渲染无效内容
  }
  const regex = /<(think|about)(?:\s+from="(.*?)"(?:\s+alias="(.*?)")?)?>([\s\S]*?)<\/\1>/g;
  const segs: { content: string; type: 'normal' | 'think' | 'about'; from?: string; alias?: string }[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    const [full, tag, from, alias, inner] = m;
    if (m.index > lastIndex) {
      const normalContent = text.slice(lastIndex, m.index);
      if (normalContent.trim()) { // 只添加非空内容
        segs.push({ type: 'normal', content: normalContent });
      }
    }
    if (inner && inner.trim()) { // 只添加非空的meta内容
      segs.push({ type: tag as 'think' | 'about', content: inner, from, alias });
    }
    lastIndex = m.index + full.length;
  }
  if (lastIndex < text.length) {
    const remainingContent = text.slice(lastIndex);
    if (remainingContent.trim()) { // 只添加非空内容
      segs.push({ type: 'normal', content: remainingContent });
    }
  }
  return segs;
}

function renderMarkdown(content: string): string {
  if (!content) return "";
  const rawHtml = marked(content);
  return DOMPurify.sanitize(rawHtml as any);
}

// =================== 新增：辅助函数 ===================
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
    console.error('无法打开链接:', error);
  }
}

function isSingleEmoji(text: string): boolean {
  const emojiRegex = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)$/u;
  return emojiRegex.test(text.trim());
}

function truncateContent(content: string, maxLength: number) {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength) + '...';
}

function isBase64Image(text: string | undefined): boolean {
  if (!text || typeof text !== 'string') return false;
  const isImage = /^data:image\/[\w+.-]+;base64,/.test(text);
  return isImage;
}

function isBase64Video(text: string | undefined): boolean {
  if (!text || typeof text !== 'string') return false;
  const isVideo = /^data:video\/[\w+.-]+;base64,/.test(text);
  return isVideo;
}

function isBase64Audio(text: string | undefined): boolean {
  if (!text || typeof text !== 'string') return false;
  const isAudio = /^data:audio\/[\w+.-]+;base64,/.test(text);
  return isAudio;
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

const stripHtml = (html: string) => html.replace(/<[^>]+>/g, '');

// 格式化语音消息时长
const formatDuration = (duration: number): string => {
  if (!duration || duration <= 0) return '0:00';
  const minutes = Math.floor(duration / 60000);
  const seconds = Math.floor((duration % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// =================== 新增：消息模板相关函数 ===================
const confirmInput = () => {
  if (inputMode.value !== 'default' && newMessage.value.trim() && !typedMeta.value.some(m => m.content === newMessage.value.trim())) {
    typedMeta.value.push({ type: inputMode.value as 'about' | 'think', content: newMessage.value.trim() });
    newMessage.value = '';
  }
  inputMode.value = 'default';
  if (textInputRef.value) {
    nextTick(() => textInputRef.value!.focus());
  }
};

const removeMeta = (index: number) => {
  typedMeta.value.splice(index, 1);
};

// =================== 新增：消息内容渲染函数 ===================
const renderMessageContent = (content: string): string => {
  if (!content) return "";
  
  const segments = parseMetaSegments(content);
  let html = '';
  
  segments.forEach(seg => {
    if (seg.type === 'about') {
      const urlParts = extractUrls(seg.content);
      let aboutContent = '';
      urlParts.forEach(part => {
        if (part.isUrl) {
          aboutContent += `<a @click.stop="openUrl('${part.text}')" class="url-link">${part.text}</a>`;
      //     aboutContent += `
      //     <LinkPreview
      //     @click.stop="openUrl('${part.text}')"
      //   :url="${part.text}"
      //   class="font-bold"
      // >
      //   ${part.text}
      // </LinkPreview>`;
        } else {
          aboutContent += part.text;
        }
      });
      html += `<div class="think-block"><ion-icon icon="attach-outline" class="meta-icon"></ion-icon>${aboutContent}</div>`;
    } else if (seg.type === 'think') {
      const aliasText = seg.alias ? `<span class="think-reply-user">@${seg.alias}</span>` : '';
      html += `<div class="think-block">${aliasText}${seg.content}</div>`;
    } else {
      let normalContent = seg.content;
      html += renderMarkdown(normalContent);
    }
  });
  
  return html;
};

const currentChatMessages = computed(() => {
  const pubKey = currentGroup.value || "";
  return messagesByGroup.value[pubKey] || [];
});

const displayedMembers = computed(() => {
  if (!currentGroup.value) return [];
  const members = membersByGroup.value[currentGroup.value] || [];
  return members.slice(0, 8);
});

const getGunAvatar = (pub: string) => {
  return gunAvatar({ pub, round: true, size: 40, dark: isDark.value, svg: true } as any);
};

const goToProfile = (userPub: string) => {
    router.push({ path: '/friend-profile', query: { pub: userPub } });
};



const gotoMembers = () => {
  if (currentGroup.value) {
    router.push(`/GroupMembers`);
  }
}

const isLastInSequence = (index: number) => {
  const currentMessage = currentChatMessages.value[index];
  const nextMessage = currentChatMessages.value[index + 1];
  return !nextMessage || nextMessage.sender_pub !== currentMessage.sender_pub;
};

const onFocus = () => {
  inputFocused.value = true;
  nextTick(() => scrollToBottomSmooth());
};
const onBlur = () => inputFocused.value = false;

const handleEnterKey = (event: KeyboardEvent) => {
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
      // const from = m.from ? ` from="${m.from}"` : '';
      // const alias = m.alias ? ` alias="${m.alias}"` : '';
      // full += `<think${from}${alias}>${m.content}</think>\n`;
    }
  });

  const trimmedMsg = newMessage.value.trim();
  if (trimmedMsg && /^\d+$/.test(trimmedMsg)) {
    full += `Number:${trimmedMsg}`;
  } else if (trimmedMsg) {
    full += trimmedMsg;
  }

  let finalContent = full;
  if (replyPreview.value) {
    finalContent = `<think from="${selectedMsg.value?.sender_pub || ''}" alias="${replyPreview.value.alias}">${replyPreview.value.snippet}</think>\n\n` + full;
  }

  sendMessage(finalContent);
  newMessage.value = '';
  typedMeta.value = [];
  replyPreview.value = null;
  inputMode.value = 'default';
  triggerLightHaptic();
  setTimeout(() => scrollToBottom(), 150);
  setTimeout(() => {
    nextTick(() => scrollToBottomSmooth());
  }, 200);

  if (inputFocused.value) {
    nextTick(() => {
      if (textInputRef.value) {
        textInputRef.value.focus();
        adjustHeight();
        scrollToBottom();
      }
    });
  }
};

const sendMessageFromInput = () => {
  const content = newMessage.value.trim();
  if (!content && !typedMeta.value.length) return;
  
  let finalContent = content;
  if (replyPreview.value) {
    // 使用think标签格式，与emoji快捷回复保持一致
    finalContent = `<think from="${selectedMsg.value?.sender_pub || ''}" alias="${replyPreview.value.alias}">${replyPreview.value.snippet}</think>\n\n` + content;
  }
  sendMessage(finalContent);
  newMessage.value = '';
  replyPreview.value = null;
  typedMeta.value = [];
  inputMode.value = 'default';
  nextTick(() => {
    textInputRef.value.focus();
    adjustHeight();
    scrollAfterSend();
    triggerLightHaptic();
  });
};

// =================== 新增：语音录制功能 ===================
const startVoiceRecording = async (event: TouchEvent | MouseEvent) => {
  try {
    triggerLightHaptic();
    if (event instanceof TouchEvent) {
      event.preventDefault();
      touchStartY = event.touches[0].clientY;
    }
    await startRecording();
  } catch (error) {
    // console.error('Failed to start recording:', error);
  }
};

const handleVoiceMove = (event: TouchEvent) => {
  triggerLightHaptic();
  if (!isRecording.value) return;
  
  const currentY = event.touches[0].clientY;
  const deltaY = touchStartY - currentY;
  cancelRecording.value = deltaY > 50;
};

const stopVoiceRecording = async (event: TouchEvent | MouseEvent) => {
  try {
    triggerLightHaptic();
    if (!isRecording.value) return;
    
    if (event instanceof TouchEvent) {
      event.preventDefault();
    }
    
    if (cancelRecording.value) {
      await stopRecording();
    } else {
      await sendVoiceMessage();
      nextTick(() => scrollToBottomSmooth());
    }
    cancelRecording.value = false;
  } catch (error) {
    // console.error('Failed to stop recording:', error);
  }
};

const cancelVoiceRecording = async () => {
  if (isRecording.value) {
    await stopRecording();
    cancelRecording.value = false;
  }
};



// =================== 按钮切换逻辑 ===================
const handleActionButtonClick = async () => {
  if (isVoiceMode.value) {
    isVoiceMode.value = false;
  } else if (newMessage.value.trim() || typedMeta.value.length) {
    sendMessageFromInput();
  } else {
    isVoiceMode.value = true;
    // 切换到语音模式（不自动录音，只有按住才录音）
  }
};

// update scrollToBottom to use scrollerEl
const scrollToBottom = () => {
  if (scrollerEl.value) {
    scrollerEl.value.scrollTo({ top: scrollerEl.value.scrollHeight, behavior: 'smooth' });
  }
};

const isAtBottom = () => {
  const sc = scrollerRef.value?.$el;
  if (!sc) return false;
  return sc.scrollHeight - sc.scrollTop - sc.clientHeight < 10;
};

const isNearBottom = (threshold = 150) => {
  const sc = scrollerRef.value?.$el;
  if (!sc) return false;
  return sc.scrollHeight - (sc.scrollTop + sc.clientHeight) < threshold;
};

/* ------------------------------------------------------------------
   Dedicated scrolling helpers
------------------------------------------------------------------*/
const scrollToBottomInstant = () => {
  if (!scrollerEl.value) return;
  scrollerEl.value.scrollTop = scrollerEl.value.scrollHeight;
  scrollerRef.value?.scrollToItem?.(currentChatMessages.value.length - 1, 'end');
};

const scrollToBottomSmooth = () => {
  if (!scrollerEl.value) return;
  scrollerEl.value.scrollTo({ top: scrollerEl.value.scrollHeight, behavior: 'smooth' });
  scrollerRef.value?.scrollToItem?.(currentChatMessages.value.length - 1, 'end');
};

// 初次进入：参考私聊页面逻辑
const scrollInitial = () => {
  if (!scrollerRef.value || currentChatMessages.value.length === 0) return;
  nextTick(() => {
    const lastIdx = currentChatMessages.value.length - 1;
    scrollerRef.value.scrollToItem?.(lastIdx, 'end');
    isInitialLoad.value = false;
    const scroller = scrollerRef.value.$el;

    const ensure = () => {
      const delta = scroller.scrollHeight - (scroller.scrollTop + scroller.clientHeight);
      if (delta > 5) {
        scroller.scrollTop = scroller.scrollHeight;
      }
    };
    setTimeout(ensure, 120);
    setTimeout(ensure, 300);
  });
};

// 发送消息后
const scrollAfterSend = () => {
  // 先同步到底，再异步平滑一次，保证渲染完成后仍在底部
  scrollToBottomInstant();
  setTimeout(scrollToBottomSmooth, 200);
};

// 收到新消息（当用户已在底部附近时）
const scrollOnReceive = () => {
  if (isNearBottom()) {
    nextTick(() => {
      scrollToBottomSmooth();
      if (scrollerRef.value) {
        scrollerRef.value.reset();
      }
    });
  }
};

// ---- Watch DB auto-increment id change ----
const lastMessageId = computed(() => {
  const msgs = currentChatMessages.value;
  return msgs.length ? msgs[msgs.length - 1].id : -1;
});

watch(lastMessageId, (newVal, oldVal) => {
  if (newVal !== oldVal) {
    scrollOnReceive();
  }
});
 
// replaced interval approach
onMounted(async () => {
 const groupPub = currentGroup.value;
  if (groupPub) {
    await selectGroup(groupPub);
    
    // // console.log('selectGroup done 已经完成');
    // // console.log('groupPub', groupPub);
    // // await loadGroups();
    // // console.log('loadGroups done 已经完成');

    setTimeout( () => {
     scrollToBottomSmooth()
    showOverlay.value = false;
  }, 50);
    // scrollInitial(); // Removed, as initial scroll will be triggered by isInitialGroupMessageSyncing watch
  }
  scrollerEl.value = scrollerRef.value?.$el; // Re-add this line

  try {
    // 初始化共享键盘状态
    initKeyboard();
    // 保持原有滚动行为：根据焦点状态处理
    watch(inputFocused, (focused) => {
      if (focused) {
        nextTick(() => scrollToBottom());
      } else {
        nextTick(() => {
          if (scrollerRef.value) {
            scrollerRef.value.reset();
            setTimeout(() => scrollToBottom(), 100);
          }
          if (capsuleRef.value) capsuleRef.value.style.transform = 'none';
        });
      }
    });

    // 键盘高度变化时，重置虚拟滚动并保持底部可见
    watch(keyboardHeight, (h) => {
      nextTick(() => {
        scrollerRef.value?.reset?.();
        if (inputFocused.value && scrollerEl.value) {
          scrollerEl.value.scrollTo({ top: scrollerEl.value.scrollHeight, behavior: 'auto' });
        }
      });
    });
  } catch (error) {
    console.error('Keyboard setup error:', error);
  }

  await markGroupAsRead(groupPub);
  scrollerRef.value?.reset(); 
  // setTimeout(() => {
  //       nextTick(() => scrollToBottomSmooth());
  //     }, 200);
  // Initial scroll removed, will be handled by watch(isInitialGroupMessageSyncing)
});

onUnmounted(() => {
  // 使用共享键盘状态，无需移除所有监听
  // no interval to clear
});

watch(currentChatMessages, (newMessages, oldMessages = []) => {
  if (isInitialLoad.value && newMessages.length > 0) {
    if (!isInitialGroupMessageSyncing.value) {
      scrollInitial();
      setTimeout(() => {
        nextTick(() => scrollToBottomSmooth());
      }, 200);
    }
    return;
  }

  if (!newMessages.length) return;

  // Trigger scroll on any new message being added, or on initial load completion if new messages exist
  if (newMessages.length > oldMessages.length) {
    scrollOnReceive();
  }
}, { deep: true });

watch(isInitialGroupMessageSyncing, (newVal) => {
  if (!newVal) { // When syncing finishes
    nextTick(() => {
      scrollInitial();
    });
  }
});

watch(inputFocused, (focused) => {
  if (focused) nextTick(() => scrollToBottom());
});

// Scroller scroll handler: load older history when near top
const onScrollerScroll = debounce(async () => {
  if (!scrollerRef.value?.$el || isLoadingOlderMessages.value || !hasMoreMessages.value) return;

  // Temporarily disable smooth scroll
  const scroller = scrollerRef.value.$el;
  const originalScrollBehavior = scroller.style.scrollBehavior;
  scroller.style.scrollBehavior = 'auto';

  // near top
  if (scroller.scrollTop < 50) {
    isLoadingOlderMessages.value = true;
    const prevHeight = scroller.scrollHeight;
    const prevMsgCount = currentChatMessages.value.length;

    await loadMoreChatHistory(currentGroup.value!);

    if (currentChatMessages.value.length === prevMsgCount) {
      hasMoreMessages.value = false;
    }

    await nextTick();
    // maintain scroll offset after prepend
    scroller.scrollTop += (scroller.scrollHeight - prevHeight);
    isLoadingOlderMessages.value = false;
  }
  // Restore original scroll behavior
  scroller.style.scrollBehavior = originalScrollBehavior;
}, 300);


// =================== 新增：图片和视频发送相关状态和函数 ===================
const uploadProgress = ref(0);


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
        await sendMessage(compressedBase64);
      } else if (file.type.startsWith('video/')) {
        if (file.size > 100 * 1024 * 1024) {
          // showToast('Max100MB', 'warning'); // No showToast in this file
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
    }
  }
  nextTick(() => scrollToBottomSmooth()); // Use scrollToBottomSmooth here for consistency
  input.value = '';
}

function triggerFileUpload() {
  fileInput.value?.click();
}

// =================== 新增：视频播放功能 ===================

// HLS视频播放器事件处理
const onVideoLoaded = (msgId: string) => {
  nextTick(() => scrollerRef.value?.reset());
  console.log('Video loaded:', msgId);
};

const onVideoError = (msgId: string, error: any) => {
  console.error('Video error for', msgId, ':', error);
};

const onVideoPlay = (msgId: string) => {
  console.log('Video playing:', msgId);
};

const onVideoPause = (msgId: string) => {
  console.log('Video paused:', msgId);
};

</script>

<template>
  <ion-page>
    <ion-header :translucent="true"  collapse="fade" class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
             <ion-back-button :text="$t('back')" ></ion-back-button>
        </ion-buttons>
        <ion-title @click="gotoMembers">
            <div class="header-title">
              <div class="header-avatars" @click="gotoMembers">
                <img
                  v-for="member in displayedMembers"
                  :key="member.member_pub"
                  class="header-avatar"
                  :src="userAvatars[member.member_pub] || getGunAvatar(member.member_pub)"
                  alt=""
                />
              </div>
              <span class="chat-name">{{ currentGroupName }}</span>
            </div>
        </ion-title>
           <ion-buttons slot="end">
               <ion-button @click="onOpenOverlay">
            <ion-icon   :icon="callOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true" :scroll-y="false" class="full-height-content" :style="{
      '--content-bottom': keyboardHeight + 'px',
      '--keyboard-offset': Math.min(keyboardHeight * 0.2, 0) + 'px'
    }">


    <transition name="fade">
        <div v-if="showOverlay" class="glass-overlay"></div>
      </transition>


        <div v-if="isInitialGroupMessageSyncing"  class="syncing-loader-container">
            <SpinningLoader />
            <p>The chat history is being synced, please wait...</p>
        </div>

        
     
        <div v-else class="message-container"
           @touchstart="handleLongPress1($event)"
           @touchend="clearLongPress()"
           @touchmove="clearLongPress()">
            <DynamicScroller
                class="scroller ion-content-scroll-host"
                :items="currentChatMessages"
                :min-item-size="52"
                key-field="msg_id"
                ref="scrollerRef"
                 :buffer="3000"
                 @scroll="onScrollerScroll"
            >
              <template #before>
                <div class="load-more-container" v-if="!isInitialLoad">
                    <ion-spinner v-if="isLoadingOlderMessages" name="crescent"></ion-spinner>
                </div>
              </template>
                <template v-slot="{ item, index, active }">
                <DynamicScrollerItem
                    :item="item"
                    :active="active"
                    :data-index="index"
                    :size-dependencies="[item.content]"
                >
                    <!-- 新增：内容验证保护 -->
                    <div v-if="!item.content || item.content.trim() === '' || !item.sender_pub || !item.sender_alias" class="empty-message-warning">
                      <!-- 无效消息不渲染，避免空白占位 -->
                    </div>
                    
                    <div v-else :class="['chat-container', item.sender_pub === currentUserPub ? 'my-message' : 'other-message']">
                    <div class="message-wrapper">
                        <template v-if="item.sender_pub !== currentUserPub && isLastInSequence(index)">
                            <img 
                              v-if="userAvatars[item.sender_pub]" 
                              class="message-avatar" 
                              :src="userAvatars[item.sender_pub]" 
                              @click="goToProfile(item.sender_pub)" 
                              alt=""
                            />
                            <img 
                              v-else 
                              class="message-avatar" 
                              :src="getGunAvatar(item.sender_pub)" 
                              @click="goToProfile(item.sender_pub)" 
                              alt=""
                            />
                        </template>
                        <div class="message-bubble"
                              @touchstart="startLongPress(item)" @touchend="clearLongPress()" @touchmove="clearLongPress()"
                              @mousedown="startLongPress(item)" @mouseup="clearLongPress()" @mousemove="clearLongPress()"
                              :class="{ 'full-radius': !isLastInSequence(index) }">
                            <template v-if="isBase64Image(item.content)">
                              <ImageMessage 
                                :image-src="item.content" 
                                :alt="''"
                                max-width="280px"
                                max-height="200px"
@load="nextTick(() => scrollerRef.value?.reset());"
                              />
                            </template>
                            <template v-else-if="isBase64Video(item.content)">
                              <HlsVideoPlayer
                                :msg-id="item.msg_id"
                                :base64-video="item.content"
                                max-width="280px"
                                max-height="200px"
                                @loaded="onVideoLoaded"
                                @error="onVideoError"
                                @play="onVideoPlay"
                                @pause="onVideoPause"
                              />
                            </template>
                            <template v-else-if="isSingleEmoji(item.content)">
                              <div class="emoji-message-big">{{ item.content }}</div>
                            </template>
                            <template v-else-if="item.content.startsWith('Number:')">
                              <div class="number-message">
                                <span class="number-badge">{{ item.content.replace('Number:', '') }}</span>
                              </div>
                            </template>
                            <template v-else-if="item.content_type === 'voice'">
                              <VoiceBar
                                :is-playing="!!audioMap[item.msg_id]"
                                :is-pending="false"
                                :is-failed="false"
                                :is-my-message="item.sender_pub === currentUserPub"
                                :duration="item.duration || 0"
                                :remaining-time="remainingMs[item.msg_id]"
                                @click="toggleVoicePlayback(item)"
                              />
                            </template>
                            <template v-else>
                              <div class="meta-text-container" :class="item.sender_pub === currentUserPub ? 'my-message' : 'other-message'">
                                <div v-for="(seg, i) in parseMetaSegments(item.content).filter(s => s.type === 'about')" :key="'about'+i"
                                     class="think-block" :class="item.sender_pub === currentUserPub ? 'think-own' : 'think-other'">
                                  <ion-icon :icon="attachOutline" class="meta-icon"></ion-icon>{{ seg.content }}
                                </div>
                                <div v-for="(seg, i) in parseMetaSegments(item.content).filter(s => s.type === 'think')" :key="'think'+i"
                                     class="think-block" :class="item.sender_pub === currentUserPub ? 'think-own' : 'think-other'">
                                  <span v-if="seg.alias" class="think-reply-user">@{{ seg.alias }}</span>{{ seg.content }}
                                </div>
                                
                                <div v-for="(seg, k) in parseMetaSegments(item.content).filter(s => s.type === 'normal')" :key="'normal'+k">
                                
                                  <div v-if="isSingleEmoji(seg.content)">
                              <div class="emoji-message-big">{{ seg.content }}</div>
                            </div>
                            <div v-else-if="seg.content.startsWith('Number:')">
                              <div class="number-message">
                                <span class="number-badge">{{ item.content.replace('Number:', '') }}</span>
                              </div>
                            </div>

                                  <div v-else :class="['textchat', item.sender_pub === currentUserPub ? 'my-message' : 'other-message', { 'full-radius': !isLastInSequence(index) }]"
                                       class=" markdown-content" v-html="renderMarkdown(seg.content)"></div>
                                </div>
                              </div>
                            </template>
                        </div>
                        <!-- <template v-if="item.sender_pub === currentUserPub && isLastInSequence(index)">
                             <img 
                               v-if="userAvatars[item.sender_pub]" 
                               class="message-avatar" 
                               :src="userAvatars[item.sender_pub]" 
                               alt=""
                             />
                             <img 
                               v-else 
                               class="message-avatar" 
                               :src="getGunAvatar(item.sender_pub)" 
                               alt=""
                             />
                        </template> -->
                    </div>
                    <div 
                      
                        :class="['timestamp-container', item.sender_pub === currentUserPub ? 'my-timestamp' : 'other-timestamp']"
                    >
                    <template   v-if="isLastInSequence(index)" >

                        <SpinningLoader 
                            v-if="item.status === 'pending' && item.isSending && item.sender_pub === currentUserPub" 
                            size="small" 
                            theme="primary"
                            class="pending-status"
                        />
                        <div 
                            v-else-if="item.status === 'sent' && item.justSent && item.sender_pub === currentUserPub"
                            class="sent-confirmation"
                        >
                            <ion-icon :icon="checkmarkOutline" class="checkmark-icon"></ion-icon>
                        </div>
                                                <span v-if="item.sender_pub !== currentUserPub" class="sender-nickname">{{ item.sender_alias }}</span>
                        <span v-if="item.sender_pub !== currentUserPub" class="dot-sep">•</span>
                        <span class="timestamp">{{ formatLastTime(item.timestamp) }}</span>
                      </template>
                    </div>
                </div>
                </DynamicScrollerItem>
                </template>
            </DynamicScroller>
        </div>
    </ion-content>

    <!-- Full-screen overlay for selected message -->
    <!-- <transition name="fade"> -->
      <div v-if="selectedMsg" class="blur-overlay" >
        <div class="center-message-popup">
          <div class="center-message-bubble" :class="selectedMsg.sender_pub === currentUserPub ? 'my-message' : 'other-message'">
            <template v-if="isBase64Image(selectedMsg.content)">
              <img :src="selectedMsg.content" class="media-element" alt="" />
            </template>
            <template v-else-if="isBase64Video(selectedMsg.content)">
              <HlsVideoPlayer
                :msg-id="selectedMsg.msg_id"
                :base64-video="selectedMsg.content"
                max-width="100%"
                max-height="400px"
                @loaded="onVideoLoaded"
                @error="onVideoError"
                @play="onVideoPlay"
                @pause="onVideoPause"
              />
            </template>
            <template v-else-if="isSingleEmoji(selectedMsg.content)">
              <div class="emoji-message-big">{{ selectedMsg.content }}</div>
            </template>
            <template v-else-if="selectedMsg.content.startsWith('Number:')">
              <div class="number-message">
                <span class="number-badge">{{ selectedMsg.content.replace('Number:', '') }}</span>
              </div>
            </template>
            <template v-else-if="selectedMsg.content_type === 'voice'">
              <VoiceBar
                :is-playing="!!audioMap[selectedMsg.msg_id]"
                :is-pending="false"
                :is-failed="false"
                :is-my-message="selectedMsg.sender_pub === currentUserPub"
                :duration="selectedMsg.duration || 0"
                :remaining-time="remainingMs[selectedMsg.msg_id]"
                @click="toggleVoicePlayback(selectedMsg)"
              />
            </template>
            <template v-else>
              <div class="meta-text-container" :class="selectedMsg.sender_pub === currentUserPub ? 'my-message' : 'other-message'">
                <div v-for="(seg, i) in parseMetaSegments(selectedMsg.content).filter(s => s.type === 'about')" :key="'about'+i"
                     class="about-block" :class="selectedMsg.sender_pub === currentUserPub ? 'about-own' : 'about-other'">
                  <ion-icon :icon="attachOutline" class="meta-icon"></ion-icon>{{ seg.content }}
                </div>
                <div v-for="(seg, i) in parseMetaSegments(selectedMsg.content).filter(s => s.type === 'think')" :key="'think'+i"
                     class="think-block" :class="selectedMsg.sender_pub === currentUserPub ? 'think-own' : 'think-other'">
                  <span v-if="seg.alias" class="think-reply-user">@{{ seg.alias }}</span>{{ seg.content }}
                </div>
                <div v-for="(seg, k) in parseMetaSegments(selectedMsg.content).filter(s => s.type === 'normal')" :key="'normal'+k">
                  <div v-if="isSingleEmoji(seg.content)">
                              <div class="emoji-message-big">{{ seg.content }}</div>
                            </div>
                            <div v-else-if="seg.content.startsWith('Number:')">
                              <div class="number-message">
                                <span class="number-badge">{{ seg.content.replace('Number:', '') }}</span>
                              </div>
                            </div>
                            
                                  <div v-else :class="['textchat', selectedMsg.sender_pub === currentUserPub ? 'my-message' : 'other-message']"
                                       class="native-selectable markdown-content" v-html="renderMarkdown(seg.content)"></div>
                                </div>
              </div>
            </template>
          </div>
          <div class="center-action-bar">
            <ion-button fill="clear" @click="copyMsg">
              <ion-icon :icon="copyOutline"></ion-icon>
            </ion-button>
            <ion-button fill="clear" @click="quoteReply">
              <ion-icon :icon="chatbubbleEllipsesOutline"></ion-icon>
            </ion-button>
            <ion-button fill="clear" @click="showEmojiPicker = !showEmojiPicker">
              <span style="font-size:22px;">😊</span>
            </ion-button>
            <ion-button fill="clear" @click="closeOverlay">
              <ion-icon :icon="closeCircleOutline"></ion-icon>
            </ion-button>
          </div>
        </div>
      </div>
    <!-- </transition> -->

    <!-- Emoji picker overlay -->
    <transition name="slide">
      <div v-if="showEmojiPicker" class="emoji-picker-overlay" @click.self="showEmojiPicker = false">
        <div class="emoji-picker-panel">
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

    <ion-footer :translucent="true" collapse="fade" class="ion-no-border">
      <ion-toolbar class="input-toolbar" :style="{ transform: `translateY(-${keyboardHeight}px)` }">
        <!-- 消息模板卡片 -->
        <div class="mode-selection1">
          <div class="meta-cards" v-if="typedMeta.length">
            <div v-for="(meta, index) in typedMeta" :key="index"
                 class="meta-card"
                 :class="meta.type === 'about' ? 'about-card' : 'think-card'">
              <span v-if="meta.type === 'think' && meta.alias" class="think-reply-user1">@{{ meta.alias }}: </span>
              <span class="meta-content">
                {{ meta.content.length > 30 ? meta.content.slice(0, 30) + '…' : meta.content }}
              </span>
              <div style="display: flex;justify-content: center;align-items: center;" fill="clear" size="small" @click="removeMeta(index)">
                <ion-icon :icon="closeOutline" color="medium"></ion-icon>
              </div>
            </div>
          </div>
        </div>

        <!-- 引用回复预览 -->
        <div v-if="replyPreview" class="reply-preview">
          <div class="preview-content">
            <strong>{{ replyPreview.alias }} : </strong>
            <span class="ellipsis">{{ replyPreview.snippet }}</span>
          </div>
          <ion-button fill="clear" size="small" @click="replyPreview=null">
            <ion-icon color="dark" :icon="closeOutline"></ion-icon>
          </ion-button>
        </div>

         <div class="input-capsule" ref="capsuleRef">
         
        
            <div class="input-container">
              <ion-button class="drawer-toggle" fill="clear" @click="triggerFileUpload">
                <ion-icon style="font-size: 26px;" :icon="addOutline"></ion-icon>
              </ion-button>
              <input
                type="file"
                ref="fileInput"
                @change="handleFileUpload"
                accept="image/*,video/*"
                multiple
                style="display: none"
              />
              
              <transition name="button-fade" mode="out-in">
                <div v-if="!isVoiceMode" class="text-input" key="text-input">
                  <textarea
                    v-model="newMessage"
                    @focus="onFocus"
                    @blur="onBlur"
                    placeholder="Message"
                    rows="1"
                    ref="textInputRef"
                    @input="adjustHeight"
                  ></textarea>
                </div>
                <div v-else class="voice-input" 
                     :class="{ recording: isRecording, 'cancel-recording': cancelRecording }" 
                     @touchstart="startVoiceRecording" 
                     @touchmove="handleVoiceMove" 
                     @touchend="stopVoiceRecording" 
                     @touchcancel="cancelVoiceRecording"
                     key="voice-input">
                  <span v-if="isRecording">{{ cancelRecording ? 'Cancel the sliding' : 'Recording' }}</span>
                  <span v-else>Hold to record</span>
                </div>
              </transition>
              
              <ion-button class="action-button" fill="clear" @click="handleActionButtonClick">
                <transition name="button-fade" mode="out-in">
                  <ion-icon slot="icon-only" v-if="!newMessage && !isVoiceMode" :icon="micOutline" key="voice" style="font-size: 26px;"></ion-icon>
                  <ion-icon slot="icon-only" v-else-if="newMessage && !isVoiceMode" :icon="sendOutline" key="send" style="font-size: 20px;"></ion-icon>
                  <ion-icon slot="icon-only" v-else-if="isVoiceMode" :icon="chatbubbleEllipsesOutline" key="keyboard" style="font-size: 26px;"></ion-icon>
                </transition>
              </ion-button>
            </div>
          
         </div>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<style scoped>
.glass-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: var(--ion-background-color); z-index: 3; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.5s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.syncing-loader-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.header-title {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0px;
}
.header-avatars {
  display: flex;
  position: relative;
}
.header-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 1px solid var(--ion-background-color);
  margin-left: -10px;
  position: relative;
   /* box-shadow: 0 2px 4px rgba(0, 0, 0, 0.649); */
}
.header-avatar:first-child {
  margin-left: 0;
  z-index: 8;
}
.header-avatar:nth-child(2) {
  z-index: 7;
}
.header-avatar:nth-child(3) {
  z-index: 6;
}
.header-avatar:nth-child(4) {
  z-index: 5;
}
.header-avatar:nth-child(5) {
  z-index: 4;
}
.header-avatar:nth-child(6) {
  z-index: 3;
}
.header-avatar:nth-child(7) {
  z-index: 2;
}
.header-avatar:nth-child(8) {
  z-index: 1;
}
.chat-name {
    font-size: 16px;
    /* font-weight: 900; */
    margin-top: 5px;
    /* font-family:Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif; */
}
.full-height-content {
    height: 100vh;
    --padding-top: 0;
    --padding-bottom: 0;
    --offset-top: 0;
}
.message-container {
    height: 100vh;
    
}
.scroller {
    height: calc(100% - var(--content-bottom));
    padding: 130px 0px 120px 0px; /* 顶部内边距为顶部栏留空间，底部内边距避免被底部栏遮挡 */
    overflow-y: auto;
    overflow-x: hidden; 
    -webkit-overflow-scrolling: touch;
    box-sizing: border-box;
  
}
.chat-container {
    display: flex;
    margin-bottom: 10px;
    flex-direction: column;
    width: 100%;
    justify-content: space-between;
    padding:0 10px;
}
.message-wrapper {
    display: flex;
    align-items: flex-end;
    gap: 8px;
}
.chat-container.my-message {
  justify-content: flex-end;
}
.chat-container.my-message .message-wrapper {
    justify-content: flex-end;
}
.message-avatar {
  width: 35px; height: 35px; border-radius:50%; object-fit: cover;
 
}
.message-bubble {
    padding: 0px;
    border-radius: 30px 30px 30px 5px;
    color: var(--ion-color-dark-tint);
    cursor: pointer;
    transform-origin: center;
    max-width: 80%;

    
}
.message-bubble:has(.image-container), .message-bubble:has(.video-container) { padding: 0; }
.my-message .message-bubble {
    color: var(--ion-text-color);
    border-radius: 30px 30px 5px 30px;
}
.textchat {
    padding-top:15px;
    /* padding-bottom: 10px; */
    font-size: 15px;
    padding-left: 15px;
    padding-right: 15px;
    background: #898a8a26;
    color: var(--ion-text-color);
  
    border-radius: 30px 30px 30px 5px; /* default with tail for others */
    backdrop-filter: blur(10px);
  
}

.textchat.last { /* others last */
    border-radius: 30px 30px 30px 5px !important;
}

.my-message .textchat {
    background: #0165d7;
    color: #ffffff;

    border-radius: 30px 30px 5px 30px; /* default with tail for my messages */
  
}

.my-message .textchat.last {
    border-radius: 30px 30px 5px 30px !important;
}
.timestamp-container {
    font-size: 12px;
    color: #666666;
    margin: 4px 2px;
    
  
}
.my-timestamp {
    text-align: right;
}
.sender-nickname {
    font-size: 12px;
    color: #666;
    margin-bottom: 4px;
}

.input-capsule {
  display: flex;
  align-items: end;
  background:transparent; 
  --background:transparent; 
  /* border: 2px solid var(--ion-text-color); */
  color: var(--ion-text-color);
  border-radius: 24px;
  padding: 1px;
  /* margin: 2px 0;  */
  height: 46px;
  transition: all 0.2s ease-in-out;
  width: 100%;
     backdrop-filter: blur(10px);

}

.input-container {
  flex: 1; 
  width: 100%;
  display: flex;
  align-items: end;
  justify-content: space-between;
  border: 2px solid rgba(0, 0, 0, 0);
  border-radius: 24px;
  background:rgba(139, 139, 139, 0.201); 
  
}

textarea {
  flex-grow: 1; 
  color: var(--ion-text-color);
  font-size: 16px;
  /* line-height: 1.4; */
  outline: none;
  height: auto;
  max-height: 120px;
  overflow-y: auto;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px ;
 
  border-radius: 24px;
  
}
.load-more-container {
  display: flex;
  justify-content: center;
  padding: 10px 0;
  position: absolute;
  top: 10px;
  width: 100%;
  z-index: 10;
}
/* ——— global black toolbar ——— */
/* ion-header ion-toolbar {
  --background: var(--ion-background-color);
  --color: var(--ion-text-color);
} */

/* ion-header ion-button,
ion-header ion-icon {
  --color: var(--ion-text-color);
} */

/* Page background / scroller */
/* .message-container,
.scroller {
  background: var(--ion-background-color);
} */

.chat-content {
  transition: padding-bottom 0.3s ease-out; /* Smooth transition for padding */
}

/* timestamp & alias – subtle gray */
.timestamp-container {
  color: #666666;
}


/* Consolidate input-toolbar related styles here to ensure no duplicates */
.input-toolbar {
  background:transparent; 
  --background:transparent; 
  display: flex; /* Ensure flexbox for horizontal layout */
  align-items: flex-end; 
  padding: 0px 2px;

    /* backdrop-filter: blur(10px); */
}

.input-toolbar .reply-preview {
  flex-grow: 1; 
}

.input-toolbar .input-capsule {
  flex-grow: 1; 
  margin: 2px 0; 
}

.input-toolbar .send-button {
  flex-shrink: 0; 
 
}

/* Send button specific styles */
.send-button {
    --padding-start: 9px;
    --padding-end: 9px;
    --background: rgb(38, 38, 38);
    --color: #6e6e6e;
  --border-radius: 50%;
  width: 35px; /* Make it a circle */
  height: 35px;
  min-width: 35px;
  min-height: 35px;

  margin:2px;
  
}
.drawer-toggle {
  
    --padding-start: 5px;
    --padding-end: 5px;
    --background: rgb(38, 38, 38);
    --color: #6e6e6e;
  --border-radius: 50%;
  width: 35px; /* Make it a circle */
  height: 35px;
  min-width: 35px;
  min-height: 35px;

 
  margin:2px;
  
}


/* Button transition animations (copied and adapted from AiChatSimple.vue) */
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

/* =================== 新增：消息模板相关样式 =================== */
.mode-selection1 {
  border-radius: 30px;
  display: flex;
  justify-content: start;
  transform: translateX(0);
  transition: transform 0.3s ease-in-out;
  z-index: 9999;
}

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

.meta-content {
  flex: 1;
  word-break: break-word;
  font-size: 13px;
}

.meta-icon {
  font-size: 20px;
}

.think-reply-user1 {
  font-weight: bold;
  font-size: 13px;
}

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

.slide-enter-active, .slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from, .slide-leave-to {
  transform: translateX(100%);
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

/* =================== 新增：消息内容渲染样式 =================== */
.meta-text-container{
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  
}
.meta-text-container.my-message{

  align-items: flex-end;
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
  margin-bottom: 8px;
}

.think-block {
  position: relative;
  align-self: start;
  padding: 7px 15px;
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
  max-width: 100%;
  min-width: 50px;
  overflow: visible;
  margin-top: 10px;
  margin-bottom: -10px;
  /* margin-left: 10px; */
 
}

.think-reply-user {
  font-weight: bold;
  font-size: 7px;
  position: absolute;
  top: -10px;
}

/* =================== 新增：输入模式样式 =================== */
/* .text-input.about textarea {
  background: rgb(1, 255, 238);
  box-shadow: 0 2px 8px rgb(1, 255, 238);
  color: black;
}

.text-input.think textarea {
  background: rgb(0, 0, 0);
  box-shadow: 0 2px 8px rgb(0, 0, 0);
  color: #fff;
  
} */

.confirm-button {
  position: absolute;
  right: 0;
}

/* =================== 新增：emoji消息样式 =================== */
.emoji-message-big {
  font-size: 3.2rem;
  background: transparent !important;
  box-shadow: none;
  border-radius: 0;
  padding: 0 6px;
  line-height: 1.1;
  display: inline-block;
}

/* =================== 新增：URL链接样式 =================== */
.url-link {
  color: #006dcd;
  /* background-color: rgb(0, 247, 255); */
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

/* =================== 新增：引用回复预览样式 =================== */
.reply-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  border-radius: 30px;
  font-size: 14px;
  background: var(--ion-background-color);
  margin-bottom: 10px;
}

.preview-content {
  flex: 1;
  word-break: break-word;
  font-size: 13px;
}

.preview-content strong {
  font-size: 13px;
  color: var(--ion-text-color);
  font-weight: bold;
}

.ellipsis {
  font-size: 13px;
  color: var(--ion-text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

/* =================== 新增：消息模板卡片样式 =================== */
.about-card {
  background: rgba(255, 255, 255, 0.165);
  color: #acacac;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.think-card {
  background: rgba(255, 255, 255, 0.165);
  color: #acacac;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.think-reply-user1 {
  font-weight: bold;
  font-size: 13px;
  color: var(--ion-color-primary);
}

/* =================== 新增：数字消息样式 =================== */
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

@keyframes numberPop {
  0% { transform: scale(0.8); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

/* =================== 新增：媒体元素样式 =================== */
.media-element {
  width: 100%;
  height: 180px;
  padding: 0;
  margin: 0;
  border-radius: 13px 13px 13px 5px !important;
  object-fit: cover;
  object-position: center;
  min-height: 50px; /* Added min-height */
}

.my-message .media-element {
  border-radius: 13px 13px 5px 13px !important;
}

/* =================== 新增：全圆角样式 =================== */
.message-bubble.full-radius {
  border-radius: 30px !important;
  transition: border-radius 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.textchat.full-radius {
  border-radius: 30px !important;
  transition: border-radius 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.native-selectable { user-select: text; -webkit-user-select: text; cursor: text; }
/* =================== 新增：Markdown内容样式 =================== */
.markdown-content {
  word-break: break-word;
  overflow-wrap: break-word;
  line-height: 1.3;
  font-size: 13px;
  max-width: 100%;
  overflow-x: auto;
  white-space: pre-wrap;
  
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

.markdown-content :deep(li) { margin: 4px 0; }

.markdown-content :deep(a) {
  color: #006dcd;
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

/* =================== 新增：全屏消息预览样式 =================== */
.center-message-bubble .about-block {
  margin: 10px auto;
  transform: scale(1.2);
  min-width: 120px;
  max-width: 240px;
  height: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 30px 30px 30px 5px !important;
}

.center-message-bubble.my-message .about-block {
  border-radius: 30px 30px 5px 30px !important;
}

.center-message-bubble .think-block {
  margin: 10px auto;
  transform: scale(1.2);
  min-width: 120px;
  max-width: 240px;
  height: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 30px 30px 30px 5px !important;
  
}

.center-message-bubble.my-message .think-block {
  border-radius: 30px 30px 5px 30px !important;
}

.center-message-bubble .emoji-message-big {
  font-size: 4rem;
  margin: 10px auto;
  text-align: center;
}

.center-message-bubble .number-message {
  font-size: 4rem;
  margin: 10px auto;
  text-align: center;
}

.center-message-bubble .media-element {
  max-width: 300px;
  max-height: 300px;
  margin: 10px auto;
  display: block;
}

/* =================== 新增：全屏消息预览基础样式 =================== */
.blur-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1998;
  backdrop-filter: blur(12px);
  background: rgba(0,0,0,0.25);
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

.center-action-bar ion-button { 
  --padding-start:12px; 
  --padding-end:12px; 
}
.image-container { width: 180px; height: 180px; overflow: hidden; position: relative; object-fit: cover; object-position: center; }
.video-container { width: 230px; height: 180px; overflow: hidden; position: relative; object-fit: cover; padding: 0; margin: 0; object-position: center; }
.video-placeholder {
  width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
  background: #171717; cursor: pointer; position: relative;
}
.thumbnail { width: 100%; height: 100%; object-fit: cover; }
.play-icon { font-size: 48px; color: #666; position: absolute; z-index: 1; }

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

.pending-status {
  color: #00ffbb;
  font-style: italic;
  margin: 0 2px;
}

.sent-confirmation {
  display: inline-flex;
  align-items: center;
  margin: 0 2px;
  animation: sentSuccess 1.5s ease-in-out;
}

/* =================== 语音消息样式 =================== */
.voice-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  min-width: 120px;
  max-width: 250px;
}

.voice-play-button {
  --padding-start: 8px;
  --padding-end: 8px;
  --padding-top: 8px;
  --padding-bottom: 8px;
  margin: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
}

.voice-icon {
  font-size: 18px;
}

.voice-waveform {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 24px;
}

.voice-bars {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 100%;
}

.voice-bar {
  width: 3px;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 2px;
  transition: all 0.3s ease;
}

.voice-bar:nth-child(1) { height: 8px; }
.voice-bar:nth-child(2) { height: 12px; }
.voice-bar:nth-child(3) { height: 16px; }
.voice-bar:nth-child(4) { height: 20px; }
.voice-bar:nth-child(5) { height: 24px; }
.voice-bar:nth-child(6) { height: 20px; }
.voice-bar:nth-child(7) { height: 16px; }
.voice-bar:nth-child(8) { height: 12px; }
.voice-bar:nth-child(9) { height: 8px; }
.voice-bar:nth-child(10) { height: 12px; }
.voice-bar:nth-child(11) { height: 16px; }
.voice-bar:nth-child(12) { height: 10px; }

.voice-bar.active {
  background: rgba(255, 255, 255, 0.8);
  animation: voiceWave 1.5s ease-in-out infinite;
}

.voice-duration {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  min-width: 32px;
  text-align: right;
}

/* 其他消息的语音条样式 */
.other-voice .voice-bar {
  background: rgba(0, 0, 0, 0.3);
}

.other-voice .voice-bar.active {
  background: rgba(0, 0, 0, 0.6);
}

.other-voice .voice-duration {
  color: rgba(0, 0, 0, 0.6);
}

@keyframes voiceWave {
  0%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(1.5); }
}

/* 录音按钮样式 */
.voice-record-button {
  --background: #ff4757;
  --background-activated: #ff3742;
  --color: white;
  margin: 0;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.voice-record-button.recording {
  --background: #ff6b7a;
  animation: recordingPulse 1s ease-in-out infinite;
}

@keyframes recordingPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.checkmark-icon {
  font-size: 16px;
  color: #00d4aa;
  animation: checkmarkPop 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

/* =================== 语音输入区域样式 =================== */
.voice-input {
  width: 100%; 
  height: 39px; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  gap: 8px;
  border-radius: 20px; 
  background: #0165d7; 
  font-size: 16px; 
  font-weight: 500;
  cursor: pointer; 
  user-select: none; 
  touch-action: manipulation; 
  transition: all 0.3s ease-in-out; 
  overflow: visible;
}

.voice-input.recording {
  border-radius: 30px; 
  /* position: absolute;  */
  width: 100%; 
  height: 39px; 
  background: linear-gradient(-45deg, #00ffaa, #ff9999, #fff, #00cd89);
  background-size: 200% 200%;
  animation: gradientBreath 6s ease infinite;
  z-index: 9999; 
  transition: all 0.3s ease-in-out; 
  overflow: visible;
  /* transform: translateY(-20px); */
}

.voice-input.cancel-recording {
  border-radius: 30px; 
  background: #ff4d4d; 
  transform: translateY(-20px);
  transition: all 0.3s ease-in-out; 
  overflow: visible;
    height: 39px; 
}

.voice-input span { 
  font-size: 14px; 
}

@keyframes gradientBreath {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.action-button {
  --padding-start: 5px;
  --padding-end: 5px;
  --background: rgb(38, 38, 38);
  --color: #6e6e6e;
  --border-radius: 50%;
  width: 35px;
  height: 35px;
  min-width: 35px;
  min-height: 35px;
  margin: 2px;
}

.send-button {
  --padding-start: 9px;
  --padding-end: 9px;
  --background: rgb(38, 38, 38);
  --color: #6e6e6e;
  --border-radius: 50%;
  width: 35px;
  height: 35px;
  min-width: 35px;
  min-height: 35px;
  margin: 2px;
}

.text-input {
  flex: 1;
  display: flex;
  align-items: center;
}

.text-input textarea {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  resize: none;
  font-family: inherit;
  font-size: 16px;
  line-height: 1.4;
  padding: 8px 12px;
}
</style>