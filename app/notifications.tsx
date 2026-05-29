import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  loadNotificationSettings,
  saveNotificationSettings,
  type NotificationSettings,
} from '@/src/services/notification-settings';
import { colors, radius, shadow, spacing, typography } from '@/src/theme/snapdish';

type ToggleRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  value: boolean;
  disabled?: boolean;
  onValueChange: (v: boolean) => void;
};

function ToggleRow({ icon, title, subtitle, value, disabled, onValueChange }: ToggleRowProps) {
  return (
    <View style={[styles.toggleRow, disabled && styles.toggleRowDisabled]}>
      <View style={styles.toggleIconWrap}>
        <Ionicons name={icon} size={18} color={disabled ? colors.textTertiary : colors.textSecondary} />
      </View>
      <View style={styles.toggleBody}>
        <ThemedText style={[styles.toggleTitle, disabled && styles.toggleTitleDisabled]}>{title}</ThemedText>
        <ThemedText style={styles.toggleSub}>{subtitle}</ThemedText>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.border, true: colors.accentLime }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadNotificationSettings()
      .then(setSettings)
      .finally(() => setLoading(false));
  }, []);

  const persist = useCallback(async (next: NotificationSettings) => {
    setSettings(next);
    setSaving(true);
    try {
      await saveNotificationSettings(next);
    } catch {
      Alert.alert('Error', 'Could not save notification settings.');
    } finally {
      setSaving(false);
    }
  }, []);

  const update = (patch: Partial<NotificationSettings>) => {
    void persist({ ...settings, ...patch });
  };

  const masterOff = !settings.enabled;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <ThemedText style={styles.title}>Notifications</ThemedText>
        <View style={styles.backSpacer} />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.text} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <ThemedText style={styles.intro}>
            Control in-app alerts on this device. Push notifications will be added in a future update.
          </ThemedText>

          <View style={styles.card}>
            <ToggleRow
              icon="notifications-outline"
              title="All notifications"
              subtitle="Master switch for alerts inside SnapDish"
              value={settings.enabled}
              onValueChange={(v) => update({ enabled: v })}
            />
          </View>

          <ThemedText style={styles.groupLabel}>Alerts</ThemedText>
          <View style={styles.card}>
            <ToggleRow
              icon="sparkles-outline"
              title="Recipe ready"
              subtitle="When AI finishes generating your recipe"
              value={settings.recipeReady}
              disabled={masterOff}
              onValueChange={(v) => update({ recipeReady: v })}
            />
            <View style={styles.rowDivider} />
            <ToggleRow
              icon="timer-outline"
              title="Timer finished"
              subtitle="When a cooking step timer reaches zero"
              value={settings.timerAlerts}
              disabled={masterOff}
              onValueChange={(v) => update({ timerAlerts: v })}
            />
            <View style={styles.rowDivider} />
            <ToggleRow
              icon="heart-outline"
              title="Saved recipe reminders"
              subtitle="Gentle nudge about recipes you saved"
              value={settings.savedReminders}
              disabled={masterOff}
              onValueChange={(v) => update({ savedReminders: v })}
            />
            <View style={styles.rowDivider} />
            <ToggleRow
              icon="bulb-outline"
              title="Tips & inspiration"
              subtitle="Cooking ideas and suggestions on Home"
              value={settings.tipsAndInspiration}
              disabled={masterOff}
              onValueChange={(v) => update({ tipsAndInspiration: v })}
            />
          </View>

          <View style={styles.noteCard}>
            <Ionicons name="information-circle-outline" size={18} color={colors.brand} />
            <ThemedText style={styles.noteText}>
              Settings save automatically on this phone. Timer alerts still respect your choice when you start a timer on a recipe.
            </ThemedText>
          </View>

          <Pressable
            style={styles.resetBtn}
            onPress={() => {
              Alert.alert(
                'Reset notifications',
                'Restore all notification settings to defaults?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: () => void persist({ ...DEFAULT_NOTIFICATION_SETTINGS }),
                  },
                ],
              );
            }}>
            <ThemedText style={styles.resetBtnText}>Reset to defaults</ThemedText>
          </Pressable>

          {saving ? (
            <ThemedText style={styles.savedHint}>Saving…</ThemedText>
          ) : (
            <ThemedText style={styles.savedHint}>Saved on this device</ThemedText>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.canvas, flex: 1 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  backBtn: { padding: spacing.xxs },
  backSpacer: { width: 32 },
  title: { color: colors.text, fontSize: 20, fontWeight: '700' },
  loadingWrap: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  container: { gap: 12, padding: spacing.md, paddingBottom: 40 },
  intro: {
    color: colors.textSecondary,
    fontSize: typography.bodySm,
    lineHeight: 20,
  },
  groupLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    ...shadow.sm,
  },
  toggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  toggleRowDisabled: { opacity: 0.55 },
  toggleIconWrap: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  toggleBody: { flex: 1, gap: 2 },
  toggleTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  toggleTitleDisabled: { color: colors.textSecondary },
  toggleSub: { color: colors.textSecondary, fontSize: 12, lineHeight: 16 },
  rowDivider: {
    backgroundColor: colors.border,
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.md + 36 + 12,
  },
  noteCard: {
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: 10,
    padding: spacing.md,
    ...shadow.sm,
  },
  noteText: {
    color: colors.textSecondary,
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  resetBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  resetBtnText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '600',
  },
  savedHint: {
    color: colors.textTertiary,
    fontSize: 12,
    textAlign: 'center',
  },
});
