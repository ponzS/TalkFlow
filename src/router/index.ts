import { createRouter, createWebHistory } from '@ionic/vue-router'
import { createAnimation } from '@ionic/vue'
import routes from 'virtual:generated-pages'
import { nextTick } from 'vue'
import { getTalkFlowCore } from '@/composables/TalkFlowCore'
import { useGroupChat } from '@/composables/useGroupChat'
import LzcApp from '@lazycatcloud/sdk/dist/extentions'
// import { useChatFlow } from '@/composables/TalkFlowCore'

// const { isLoggedIn } = useChatFlow()

function isClientMobileWebShell() {
  if (typeof window === 'undefined') return false
  try {
    return LzcApp.isIosWebShell() || LzcApp.isAndroidWebShell()
  } catch {
    return false
  }
}

function isSmallScreenMode() {
  if (typeof window === 'undefined') return false
  return window.innerWidth <= 768 || isClientMobileWebShell()
}

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
    path: '/desktop',
    component: () => import('@/components/phone/IndexPage.vue'),
    children: [
      { path: 'chatpage', component: () => import('@/pages/chat/chatpage.vue') },
      { path: 'friend-profile', component: () => import('@/pages/auth/FriendProfile.vue') },
      { path: 'friend-settings', component: () => import('@/pages/auth/FriendSettings.vue') },
      { path: 'FriendRequests', component: () => import('@/pages/auth/FriendRequests.vue') },
      { path: 'GroupMessages', component: () => import('@/pages/group/GroupMessages.vue') },
      { path: 'GroupMembers', component: () => import('@/pages/group/GroupMembers.vue') },
      { path: 'ModelPersona', component: () => import('@/pages/ai/ModelPersona.vue') },
      { path: 'notifications', component: () => import('@/pages/tool/Notifications.vue') },
      { path: 'Notifications', component: () => import('@/pages/tool/Notifications.vue') },
      { path: 'call', component: () => import('@/pages/chat/CallPage.vue') },
      { path: 'CallPage', component: () => import('@/pages/chat/CallPage.vue') },
      { path: 'Moment', component: () => import('@/pages/moment/Moment.vue') },
      { path: 'FriendMoments', component: () => import('@/pages/moment/FriendMoments.vue') },
      { path: 'i18nset', component: () => import('@/pages/tool/i18nset.vue') },
      { path: 'Mesh', component: () => import('@/pages/tool/Mesh.vue') },
      { path: 'NotificationSettings', component: () => import('@/pages/tool/NotificationSettings.vue') },
      { path: 'keycheck', component: () => import('@/pages/tool/keycheck.vue') },
      { path: 'ScanPage', component: () => import('@/pages/tool/ScanPage.vue') },
      { path: 'MigrationChoice', component: () => import('@/pages/tool/MigrationChoice.vue') },
      { path: 'MigrationExport', component: () => import('@/pages/tool/MigrationExport.vue') },
      { path: 'MigrationImport', component: () => import('@/pages/tool/MigrationImport.vue') },
      { path: 'blacklist', component: () => import('@/pages/auth/blackList.vue') },
      { path: 'blackList', component: () => import('@/pages/auth/blackList.vue') },
      { path: 'ReportPage', component: () => import('@/pages/tool/ReportPage.vue') },
      { path: 'myself', component: () => import('@/pages/auth/myself.vue') },
      { path: 'Relay', component: () => import('@/pages/tool/Relay.vue') },
      { path: 'browser', component: () => import('@/pages/tool/browser.vue') },
      { path: 'qrpage', component: () => import('@/pages/tool/qrpage.vue') },
      { path: 'htmlpage', component: () => import('@/pages/tool/htmlpage.vue') },
      { path: 'Sponsorship', component: () => import('@/pages/tool/Sponsorship.vue') },
      { path: 'indexedDBpage', component: () => import('@/pages/tool/indexedDBpage.vue') },
      { path: 'settingspage', component: () => import('@/pages/tool/settingspage.vue') },
      { path: 'GroupCallPage', component: () => import('@/pages/group/GroupCallPage.vue') },
    ],
  },
  {
    path: '/chatpage',
    component: () => import('@/pages/chat/chatpage.vue')

  },
  {
    path: '/friend-profile',
    component: () => import('@/pages/auth/FriendProfile.vue')

  },
  {
    path: '/friend-settings',
    component: () => import('@/pages/auth/FriendSettings.vue')

  },
  {
    path: '/FriendRequests',
    component: () => import('@/pages/auth/FriendRequests.vue')

  },
  {
    path: '/GroupMessages',
    component: () => import('@/pages/group/GroupMessages.vue')
  },
  {
    path: '/GroupMembers',
    component: () => import('@/pages/group/GroupMembers.vue')
  },
  {
    path: '/ModelPersona',
    component: () => import('@/pages/ai/ModelPersona.vue')
  },
  {
    path: '/notifications',
    name: 'Notifications',
    component: () => import('@/pages/tool/Notifications.vue'),
  },
  {
    path: '/call',
    name: 'CallPage',
    component: () => import('@/pages/chat/CallPage.vue'),
  },
    {
    path: '/Moment',
    name: 'Moment',
    component: () => import('@/pages/moment/Moment.vue'),
  },
    {
    path: '/i18nset',
    name: 'I18nSet',
    component: () => import('@/pages/tool/i18nset.vue'),
  },
      {
    path: '/Mesh',
    name: 'Mesh',
    component: () => import('@/pages/tool/Mesh.vue'),
  },
      {
    path: '/NotificationSettings',
    name: 'NotificationSettings',
    component: () => import('@/pages/tool/NotificationSettings.vue'),
  },
        {
    path: '/keycheck',
    name: 'KeyCheck',
    component: () => import('@/pages/tool/keycheck.vue'),
  },
        {
    path: '/ScanPage',
    name: 'ScanPage',
    component: () => import('@/pages/tool/ScanPage.vue'),
  },
          {
    path: '/MigrationChoice',
    name: 'MigrationChoice',
    component: () => import('@/pages/tool/MigrationChoice.vue'),
  },
        {
    path: '/MigrationExport',
    name: 'MigrationExport',
    component: () => import('@/pages/tool/MigrationExport.vue'),
  },
        {
    path: '/MigrationImport',
    name: 'MigrationImport',
    component: () => import('@/pages/tool/MigrationImport.vue'),
  },
        {
    path: '/blacklist',
    name: 'Blacklist',
    component: () => import('@/pages/auth/blackList.vue'),
  },
       {
    path: '/ReportPage',
    name: 'Report',
    component: () => import('@/pages/tool/ReportPage.vue'),
  },
     {
    path: '/myself',
    name: 'Myself',
    component: () => import('@/pages/auth/myself.vue'),
  },
   {
    path: '/Relay',
    name: 'Relay',
    component: () => import('@/pages/tool/Relay.vue'),
  },
    {
    path: '/CallPage',
    name: 'CallPage',
    component: () => import('@/pages/chat/CallPage.vue'),
  },
      {
    path: '/indexedDBpage',
    name: 'IndexedDB',
    component: () => import('@/pages/tool/indexedDBpage.vue'),
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
  routes: customRoutes as any,
})

