import legacy from '@vitejs/plugin-legacy'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { defineConfig } from 'vite'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Pages from 'vite-plugin-pages'
import { VitePWA } from 'vite-plugin-pwa'
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    legacy(),
    Components(),
    AutoImport({
      // 可以让该插件自动识别的库, 例如 vue, vue-router, pinia 等
      imports: ['vue', 'vue-router'],

      // 把 composables/ 下的函数也自动导入
      // 注意：unplugin-auto-import V3.0+ 支持 dirs 配置
      dirs: [
        'src/composables',
        // 这样所有 src/composables/*.ts 中的函数，就可直接自动引入
      ],

      // 生成一个自动导入的类型声明文件（便于 IDE 提示）
      dts: 'src/auto-imports.d.ts',

    
    }),
    Pages(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        maximumFileSizeToCacheInBytes: 500 * 1024 * 1024, // 500 MiB
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      crypto: 'crypto-browserify',
      
    },
  },
  build: {
    rollupOptions: {
      //  external: ['text-encoding'],
        output:{
        
            manualChunks(id) {
                if (id.includes('node_modules')) {
                    return id.toString().split('node_modules/')[1].split('/')[0].toString();
                }
            }
        }
    }
  },
  // test: {
  //   globals: true,
  //   environment: 'jsdom'
  // }
})
