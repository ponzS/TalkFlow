import { ref, watch, nextTick } from 'vue';
import { segmentStateService } from '@/services/segmentStateService';

export interface UseSegmentStateOptions {
  pageId: string;
  defaultSegment: string;
  validSegments?: string[];
}

export function useSegmentState(options: UseSegmentStateOptions) {
  const { pageId, defaultSegment, validSegments } = options;
  
  // 响应式的 segment 状态
  const selectedSegment = ref(defaultSegment);
  const isLoading = ref(true);

  /**
   * 保存当前 segment 状态
   */
  const saveSegmentState = async (segment: string) => {
    try {
      await segmentStateService.saveSegmentState(pageId, segment);
    } catch (error) {
    //  console.warn(`保存 ${pageId} segment 状态失败:`, error);
    }
  };

  /**
   * 恢复保存的 segment 状态
   */
  const restoreSegmentState = async () => {
    try {
      isLoading.value = true;
      const savedState = await segmentStateService.getSegmentState(pageId);
      
      if (savedState && savedState.selectedSegment) {
        // 验证保存的状态是否有效
        if (!validSegments || validSegments.includes(savedState.selectedSegment)) {
          selectedSegment.value = savedState.selectedSegment;
         // console.log(`${pageId} 恢复保存的 segment 状态:`, savedState.selectedSegment);
        } else {
        //  console.warn(`${pageId} 保存的 segment 状态无效:`, savedState.selectedSegment, '使用默认状态:', defaultSegment);
          selectedSegment.value = defaultSegment;
        }
      } else {
        selectedSegment.value = defaultSegment;
       // console.log(`${pageId} 没有保存的 segment 状态，使用默认状态:`, defaultSegment);
      }
    } catch (error) {
     // console.warn(`恢复 ${pageId} segment 状态失败:`, error);
      selectedSegment.value = defaultSegment;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 更新 segment 状态（手动调用）
   */
  const updateSegmentState = async (segment: string) => {
    if (!validSegments || validSegments.includes(segment)) {
      selectedSegment.value = segment;
      await saveSegmentState(segment);
    } else {
     // console.warn(`${pageId} 无效的 segment 值:`, segment);
    }
  };

  /**
   * 重置为默认状态
   */
  const resetSegmentState = async () => {
    selectedSegment.value = defaultSegment;
    await saveSegmentState(defaultSegment);
  };

  /**
   * 删除保存的状态
   */
  const clearSegmentState = async () => {
    try {
      await segmentStateService.removeSegmentState(pageId);
      selectedSegment.value = defaultSegment;
    //  console.log(`${pageId} segment 状态已清除`);
    } catch (error) {
     // console.warn(`清除 ${pageId} segment 状态失败:`, error);
    }
  };

  // 监听 selectedSegment 变化，自动保存
  watch(selectedSegment, async (newSegment) => {
    if (!isLoading.value) {
      await saveSegmentState(newSegment);
    }
  });

  // 初始化时恢复状态
  nextTick(async () => {
    await restoreSegmentState();
  });

  return {
    selectedSegment,
    isLoading,
    updateSegmentState,
    resetSegmentState,
    clearSegmentState,
    saveSegmentState,
    restoreSegmentState,
  };
} 