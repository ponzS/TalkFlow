<template>
  <ion-page>
    <!-- 顶部工具栏 -->
    <ion-header :translucent="true" collapse="fade" class="ion-no-border toolbar1">
      <ion-toolbar class="toolbar1">
        <ion-buttons slot="start">
          <div color="dark" @click="closeWindow">
            <ion-icon style="font-size:25px;margin-left:10px;" color="dark" :ios="chevronBackOutline" :md="chevronBackOutline"></ion-icon>
          </div>
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
          <ion-button @click="gotoMembers">
            <ion-icon color="dark" :icon="peopleOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

      <ion-item>
        <ion-label>Encrypt</ion-label>
        <ion-checkbox v-model="encryptMessages"></ion-checkbox>
      </ion-item>
      <ion-item>
        <ion-label>Decrypt</ion-label>
        <ion-checkbox v-model="decryptMessages"></ion-checkbox>
      </ion-item>
    </ion-header>

    <ion-content :fullscreen="true" :scroll-y="false" :style="{ '--content-bottom': keyboardHeight + 'px' }">
      <!-- 渐变遮罩 -->
      <div class="gradient-mask"></div>

      <!-- 消息列表 -->
      <div
        class="message-container"
        @touchstart="handleLongPress($event)"
        @touchend="clearLongPress"
        @touchmove="clearLongPress"
      >
        <DynamicScroller
          class="scroller"
          :items="currentMessages"
          :buffer="2000"
          :min-item-size="50"
          key-field="id"
          v-slot="{ item, index, active }"
          ref="scrollerRef"
          @scroll.passive="onScrollerScroll"
        >
          <DynamicScrollerItem
            :item="item"
            :active="active"
            :data-index="index"
            :size-dependencies="[item.text, item.timestamp, currentMessages.length]"
          >
            <div
              :class="['chat-container', item.sender === safeUserAlias ? 'my-message' : 'other-message']"
              style="padding-bottom: 5px;"
            >
              <div class="message-wrapper">
                <template v-if="item.sender !== safeUserAlias">
                  <img
                    v-if="isLastInSequence(index)"
                    class="message-avatar"
                    :src="getGunAvatar(item.senderPub || 'unknown')"
                    alt=""
                  />
                </template>
                <div
                  :class="['message-bubble', selectedMessage === item.id ? 'selected-message' : '']"
                  @click.stop="handleMessageClick(item, $event)"
                  :data-msgid="item.id"
                >
                  <template v-if="isBase64Image(item.text)">
                    <div class="image-container">
                      <img :src="item.text" class="media-element" alt="" />
                    </div>
                  </template>
                  <template v-else>
                    <div class="meta-text-container">
                      <!-- about -->
                      <div
                        v-for="(seg, i) in parseMetaSegments(item.text).filter(s => s.type === 'about')"
                        :key="'about'+i"x
                        class="about-block native-selectable"
                        :class="item.sender === safeUserAlias ? 'about-own' : 'about-other'"
                      >
                        <ion-icon :icon="attachOutline" class="meta-icon" />
                        <span>{{ seg.content }}</span>
                      </div>
                      <!-- think -->
                      <div
                        v-for="(seg, i) in parseMetaSegments(item.text).filter(s => s.type === 'think')"
                        :key="'think'+i"
                        class="think-block native-selectable"
                        :class="item.sender === safeUserAlias ? 'think-own' : 'think-other'"
                      >
                        <ion-icon :icon="chatbubbleEllipsesOutline" class="meta-icon" />
                        {{ seg.content }}
                      </div>
                      <!-- normal -->
                      <p class="text-message-content native-selectable">
                        <template v-for="(seg, k) in parseMetaSegments(item.text).filter(s => s.type === 'normal')" :key="k">
                          <span>{{ seg.content }}</span>
                        </template>
                      </p>
                    </div>
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
              </div>
            </div>
          </DynamicScrollerItem>
        </DynamicScroller>
      </div>

      <!-- 上下文菜单 -->
      <div
        v-if="contextMenu.visible"
        class="context-menu"
        :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
      >
        <ion-button fill="clear" class="context-button" @click="onSelectQuote(contextMenu.item)">
          <ion-icon :icon="attachOutline"></ion-icon>
        </ion-button>
        <ion-button fill="clear" class="context-button" @click="onSelectThink(contextMenu.item)">
          <ion-icon :icon="chatbubbleEllipsesOutline"></ion-icon>
        </ion-button>
      </div>
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
          <ion-icon
            :icon="meta.type === 'about' ? attachOutline : chatbubbleEllipsesOutline"
            class="meta-icon"
          />
          <span class="meta-content">{{ meta.content }}</span>
          <ion-button fill="clear" size="small" @click="removeMeta(index)">
            <ion-icon :icon="closeOutline" color="medium"></ion-icon>
          </ion-button>
        </div>
      </div>

      <ion-toolbar class="input-toolbar" :style="{ transform: `translateY(-${keyboardHeight}px)` }">
        <div :class="!showtools ? 'mode-selection' : 'mode-selection1'">
          <ion-button fill="clear" @click="triggerFileUpload">
            <ion-icon color="dark" class="meta-icon" :icon="imageOutline"></ion-icon>
          </ion-button>
          <ion-button
            fill="clear"
            @click.prevent.stop="setMode('about')"
            :color="inputMode === 'about' ? 'primary' : 'medium'"
          >
            <ion-icon :icon="attachOutline" class="meta-icon" />
          </ion-button>
          <ion-button
            fill="clear"
            @click.prevent.stop="setMode('think')"
            :color="inputMode === 'think' ? 'primary' : 'medium'"
          >
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
            accept="image/*"
            style="display: none"
          />
          <div class="input-container">
            <div class="text-input" :class="inputMode">
              <textarea
                v-model="newMessage"
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
          </div>
          <ion-button class="action-button" fill="clear" @click="handleActionButtonClick">
            <ion-icon slot="icon-only" color="dark" :icon="returnDownBackOutline" key="send"></ion-icon>
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
  IonItem,
  IonLabel,
  IonButton,
  IonCheckbox,
  IonButtons,
  IonIcon,
  type IonContent as IonContentType,
} from '@ionic/vue';
import { useGroupChat } from '@/composables/useGroupChat';
import { useRouter } from 'vue-router';
import { computed, ref, onMounted, onUnmounted, nextTick } from 'vue';
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import { mountClass, gunAvatar } from 'gun-avatar';
import { useTheme } from '@/composables/useTheme';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import {
  chevronBackOutline,
  peopleOutline,
  attachOutline,
  chatbubbleEllipsesOutline,
  returnDownBackOutline,
  addCircleOutline,
  imageOutline,
  closeOutline,
  checkmarkOutline,
} from 'ionicons/icons';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';

