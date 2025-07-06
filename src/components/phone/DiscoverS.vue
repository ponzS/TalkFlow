<template>
  <ion-page>
    <ion-content :fullscreen="true" class="desktop-content">
      <div class="desktop-header">
        <div class="desktop-title"></div>
        <div class="header-actions">
          <div class="edit-mode-indicator" v-if="isEditMode">
            <span>Edit Mode</span>
            <div class="edit-buttons">
              <!-- <ion-button fill="clear" size="small" @click="showConfigFile" color="secondary">
                查看配置
              </ion-button> -->
              <ion-button fill="clear" size="small" @click="resetIconsToDefault" color="warning">
                Reset
              </ion-button>
              <ion-button fill="clear" size="small" @click="exitEditMode" color="primary">
                OK
              </ion-button>
            </div>
          </div>
          <div v-else class="edit-controls">
            <ion-button fill="clear" size="small" @click="enterEditMode" color="primary">
              <ion-icon :icon="pencilOutline" slot="start"></ion-icon>
              Edit
            </ion-button>
          </div>
        </div>
              </div>

      <!-- 拖拽模式提示 -->
      <div v-if="isEditMode" class="drag-hint">
        <div class="drag-hint-content">
          <ion-icon :icon="moveOutline" class="hint-icon"></ion-icon>
          <span class="hint-text">Drag and drop icons to reorder them</span>
        </div>
      </div>

      <div 
        ref="gridContainer"
        class="grid-wrapper"
        @touchstart="handleGridTouchStart"
        @touchend="handleGridTouchEnd"
        @touchmove="handleGridTouchMove"
      >
        <Sortable
          v-model:list="visibleIcons"
          item-key="id"
          class="desktop-grid"
          :class="{ 'edit-mode': isEditMode }"
          :options="{
            animation: 300,
            ghostClass: 'ghost-item',
            chosenClass: 'chosen-item',
            dragClass: 'drag-item',
            disabled: !isEditMode
          }"
          @update="handleSortUpdate"
          @start="handleSortStart"
          @end="handleSortEnd"
        >
          <template #item="{ element: icon }">
            <div
              :ref="(el) => setIconRef(el, icon.id)"
              class="desktop-icon"
              :class="{ 'wiggle': isEditMode }"
              @click="handleIconClick(icon)"
              @contextmenu.prevent="handleContextMenu"
              @touchstart="(e) => handleIconTouchStart(e, icon)"
              @touchend="handleIconTouchEnd"
              @touchmove="handleIconTouchMove"
            >
              <div class="icon-container">
                <ion-icon :icon="getIconByName(icon.icon)" class="app-icon" />
              </div>
              <span class="icon-label">{{ icon.name }}</span>
            </div>
          </template>
        </Sortable>
      </div>

      <!-- <img  src="@/assets/gun.svg" style="margin-top: 4%; width: 30%; min-width: 250px;color:var(--ion-text-color);">
       -->
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonContent,
  IonIcon,
  IonButton
} from '@ionic/vue'
import { useRouter } from 'vue-router'
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { onLongPress } from '@vueuse/core'
import {
  pulseOutline,
  qrCodeOutline,
  codeSlashOutline,
  browsersOutline,
  rocketOutline,
  pencilOutline,
  moveOutline
} from 'ionicons/icons'
import { Sortable } from 'sortablejs-vue3'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import desktopIconsConfig from '../../config/desktopIcons.json'
import { getTalkFlowCore } from '../../composables/TalkFlowCore'

// 图标映射
const iconMap = {
  pulseOutline,
  qrCodeOutline,
  codeSlashOutline,
  browsersOutline,
  rocketOutline,
  pencilOutline
}

// 接口定义
interface DesktopIcon {
  id: string
  name: string
  icon: string
  route: string
  component: string
  order: number
  visible: boolean
}

const chatFlowStore = getTalkFlowCore()
const { fullscreenModalVisible, showToast } = chatFlowStore
const router = useRouter()

// 组件状态
const icons = ref<DesktopIcon[]>([])
const isEditMode = ref(false)
const visibleIcons = ref<DesktopIcon[]>([])

