<template>
  <ion-page>
    <ion-header :translucent="true" collapse="fade" class="transparent-header">
      <ion-toolbar class="transparent-toolbar">
        <ion-buttons slot="start">
           <ion-back-button :text="$t('back')" ></ion-back-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" >
      <!-- 下拉刷新 -->
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
        <ion-refresher-content
          pulling-icon="chevron-down-circle-outline"
          pulling-text="Pull to refresh"
          refreshing-spinner="circles"
          refreshing-text="Refreshing...">
        </ion-refresher-content>
      </ion-refresher>

      <!-- 个人信息头部 -->
      <div class="profile-header">
        <!-- 背景图片区域 -->
        <div class="cover-image">
          <!-- <div class="cover-overlay"></div> -->
          <object
          style="height:100%;width:100%;object-fit: cover;"
	type="image/svg+xml"
	:key="friendPub"
	:data="
		gunAvatar({
			pub: friendPub,
			svg: 'interactive',
			size: 200,
			dark: isDark,
      reflect: false,
      round: false,
		} as any)
	"
></object>
        </div>
        
        <!-- 头像和基本信息 -->
        <div class="profile-info">
          <div class="avatar-section">
            <div class="avatar-container">
              <img
                v-if="userAvatars[friendPub]"
                :src="userAvatars[friendPub]"
                alt="Avatar"
                class="profile-avatar"
                
              />
              <img
                v-else
                :src="getGunAvatar(friendPub)"
                alt="Avatar"
                class="profile-avatar"
             
              />
              
           
            </div>
          <ion-buttons style="gap: 5px;">
            <!-- 如果是自己的公钥，显示通知按钮 -->
            <template v-if="isOwnProfile">
              <ion-button 
                fill="outline" 
                size="small" 
                class="notification-btn"
                @click="goToNotifications"
              >
                <ion-icon :icon="notificationsOutline" slot="start"></ion-icon>
                <ion-badge v-if="unreadCount > 0" color="danger" class="notification-badge">{{ unreadCount }}</ion-badge>
              </ion-button>
            </template>
            <!-- 如果是好友，显示设置和聊天按钮 -->
            <template v-else-if="isFriend">
              <ion-button 
                fill="outline" 
                size="small" 
                class="message-btn"
                @click="goToSettings">
                <ion-icon :icon="createOutline"/>
              </ion-button>
              <!-- 消息按钮 -->
              <ion-button 
                fill="outline" 
                size="small" 
                class="message-btn"
                @click="chatWithFriend"
              >
                <ion-icon :icon="chatbubblesOutline" slot="start"></ion-icon>
              </ion-button>
            </template>
            <!-- 如果不是好友，显示添加好友按钮 -->
            <template v-else>
              <ion-button 
                fill="outline" 
                size="small" 
                class="add-friend-btn"
                @click="showRequestModal = true"
              >
                {{ $t('addfriend1') || 'Add Friend' }}
              </ion-button>
            </template>
          </ion-buttons>
          </div>

          <!-- 用户名和验证状态 -->
          <div class="user-details">
            <h1 class="display-name">{{ getDisplayName(friendPub) }}</h1>
            
            <div v-if="!isOwnProfile" class="verification-info">
              <ion-icon :icon="getVerificationIcon()" :class="getVerificationIconClass()"></ion-icon>
              <span :class="getVerificationTextClass()">{{ getVerificationStatusText() }}</span>
              <div class="verification-actions">
                <div @click="syncSecurityCertificate" :disabled="isSyncing" class="action-button">
                  <ion-icon style="font-size: 13px; color: #3b82f6;" :icon="isSyncing ? syncOutline : refreshOutline" :class="{ 'syncing-icon': isSyncing }"></ion-icon>
                </div>
                <div @click="sendEpubToFriend" :disabled="isSendingEpub" class="action-button">
                  <ion-icon style="font-size: 13px; color: #22c55e;" :icon="sendOutline" :class="{ 'sending-icon': isSendingEpub }"></ion-icon>
                </div>
              </div>
            </div>

            <!-- 个人简介 -->
            <div v-if="getUserSignature(friendPub)" class="bio">
              <p v-if="!isUrl(getUserSignature(friendPub))" class="bio-text">
                {{ getUserSignature(friendPub) }}
              </p>
              <p v-else class="bio-text">
                <a @click.prevent="openUrl(getUserSignature(friendPub))" class="bio-link">
                  {{ getUserSignature(friendPub) }}
                </a>
              </p>
            </div>

            <!-- 备注信息 -->
            <div v-if="friendRemarks[friendPub]?.remarkInfo" class="remark">
              <span class="remark-text">{{ friendRemarks[friendPub].remarkInfo }}</span>
            </div>

            <!-- 公钥信息（手风琴） -->
            <ion-accordion-group class="pubkey-accordion">
              <ion-accordion value="pubkey">
                <ion-item slot="header" color="light">
                  <ion-label>Public Key</ion-label>
                </ion-item>
                <div class="ion-padding" slot="content">
                  <div class="pubkey-content">
                    <div class="pubkey-value">{{ friendPub }}</div>
                    <ion-button fill="clear" size="small" @click="copyPub(friendPub)">
                      <ion-icon :icon="copyOutline"></ion-icon>
                    </ion-button>
                  </div>
                  <!-- 二维码显示 -->
                  <div  class="qr-code-section">
                    <div class="qr-code-container">
                      <QrShow :data="'pubkey:' + friendPub" />
                    </div>
                  
                  </div>
                  
                  <!-- Epub信息 -->
                  <div class="epub-section">
                    <div class="epub-header">
                      <span class="epub-label">Epub (Encryption Public Key)</span>
                      <ion-button 
                        v-if="!friendEpub && !epubLoading" 
                        fill="clear" 
                        size="small" 
                        @click="fetchUserEpub(friendPub)"
                        class="refresh-epub-btn"
                      >
                        <ion-icon :icon="refreshOutline"></ion-icon>
                      </ion-button>
                      <ion-spinner v-if="epubLoading" name="dots" class="epub-spinner"></ion-spinner>
                    </div>
                    <div v-if="friendEpub" class="epub-content">
                      <!-- <div class="epub-value">{{ friendEpub }}</div> -->
                        <div class="epub-value">************</div>
                      <!-- <ion-button fill="clear" size="small" @click="copyPub(friendEpub)">
                        <ion-icon :icon="copyOutline"></ion-icon>
                      </ion-button> -->
                    </div>
                    <div v-else-if="!epubLoading" class="epub-empty">
                      <span class="epub-empty-text">No epub available</span>
                    </div>
                  </div>
                </div>
              </ion-accordion>
            </ion-accordion-group>
          </div>
        </div>
      </div>

      <!-- 标签栏 -->
      <div class="tabs-section">
        <div class="tab-item active">
          <span>Posts</span>
        </div>
      </div>

      <!-- 动态列表 -->
      <div class="moments-section">
        <div class="moments-container" v-if="friendMoments.length > 0">
          <div v-for="moment in friendMoments" :key="moment.momentId" class="moment-card">
            <div class="moment-header">
              <ion-avatar class="avatar" >
                <img :src="getAvatarWithFallback(moment.userPub)" alt="" class="avatar-img" />
              </ion-avatar>
              <div class="header-info">
                <h2 class="clickable-name" >
                  {{ getBuddyAlias(moment.userPub) }}
                </h2>
                <p class="timestamp">{{ formatTimestamp(moment.timestamp) }}</p>
              </div>
            </div>
            
            <div class="content-wrapper" :class="{ loading: loadingMoments.has(moment.momentId) }">
              <!-- 转发动态的转发内容 -->
              <div v-if="moment.isForward && moment.forwardContent" class="forward-content-wrapper">
                <p class="forward-content">{{ truncateForwardContent(moment.forwardContent) }}</p>
              </div>
              
              <!-- 原动态内容（非转发）或转发动态的原始内容 -->
              <div v-if="!moment.isForward && getText(moment)" class="text-wrapper">
                <p
                  class="content native-selectable"
                  @touchstart="handleLongPress($event, moment)"
                  @touchend="clearLongPress"
                  @touchmove="clearLongPress"
                  @contextmenu.prevent="showContextMenu($event, moment)"
                >
                  {{ getDisplayText(moment) }}
                </p>
                <!-- 展开/收起按钮 -->
                <span 
                  v-if="shouldShowToggleButton(moment)"
                  class="toggle-text"
                  @click.stop="toggleTextExpansion(moment.momentId)"
                >
                  {{ expandedMoments.has(moment.momentId) ? t('Hide') || 'Hide' : t('View All') || 'View all' }}
                </span>
              </div>
              
              <!-- 转发动态的原动态卡片 -->
              <OriginalMomentCard 
                v-if="moment.isForward && moment.originalMomentId && moment.originalAuthor"
                :original-moment-id="moment.originalMomentId"
                :original-author="moment.originalAuthor"
                @click.stop
              />
              <!-- 非转发动态的图片九宫格 -->
              <ImageGridViewer
                v-if="!moment.isForward && getImages(moment).length > 0"
                :images="getImages(moment)"
                @click.stop
              />
              
              <!-- 非转发动态的视频播放器 -->
              <div v-if="!moment.isForward && getVideos(moment).length > 0" class="video-container">
                <HlsVideoPlayer
                  v-for="(video, index) in getVideos(moment)"
                  :key="`video-${moment.momentId}-${index}`"
                  :msg-id="`${moment.momentId}-${index}`"
                  :base64-video="video"
                  :autoplay="false"
                  :muted="true"
                  class="moment-video"
                  @loaded="onVideoLoaded"
                  @error="onVideoError"
                  @play="onVideoPlay"
                  @pause="onVideoPause"
                />
              </div>
            </div>
            
            <div class="actions" @click.stop>
              <ion-button fill="clear" @click="openCommentModal(moment)" class="comment-btn">
                <ion-icon :icon="chatbubblesOutline"></ion-icon>
                <span>{{ getCommentCount(moment.momentId) }}</span>
              </ion-button>
              <ion-button fill="clear" @click="toggleLike(moment.momentId)" class="like-btn">
                <ion-icon :icon="isLiked(moment.momentId) ? heart : heartOutline"></ion-icon>
                <span>{{ getLikeCount(moment.momentId) }}</span>
              </ion-button>
              <ion-button 
                fill="clear" 
                @click="openForwardModal(moment)"
                class="forward-btn"
              >
                <ion-icon :icon="shareOutline"></ion-icon>
                <span>{{ getForwardCount(moment.momentId) }}</span>
              </ion-button>

                  <ion-button v-if="isOwnProfile" fill="clear" color="danger" @click="deleteMoment(moment.momentId)">
              <ion-icon :icon="trashOutline"></ion-icon>
            </ion-button>
            </div>
          </div>
        </div>
        
        <div v-else class="no-moments">
          <ion-icon :icon="chatbubblesOutline" size="large"></ion-icon>
          <p>{{ loading ? 'Loading...' : 'No moments yet' }}</p>
        </div>
        
        <ion-infinite-scroll @ionInfinite="loadMoreMoments($event)" threshold="100px" :disabled="!hasMore.valueOf">
          <ion-infinite-scroll-content loading-text="Loading..."></ion-infinite-scroll-content>
        </ion-infinite-scroll>
      </div>
      
      <!-- 转发弹窗 -->
      <ForwardModal 
        :is-open="forwardModalOpen"
        :moment="selectedMomentForForward"
        @close="closeForwardModal"
        @forward-success="onForwardSuccess"
      />
      
      <!-- 评论弹窗 -->
      <CommentModal 
        :is-open="commentModalOpen"
        :moment="selectedMomentForComment"
        @close="closeCommentModal"
      />
    </ion-content>

    <!-- 好友申请留言弹窗 -->
    <ion-modal :is-open="showRequestModal" @didDismiss="showRequestModal = false">
      <ion-header>
        <ion-toolbar>
          <ion-title>{{ $t('addfriend') || 'Add Friend' }}</ion-title>
          <ion-buttons slot="end">
            <ion-button color="dark" @click="showRequestModal = false">Close</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <ion-textarea
          v-model="requestMessage"
          placeholder="Message"
        ></ion-textarea>
        <ion-button color="dark" expand="block" @click="sendFriendRequest">{{ $t('addfriend2') || 'Send Request' }}</ion-button>
        <ion-text v-if="buddyError" color="danger">{{ buddyError }}</ion-text>
      </ion-content>
    </ion-modal>

  </ion-page>
