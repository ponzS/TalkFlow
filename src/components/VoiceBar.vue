<template>
  <div 
    class="voice-bar-container"
    :class="{
      'my-message': isMyMessage,
      'other-message': !isMyMessage,
      'playing': isPlaying,
      'pending': isPending,
      'failed': isFailed
    }"
    :style="{ width: dynamicWidth }"
    @click="$emit('click')"
  >

     <!-- Duration Display -->
    <div class="voice-duration">
      {{ formattedDuration }}
    </div>
    <!-- Play/Pause Button -->
    <!-- <ion-button 
      fill="clear" 
      size="small" 
      class="voice-play-button"
    >
      <ion-icon 
        :icon="isPlaying ? pauseOutline : playOutline" 
        class="voice-icon"
      ></ion-icon>
    </ion-button> -->

    <!-- Spectrum Visualization -->
    <div class="voice-spectrum">
      <div 
        v-for="(bar, index) in spectrumBars" 
        :key="index"
        class="spectrum-bar"
        :class="{ 'active': isPlaying }"
        :style="{
          height: `${bar.height}px`,
          animationDelay: `${bar.delay}ms`
        }"
      ></div>
    </div>

 
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { IonButton, IonIcon } from '@ionic/vue';
import { playOutline, pauseOutline } from 'ionicons/icons';

interface Props {
  isPlaying?: boolean;
  isPending?: boolean;
  isFailed?: boolean;
  isMyMessage?: boolean;
  duration?: number; // in milliseconds
  remainingTime?: number; // in milliseconds
}

const props = withDefaults(defineProps<Props>(), {
  isPlaying: false,
  isPending: false,
  isFailed: false,
  isMyMessage: false,
  duration: 0,
  remainingTime: undefined
});

defineEmits<{
  click: [];
}>();

// Generate spectrum bars with random heights and delays
const spectrumBars = ref<Array<{ height: number; delay: number }>>([]);

const generateSpectrum = () => {
  const barCount = 20;
  const bars = [];
  
  for (let i = 0; i < barCount; i++) {
    // Create a wave-like pattern with some randomness
    const baseHeight = Math.sin((i / barCount) * Math.PI * 2) * 8 + 12;
    const randomVariation = (Math.random() - 0.5) * 6;
    const height = Math.max(4, Math.min(24, baseHeight + randomVariation));
    
    bars.push({
      height: height,
      delay: i * 50 // Stagger animation delays
    });
  }
  
  spectrumBars.value = bars;
};

// Format duration for display
const formattedDuration = computed(() => {
  const timeToShow = props.remainingTime ?? props.duration;
  if (!timeToShow || timeToShow <= 0) return '0s';
  
  // Use Math.ceil to round up to the nearest second for more accurate display
  const totalSeconds = Math.ceil(timeToShow / 1000);
  
  return `${totalSeconds}s`;
});

// Calculate dynamic width based on duration
const dynamicWidth = computed(() => {
  const duration = props.duration || 0;
  if (duration <= 0) return '90px';
  
  const durationInSeconds = duration / 1000;
  const maxDurationForFullWidth = 60; // 60 seconds = 100% width
  const minWidth = 150; // minimum width in px
  const maxWidth = 300; // maximum width in px
  
  if (durationInSeconds >= maxDurationForFullWidth) {
    return `${maxWidth}px`;
  }
  
  // Calculate proportional width: 90px + (190px * ratio)
  const ratio = durationInSeconds / maxDurationForFullWidth;
  const calculatedWidth = minWidth + (maxWidth - minWidth) * ratio;
  
  return `${Math.max(minWidth, calculatedWidth)}px`;
});

// Regenerate spectrum when playing state changes to create dynamic effect
watch(() => props.isPlaying, (newPlaying) => {
  if (newPlaying) {
    // Regenerate spectrum every 500ms while playing
    const interval = setInterval(() => {
      if (props.isPlaying) {
        generateSpectrum();
      } else {
        clearInterval(interval);
      }
    }, 500);
  }
});

onMounted(() => {
  generateSpectrum();
});
</script>

<style scoped>
.voice-bar-container {
  display: flex;
  align-items: center;
  /* gap: 1px; */
  padding: 8px 5px;
  border-radius: 30px 30px 30px 5px;
  background: var(--ion-color-dark-contrast);
  cursor: pointer;
  transition: all 0.3s ease;
  height: 44px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

/* My message styling */
.voice-bar-container.my-message {
  background: #0165d7;
  color: #fff;
  border-radius: 30px 30px 5px 30px;
}



/* Failed state */
.voice-bar-container.failed {
  background: #ff9999;
  opacity: 0.8;
}

/* Play button */
.voice-play-button {
  --padding-start: 6px;
  --padding-end: 6px;
  --padding-top: 6px;
  --padding-bottom: 6px;
  margin: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  flex-shrink: 0;
}

.voice-icon {
  font-size: 16px;
  color: inherit;
}

.my-message .voice-icon {
  color: #fff;
}

/* Spectrum visualization */
.voice-spectrum {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  height: 28px;
  /* padding: 0 8px; */
}

.spectrum-bar {
  width: 3px;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 2px;
  transition: all 0.2s ease;
  transform-origin: bottom;
}

.my-message .spectrum-bar {
  background: rgba(255, 255, 255, 0.6);
}

.other-message .spectrum-bar {
  background: var(--ion-text-color);
}

/* Active spectrum animation */
.spectrum-bar.active {
  background: rgba(255, 255, 255, 0.9);
  animation: spectrumWave 1.2s ease-in-out infinite;
}

.my-message .spectrum-bar.active {
  background: rgba(255, 255, 255, 1);
}

.other-message .spectrum-bar.active {
  background: var(--ion-text-color);
}

/* Duration display */
.voice-duration {
  font-size: 12px;
  font-weight: 500;
  color: var(--ion-text-color);
  min-width: 30px;
  text-align: right;
  flex-shrink: 0;
}

.my-message .voice-duration {
  color: rgba(255, 255, 255, 0.9);
}

.other-message .voice-duration {
  color: var(--ion-text-color);
}

/* Animations */
@keyframes gradientBreath {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes spectrumWave {
  0%, 100% { 
    transform: scaleY(0.3);
    opacity: 0.6;
  }
  50% { 
    transform: scaleY(1);
    opacity: 1;
  }
}


</style>