mountClass();
const { isDark } = useTheme();
const router = useRouter();
const {
  messagesByGroup,
  newMessage,
  encryptMessages,
  decryptMessages,
  currentGroup,
  currentGroupName,
  getCurrentGroup,
  safeUserAlias,
  sendMessage,
  membersByGroup,
  sendImage,
  loadGroupMessages1
} = useGroupChat();

// 搜索相关
const showtools = ref(false);
const isDrawerOpen = ref(false);

// 加载相关
const isLoadingMessages = ref(true);
const isLoadingOlderMessages = ref(false);
const hasMoreMessages = ref(true);

// 滑动相关
const contentRef = ref<InstanceType<typeof IonContentType> | null>(null);

// 键盘相关
const keyboardHeight = ref(0);
const inputFocused = ref(false);

// 输入相关
const textInputRef = ref<HTMLTextAreaElement | null>(null);
const capsuleRef = ref<HTMLDivElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

// 滚动相关
const scrollerRef = ref<any>(null);
const scrollerEl = ref<HTMLElement | null>(null);
const isInitialLoad = ref(true);
let lastScrollTop = 0;

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

// 输入模式相关
interface Meta {
  type: 'about' | 'think';
  content: string;
}
const typedMeta = ref<Meta[]>([]);
const inputMode = ref<'default' | 'about' | 'think'>('default');

// 当前消息列表
const currentMessages = computed(() => {
  return currentGroup.value ? messagesByGroup.value[currentGroup.value] || [] : [];
});

