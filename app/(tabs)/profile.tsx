import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Alert, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { colors, radius, shadow } from '@/src/theme/snapdish';

export default function ProfileScreen() {
  const { width } = useWindowDimensions();
  const horizontalPadding = width < 360 ? 14 : 20;
  const statsGap = 8;
  const statsContainerWidth = width - horizontalPadding * 2 - 28; // card padding included
  const statWidth = (statsContainerWidth - statsGap * 2) / 3;
  const nameSize = width < 360 ? 22 : 28;

  const quickActions = [
    { id: 'edit', label: 'Edit Profile', icon: 'create-outline' as const },
    { id: 'notifications', label: 'Notifications', icon: 'notifications-outline' as const },
    { id: 'preferences', label: 'Food Preferences', icon: 'restaurant-outline' as const },
    { id: 'privacy', label: 'Privacy & Security', icon: 'shield-checkmark-outline' as const },
  ];

  const recents = [
    {
      id: 'r1',
      title: 'Garlic Shrimp Pasta',
      image:
        'https://images.unsplash.com/photo-1563379091339-03246963d51a?auto=format&fit=crop&w=900&q=80',
    },
    {
      id: 'r2',
      title: 'Honey Chicken Bowl',
      image:
        'https://images.unsplash.com/photo-1604908554027-81f2fa8f7f65?auto=format&fit=crop&w=900&q=80',
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingHorizontal: horizontalPadding }]}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled">
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={styles.avatarWrap}>
              <Image
                source="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80"
                style={styles.avatarImage}
                contentFit="cover"
              />
            </View>
            <View style={styles.nameBlock}>
              <ThemedText style={[styles.name, { fontSize: nameSize, lineHeight: nameSize + 2 }]}>Samantha</ThemedText>
              <ThemedText style={styles.subtitle}>Food creator • Lagos</ThemedText>
              <View style={styles.badge}>
                <Ionicons name="sparkles" size={12} color={colors.text} />
                <ThemedText style={styles.badgeText}>Pro member</ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={[styles.statCard, { width: statWidth }]}>
              <ThemedText style={styles.statValue}>124</ThemedText>
              <ThemedText style={styles.statLabel}>Saved</ThemedText>
            </View>
            <View style={[styles.statCard, { width: statWidth }]}>
              <ThemedText style={styles.statValue}>38</ThemedText>
              <ThemedText style={styles.statLabel}>Cooked</ThemedText>
            </View>
            <View style={[styles.statCard, { width: statWidth }]}>
              <ThemedText style={styles.statValue}>4.9</ThemedText>
              <ThemedText style={styles.statLabel}>Rating</ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Quick Actions</ThemedText>
          <View style={styles.actionList}>
            {quickActions.map((action) => (
              <Pressable
                key={action.id}
                style={styles.actionBtn}
                onPress={() => Alert.alert(action.label, 'This screen will open in a future update.')}>
                <View style={styles.actionLeft}>
                  <Ionicons name={action.icon} size={18} color={colors.textSecondary} />
                  <ThemedText style={styles.actionText}>{action.label}</ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Recently Generated</ThemedText>
          <View style={styles.recentList}>
            {recents.map((item) => (
              <Pressable
                key={item.id}
                style={styles.recentCard}
                onPress={() => Alert.alert(item.title, 'Recipe detail screen coming soon.')}>
                <Image source={item.image} style={styles.recentImage} contentFit="cover" />
                <View style={styles.recentInfo}>
                  <ThemedText style={styles.recentTitle}>{item.title}</ThemedText>
                  <ThemedText style={styles.recentHint}>Tap to view full steps</ThemedText>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
  container: {
    backgroundColor: colors.canvas,
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 110,
  },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    gap: 14,
    padding: 14,
    ...shadow.md,
  },
  headerTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  avatarWrap: {
    borderRadius: 32,
    height: 64,
    overflow: 'hidden',
    width: 64,
  },
  avatarImage: {
    height: '100%',
    width: '100%',
  },
  nameBlock: {
    flex: 1,
  },
  name: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 30,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.accentLime,
    borderRadius: 10,
    flexDirection: 'row',
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    paddingVertical: 10,
  },
  statValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  actionList: {
    gap: 8,
  },
  actionBtn: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...shadow.sm,
  },
  actionLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  actionText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  recentList: {
    gap: 10,
  },
  recentCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    flexDirection: 'row',
    gap: 10,
    overflow: 'hidden',
    paddingRight: 10,
    ...shadow.sm,
  },
  recentImage: {
    height: 80,
    width: 90,
  },
  recentInfo: {
    flex: 1,
    gap: 2,
  },
  recentTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  recentHint: {
    color: colors.textSecondary,
    fontSize: 12,
  },
});
