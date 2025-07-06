<!-- eslint-disable vue/no-parsing-error -->
<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div v-if="isVisible">
    <swiper
      direction="vertical"
      ref="mySwiper"
      :allowTouchMove="true"
      @swiper="onSwiper"
      @slideChange="onSlideChange"
      class="my-swiper"
    >

      <swiper-slide>
        <div class="language-selection-page">
          <div class="talkflow-title">
            <div class="talkflow-title-text">
              <p><span style="color: black">Talk</span><span>Flow</span></p>
            </div>
          </div>

          <p class="touch-to-start"><div class="i-line-md-chevron-double-up"/> </p>
        </div>
      </swiper-slide>

      <swiper-slide></swiper-slide>
    </swiper>
  </div>
</template>

<script lang="ts">
import { Swiper, SwiperSlide } from 'swiper/vue'
import { Swiper as SwiperType } from 'swiper'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

export default {
  components: {
    Swiper,
    SwiperSlide,
  },
  data() {
    return {
      isVisible: true, // 控制组件可见性
      swiperInstance: null as SwiperType | null,
    }
  },
  methods: {
    onSwiper(swiper: SwiperType) {
      this.swiperInstance = swiper;
      // 禁用向前滑动（向下滑动）
      swiper.allowSlidePrev = false;
      // 确保允许向后滑动（向上滑动）
      swiper.allowSlideNext = true;

      // 监听触摸事件，防止通过手势重新启用向前滑动
      swiper.on('touchMove', (swiperInstance: SwiperType, event: Event) => {
      if (swiperInstance.translate > 0) {
        event.preventDefault();
        swiperInstance.setTranslate(0);
      }
    });
    },
    onSlideChange(swiper: SwiperType) {
      if (swiper.activeIndex === 1) {

        this.isVisible = false
      }
    },
  },
}
</script>

<style scoped>

.i-line-md-chevron-double-up {
  --un-icon: url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 24 24' width='1.2em' height='1.2em' xmlns='http://www.w3.org/2000/svg' %3E%3Cg fill='none' stroke='currentColor' stroke-dasharray='12' stroke-dashoffset='12' stroke-linecap='round' stroke-linejoin='round' stroke-width='2'%3E%3Cpath d='M12 5l-7 7M12 5l7 7'%3E%3Canimate fill='freeze' attributeName='stroke-dashoffset' dur='0.3s' values='12;0'/%3E%3C/path%3E%3Cpath d='M12 11l-7 7M12 11l7 7'%3E%3Canimate fill='freeze' attributeName='stroke-dashoffset' begin='0.3s' dur='0.3s' values='12;0'/%3E%3C/path%3E%3C/g%3E%3C/svg%3E");
  -webkit-mask: var(--un-icon) no-repeat;
  mask: var(--un-icon) no-repeat;
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  background-color: currentColor;
  color: inherit;
  width: 1.2em;
  height: 1.2em;
}


.my-swiper {
  height: 100vh;
  width: 100%;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1000;

}

.swiper-slide {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 其他样式保持不变 */
.touch-to-start {
  /* margin-bottom: 10%; */
  position: fixed;
  bottom: 3%;
  font-size: 30px;
  color: #ffffff;
  transform: translateY(-10px);
  transition: all 0.3s ease-in-out;
  animation: touch-to-start-animation 5s ease-in-out infinite;
}

@keyframes touch-to-start-animation {
  0% {
    transform: translateY(-5px);
  }
  25% {
    transform: translateY(5px);
  }
  50% {
    transform: translateY(-5px);
  }
  75% {
    transform: translateY(5px);
  }
  100% {
    transform: translateY(-5px);
  }
}

.talkflow-title {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  width: 100%;
}

.talkflow-title-text {
  font-size: 80px;
  font-weight: bold;
  color: transparent;
  -webkit-text-stroke: 1px rgba(0, 0, 0, 0);
  background: linear-gradient(-45deg, #ee7652, #e73c7e, #23a5d5, #23d5ab);
  -webkit-background-clip: text;
  background-clip: text;
  z-index: 1;
  background-size: 200% 200%;
  animation: gradientBreath 10s ease infinite;
}

/* 其他样式保持不变 */
.language-selection-page {
  overflow: hidden;
  position: fixed;
  top: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  height: 100vh;
  width: 100%;
  background: linear-gradient(-45deg, #ee765294, #e73c7e90, #23a5d583, #23d5ab93);
  background-color: var(--background-color);
  background-size: 200% 200%;
  animation: gradientBreath 10s ease infinite;
  transition: all 0.3s ease-in-out;
}

.language-selection-page:active {
  background-color: var(--text-color);
  transition: all 0.3s ease-in-out;
}

.language-selection-page:active .touch-to-start {

  transition: all 0.3s ease-in-out;
  /* animation: none; */
  color: #aaaaaa;
}

@keyframes gradientBreath {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

.header {
  margin-top: 100px;
}

.header h1 {
  font-size: 24px;
  color: #333;
}

.language-options {
  box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.1);
  background-color: #89898940;
  backdrop-filter: blur(10px);
  border-radius: 20px;
  width: 100%;
  margin-bottom: 0;
  padding-top: 10px;
  padding-left: 10px;
  padding-right: 10px;
  padding-bottom: 30px;
  max-height: 39vh;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #c3cfe2 #f5f5f5;
}

.language-options::-webkit-scrollbar {
  width: 8px;
}

.language-options::-webkit-scrollbar-track {
  background: var(--background-color);
  border-radius: 4px;
}

.language-options::-webkit-scrollbar-thumb {
  background-color: var(--text-color);
  border-radius: 4px;
  border: 2px solid var(--background-color);
}

.option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  margin: 10px 0;
  background-color: var(--background-color);
  color: var(--text-color);
  border-radius: 10px;
  cursor: pointer;
}

.option.active {
  background-color: var(--button-color);
  color: var(--background-color);
}

.language-name {
  font-size: 18px;
}

.language-flag {
  font-size: 18px;
}

.language-options-container {
  width: 100%;
  display: flex;
  justify-content: center;
}
</style>
