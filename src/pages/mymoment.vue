<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button text="" default-href="/index" style="margin-left:10px" />
        </ion-buttons>
        <ion-title>我的动态</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- 列表区：我的动态（按时间排序） -->
      <ul>
        <li v-for="moment in myMomentsSorted" :key="moment.id" class="moment-card">
          <div class="moment-header">
            <div class="moment-info">
              <span>{{ formatTimestamp(moment.timestamp) }}</span> - 
              <span>{{ moment.hidden ? 'Hidden' : 'Public' }}</span>
            </div>
          </div>
          <div class="moment-content">
            <p>{{ moment.content }}</p>
          </div>
          <div class="moment-footer">
            <span>👍: {{ moment.likes }}</span>
            <button @click="handleLike(moment)">👍</button>
            <button @click="toggleVisibility(moment)">
              {{ moment.hidden ? 'Make Public' : 'Hide' }}
            </button>
            <button @click="deleteMyMoment(moment)">删除</button>
          </div>
        </li>
      </ul>

      <!-- 底部自动加载更多（手动滚动） -->
      <ion-infinite-scroll threshold="100px" @ionInfinite="loadMoreMyMoments($event)">
        <ion-infinite-scroll-content
          loadingSpinner="bubbles"
          loadingText="正在加载更多..."
        ></ion-infinite-scroll-content>
      </ion-infinite-scroll>

    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonContent,
  IonBackButton
} from '@ionic/vue'

// 来自 MomentsModule 或者你自定义的分块存储逻辑
import {
  myMoments,
  getLatestChunkIndex,
  listenOneChunk,
  likeMoment,
  toggleMomentVisibility,
  deleteMoment,
  type Moment
} from '@/composables/MomentsModule'
import chatFlowStore from '@/composables/TalkFlowCore'

/** 排序我的动态 */
const myMomentsSorted = computed(() =>
  [...myMoments.value].sort((a, b) => b.timestamp - a.timestamp)
)

/** 格式化时间戳 */
function formatTimestamp(ts: number) {
  return chatFlowStore.formatTimestamp(ts)
}

/** 点赞 */
function handleLike(moment: Moment) {
  likeMoment(moment)
}

/** 切换隐藏/公开 */
function toggleVisibility(moment: Moment) {
  toggleMomentVisibility(moment)
}

/** 删除动态 */
function deleteMyMoment(moment: Moment) {
  if (confirm('确定要删除该动态吗？')) {
    deleteMoment(moment)
  }
}

// 分块加载：记录已加载过哪些块
const myLoadedChunks = ref<Set<number>>(new Set())
// 用于存储最新块号（初次加载）
const myLatestChunk = ref(0)

// 计算出已加载块中的“最早”块号
const earliestLoadedChunk = computed(() => {
  if (myLoadedChunks.value.size === 0) return 0
  return Math.min(...myLoadedChunks.value)
})

/**
 * onMounted: 先加载最新块，然后检查“是否小于10条”，如果是就自动加载下一块，循环直到满足条件或无更多块
 */
onMounted(async () => {
  myMoments.value = [] // 清空列表
  const pub = chatFlowStore.currentUserPub.value
  if (!pub) return

  // 1) 获取用户最新块
  const latest = await getLatestChunkIndex(pub)
  myLatestChunk.value = latest

  // 2) 监听最新块
  myLoadedChunks.value.add(latest)
  listenOneChunk(pub, latest, myMoments) // 不加 isPublic => 加载自己所有动态(含隐藏)

  // 3) 等待 Gun 异步回调写入 myMoments，再检查数量
  setTimeout(() => {
    checkMinimumMoments()
  }, 500)
})

/**
 * checkMinimumMoments:
 * 如果我的动态<10条，就尝试自动 loadMore，
 * 若确实加载到新的块，就再延迟检查一次，直到>=10或者没块可加载
 */
function checkMinimumMoments() {
  if (myMoments.value.length < 10) {
    const loaded = loadMoreMyMomentsManual()
    if (loaded) {
      // 如果确实加载了新的块，则再延迟检查一次
      setTimeout(() => {
        checkMinimumMoments()
      }, 500)
    }
  }
}