// 长按相关状态
const gridContainer = ref<HTMLElement>()
const iconRefs = ref<Map<string, HTMLElement>>(new Map())
const longPressTimer = ref<number | null>(null)
const touchStartPosition = ref({ x: 0, y: 0 })
const hasMoved = ref(false)

// 接收模态导航属性
const props = defineProps<{
  modalNavigation?: {
    navigateToModalComponent: (componentName: string) => Promise<void>
    goBackInModal: () => Promise<void>
    canGoBack: boolean
  }
}>()

// 检查是否在模态窗口内
const isInModal = computed(() => !!props.modalNavigation)

// 更新可见图标列表
function updateVisibleIcons() {
  visibleIcons.value = icons.value
    .filter(icon => icon.visible)
    .sort((a, b) => a.order - b.order)
}

// 生命周期
onMounted(() => {
  loadIcons()
})

onUnmounted(() => {
  clearLongPressTimer()
})

// 读取图标配置文件
async function loadIconsFromFile() {
  try {
    const result = await Filesystem.readFile({
      path: 'desktop-icons-order.json',
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    })
    
    const parsedData = JSON.parse(result.data as string)
    icons.value = parsedData
    console.log('从文件加载图标配置成功')
  } catch (error) {
    console.log('文件不存在或读取失败，使用默认配置:', error)
    icons.value = [...desktopIconsConfig.icons]
    // 首次使用时保存默认配置
    await saveIconsToFile()
  }
}

// 保存图标配置到文件
async function saveIconsToFile() {
  try {
    await Filesystem.writeFile({
      path: 'desktop-icons-order.json',
      data: JSON.stringify(icons.value, null, 2),
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    })
    console.log('图标配置已保存到文件')
  } catch (error) {
    console.error('保存图标配置失败:', error)
    showToast('保存配置失败', 'error')
  }
}

// 加载图标配置（兼容方式）
async function loadIcons() {
  await loadIconsFromFile()
  updateVisibleIcons()
}

// 保存图标配置（兼容方式）
async function saveIcons() {
  await saveIconsToFile()
}

// 重置图标配置为默认值
async function resetIconsToDefault() {
  icons.value = [...desktopIconsConfig.icons]
  updateVisibleIcons()
  await saveIcons()
  showToast('🔄 已重置为默认图标顺序', 'success')
}

// 调试：显示当前配置文件内容
async function showConfigFile() {
  try {
    const result = await Filesystem.readFile({
      path: 'desktop-icons-order.json',
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    })
    console.log('当前配置文件内容:', result.data)
    showToast('配置文件内容已输出到控制台', 'success')
  } catch (error) {
    console.error('读取配置文件失败:', error)
    showToast('读取配置文件失败', 'error')
  }
}

// 处理排序更新
async function handleSortUpdate(event: any) {
  console.log('排序更新:', event)
  if (event.oldIndex !== undefined && event.newIndex !== undefined) {
    await updateIconOrder(event.oldIndex, event.newIndex)
  }
}

// 处理排序开始
function handleSortStart() {
  console.log('开始拖拽')
}

// 处理排序结束
function handleSortEnd() {
  console.log('结束拖拽')
}

// 更新图标顺序
async function updateIconOrder(oldIndex: number, newIndex: number) {
  console.log(`移动图标从位置 ${oldIndex} 到 ${newIndex}`)
  
  // 直接更新visibleIcons中的顺序
  const [movedIcon] = visibleIcons.value.splice(oldIndex, 1)
  visibleIcons.value.splice(newIndex, 0, movedIcon)
  
  // 重新分配order值
  visibleIcons.value.forEach((icon, index) => {
    icon.order = index + 1
  })
  
  // 更新原始icons数组中对应图标的order
  icons.value = icons.value.map(icon => {
    const updatedIcon = visibleIcons.value.find(sorted => sorted.id === icon.id)
    return updatedIcon ? { ...icon, order: updatedIcon.order } : icon
  })
  
  // 保存到JSON文件
  await saveIcons()
  showToast('🎉 图标顺序已更新并保存！', 'success')
}

