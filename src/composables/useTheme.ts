// src/composables/useTheme.ts
import { ref, onMounted, onUnmounted } from 'vue';

export function useTheme() {
  // 响应式主题状态，确保始终是布尔值
  const isDark = ref<boolean>(false);

  // 检查当前主题的函数
  function checkDarkMode() {
    isDark.value = !!window.matchMedia('(prefers-color-scheme: dark)').matches; // 强制转换为布尔值
  }

  // 监听设备主题变化
  onMounted(() => {
    // 初始化主题状态
    checkDarkMode();

    // 创建媒体查询对象
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    // 定义监听器
    const handleThemeChange = (e: MediaQueryListEvent) => {
      isDark.value = !!e.matches; // 确保布尔值
      console.log('Theme changed to:', isDark.value ? 'dark' : 'light'); // 调试用
    };

    // 添加监听器
    mediaQuery.addEventListener('change', handleThemeChange);

    // 返回清理函数
    onUnmounted(() => {
      mediaQuery.removeEventListener('change', handleThemeChange);
    });
  });

  // 返回响应式主题状态
  return {
    isDark, // 当前是否为暗主题
    checkDarkMode, // 手动检查主题的方法（可选）
  };
}