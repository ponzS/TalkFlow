/// <reference types="vite/client" />
declare module 'virtual:generated-pages' {
    import { RouteRecordRaw } from 'vue-router'
    const pages: RouteRecordRaw[]
    export default pages
  }
  
declare module 'crypto-js';

declare module 'gun-flint';

declare module 'vue-virtual-scroller';

declare namespace cordova {
  namespace plugins {
    namespace backgroundMode {
      function enable(): void;
      function disable(): void;
    
    }
  }
}

declare var cordova: any;