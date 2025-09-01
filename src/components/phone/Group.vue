<template>
  <ion-page>
    <ion-header collapse="fade">
      <ion-toolbar class="liquid-toolbar">
        <ion-searchbar
          show-cancel-button="always"
          cancel-button-text="Groups"
          color="light"
          v-model="searchQuery"
          placeholder="Search"
          @keydown.enter.prevent="onSearchEnter"
        />
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="group-content" ref="contentRef">
      <div class="gradient-mask"></div>

      <!-- 群聊列表 -->
      <ion-list class="group-list">
        <template v-for="(groupItems, letter) in sortedGroupedGroups" :key="letter">
          <ion-list-header class="group-header" :id="'group-' + letter">
            {{ letter }}
          </ion-list-header>

          <ion-item-sliding
            v-for="group in groupItems"
            :key="group.pub"
            @ionDrag="handleItemDrag"
            @ionDidOpen="handleItemOpen"
            @ionDidClose="handleItemClose"
            :ref="(el: any) => { if (el) itemSlidingRefs[group.pub] = el; }"
          >
          
            <ion-item @click="enterGroupChat(group.pub)" >
             
             
                <object
class="gun-group"
	type="image/svg+xml"
	
	:data="
		gunAvatar({
			pub: group.pub,
		  //  svg: 'interactive',
      // svg: true,
      round: false,
			dark: isDark,
      p3: true,
      //  embed: true,
      
      
		} as any)
	"
></object>
<!-- <object

	type="image/svg+xml"
	class="gun-avatar"
	:data="
		gunAvatar({
			pub: group.pub,
		  //  svg: 'interactive',
      // svg: true,
      round: false,
			dark: isDark,
      p3: true,
      //  embed: true,
      
      
		})
	"
></object> -->
<p style="font-size: 39px; color: var(--ion-color-dark, #333);font-weight: bold;margin-left: 10px;">{{ group.name }}</p>
            



            </ion-item>
            <ion-item-options side="end">
              <ion-item-option color="danger" @click.stop="deleteGroup(group.pub)">
                <ion-icon size="large" :icon="trashOutline" />
              </ion-item-option>
            </ion-item-options>
          </ion-item-sliding>
        </template>
      </ion-list>

      <!-- Alphabetical Index Bar -->
      <div class="index-bar">
        <div
          v-for="letter in indexLetters"
          :key="letter"
          class="index-letter"
          @click="scrollToLetter(letter)"
        >
          {{ letter }}
        </div>
      </div>

      <!-- Group Count -->
      <ion-text class="group-count">
        {{ filteredGroups.length }} Groups
      </ion-text>
    </ion-content>


  </ion-page>
</template>

<script lang="ts" setup>
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonInput,
  IonButton,
  IonList,
  IonListHeader,
  IonItem,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonLabel,
  IonAvatar,
  IonModal,
  IonSearchbar,
  IonText,
  IonButtons,
  IonIcon,
  type IonContent as IonContentType,
} from '@ionic/vue';
import { useGroupChat } from '@/composables/useGroupChat';
import { useRouter } from 'vue-router';
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { pinyin } from 'pinyin-pro';
import { addCircleOutline, personAddOutline, trashOutline, keyOutline } from 'ionicons/icons';
import { gunAvatar, mountClass } from 'gun-avatar';
import { useTheme } from '@/composables/useTheme';

mountClass();

// 使用 useGroupChat 获取群聊数据
const router = useRouter();
const {
  newGroupName,
  joinGroupKey,
  groups,
  tempKeyPair,
  copyKeyPair,
  loadGroups,
  createGroup,
  joinGroup,
  deleteGroup,
  setCurrentGroup,
} = useGroupChat();

// 搜索相关
const searchQuery = ref('');

// 模态框相关
const showCreateGroupModal = ref(false);

// 滑动相关
const contentRef = ref<InstanceType<typeof IonContentType> | null>(null);
const isItemOpen = ref(false);
const itemSlidingRefs = ref<Record<string, any>>({});

// 主题相关
const { isDark } = useTheme();

// 搜索过滤后的群聊列表
const filteredGroups = computed(() => {
  const q = searchQuery.value.toLowerCase();
  if (!q) return groups.value;
  return groups.value.filter(group => group.name.toLowerCase().includes(q));
});

// 获取群聊名称的首字母（拼音）
const getInitialLetter = (name: string): string => {
  const letter = pinyin(name, { pattern: 'first', type: 'array' })[0] || '#';
  const upper = letter.toUpperCase();
  return /^[A-Z]$/.test(upper) ? upper : '#';
};

// 按首字母分组并排序
const sortedGroupedGroups = computed(() => {
  const groupsObj: Record<string, typeof groups.value> = {};
  filteredGroups.value.forEach(group => {
    const letter = getInitialLetter(group.name);
    if (!groupsObj[letter]) groupsObj[letter] = [];
    groupsObj[letter].push(group);
  });

  for (const letter in groupsObj) {
    groupsObj[letter].sort((a, b) => a.name.localeCompare(b.name));
  }

  const sortedKeys = Object.keys(groupsObj).sort((a, b) => (a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b)));
  const sortedObj: Record<string, typeof groups.value> = {};
  sortedKeys.forEach(k => sortedObj[k] = groupsObj[k]);
  return sortedObj;
});

// 字母索引
const indexLetters = computed(() => {
  const letters = Object.keys(sortedGroupedGroups.value);
  return letters.length > 0 ? letters : ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '#'];
});

// 页面加载时加载群聊列表
onMounted(() => {
  loadGroups();
  const content = contentRef.value?.$el as HTMLElement | undefined;
  if (content) {
    content.addEventListener('touchstart', detectSwipeDirection);
  }
});

