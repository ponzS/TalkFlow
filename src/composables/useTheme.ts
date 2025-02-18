import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue'

const themes = ['light', 'dark']
// const currentTheme = ref(themes[0])
const isAnimating = ref(false)
const textColor = ref('')

// 检测系统主题
const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

// 默认使用设备主题
const currentTheme = ref(themes[0]) // 初始化为浅色主题

onMounted(() => {

  currentTheme.value = mediaQuery.matches ? themes[1] : themes[0]
  document.body.className = currentTheme.value
})

// 监听主题变化
const handleMediaChange = (event: MediaQueryListEvent) => {
  currentTheme.value = event.matches ? themes[1] : themes[0]
  document.body.className = currentTheme.value // 更新 body 的类名
}

// 添加监听器
mediaQuery.addEventListener('change', handleMediaChange)

const toggleTheme = async (event: MouseEvent) => {
  // 禁用滚动
  document.body.style.overflow = 'hidden'
  // 切换图标
  currentTheme.value = currentTheme.value === themes[0] ? themes[1] : themes[0]

  // 执行动画
  isAnimating.value = true
  const button = event.currentTarget as HTMLElement
  const rect = button.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2

  // 创建一个覆盖层
  const overlay = document.createElement('div')
  overlay.classList.add('theme-overlay')
  overlay.style.left = `${centerX}px`
  overlay.style.top = `${centerY}px`

  document.body.appendChild(overlay)

  // 强制重绘以确保动画开始
  await nextTick()
  document.body.classList.add('animating')
  // 触发动画
  overlay.classList.add('expand')
  textColor.value = currentTheme.value === themes[0] ? '#ffffff' : '#000000'

  overlay.addEventListener('animationend', () => {
    document.body.className = currentTheme.value
    // 移除覆盖层
    overlay.remove()
    document.body.classList.remove('animating')

    // 启用滚动
    document.body.style.overflow = ''
    isAnimating.value = false
  })
}

const toggleTheme1 = async (event: MouseEvent) => {
  // 禁用滚动
  document.body.style.overflow = 'hidden'
  // 切换图标
  currentTheme.value = currentTheme.value === themes[0] ? themes[1] : themes[0]
  document.body.className = currentTheme.value
  // 执行动画
  isAnimating.value = true
  // 获取按钮
  const button = event.currentTarget as HTMLElement
  // 获取按钮的矩形
  const rect = button.getBoundingClientRect()
  // 计算中心点
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2

  // 创建一个覆盖层
  const overlay = document.createElement('div')
  overlay.classList.add('theme-overlay1')
  overlay.style.left = `${centerX}px`
  overlay.style.top = `${centerY}px`

  document.body.appendChild(overlay)

  // 强制重绘以确保动画开始
  await nextTick()
  document.body.classList.add('animating1')
  // 触发动画
  overlay.classList.add('expand1')
  textColor.value = currentTheme.value === themes[0] ? '#ffffff' : '#000000'

  overlay.addEventListener('animationend', () => {
    // 移除覆盖层
    overlay.remove()
    document.body.classList.remove('animating1')

    // 启用滚动
    document.body.style.overflow = ''
    isAnimating.value = false
  })
}
const up = ref(false)
const toggleThemeS = async (event: MouseEvent) => {
  if (isAnimating.value) return
  up.value = !up.value
  if (up.value === true) {
    toggleTheme(event)
  } else {
    toggleTheme1(event)
  }
}

export function useTheme() {
  return {
    currentTheme,
    isAnimating,
    textColor,
    toggleTheme,
    toggleTheme1,
    toggleThemeS,
    themes,
  }
}
