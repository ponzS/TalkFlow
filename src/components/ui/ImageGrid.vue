<template>
  <div class="image-grid" :class="gridClass">
    <div 
      v-for="(image, index) in images" 
      :key="index" 
      class="image-item"
      @click="openImageViewer(index)"
    >
      <img 
        :src="image" 
        :alt="`Image ${index + 1}`"
        class="grid-image"
        @load="onImageLoad"
        @error="onImageError"
      />
      <!-- 如果图片数量超过9张，在第9张图片上显示剩余数量 -->>
      <div v-if="index === 8 && images.length > 9" class="more-overlay">
        <span class="more-text">+{{ images.length - 9 }}</span>
      </div>
    </div>
  </div>

  <!-- 图片查看器 -->
  <ImageMessage 
    v-if="selectedImageIndex !== -1"
    :image-src="images[selectedImageIndex]"
    :alt="`Image ${selectedImageIndex + 1}`"
    ref="imageViewer"
   
  />
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import ImageMessage from './ImageMessage.vue';

// Props
interface Props {
  images: string[];
  maxImages?: number;
}

const props = withDefaults(defineProps<Props>(), {
  maxImages: 9
});

// 响应式数据
const selectedImageIndex = ref(-1);
const imageViewer = ref<InstanceType<typeof ImageMessage>>();

// 计算属性
const displayImages = computed(() => {
  return props.images.slice(0, props.maxImages);
});

const gridClass = computed(() => {
  const count = displayImages.value.length;
  if (count === 1) return 'grid-single';
  if (count === 2) return 'grid-two';
  if (count === 3) return 'grid-three';
  if (count === 4) return 'grid-four';
  if (count <= 6) return 'grid-six';
  return 'grid-nine';
});

// 方法
const openImageViewer = (index: number) => {
  selectedImageIndex.value = index;
  // 触发ImageMessage组件的图片查看器
  nextTick(() => {
    if (imageViewer.value) {
      // 直接调用ImageMessage的openImageViewer方法
      (imageViewer.value as any).openImageViewer();
    }
  });
};

const onImageLoad = () => {
  // 图片加载成功处理
};

const onImageError = () => {
  // 图片加载失败处理
};
</script>

<style scoped>
.image-grid {
  display: grid;
  gap: 2px;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 12px;
}

/* 单张图片 */
.grid-single {
  grid-template-columns: 1fr;
  max-width: 300px;
}

.grid-single .image-item {
  aspect-ratio: auto;
}

.grid-single .grid-image {
  max-height: 400px;
  width: 100%;
  object-fit: cover;
}

/* 两张图片 */
.grid-two {
  grid-template-columns: 1fr 1fr;
  max-width: 300px;
}

.grid-two .image-item {
  aspect-ratio: 1;
}

/* 三张图片 */
.grid-three {
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  max-width: 300px;
}

.grid-three .image-item:first-child {
  grid-row: 1 / 3;
  aspect-ratio: 1;
}

.grid-three .image-item:not(:first-child) {
  aspect-ratio: 1;
}

/* 四张图片 */
.grid-four {
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  max-width: 300px;
}

.grid-four .image-item {
  aspect-ratio: 1;
}

/* 五到六张图片 */
.grid-six {
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  max-width: 300px;
}

.grid-six .image-item {
  aspect-ratio: 1;
}

/* 七到九张图片 */
.grid-nine {
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr 1fr;
  max-width: 300px;
}

.grid-nine .image-item {
  aspect-ratio: 1;
}

/* 图片项样式 */
.image-item {
  position: relative;
  cursor: pointer;
  overflow: hidden;
  background: var(--ion-color-light);
}

.grid-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s ease;
}

.image-item:hover .grid-image {
  transform: scale(1.05);
}

/* 更多图片覆盖层 */
.more-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 18px;
}

.more-text {
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .image-grid {
    max-width: 280px;
  }
  
  .grid-single {
    max-width: 280px;
  }
  
  .grid-two,
  .grid-three,
  .grid-four,
  .grid-six,
  .grid-nine {
    max-width: 280px;
  }
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  .image-item {
    background: var(--ion-color-dark);
  }
}
</style>