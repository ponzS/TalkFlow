// src/composables/useNotification.ts
import { ref, onMounted } from 'vue';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { LocalChatMessage } from './TalkFlowCore';
import { useToast } from '@/composables/useToast';

interface NotificationSettings {
  globalEnabled: boolean;
  disabledPubs: string[];
}

export function useNotification() {
  const { showToast } = useToast();
  const globalEnabled = ref(true);
  const disabledPubs = ref<string[]>([]);
  const SETTINGS_FILE = 'notification_settings.json';

  // 检查并请求通知权限
  async function requestNotificationPermission(): Promise<void> {
    try {
      // 检查当前权限状态
      const permissionStatus = await LocalNotifications.checkPermissions();
      console.log('当前通知权限状态:', permissionStatus.display);

      // 如果权限未确定（prompt），则请求权限
      if (permissionStatus.display === 'prompt') {
        const result = await LocalNotifications.requestPermissions();
        console.log('请求通知权限结果:', result.display);
        if (result.display !== 'granted') {
          showToast('通知权限被拒绝，将无法接收新消息提醒', 'warning');
        } else {
          showToast('通知权限已授予', 'success');
        }
      } else if (permissionStatus.display === 'denied') {
        showToast('通知权限已被拒绝，请在设置中启用', 'warning');
      }
    } catch (err) {
      console.error('请求通知权限失败:', err);
      showToast('无法请求通知权限', 'error');
    }
  }

  // 加载通知设置
  async function loadSettings(): Promise<NotificationSettings> {
    const defaultSettings: NotificationSettings = { globalEnabled: true, disabledPubs: [] };
    try {
      const result = await Filesystem.readFile({
        path: SETTINGS_FILE,
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });
      const data = typeof result.data === 'string' ? result.data : await result.data.text();
      return JSON.parse(data) || defaultSettings;
    } catch (err) {
      console.log('未找到通知设置文件，使用默认值');
      return defaultSettings;
    }
  }

  // 保存通知设置
  async function saveSettings(settings: NotificationSettings): Promise<void> {
    try {
      await Filesystem.writeFile({
        path: SETTINGS_FILE,
        data: JSON.stringify(settings),
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });
      console.log('通知设置已保存:', settings);
    } catch (err) {
      showToast('保存通知设置失败', 'error');
      console.error('保存通知设置失败:', err);
    }
  }

  // 初始化通知设置和权限
  onMounted(async () => {
    // 应用启动时请求通知权限
    await requestNotificationPermission();
    const settings = await loadSettings();
    globalEnabled.value = settings.globalEnabled;
    disabledPubs.value = settings.disabledPubs;
  });

  // 发送通知，chatFlow 作为参数传入
  async function notifyNewMessage(
    msg: LocalChatMessage ,
    chatFlow: {
      currentChatPub: Ref<string | null>;
      getAliasRealtime: (pub: string) => string;
      userAvatars: Ref<Record<string, string>>;
      triggerLightHaptic: () => Promise<void>;
    }
  ): Promise<void> {
    const settings = await loadSettings();

    // 检查全局通知是否启用及是否禁用该好友通知
    if (!settings.globalEnabled || settings.disabledPubs.includes(msg.from)) {
      console.log('通知未启用或好友被禁用:', { globalEnabled: settings.globalEnabled, sender: msg.from });
      return;
    }
    // 不推送当前聊天好友的消息
    if (msg.from === chatFlow.currentChatPub.value) {
      console.log('当前聊天，不发送通知:', msg.from);
      return;
    }

    const title = chatFlow.getAliasRealtime(msg.from);
    const body = getPreviewText(msg);
    const avatar = chatFlow.userAvatars.value[msg.from] || '@/images/app_icon.png'; // 默认 Logo

    try {
      // 检查权限状态，确保通知可以发送
      const permissionStatus = await LocalNotifications.checkPermissions();
      if (permissionStatus.display !== 'granted') {
        console.log('通知权限未授予，尝试重新请求');
        await requestNotificationPermission();
        const newStatus = await LocalNotifications.checkPermissions();
        if (newStatus.display !== 'granted') {
          console.log('用户拒绝通知权限，通知发送中止');
          return;
        }
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            id: Date.now(), // 考虑使用更唯一的 ID
            title,
            body,
            schedule: { at: new Date(Date.now() + 1000) }, // 延迟 1 秒以便观察
            sound: 'default',
            smallIcon: 'ic_stat_notify', // 安卓默认图标
            largeIcon: avatar, // 头像或默认 Logo
            extra: { vibrate: true },
          },
        ],
      });
      console.log(`通知发送成功: ${title} - ${body}`);
      await chatFlow.triggerLightHaptic(); // 震动反馈
    } catch (error) {
      console.warn('发送本地通知失败:', error);
      showToast('发送通知失败', 'error');
    }
  }

  // 获取消息预览文本
  function getPreviewText(msg: LocalChatMessage ): string {
    switch (msg.type) {
      case 'text':
        return msg.text || '';
      case 'voice':
        return '[Voice]';
      case 'file':
        return '[File]';
      default:
        return '';
    }
  }

  // 切换全局通知状态
  async function toggleGlobalNotification(enabled: boolean): Promise<void> {
    globalEnabled.value = enabled;
    const settings = await loadSettings();
    settings.globalEnabled = enabled;
    await saveSettings(settings);
    showToast(`全局通知已${enabled ? '启用' : '禁用'}`, 'success');
  }

  // 禁用/启用某个好友的通知
  async function toggleFriendNotification(pub: string, disable: boolean): Promise<void> {
    const settings = await loadSettings();
    if (disable) {
      settings.disabledPubs = [...new Set([...settings.disabledPubs, pub])];
      showToast('已禁用该好友的通知', 'success');
    } else {
      settings.disabledPubs = settings.disabledPubs.filter(p => p !== pub);
      showToast('已启用该好友的通知', 'success');
    }
    disabledPubs.value = settings.disabledPubs;
    await saveSettings(settings);
  }

  // 检查某个好友的通知是否被禁用
  async function isNotificationDisabled(pub: string): Promise<boolean> {
    const settings = await loadSettings();
    return settings.disabledPubs.includes(pub);
  }

  return {
    globalEnabled,
    disabledPubs,
    notifyNewMessage,
    toggleGlobalNotification,
    toggleFriendNotification,
    isNotificationDisabled,
    loadSettings,
    requestNotificationPermission, // 导出以便外部调用
  };
}

export default useNotification;