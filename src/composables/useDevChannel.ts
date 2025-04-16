import { ref, Ref, onMounted } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentInstance } from 'vue';
import { useToast } from '@/composables/useToast';
import { getTalkFlowCore } from '@/composables/TalkFlowCore';

const { showToast } = useToast();

export function useDevChannel() {
  const appInstance = getCurrentInstance();
  if (!appInstance) throw new Error('useDevChannel must be called within a Vue component setup');

  const chatFlow = getTalkFlowCore();
  const { gun, currentUserPub } = chatFlow;

  const devMessages: Ref<DevMessage[]> = ref([]);
  const loading: Ref<boolean> = ref(false);
  const error: Ref<string | null> = ref(null);
  const hasMore: Ref<boolean> = ref(true);
  const lastTimestamp: Ref<number | undefined> = ref(undefined);
  const viewCounts: Ref<Record<string, number>> = ref({});
  const totalViews: Ref<number> = ref(0);

  interface DevMessage {
    messageId: string;
    userPub: string;
    content: string;
    timestamp: number;
  }

  const initialize = async () => {
    if (!currentUserPub.value) {
      showToast('请先登录', 'warning');
      return;
    }
    devMessages.value = [];
    hasMore.value = true;
    lastTimestamp.value = undefined;
    await loadDevMessages();
    listenTotalViews(); // 初始化时开始监听总浏览量
    incrementViewCount();
  };

  const loadDevMessages = async (limit: number = 10, append: boolean = false) => {
    if (loading.value || !hasMore.value) return;

    loading.value = true;
    error.value = null;

    try {
      const networkMessages: DevMessage[] = [];
      await new Promise<void>((resolve) => {
        gun.get('devChannel').map().once((data: any, messageId: string) => {
          if (data) {
            const message: DevMessage = {
              messageId,
              userPub: data.userPub || 'unknown',
              content: data.content || '[Null]',
              timestamp: data.timestamp || Date.now(),
            };
            if (!append || (message.timestamp < (lastTimestamp.value || Infinity))) {
              networkMessages.push(message);
            }
          }
        });
        setTimeout(resolve, 1000);
      });

      const sortedMessages = networkMessages
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);

      if (append) {
        devMessages.value = [...devMessages.value, ...sortedMessages];
      } else {
        devMessages.value = sortedMessages;
      }

      if (sortedMessages.length > 0) {
        lastTimestamp.value = sortedMessages[sortedMessages.length - 1].timestamp;
      }
      hasMore.value = sortedMessages.length === limit;

      await Promise.all(
        sortedMessages.map(async (message) => {
          try {
            await new Promise<void>((resolve) => {
              gun.get('devChannelViews').get(message.messageId).once((data: any) => {
                viewCounts.value[message.messageId] = data?.count || 0;
                resolve();
              });
            });
          } catch (err) {
            console.error(`加载 ${message.messageId} 浏览量失败:`, err);
          }
        })
      );
      viewCounts.value = { ...viewCounts.value };

      await updateTotalViews();
    } catch (err) {
      error.value = '加载开发者频道消息失败';
      showToast(error.value, 'error');
      console.error('加载开发者频道消息失败:', err);
    } finally {
      loading.value = false;
    }
  };

  const postDevMessage = async (content: string) => {
    if (!currentUserPub.value) {
      console.error('未登录，无法发布开发者消息');
      return;
    }
    if (!content.trim()) {
      console.error('消息内容不能为空');
      return;
    }

    const message: DevMessage = {
      messageId: uuidv4(),
      userPub: currentUserPub.value,
      content: content.trim(),
      timestamp: Date.now(),
    };

    try {
      await new Promise<void>((resolve, reject) => {
        gun.get('devChannel').get(message.messageId).put(message, (ack: any) => {
          if (ack.err) reject(new Error(ack.err));
          else resolve();
        });
      });
      console.log('开发者消息发布成功:', message);
      return message.messageId;
    } catch (err) {
      console.error('开发者消息发布失败:', err);
      throw err;
    }
  };

  const deleteDevMessage = async (messageId: string) => {
    if (!currentUserPub.value) {
      console.error('未登录，无法删除开发者消息');
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      await new Promise<void>((resolve, reject) => {
        gun.get('devChannel').get(messageId).put(null, (ack: any) => {
          if (ack.err) reject(new Error(ack.err));
          else resolve();
        });
      });
      devMessages.value = devMessages.value.filter(m => m.messageId !== messageId);
      delete viewCounts.value[messageId];
      viewCounts.value = { ...viewCounts.value };
      console.log('开发者消息删除成功:', messageId);
    } catch (err) {
      error.value = '删除开发者消息失败';
      console.error('删除开发者消息失败:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const incrementViewCount = async () => {
    try {
      await new Promise<void>((resolve) => {
        gun.get('devChannelTotalViews').once((data: any) => {
          const currentTotal = data?.count || 0;
          gun.get('devChannelTotalViews').put({ count: currentTotal + 1 }, (ack: any) => {
            if (ack.err) console.error('更新总浏览量失败:', ack.err);
            totalViews.value = currentTotal + 1;
            resolve();
          });
        });
      });

      devMessages.value.forEach(async (message) => {
        try {
          await new Promise<void>((resolve) => {
            gun.get('devChannelViews').get(message.messageId).once((data: any) => {
              const currentCount = data?.count || 0;
              gun.get('devChannelViews').get(message.messageId).put({ count: currentCount + 1 }, (ack: any) => {
                if (ack.err) console.error(`更新 ${message.messageId} 浏览量失败:`, ack.err);
                viewCounts.value[message.messageId] = currentCount + 1;
                viewCounts.value = { ...viewCounts.value };
                resolve();
              });
            });
          });
        } catch (err) {
          console.error(`增加 ${message.messageId} 浏览量失败:`, err);
        }
      });
    } catch (err) {
      console.error('增加浏览量失败:', err);
    }
  };

  const updateTotalViews = async () => {
    try {
      await new Promise<void>((resolve) => {
        gun.get('devChannelTotalViews').once((data: any) => {
          totalViews.value = data?.count || 0;
          resolve();
        });
      });
    } catch (err) {
      console.error('获取总浏览量失败:', err);
    }
  };

  // 实时监听总浏览量
  const listenTotalViews = () => {
    gun.get('devChannelTotalViews').on((data: any) => {
      if (data && data.count !== undefined) {
        totalViews.value = data.count; // 实时更新 totalViews
        console.log('总浏览量更新:', totalViews.value); // 调试日志
      }
    });
  };

  const getViewCount = (messageId: string): number => {
    return viewCounts.value[messageId] || 0;
  };

  const formatTimestamp = (timestamp: number): string => {
    return Number.isFinite(timestamp) ? new Date(timestamp).toLocaleString() : 'Invalid Date';
  };

  onMounted(() => {
    initialize();
  });

  return {
    devMessages,
    loading,
    error,
    hasMore,
    viewCounts,
    totalViews,
    loadDevMessages,
    postDevMessage,
    deleteDevMessage,
    getViewCount,
    formatTimestamp,
  };
}

export default useDevChannel;