const originalReplace = router.replace.bind(router)
const originalPush = router.push.bind(router)
let desktopPreClosing = false

async function preCloseDesktopDetailIfNeeded(to: any) {
  if (typeof window === 'undefined') return
  if (isSmallScreenMode()) return
  if (desktopPreClosing) return

  const resolved = router.resolve(to)
  let targetPath = resolved.path || ''
  if (targetPath && targetPath !== '/desktop' && !targetPath.startsWith('/desktop/')) {
    const candidatePath = `/desktop${targetPath.startsWith('/') ? targetPath : `/${targetPath}`}`
    const candidateResolved = router.resolve(candidatePath)
    if (candidateResolved.matched.length > 1) {
      targetPath = candidatePath
    }
  }
  if (targetPath === '/desktop' || !targetPath.startsWith('/desktop/')) return

  const isGroupTarget =
    targetPath === '/desktop/GroupMessages' ||
    targetPath === '/desktop/GroupMembers' ||
    targetPath === '/desktop/GroupCallPage'
  const isChatTarget = targetPath === '/desktop/chatpage'

  desktopPreClosing = true
  try {
    let group: ReturnType<typeof useGroupChat> | null = null
    try {
      group = useGroupChat()
    } catch (error) {
    }

    try {
      if (!isChatTarget) {
        const core = getTalkFlowCore()
        core.closeChat()
      }
    } catch (error) {
    }
    if (!isGroupTarget) {
      try {
        if (!group) group = useGroupChat()
        group.setCurrentGroup(null)
      } catch (error) {
      }
    }
  } finally {
    desktopPreClosing = false
  }
}

;(router as any).replace = async (to: any) => {
  await preCloseDesktopDetailIfNeeded(to)
  return originalReplace(to)
}

;(router as any).push = async (to: any) => {
  if (!isSmallScreenMode()) {
    return (router as any).replace(to)
  }
  return originalPush(to)
}

router.beforeEach((to) => {
  if (typeof window === 'undefined') return true
  if (isSmallScreenMode()) {
    if (to.path === '/desktop' || to.path.startsWith('/desktop/')) {
      const stripped = to.fullPath.replace(/^\/desktop/, '') || '/'
      return { path: stripped, replace: true }
    }
    return true
  }
  if (to.path === '/' || to.path === '/index') {
    return { path: '/desktop', replace: true }
  }
  if (to.path === '/desktop' || to.path.startsWith('/desktop/')) return true

  const candidatePath = `/desktop${to.path.startsWith('/') ? to.path : `/${to.path}`}`
  const resolved = router.resolve(candidatePath)
  if (resolved.matched.length > 1) {
    return { path: candidatePath, query: to.query, hash: to.hash, replace: true }
  }

  return true
})



export default router
