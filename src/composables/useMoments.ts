import { ref, Ref, onMounted, reactive } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentInstance } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from '@/composables/useToast';
import { getTalkFlowCore } from '@/composables/TalkFlowCore';
import useNotifications from '@/composables/useNotifications';
import router from '@/router';

// Global state for selected moment
const momentState = reactive({
  selectedMomentId: null as string | null,
  showComments: false,
});

// Export interfaces for external use
export interface MomentV2 {
  momentId: string;
  userPub: string;
  content: string;
  timestamp: number;
  isHidden: number;
  images?: string[];
  text?: string;
  // 转发相关字段
  isForward?: boolean;
  originalMomentId?: string;
  originalAuthor?: string;
  forwardContent?: string;
}

export interface CommentHow {
  commentId: string;
  momentId: string;
  userPub: string;
  content: string;
  timestamp: number;
  replyToCommentId?: string | null;
  isDeleted: number;
  parentCommentId?: string | null;
}

export function useMoments() {
  const appInstance = getCurrentInstance();
  if (!appInstance) throw new Error('useMoments must be called within a Vue component setup');

  const { showToast } = useToast();
  const { t } = useI18n();
  
  const chatFlow = getTalkFlowCore();
  const { currentUserPub, buddyList, getAliasRealtime, gun, userAvatars, currentUserAlias, searchUserProfile } = chatFlow;

  // 获取通知服务
  const { sendNotification } = useNotifications();

  const moments: Ref<MomentV2[]> = ref([]);
  const newMomentContent: Ref<string> = ref('');
  const momentLikes: Ref<Record<string, string[]>> = ref({});
  const momentComments: Ref<Record<string, CommentHow[]>> = ref({});
  const newComment: Ref<Record<string, string>> = ref({});
  const loading: Ref<boolean> = ref(false);
  const error: Ref<string | null> = ref(null);
  const hasMore: Ref<boolean> = ref(true);
  const lastTimestamp: Ref<number | undefined> = ref(undefined);

  // 安全的通知发送函数
  const sendNotificationSafely = async (
    type: 'like' | 'forward' | 'comment',
    toUserPub: string,
    momentId: string,
    momentContent: string,
    commentContent?: string
  ) => {
    console.log('🔔 [DEBUG] Attempting to send notification:', {
      type,
      toUserPub,
      momentId,
      fromUserPub: currentUserPub.value,
      contentPreview: momentContent.slice(0, 50) + '...'
    });
    
    // Check if trying to send notification to self
    if (toUserPub === currentUserPub.value) {
      console.log('⚠️ [DEBUG] Skipping notification to self');
      return;
    }
    
    try {
      await sendNotification(type, toUserPub, momentId, momentContent, commentContent);
      console.log('✅ [DEBUG] Notification sent successfully:', type);
    } catch (error) {
      console.warn('❌ [DEBUG] Failed to send notification (not affecting main function):', error);
      // Don't throw error to avoid affecting main functionality
    }
  };

  const initialize = async () => {
    if (!currentUserPub.value) {
      return;
    }
    moments.value = [];
    hasMore.value = true;
    lastTimestamp.value = undefined;
    await loadMoments();
    listenLikes();
  };

  const truncatePreview = (content: string, maxLength: number = 20): string => {
    if (!content) return '';
    return content.length > maxLength ? content.slice(0, maxLength) + '...' : content;
  };

  const validateComment = (comment: Partial<CommentHow>): CommentHow => {
    return {
      commentId: comment.commentId || uuidv4(),
      momentId: comment.momentId || '',
      userPub: comment.userPub || 'unknown',
      content: comment.content || '[Null]',
      timestamp: comment.timestamp || Date.now(),
      replyToCommentId: comment.replyToCommentId ?? null,
      parentCommentId: comment.parentCommentId ?? null,
      isDeleted: comment.isDeleted || 0,
    };
  };

  const cleanObject = (obj: any): any => {
    const cleaned: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (obj[key] !== undefined) {
          cleaned[key] = obj[key];
        }
      }
    }
    return cleaned;
  };

  // 分批加载动态数据，避免主线程阻塞
  const loadMomentDataBatched = async (moments: MomentV2[], batchSize: number = 3) => {
    // 使用requestIdleCallback在空闲时处理，优化性能
    const processInIdle = (callback: () => void) => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(callback, { timeout: 100 });
      } else {
        setTimeout(callback, 0);
      }
    };

    for (let i = 0; i < moments.length; i += batchSize) {
      const batch = moments.slice(i, i + batchSize);
      
      await new Promise<void>((resolve) => {
        processInIdle(async () => {
          try {
            // 并发加载每个动态的数据
            await Promise.all(
              batch.map(async (moment) => {
                try {
                  // 并发加载点赞、转发、评论数据
                  const [likes, forwards, comments] = await Promise.all([
                    loadLikesForMoment(moment.momentId),
                    loadForwardsForMoment(moment.momentId), 
                    loadCommentsForMoment(moment.momentId)
                  ]);

                  momentLikes.value[moment.momentId] = likes;
                  momentForwards.value[moment.momentId] = forwards;
                  momentComments.value[moment.momentId] = comments.slice(0, 10);
                } catch (err) {
                  console.warn(`加载 ${moment.momentId} 的数据失败:`, err);
                  // 设置默认值，避免UI错误
                  momentLikes.value[moment.momentId] = [];
                  momentForwards.value[moment.momentId] = [];
                  momentComments.value[moment.momentId] = [];
                }
              })
            );
            resolve();
          } catch (err) {
            console.warn('批量加载动态数据失败:', err);
            resolve();
          }
        });
      });

      // 让出控制权，避免长时间阻塞
      await new Promise(resolve => setTimeout(resolve, 5));
    }
  };

  // 优化的点赞数据加载
  const loadLikesForMoment = async (momentId: string): Promise<string[]> => {
    const likes: string[] = [];
    await new Promise<void>((resolve) => {
      let timeoutId: NodeJS.Timeout;
      
      gun.get('momentLikes').get(momentId).map().once((data: any, userPub: string) => {
        if (data && userPub !== '_') likes.push(userPub);
      });
      
      // 减少等待时间，提高响应速度
      timeoutId = setTimeout(resolve, 50);
      
      // 清理定时器
      return () => clearTimeout(timeoutId);
    });
    return likes;
  };

  // 优化的转发数据加载
  const loadForwardsForMoment = async (momentId: string): Promise<string[]> => {
    const forwards: string[] = [];
    await new Promise<void>((resolve) => {
      let timeoutId: NodeJS.Timeout;
      
      gun.get('momentForwards').get(momentId).map().once((data: any, userPub: string) => {
        if (data && userPub !== '_') forwards.push(userPub);
      });
      
      timeoutId = setTimeout(resolve, 50);
      
      return () => clearTimeout(timeoutId);
    });
    return forwards;
  };

  // 优化的评论数据加载
  const loadCommentsForMoment = async (momentId: string): Promise<CommentHow[]> => {
    const comments: CommentHow[] = [];
    await new Promise<void>((resolve) => {
      let timeoutId: NodeJS.Timeout;
      
      gun.get('moments').get(momentId).get('comments').map().once((data: any, commentId: string) => {
        if (data && commentId !== '_') {
          comments.push(validateComment({
            commentId,
            momentId: momentId,
            userPub: data.userPub,
            content: data.content,
            timestamp: data.timestamp,
            replyToCommentId: data.replyToCommentId,
            parentCommentId: data.parentCommentId,
            isDeleted: data.isDeleted,
          }));
        }
      });
      
      timeoutId = setTimeout(resolve, 50);
      
      return () => clearTimeout(timeoutId);
    });
    return comments;
  };

  const postMoment = async () => {
    if (!currentUserPub.value || !newMomentContent.value.trim()) {
              showToast(t('inputMomentContent'), 'warning');
      return;
    }

    const moment: MomentV2 = {
      momentId: uuidv4(),
      userPub: currentUserPub.value,
      content: newMomentContent.value.trim(),
      timestamp: Date.now(),
      isHidden: 0,
    };

    loading.value = true;
    error.value = null;
    try {
      await new Promise<void>((resolve, reject) => {
        gun.get('moments').get(moment.momentId).put(moment, (ack: any) => {
          if (ack.err) reject(new Error(ack.err));
          else resolve();
        });
      });
      moments.value.unshift(moment);
      newMomentContent.value = '';
              showToast(t('momentPublished'), 'success');
    } catch (err) {
      error.value = t('momentPublishFailed');
      showToast(error.value, 'error');
    } finally {
      loading.value = false;
    }
  };

  const loadMoments = async (limit: number = 10, append: boolean = false) => {
    if (!currentUserPub.value || loading.value || !hasMore.value) return;

    const userPubs = [currentUserPub.value, ...buddyList.value.map(b => b.pub)];
    loading.value = true;
    error.value = null;

    try {
      const networkMoments: MomentV2[] = [];
      await new Promise<void>((resolve) => {
        gun.get('moments').map().once((data: any, momentId: string) => {
          if (data && userPubs.includes(data.userPub)) {
            const moment: MomentV2 = {
              momentId,
              userPub: data.userPub || 'unknown',
              content: data.content || '[Null]',
              timestamp: data.timestamp || Date.now(),
              isHidden: data.isHidden || 0,
              isForward: data.isForward || false,
              originalMomentId: data.originalMomentId,
              originalAuthor: data.originalAuthor,
              forwardContent: data.forwardContent,
            };
            if (!append || (moment.timestamp < (lastTimestamp.value || Infinity))) {
              networkMoments.push(moment);
            }
          }
        });
        setTimeout(resolve, 600);
      });

      const sortedMoments = networkMoments
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);

      if (append) {
        moments.value = [...moments.value, ...sortedMoments];
      } else {
        moments.value = sortedMoments;
      }

      if (sortedMoments.length > 0) {
        lastTimestamp.value = sortedMoments[sortedMoments.length - 1].timestamp;
      }
      hasMore.value = sortedMoments.length === limit;

      // 分批并发加载附加数据，避免主线程阻塞
      loadMomentDataBatched(sortedMoments);
      momentLikes.value = { ...momentLikes.value };
      momentForwards.value = { ...momentForwards.value };
      momentComments.value = { ...momentComments.value };
    } catch (err) {
      error.value = t('refreshMomentsFailed');
      showToast(error.value, 'error');
    } finally {
      loading.value = false;
    }
  };

  const loadMoreHistory = async (momentId: string, limit: number = 10) => {
    if (!currentUserPub.value || loading.value || !hasMore.value) return;

    loading.value = true;
    error.value = null;

    try {
      const fetchedComments: CommentHow[] = [];
      const lastComment = momentComments.value[momentId]?.slice(-1)[0];
      const lastCommentTimestamp = lastComment ? lastComment.timestamp : Infinity;

      await new Promise<void>((resolve) => {
        gun
          .get('moments')
          .get(momentId)
          .get('comments')
          .map()
          .once((data: any, commentId: string) => {
            if (data && commentId !== '_' && data.timestamp < lastCommentTimestamp) {
              const comment = validateComment({
                commentId,
                momentId,
                userPub: data.userPub || 'unknown',
                content: data.content || '[Null]',
                timestamp: data.timestamp || Date.now(),
                replyToCommentId: data.replyToCommentId ?? null,
                parentCommentId: data.parentCommentId ?? null,
                isDeleted: data.isDeleted || 0,
              });
              fetchedComments.push(comment);
            }
          });
        setTimeout(resolve, 100);
      });

      const sortedComments = fetchedComments
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);

      momentComments.value[momentId] = [
        ...(momentComments.value[momentId] || []),
        ...sortedComments,
      ].sort((a, b) => a.timestamp - b.timestamp);

      hasMore.value = sortedComments.length === limit;
      momentComments.value = { ...momentComments.value };

              showToast(t('loadMoreSuccess'), 'success');
    } catch (err) {
      error.value = t('loadMoreFailed');
      showToast(error.value, 'error');
    } finally {
      loading.value = false;
    }
  };

  const listenMoments = () => {
    if (!currentUserPub.value) return;
    const userPubs = [currentUserPub.value, ...buddyList.value.map(b => b.pub)];
    gun.get('moments').map().on((data: any, momentId: string) => {
      if (data && userPubs.includes(data.userPub)) {
        console.log('实时监听到动态更新:', { momentId, timestamp: data.timestamp });
      }
    });
  };

  const listenLikes = () => {
    if (!currentUserPub.value) return;
    gun.get('momentLikes').map().on((data: any, momentId: string) => {
      if (data && moments.value.some(m => m.momentId === momentId)) {
        const likes = Object.keys(data).filter(k => k !== '_' && data[k]);
        momentLikes.value[momentId] = likes;
        momentLikes.value = { ...momentLikes.value };
      }
    });
  };

  const toggleMomentVisibility = async (momentId: string, isHidden: boolean) => {
    loading.value = true;
    error.value = null;
    try {
      await new Promise<void>((resolve, reject) => {
        gun.get('moments').get(momentId).put({ isHidden: isHidden ? 1 : 0 }, (ack: any) => {
          if (ack.err) reject(new Error(ack.err));
          else resolve();
        });
      });
      const moment = moments.value.find(m => m.momentId === momentId);
      if (moment) moment.isHidden = isHidden ? 1 : 0;
      moments.value = [...moments.value];
              showToast(t(isHidden ? 'momentHidden' : 'momentPublic'), 'success');
    } catch (err) {
      error.value = t('momentPublishFailed');
      showToast(error.value, 'error');
    } finally {
      loading.value = false;
    }
  };

  const deleteMoment = async (momentId: string) => {
    loading.value = true;
    error.value = null;
    try {
      await new Promise<void>((resolve, reject) => {
        gun.get('moments').get(momentId).put(null, (ack: any) => {
          if (ack.err) reject(new Error(ack.err));
          else resolve();
        });
      });
      moments.value = moments.value.filter(m => m.momentId !== momentId);
      delete momentLikes.value[momentId];
      delete momentComments.value[momentId];
      momentLikes.value = { ...momentLikes.value };
      momentComments.value = { ...momentComments.value };
      if (momentState.selectedMomentId === momentId) {
        momentState.selectedMomentId = null;
        momentState.showComments = false;
      }
              showToast(t('momentDeleteSuccess'), 'success');
    } catch (err) {
      error.value = t('momentDeleteFailed');
      showToast(error.value, 'error');
    } finally {
      loading.value = false;
    }
  };

  const addLike = async (momentId: string) => {
    if (!currentUserPub.value) {
      showToast(t('pleaseLogin'), 'warning');
      return;
    }
    const userPub = currentUserPub.value;
    loading.value = true;
    error.value = null;
    try {
      await new Promise<void>((resolve, reject) => {
        gun.get('momentLikes').get(momentId).get(userPub).put(Date.now(), (ack: any) => {
          if (ack.err) reject(new Error(ack.err));
          else resolve();
        });
      });
      momentLikes.value[momentId] = momentLikes.value[momentId] || [];
      if (!momentLikes.value[momentId].includes(userPub)) {
        momentLikes.value[momentId].push(userPub);
        momentLikes.value = { ...momentLikes.value };
      }
      
      // 发送点赞通知
      const moment = moments.value.find(m => m.momentId === momentId);
      if (moment && moment.userPub !== currentUserPub.value) {
        try {
          await sendNotificationSafely('like', moment.userPub, momentId, moment.content);
        } catch (notificationError) {
          console.error('发送点赞通知失败:', notificationError);
          // 不影响点赞功能的正常执行
        }
      }
      
      showToast(t('likeSuccess'), 'success');
    } catch (err) {
      error.value = t('likeFailed');
      showToast(error.value, 'error');
    } finally {
      loading.value = false;
    }
  };

  const removeLike = async (momentId: string) => {
    if (!currentUserPub.value) {
      showToast(t('pleaseLogin'), 'warning');
      return;
    }
    const userPub = currentUserPub.value;
    loading.value = true;
    error.value = null;
    try {
      await new Promise<void>((resolve, reject) => {
        gun.get('momentLikes').get(momentId).get(userPub).put(null, (ack: any) => {
          if (ack.err) reject(new Error(ack.err));
          else resolve();
        });
      });
      momentLikes.value[momentId] = momentLikes.value[momentId].filter(pub => pub !== userPub);
      momentLikes.value = { ...momentLikes.value };
              showToast(t('unlikeSuccess'), 'success');
    } catch (err) {
      error.value = t('unlikeFailed');
      showToast(error.value, 'error');
    } finally {
      loading.value = false;
    }
  };

  const isLiked = (momentId: string): boolean => {
    return currentUserPub.value && momentLikes.value[momentId]?.includes(currentUserPub.value) || false;
  };

  const getLikeCount = (momentId: string): number => {
    return momentLikes.value[momentId]?.length || 0;
  };

  const getCommentCount = (momentId: string): number => {
    return momentComments.value[momentId]?.filter(c => c.isDeleted === 0).length || 0;
  };

  // 转发相关状态
  const momentForwards: Ref<Record<string, string[]>> = ref({});

  // 转发动态
  const forwardMoment = async (originalMomentId: string, forwardContent?: string) => {
    if (!currentUserPub.value) {
      showToast(t('pleaseLogin'), 'warning');
      return;
    }

    // 获取原动态信息
    let originalMoment = moments.value.find(m => m.momentId === originalMomentId);
    if (!originalMoment) {
      showToast(t('originalMomentNotFound'), 'error');
      return;
    }

    // 如果要转发的是转发动态，自动转发其原动态
    if (originalMoment.isForward && originalMoment.originalMomentId) {
      const actualOriginalMoment = moments.value.find(m => m.momentId === originalMoment.originalMomentId);
      if (actualOriginalMoment) {
        originalMoment = actualOriginalMoment;
        originalMomentId = actualOriginalMoment.momentId;
        console.log('转发的转发动态，自动转发原动态:', originalMomentId);
      }
    }

    const forwardMoment: MomentV2 = {
      momentId: uuidv4(),
      userPub: currentUserPub.value,
      content: forwardContent || '',
      timestamp: Date.now(),
      isHidden: 0,
      isForward: true,
      originalMomentId: originalMomentId,
      originalAuthor: originalMoment.userPub,
      forwardContent: forwardContent || '',
    };

    loading.value = true;
    error.value = null;

    try {
      // 保存转发动态
      await new Promise<void>((resolve, reject) => {
        gun.get('moments').get(forwardMoment.momentId).put(forwardMoment, (ack: any) => {
          if (ack.err) reject(new Error(ack.err));
          else resolve();
        });
      });

      // 更新转发计数
      await new Promise<void>((resolve, reject) => {
        gun.get('momentForwards').get(originalMomentId).get(currentUserPub.value!).put(Date.now(), (ack: any) => {
          if (ack.err) reject(new Error(ack.err));
          else resolve();
        });
      });

      // 转发完成，使用乐观更新立即显示（与postMoment一致）
      moments.value.unshift(forwardMoment);
      console.log('转发保存完成', { momentId: forwardMoment.momentId, originalMomentId });
      
      // 发送转发通知
      if (originalMoment.userPub !== currentUserPub.value) {
        try {
          await sendNotificationSafely('forward', originalMoment.userPub, originalMomentId, originalMoment.content, forwardContent);
        } catch (notificationError) {
          console.error('发送转发通知失败:', notificationError);
          // 不影响转发功能的正常执行
        }
      }
      
      // 不在这里显示提示，由调用者处理UI反馈
    } catch (err: any) {
      error.value = t('forwardFailed');
      showToast(`${error.value}: ${err.message || t('unknownError')}`, 'error');
    } finally {
      loading.value = false;
    }
  };

  // 刷新动态列表的函数（与下拉刷新逻辑一致）
  const refreshMomentsList = async () => {
    try {
      // 完全重置状态，与下拉刷新一致
      moments.value = [];
      lastTimestamp.value = undefined;
      hasMore.value = true;
      
      // 重新加载动态
      await loadMoments();
      
      console.log('动态列表刷新成功，当前动态数量:', moments.value.length);
    } catch (err) {
      console.error('刷新动态列表失败:', err);
    }
  };

  // 获取转发计数
  const getForwardCount = (momentId: string): number => {
    return momentForwards.value[momentId]?.length || 0;
  };

  // 检查是否已转发
  const isForwarded = (momentId: string): boolean => {
    return currentUserPub.value && momentForwards.value[momentId]?.includes(currentUserPub.value) || false;
  };

  const addComment = async (momentId: string, content: string, replyToCommentId?: string, parentCommentId?: string) => {
    if (!currentUserPub.value || !content.trim() || !moments.value.some(m => m.momentId === momentId)) {
              showToast(t('invalidOperation'), 'warning');
      return;
    }

    const comment: CommentHow = {
      commentId: uuidv4(),
      momentId,
      userPub: currentUserPub.value,
      content: content.trim(),
      timestamp: Date.now(),
      replyToCommentId: replyToCommentId ?? null,
      parentCommentId: parentCommentId ?? null,
      isDeleted: 0,
    };

    console.log('addComment 创建评论对象:', {
      commentId: comment.commentId,
      momentId: comment.momentId,
      content: comment.content,
      replyToCommentId: comment.replyToCommentId,
      parentCommentId: comment.parentCommentId,
      userPub: comment.userPub
    });

    loading.value = true;
    error.value = null;

    try {
      // 保守的乐观更新：先在本地添加评论，标记为临时状态
      const tempComment = { ...comment, __temp: true } as any;
      momentComments.value[momentId] = momentComments.value[momentId] || [];
      momentComments.value[momentId].push(tempComment);
      momentComments.value = { ...momentComments.value };

      const cleanedComment = {
        commentId: comment.commentId,
        momentId: comment.momentId,
        userPub: comment.userPub,
        content: comment.content,
        timestamp: comment.timestamp,
        replyToCommentId: comment.replyToCommentId,
        parentCommentId: comment.parentCommentId,
        isDeleted: comment.isDeleted,
      };

      console.log('addComment 准备保存到Gun.js:', cleanedComment);

      await new Promise<void>((resolve, reject) => {
        gun
          .get('moments')
          .get(momentId)
          .get('comments')
          .get(comment.commentId)
          .put(cleanedComment, (ack: any) => {
            if (ack.err) {
              console.error('Gun.js保存失败:', ack.err);
              reject(new Error(ack.err));
            } else {
              console.log('Gun.js保存成功:', ack);
              // 移除临时标记，表示保存成功
              const currentComments = momentComments.value[momentId] || [];
              const tempIndex = currentComments.findIndex(c => c.commentId === comment.commentId && (c as any).__temp);
              if (tempIndex !== -1) {
                currentComments[tempIndex] = { ...comment }; // 移除__temp标记
                momentComments.value[momentId] = [...currentComments];
                momentComments.value = { ...momentComments.value };
              }
              resolve();
            }
          });
      });

      newComment.value[momentId] = '';
      showToast(replyToCommentId ? t('replySuccess') : t('commentSuccess'), 'success');
      console.log('addComment 完成，评论已保存并显示');
      
      // 发送评论通知
      const moment = moments.value.find(m => m.momentId === momentId);
      if (moment && moment.userPub !== currentUserPub.value) {
        try {
          await sendNotificationSafely('comment', moment.userPub, momentId, moment.content, content.trim());
        } catch (notificationError) {
          console.error('发送评论通知失败:', notificationError);
          // 不影响评论功能的正常执行
        }
      }
    } catch (err: any) {
      console.error('addComment 失败:', err);
      // 如果保存失败，移除临时评论
      momentComments.value[momentId] = momentComments.value[momentId].filter(
        (c) => !(c.commentId === comment.commentId && (c as any).__temp)
      );
      momentComments.value = { ...momentComments.value };
              error.value = replyToCommentId ? t('replyFailed') : t('commentFailed');
        showToast(`${error.value}: ${err.message || t('databaseWriteError')}`, 'error');
    } finally {
      loading.value = false;
    }
  };

  const showMomentDetails = async (momentId: string) => {
    if (!moments.value.some(m => m.momentId === momentId)) {
      showToast(t('momentNotFound'), 'error');
      return;
    }
    momentState.selectedMomentId = momentId;
    momentState.showComments = true;
    await getComments(momentId);
    router.push('/MomentDetail');
  };

  const hideMomentDetails = () => {
    momentState.selectedMomentId = null;
    momentState.showComments = false;
  };

  // 预加载评论作者昵称
  const preloadCommentAuthorsAliases = (comments: CommentHow[]) => {
    const uniqueUserPubs = [...new Set(comments.map(c => c.userPub))];
    uniqueUserPubs.forEach(pub => {
      // 只为非好友用户预加载昵称
      if (pub !== currentUserPub.value && !getAliasRealtime(pub)) {
        fetchUserAlias(pub).catch(err => {
          console.warn(`Failed to preload alias for ${pub}:`, err);
        });
      }
    });
  };

  const getComments = async (momentId: string): Promise<CommentHow[]> => {
    if (!moments.value.some((m) => m.momentId === momentId)) {
      showToast(t('momentNotFound'), 'error');
      return [];
    }

    loading.value = true;
    error.value = null;

    try {
      const fetchedComments: CommentHow[] = [];
      await new Promise<void>((resolve) => {
        gun
          .get('moments')
          .get(momentId)
          .get('comments')
          .map()
          .once((data: any, commentId: string) => {
            if (data && commentId !== '_') {
              const comment = validateComment({
                commentId,
                momentId,
                userPub: data.userPub || 'unknown',
                content: data.content || '[Null]',
                timestamp: data.timestamp || Date.now(),
                replyToCommentId: data.replyToCommentId ?? null,
                parentCommentId: data.parentCommentId ?? null,
                isDeleted: data.isDeleted || 0,
              });
              fetchedComments.push(comment);
            }
          });
        setTimeout(resolve, 200);
      });

      const sortedComments = fetchedComments
        .filter((c) => c.isDeleted === 0)
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(0, 10); // Limit to 10 comments initially

      momentComments.value[momentId] = sortedComments;
      momentComments.value = { ...momentComments.value };

      // 预加载评论作者昵称
      preloadCommentAuthorsAliases(sortedComments);

      hasMore.value = fetchedComments.length >= 10;
      return momentComments.value[momentId];
    } catch (err: any) {
      error.value = t('commentFailed');
      showToast(`${error.value}: ${err.message || t('unknownError')}`, 'error');
      return [];
    } finally {
      loading.value = false;
    }
  };

  const deleteComment = async (momentId: string, commentId: string) => {
    if (!currentUserPub.value) {
      showToast(t('pleaseLogin'), 'warning');
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      const moment = moments.value.find(m => m.momentId === momentId);
      const comment = momentComments.value[momentId]?.find(c => c.commentId === commentId);
      if (!moment || !comment || (comment.userPub !== currentUserPub.value && moment.userPub !== currentUserPub.value)) {
        showToast(t('noPermissionDelete'), 'error');
        return;
      }

      await new Promise<void>((resolve, reject) => {
        gun.get('moments').get(momentId).get('comments').get(commentId).put(null, (ack: any) => {
          if (ack.err) reject(new Error(ack.err));
          else resolve();
        });
      });

      momentComments.value[momentId] = momentComments.value[momentId].filter(c => c.commentId !== commentId);
      momentComments.value = { ...momentComments.value };
              showToast(t('commentDeleted'), 'success');
          } catch (err: any) {
        error.value = t('deleteCommentFailed');
        showToast(`${error.value}: ${err.message || t('unknownError')}`, 'error');
    } finally {
      loading.value = false;
    }
  };

  // 存储非好友用户的昵称信息
  const strangerAliases = ref<Record<string, string>>({});

  // 动态获取用户昵称
  const fetchUserAlias = async (pub: string): Promise<string> => {
    return new Promise((resolve) => {
      let resolved = false;
      
      // 尝试获取用户的完整信息
      gun.get('users').get(pub).once((userData: any) => {
        if (!resolved && userData && userData.alias) {
          resolved = true;
          strangerAliases.value[pub] = userData.alias;
          resolve(userData.alias);
        }
      });
      
      // 也尝试直接获取alias字段（兼容性）
      gun.get('users').get(pub).get('alias').once((alias: string) => {
        if (!resolved && alias) {
          resolved = true;
          strangerAliases.value[pub] = alias;
          resolve(alias);
        }
      });
      
      // 设置超时，避免长时间等待
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          const fallbackAlias = `User${pub.slice(0, 8)}...`;
          strangerAliases.value[pub] = fallbackAlias;
          resolve(fallbackAlias);
        }
      }, 3000); // 延长到3秒，给网络更多时间
    });
  };

  const getBuddyAlias = (pub: string): string => {
    const alias = getAliasRealtime(pub);
    if (alias && alias.trim() !== '') {
      return alias;
    }
    
    // 如果是当前用户，返回当前用户昵称
    if (pub === currentUserPub.value) {
      return currentUserAlias.value || t('me');
    }
    
    // 检查是否已经获取过陌生人昵称
    if (strangerAliases.value[pub]) {
      return strangerAliases.value[pub];
    }
    
    // 异步获取陌生人昵称（不阻塞UI）
    fetchUserAlias(pub).catch(err => {
      console.warn(`Failed to fetch alias for ${pub}:`, err);
    });
    
    // 先返回临时昵称，设置为"Loading..."以提示正在加载
    return t('loadingText');
  };

  const getAvatar = (userPub: string): string => {
    return userAvatars.value[userPub] || '';
  };

  const formatTimestamp = (timestamp: number): string => {
    return Number.isFinite(timestamp) ? new Date(timestamp).toLocaleString() : t('invalidDate');
  };

  onMounted(() => {
    initialize();
  });

  return {
    moments,
    newMomentContent,
    momentLikes,
    momentComments,
    momentForwards,
    newComment,
    loading,
    error,
    hasMore,
    momentState,
    postMoment,
    loadMoments,
    loadMoreHistory,
    refreshMomentsList,
    toggleMomentVisibility,
    deleteMoment,
    addLike,
    removeLike,
    isLiked,
    getLikeCount,
    getCommentCount,
    forwardMoment,
    getForwardCount,
    isForwarded,
    addComment,
    showMomentDetails,
    hideMomentDetails,
    getComments,
    deleteComment,
    getBuddyAlias,
    getAvatar,
    formatTimestamp,
    lastTimestamp,
    truncatePreview,
    strangerAliases,
  };
}

export default useMoments;