</template>

<style scoped>
/* 透明顶部栏样式 */
.transparent-header {
  --background: transparent !important;
  --border-width: 0 !important;
  --box-shadow: none !important;
}

.transparent-toolbar {
  --background: transparent !important;
  --border-width: 0 !important;
  --box-shadow: none !important;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
}

.transparent-back-btn {
  --color: white !important;
  --background: rgba(0, 0, 0, 0.3) !important;
  --border-radius: 50% !important;
  width: 40px;
  height: 40px;
  margin: 8px;
}

/* Twitter/X 风格的个人资料页面样式 */
.profile-header {
  position: relative;
  /* background: var(--ion-color-step-50); */
   width: 100%;
}

.cover-image {
  height: 300px;
  background: linear-gradient(135deg, #66eadd 0%, #4ba278 100%);
  position: relative;
width:100%;object-fit: cover;
    /* background: var(--ion-background-color); */
  /* overflow: hidden; */
  /* padding-top: var(--ion-safe-area-top, 0); */
}

.cover-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.1);
}

.profile-info {
  padding: 0 16px 16px;
  position: relative;
  margin-top: -31px;
}

.avatar-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 12px;
}

.avatar-container {
  position: relative;
}

.profile-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 3px solid var(--ion-background-color);
  object-fit: cover;
  background: var(--ion-color-step-100);
}

