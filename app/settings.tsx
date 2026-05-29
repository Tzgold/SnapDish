import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { colors, radius, shadow, spacing } from '@/src/theme/snapdish';

const settingItems = [
  { id: 'preferences', label: 'Food Preferences', icon: 'restaurant-outline' as const, route: '/preferences' as const },
  { id: 'notifications', label: 'Notifications', icon: 'notifications-outline' as const, route: '/notifications' as const },
  { id: 'privacy', label: 'Privacy & Security', icon: 'shield-checkmark-outline' as const, route: '/privacy' as const },
  { id: 'about', label: 'About SnapDish', icon: 'information-circle-outline' as const, route: '/about' as const },
];

export default function SettingsScreen() {
  const router = useRouter();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.push('/profile');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <ThemedText style={styles.title}>Settings</ThemedText>
          <View style={styles.backSpacer} />
        </View>

        <View style={styles.card}>
          {settingItems.map((item, index) => (
            <Pressable
              key={item.id}
              style={[styles.row, index > 0 && styles.rowBorder]}
              onPress={() => router.push(item.route)}>
              <View style={styles.rowLeft}>
                <View style={styles.iconWrap}>
                  <Ionicons name={item.icon} size={18} color={colors.textSecondary} />
                </View>
                <ThemedText style={styles.rowText}>{item.label}</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </Pressable>
          ))}
        </View>

        <View style={styles.versionCard}>
          <ThemedText style={styles.versionText}>SnapDish · version 1.0</ThemedText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.canvas, flex: 1 },
  container: { padding: spacing.md, gap: spacing.md },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  backBtn: { padding: spacing.xxs },
  backSpacer: { width: 32 },
  title: { color: colors.text, fontSize: 20, fontWeight: '700' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: 4,
    ...shadow.md,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  rowBorder: {
    borderColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowLeft: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  rowText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  versionCard: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  versionText: {
    color: colors.textTertiary,
    fontSize: 12,
  },
});
