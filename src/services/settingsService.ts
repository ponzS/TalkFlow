import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

const SETTINGS_FILE = 'settings.json';

export interface AppSettings {
  isRelaySharingEnabled: boolean;
}

class SettingsService {
  private async loadSettings(): Promise<Partial<AppSettings>> {
    try {
      const result = await Filesystem.readFile({
        path: SETTINGS_FILE,
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });
      return JSON.parse(result.data as string);
    } catch (e) {
      // File does not exist, which is fine. Return empty object.
      return {};
    }
  }

  private async saveSettings(settings: AppSettings): Promise<void> {
    try {
      await Filesystem.writeFile({
        path: SETTINGS_FILE,
        data: JSON.stringify(settings, null, 2),
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });
    } catch (e) {
      // 无法保存设置
    }
  }

  async isRelaySharingEnabled(): Promise<boolean> {
    const settings = await this.loadSettings();
    return settings.isRelaySharingEnabled ?? true; // Default to true
  }

  async setRelaySharingEnabled(enabled: boolean): Promise<void> {
    const settings = await this.loadSettings();
    const newSettings: AppSettings = { ...settings, isRelaySharingEnabled: enabled };
    await this.saveSettings(newSettings);
  }
}

export const settingsService = new SettingsService();