.verification-badge {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--ion-color-step-50);
}

.badge-verified {
  background: var(--ion-color-success);
  color: white;
}

.badge-syncing {
  background: var(--ion-color-warning);
  color: white;
}

.badge-unverified {
  background: var(--ion-color-medium);
  color: white;
}

.badge-icon {
  font-size: 12px;
}

.message-btn {
  --border-radius: 20px;
  font-weight: 600;
}

.add-friend-btn {
  --border-radius: 20px;
  font-weight: 600;
  --color: var(--ion-color-primary);
  --border-color: var(--ion-color-primary);
}

.qr-code-section {
  margin-top: 16px;
  text-align: center;
}

.qr-code-container {
  display: flex;
  justify-content: center;
  margin-bottom: 8px;
}

.qr-code-label {
  font-size: 12px;
  color: var(--ion-color-step-600);
  margin: 0;
}

.user-details {
  margin-top: 8px;
}

.display-name {
  font-size: 20px;
  font-weight: 800;
  margin: 0 0 4px 0;
  color: var(--ion-color-step-850);
}

.verification-info {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 12px;
}

.verification-info ion-icon {
  font-size: 16px;
}

.bio {
  margin-bottom: 12px;
}

.bio-text {
  margin: 0;
  font-size: 15px;
  line-height: 1.4;
  color: var(--ion-color-step-600);
}

.bio-link {
  color: var(--ion-color-primary);
  text-decoration: none;
}

.remark {
  margin-bottom: 12px;
  padding: 8px 12px;
  background: var(--ion-color-step-100);
  border-radius: 8px;
}

.remark-text {
  font-size: 14px;
  color: var(--ion-color-step-700);
  font-style: italic;
}

/* 手风琴样式 */
.pubkey-accordion {
  margin-top: 16px;
}

.pubkey-accordion ion-accordion {
  border-radius: 8px;
  overflow: hidden;
}

.pubkey-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pubkey-value {
  flex: 1;
  font-family: monospace;
  font-size: 12px;
  color: var(--ion-color-step-700);
  word-break: break-all;
}

/* Epub样式 */
.epub-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--ion-color-step-200);
}

.epub-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.epub-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--ion-color-step-700);
}

.refresh-epub-btn {
  --color: var(--ion-color-primary);
  --padding-start: 4px;
  --padding-end: 4px;
}

.epub-spinner {
  width: 16px;
  height: 16px;
}

.epub-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.epub-value {
  flex: 1;
  font-family: monospace;
  font-size: 12px;
  color: var(--ion-color-step-700);
  word-break: break-all;
  background: var(--ion-color-step-100);
  padding: 8px;
  border-radius: 4px;
}

.epub-empty {
  text-align: center;
  padding: 12px;
}

.epub-empty-text {
  font-size: 14px;
  color: var(--ion-color-step-500);
  font-style: italic;
}

.tabs-section {
  border-bottom: 1px solid var(--ion-color-step-200);
  background: var(--ion-color-step-50);
}

