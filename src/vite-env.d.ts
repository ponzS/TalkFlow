/// <reference types="vite/client" />
declare module 'virtual:generated-pages' {
    import { RouteRecordRaw } from 'vue-router'
    const pages: RouteRecordRaw[]
    export default pages
  }

declare module 'lodash';

declare module 'crypto-js';

declare module 'gun-flint';
declare module '@capacitor/browser';
declare module 'vue-virtual-scroller';
declare module '@capacitor/keyboard';
declare module '@gun-vue/composables';
declare module 'vue-router';
declare module 'vue-image-lightbox';
declare module '@ionic/vue';
declare namespace cordova {
  namespace plugins {
    namespace backgroundMode {
      function enable(): void;
      function disable(): void;
    
    }
  }
}

declare var cordova: any;


