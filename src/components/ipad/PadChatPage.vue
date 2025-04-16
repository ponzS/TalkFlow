<template>

<ion-page v-if="!hasPadChat">
<ion-content :fullscreen="true" style="width:100%;height:100%;">
    <ponzsColor1></ponzsColor1>
</ion-content>

</ion-page>


    <ion-page v-if="hasPadChat">
      <ion-header :translucent="true" collapse="fade" class="ion-no-border" style="background: transparent;">
        <ion-toolbar>
          <ion-buttons slot="start">
            <ion-button color="dark" @click="closeWindow">

                <ion-icon :icon="contractOutline"></ion-icon>

            </ion-button>
          </ion-buttons>
          
          <ion-title><span class="chat-name">{{ getDisplayName(currentChatPub!) }}</span></ion-title>
          <ion-buttons slot="end">
            <ion-button @click="goToFriendProfile">
              <ion-icon color="dark" :ios="ellipsisHorizontal" :md="ellipsisVertical"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
  
      <ion-content :fullscreen="true" :scroll-y="false" :style="{ '--content-bottom': keyboardHeight + 'px' }">
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
              <!-- 我的消息：气泡在左，头像在右 -->
              <div class="skeleton-bubble" :style="{ width: `${80 + Math.random() * 120}px` }"></div>
              <div class="skeleton-avatar"></div>
            </template>
            <template v-else>
              <!-- 其他消息：头像在左，气泡在右 -->
              <div class="skeleton-avatar"></div>
              <div class="skeleton-bubble" :style="{ width: `${80 + Math.random() * 120}px` }"></div>
            </template>
          </div>
        </div>
  
        <div v-if="currentChatPub" class="message-container" @touchmove="hideContextMenu">
          <DynamicScroller
            class="scroller ion-content-scroll-host"
            :items="currentChatMessages"
            :min-item-size="39"
            key-field="msgId"
            v-slot="{ item, index, active }"
            ref="scrollerRef"
            @scroll="onScrollerScroll"
          >
            <DynamicScrollerItem
              :item="item"
              :active="active"
              :data-index="index"
              :size-dependencies="[item.text, item.audioUrl, item.status, item.isSending]"
            >
              <div v-if="isValidMessage(item)" :class="['chat-container', item.from === currentUserPub ? 'my-message' : 'other-message']" style="padding-bottom: 20px;">
                <div class="message-wrapper">
                  <div v-if="isSelectMode" class="message-checkbox">
                    <ion-checkbox :checked="selectedMessages.includes(item.msgId!)" @click="toggleMessageSelection(item)"></ion-checkbox>
                  </div>
                  <template v-if="item.from !== currentUserPub">
                    <img v-if="userAvatars[item.from]" class="message-avatar" :src="userAvatars[item.from]" @click="goToProfile(item.from)" alt=""/>
                    <img v-else class="message-avatar" :src="getGunAvatar(item.from)" alt="" @click="goToProfile(item.from)" />
                  </template>
                  <div :class="['message-bubble', 
                               item.type === 'voice' ? 'voice-bubble' : '',
                               item.status === 'failed' ? 'failed-message' : '',
                               item.status === 'pending' && item.isSending ? 'pending-message' : '',
                               selectedMessage === item.msgId ? 'selected-message' : '']"
                               @click.stop="handleMessageClick(item, $event)"
                               @touchstart="handleLongPress(item, $event)"
                               @touchend="clearLongPress()"
                               @touchmove="clearLongPress()">
                    <template v-if="item.type === 'text' && item.text">
                      <template v-if="isBase64Image(item.text)">
                        <div class="image-container">
                          <photo-provider :photo-closable="true">
                            <photo-consumer :src="item.text" :visible="false" :shouldTransition="false" :toggleOverlay="false" :intro="false">
                              <img v-lazy="item.text" class="media-element" alt="" />
                            </photo-consumer>
                          </photo-provider>
                        </div>
                      </template>
                      <template v-else-if="isBase64Video(item.text)">
                        <div class="video-container" :data-msgid="item.msgId">
                          <div v-if="!loadedVideos[item.msgId]" class="video-placeholder" @click.stop="loadAndPlayVideo(item)">
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
                            
                          ></video>
                        </div>
                      </template>
                      <p v-else style="white-space: pre-wrap" class="text-message-content native-selectable" @contextmenu.prevent="showDeleteOption(item, $event)">
                        <span v-for="(part, index) in extractUrls(item.text)" :key="index">
                          <a v-if="part.isUrl" @click.stop="openUrl(part.text)" class="url-link">{{ part.text }}</a>
                          <span v-else>{{ part.text }}</span>
                        </span>
                      </p>
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
                        <ion-icon :icon="voiceBar.playingAudio.value === item.msgId ? pauseOutline : playOutline" class="play-icon" size="small"
                          :disabled="item.status === 'pending' || item.status === 'failed' || isSelectMode"></ion-icon>
                        <span class="duration">{{ voiceBar.formatDuration((item.duration || 0) / 1000) }}</span>
                      </div>
                      <p v-else class="error-text">Loading failed-voice</p>
                      <p v-if="voiceBar.transcriptions.value[item.msgId!]" class="transcription">{{ voiceBar.transcriptions.value[item.msgId!] }}</p>
                    </template>
                  </div>
                  <template v-if="item.from === currentUserPub">
                    <img v-if="userAvatars[item.from]" class="message-avatar" :src="userAvatars[item.from]" />
                    <img v-else class="message-avatar" :src="getGunAvatar(item.from)" alt="Avatar" />
                  </template>
                </div>
                <div :class="['timestamp-container', item.from === currentUserPub ? 'my-timestamp' : 'other-timestamp']">
                  {{ formatTimestamp(item.timestamp) }}
                  <ion-button v-if="item.status === 'failed' && item.from === currentUserPub" size="small" fill="clear" @click="resendMessage(currentChatPub, item)">
                    <ion-icon color="dark" slot="icon-only" :icon="refreshOutline"></ion-icon>
                  </ion-button>
                  <span v-else-if="item.status === 'pending' && item.isSending && item.from === currentUserPub" class="pending-status">{{$t('sending')}}...</span>
                </div>
              </div>
            </DynamicScrollerItem>
          </DynamicScroller>
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
      <ion-footer :translucent="true" class="ion-no-border" collapse="fade" style="background: transparent;">
        <ion-toolbar class="input-toolbar" :style="{ transform: `translateY(-${keyboardHeight}px)` }">
          <div class="input-capsule" ref="capsuleRef" :class="{ 'shift-up': isDrawerOpen }">
            <ion-button class="drawer-toggle" fill="clear" @click="triggerFileUpload">
              <ion-icon color="dark" slot="icon-only" :icon="ellipsisHorizontalCircleOutline"></ion-icon>
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
              <div v-if="!isVoiceMode" class="text-input">
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
              </div>
              <div v-else class="voice-input" :class="{ recording: voiceBar.isRecording.value, 'cancel-recording': cancelRecording }"
                @touchstart="startVoiceRecording" @touchmove="handleVoiceMove" @touchend="stopVoiceRecording" @touchcancel="cancelVoiceRecording">
                <span v-if="voiceBar.isRecording.value">{{ cancelRecording ? 'Cancel the sliding' : 'Cancel the sliding' }}</span>
              </div>
            </div>
            <ion-button class="action-button" fill="clear" @click="handleActionButtonClick">
              <ion-icon color="dark" v-if="!newMsg && !isVoiceMode" :icon="micOutline" key="voice"></ion-icon>
              <ion-icon color="dark" v-else-if="newMsg && !isVoiceMode" :icon="returnDownBackOutline" key="send"></ion-icon>
              <ion-icon color="dark" v-else-if="isVoiceMode" :icon="chatboxOutline" key="keyboard"></ion-icon>
            </ion-button>
          </div>
        </ion-toolbar>
      </ion-footer>
    </ion-page>
  </template>
  
  <script setup lang="ts">
  import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
  import { useRouter } from 'vue-router';
  import { debounce } from 'lodash';
  import { getTalkFlowCore, LocalChatMessage, MessageType } from '@/composables/TalkFlowCore';
  import { useVoiceBar } from '@/composables/useVoiceBar';
  import { IonBackButton, IonButton, IonButtons, IonIcon, IonTitle, IonToolbar, IonHeader, IonFooter, IonPage, IonCheckbox, IonProgressBar } from '@ionic/vue';
  import {
    ellipsisHorizontal,
    ellipsisVertical,
    playOutline,
    pauseOutline,
    refreshOutline,
    ellipsisHorizontalCircleOutline,
    micOutline,
    chatboxOutline,
    copyOutline,
    trashOutline,
    returnDownBackOutline,
    closeCircleOutline,
    lockClosedOutline,
    contractOutline
  } from 'ionicons/icons';
  import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
  import { mountClass, gunAvatar } from "gun-avatar";
  import { Browser } from '@capacitor/browser';
  
  const chatFlow = getTalkFlowCore();
  const voiceBar = useVoiceBar();
  const {
    closeChat,
    currentChatPub,
    getAliasRealtime,
    newMsg,
    sendChat,
    resendMessage,
    chatMessages,
    userAvatars,
    formatTimestamp,
    currentUserPub,
    loadMoreChatHistory,
    isLoadingHistory,
    generateChatId,
    showToast,
    retractMessage,
    triggerLightHaptic,
    hasPadChat
  } = chatFlow;
  const { isRecording, recordingDuration, playingAudio, transcriptions, startRecording, stopRecording, sendVoiceMessage, playVoice, stopVoice, transcribeAudio, formatDuration } = voiceBar;
  mountClass();
  import { useTheme } from '@/composables/useTheme';
  const { isDark } = useTheme();
  
  const uploadProgress = ref(0);
  const videoThumbnails = ref<{ [msgId: string]: string }>({}); 
  const loadedVideos = ref<{ [msgId: string]: boolean }>({}); 
  const videoRefs = ref<{ [msgId: string]: HTMLVideoElement }>({}); 
  const isLoadingMessages = ref(true); // 控制骨架屏显示
  
  const getGunAvatar = (pub: string) => {
    return gunAvatar({
      pub: pub,
      round: false,
      size: 200,
      dark: isDark.value
    });
  };
  const { setSelectedFriendPub } = getTalkFlowCore();
  
  const goToProfile = (userPub: string) => {
    if (userPub === currentUserPub.value) {
      router.push('/MyMoments');
    } else {
      setSelectedFriendPub(userPub);
      router.push('/FriendMoments');
    }
  };
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
  
  const isSelectMode = ref(false);
  const selectedMessages = ref<string[]>([]);
  
  let longPressTimer: number | NodeJS.Timeout | null = null;
  let longPressItem: LocalChatMessage | null = null;
  let menuStabilityInterval: number | NodeJS.Timeout | null = null;
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
    } else if (item.type === 'text' && !isBase64Video(item.text)) {
      showNativeMenu(item, event);
    }
  }
  
  function handleLongPress(item: LocalChatMessage, event: TouchEvent) {
    longPressItem = item;
    longPressTimer = setTimeout(() => {
      startSelectionMode(item);
      triggerLightHaptic();
    }, LONG_PRESS_DELAY);
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
        const textMsgCount = selectedMessages.value
          .map(msgId => findMessageById(msgId))
          .filter(msg => msg && msg.type === 'text').length;
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
    if (isSelectMode.value && !isInSelectionBar && !isCheckbox && !isInChatContainer) {
      cancelSelectionMode();
    }
    if (contextMenu.value.visible && menu && !menu.contains(target)) {
      hideContextMenu();
    }
    const inputContainer = capsuleRef.value;
    if (inputContainer && !inputContainer.contains(target) && !target.closest('.keyboard') && inputFocused.value) {
      inputFocused.value = false;
      if (textInputRef.value) textInputRef.value.blur();
    }
  }
  
  function isValidMessage(item: any): boolean {
    return item && item.msgId && item.type && (item.text || item.audioUrl);
  }
  
  function getDisplayName(pub: string): string {
    const remark = chatFlow.friendRemarks.value[pub]?.remark;
    return remark && remark.trim() !== '' ? remark : getAliasRealtime(pub);
  }
  
  function toggleVoicePlayback(item: LocalChatMessage) {
    if (item.status === 'pending' || item.status === 'failed') return;
    if (voiceBar.playingAudio.value === item.msgId) {
      voiceBar.stopVoice();
    } else {
      if (voiceBar.playingAudio.value) voiceBar.stopVoice();
      voiceBar.playVoice(item.audioUrl!, item.msgId!);
    }
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
  
  function copyText(content: string) {
    navigator.clipboard.writeText(content).then(() => showToast('已复制', 'success'));
  }
  
  async function deleteMessage(item: LocalChatMessage) {
    if (!item.msgId || !currentChatPub.value) return;
    const chatId = generateChatId(currentUserPub.value!, currentChatPub.value);
    await retractMessage(chatId, item.msgId);
    hideContextMenu();
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
  
  function handleEnterKey(event: KeyboardEvent) {
    event.preventDefault();
    scrollToBottom();
    if (newMsg.value) {
      sendChat('text');
      newMsg.value = '';
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
    closeChat();
    // router.go(-1);
  }
  
  watch(inputFocused, (focused) => {
    if (focused) nextTick(() => scrollToBottom());
  });
  
  watch(
    () => currentChatMessages.value,
    (newMessages, oldMessages) => {
      if (!newMessages || newMessages.length === 0) {
        isLoadingMessages.value = true; // 无消息时显示骨架屏
      } else {
        isLoadingMessages.value = false; // 有消息时隐藏骨架屏
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
      nextTick(() => {
        if (scrollerRef.value) {
          const newHeight = scroller.scrollHeight;
          scroller.scrollTop = prevScrollTop + (newHeight - prevHeight);
          scrollerRef.value.reset();
        }
      });
    }
  }, 100);
  
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
  
  onMounted(async () => {
    scrollToBottomInitial();
    scrollerEl.value = scrollerRef.value.$el;
  
    if (currentChatMessages.value.length > 0) {
      isLoadingMessages.value = false;
    } else {
      isLoadingMessages.value = true;
    }
  
    try {
      Keyboard.setResizeMode({ mode: KeyboardResize.None });
      Keyboard.addListener('keyboardWillShow', (info) => {
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
  
    menuStabilityInterval = setInterval(() => {
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
  });
  
  onUnmounted(() => {
    // hasPadChat.value = false;
    document.removeEventListener('click', handleGlobalClick);
    closeChat();
    Keyboard.removeAllListeners();
    if (menuStabilityInterval) {
      clearInterval(menuStabilityInterval);
      menuStabilityInterval = null;
    }
  });
  
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
  </script>
  
  <style scoped>
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
  
  .input-toolbar {
    transition: transform 0.2s ease;
    position: relative;
    bottom: 0;
    width: 100%;
  }
  
  .message-container {
    height: 100vh;
    padding-bottom: 39px;
  }
  
  .scroller {
    height: calc(100% - var(--content-bottom));
    overflow-y: auto;
    margin-top: -105px;
    padding: 105px 10px;
  }
  
  .message-bubble {
    padding: 0px 15px;
    font-size: 13px;
    text-align: left;
    border-radius: 13px 13px 13px 0px !important;
    min-height: 39px;
    max-width: 80%;
    background: var(--ion-color-dark-contrast);
    color: var(--ion-color-dark-tint);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
    transition: background 0.2s ease, transform 0.2s ease;
    cursor: pointer;
    transform-origin: center;
    overflow: hidden;
  }
  
  .message-bubble:has(.image-container), .message-bubble:has(.video-container) {
    padding: 0;
  }
  
  .my-message .message-bubble {
    color: #fff;
    background: #01b872;
    border-radius: 13px 13px 0px 13px !important;
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
    background: #000 !important;
    color: #fff;
    transform: scale(1.05);
  }
  
  .voice-bubble {
    background: transparent !important;
    padding: 0 !important;
  }
  
  .voice-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 39px;
    padding: 6px 12px;
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
    padding-left: 23px;
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
  
  .message-avatar {
    width: 39px;
    height: 39px;
    border-radius: 50%;
    object-fit: cover;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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
    object-fit: cover;
    object-position: center;
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
    backdrop-filter: blur(10px);
    width: 96%;
    margin: 20px auto;
    height: 46px;
    transition: all 0.2s ease;
  }
  
  .input-capsule:hover {
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.2),
    0 0 40px rgba(255, 255, 255, 0.1);
    transform: scale(1.02);
    background: rgba(255, 255, 255, 0.15);
  }
  
  .input-capsule.shift-up {
    transform: translateY(-110px);
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
  }
  
  .text-input textarea {
    width: 100%;
    min-height: 39px;
    max-height: 120px;
    padding: 12px;
    border: none;
    border-radius: 10px;
    font-size: 16px;
    outline: none;
    resize: none;
    overflow-y: auto;
    background: transparent;
  }
  
  .voice-input {
    width: 100%;
    height: 39px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: 12px;
    background: rgba(0, 205, 137, 0.544);
    color: #333;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    user-select: none;
    transition: background 0.2s, transform 0.2s;
    touch-action: manipulation;
  }
  
  .voice-input.recording {
    background: linear-gradient(-45deg, #00ffaa, #ff9999, #fff, #00cd89);
    background-size: 200% 200%;
    animation: gradientBreath 6s ease infinite;
  }
  
  .voice-input.cancel-recording {
    background: #ff4d4d;
    transform: translateY(-20px);
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
  
  /* 骨架屏样式 */
  .skeleton-container {
    height: 100vh;
    margin-top: -100px;
    /* padding: -105px 10px 39px; */
    overflow: hidden;
    /* background: var(--ion-background-color, #ffffff); */
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
    border-radius:  13px 13px  13px 0px;
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
  </style>