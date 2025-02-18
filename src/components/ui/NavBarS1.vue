<template>
  <!-- 动态绑定 .scrolled 类：只有当 isScrolled 为 true 时才添加 -->
  <nav class="navbar" :class="{ scrolled: isScrolled }">
    <div class="navbar-brand">
      <slot name="brand"></slot>
    </div>
    <ul class="nav-links">
      <slot name="links"></slot>
    </ul>
  </nav>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const scrollContainer = document.querySelector('.scroll-container')

const isScrolled = ref(false)

const handleScroll = () => {
  console.log('scrollY:', window.scrollY) // 调试输出
  if (!isScrolled.value && window.scrollY >= 300) {
    isScrolled.value = true
  }
}

onMounted(() => {
  scrollContainer?.addEventListener('scroll', handleScroll)
})
onUnmounted(() => {
  scrollContainer?.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
.searchbar {
  display: flex;
  justify-content: end;
  align-items: center;
  margin-top: 10px;
  z-index: 9999;
}
.i-material-symbols-add-circle-outline {
  --un-icon: url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 24 24' width='1.2em' height='1.2em' xmlns='http://www.w3.org/2000/svg' %3E%3Cpath fill='currentColor' d='M11 17h2v-4h4v-2h-4V7h-2v4H7v2h4zm1 5q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22m0-2q3.35 0 5.675-2.325T20 12t-2.325-5.675T12 4T6.325 6.325T4 12t2.325 5.675T12 20m0-8'/%3E%3C/svg%3E");
  -webkit-mask: var(--un-icon) no-repeat;
  mask: var(--un-icon) no-repeat;
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  background-color: currentColor;
  color: inherit;
  width: 1.5em;
  height: 1.5em;
}

.navbar {

  display: flex;
  justify-content: space-between;
  align-items: center;

  color: var(--text-color);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 100px;
  padding: 50px 20px 0 20px;
  z-index: 1000;
  overflow: hidden;
  transition: all 0.3s ease-in-out;
}

.scrolled {
  backdrop-filter: blur(20px);
  transition: all 0.3s ease-in-out;
}

.navbar-brand {
  display: flex;
  align-items: center;
}

.title {
  font-size: 1.5rem;
  font-weight: bold;
}

.nav-links {
  list-style: none;
  display: flex;
  gap: 15px;
}

.nav-links a {
  text-decoration: none;
  color: #333333;
  font-size: 1rem;
}
</style>