.tab-item {
  padding: 16px;
  text-align: center;
  font-weight: 600;
  color: var(--ion-color-step-600);
  border-bottom: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-item.active {
  color: var(--ion-color-primary);
  border-bottom-color: var(--ion-color-primary);
}


.moments-container {
  padding: 0;
}

.moment-item {
  padding: 16px;
  border-bottom: 1px solid rgba(134, 134, 134, 0.496);
  /* background: var(--ion-color-step-50); */
  transition: background-color 0.2s ease;
}

/* .moment-item:hover {
  background: var(--ion-color-step-100);
} */

.moment-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.moment-avatar {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
}

.header-info {
  flex: 1;
  min-width: 0;
}

.clickable-name {
  font-size: 15px;
  font-weight: 700;
  margin: 0 0 2px 0;
  color: var(--ion-color-step-850);
  cursor: pointer;
}

.clickable-name:hover {
  text-decoration: underline;
}

.timestamp {
  font-size: 13px;
  color: rgba(134, 134, 134, 0.897);
  margin: 0;
}

.forward-content-wrapper {
  margin-bottom: 12px;
}

.forward-content {
  font-size: 15px;
  line-height: 1.4;
  margin: 0;
  color: var(--ion-color-step-700);
}

.text-wrapper {
  margin-bottom: 12px;
  cursor: pointer;
}

.text-wrapper.loading {
  opacity: 0.7;
}

.content {
  font-size: 15px;
  line-height: 1.4;
  margin: 0;
  color: var(--ion-color-step-850);
  white-space: pre-wrap;
  word-wrap: break-word;
}

.image-carousel {
  margin-bottom: 12px;
  border-radius: 16px;
  overflow: hidden;
}

.moment-image {
  width: 100%;
  max-height: 400px;
  object-fit: cover;
  cursor: pointer;
}

.video-container {
  margin-bottom: 12px;
  border-radius: 16px;
  overflow: hidden;
}

.moment-video {
  width: 100%;
  max-height: 400px;
  border-radius: 12px;
  margin-bottom: 8px;
}

.moment-video:last-child {
  margin-bottom: 0;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 20px;
  margin-top: 12px;
}

.actions ion-button {
  --color: rgba(134, 134, 134, 0.897);
  --padding-start: 0;
  --padding-end: 0;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* .actions ion-button:hover {
  --color: var(--ion-color-primary);
} */

.actions ion-button ion-icon {
  font-size: 18px;
}

.no-moments {
  text-align: center;
  padding: 60px 20px;
  color: var(--ion-color-step-500);
}

.no-moments ion-icon {
  margin-bottom: 16px;
  color: var(--ion-color-step-400);
}

.no-moments p {
  font-size: 16px;
  margin: 0;
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  .cover-image {
    background: linear-gradient(135deg, #2d3748 0%, #4a5568 100%);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .profile-avatar {
    width: 70px;
    height: 70px;
  }
  
  .display-name {
    font-size: 18px;
  }
  
  .moment-item {
    padding: 12px;
  }
}
</style>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted, nextTick, computed } from 'vue';
import { getTalkFlowCore, isVerified, getVerificationStatus, type VerifiedBuddy } from '@/composables/TalkFlowCore';
import { useRouter, useRoute } from 'vue-router';
import { 
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonFooter, IonButton, IonButtons, 
  IonBackButton, IonIcon, toastController, IonList, IonItem, IonAvatar, IonInfiniteScroll, 
  IonInfiniteScrollContent, IonRefresher, IonRefresherContent, IonAccordion, IonAccordionGroup, 
  IonLabel, IonModal, IonTextarea, IonText, IonSpinner 
} from '@ionic/vue';
import { 
  copyOutline, createOutline, chevronBackOutline, checkmarkCircleOutline, syncOutline, 
  helpCircleOutline, timeOutline, cloudOfflineOutline, informationCircleOutline, refreshOutline,
  chevronUpOutline, chevronDownOutline, chatbubblesOutline, heart, heartOutline, shareOutline,
  notificationsOutline, trashOutline, sendOutline
} from 'ionicons/icons';
import { gunAvatar, mountClass } from "gun-avatar";
import { Browser } from '@capacitor/browser';
import { useI18n } from 'vue-i18n';
import { useMoments } from '@/composables/useMoments';
import { useTheme } from '@/composables/useTheme';
import { useFriendRequests } from '@/composables/useFriendRequests';
import ImageGridViewer from '@/components/ui/ImageGridViewer.vue';
import ForwardModal from '@/components/ui/ForwardModal.vue';
import OriginalMomentCard from '@/components/ui/OriginalMomentCard.vue';
import CommentModal from '@/components/ui/CommentModal.vue';
import useNotifications from '@/composables/useNotifications';
import QrShow from '@/components/GunVue/QrShow.vue';
import HlsVideoPlayer from '@/components/ui/HlsVideoPlayer.vue';

// 定义 MomentV2 类型
interface MomentV2 {
  momentId: string;
  userPub: string;
  content: string;
  timestamp: number;
  isHidden: number;
  // 转发相关字段
  isForward?: boolean;
  originalMomentId?: string;
  originalAuthor?: string;
  forwardContent?: string;
}

mountClass();
const chatFlow = getTalkFlowCore();
const { userAvatars, getAliasRealtime,getUserDataOnce, getFriendSignature, copyPub, friendRemarks, openChat, getAliasRealtime1, buddyList, manualSyncBuddyEpub, selectedFriendPub,
   searchUserProfile,
   buddyError, currentUserPub, currentUserAlias, strangerAlias,
    strangerAvatar,
   currentUserAlias1,listenUserAlias,listenUserAvatar,listenFriendSignature, getUserEpub, currentUserPair } = chatFlow;
const { sendFriendRequest: sendFriendRequestAction } = useFriendRequests();
const router = useRouter();
const route = useRoute();
const { t } = useI18n();
const friendPub = ref(route.query.pub as string);
const isSyncing = ref(false);
const isSendingEpub = ref(false);

// 🔄 数据同步状态管理
interface StrangerProfileState {
  pub: string;
  alias?: string;
  avatar?: string;
  signature?: string;
  epub?: string;
  syncStatus: 'syncing' | 'online' | 'offline' | 'timeout';
  syncProgress: number;
  lastSyncTime?: number;
}

const syncState = ref<StrangerProfileState>({
  pub: friendPub.value,
  syncStatus: 'syncing',
  syncProgress: 0
});

// 动态相关
const momentsCore = useMoments();
const { 
  moments, loadMoments, isLiked, getLikeCount, getBuddyAlias, formatTimestamp, addLike, 
  removeLike, momentComments, hasMore, loading, showMomentDetails, forwardMoment, getForwardCount,deleteMoment
} = momentsCore;

const friendMoments = ref<MomentV2[]>([]);
const loadingMoments = ref<Set<string>>(new Set());

// 转发弹窗状态
const forwardModalOpen = ref(false);
const selectedMomentForForward = ref<MomentV2 | null>(null);

// 评论弹窗状态
const commentModalOpen = ref(false);
const selectedMomentForComment = ref<MomentV2 | null>(null);

// 添加好友相关状态
const showRequestModal = ref(false);
const requestMessage = ref('');

// 获取通知服务
const { unreadCount } = useNotifications();

// 文本展开/收起状态管理
const expandedMoments = ref<Set<string>>(new Set());

// epub相关状态
const friendEpub = ref<string | null>(null);
const epubLoading = ref(false);

// 获取用户epub的函数
const fetchUserEpub = async (pub: string) => {
  if (epubLoading.value) return;
  
  try {
    epubLoading.value = true;
    const epub = await getUserEpub(pub);
    friendEpub.value = epub;
  } catch (error) {
    console.error('获取epub失败:', error);
    friendEpub.value = null;
  } finally {
    epubLoading.value = false;
  }
};

// 判断是否为好友的计算属性
const isFriend = computed(() => {
  return buddyList.value.some(buddy => buddy.pub === friendPub.value);
});

// 判断是否为自己的公钥
const isOwnProfile = computed(() => {
  return friendPub.value === currentUserPub.value;
});

// 移除标签页状态，直接显示Posts

// 懒加载和长按相关
let observer: IntersectionObserver | null = null;
let longPressTimer: NodeJS.Timeout | null = null;
const LONG_PRESS_DELAY = 500;
const isSearching = ref(false);

// 手动同步安全证书
async function syncSecurityCertificate() {
  if (isSyncing.value) return;
  
  isSyncing.value = true;
  try {
    const result = await manualSyncBuddyEpub(friendPub.value);
    if (result) {
      const toast = await toastController.create({
        message: 'Security Certificate Synced',
        duration: 2000,
        position: 'top',
        color: 'success'
      });
      await toast.present();
    }
  } catch (error) {
    const toast = await toastController.create({
      message: 'Security Certificate Sync Failed',
      duration: 2000,
      position: 'top',
      color: 'danger'
    });
    await toast.present();
  } finally {
    isSyncing.value = false;
  }
}

const { isDark } = useTheme();
const { setSelectedFriendPub } = getTalkFlowCore();

// 下拉刷新处理
const handleRefresh = async (event: CustomEvent) => {
  try {
    await loadMoments();
    updateFriendMoments();
    nextTick(() => setupLazyLoading());
    (event.target as HTMLIonRefresherElement).complete();
  } catch (error) {
    (event.target as HTMLIonRefresherElement).complete();
  }
};

// 移除Likes相关功能

// 更新朋友动态
const updateFriendMoments = () => {
  if (friendPub.value) {
    friendMoments.value = moments.value.filter(m => m.userPub === friendPub.value);
  } else {
    friendMoments.value = [];
  }
};

// 加载更多动态
const loadMoreMoments = async (event: CustomEvent) => {
  try {
    await loadMoments(10, true);
    updateFriendMoments();
    (event.target as HTMLIonInfiniteScrollElement).complete();
    nextTick(() => setupLazyLoading());
  } catch (error) {
    (event.target as HTMLIonInfiniteScrollElement).complete();
  }
};

// 图片和文本处理
const isBase64Image = (text: string): boolean => {
  const imageRegex = /^data:image\/(jpeg|png|gif|bmp|webp);base64,/i;
  return imageRegex.test(text);
};

const getImages = (moment: MomentV2) => {
  const parts = moment.content.split('\n');
  const images = parts
    .map((part, index) => {
      if (part === '[IMAGE]' && index + 1 < parts.length && isBase64Image(parts[index + 1])) {
        return parts[index + 1];
      }
      return null;
    })
    .filter(img => img !== null) as string[];
  return images;
};

const getVideos = (moment: MomentV2) => {
  const parts = moment.content.split('\n');
  const videos = parts
    .map((part, index) => {
      if (part === '[VIDEO]' && index + 1 < parts.length && isBase64Video(parts[index + 1])) {
        return parts[index + 1];
      }
      return null;
    })
    .filter(video => video !== null) as string[];
  return videos;
};

const getMedia = (moment: MomentV2) => {
  return {
    images: getImages(moment),
    videos: getVideos(moment)
  };
};

const getText = (moment: MomentV2) => {
  const parts = moment.content.split('\n');
  return parts.filter(part => 
    part !== '[IMAGE]' && 
    part !== '[VIDEO]' && 
    !isBase64Image(part) && 
    !isBase64Video(part)
  ).join('\n');
};

const isBase64Video = (text: string): boolean => {
  const videoRegex = /^data:video\/(mp4|webm|ogg|avi|mov);base64,/i;
  return videoRegex.test(text);
};

// 文本截断
const truncateText = (content: string, maxLength: number = 200): string => {
  if (!content) return '';
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength) + '... 点击查看全部';
};

const truncateForwardContent = (content: string) => {
  if (!content) return '';
  if (content.length <= 50) return content;
  return content.slice(0, 50) + '...';
};

// 文本展开/收起功能
const getDisplayText = (moment: MomentV2): string => {
  const text = getText(moment);
  if (!text) return '';
  
  const isExpanded = expandedMoments.value.has(moment.momentId);
  if (isExpanded || text.length <= 200) {
    return text;
  }
  
  return text.slice(0, 200);
};

const shouldShowToggleButton = (moment: MomentV2): boolean => {
  const text = getText(moment);
  return text.length > 200;
};

const toggleTextExpansion = (momentId: string) => {
  if (expandedMoments.value.has(momentId)) {
    expandedMoments.value.delete(momentId);
  } else {
    expandedMoments.value.add(momentId);
  }
};

const showContextMenu = (event: MouseEvent | TouchEvent, moment: MomentV2) => {
  handleLongPress(event as TouchEvent, moment);
};

// 头像处理
const getAvatar = (userPub: string): string => {
  return userAvatars.value[userPub] || '';
};

const getAvatarWithFallback = (userPub: string): string => {
  const avatar = getAvatar(userPub);
  return avatar && avatar.trim() !== '' ? avatar : getGunAvatar(userPub);
};

// 动态交互
const toggleLike = (momentId: string) => {
  if (isLiked(momentId)) removeLike(momentId);
  else addLike(momentId);
};

const getCommentCount = (momentId: string) => momentComments.value[momentId]?.length || 0;

// 进入动态详情页
const goToMomentDetail = async (moment: MomentV2) => {
  loadingMoments.value.add(moment.momentId);
  setTimeout(() => {
    showMomentDetails(moment.momentId);
    loadingMoments.value.delete(moment.momentId);
  }, 200);
};

// 转发功能
const openForwardModal = (moment: MomentV2) => {
  selectedMomentForForward.value = moment;
  forwardModalOpen.value = true;
};

const closeForwardModal = () => {
  forwardModalOpen.value = false;
  selectedMomentForForward.value = null;
};

// 评论功能
const openCommentModal = (moment: MomentV2) => {
  selectedMomentForComment.value = moment;
  commentModalOpen.value = true;
};

const closeCommentModal = () => {
  commentModalOpen.value = false;
  selectedMomentForComment.value = null;
};

const onForwardSuccess = async (data: { momentId: string; content: string }) => {
  forwardModalOpen.value = false;
  selectedMomentForForward.value = null;
  
  try {
    forwardMoment(data.momentId, data.content);
    const toast = await toastController.create({
      message: 'Forwarded',
      duration: 2000,
      position: 'top',
      color: 'success',
    });
    await toast.present();
  } catch (error: any) {
    const toast = await toastController.create({
      message: 'Forward failed',
      duration: 2000,
      position: 'top',
      color: 'danger',
    });
    await toast.present();
  }
};

// 长按处理
const handleLongPress = (event: TouchEvent, moment: MomentV2) => {
  longPressTimer = setTimeout(() => {
    showNativeMenu(event, moment);
  }, LONG_PRESS_DELAY);
};

const clearLongPress = () => {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
};

const showNativeMenu = (event: MouseEvent | TouchEvent, moment: MomentV2) => {
  const textElement = event.target as HTMLElement;
  if (textElement && getText(moment)) {
    textElement.style.userSelect = 'text';
    textElement.style.webkitUserSelect = 'text';
    const range = document.createRange();
    range.selectNodeContents(textElement);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    textElement.focus();
    setTimeout(() => {
      textElement.dispatchEvent(new Event('contextmenu'));
    }, 100);
  }
};

// 懒加载设置
const setupLazyLoading = () => {
  if (observer) {
    observer.disconnect();
  }
  observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          observer.unobserve(img);
        }
      }
    });
  }, {
    rootMargin: '0px 0px 200px 0px',
    threshold: 0.1
  });
  const allImages = document.querySelectorAll('img[data-src]');
  allImages.forEach(img => observer?.observe(img));
};


