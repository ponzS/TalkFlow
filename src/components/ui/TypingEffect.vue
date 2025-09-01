<template>
  <h1 class="index-typing-effect">
    {{ currentMessage }}
    <span class="cursor"></span>
  </h1>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { useTheme } from '@/composables/useTheme'


const messages = [
  'Hello, World ! ', // 英文
  '你好, 世界 ! ', // 中文
  'Привет, мир ! ', // 俄语
  'Hallo Welt ! ', // 德语
  'Bonjour le monde ! ', // 法语
  'こんにちは、世界 ! ', // 日语
  'مرحبا بالعالم ! ', // 阿拉伯语
  '¡Hola, Mundo! ', // 西班牙语
  'Ciao, Mondo! ', // 意大利语
  'नमस्ते, दुनिया! ', // 印度语
]

const currentMessage = ref('')
const messageIndex = ref(0)
const typingSpeed = 100 // 打字速度
const deletingSpeed = 50 // 删除速度
const displayDuration = 2000 // 每条消息展示的时间
const displayDuration2 = 500 // 停顿时间
const isDeleting = ref(false)
const charIndex = ref(0)

const type = () => {
  const fullMessage = messages[messageIndex.value]

  if (isDeleting.value) {
    currentMessage.value = fullMessage.substring(0, charIndex.value--)
    if (charIndex.value < 0) {
      isDeleting.value = false
      messageIndex.value = (messageIndex.value + 1) % messages.length
      charIndex.value = 0
      setTimeout(type, displayDuration2) // 停顿后再开始打字
      return
    }
  } else {
    currentMessage.value = fullMessage.substring(0, charIndex.value++)
    if (charIndex.value === fullMessage.length) {
      isDeleting.value = true
      setTimeout(type, displayDuration) // 完成打字后停顿
      return
    }
  }

  setTimeout(type, isDeleting.value ? deletingSpeed : typingSpeed)
}

onMounted(() => {
  type()
})
</script>

<style scoped>
.index-typing-effect {
  cursor: pointer;
  font-size: 100px;
  font-weight: bold;
  display: flex;

  align-items: center;
}

.cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  background-color: currentColor;
  margin-left: 5px;
  animation: blink 1s steps(2, start) infinite;
}

@keyframes blink {
  to {
    visibility: hidden;
  }
}

@media (max-width: 768px) {
  .index-typing-effect {
    font-size: 50px;
  }
}
</style>