// 获取图标
function getIconByName(iconName: string) {
  return iconMap[iconName as keyof typeof iconMap] || pulseOutline
}

// 处理图标点击
function handleIconClick(icon: DesktopIcon) {
  if (isEditMode.value) return
  
  if (isInModal.value && props.modalNavigation) {
    props.modalNavigation.navigateToModalComponent(icon.component)
  } else {
    fullscreenModalVisible.value = false
    router.push(icon.route)
  }
}

// 进入编辑模式
function enterEditMode() {
  console.log('进入编辑模式')
  isEditMode.value = true
  showToast('🎯 编辑模式已激活！拖拽图标可调整顺序', 'success')
}

// 退出编辑模式
function exitEditMode() {
  console.log('退出编辑模式')
  isEditMode.value = false
  
  // 强制清除所有长按状态
  clearLongPressTimer()
  hasMoved.value = false
  
  // 强制移除所有图标的变换效果，确保动画停止
  nextTick(() => {
    const iconElements = document.querySelectorAll('.desktop-icon')
    iconElements.forEach((element: Element) => {
      const htmlElement = element as HTMLElement
      htmlElement.style.transform = ''
      htmlElement.style.animation = ''
      // 强制重新渲染
      htmlElement.offsetHeight
    })
  })
  
  showToast('✅ 已退出编辑模式', 'success')
}

// 处理右键菜单（进入编辑模式的快捷方式）
function handleContextMenu() {
  if (!isEditMode.value) {
    enterEditMode()
    if (navigator.vibrate) {
      navigator.vibrate(50)
    }
  }
}

// 设置图标ref
function setIconRef(el: any, iconId: string) {
  if (el) {
    iconRefs.value.set(iconId, el)
  }
}

// 清除长按计时器
function clearLongPressTimer() {
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }
}

// 图标触摸开始
function handleIconTouchStart(event: TouchEvent, icon: DesktopIcon) {
  if (isEditMode.value) return // 编辑模式下不处理长按
  
  event.stopPropagation() // 防止触发网格的长按
  
  const touch = event.touches[0]
  touchStartPosition.value = { x: touch.clientX, y: touch.clientY }
  hasMoved.value = false
  
  clearLongPressTimer()
  
  // 设置长按计时器
  longPressTimer.value = window.setTimeout(() => {
    if (!hasMoved.value) {
      enterEditMode()
      // 强触觉反馈
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100])
      }
      console.log('图标长按进入编辑模式:', icon.name)
    }
  }, 600) // 600ms长按时间
}

// 图标触摸移动
function handleIconTouchMove(event: TouchEvent) {
  if (isEditMode.value) return
  
  const touch = event.touches[0]
  const deltaX = Math.abs(touch.clientX - touchStartPosition.value.x)
  const deltaY = Math.abs(touch.clientY - touchStartPosition.value.y)
  
  // 如果移动距离超过阈值，取消长按
  if (deltaX > 10 || deltaY > 10) {
    hasMoved.value = true
    clearLongPressTimer()
  }
}

// 图标触摸结束
function handleIconTouchEnd(event: TouchEvent) {
  clearLongPressTimer()
  hasMoved.value = false
}

// 网格触摸开始
function handleGridTouchStart(event: TouchEvent) {
  if (isEditMode.value) return
  
  // 检查是否点击在图标上
  const target = event.target as HTMLElement
  if (target.closest('.desktop-icon')) {
    return // 如果点击在图标上，不处理网格长按
  }
  
  const touch = event.touches[0]
  touchStartPosition.value = { x: touch.clientX, y: touch.clientY }
  hasMoved.value = false
  
  clearLongPressTimer()
  
  // 设置长按计时器
  longPressTimer.value = window.setTimeout(() => {
    if (!hasMoved.value) {
      enterEditMode()
      // 轻触觉反馈
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
      console.log('空白区域长按进入编辑模式')
    }
  }, 800) // 800ms长按时间，比图标稍长
}