// const strangerAlias = ref<string | null>(null);
// const strangerAvatar = ref<string | null>(null);
const strangerSignature = ref<string | null>(null);
// 🆕 优化的用户数据获取函数（使用统一缓存机制）
async function fetchStrangerData(pub: string) {
  // 首先检查是否已经从好友申请或其他地方获取了信息
  const existingAlias = getAliasRealtime(pub);
  const existingAvatar = userAvatars.value[pub];
  
  if (existingAlias || existingAvatar) {
    // 🆕 使用已有的用户信息（避免重复网络请求）
    if (existingAlias && !strangerAlias.value) {
      strangerAlias.value = existingAlias;
      syncState.value.alias = existingAlias;
    }
    if (existingAvatar && !strangerAvatar.value) {
      strangerAvatar.value = existingAvatar;
      syncState.value.avatar = existingAvatar;
    }
    
    // 如果已有基础信息，直接标记为在线状态
    if (existingAlias && existingAvatar) {
      syncState.value.syncStatus = 'online';
      syncState.value.syncProgress = 100;
      return;
    }
  }
  
  // 使用统一的缓存机制获取用户数据
  try {
    syncState.value.syncStatus = 'syncing';
    syncState.value.syncProgress = 50;
    
    const userData = await getUserDataOnce(pub);
    
    if (userData.alias && !strangerAlias.value) {
      strangerAlias.value = userData.alias;
      syncState.value.alias = userData.alias;
    }
    if (userData.avatar && !strangerAvatar.value) {
      strangerAvatar.value = userData.avatar;
      syncState.value.avatar = userData.avatar;
    }
    
    syncState.value.syncStatus = 'online';
    syncState.value.syncProgress = 100;
  } catch (error) {
    // 缓存获取失败，使用默认值
    syncState.value.syncStatus = 'offline';
    syncState.value.syncProgress = 0;
    
    if (!strangerAlias.value) {
      strangerAlias.value = `User${pub.slice(0, 8)}`;
    }
    if (!strangerAvatar.value) {
      strangerAvatar.value = getGunAvatar(pub);
    }
  }
}
// 生命周期
onMounted(async () => {
      listenUserAlias(friendPub.value);
          listenUserAvatar(friendPub.value);
          listenFriendSignature(friendPub.value);
   fetchStrangerData(friendPub.value);
   // 自动获取epub
   fetchUserEpub(friendPub.value);
  // route监听器会处理初始化，这里只需要设置懒加载
  nextTick(() => setupLazyLoading());
});

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
  }
  clearLongPress();
  // 清理路由状态，确保下次进入时不会显示错误的用户信息
  friendPub.value = '';
  setSelectedFriendPub(null);
});

