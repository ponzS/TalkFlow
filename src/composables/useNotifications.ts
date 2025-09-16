import { ref, Ref, computed } from 'vue';
import { getTalkFlowCore } from '@/composables/TalkFlowCore';

// 通知类型
export type NotificationType = 'like' | 'forward' | 'comment';

// 通知接口
export interface NotificationItem {
  notificationId: string;
  type: NotificationType;
  fromUserPub: string; // 谁执行的操作
  toUserPub: string; // 接收通知的用户
  momentId: string; // 相关动态ID
  momentPreview: string; // 动态预览文本
  commentContent?: string; // 如果是评论，评论内容
  timestamp: number;
  isRead: boolean;
}

// 全局通知状态
const notifications: Ref<NotificationItem[]> = ref([]);
const unreadCount = ref(0);

export function useNotifications() {
  const chatFlow = getTalkFlowCore();
  const { gun, currentUserPub } = chatFlow;

  // 获取用户别名的简化版本
  const getBuddyAlias = (pub: string): string => {
    // 简化版本，避免循环依赖
    return `User${pub.slice(0, 8)}...`;
  };

  // 格式化时间戳的简化版本
  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  // 计算未读数量
  const computedUnreadCount = computed(() => {
    return notifications.value.filter(n => !n.isRead).length;
  });

  // 截断文本预览
  const truncatePreview = (text: string, maxLength: number): string => {
    if (!text) return '';
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  };

  // 从动态内容提取文本预览
  const extractMomentPreview = (content: string): string => {
    if (!content) return '';
    
    // 移除图片标记
    const textOnly = content
      .split('\n')
      .filter(line => line !== '[IMAGE]' && !line.startsWith('data:image/'))
      .join('\n')
      .trim();
    
    return truncatePreview(textOnly, 50);
  };

  // 发送通知
  const sendNotification = async (
    type: NotificationType,
    toUserPub: string,
    momentId: string,
    momentContent: string,
    commentContent?: string
  ) => {
    console.log('📤 [DEBUG] useNotifications.sendNotification called:', {
      type,
      toUserPub,
      momentId,
      fromUserPub: currentUserPub.value,
      hasContent: !!momentContent,
      hasCommentContent: !!commentContent
    });
    
    if (!currentUserPub.value || toUserPub === currentUserPub.value) {
      console.log('⚠️ [DEBUG] Skipping notification - no user or self notification');
      return; // Don't send notifications to self
    }

    const notificationId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const notification: NotificationItem = {
      notificationId,
      type,
      fromUserPub: currentUserPub.value,
      toUserPub,
      momentId,
      momentPreview: extractMomentPreview(momentContent),
      commentContent: commentContent ? truncatePreview(commentContent, 100) : undefined,
      timestamp: Date.now(),
      isRead: false
    };

    console.log('💾 [DEBUG] Created notification object:', notification);

    try {
      // Simplified storage logic, removing complex Promise wrapping
      gun
        .get('notifications')
        .get(toUserPub)
        .get(notificationId)
        .put(notification);
      
      console.log('✅ [DEBUG] Notification stored to Gun.js successfully:', notification);
    } catch (error) {
      console.error('❌ [DEBUG] Failed to send notification:', error);
    }
  };

  // 加载通知列表 - 简化版本
  const loadNotifications = async () => {
    if (!currentUserPub.value) {
      console.log('⚠️ [DEBUG] No current user, cannot load notifications');
      return;
    }

    console.log('📥 [DEBUG] Loading notifications for user:', currentUserPub.value);

    try {
      const fetchedNotifications: NotificationItem[] = [];
      
      // Use simpler Gun.js query
      gun
        .get('notifications')
        .get(currentUserPub.value)
        .map()
        .once((data: any, notificationId: string) => {
          console.log('📋 [DEBUG] Raw notification data received:', { notificationId, data });
          
          if (data && notificationId !== '_' && data.notificationId) {
            const notification: NotificationItem = {
              notificationId: data.notificationId || notificationId,
              type: data.type || 'like',
              fromUserPub: data.fromUserPub || 'unknown',
              toUserPub: data.toUserPub || currentUserPub.value!,
              momentId: data.momentId || '',
              momentPreview: data.momentPreview || '',
              commentContent: data.commentContent,
              timestamp: data.timestamp || Date.now(),
              isRead: data.isRead || false
            };
            fetchedNotifications.push(notification);
            console.log('📝 [DEBUG] Processed notification:', notification);
          } else {
            console.log('⚠️ [DEBUG] Skipping invalid notification data:', { notificationId, data });
          }
        });

      // Delayed state update
      setTimeout(() => {
        notifications.value = fetchedNotifications.sort((a, b) => b.timestamp - a.timestamp);
        unreadCount.value = notifications.value.filter(n => !n.isRead).length;
        console.log(`✅ [DEBUG] Notifications loaded: ${notifications.value.length} total, ${unreadCount.value} unread`);
        console.log('📊 [DEBUG] Notification types breakdown:', 
          notifications.value.reduce((acc, n) => {
            acc[n.type] = (acc[n.type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        );
      }, 500);
      
    } catch (error) {
      console.error('❌ [DEBUG] Failed to load notifications:', error);
    }
  };

  // 标记通知为已读 - 简化版本
  const markAsRead = async (notificationId: string) => {
    if (!currentUserPub.value) return;

    try {
      // 简化更新逻辑
      gun
        .get('notifications')
        .get(currentUserPub.value)
        .get(notificationId)
        .get('isRead')
        .put(true);

      // 更新本地状态
      const notification = notifications.value.find(n => n.notificationId === notificationId);
      if (notification) {
        notification.isRead = true;
        unreadCount.value = notifications.value.filter(n => !n.isRead).length;
      }
    } catch (error) {
      console.error('标记已读失败:', error);
    }
  };

  // 标记所有通知为已读 - 简化版本
  const markAllAsRead = async () => {
    if (!currentUserPub.value) return;

    try {
      const unreadNotifications = notifications.value.filter(n => !n.isRead);
      
      // 简化批量更新
      unreadNotifications.forEach(notification => {
        gun
          .get('notifications')
          .get(currentUserPub.value!)
          .get(notification.notificationId)
          .get('isRead')
          .put(true);
        
        notification.isRead = true;
      });
      
      unreadCount.value = 0;
    } catch (error) {
      console.error('标记全部已读失败:', error);
    }
  };

  // 监听实时通知 - 简化版本  
  const listenForNotifications = () => {
    if (!currentUserPub.value) return;

    console.log('开始监听实时通知');
    
    try {
      gun
        .get('notifications')
        .get(currentUserPub.value)
        .map()
        .on((data: any, notificationId: string) => {
          if (data && notificationId !== '_' && data.notificationId) {
            console.log('收到实时通知:', { notificationId, data });
            
            const notification: NotificationItem = {
              notificationId: data.notificationId || notificationId,
              type: data.type || 'like',
              fromUserPub: data.fromUserPub || 'unknown',
              toUserPub: data.toUserPub || currentUserPub.value!,
              momentId: data.momentId || '',
              momentPreview: data.momentPreview || '',
              commentContent: data.commentContent,
              timestamp: data.timestamp || Date.now(),
              isRead: data.isRead || false
            };

            // 简化状态更新
            const existingIndex = notifications.value.findIndex(
              n => n.notificationId === notificationId
            );

            if (existingIndex === -1) {
              notifications.value.unshift(notification);
            } else {
              notifications.value[existingIndex] = notification;
            }

            // 重新计算未读数量
            unreadCount.value = notifications.value.filter(n => !n.isRead).length;
          }
        }, { change: true });
    } catch (error) {
      console.error('监听通知失败:', error);
    }
  };

  // 删除通知 - 简化版本
  const deleteNotification = async (notificationId: string) => {
    if (!currentUserPub.value) return;

    try {
      // 简化删除逻辑
      gun
        .get('notifications')
        .get(currentUserPub.value)
        .get(notificationId)
        .put(null);

      // 更新本地状态
      notifications.value = notifications.value.filter(
        n => n.notificationId !== notificationId
      );
      unreadCount.value = notifications.value.filter(n => !n.isRead).length;
    } catch (error) {
      console.error('删除通知失败:', error);
    }
  };

  // 获取通知类型的显示文本
  const getNotificationTypeText = (type: NotificationType): string => {
    switch (type) {
      case 'like':
        return 'liked your post';
      case 'forward':
        return 'forwarded your post';
      case 'comment':
        return 'commented on your post';
      default:
        return 'interacted with your post';
    }
  };

  // 获取通知类型的图标
  const getNotificationTypeIcon = (type: NotificationType): string => {
    switch (type) {
      case 'like':
        return 'heart';
      case 'forward':
        return 'share-outline';
      case 'comment':
        return 'chatbubble-outline';
      default:
        return 'notifications-outline';
    }
  };

  return {
    notifications,
    unreadCount,
    sendNotification,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    listenForNotifications,
    getBuddyAlias,
    formatTimestamp,
    getNotificationTypeText,
    getNotificationTypeIcon,
    truncatePreview
  };
}

export default useNotifications; 