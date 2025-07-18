/* eslint-disable */
/* prettier-ignore */
// @ts-nocheck
// noinspection JSUnusedGlobalSymbols
// Generated by unplugin-auto-import
// biome-ignore lint: disable
export {}
declare global {
  const API_URL: typeof import('./composables/ollamaService')['API_URL']
  const AVAILABLE_MODELS: typeof import('./composables/imageGenerationService')['AVAILABLE_MODELS']
  const EffectScope: typeof import('vue')['EffectScope']
  const GunStorageAdapter: typeof import('./composables/GunStorageAdapter')['default']
  const IMAGE_PROMPTS: typeof import('./composables/imageRecognitionService')['IMAGE_PROMPTS']
  const LOCAL_STYLE_PRESETS: typeof import('./composables/localImageGenerationService')['LOCAL_STYLE_PRESETS']
  const NEGATIVE_PROMPTS: typeof import('./composables/imageGenerationService')['NEGATIVE_PROMPTS']
  const PROMPT_SUGGESTIONS: typeof import('./composables/imageGenerationService')['PROMPT_SUGGESTIONS']
  const QUALITY_TAGS: typeof import('./composables/localImageGenerationService')['QUALITY_TAGS']
  const SAMPLERS: typeof import('./composables/localImageGenerationService')['SAMPLERS']
  const SEA: typeof import('./composables/useGun')['SEA']
  const TalkFlowCore: typeof import('./composables/TalkFlowCore')['default']
  const VISION_MODELS: typeof import('./composables/imageRecognitionService')['VISION_MODELS']
  const arrayBufToBase64UrlEncode: typeof import('./composables/usefaceid')['arrayBufToBase64UrlEncode']
  const chat: typeof import('./composables/ollamaService')['chat']
  const checkModelInstalled: typeof import('./composables/imageRecognitionService')['checkModelInstalled']
  const checkModelStatus: typeof import('./composables/imageGenerationService')['checkModelStatus']
  const checkOllamaConnection: typeof import('./composables/localImageGenerationService')['checkOllamaConnection']
  const checkStableDiffusionConnection: typeof import('./composables/localImageGenerationService')['checkStableDiffusionConnection']
  const cleanupGlobalKeyboardListeners: typeof import('./composables/useKeyboardManager')['cleanupGlobalKeyboardListeners']
  const cleanupNetwork: typeof import('./composables/useNetwork')['cleanupNetwork']
  const closeScanner: typeof import('./composables/useScanner')['closeScanner']
  const computed: typeof import('vue')['computed']
  const createApp: typeof import('vue')['createApp']
  const createGun: typeof import('./composables/gun-ionic-adapter')['createGun']
  const createPassKey: typeof import('./composables/usePasskey')['createPassKey']
  const customRef: typeof import('vue')['customRef']
  const defineAsyncComponent: typeof import('vue')['defineAsyncComponent']
  const defineComponent: typeof import('vue')['defineComponent']
  const derive: typeof import('./composables/derive')['default']
  const effectScope: typeof import('vue')['effectScope']
  const enhancePromptWithOllama: typeof import('./composables/localImageGenerationService')['enhancePromptWithOllama']
  const fetchModels: typeof import('./composables/ollamaService')['fetchModels']
  const fileToBase64: typeof import('./composables/imageRecognitionService')['fileToBase64']
  const generateImage: typeof import('./composables/imageGenerationService')['generateImage']
  const generateImageLocally: typeof import('./composables/localImageGenerationService')['generateImageLocally']
  const generateReply: typeof import('./composables/ollamaService')['generateReply']
  const getApiUrl: typeof import('./composables/ollamaService')['getApiUrl']
  const getCurrentInstance: typeof import('vue')['getCurrentInstance']
  const getCurrentScope: typeof import('vue')['getCurrentScope']
  const getEnabledPeer: typeof import('./composables/useGun')['getEnabledPeer']
  const getGun: typeof import('./composables/useGun')['getGun']
  const getGunSQLiteAdapter: typeof import('./composables/GunStorageAdapter')['getGunSQLiteAdapter']
  const getGunStorageAdapter: typeof import('./composables/GunStorageAdapter')['getGunStorageAdapter']
  const getImageConfig: typeof import('./composables/imageGenerationService')['getImageConfig']
  const getImageRecognitionConfig: typeof import('./composables/imageRecognitionService')['getImageRecognitionConfig']
  const getLocalImageConfig: typeof import('./composables/localImageGenerationService')['getLocalImageConfig']
  const getOllamaModels: typeof import('./composables/localImageGenerationService')['getOllamaModels']
  const getPassKey: typeof import('./composables/usePasskey')['getPassKey']
  const getPeersList: typeof import('./composables/useGun')['getPeersList']
  const getRandomSeed: typeof import('./composables/localImageGenerationService')['getRandomSeed']
  const getStableDiffusionModels: typeof import('./composables/localImageGenerationService')['getStableDiffusionModels']
  const getTalkFlowCore: typeof import('./composables/TalkFlowCore')['getTalkFlowCore']
  const getVisionModels: typeof import('./composables/imageRecognitionService')['getVisionModels']
  const gunIonicAdapter: typeof import('./composables/gun-ionic-adapter')['default']
  const h: typeof import('vue')['h']
  const initializeGun: typeof import('./composables/useGun')['initializeGun']
  const initializeRoomTables: typeof import('./composables/useRoomChat')['initializeRoomTables']
  const inject: typeof import('vue')['inject']
  const installVisionModel: typeof import('./composables/imageRecognitionService')['installVisionModel']
  const isProxy: typeof import('vue')['isProxy']
  const isReactive: typeof import('vue')['isReactive']
  const isReadonly: typeof import('vue')['isReadonly']
  const isRef: typeof import('vue')['isRef']
  const keyBuffer_to_jwk: typeof import('./composables/usefaceid')['keyBuffer_to_jwk']
  const markRaw: typeof import('vue')['markRaw']
  const nextTick: typeof import('vue')['nextTick']
  const onActivated: typeof import('vue')['onActivated']
  const onBeforeMount: typeof import('vue')['onBeforeMount']
  const onBeforeRouteLeave: typeof import('vue-router')['onBeforeRouteLeave']
  const onBeforeRouteUpdate: typeof import('vue-router')['onBeforeRouteUpdate']
  const onBeforeUnmount: typeof import('vue')['onBeforeUnmount']
  const onBeforeUpdate: typeof import('vue')['onBeforeUpdate']
  const onDeactivated: typeof import('vue')['onDeactivated']
  const onErrorCaptured: typeof import('vue')['onErrorCaptured']
  const onMounted: typeof import('vue')['onMounted']
  const onRenderTracked: typeof import('vue')['onRenderTracked']
  const onRenderTriggered: typeof import('vue')['onRenderTriggered']
  const onScopeDispose: typeof import('vue')['onScopeDispose']
  const onServerPrefetch: typeof import('vue')['onServerPrefetch']
  const onUnmounted: typeof import('vue')['onUnmounted']
  const onUpdated: typeof import('vue')['onUpdated']
  const onWatcherCleanup: typeof import('vue')['onWatcherCleanup']
  const openOrClose: typeof import('./composables/useScanner')['openOrClose']
  const openScanner: typeof import('./composables/useScanner')['openScanner']
  const provide: typeof import('vue')['provide']
  const reactive: typeof import('vue')['reactive']
  const readonly: typeof import('vue')['readonly']
  const recognizeImage: typeof import('./composables/imageRecognitionService')['recognizeImage']
  const ref: typeof import('vue')['ref']
  const resizeImage: typeof import('./composables/imageRecognitionService')['resizeImage']
  const resolveComponent: typeof import('vue')['resolveComponent']
  const setApiUrl: typeof import('./composables/ollamaService')['setApiUrl']
  const setHuggingFaceApiKey: typeof import('./composables/imageGenerationService')['setHuggingFaceApiKey']
  const setImageModel: typeof import('./composables/imageGenerationService')['setImageModel']
  const setKeyboardManagerDebug: typeof import('./composables/useKeyboardManager')['setKeyboardManagerDebug']
  const setMaxImageSize: typeof import('./composables/imageRecognitionService')['setMaxImageSize']
  const setPromptEnhancerModel: typeof import('./composables/localImageGenerationService')['setPromptEnhancerModel']
  const setStableDiffusionUrl: typeof import('./composables/localImageGenerationService')['setStableDiffusionUrl']
  const setUseOllamaForPrompts: typeof import('./composables/localImageGenerationService')['setUseOllamaForPrompts']
  const setVisionModel: typeof import('./composables/imageRecognitionService')['setVisionModel']
  const shallowReactive: typeof import('vue')['shallowReactive']
  const shallowReadonly: typeof import('vue')['shallowReadonly']
  const shallowRef: typeof import('vue')['shallowRef']
  const sharedStorage: typeof import('./composables/sharedStorage')['default']
  const showToast: typeof import('./composables/useToast')['showToast']
  const sounds: typeof import('./composables/sounds')['default']
  const streamChat: typeof import('./composables/ollamaService')['streamChat']
  const toRaw: typeof import('vue')['toRaw']
  const toRef: typeof import('vue')['toRef']
  const toRefs: typeof import('vue')['toRefs']
  const toValue: typeof import('vue')['toValue']
  const triggerRef: typeof import('vue')['triggerRef']
  const unref: typeof import('vue')['unref']
  const useAIAutoReply: typeof import('./composables/useAIAutoReply')['useAIAutoReply']
  const useAISettings: typeof import('./composables/useAISettings')['useAISettings']
  const useAttrs: typeof import('vue')['useAttrs']
  const useAudioOutput: typeof import('./composables/useSetAudioMode')['useAudioOutput']
  const useAuth: typeof import('./composables/useAuth')['useAuth']
  const useChatFlow: typeof import('./composables/TalkFlowCore')['useChatFlow']
  const useCssModule: typeof import('vue')['useCssModule']
  const useCssVars: typeof import('vue')['useCssVars']
  const useDateFormatter: typeof import('./composables/useDateFormatter')['useDateFormatter']
  const useDevChannel: typeof import('./composables/useDevChannel')['default']
  const useDeviceTracking: typeof import('./composables/useDeviceTracking')['default']
  const useFaceIDAuth: typeof import('./composables/useFaceID')['useFaceIDAuth']
  const useFileHandler: typeof import('./composables/useFileHandler')['useFileHandler']
  const useGroupChat: typeof import('./composables/useGroupChat')['useGroupChat']
  const useGroupChatFlow: typeof import('./composables/useGroupChat')['useGroupChatFlow']
  const useGroupChatSQLite: typeof import('./composables/useGroupChatSQLite')['useGroupChatSQLite']
  const useGroupVoiceBar: typeof import('./composables/useVoiceBarGroup')['useGroupVoiceBar']
  const useGunSQLiteAdapter: typeof import('./composables/GunStorageAdapter')['useGunSQLiteAdapter']
  const useGunStorageAdapter: typeof import('./composables/GunStorageAdapter')['useGunStorageAdapter']
  const useId: typeof import('vue')['useId']
  const useImageToBase64: typeof import('./composables/useImageToBase64')['useImageToBase64']
  const useKeyboardManager: typeof import('./composables/useKeyboardManager')['useKeyboardManager']
  const useLanguage: typeof import('./composables/useLanguage')['default']
  const useLink: typeof import('vue-router')['useLink']
  const useModel: typeof import('vue')['useModel']
  const useMoments: typeof import('./composables/useMoments')['default']
  const useNetwork: typeof import('./composables/useNetwork')['useNetwork']
  const useNetworkStatus: typeof import('./composables/useNetworkStatus')['useNetworkStatus']
  const useNotification: typeof import('./composables/useNotification')['default']
  const useNotifications: typeof import('./composables/useNotifications')['default']
  const useRoomChat: typeof import('./composables/useRoomChat')['useRoomChat']
  const useRoute: typeof import('vue-router')['useRoute']
  const useRouter: typeof import('vue-router')['useRouter']
  const useScanner: typeof import('./composables/useScanner')['useScanner']
  const useSegmentState: typeof import('./composables/useSegmentState')['useSegmentState']
  const useSlots: typeof import('vue')['useSlots']
  const useTemplateRef: typeof import('vue')['useTemplateRef']
  const useTheme: typeof import('./composables/useTheme')['useTheme']
  const useToast: typeof import('./composables/useToast')['useToast']
  const useTool: typeof import('./composables/useTool')['useTool']
  const useVoiceBar: typeof import('./composables/useVoiceBar')['useVoiceBar']
  const useVoiceCall: typeof import('./composables/useVoiceCall')['useVoiceCall']
  const useVoiceRoom: typeof import('./composables/useVoiceRoom')['useVoiceRoom']
  const usefaceid: typeof import('./composables/usefaceid')['default']
  const validateImageFile: typeof import('./composables/imageRecognitionService')['validateImageFile']
  const visibleGroupPreviews: typeof import('./composables/useGroup')['visibleGroupPreviews']
  const watch: typeof import('vue')['watch']
  const watchEffect: typeof import('vue')['watchEffect']
  const watchPostEffect: typeof import('vue')['watchPostEffect']
  const watchSyncEffect: typeof import('vue')['watchSyncEffect']
}
// for type re-export
declare global {
  // @ts-ignore
  export type { Component, ComponentPublicInstance, ComputedRef, DirectiveBinding, ExtractDefaultPropTypes, ExtractPropTypes, ExtractPublicPropTypes, InjectionKey, PropType, Ref, MaybeRef, MaybeRefOrGetter, VNode, WritableComputedRef } from 'vue'
  import('vue')
  // @ts-ignore
  export type { IGunSQLiteAdapter } from './composables/GunStorageAdapter'
  import('./composables/GunStorageAdapter')
  // @ts-ignore
  export type { KeyPair, LocalChatMessage, NetworkChatMessage, MessageReceipt, Buddy, ReceivedRequest, MessageType, MessageStatus, ChatPreview } from './composables/TalkFlowCore'
  import('./composables/TalkFlowCore')
  // @ts-ignore
  export type { ImageGenerationOptions, ImageGenerationResult } from './composables/imageGenerationService'
  import('./composables/imageGenerationService')
  // @ts-ignore
  export type { ImageRecognitionOptions, ImageRecognitionResult } from './composables/imageRecognitionService'
  import('./composables/imageRecognitionService')
  // @ts-ignore
  export type { LocalImageGenerationOptions, LocalImageGenerationResult } from './composables/localImageGenerationService'
  import('./composables/localImageGenerationService')
  // @ts-ignore
  export type { AIAutoReplySettings, AIAutoReplyState } from './composables/useAIAutoReply'
  import('./composables/useAIAutoReply')
  // @ts-ignore
  export type { DevMessage } from './composables/useDevChannel'
  import('./composables/useDevChannel')
  // @ts-ignore
  export type { DeviceRecord } from './composables/useDeviceTracking'
  import('./composables/useDeviceTracking')
  // @ts-ignore
  export type { MomentV2, CommentHow } from './composables/useMoments'
  import('./composables/useMoments')
  // @ts-ignore
  export type { NotificationType, NotificationItem } from './composables/useNotifications'
  import('./composables/useNotifications')
  // @ts-ignore
  export type { UseSegmentStateOptions } from './composables/useSegmentState'
  import('./composables/useSegmentState')
  // @ts-ignore
  export type { RoomKeyPair, RoomMember, SignalingMessageType, SignalingMessage } from './composables/useVoiceRoom'
  import('./composables/useVoiceRoom')
}