// 监听路由参数变化
watch(() => route.query.pub, (newPub) => {
  if (newPub && typeof newPub === 'string' && newPub !== friendPub.value) {
    friendPub.value = newPub;
    // 重新获取epub
    fetchUserEpub(newPub);
    // 重新加载数据
    loadMoments().then(() => {
      updateFriendMoments();
      nextTick(() => setupLazyLoading());
    });
  }
}, { immediate: true });

// 监听selectedFriendPub变化（从其他页面导航过来时）
watch(selectedFriendPub, (newPub) => {
  if (newPub && newPub !== friendPub.value) {
    friendPub.value = newPub;
    // 更新路由参数以保持同步
    router.replace({ query: { ...route.query, pub: newPub } });
    // 重新加载数据
    loadMoments().then(() => {
      updateFriendMoments();
      nextTick(() => setupLazyLoading());
    });
  }
}, { immediate: true });

// 监听moments变化以更新friendMoments
watch(moments, () => {
  updateFriendMoments();
  nextTick(() => setupLazyLoading());
}, { deep: true });

const goToProfile = (userPub: string) => {
  if (userPub === currentUserPub.value) {
    router.push('/MyMoments');
  } else {

    setSelectedFriendPub(userPub);
    router.push('/FriendMoments');
  }
};
// Generate avatar based on user's public key
const getGunAvatar = (pub: string) => {
  return gunAvatar({
    pub: pub,
    round: false,
    size: 200,
    dark: isDark.value,
    svg: true
  } as any);
};

function getDisplayName(pub: string): string {
  // 如果是自己的公钥，直接返回自己的昵称
  if (pub === currentUserPub.value) {
    return currentUserAlias.value || 'No Name';
  }
  
  const remark = friendRemarks.value[pub]?.remark;
  return remark && remark.trim() !== '' ? remark : getAliasRealtime(pub);
}

// 获取用户签名的函数
function getUserSignature(pub: string): string {
  // 如果是自己的公钥，返回自己的签名
  if (pub === currentUserPub.value) {
    return currentUserAlias1.value || '';
  }
  
  // 否则返回好友的签名
  return getFriendSignature(pub);
}

function goToSettings() {
  router.push({ path: '/friend-settings', query: { pub: friendPub.value } });
}

function chatWithFriend() {
  openChat(friendPub.value);
}

function goToNotifications() {
  router.push('/notifications');
}

// URL 检测和打开函数
const urlRegex = /^(https?:\/\/[^\s]+|\b\w+\.(com|cn|org|net|edu|gov|io|co)(?:\.\w+)?(?:\/[^\s]*)?)$/i;

function isUrl(text: string | null): boolean {
  return !!text && urlRegex.test(text);
}