// 群成员列表，最多显示8个
const displayedMembers = computed(() => {
  const members = currentGroup.value ? membersByGroup.value[currentGroup.value] || [] : [];
  return members.slice(0, 8);
});

// 页面加载
onMounted(async () => {
  scrollerEl.value = scrollerRef.value.$el;
  setTimeout(async () => {
    isLoadingMessages.value = false;
    scrollToBottomInitial();
    await scrollToBottom();
  }, 500);

  try {
    Keyboard.setResizeMode({ mode: KeyboardResize.None });
    Keyboard.addListener('keyboardWillShow', async (info) => {
      keyboardHeight.value = info.keyboardHeight;
      inputFocused.value = true;
      nextTick(() => scrollToBottom());
      setTimeout(() => scrollToBottom(), 500);
    });
    Keyboard.addListener('keyboardWillHide', () => {
      keyboardHeight.value = 0;
      inputFocused.value = false;
      nextTick(async () => {
        if (scrollerRef.value) {
          scrollerRef.value.reset();
          setTimeout(() => scrollToBottom(), 300);
        }
        if (capsuleRef.value) capsuleRef.value.style.transform = 'none';
        await scrollToBottom();
      });
    });
  } catch (err) {
    console.error('Keyboard setup failed:', err);
  }

  document.addEventListener('click', handleGlobalClick);

  if (currentMessages.value.length > 0) {
    scrollToBottomInitial();
    setTimeout(() => scrollToBottom(), 500);
  }
});

onUnmounted(() => {
  document.removeEventListener('click', handleGlobalClick);
  Keyboard.removeAllListeners();
});

// 工具函数
import { useDateFormatter } from '@/composables/useDateFormatter'
const { formatLastTime } = useDateFormatter()

function isLastInSequence(index: number) {
  const currentMessage = currentMessages.value[index];
  const nextMessage = currentMessages.value[index + 1];
  return !nextMessage || nextMessage.sender !== currentMessage.sender;
}

// 获取群聊头像
const getGunAvatar = (pub: string) => {
  return gunAvatar({
    pub: pub,
    round: false,
    size: 200,
    dark: isDark.value,
    svg: true,
  });
};

// 解析 about 和 think 标签
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

// 上下文菜单交互
let longPressTimer: number | NodeJS.Timeout | null = null;
const LONG_PRESS_DELAY = 400;

