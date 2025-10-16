import vue from '@vitejs/plugin-vue'
import path from 'path'
import { defineConfig } from 'vite'
// @ts-ignore
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Pages from 'vite-plugin-pages'
import { VitePWA } from 'vite-plugin-pwa'
import tailwindcss from '@tailwindcss/vite'
//import { viteSingleFile } from "vite-plugin-singlefile"
// import inject from "@rollup/plugin-inject";
// https://vitejs.dev/config/




export default defineConfig({
  base: './', 
 

  plugins: [
    vue(),
    Components(),
     tailwindcss(),
  //viteSingleFile(),
    // inject({
    //   Buffer: ["buffer", "Buffer"],
    // }),
    AutoImport({
      imports: ['vue', 'vue-router'],
      dirs: [
        'src/composables',
      ],
      dts: 'src/auto-imports.d.ts',

    }),
    Pages(),
    VitePWA({
      manifest: {
        name: 'TalkFlow',
        short_name: 'TalkFlow',
        description: 'P2P Mesh E2EE Chat App',
       
        icons: [
          {
            src: 'assets/icons/icon-48.webp',
            type: 'image/webp',
            sizes: '48x48',
            purpose: 'any maskable'
          },
          {
            src: 'assets/icons/icon-72.webp',
            type: 'image/webp',
            sizes: '72x72',
            purpose: 'any maskable'
          },
          {
            src: 'assets/icons/icon-96.webp',
            type: 'image/webp',
            sizes: '96x96',
            purpose: 'any maskable'
          },
          {
            src: 'assets/icons/icon-128.webp',
            type: 'image/webp',
            sizes: '128x128',
            purpose: 'any maskable'
          },
          {
            src: 'assets/icons/icon-192.webp',
            type: 'image/webp',
            sizes: '192x192',
            purpose: 'any maskable'
          },
          {
            src: 'assets/icons/icon-256.webp',
            type: 'image/webp',
            sizes: '256x256',
            purpose: 'any maskable'
          },
          {
            src: 'assets/icons/icon-512.webp',
            type: 'image/webp',
            sizes: '512x512',
            purpose: 'any maskable'
          }
        ],
      },
      registerType: 'autoUpdate',
      workbox: {
        maximumFileSizeToCacheInBytes: 50000 * 1024 * 1024,
        globPatterns: [
          '**/*.{js,css,html,ico,png,jpg,jpeg,gif,svg,webp,mp3,wav,wasm}',
          'assets/**/*',
          'audio/**/*',
          'images/**/*'
        ],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.(png|jpg|jpeg|gif|svg|webp|mp3|wav)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'external-assets',
              expiration: {
                maxEntries: 5000,
                maxAgeSeconds: 365 * 24 * 60 * 60 
              }
            }
          }
        ]
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      crypto: 'crypto-browserify',
      buffer: "buffer",
    
    },
  },
  define: {
    global: "window",
  },
  // rolldown
  //  build: {
  //   rollupOptions: {
  //     output: {
  //       advancedChunks: {
  //         groups: [{ name: 'vendor', test: /\/react(?:-dom)?/ }]
  //       }
  //     }
  //   }
  build: {
    rollupOptions: {
        output:{
            manualChunks(id) {
                if (id.includes('node_modules')) {
                    return id.toString().split('node_modules/')[1].split('/')[0].toString();
                }
            }
        }
    }
  },
  // esbuild: {
  //   logOverride: { 'this-is-undefined-in-esm': 'silent' }
  // },
  // test: {
  //   globals: true,
  //   environment: 'jsdom'
  // }
})