async function openUrl(url: string) {
  const formattedUrl = url.match(/^https?:\/\//) ? url : `https://${url}`;
  try {
    await Browser.open({ url: formattedUrl });
  } catch (error) {
    
  }
}

// 🔐 验证状态计算函数
function getCurrentBuddy(): VerifiedBuddy | null {
  return buddyList.value.find(b => b.pub === friendPub.value) as VerifiedBuddy || null;
}



function getVerificationIcon(): string {
  const buddy = getCurrentBuddy();
  if (!buddy) return helpCircleOutline;
  
  const status = getVerificationStatus(buddy);
  switch (status) {
    case 'verified':
      return checkmarkCircleOutline;
    case 'syncing':
      return syncOutline;
    default:
      return helpCircleOutline;
  }
}

function getVerificationIconClass(): string {
  const buddy = getCurrentBuddy();
  if (!buddy) return 'verification-unverified';
  
  const status = getVerificationStatus(buddy);
  switch (status) {
    case 'verified':
      return 'verification-verified';
    case 'syncing':
      return 'verification-syncing';
    default:
      return 'verification-unverified';
  }
}

function getVerificationTextClass(): string {
  const buddy = getCurrentBuddy();
  if (!buddy) return 'verification-text-unverified';
  
  const status = getVerificationStatus(buddy);
  switch (status) {
    case 'verified':
      return 'verification-text-verified';
    case 'syncing':
      return 'verification-text-syncing';
    default:
      return 'verification-text-unverified';
  }
}

function getVerificationStatusText(): string {
  const buddy = getCurrentBuddy();
  if (!buddy) return t('unverifiedStatus');
  
  const status = getVerificationStatus(buddy);
  switch (status) {
    case 'verified':
      return t('relationshipVerified');
    case 'syncing':
      return t('verifying');
    default:
      return t('relationshipUnverified');
  }
}

// 视频播放事件处理函数
const onVideoLoaded = (msgId: string) => {
  console.log('视频加载完成:', msgId);
};

const onVideoError = (msgId: string, error: any) => {
  console.error('视频加载错误:', msgId, error);
};

const onVideoPlay = (msgId: string) => {
  console.log('视频开始播放:', msgId);
};

const onVideoPause = (msgId: string) => {
  console.log('视频暂停:', msgId);
};

// 发送好友申请
async function sendFriendRequest() {
  try {
    await sendFriendRequestAction(friendPub.value, requestMessage.value);
    
    showRequestModal.value = false;
    requestMessage.value = '';
    
    // 显示成功提示
    const toast = await toastController.create({
      message: 'Friend request sent, establishing secure connection...',
      duration: 2000,
      position: 'top',
      color: 'success'
    });
    await toast.present();
    
  } catch (error: any) {
    const toast = await toastController.create({
      message: error.message || 'Failed to send friend request',
      duration: 3000,
      position: 'top',
      color: 'danger'
    });
    await toast.present();
  }
}

// 手动发送epub给好友
const sendEpubToFriend = async () => {
  if (isSendingEpub.value) return;
  
  try {
    isSendingEpub.value = true;
    
    // 检查用户是否已登录
    if (!currentUserPub.value) {
      throw new Error('Please log in first');
    }
    
    // 获取当前用户的epub
    let myEpub = currentUserPair?.epub;
    
    // 如果currentUserPair为空或没有epub，尝试从数据库重新获取
    if (!myEpub) {
      console.log('currentUserPair is null or missing epub, attempting to get epub from database');
      try {
        const getEpubFromDatabase = async () => {
          try {
            // 首先尝试从localStorage获取
            const encryptedCredentials = localStorage.getItem('userCredentials');
            
            if (encryptedCredentials) {
              const pair = JSON.parse(encryptedCredentials);
              // 只返回epub，不暴露其他敏感信息
              if (pair.epub) {
                return pair.epub;
              }
            }
            
            // 如果localStorage没有，尝试从SQLite获取
            const credentialsResult = await chatFlow.storageServ.query('SELECT value FROM credentials WHERE key = ?', ['userCredentials']);
            
            if (credentialsResult.values && credentialsResult.values.length > 0) {
              const pair = JSON.parse(credentialsResult.values[0].value as string);
              // 只返回epub，不暴露其他敏感信息
              if (pair.epub) {
                return pair.epub;
              }
            }
            
            return null;
          } catch (error) {
          //  console.error('Failed to get epub from database:', error);
            return null;
          }
        };
        
        const epubFromDb = await getEpubFromDatabase();
        if (epubFromDb) {
          myEpub = epubFromDb;
          console.log('Successfully retrieved epub from database');
        }
      } catch (epubError) {
        console.error('Failed to get epub from database:', epubError);
      }
    }
    
    if (!myEpub) {
      throw new Error('Unable to get your epub. Please try logging out and logging back in.');
    }
    
    // 发送epub到对方的epub_pool节点
    chatFlow.gun.get('epub_pool').get(friendPub.value).put({
      [currentUserPub.value]: myEpub,
      timestamp: Date.now()
    });
    
    // 显示成功提示
    const toast = await toastController.create({
      message: 'Epub sent to friend\'s pool successfully',
      duration: 2000,
      position: 'top',
      color: 'success'
    });
    await toast.present();
    
  } catch (error: any) {
    const toast = await toastController.create({
      message: error.message || 'Failed to send epub',
      duration: 3000,
      position: 'top',
      color: 'danger'
    });
    await toast.present();
  } finally {
    isSendingEpub.value = false;
  }
}

// 监听epub_pool变化
function listenToEpubPool() {
  if (!currentUserPub.value) return;
  
  chatFlow.gun.get('epub_pool').get(currentUserPub.value).on((data: string) => {
    if (data && data !== friendPub.value) {
      // 收到新的epub，检查是否来自当前查看的好友
      const buddy = getCurrentBuddy();
      if (buddy && !buddy.epub) {
        // 如果当前好友没有epub，尝试获取并更新
        setTimeout(() => {
          chatFlow.manualSyncBuddyEpub(friendPub.value);
        }, 1000);
      }
    }
  });
}

// 页面加载时检查epub_pool
onMounted(() => {
  listenToEpubPool();
  
  // 检查epub_pool中是否有当前好友的epub
  if (currentUserPub.value) {
    chatFlow.gun.get('epub_pool').get(currentUserPub.value).once((data: string) => {
      if (data) {
        const buddy = getCurrentBuddy();
        if (buddy && !buddy.epub) {
          // 如果好友没有epub但epub_pool中有数据，尝试同步
          setTimeout(() => {
            chatFlow.manualSyncBuddyEpub(friendPub.value);
          }, 500);
        }
      }
    });
  }
});
</script>

<style scoped>
.avatar-glow1 {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  /* object-fit: cover; */
  /* border-radius: 50%; */
  filter: blur(20px);
  /* transform: scale(1.5); */
  opacity: 0.3;
  overflow: visible;
  /* animation: defaultMorph 6s ease-in-out infinite; */
  /* z-index: 3; */
  pointer-events: none;
}
.liquid-container {
  padding: 1rem;
  display: flex;
  flex-direction:column;
  align-items: center;
  min-height: 100%;
  justify-content:space-between;
}

.liquid-toolbar {
  --background-color: transparent;
  --border-color: transparent;
}

.avatar-wrapper {
  position: relative;
}

.avatar {
  width: 70px;
  height: 70px;
  object-fit: cover;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  /* animation: morph 6s ease-in-out infinite; */
  border-radius: 50%;
}

@keyframes morph {
  0% { border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%; }
  25% { border-radius: 60% 40% 50% 50% / 50% 60% 40% 50%; }
  50% { border-radius: 50% 50% 40% 60% / 60% 40% 50% 50%; }
  75% { border-radius: 40% 60% 60% 40% / 50% 50% 40% 60%; }
  100% { border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%; }
}

.avatar:hover {
  transform: scale(1.05);
  transition: transform 0.3s ease;
}

.username {
  font-size: 1.8rem;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 0.5rem;
  letter-spacing: 0.5px;
}

.signature {
  font-size: 1.3rem;
  color: #7f8c8d;  
  /* margin-bottom: 2rem; */
  max-width: 100%;
  text-align: left;
  /* font-style: italic; */
}

.signature-link {
  color: #2980b9;
  text-decoration: underline;
  cursor: pointer;
  transition: color 0.3s ease;
}

.signature-link:hover {
  color: #3498db;
}

.info-card {
  width: 100%;
  max-width: 600px;
  background: rgba(255, 255, 255, 0.057);
  /* border-radius: 24px; */
  padding: 1.5rem;
  /* box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1); */

  
}

.info-item {
  display: flex;
  flex-direction: column;
  margin-bottom: 1.2rem;
  padding-bottom: 1.2rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.info-item:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.label {
  font-size: 0.9rem;
  color: #7f8c8d;
  font-weight: 500;
  /* margin-bottom: 0.3rem; */
}

.value {
  font-size: 0.7rem;
  color: #878787b4;
  word-break: break-all;
}

.pubkey-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.copy-icon {
  font-size: 30px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.copy-icon:hover {
  color: #2980b9;
  transform: scale(1.1);
}

.liquid-footer {
  border: none;
  box-shadow: none;
  border-style: none;
  padding: 1rem;
}

.liquid-button {
  height: 48px;
  width: 100%;
  font-weight: 600;
  font-size: 1.25rem;
  text-transform: none;
  border-radius: 10px;
  background: rgb(43, 43, 43);
  color: #f5f7fa;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.liquid-button:hover {
  background: rgb(60, 60, 60);
  transform: translateY(-2px);
}

/* 🔐 验证状态样式 */
.avatar-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.verification-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid var(--ion-background-color, #fff);
  z-index: 10;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.verification-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-left: 8px;
}

.action-button {
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-button:hover {
  background-color: rgba(0, 0, 0, 0.1);
  transform: scale(1.1);
}

.syncing-icon {
  animation: spin 1s linear infinite;
}

.sending-icon {
  animation: pulse 1s ease-in-out infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.badge-icon {
  font-size: 14px;
  color: white;
}

.badge-verified {
  background: #22c55e; /* 绿色 - 已验证 */
}

.badge-verified .badge-icon {
  animation: none;
}

.badge-syncing {
  background: #3b82f6; /* 蓝色 - 同步中 */
}

.badge-syncing .badge-icon {
  animation: spin 2s linear infinite;
}

.badge-unverified {
  background: #64748b; /* 灰色 - 未验证 */
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 验证状态显示区域 */
.verification-status {
  display: flex;
  align-items: center;
  /* gap: 8px;
  margin-bottom: 16px;
  padding: 10px 16px; */
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  /* backdrop-filter: blur(10px); */
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.verification-verified {
  color: #22c55e;
  font-size: 16px;
}

.verification-syncing {
  color: #3b82f6;
  font-size: 16px;
  animation: spin 2s linear infinite;
}

.verification-unverified {
  color: #64748b;
  font-size: 16px;
}

.verification-text-verified {
  color: #22c55e;
  font-weight: 600;
  font-size: 14px;
}

.verification-text-syncing {
  color: #3b82f6;
  font-weight: 500;
  font-size: 14px;
}

.verification-text-unverified {
  color: #64748b;
  font-weight: 500;
  font-size: 14px;
}

/* 底部按钮样式 */
.footer-buttons {
  display: flex;
  gap: 8px;
  padding: 0 16px;
  width: 100%;
}

.footer-buttons ion-button:first-child {
  flex: 0 0 auto;
  min-width: 80px;
}

.footer-buttons .liquid-button {
  flex: 1;
}

.syncing-icon {
  animation: spin 2s linear infinite;
  color: #3b82f6;
}

/* 暗模式适配 */
@media (prefers-color-scheme: dark) {
  .verification-status {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
}

/* 动态卡片样式 */
.moments-container {
  padding: 16px 0;
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
}

.moment-card {
  border-bottom: 1px solid #8686862d;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: visible;
  margin: 10px;
}

.moment-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 0 8px 0;
  position: relative;
  z-index: 2;
}

.avatar {
  width: 39px;
  height: 39px;
  overflow: hidden;
  flex-shrink: 0;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: opacity 0.3s ease;
}

.avatar-img:not([src]) {
  opacity: 0.5;
  background: #f0f0f0;
}

.header-info {
  flex: 1;
}

.clickable-name {
  font-size: 1.3em;
  font-weight: 600;
  margin: 0;
}

.timestamp {
  color: #4a4a4a;
  font-size: 0.85em;
  margin: 2px 0 0;
}

.content-wrapper {
  margin: 8px 0 0 0;
  padding-left: 50px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 8px;
  padding: 8px 8px 8px 50px;
  margin: 0;
  position: relative;
}

.content-wrapper.loading {
  opacity: 0.7;
  pointer-events: none;
}

.content-wrapper.loading::after {
  content: '';
  position: absolute;
  top: 50%;
  right: 12px;
  width: 16px;
  height: 16px;
  border: 2px solid var(--ion-color-primary);
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.text-wrapper {
  padding: 8px 0;
}

.forward-content-wrapper {
  padding: 8px 0 12px;
}

.forward-content {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 1.3em;
  line-height: 1.6;
  margin: 0;
  color: var(--ion-text-color);
  font-weight: 500;
}

.content {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 1em;
  line-height: 1.6;
  margin: 0;
}

.native-selectable {
  user-select: text;
  -webkit-user-select: text;
  cursor: text;
}

.actions {
  display: flex;
  gap: 8px;
  padding: 8px 0 0;
  justify-content: flex-end;
  margin-top: 12px;
  position: relative;
  z-index: 2;
}

.actions ion-button {
  --padding-start: 8px;
  --padding-end: 8px;
  --border-radius: 20px;
  color: #767676;
  transition: all 0.2s ease;
  height: 32px;
  font-size: 0.85em;
}

.actions ion-button:hover {
  transform: scale(1.05);
}

.actions ion-button span {
  margin-left: 4px;
  font-size: 0.9em;
}

.like-btn {
  --color: var(--ion-color-danger);
}

.forward-btn {
  --color: var(--ion-color-success);
}

.no-moments {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 50vh;
  color: #767676;
}

.no-moments ion-icon {
  margin-bottom: 12px;
}

.toggle-text {
  color: #007AFF;
  font-size: 14px;
  cursor: pointer;
  margin-left: 8px;
  font-weight: 500;
  transition: opacity 0.2s ease;
}

.toggle-text:hover {
  opacity: 0.7;
}
</style>
