<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <nav aria-label="Breadcrumb" class="breadcrumb">
    <ol>
      <li>
        <router-link to="/" class="breadcrumb-link">
          <div class="logo"><span class="ponz">PONZ</span><span class="s">S</span></div>
        </router-link>
        <span v-if="breadcrumbs.length > 0" class="breadcrumb-separator">/</span>
      </li>
      <li v-for="(item, index) in breadcrumbs" :key="index">
        <router-link
          v-if="index !== breadcrumbs.length - 1"
          :to="item.path"
          class="breadcrumb-link"
        >
          {{ formatName(item.name) }}
        </router-link>
        <span v-else class="breadcrumb-current">
          {{ formatName(item.name) }}
        </span>
        <span v-if="index !== breadcrumbs.length - 1" class="breadcrumb-separator"> / </span>
      </li>
    </ol>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
const route = useRoute()

// 生成面包屑数据
const breadcrumbs = computed(() => {
  const paths = route.path.split('/').filter(Boolean)
  let currentPath = ''

  return paths.map((path) => {
    currentPath += `/${path}`
    return {
      name: path,
      path: currentPath,
    }
  })
})

const { t } = useI18n()
// 添加一个类型定义来描述路径映射
type PathNames = {
  [key: string]: string // 添加索引签名
}

// 修改 pathNameMap 的类型声明
const pathNameMap = computed<PathNames>(() => ({
  aboutme: t('routes.aboutme'),
  products: t('routes.products'),
  contact: t('routes.contact'),
  ponzs: t('application'),
  apps: t('routes.apps'),
  login: t('routes.login'),
  register: t('routes.register'),
}))

// 格式化名称
const formatName = (name: string) => {
  // 首先检查是否有映射名称
  if (name in pathNameMap.value) {
    return pathNameMap.value[name]
  }

  // 原有的格式化逻辑
  name = name.replace(/\.[^/.]+$/, '')
  name = name.replace(/[-_]/g, ' ')
  return name.charAt(0).toUpperCase() + name.slice(1)
}
</script>

<style scoped>
/* 导入 Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap');

.breadcrumb {
  margin: 0;
  padding: 0;
  color: var(--text-color);
  backdrop-filter: blur(20px);
  border-radius: 10px;
}

.breadcrumb ol {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;

  gap: 3px;
}

.breadcrumb li {
  display: flex;
  align-items: center;
  font-size: 26px;
  transition: all 0.3s ease-in-out;
}

.logo {
  font-family: 'Playfair Display', serif;
  position: relative;
  padding: 0 5px;
  display: flex;
  align-items: center;
  transition: all 0.3s ease-in-out;
}

/* Logo 样式 */
.ponz,
.s {
  display: inline-block;
  transition: all 0.3s ease;
  font-weight: 700;
  letter-spacing: 1px;
}

.ponz {
  font-size: 30px;
  color: var(--text-color);
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);

}

.s {
  font-size: 30px;
  color: gold;
  text-shadow: 0 0 5px rgba(255, 215, 0, 0.3);
  position: relative;

}

/* Logo 悬停效果 */
.logo:hover .ponz {
  transform: translateY(-2px);
}

.logo:hover .s {
  transform: translateY(-2px) rotate(5deg);
}

/* S 字母的金色光晕效果 */
.s::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 120%;
  height: 120%;
  background: radial-gradient(circle, rgba(255, 215, 0, 0.2) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.logo:hover .s::before {
  opacity: 1;
}

/* 装饰性下划线 */
.logo::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    var(--text-color) 20%,
    gold 80%,
    transparent 100%
  );
  opacity: 0;
  transition: opacity 0.3s ease;
}

.logo:hover::after {
  opacity: 1;
}

.breadcrumb-link {
  text-decoration: none;
  transition: all 0.2s ease;
  padding: 4px 8px;
  border-radius: 4px;
}

.breadcrumb-link:hover {
  /* background-color: var(--hover-color, rgba(33, 150, 243, 0.1)); */
  color: var(--text-color);
}

.breadcrumb-current {
  color: var(--text-color);
  font-weight: 500;
  padding: 4px 8px;
}

.breadcrumb-separator {
  margin: 0 4px;
  color: var(--text-color);
  user-select: none;
}

/* 响应式设计 */
@media (max-width: 768px) {
  /* .breadcrumb {
    padding: 8px 12px;
  } */

  .breadcrumb li {
    font-size: 12px;
    transition: all 0.3s ease-in-out;
  }

  /* .ponz,
  .s {
    font-size: 24px;
  } */

  /* .breadcrumb-link,
  .breadcrumb-current {
    padding: 2px 4px;
  } */
}

/* 暗色主题支持 */
@media (prefers-color-scheme: dark) {
  .breadcrumb-link {
    color: var(--dark-text-color, #e0e0e0);
  }

  .breadcrumb-current {
    color: var(--dark-text-color-light, #999);
  }

  .breadcrumb-separator {
    color: var(--dark-text-color-light, #999);
  }
}
</style>
