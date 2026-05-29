import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { clearGuestMode } from '@/app/_layout';
import { ThemedText } from '@/components/themed-text';
import { authClient } from '@/src/lib/auth-client';
import { clearPreAuthOnboarding } from '@/src/lib/pre-auth-onboarding';
import { secureStorage } from '@/src/lib/secure-storage';
import { CATEGORY_STORAGE_KEY } from '@/app/(tabs)/categories';
import { colors, radius, shadow, spacing, typography } from '@/src/theme/snapdish';

function InfoBlock({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.infoBlock}>
      <ThemedText style={styles.infoTitle}>{title}</ThemedText>
      <ThemedText style={styles.infoBody}>{body}</ThemedText>
    </View>
  );
}

function ActionRow({
  icon,
  label,
  subtitle,
  danger,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.actionRow} onPress={onPress}>
      <View style={[styles.actionIcon, danger && styles.actionIconDanger]}>
        <Ionicons name={icon} size={18} color={danger ? colors.danger : colors.textSecondary} />
      </View>
      <View style={styles.actionBody}>
        <ThemedText style={[styles.actionLabel, danger && styles.actionLabelDanger]}>{label}</ThemedText>
        {subtitle ? <ThemedText style={styles.actionSub}>{subtitle}</ThemedText> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
    </Pressable>
  );
}

function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return email;
  const visible = user.slice(0, 2);
  return `${visible}${'•'.repeat(Math.max(1, user.length - 2))}@${domain}`;
}

