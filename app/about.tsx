import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { API_BASE_URL } from '@/src/config/api';
import { colors, radius, shadow, spacing, typography } from '@/src/theme/snapdish';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

const FEATURES = [
  { icon: 'camera-outline' as const, title: 'Photo to recipe', desc: 'Snap food and get ingredients + steps' },
  { icon: 'search-outline' as const, title: 'Name any dish', desc: 'Type a dish and AI builds a full recipe' },
  { icon: 'options-outline' as const, title: 'Your preferences', desc: 'Diet, skill level, and time shape results' },
  { icon: 'heart-outline' as const, title: 'Save favorites', desc: 'Bookmark recipes to cook again later' },
  { icon: 'timer-outline' as const, title: 'Step timers', desc: 'Countdown timers while you cook' },
];

function FeatureRow({ icon, title, desc }: { icon: keyof typeof Ionicons.glyphMap; title: string; desc: string }) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon} size={20} color={colors.text} />
      </View>
      <View style={styles.featureText}>
        <ThemedText style={styles.featureTitle}>{title}</ThemedText>
        <ThemedText style={styles.featureDesc}>{desc}</ThemedText>
      </View>
    </View>
  );
}

export default function AboutScreen() {
  const router = useRouter();

  const openLink = (url: string) => {
    void Linking.openURL(url).catch(() => {
      /* ignore */
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <ThemedText style={styles.title}>About SnapDish</ThemedText>
        <View style={styles.backSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.logoCircle}>
            <Ionicons name="restaurant" size={36} color={colors.text} />
          </View>
          <ThemedText style={styles.appName}>SnapDish</ThemedText>
          <ThemedText style={styles.version}>Version {APP_VERSION}</ThemedText>
          <ThemedText style={styles.tagline}>
            Turn a dish name or food photo into a clear, cookable recipe — tailored to how you like to eat.
          </ThemedText>
        </View>

        <ThemedText style={styles.groupLabel}>What you can do</ThemedText>
        <View style={styles.card}>
          {FEATURES.map((f, i) => (
            <View key={f.title}>
              {i > 0 ? <View style={styles.rowDivider} /> : null}
              <FeatureRow icon={f.icon} title={f.title} desc={f.desc} />
            </View>
          ))}
        </View>

        <ThemedText style={styles.groupLabel}>Important</ThemedText>
        <View style={styles.disclaimerCard}>
          <Ionicons name="warning-outline" size={20} color="#B45309" />
          <ThemedText style={styles.disclaimerText}>
            Recipes are AI-generated suggestions. Check allergens, internal temperatures, and ingredient safety before serving. SnapDish is not a substitute for professional dietary or medical advice.
          </ThemedText>
        </View>

        <ThemedText style={styles.groupLabel}>Technical</ThemedText>
        <View style={styles.card}>
          <View style={styles.metaRow}>
            <ThemedText style={styles.metaLabel}>API server</ThemedText>
            <ThemedText style={styles.metaValue} numberOfLines={2}>
              {API_BASE_URL}
            </ThemedText>
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.metaRow}>
            <ThemedText style={styles.metaLabel}>Built with</ThemedText>
            <ThemedText style={styles.metaValue}>Expo · React Native · Better Auth</ThemedText>
          </View>
        </View>

        <ThemedText style={styles.groupLabel}>Feedback</ThemedText>
        <View style={styles.card}>
          <Pressable style={styles.linkRow} onPress={() => openLink('mailto:support@snapdish.app?subject=SnapDish%20Feedback')}>
            <Ionicons name="mail-outline" size={18} color={colors.brand} />
            <ThemedText style={styles.linkText}>Send feedback</ThemedText>
            <Ionicons name="open-outline" size={14} color={colors.textTertiary} />
          </Pressable>
          <View style={styles.rowDivider} />
          <Pressable
            style={styles.linkRow}
            onPress={() => router.push('/privacy')}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.brand} />
            <ThemedText style={styles.linkText}>Privacy & security</ThemedText>
            <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
          </Pressable>
        </View>

        <ThemedText style={styles.copyright}>© {new Date().getFullYear()} SnapDish. Made for home cooks.</ThemedText>
      </ScrollView>
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
  container: { gap: 12, padding: spacing.md, paddingBottom: 40 },
  heroCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    gap: 8,
    padding: spacing.lg,
    ...shadow.md,
  },
  logoCircle: {
    alignItems: 'center',
    backgroundColor: colors.accentLime,
    borderRadius: 40,
    height: 72,
    justifyContent: 'center',
    marginBottom: 4,
    width: 72,
  },
  appName: { color: colors.text, fontSize: typography.h2, fontWeight: '700' },
  version: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  tagline: {
    color: colors.textSecondary,
    fontSize: typography.bodySm,
    lineHeight: 20,
    marginTop: 4,
    textAlign: 'center',
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
    padding: spacing.md,
    ...shadow.sm,
  },
  featureRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 4,
  },
  featureIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 10,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  featureText: { flex: 1, gap: 2 },
  featureTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  featureDesc: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  rowDivider: {
    backgroundColor: colors.border,
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
  },
  disclaimerCard: {
    alignItems: 'flex-start',
    backgroundColor: '#FFF8EB',
    borderColor: '#FDE68A',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: spacing.md,
  },
  disclaimerText: {
    color: '#92400E',
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  metaRow: { gap: 4 },
  metaLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  metaValue: { color: colors.text, fontSize: 13, lineHeight: 18 },
  linkRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
  },
  linkText: { color: colors.text, flex: 1, fontSize: 15, fontWeight: '600' },
  copyright: {
    color: colors.textTertiary,
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
});
