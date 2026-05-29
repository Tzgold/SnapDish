import { secureStorage } from '@/src/lib/secure-storage';

const STORAGE_KEY = 'snapdish.notificationSettings';

export type NotificationSettings = {
  /** Master switch for in-app alerts */
  enabled: boolean;
  /** Alert when recipe generation finishes */
  recipeReady: boolean;
  /** Sound/alert when a step timer finishes */
  timerAlerts: boolean;
  /** Remind about saved recipes you have not opened */
  savedReminders: boolean;
  /** Occasional cooking tips on Home */
  tipsAndInspiration: boolean;
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  recipeReady: true,
  timerAlerts: true,
  savedReminders: false,
  tipsAndInspiration: true,
};

export async function loadNotificationSettings(): Promise<NotificationSettings> {
  try {
    const raw = await secureStorage.getItemAsync(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_NOTIFICATION_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<NotificationSettings>;
    return { ...DEFAULT_NOTIFICATION_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_NOTIFICATION_SETTINGS };
  }
}

export async function saveNotificationSettings(settings: NotificationSettings): Promise<void> {
  await secureStorage.setItemAsync(STORAGE_KEY, JSON.stringify(settings));
}

/** True when a specific notification type should fire */
export async function isNotificationEnabled(
  key: Exclude<keyof NotificationSettings, 'enabled'>,
): Promise<boolean> {
  const s = await loadNotificationSettings();
  return s.enabled && s[key];
}