function handleLongPress(event: TouchEvent) {
  clearLongPress();
  const touch = event.touches[0];
  const node = document.elementFromPoint(touch.clientX, touch.clientY);
  if (!node?.closest('.message-bubble')) return;
  longPressTimer = window.setTimeout(() => {
    const messageBubble = node.closest('.message-bubble') as HTMLElement;
    const itemId = messageBubble?.dataset?.msgid || '';
    const item = currentMessages.value.find((msg) => msg.id === itemId);
    if (item) {
      const rect = messageBubble.getBoundingClientRect();
      showContextMenu(item, { clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
    }
  }, LONG_PRESS_DELAY);
}

function showContextMenu(item: any, event: MouseEvent) {
  contextMenu.value = {
    visible: true,
    x: event.clientX + 20,
    y: event.clientY - 50,
    content: item.text || '',
    item,
    scaleAnimation: true,
  };
  selectedMessage.value = item.id || null;
}

function onSelectQuote(item: any | null) {
  if (item && item.text && !typedMeta.value.some((m) => m.content === item.text)) {
    typedMeta.value.push({ type: 'about', content: item.text });
    inputMode.value = 'about';
    if (textInputRef.value) {
      textInputRef.value.focus();
    }
  }
  hideContextMenu();
}

function onSelectThink(item: any | null) {
  if (item && item.text && !typedMeta.value.some((m) => m.content === item.text)) {
    typedMeta.value.push({ type: 'think', content: item.text });
    inputMode.value = 'think';
    if (textInputRef.value) {
      textInputRef.value.focus();
    }
  }
  hideContextMenu();
}

function hideContextMenu() {
  contextMenu.value.visible = false;
  setTimeout(() => (selectedMessage.value = null), 200);
}

function handleMessageClick(item: any, event: MouseEvent) {
  if (!isBase64Image(item.text)) {
    showContextMenu(item, event);
  }
}

function handleGlobalClick(event: MouseEvent) {
  const menu = document.querySelector('.context-menu');
  if (contextMenu.value.visible && menu && !menu.contains(event.target as Node)) {
    hideContextMenu();
  }
}

function clearLongPress() {
  if (longPressTimer !== null) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
}

// 输入模式交互
function setMode(mode: 'default' | 'about' | 'think') {
  if (inputMode.value === mode) return;
  if (
    inputMode.value !== 'default' &&
    newMessage.value.trim() &&
    !typedMeta.value.some((m) => m.content === newMessage.value.trim())
  ) {
    typedMeta.value.push({ type: inputMode.value as 'about' | 'think', content: newMessage.value.trim() });
    newMessage.value = '';
  }
  inputMode.value = mode;
  if (textInputRef.value) {
    nextTick(() => textInputRef.value!.focus());
  }
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

function handleActionButtonClick() {
  if (newMessage.value) {
    newMessage.value += '\n';
    nextTick(() => {
      if (textInputRef.value) {
        textInputRef.value.focus();
        adjustHeight();
      }
    });
  }
}

function toolsopen() {
  showtools.value = !showtools.value;
  isDrawerOpen.value = showtools.value;
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

async function handleFileUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files || !currentGroup.value) return;
  const files = Array.from(input.files);
  if (files.length === 0) return;
  for (const file of files) {
    try {
      if (file.type.startsWith('image/')) {
        const compressedBase64 = await compressImage(file, 800, 0.7);
        newMessage.value = compressedBase64;
        await sendImage(newMessage.value);
      }
    } catch (err: any) {
      console.error('File upload failed:', err);
    }
  }
  nextTick(() => scrollToBottom());
  input.value = '';
}

function isBase64Image(text: string | undefined): boolean {
  if (!text || typeof text !== 'string') return false;
  return /^data:image\/[\w+.-]+;base64,/.test(text);
}

function handleEnterKey(event: KeyboardEvent) {
  event.preventDefault();
  scrollToBottom();
  let full = '';
  typedMeta.value.forEach((m) => {
    full += `<${m.type}>${m.content}</${m.type}>\n`;
  });
  const trimmedMessage = String(newMessage.value).trim();
  if (trimmedMessage) {
    full += trimmedMessage;
  }
  sendMessage(full);
  newMessage.value = '';
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

// 滚动相关函数
function scrollToBottom() {
  if (scrollerEl.value) {
    scrollerEl.value.scrollTo({ top: scrollerEl.value.scrollHeight, behavior: 'smooth' });
  }
}

function scrollToBottomInitial() {
  if (!scrollerRef.value || !currentMessages.value.length) return;
  nextTick(() => {
    const lastIndex = currentMessages.value.length - 1;
    scrollerRef.value.scrollToItem(lastIndex, 'end');
    isInitialLoad.value = false;
    const scroller = scrollerRef.value.$el;
    setTimeout(() => {
      const isAtBottom = scroller.scrollHeight - (scroller.scrollTop + scroller.clientHeight) < 10;
      if (!isAtBottom) {
        scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'auto' });
      }
    }, 300);
  });
}

// 防抖函数
function debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

async function loadOlderMessages() {
  if (!currentGroup.value || isLoadingOlderMessages.value || !hasMoreMessages.value) return;
  isLoadingOlderMessages.value = true;

  await loadGroupMessages1(currentGroup.value, true, 10);

  // Check if fewer than 10 messages were loaded to determine if more exist
  if (currentMessages.value.length < 10) {
    hasMoreMessages.value = false;
  }

  setTimeout(() => {
    isLoadingOlderMessages.value = false;
  }, 500); // Simulate network delay
}

// 防抖加载历史消息
const debouncedLoadOlderMessages = debounce(loadOlderMessages, 500);

function onScrollerScroll(event: Event) {
  const target = event.target as HTMLElement;
  lastScrollTop = target.scrollTop;

  // 检测是否接近顶部以加载更多消息
  if (target.scrollTop < 20 && !isLoadingOlderMessages.value && hasMoreMessages.value) {
    debouncedLoadOlderMessages();
  }
}

watch(
  () => currentMessages.value,
  (newMessages, oldMessages) => {
    if (newMessages.length > oldMessages.length && !isLoadingOlderMessages.value) {
      nextTick(() => scrollToBottom());
    }
  },
  { deep: true }
);
</script>

<style scoped>
.gradient-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 20vh;
  background: linear-gradient(to bottom, var(--ion-background-color) 60%, rgba(0, 0, 0, 0) 100%);
  pointer-events: none;
  overflow: visible;
  z-index: 1;
}

