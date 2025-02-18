<template>
  <!-- IonPage: Ionic 对页面的容器组件 -->

    <!-- 顶部导航栏 -->
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>TalkFlow</ion-title>
      </ion-toolbar>
    
    </ion-header>

    <!-- 主内容区 -->
    <ion-content :fullscreen="true">
  
        <!-- IonSearchbar: Ionic 的搜索框组件 -->
        <ion-searchbar v-model="searchQuery" placeholder=""/>
    
      <!-- IonList: Ionic 列表容器 -->
      <ion-list>
        <!-- 遍历过滤并排序后的聊天预览列表 -->
        <ion-item-sliding
          v-for="chat in sortedFilteredChatPreviewList"
          :key="chat.pub"
        >
          <!-- “主”列表项，点击时打开聊天 -->
          <ion-item @click="openChat(chat.pub)">
            <!-- Avatar区：若存在头像则显示 -->
            <ion-avatar slot="start" v-if="userAvatars[chat.pub]">
              <img :src="userAvatars[chat.pub]" alt="Avatar" />
            </ion-avatar>

            <!-- IonLabel区：显示昵称/备注、最后一条消息 -->
            <ion-label>
                <!-- 第一行：昵称 + 时间 -->
    <div class="top-line">
      <span class="chat-name">{{ getDisplayName(chat.pub) }}
        <span v-if="chat.hasNew" class="new-message-dot"></span>
      </span>
      <span class="chat-time">{{ chat.lastTime }}</span>
    </div>
    <!-- 第二行：聊天预览内容 -->
    <div class="bottom-line">
      {{ chat.lastMsg }}
    </div>
            </ion-label>
          
          

          </ion-item>

          <!-- 侧滑操作区（IonItemOptions） -->
          <ion-item-options side="end">
            <!-- 删除聊天记录 -->
            <ion-item-option color="danger" @click.stop="deleteChat(chat.pub)">
              {{ $t('delete') }}
            </ion-item-option>
            <!-- 隐藏聊天 -->
            <ion-item-option color="medium" @click.stop="hideChat(chat.pub)">
              {{ $t('hide') }}
            </ion-item-option>
          </ion-item-options>
        </ion-item-sliding>
      </ion-list>
    </ion-content>

</template>

<style scoped>
ion-avatar {
    --border-radius: 10px;
    width: 55px;
    height:55px
    
  }
  .top-line {
  display: flex;           /* 使用Flex使左右对齐 */
  align-items: center;
  justify-content: space-between; /* 昵称在左，时间在右 */
}

.chat-name {
  font-weight: bold;
  font-size: 1.5rem;         /* 昵称字体大小 */
  color: var(--ion-color-dark, #333);
}

.chat-time {
  font-size: 0.85rem;      /* 时间字体可稍小 */
  color: #999;
}

.bottom-line {
  margin-top: 4px;
  font-size: 0.9rem;
  color: #666;             /* 聊天预览内容的颜色 */
  white-space: nowrap;     
  overflow: hidden;
  text-overflow: ellipsis; /* 如果希望截断长消息，可加这些 */
}
.new-message-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  background-color: red; /* 红色圆点 */
  border-radius: 50%;
  margin-left: 5px;
}
</style>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import {
  IonPage,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonSearchbar,
  IonContent,
  IonList,
  IonItem,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonAvatar,
  IonLabel,
  IonNote,
} from '@ionic/vue'

// 从业务逻辑模块中解构所需数据和方法（例如从 TalkFlowCore.ts 中）
import chatFlowStore from '@/composables/TalkFlowCore'
const {
  visibleChatPreviewList,
  openChat,
  userAvatars,
  hideCurrentChat,
  onDeleteChatClick,
  currentChatPub,
  friendRemarks,
  getAliasRealtime,
  
} = chatFlowStore

// 搜索关键字
const searchQuery = ref('')

// 显示昵称或备注：如果有备注，则显示备注，否则显示昵称
function getDisplayName(pub: string): string {
  const remark = friendRemarks.value[pub]?.remark
  if (remark && remark.trim() !== '') {
    return remark
  }
  return getAliasRealtime(pub)
}

// 过滤：根据搜索关键字（别名或备注）
const filteredChatPreviewList = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return visibleChatPreviewList.value
  return visibleChatPreviewList.value.filter(chat => {
    const displayName = getDisplayName(chat.pub).toLowerCase()
    return displayName.includes(q)
  })
})

// 排序：按 lastTime 降序排序
const sortedFilteredChatPreviewList = computed(() => {
  return filteredChatPreviewList.value.slice().sort((a, b) => {
    const aTime = new Date(a.lastTime).getTime()
    const bTime = new Date(b.lastTime).getTime()
    return bTime - aTime
  })
})


// 删除聊天项
function deleteChat(pub: string) {
  if (confirm('sure？')) {
    currentChatPub.value = pub
    onDeleteChatClick(pub)
    hideCurrentChat()
  }
}

// 隐藏聊天项
function hideChat(pub: string) {
  currentChatPub.value = pub
  hideCurrentChat()
}
</script>