/**
 * loadMoreMyMomentsManual:
 * 与 IonInfiniteScroll 的 loadMore 类似，但没有事件对象
 * 返回 boolean 表示是否真的加载了新块
 */
function loadMoreMyMomentsManual(): boolean {
  if (earliestLoadedChunk.value <= 0) {
    // 已经没有更早块了
    return false
  }
  const nextIndex = earliestLoadedChunk.value - 1
  if (!myLoadedChunks.value.has(nextIndex)) {
    myLoadedChunks.value.add(nextIndex)
    const pub = chatFlowStore.currentUserPub.value
    if (pub) {
      listenOneChunk(pub, nextIndex, myMoments)
      return true
    }
  }
  return false
}

/**
 * 处理 IonInfiniteScroll: 手动滚到底时，再加载更早块
 */
function loadMoreMyMoments(ev: Event) {
  const infiniteScroll = ev.target as HTMLIonInfiniteScrollElement

  if (earliestLoadedChunk.value > 0) {
    const nextIndex = earliestLoadedChunk.value - 1
    if (!myLoadedChunks.value.has(nextIndex)) {
      myLoadedChunks.value.add(nextIndex)
      const pub = chatFlowStore.currentUserPub.value
      if (pub) {
        listenOneChunk(pub, nextIndex, myMoments)
      }
    }
  }

  infiniteScroll.complete()
}
</script>

<style scoped>
.i-material-symbols-arrow-back-ios-new-rounded {
  --un-icon: url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 24 24' width='1.2em' height='1.2em' xmlns='http://www.w3.org/2000/svg' %3E%3Cpath fill='currentColor' d='m9.55 12l7.35 7.35q.375.375.363.875t-.388.875t-.875.375t-.875-.375l-7.7-7.675q-.3-.3-.45-.675t-.15-.75t.15-.75t.45-.675l7.7-7.7q.375-.375.888-.363t.887.388t.375.875t-.375.875z'/%3E%3C/svg%3E");
  -webkit-mask: var(--un-icon) no-repeat;
  mask: var(--un-icon) no-repeat;
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  background-color: currentColor;
  color: inherit;
  width: 1.5em;
  height: 1.5em;
}
.brand {
  font-size: 1.5em;
  font-weight: bold;
}


.moment-pub-key{

  font-size: 12px;
  color: #888;
  margin-top: 10px;
}
.moments-container {
  margin: auto 0;

  padding: 20px;
  width: 100%;
  /* margin: 0 auto; */
  background: var(--background-color);
  border-radius: 15px;
}

.tabs {
  margin-bottom: 20px;
  display: flex;
  justify-content: center;
}

.tabs button {
  background: none;
  border: 2px solid #ddd;
  padding: 10px 20px;
  border-radius: 25px;
  margin: 0 10px;
  font-size: 16px;
  cursor: pointer;
}

.tabs button.active {
  background-color: #007aff;
  color: white;
  border-color: #007aff;
}

.publish-area {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.publish-area input {
  width: 80%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 25px;
}

.publish-area button {
  padding: 10px 20px;
  border: none;
  background-color: #007aff;
  color: white;
  border-radius: 25px;
  cursor: pointer;
}

.moment-card {
  background: rgba(255, 255, 255, 0.251);
  margin-bottom: 20px;
  border-radius: 10px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  padding: 15px;
}

.moment-header {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.moment-header ion-avatar {
  margin-right: 10px;
}

.moment-header .moment-info {
  display: flex;
  flex-direction: column;
}

.moment-info strong {
  font-size: 23px;
  color: var(--text-color);
}

.moment-info span {
  font-size: 12px;
  color: var(--text-color);
}

.moment-content p {
  font-size: 16px;
  color: var(--text-color);
  line-height: 1.5;
  margin-bottom: 10px;
}

.moment-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.moment-footer button {
  padding: 5px 10px;
  border-radius: 20px;
  border: 1px solid var(--background-color);
  background-color: var(--background-color);
  cursor: pointer;
  font-size: 14px;
}

.moment-footer button:hover {
  background-color: var(--background-color);
}

.moment-footer span {
  font-size: 13px;
  color: var(--text-color);
}
</style>

