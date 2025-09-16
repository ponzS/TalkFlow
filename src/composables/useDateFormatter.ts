import { useI18n } from 'vue-i18n';

export function useDateFormatter() {
  const { t } = useI18n();

  /**
   * 格式化时间：YYYY-MM-DD
   */
  function formatDate(date: Date): string {
    return date.toLocaleDateString();
  }

  /**
   * 格式化时分秒：HH:mm:ss
   */
  function formatTime(date: Date): string {
    const hh = date.getHours().toString().padStart(2, '0');
    const mm = date.getMinutes().toString().padStart(2, '0');
    const ss = date.getSeconds().toString().padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }

  /**
   * 根据传入的时间字符串，返回：
   * - 刚刚（小于60秒）
   * - X分钟前（1到10分钟）
   * - 今天（超过10分钟但在今天）
   * - 明天
   * - 昨天
   * - 其它：YYYY-MM-DD HH:mm:ss
   */
  function formatLastTime(timeStr: string): string {
    const date = new Date(timeStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    // 刚刚（小于60秒）
    if (diffInSeconds >= 0 && diffInSeconds < 60) {
      return t('Just now') ;
    }

    // 1到10分钟前
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes >= 1 && diffInMinutes <= 10) {
      return t('Mins ago');
    }

    // 今天
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const dayAfterTomorrowStart = new Date(todayStart);
    dayAfterTomorrowStart.setDate(dayAfterTomorrowStart.getDate() + 2);
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    if (date >= todayStart && date < tomorrowStart) {
      return `Today ${formatTime(date)}` ;
    }

    // 明天
    if (date >= tomorrowStart && date < dayAfterTomorrowStart) {
      return `Tomorrow ${formatTime(date)}`;
    }

    // 昨天
    if (date >= yesterdayStart && date < todayStart) {
      return `Yesterday ${formatTime(date)}` ;
    }

    // 其它
    return `${formatDate(date)} ${formatTime(date)}`;
  }

  return {
    formatLastTime
  };
}