// 网格触摸移动
function handleGridTouchMove(event: TouchEvent) {
  if (isEditMode.value) return
  
  const touch = event.touches[0]
  const deltaX = Math.abs(touch.clientX - touchStartPosition.value.x)
  const deltaY = Math.abs(touch.clientY - touchStartPosition.value.y)
  
  // 如果移动距离超过阈值，取消长按
  if (deltaX > 15 || deltaY > 15) {
    hasMoved.value = true
    clearLongPressTimer()
  }
}

// 网格触摸结束
function handleGridTouchEnd(event: TouchEvent) {
  clearLongPressTimer()
  hasMoved.value = false
}
</script>

<style scoped>
.desktop-content {
  --background: var(--ion-background-color);
  padding: 20px;
  height: 100%;
  overflow-y: auto;
  user-select: none;
}

.desktop-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 0 10px;
}

.desktop-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--ion-text-color);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.edit-mode-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--ion-color-primary);
  font-size: 14px;
}

.edit-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.drag-hint {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 12px 20px;
  margin: 10px 20px;
  background: rgba(var(--ion-color-primary-rgb), 0.1);
  border: 1px dashed var(--ion-color-primary);
  border-radius: 12px;
  animation: fadeInSlide 0.3s ease-out;
}

.drag-hint-content {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--ion-color-primary);
}

.hint-icon {
  font-size: 18px;
  animation: float 2s ease-in-out infinite;
}

.hint-text {
  font-size: 14px;
  font-weight: 500;
  opacity: 0.9;
}

@keyframes fadeInSlide {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-3px);
  }
}

.edit-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.edit-controls ion-button {
  --color: var(--ion-color-primary);
  --background: rgba(var(--ion-color-primary-rgb), 0.1);
  --border-radius: 20px;
  --padding-start: 12px;
  --padding-end: 12px;
  --padding-top: 6px;
  --padding-bottom: 6px;
  font-size: 14px;
  font-weight: 500;
}

.edit-controls ion-button:hover {
  --background: rgba(var(--ion-color-primary-rgb), 0.2);
}

.grid-wrapper {
  width: 100%;
  min-height: 60vh;
  touch-action: manipulation;
  -webkit-touch-callout: none;
  user-select: none;
}

.desktop-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 30px;
  padding: 20px;
  max-width: 600px;
  margin: 0 auto;
}

.desktop-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s ease, transform 0.3s ease;
  position: relative;
  user-select: none;
  touch-action: manipulation;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  transform: rotate(0deg); /* 确保有初始transform值 */
}

.desktop-icon.wiggle {
  animation: wiggle 0.5s ease-in-out infinite alternate;
  transition: none; /* 在动画期间禁用transition */
}

/* 当退出编辑模式时，确保平滑回到原位 */
.desktop-icon:not(.wiggle) {
  transform: rotate(0deg) !important;
  animation: none !important;
}

.icon-container {
  position: relative;
  width: 60px;
  height: 60px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.app-icon {
  font-size: 28px;
  color: var(--ion-color-primary);
}

.icon-label {
  font-size: 12px;
  color: var(--ion-text-color);
  text-align: center;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

.desktop-icon:hover .icon-container {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.desktop-icon:active .icon-container {
  transform: scale(0.95);
}

/* SortableJS 相关样式 */
.ghost-item {
  opacity: 0.5;
  background: rgba(var(--ion-color-primary-rgb), 0.1);
  border-radius: 16px;
}

.chosen-item {
  transform: scale(1.05);
  z-index: 999;
}

.drag-item {
  transform: rotate(5deg);
  opacity: 0.9;
}

@keyframes wiggle {
  0% { transform: rotate(-1deg); }
  100% { transform: rotate(1deg); }
}

/* 响应式调整 */
@media (max-width: 600px) {
  .desktop-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
    padding: 10px;
  }
  
  .icon-container {
    width: 55px;
    height: 55px;
    border-radius: 14px;
  }
  
  .app-icon {
    font-size: 24px;
  }
  
  .icon-label {
    font-size: 11px;
    max-width: 70px;
  }

  .drag-hint {
    margin: 8px 15px;
    padding: 10px 16px;
  }

  .hint-text {
    font-size: 13px;
  }

  .hint-icon {
    font-size: 16px;
  }
}

@media (max-width: 400px) {
  .desktop-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 15px;
  }
}
</style>