ion-content {
  --content-bottom: 0px;
  transition: all 0.2s ease;
}

.toolbar1 {
  transition: all 0.2s ease;
  width: 100vw;
  overflow: visible;
}

.input-toolbar {
  transition: all 0.2s ease;
  position: relative;
  bottom: 0;
  width: 100vw;
  --background: transparent;
  overflow: visible;
  --background: linear-gradient(to top, var(--ion-background-color) 60%, rgba(0, 0, 0, 0) 100%);
}

.message-container {
  height: 100vh;
}

.scroller {
  height: calc(100% - var(--content-bottom));
  overflow-y: auto;
  margin-top: -200px;
  padding-top: 220px;
  padding-bottom: 180px;
}

.chat-name {
  font-size: 23px;
}

.message-bubble {
  padding: 8px 15px;
  font-size: 14px;
  text-align: left;
  border-radius: 20px 20px 20px 5px !important;
  min-height: 39px;
  max-width: 75%;
  background: var(--ion-color-dark-contrast);
  color: var(--ion-color-dark-tint);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  transition: background 0.2s ease, transform 0.2s ease;
  transform-origin: center;
}

.message-bubble:has(.image-container) {
  padding: 0;
}

.my-message .message-bubble {
  color: #fff;
  background: #01b872;
  border-radius: 20px 20px 5px 20px !important;
}

.selected-message {
  box-shadow: 0 0 10px rgba(82, 238, 209, 0.7), 0 0 20px rgba(35, 213, 171, 0.5);
  background: #000 !important;
  color: #fff;
  transform: scale(1.05);
}

.message-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  margin: 8px 0;
  position: relative;
}

.chat-container.my-message .message-wrapper {
  justify-content: flex-end;
}

.message-avatar {
  width: 42px;
  height: 42px;
  border-radius: 0 50% 50% 0;
  object-fit: cover;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.my-message .message-avatar {
  border-radius: 50% 0 0 50%;
}

.image-container {
  width: 180px;
  height: 180px;
  overflow: hidden;
  position: relative;
  object-fit: cover;
  object-position: center;
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

.meta-text-container {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.about-block {
  position: relative;
  align-self: start;
  padding: 10px;
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

.about-own {
  right: 23px;
  top: -12px;
  left: auto;
  transform: none;
}

.about-other {
  left: 23px;
  top: -12px;
  right: auto;
  transform: none;
}

.think-block {
  position: relative;
  align-self: start;
  padding: 10px;
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
}

.think-own {
  right: 23px;
  top: -12px;
  left: auto;
  transform: none;
}

.think-other {
  left: 23px;
  top: -12px;
  right: auto;
  transform: none;
}

.meta-icon {
  font-size: 20px;
  margin-right: 5px;
}

.timestamp-container {
  font-size: 8px;
  color: #bbb;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
}

.my-timestamp {
  justify-content: flex-end;
}

.other-timestamp {
  justify-content: flex-start;
}

.sender-nickname {
  font-size: 10px;
  color: #888;
  margin-right: 5px;
  font-weight: 500;
}

.timestamp {
  font-size: 9px;
  color: #999;
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

.mode-selection {
  display: flex;
  justify-content: start;
  transform: translateX(-200px);
  transition: transform 0.3s ease-in-out;
  z-index: 9999;
}

.mode-selection1 {
  display: flex;
  justify-content: start;
  transform: translateX(0);
  transition: transform 0.3s ease-in-out;
  z-index: 9999;
}

.mode-selection ion-button,
.mode-selection1 ion-button {
  transition: all 0.3s ease-in-out;
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

.avatar-container {
  display: flex;
  justify-content: center;
  margin-bottom: 8px;
}

.header-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  border: 2px solid  var(--ion-background-color);
}

.header-avatar:not(:first-child) {
  margin-left: -10px;
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