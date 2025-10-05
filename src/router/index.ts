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
    //  component: () => import('@/pages/index.vue')
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
    path: '/ModelPersona',
    component: () => import('@/pages/ModelPersona.vue')
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
//   {
//     path: '/tabs',
//   component: () => import('@/pages/index.vue'),
//     children: [
//       {
//         path: 'chats',
//         name: 'chats',
//        component: () => import('@/components/phone/ChatS.vue'),
//       },
//       {
//         path: 'contacts',
//         name: 'contacts',
//         component: () => import('@/components/phone/ContactsS.vue'),
//       },
//       {
//         path: 'call',
//         name: 'call',
// component: () => import('@/components/phone/Call.vue'),
//       },
//       {
//         path: 'maxflow',
//         name: 'maxflow',
//     component: () => import('@/components/phone/MaxFlow.vue'),
//       },
//         {
//         path: 'me',
//         name: 'me',
//     component: () => import('@/components/phone/MeS.vue'),
//       }
//     ]
//   },

  ...routes,
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: customRoutes,
})



export default router
