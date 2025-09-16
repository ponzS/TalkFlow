/// <reference types="vite/client" />

declare module 'virtual:generated-pages' {
    import { RouteRecordRaw } from 'vue-router'
    const pages: RouteRecordRaw[]
    export default pages
  }

declare module 'lodash';

declare module 'crypto-js';

declare module 'gun-flint';

declare module 'vue-virtual-scroller';

declare module '@gun-vue/composables';
declare module 'vue-count-to';
declare module 'vue-image-lightbox';
declare module 'elliptic';
declare module 'node-forge';
declare module '@gun-vue/gun-es';
declare namespace cordova {
  namespace plugins {
    namespace backgroundMode {
      function enable(): void;
      function disable(): void;
    
    }
  }
}

declare var cordova: any;




declare module 'simple-peer' {
  interface SimplePeerOptions {
    initiator?: boolean;
    trickle?: boolean;
    stream?: MediaStream;
    config?: RTCConfiguration;
  }
  class SimplePeer {
    constructor(options?: SimplePeerOptions);
    signal(data: any): void;
    send(data: any): void;
    on(event: string, callback: (...args: any[]) => void): void;
    destroy(): void;
  }
  export = SimplePeer;
}

