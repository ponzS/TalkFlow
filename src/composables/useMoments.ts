import { ref, Ref, onMounted } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentInstance } from 'vue';
import { useToast } from '@/composables/useToast';
import { getTalkFlowCore } from '@/composables/TalkFlowCore';

const { showToast } = useToast();

export function useMoments() {
  const appInstance = getCurrentInstance();
  if (!appInstance) throw new Error('useMoments must be called within a Vue component setup');

  const chatFlow = getTalkFlowCore();
  const { currentUserPub, buddyList, getAliasRealtime, gun, userAvatars, currentUserAlias } = chatFlow;

  const moments: Ref<MomentV2[]> = ref([]);
  const newMomentContent: Ref<string> = ref('');
  const momentLikes: Ref<Record<string, string[]>> = ref({});
  const momentComments: Ref<Record<string, CommentV2[]>> = ref({});
  const newComment: Ref<Record<string, string>> = ref({});
  const loading: Ref<boolean> = ref(false);
  const error: Ref<string | null> = ref(null);
  const hasMore: Ref<boolean> = ref(true);
  const lastTimestamp: Ref<number | undefined> = ref(undefined); // 记录最后加载的时间戳

  interface MomentV2 {
    momentId: string;
    userPub: string;
    content: string;
    timestamp: number;
    isHidden: number;
    images?: string[];
    text?: string;
  }

  interface CommentV2 {
    commentId: string;
    momentId: string;
    userPub: string;
    content: string;
    timestamp: number;
    replyToCommentId?: string;
    isDeleted: number;
  }

  const initialize = async () => {
    if (!currentUserPub.value) {
    //  showToast('请先登录', 'warning');
      return;
    }
    moments.value = [];
    hasMore.value = true;
    lastTimestamp.value = undefined;
    await loadMoments();
    listenLikes();
    listenComments();
  };

  const validateComment = (comment: Partial<CommentV2>): CommentV2 => {
    return {
      commentId: comment.commentId || uuidv4(),
      momentId: comment.momentId || '',
      userPub: comment.userPub || 'unknown',
      content: comment.content || '[Null]',
      timestamp: comment.timestamp || Date.now(),
      replyToCommentId: comment.replyToCommentId || undefined,
      isDeleted: comment.isDeleted || 0,
    };
  };

  const postMoment = async () => {
    if (!currentUserPub.value) {
    //  showToast('请先登录', 'warning');
      return;
    }
    if (!newMomentContent.value.trim()) {
      //showToast('动态内容不能为空', 'warning');
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
      moments.value.unshift(moment); // 新动态插入顶部
      newMomentContent.value = '';
    //  showToast('动态发布成功', 'success');
      //console.log('动态发布成功:', moment);
    } catch (err) {
      error.value = '动态发布失败';
      //showToast(error.value, 'error');
      //console.error('动态发布失败:', err);
    } finally {
      loading.value = false;
    }
  };

  const loadMoments = async (limit: number = 10, append: boolean = false) => {
    if (!currentUserPub.value || loading.value || !hasMore.value) return;

    const userPubs = [currentUserPub.value, ...buddyList.value.map(b => b.pub)];
  //  console.log('加载动态的用户列表:', userPubs);
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
            };
            if (!append || (moment.timestamp < (lastTimestamp.value || Infinity))) {
              networkMoments.push(moment);
            }
          }
        });
        setTimeout(resolve, 1000); // 缩短模拟时间
      });

      const sortedMoments = networkMoments
        .sort((a, b) => b.timestamp - a.timestamp) // 按时间降序（最新在上）
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

      await Promise.all(
        sortedMoments.map(async (moment) => {
          try {
            const likes: string[] = [];
            await new Promise<void>((resolve) => {
              gun.get('momentLikes').get(moment.momentId).map().once((data: any, userPub: string) => {
                if (data && userPub !== '_') likes.push(userPub);
              });
              setTimeout(resolve, 500);
            });
            momentLikes.value[moment.momentId] = likes;

            const comments: CommentV2[] = [];
            await new Promise<void>((resolve) => {
              gun.get('momentComments').get(moment.momentId).map().once((data: any, commentId: string) => {
                if (data && commentId !== '_') {
                  comments.push(validateComment({
                    commentId,
                    momentId: moment.momentId,
                    userPub: data.userPub,
                    content: data.content,
                    timestamp: data.timestamp,
                    replyToCommentId: data.replyToCommentId,
                    isDeleted: data.isDeleted,
                  }));
                }
              });
              setTimeout(resolve, 500);
            });
            momentComments.value[moment.momentId] = comments;
          } catch (err) {
            console.error(`加载 ${moment.momentId} 的点赞或评论失败:`, err);
          }
        })
      );
      momentLikes.value = { ...momentLikes.value };
      momentComments.value = { ...momentComments.value };
      console.log('加载动态:', moments.value);
    } catch (err) {
      error.value = '加载动态失败';
      showToast(error.value, 'error');
      console.error('加载动态失败:', err);
    } finally {
      loading.value = false;
    }
  };

  const listenMoments = () => {
    // 实时监听仅用于调试，不自动插入
    if (!currentUserPub.value) return;
    const userPubs = [currentUserPub.value, ...buddyList.value.map(b => b.pub)];
    gun.get('moments').map().on((data: any, momentId: string) => {
      if (data && userPubs.includes(data.userPub)) {
        console.log('实时监听到动态更新，但不自动插入:', { momentId, timestamp: data.timestamp });
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

  const listenComments = () => {
    if (!currentUserPub.value) return;
    gun.get('momentComments').map().on((data: any, momentId: string) => {
      if (data && moments.value.some(m => m.momentId === momentId)) {
        const existingComments = momentComments.value[momentId] || [];
        const comments: CommentV2[] = Object.entries(data)
          .filter(([key]) => key !== '_')
          .map(([commentId, comment]: [string, any]) => validateComment({
            commentId,
            momentId,
            userPub: comment.userPub,
            content: comment.content,
            timestamp: comment.timestamp,
            replyToCommentId: comment.replyToCommentId,
          }));
        comments.forEach(newComment => {
          const index = existingComments.findIndex(c => c.commentId === newComment.commentId);
          if (index === -1) existingComments.push(newComment);
          else existingComments[index] = newComment;
        });
        momentComments.value[momentId] = [...existingComments];
        momentComments.value = { ...momentComments.value };
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
      showToast(`动态已${isHidden ? '隐藏' : '公开'}`, 'success');
    } catch (err) {
      error.value = '切换动态可见性失败';
      showToast(error.value, 'error');
      console.error('切换动态可见性失败:', err);
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
      showToast('动态删除成功', 'success');
    } catch (err) {
      error.value = '动态删除失败';
      showToast(error.value, 'error');
      console.error('动态删除失败:', err);
    } finally {
      loading.value = false;
    }
  };

  const addLike = async (momentId: string) => {
    if (!currentUserPub.value) {
      showToast('请先登录', 'warning');
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
      showToast('点赞成功', 'success');
    } catch (err) {
      error.value = '点赞失败';
      showToast(error.value, 'error');
      console.error('点赞失败:', err);
    } finally {
      loading.value = false;
    }
  };

  const removeLike = async (momentId: string) => {
    if (!currentUserPub.value) {
      showToast('请先登录', 'warning');
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
      showToast('取消点赞成功', 'success');
    } catch (err) {
      error.value = '取消点赞失败';
      showToast(error.value, 'error');
      console.error('取消点赞失败:', err);
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

  const addComment = async (momentId: string, content: string, replyToCommentId?: string) => {
    if (!currentUserPub.value || !content.trim() || !moments.value.some(m => m.momentId === momentId)) {
      showToast('无效操作', 'warning');
      return;
    }

    const comment: CommentV2 = {
      commentId: uuidv4(),
      momentId,
      userPub: currentUserPub.value,
      content: content.trim(),
      timestamp: Date.now(),
      replyToCommentId,
      isDeleted: 0,
    };

    loading.value = true;
    error.value = null;
    try {
      await new Promise<void>((resolve, reject) => {
        gun.get('momentComments').get(momentId).get(comment.commentId).put(comment, (ack: any) => {
          if (ack.err) reject(new Error(ack.err));
          else resolve();
        });
      });
      momentComments.value[momentId] = momentComments.value[momentId] || [];
      momentComments.value[momentId].push(comment);
      momentComments.value = { ...momentComments.value };
      newComment.value[momentId] = '';
      showToast(replyToCommentId ? '回复成功' : '评论成功', 'success');
    } catch (err) {
      error.value = replyToCommentId ? '回复失败' : '评论失败';
      showToast(error.value, 'error');
      console.error(replyToCommentId ? '回复失败:' : '评论失败:', err);
    } finally {
      loading.value = false;
    }
  };

  const getComments = async (momentId: string): Promise<CommentV2[]> => {
    loading.value = true;
    error.value = null;
    try {
      const comments: CommentV2[] = [];
      await new Promise<void>((resolve) => {
        gun.get('momentComments').get(momentId).map().once((data: any, commentId: string) => {
          if (data && commentId !== '_') {
            comments.push(validateComment({
              commentId,
              momentId,
              userPub: data.userPub,
              content: data.content,
              timestamp: data.timestamp,
              replyToCommentId: data.replyToCommentId,
              isDeleted: data.isDeleted,
            }));
          }
        });
        setTimeout(resolve, 500);
      });
      momentComments.value[momentId] = comments;
      momentComments.value = { ...momentComments.value };
      return comments;
    } catch (err) {
      error.value = '获取评论失败';
      showToast(error.value, 'error');
      console.error('获取评论失败:', err);
      return [];
    } finally {
      loading.value = false;
    }
  };

  const deleteComment = async (momentId: string, commentId: string) => {
    if (!currentUserPub.value) {
      showToast('请先登录', 'warning');
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      const moment = moments.value.find(m => m.momentId === momentId);
      const comment = momentComments.value[momentId]?.find(c => c.commentId === commentId);
      if (!moment || !comment || (comment.userPub !== currentUserPub.value && moment.userPub !== currentUserPub.value)) {
        showToast('无权限删除此评论', 'error');
        return;
      }

      await new Promise<void>((resolve, reject) => {
        gun.get('momentComments').get(momentId).get(commentId).put(null, (ack: any) => {
          if (ack.err) reject(new Error(ack.err));
          else resolve();
        });
      });

      momentComments.value[momentId] = momentComments.value[momentId].filter(c => c.commentId !== commentId);
      momentComments.value = { ...momentComments.value };
      showToast('评论删除成功', 'success');
    } catch (err) {
      error.value = '删除评论失败';
      showToast(error.value, 'error');
      console.error('删除评论失败:', err);
    } finally {
      loading.value = false;
    }
  };

  const getBuddyAlias = (pub: string): string => {
    return getAliasRealtime(pub) || currentUserAlias.value || '';
  };

  const getAvatar = (userPub: string): string => {
    return userAvatars.value[userPub] || '';
  };

  const formatTimestamp = (timestamp: number): string => {
    return Number.isFinite(timestamp) ? new Date(timestamp).toLocaleString() : 'Invalid Date';
  };

  onMounted(() => {
    initialize();
  });

  return {
    moments,
    newMomentContent,
    momentLikes,
    momentComments,
    newComment,
    loading,
    error,
    hasMore,
    postMoment,
    loadMoments,
    toggleMomentVisibility,
    deleteMoment,
    addLike,
    removeLike,
    isLiked,
    getLikeCount,
    addComment,
    getComments,
    deleteComment,
    getBuddyAlias,
    getAvatar,
    formatTimestamp,
  };
}

export default useMoments;