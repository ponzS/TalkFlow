import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

export interface SegmentState {
  selectedSegment: string;
  lastUpdated: string;
}

export interface SegmentStatesData {
  segmentStates: Record<string, SegmentState>;
}

export class SegmentStateService {
  private readonly fileName = 'segment_states.json';
  private readonly directory = Directory.Data;

  /**
   * 保存 segment 状态到 JSON 文件
   */
  async saveSegmentState(pageId: string, selectedSegment: string): Promise<void> {
    try {
      // 读取现有数据
      const existingData = await this.loadSegmentStates();
      
      // 更新特定页面的状态
      existingData.segmentStates[pageId] = {
        selectedSegment,
        lastUpdated: new Date().toISOString()
      };

      // 写回文件
      await Filesystem.writeFile({
        path: this.fileName,
        data: JSON.stringify(existingData, null, 2),
        directory: this.directory,
        encoding: Encoding.UTF8,
      });

      // Segment 状态已保存
    } catch (error) {
      // 保存 segment 状态失败
      throw error;
    }
  }

  /**
   * 获取特定页面的 segment 状态
   */
  async getSegmentState(pageId: string): Promise<SegmentState | null> {
    try {
      const data = await this.loadSegmentStates();
      const pageState = data.segmentStates[pageId];
      
      if (pageState) {
        // 恢复 segment 状态
        return pageState;
      }
      
      return null;
    } catch (error) {
      // 获取 segment 状态失败
      return null;
    }
  }

  /**
   * 删除特定页面的 segment 状态
   */
  async removeSegmentState(pageId: string): Promise<void> {
    try {
      const existingData = await this.loadSegmentStates();
      
      if (existingData.segmentStates[pageId]) {
        delete existingData.segmentStates[pageId];
        
        await Filesystem.writeFile({
          path: this.fileName,
          data: JSON.stringify(existingData, null, 2),
          directory: this.directory,
          encoding: Encoding.UTF8,
        });
        
        // Segment 状态已删除
      }
    } catch (error) {
      // 删除 segment 状态失败
    }
  }

  /**
   * 获取所有 segment 状态（调试用）
   */
  async getAllSegmentStates(): Promise<SegmentStatesData> {
    return await this.loadSegmentStates();
  }

  /**
   * 清空所有 segment 状态
   */
  async clearAllSegmentStates(): Promise<void> {
    try {
      const emptyData: SegmentStatesData = {
        segmentStates: {}
      };

      await Filesystem.writeFile({
        path: this.fileName,
        data: JSON.stringify(emptyData, null, 2),
        directory: this.directory,
        encoding: Encoding.UTF8,
      });

      // 所有 segment 状态已清空
    } catch (error) {
      // 清空 segment 状态失败
      throw error;
    }
  }

  /**
   * 从文件加载 segment 状态数据
   */
  private async loadSegmentStates(): Promise<SegmentStatesData> {
    try {
      const result = await Filesystem.readFile({
        path: this.fileName,
        directory: this.directory,
        encoding: Encoding.UTF8,
      });

      const data = JSON.parse(result.data as string) as SegmentStatesData;
      
      // 验证数据结构
      if (!data.segmentStates) {
        throw new Error('Invalid data structure');
      }

      return data;
    } catch (error) {
      // 文件不存在或格式错误，返回默认结构
      // Segment 状态文件不存在或损坏，创建新文件
      const defaultData: SegmentStatesData = {
        segmentStates: {}
      };

      try {
        await Filesystem.writeFile({
          path: this.fileName,
          data: JSON.stringify(defaultData, null, 2),
          directory: this.directory,
          encoding: Encoding.UTF8,
        });
      } catch (writeError) {
        // 创建 segment 状态文件失败
      }

      return defaultData;
    }
  }

  /**
   * 检查文件是否存在
   */
  async fileExists(): Promise<boolean> {
    try {
      await Filesystem.stat({
        path: this.fileName,
        directory: this.directory,
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取文件统计信息（调试用）
   */
  async getFileStats() {
    try {
      const stats = await Filesystem.stat({
        path: this.fileName,
        directory: this.directory,
      });
      return {
        exists: true,
        size: stats.size,
        mtime: stats.mtime,
        uri: stats.uri
      };
    } catch (error) {
      return {
        exists: false,
        error: error
      };
    }
  }
}

// 创建单例实例
export const segmentStateService = new SegmentStateService();