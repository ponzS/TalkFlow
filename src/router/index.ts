import { createRouter, createWebHistory } from '@ionic/vue-router'
import { createAnimation } from '@ionic/vue'
import routes from 'virtual:generated-pages'
// import { useChatFlow } from '@/composables/TalkFlowCore'

// const { isLoggedIn } = useChatFlow()

const customRoutes = [

  {
    path: '/',
    component: () => import('@/pages/i18n.vue'),
  },
  {
    path: '/index',
    component: () => import('@/pages/index.vue'),
  },
  {
    path: '/chatpage',
    component: () => import('@/pages/chatpage.vue')

  },
  {
    path: '/friend-profile',
    component: () => import('@/pages/FriendProfile.vue')

  },
  {
    path: '/friend-settings',
    component: () => import('@/pages/FriendSettings.vue')

  },
  {
    path: '/stranger-profile',
    component: () => import('@/pages/StrangerProfile.vue')

  },
  {
    path: '/moment/:momentId',
    component: () => import('@/pages/MomentDetail.vue')

  },
  // {
  //   path: '/GroupChat/:roomPubKey',
  //   component: () => import('@/pages/GroupChat.vue')

  // }, {
  //   path: '/GroupManagement/:roomPubKey',
  //   component: () => import('@/pages/GroupManagement.vue')

  // }, {
  //   path: '/group-details/:roomPubKey',
  //   component: () => import('@/pages/GroupDetails.vue')

  // },
 
  

  ...routes,
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: customRoutes,
} as any)


// 导航守卫
// router.beforeEach((to, from, next) => {
//   // 如果用户没有登录，且访问的不是 'i18n.vue' 页面，则重定向到 'i18n.vue'
//   if (!isLoggedIn.value && to.path !== '/') {
//     next('/');  // 重定向到 i18n 页面
//   } else {
//     next();  // 允许访问目标路由
//   }
// });

// router.beforeEach(async (to, from, next) => {
//   const { isLoggedIn } = await import('@/composables/TalkFlowCore');
//   if (!isLoggedIn.value && to.path !== '/') {
//     next('/');
//   } else {
//     next();
//   }
// });


export default router