onBeforeUnmount(() => {
  const content = contentRef.value?.$el as HTMLElement | undefined;
  if (content) {
    content.removeEventListener('touchstart', detectSwipeDirection);
  }
});

// 进入群聊
const enterGroupChat = (pub: string) => {
  setCurrentGroup(pub);
  router.push(`/group/${pub}/messages`);
};

// 跳转到密钥对页面
const gotoKey = () => {
  router.push('/group-key-pairs');
};

// 切换创建/加入群聊模态框
const toggleCreateGroupModal = (val?: boolean) => {
  showCreateGroupModal.value = typeof val === 'boolean' ? val : !showCreateGroupModal.value;
  if (!showCreateGroupModal.value) {
    newGroupName.value = '';
    joinGroupKey.value = '';
  }
};

// 滑动事件处理
const handleItemDrag = (event: CustomEvent) => {
  const { amount } = event.detail;
  if (Math.abs(amount) > 5) {
    document.body.classList.add('disable-scroll');
  }
};

const handleItemOpen = () => {
  isItemOpen.value = true;
  document.body.classList.add('disable-scroll');
};

const handleItemClose = () => {
  isItemOpen.value = false;
  setTimeout(() => {
    document.body.classList.remove('disable-scroll');
  }, 100);
};

const detectSwipeDirection = (event: TouchEvent) => {
  const touch = event.touches[0];
  const startX = touch.clientX;
  const startY = touch.clientY;

  const moveHandler = (moveEvent: TouchEvent) => {
    const moveTouch = moveEvent.touches[0];
    const deltaX = moveTouch.clientX - startX;
    const deltaY = moveTouch.clientY - startY;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 5) {
      document.body.classList.add('disable-scroll');
    }
  };

  const endHandler = () => {
    if (!isItemOpen.value) {
      setTimeout(() => {
        document.body.classList.remove('disable-scroll');
      }, 100);
    }
    document.removeEventListener('touchmove', moveHandler);
    document.removeEventListener('touchend', endHandler);
  };

  document.addEventListener('touchmove', moveHandler);
  document.addEventListener('touchend', endHandler);
};

// 滚动到字母分组
const scrollToLetter = (letter: string) => {
  const element = document.getElementById(`group-${letter}`);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
};

// 获取群聊头像
const getGunAvatar = (pub: string) => {
  return gunAvatar({
    pub: pub,
    round: false,
    size: 200,
    dark: isDark.value,
    svg: true,
  } as any);
};

// 搜索回车事件（可扩展为外部跳转，当前仅占位）
const onSearchEnter = async () => {
  // 暂时仅过滤列表，未来可扩展为外部搜索
  console.log('Search query:', searchQuery.value);
};
</script>

<style scoped>
.gun-avatar{
  width: 50px;
  height: 50px;
  border-radius: 50%;
  
}
.gun-group{
  position: absolute;
  z-index: -20;
  width: 100%;
  height: 200px;
  
  margin: 0;
  /* padding: 0; */
  /* padding:30px; */
  overflow: visible;
  /* filter: blur(30px); */
  /* object-fit: cover; */
}

.gradient-mask {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100vw;
  height: 10vh;
  background: linear-gradient(to top, var(--ion-background-color) 0%, rgba(0, 0, 0, 0) 100%);
  pointer-events: none;
  overflow: hidden;
  z-index: 1;
}

/* Toolbar */
.liquid-toolbar {
  --border-color: transparent;
}

/* Content */
.group-content {
  --background: transparent;
  position: relative;
  overflow: visible;
  touch-action: auto;
}

/* Group List */
.group-list {
  padding: 0;
  margin-bottom: 50px;
  background: transparent;
}

.group-header {
  --background: var(--ion-background-color, #fff);
  --color: var(--ion-color-step-600, #666);
  font-size: 12px;
  font-weight: 500;
  min-height: 10px;
  padding-left: 10px;
  padding-top: 3px;
  padding-bottom: 3px;
  text-transform: uppercase;
  position: sticky;
  top: 0px;
  z-index: 5;
}

.group-item {
  --inner-padding-end: 0;
  --min-height: 20px;
  height: 50px;
}

ion-avatar {
  width: 55px;
  height: 55px;
}

ion-item-option {
  padding: 0 15px;
  font-size: 14px;
  min-width: 60px;
}

/* Alphabetical Index Bar */
.index-bar {
  position: fixed;
  top: 60%;
  right: 5px;
  transform: translateY(-50%);
  width: 20px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: transparent;
  user-select: none;
  z-index: 10;
}

.index-letter {
  font-size: 10px;
  padding: 2px 0;
  cursor: pointer;
  text-align: center;
}

.index-letter:active {
  color: #38ffc0;
}

/* Group Count */
.group-count {
  display: block;
  text-align: center;
  padding: 10px 0;
  font-size: 12px;
  margin-bottom: 200px;
}

/* Modal Toolbar */
.liquid-toolbar1 {
  --border-color: transparent;
  border-radius: 20px;
  margin-bottom: 10px;
}

pre {
  background: #f4f4f4;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
}

/* 滑动优化样式 */
:global(.disable-scroll) {
  overflow: hidden !important;
  position: fixed;
  width: 100%;
  height: 100%;
  touch-action: none;
}

:deep(ion-item-sliding.item-sliding-active-slide) {
  overflow: hidden !important;
  touch-action: pan-x !important;
}

.group-list {
  touch-action: auto;
}

:global(.disable-scroll .group-content) {
  overflow: hidden !important;
}
</style>