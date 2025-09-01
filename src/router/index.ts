import { createRouter, createWebHistory } from '@ionic/vue-router'
import { createAnimation } from '@ionic/vue'
import routes from 'virtual:generated-pages'
// import { useChatFlow } from '@/composables/TalkFlowCore'

// const { isLoggedIn } = useChatFlow()

const customRoutes = [

  {
    path: '/',
    component: () => import('@/components/phone/IndexPage.vue'),
  },
  {
    path: '/index',
    component: () => import('@/components/phone/IndexPage.vue'),
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
    path: '/FriendRequests',
    component: () => import('@/pages/FriendRequests.vue')

  },
  {
    path: '/group/:pub/messages',
    component: () => import('@/pages/GroupMessages.vue')
  },
  {
    path: '/group/:pub/members',
    component: () => import('@/pages/GroupMembers.vue')
  },
 
  {
    path: '/user-guide',
    component: () => import('@/pages/UserGuide.vue')
  },
 
  {
    path: '/notifications',
    name: 'Notifications',
    component: () => import('@/pages/Notifications.vue'),
  },
  {
    path: '/call',
    name: 'CallPage',
    component: () => import('@/pages/CallPage.vue'),
  },

  ...routes,
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: customRoutes,
})



export default router
