import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { colors, radius, shadow, spacing } from '@/src/theme/snapdish';

const settingItems = [
  { id: 'edit', label: 'Edit Profile', icon: 'create-outline' as const },
  { id: 'notifications', label: 'Notifications', icon: 'notifications-outline' as const },
  { id: 'preferences', label: 'Food Preferences', icon: 'restaurant-outline' as const },
  { id: 'privacy', label: 'Privacy & Security', icon: 'shield-checkmark-outline' as const },
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

  const onPressSetting = (id: string, label: string) => {
    if (id === 'preferences') {
      router.push('/categories');
      return;
    }
    Alert.alert(label, `${label} can be expanded in the next iteration.`);
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
          {settingItems.map((item) => (
            <Pressable key={item.id} style={styles.row} onPress={() => onPressSetting(item.id, item.label)}>
              <View style={styles.rowLeft}>
                <Ionicons name={item.icon} size={18} color={colors.textSecondary} />
                <ThemedText style={styles.rowText}>{item.label}</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </Pressable>
          ))}
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
    paddingVertical: spacing.xs,
    ...shadow.md,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  rowLeft: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  rowText: { color: colors.text, fontSize: 15, fontWeight: '600' },
});
