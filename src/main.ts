// @ts-nocheck
import { createApp } from 'vue'
import App from './App.vue'
import router from './router';
import { createI18n } from 'vue-i18n'
import { IonicVue } from '@ionic/vue';
// import { createPinia } from 'pinia'
import 'webrtc-adapter';
import { useRouter } from 'vue-router'

import en from './locales/en.json'
import zh from './locales/zh.json'
import ru from './locales/ru.json'
import ja from './locales/ja.json'
import fr from './locales/fr.json'
import de from './locales/de.json'
import al from './locales/al.json'
import du from './locales/du.json'
import xi from './locales/xi.json'
import yi from './locales/yi.json'



/* Core CSS required for Ionic components to work properly */
import '@ionic/vue/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/vue/css/normalize.css';
import '@ionic/vue/css/structure.css';
import '@ionic/vue/css/typography.css';
import '@ionic/vue/css/ionic.bundle.css'
/* Optional CSS utils that can be commented out */
import '@ionic/vue/css/padding.css';
import '@ionic/vue/css/float-elements.css';
import '@ionic/vue/css/text-alignment.css';
import '@ionic/vue/css/text-transformation.css';
import '@ionic/vue/css/flex-utils.css';
import '@ionic/vue/css/display.css';

/* Theme variables */
import './theme/variables.css';

import { Capacitor } from '@capacitor/core';
import { JeepSqlite } from 'jeep-sqlite/dist/components/jeep-sqlite';
import { defineCustomElements as pwaElements} from '@ionic/pwa-elements/loader';
import { sqliteServ, dbVerServ, storageServ, aiChatPersistenceServ, globalMessageQueue } from './services/globalServices';
import InitializeAppService from './services/initializeAppService';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import VueVirtualScroller from 'vue-virtual-scroller';
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import VueLazyload from 'vue-lazyload';
import VueImageLightbox from 'vue-image-lightbox';
import 'vue-image-lightbox/dist/vue-image-lightbox.min.css';
import vue3PhotoPreview from 'vue3-photo-preview';
import 'vue3-photo-preview/dist/index.css';
import './index.css';

const i18n = createI18n({
  locale: 'en',
  messages: {
    en,
    zh,
    ru,
    ja,
    fr,
    de,
    al,
    du,
    xi,
    yi,
  },
})






pwaElements(window);
customElements.define('jeep-sqlite', JeepSqlite);
const platform = Capacitor.getPlatform();
// const pinia = createPinia()
const app = createApp(App)

  // .use(pinia)
  .use(VueVirtualScroller)
  .use(VueLazyload,
    {
      preLoad: 1.3,
      loading: '@/assets/loading.gif',
      attempt: 1,
    }

  )
  .use(VueImageLightbox)
  .use(i18n)   
  .use(IonicVue,{rippleEffect: false,
    mode: 'ios',})
  .use(useRouter)
  .use(vue3PhotoPreview)
  .use(router);

// Set the platform as global properties on the app
app.config.globalProperties.$platform = platform;

// Set the services as global properties on the app
app.config.globalProperties.$sqliteServ = sqliteServ;
app.config.globalProperties.$dbVersionServ = dbVerServ;
app.config.globalProperties.$storageServ = storageServ;
app.config.globalProperties.$aiChatPersistenceServ = aiChatPersistenceServ;
app.config.globalProperties.$globalMessageQueue = globalMessageQueue;

//Define and instantiate the InitializeAppService
const initAppServ = new InitializeAppService(sqliteServ, storageServ, aiChatPersistenceServ);
 
const mountApp = () => {
  initAppServ.initializeApp()
  .then(() => {
    router.isReady().then(() => {
      app.component('DynamicScroller', DynamicScroller);
app.component('DynamicScrollerItem', DynamicScrollerItem);
      app.mount('#app');
    });
  })
  .catch((error) => {
   // console.error('App Initialization error:', error);
  });
}

if (platform !== "web") {
  mountApp();
} else {
  window.addEventListener('DOMContentLoaded', async () => {
      const jeepEl = document.createElement("jeep-sqlite");
      document.body.appendChild(jeepEl);
      customElements.whenDefined('jeep-sqlite').then(() => {
        mountApp();
      })
      .catch ((err) => {
       // console.error('jeep-sqlite creation error:', err);
      });
  });
}