export default function PrivacyScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const signedIn = Boolean(session?.user);

  const clearLocalData = () => {
    Alert.alert(
      'Clear local data',
      'This removes cached preferences on this device (category focus, onboarding draft, guest flag). Your account and saved recipes on the server are not deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearPreAuthOnboarding();
              await clearGuestMode();
              await secureStorage.deleteItemAsync(CATEGORY_STORAGE_KEY);
              Alert.alert('Done', 'Local app data on this device was cleared.');
            } catch {
              Alert.alert('Error', 'Could not clear all local data.');
            }
          },
        },
      ],
    );
  };

  const signOutEverywhere = () => {
    Alert.alert('Sign out', 'Sign out of SnapDish on this device?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await clearPreAuthOnboarding();
          await authClient.signOut();
          router.replace('/sign-in');
        },
      },
    ]);
  };

  const requestDeletion = () => {
    Alert.alert(
      'Delete account',
      signedIn
        ? `To permanently delete your SnapDish account and all recipes tied to ${session?.user?.email ?? 'your email'}, contact support. We will remove your data within 30 days.\n\nFor now you can sign out and stop using the app. Full self-service deletion is coming soon.`
        : 'Sign in first if you want to delete an account tied to your email.',
      [{ text: 'OK' }],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <ThemedText style={styles.title}>Privacy & Security</ThemedText>
        <View style={styles.backSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <ThemedText style={styles.cardHeading}>Your account</ThemedText>
          {signedIn ? (
            <>
              <View style={styles.accountRow}>
                <View style={styles.accountAvatar}>
                  <ThemedText style={styles.accountAvatarText}>
                    {(session?.user?.name?.charAt(0) ?? session?.user?.email?.charAt(0) ?? 'U').toUpperCase()}
                  </ThemedText>
                </View>
                <View style={styles.accountInfo}>
                  <ThemedText style={styles.accountName}>{session?.user?.name ?? 'SnapDish user'}</ThemedText>
                  <ThemedText style={styles.accountEmail}>
                    {session?.user?.email ? maskEmail(session.user.email) : ''}
                  </ThemedText>
                </View>
                <View style={styles.secureBadge}>
                  <Ionicons name="lock-closed" size={12} color={colors.brand} />
                  <ThemedText style={styles.secureBadgeText}>Secure</ThemedText>
                </View>
              </View>
              <View style={styles.divider} />
              <ActionRow
                icon="key-outline"
                label="Change password"
                subtitle="Send a reset link to your email"
                onPress={() => router.push('/forgot-password')}
              />
            </>
          ) : (
            <View style={styles.guestBlock}>
              <ThemedText style={styles.guestText}>
                You are browsing as a guest. Sign in to sync recipes, save favorites, and manage account security.
              </ThemedText>
              <Pressable style={styles.signInBtn} onPress={() => router.push('/sign-in')}>
                <ThemedText style={styles.signInBtnText}>Sign in</ThemedText>
              </Pressable>
            </View>
          )}
        </View>

        <ThemedText style={styles.groupLabel}>Data & privacy</ThemedText>
        <View style={styles.card}>
          <InfoBlock
            title="What we store"
            body="When signed in: your email, saved recipes, food preferences, pantry selections, and cook sessions. Photos you upload are sent to our AI provider to generate recipes and are not kept as permanent profile photos unless you save the recipe."
          />
          <View style={styles.divider} />
          <InfoBlock
            title="How recipes are made"
            body="SnapDish uses AI to suggest ingredients and steps. Always verify allergens, doneness, and food safety yourself — especially for raw meat, seafood, and allergies."
          />
          <View style={styles.divider} />
          <InfoBlock
            title="Your photos"
            body="Food photos are processed to create a recipe. We do not sell your images. Use the camera and gallery only for food you want help cooking."
          />
        </View>

        <ThemedText style={styles.groupLabel}>Device</ThemedText>
        <View style={styles.card}>
          <ActionRow
            icon="trash-outline"
            label="Clear local cache"
            subtitle="Category focus, onboarding draft, guest flag"
            onPress={clearLocalData}
          />
          {signedIn ? (
            <>
              <View style={styles.divider} />
              <ActionRow
                icon="log-out-outline"
                label="Sign out"
                subtitle="End session on this device"
                danger
                onPress={signOutEverywhere}
              />
              <View style={styles.divider} />
              <ActionRow
                icon="person-remove-outline"
                label="Delete account"
                subtitle="Permanent removal of your data"
                danger
                onPress={requestDeletion}
              />
            </>
          ) : null}
        </View>

        <View style={styles.footerNote}>
          <ThemedText style={styles.footerNoteText}>
            Sessions use encrypted storage on your device. API traffic should use HTTPS in production (ngrok or hosted server for Google sign-in).
          </ThemedText>
        </View>
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
  cardHeading: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  accountRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  accountAvatar: {
    alignItems: 'center',
    backgroundColor: colors.accentLime,
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  accountAvatarText: { color: colors.text, fontSize: 18, fontWeight: '700' },
  accountInfo: { flex: 1, gap: 2 },
  accountName: { color: colors.text, fontSize: 16, fontWeight: '700' },
  accountEmail: { color: colors.textSecondary, fontSize: 13 },
  secureBadge: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  secureBadgeText: { color: colors.brand, fontSize: 11, fontWeight: '700' },
  guestBlock: { gap: 12 },
  guestText: { color: colors.textSecondary, fontSize: typography.bodySm, lineHeight: 20 },
  signInBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.text,
    borderRadius: radius.sm,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  signInBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  infoBlock: { gap: 6 },
  infoTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  infoBody: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
  divider: {
    backgroundColor: colors.border,
    height: StyleSheet.hairlineWidth,
    marginVertical: 14,
  },
  actionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  actionIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  actionIconDanger: { backgroundColor: '#FEECEC' },
  actionBody: { flex: 1, gap: 2 },
  actionLabel: { color: colors.text, fontSize: 15, fontWeight: '600' },
  actionLabelDanger: { color: colors.danger },
  actionSub: { color: colors.textSecondary, fontSize: 12 },
  footerNote: { paddingHorizontal: 4, paddingTop: 4 },
  footerNoteText: {
    color: colors.textTertiary,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
});
