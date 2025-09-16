import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

export interface NavigationState {
  currentComponent: string;
  activeTab: string;
  lastUpdated: string;
}

export interface NavigationStatesData {
  navigationStates: Record<string, NavigationState>;
}

export class NavigationStateService {
  private readonly fileName = 'navigation_states.json';
  private readonly directory = Directory.Data;

  /**
   * 保存导航状态到 JSON 文件
   */
  async saveNavigationState(userPub: string, currentComponent: string, activeTab: string): Promise<void> {
    try {
      // 读取现有数据
      const existingData = await this.loadNavigationStates();
      
      // 更新特定用户的状态
      existingData.navigationStates[userPub] = {
        currentComponent,
        activeTab,
        lastUpdated: new Date().toISOString()
      };

      // 写回文件
      await Filesystem.writeFile({
        path: this.fileName,
        data: JSON.stringify(existingData, null, 2),
        directory: this.directory,
        encoding: Encoding.UTF8,
      });

      // 导航状态已保存
    } catch (error) {
      // 保存导航状态失败
      throw error;
    }
  }

  /**
   * 获取特定用户的导航状态
   */
  async getNavigationState(userPub: string): Promise<NavigationState | null> {
    try {
      const data = await this.loadNavigationStates();
      const userState = data.navigationStates[userPub];
      
      if (userState) {
        // 恢复导航状态
        return userState;
      }
      
      return null;
    } catch (error) {
      // 获取导航状态失败
      return null;
    }
  }

  /**
   * 删除特定用户的导航状态
   */
  async removeNavigationState(userPub: string): Promise<void> {
    try {
      const existingData = await this.loadNavigationStates();
      
      if (existingData.navigationStates[userPub]) {
        delete existingData.navigationStates[userPub];
        
        await Filesystem.writeFile({
          path: this.fileName,
          data: JSON.stringify(existingData, null, 2),
          directory: this.directory,
          encoding: Encoding.UTF8,
        });
        
        // 导航状态已删除
      }
    } catch (error) {
      // 删除导航状态失败
    }
  }

  /**
   * 获取所有导航状态（调试用）
   */
  async getAllNavigationStates(): Promise<NavigationStatesData> {
    return await this.loadNavigationStates();
  }

  /**
   * 清空所有导航状态
   */
  async clearAllNavigationStates(): Promise<void> {
    try {
      const emptyData: NavigationStatesData = {
        navigationStates: {}
      };

      await Filesystem.writeFile({
        path: this.fileName,
        data: JSON.stringify(emptyData, null, 2),
        directory: this.directory,
        encoding: Encoding.UTF8,
      });

      // 所有导航状态已清空
    } catch (error) {
      // 清空导航状态失败
      throw error;
    }
  }

  /**
   * 获取配置文件路径（调试用）
   */
  getConfigFilePath(): string {
    return `${this.directory}/${this.fileName}`;
  }

  /**
   * 从文件加载导航状态数据
   */
  private async loadNavigationStates(): Promise<NavigationStatesData> {
    try {
      const result = await Filesystem.readFile({
        path: this.fileName,
        directory: this.directory,
        encoding: Encoding.UTF8,
      });

      const data = JSON.parse(result.data as string) as NavigationStatesData;
      
      // 验证数据结构
      if (!data.navigationStates) {
        throw new Error('Invalid data structure');
      }

      return data;
    } catch (error) {
      // 文件不存在或格式错误，返回默认结构
      // 导航状态文件不存在或损坏，创建新文件
      const defaultData: NavigationStatesData = {
        navigationStates: {}
      };

      try {
        await Filesystem.writeFile({
          path: this.fileName,
          data: JSON.stringify(defaultData, null, 2),
          directory: this.directory,
          encoding: Encoding.UTF8,
        });
      } catch (writeError) {
        // 创建导航状态文件失败
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
export const navigationStateService = new NavigationStateService();