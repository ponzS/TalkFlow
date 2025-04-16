// src/composables/useLanguage.ts
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';

interface Language {
  code: string;
  name: string;
  flag: string; // 添加 flag 属性
}

const languages: Language[] = [
  { code: 'en', name: 'English', flag: '🌍' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'al', name: 'العربية', flag: '🇦🇱' },
  { code: 'du', name: 'हिन्द', flag: '🇮🇳' },
  { code: 'xi', name: 'español', flag: '🇪🇸' },
  { code: 'yi', name: 'italiano', flag: '🇮🇹' },
];

export function useLanguage() {
  const { locale } = useI18n();
  const selectedLanguage = ref<string>(locale.value || 'en'); // 默认英语
  const SETTINGS_FILE = 'language_settings.json';

  // 加载语言设置
  async function loadLanguageSettings(): Promise<string> {
    try {
      const result = await Filesystem.readFile({
        path: SETTINGS_FILE,
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });
      const data = typeof result.data === 'string' ? result.data : await result.data.text();
      const settings = JSON.parse(data);
      return settings?.selectedLanguage || 'en';
    } catch (err) {
      // console.log('未找到语言设置文件，使用默认值 "en"');
      return 'en';
    }
  }

  // 保存语言设置
  async function saveLanguageSettings(langCode: string): Promise<void> {
    try {
      await Filesystem.writeFile({
        path: SETTINGS_FILE,
        data: JSON.stringify({ selectedLanguage: langCode }),
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });
      console.log('语言设置已保存:', langCode);
    } catch (err) {
      console.error('保存语言设置失败:', err);
    }
  }

  // 初始化语言
  async function initLanguage() {
    const savedLang = await loadLanguageSettings();
    selectedLanguage.value = savedLang;
    locale.value = savedLang;
  }

  // 选择语言
  async function selectLanguage(lang: Language) {
    selectedLanguage.value = lang.code;
    locale.value = lang.code;
    await saveLanguageSettings(lang.code);
  }

  // 监听语言变化
  watch(locale, (newLocale) => {
    selectedLanguage.value = newLocale;
  });

  return {
    languages,
    selectedLanguage,
    selectLanguage,
    initLanguage,
  };
}

export default useLanguage;