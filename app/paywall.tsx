import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { authClient } from '@/src/lib/auth-client';
import {
  createCheckoutSession,
  isProStatus,
  openBillingPortal,
  syncSubscription,
  type SubscriptionInfo,
} from '@/src/services/subscription';
import { colors, radius, shadow, spacing, typography } from '@/src/theme/snapdish';

const FEATURES = [
  { icon: 'infinite-outline' as const, text: 'Unlimited recipe generations' },
  { icon: 'camera-outline' as const, text: 'Unlimited photo recipe scans' },
  { icon: 'heart-outline' as const, text: 'Save & sync all your recipes' },
  { icon: 'options-outline' as const, text: 'AI tailored to your preferences' },
  { icon: 'timer-outline' as const, text: 'Step-by-step cooking timers' },
  { icon: 'cloud-outline' as const, text: 'Recipe history across devices' },
];

export default function PaywallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ success?: string; session_id?: string; cancelled?: string }>();
  const { width } = useWindowDimensions();
  const isSmall = width < 360;
  const { data: session } = authClient.useSession();
  const signedIn = Boolean(session?.user);

  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null);
  const checkoutOpenedRef = useRef(false);

  const sessionId =
    typeof params.session_id === 'string'
      ? params.session_id
      : Array.isArray(params.session_id)
        ? params.session_id[0]
        : undefined;

  const isPro = subInfo ? isProStatus(subInfo.status) : false;

  const runSync = useCallback(async () => {
    if (!signedIn) return;
    setSyncing(true);
    try {
      const info = await syncSubscription(sessionId);
      setSubInfo(info);
    } catch {
      /* keep previous state */
    } finally {
      setSyncing(false);
    }
  }, [signedIn, sessionId]);

  useFocusEffect(
    useCallback(() => {
      void runSync();
    }, [runSync]),
  );

  useEffect(() => {
    if (params.success === '1' || sessionId) {
      void runSync();
    }
  }, [params.success, sessionId, runSync]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && checkoutOpenedRef.current) {
        checkoutOpenedRef.current = false;
        void runSync();
      }
    });
    return () => sub.remove();
  }, [runSync]);

  const handleSubscribe = async () => {
    if (!signedIn) {
      Alert.alert(
        'Sign in first',
        'Create a free account to subscribe. It only takes a moment.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign in', onPress: () => router.push('/sign-in') },
        ],
      );
      return;
    }
    setBusy(true);
    try {
      const url = await createCheckoutSession();
      checkoutOpenedRef.current = true;
      await Linking.openURL(url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not start checkout.';
      if (/Stripe is not configured/i.test(msg)) {
        Alert.alert(
          'Coming soon',
          'Payments are not activated on this server yet. Add STRIPE_SECRET_KEY and STRIPE_PRICE_ID to server/.env to enable subscriptions.',
        );
      } else if (/business name|account name/i.test(msg)) {
        Alert.alert(
          'Finish Stripe setup',
          'In Stripe Dashboard go to Settings → Account details and add your Public business name (e.g. SnapDish). Save, then tap Subscribe again.',
        );
      } else {
        Alert.alert('Checkout', msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleManage = async () => {
    setBusy(true);
    try {
      const url = await openBillingPortal();
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert('Billing', e instanceof Error ? e.message : 'Could not open billing portal.');
    } finally {
      setBusy(false);
    }
  };

  const goHome = () => {
    router.replace('/(tabs)');
  };

  if (isPro) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.successWrap}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={72} color={colors.brand} />
          </View>
          <ThemedText style={styles.successTitle}>Welcome to SnapDish Pro!</ThemedText>
          <ThemedText style={styles.successSub}>
            Your subscription is active. Enjoy unlimited AI recipes, saved history, and more.
          </ThemedText>
          <Pressable style={styles.successBtn} onPress={goHome}>
            <Ionicons name="restaurant-outline" size={20} color="#000" />
            <ThemedText style={styles.successBtnText}>Start cooking</ThemedText>
          </Pressable>
          <Pressable style={styles.manageBtn} onPress={() => void handleManage()} disabled={busy}>
            <ThemedText style={styles.manageBtnText}>Manage subscription</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color={colors.text} />
        </Pressable>
      </View>

      {syncing ? (
        <View style={styles.syncBanner}>
          <ActivityIndicator size="small" color={colors.text} />
          <ThemedText style={styles.syncBannerText}>Checking your subscription…</ThemedText>
        </View>
      ) : null}

      {params.success === '1' && !syncing ? (
        <View style={styles.pendingBanner}>
          <Ionicons name="time-outline" size={16} color="#92400E" />
          <ThemedText style={styles.pendingBannerText}>
            Payment received — tap Refresh below if Pro is not unlocked yet.
          </ThemedText>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={[styles.container, { paddingHorizontal: isSmall ? 16 : 24 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <View style={styles.iconWrap}>
            <Ionicons name="restaurant" size={40} color={colors.text} />
          </View>
          <ThemedText style={[styles.heroTitle, { fontSize: isSmall ? 26 : 30 }]}>
            SnapDish Pro
          </ThemedText>
          <ThemedText style={styles.heroSub}>
            Cook smarter. Generate unlimited AI recipes tailored to you.
          </ThemedText>
        </View>

        <View style={styles.priceCard}>
          <View style={styles.priceBadge}>
            <ThemedText style={styles.priceBadgeText}>MOST POPULAR</ThemedText>
          </View>
          <View style={styles.priceRow}>
            <ThemedText style={styles.priceAmount}>$9</ThemedText>
            <View style={styles.pricePer}>
              <ThemedText style={styles.pricePerText}>per</ThemedText>
              <ThemedText style={styles.pricePerText}>month</ThemedText>
            </View>
          </View>
          <ThemedText style={styles.priceNote}>Cancel any time · no contract</ThemedText>
        </View>

        <View style={styles.featuresCard}>
          <ThemedText style={styles.featuresHeading}>Everything included</ThemedText>
          {FEATURES.map((f) => (
            <View key={f.text} style={styles.featureRow}>
              <View style={styles.featureCheckWrap}>
                <Ionicons name="checkmark" size={14} color={colors.text} />
              </View>
              <ThemedText style={styles.featureText}>{f.text}</ThemedText>
            </View>
          ))}
        </View>

        <View style={styles.freeInfo}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
          <ThemedText style={styles.freeInfoText}>
            Free plan: first 3 recipes ever, then 1 per week. Subscribe for unlimited.
          </ThemedText>
        </View>

        <Pressable
          style={[styles.ctaBtn, busy && styles.ctaBtnBusy]}
          onPress={() => void handleSubscribe()}
          disabled={busy}>
          {busy ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <Ionicons name="card-outline" size={20} color="#000" />
              <ThemedText style={styles.ctaBtnText}>Subscribe — $9 / month</ThemedText>
            </>
          )}
        </Pressable>

        {signedIn ? (
          <>
            <Pressable style={styles.refreshBtn} onPress={() => void runSync()} disabled={syncing}>
              <Ionicons name="refresh-outline" size={16} color={colors.brand} />
              <ThemedText style={styles.refreshBtnText}>
                {syncing ? 'Refreshing…' : 'Refresh subscription status'}
              </ThemedText>
            </Pressable>
            <Pressable style={styles.manageBtn} onPress={() => void handleManage()} disabled={busy}>
              <ThemedText style={styles.manageBtnText}>Manage existing subscription</ThemedText>
            </Pressable>
          </>
        ) : (
          <Pressable style={styles.manageBtn} onPress={() => router.push('/sign-in')}>
            <ThemedText style={styles.manageBtnText}>Sign in to subscribe</ThemedText>
          </Pressable>
        )}

        <ThemedText style={styles.legalText}>
          After payment, return to SnapDish — your Pro access unlocks automatically. Subscription
          renews monthly via Stripe.
        </ThemedText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.canvas, flex: 1 },
  topBar: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  closeBtn: { padding: spacing.xxs },
  syncBanner: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  syncBannerText: { color: colors.textSecondary, fontSize: 13 },
  pendingBanner: {
    alignItems: 'center',
    backgroundColor: '#FFF8EB',
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    padding: 12,
    borderRadius: radius.sm,
  },
  pendingBannerText: { color: '#92400E', flex: 1, fontSize: 13, lineHeight: 18 },
  container: {
    gap: 16,
    paddingBottom: 40,
    paddingTop: 4,
  },
  heroSection: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: colors.accentLime,
    borderRadius: 44,
    height: 80,
    justifyContent: 'center',
    width: 80,
  },
  heroTitle: {
    color: colors.text,
    fontWeight: '700',
    textAlign: 'center',
  },
  heroSub: {
    color: colors.textSecondary,
    fontSize: typography.bodySm,
    lineHeight: 20,
    textAlign: 'center',
  },
  priceCard: {
    alignItems: 'center',
    backgroundColor: colors.text,
    borderRadius: radius.xl,
    gap: 6,
    paddingVertical: 24,
    position: 'relative',
    ...shadow.md,
  },
  priceBadge: {
    backgroundColor: colors.accentLime,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    position: 'absolute',
    top: -12,
  },
  priceBadgeText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  priceRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 4,
    marginTop: 8,
  },
  priceAmount: {
    color: '#FFFFFF',
    fontSize: 56,
    fontWeight: '800',
    lineHeight: 60,
  },
  pricePer: { gap: -2, paddingBottom: 10 },
  pricePerText: { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '600' },
  priceNote: { color: 'rgba(255,255,255,0.55)', fontSize: 13 },
  featuresCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    gap: 12,
    padding: spacing.md,
    ...shadow.sm,
  },
  featuresHeading: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  featureRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  featureCheckWrap: {
    alignItems: 'center',
    backgroundColor: colors.accentLime,
    borderRadius: 10,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  featureText: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  freeInfo: {
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    flexDirection: 'row',
    gap: 8,
    padding: 12,
  },
  freeInfoText: {
    color: colors.textSecondary,
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  ctaBtn: {
    alignItems: 'center',
    backgroundColor: colors.accentLime,
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    paddingVertical: 18,
    ...shadow.md,
  },
  ctaBtnBusy: { opacity: 0.7 },
  ctaBtnText: {
    color: '#000',
    fontSize: 17,
    fontWeight: '800',
  },
  refreshBtn: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  refreshBtnText: {
    color: colors.brand,
    fontSize: 14,
    fontWeight: '600',
  },
  manageBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  manageBtnText: {
    color: colors.brand,
    fontSize: 14,
    fontWeight: '600',
  },
  legalText: {
    color: colors.textTertiary,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
  successWrap: {
    alignItems: 'center',
    flex: 1,
    gap: 16,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  successIcon: {
    marginBottom: 8,
  },
  successTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  successSub: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  successBtn: {
    alignItems: 'center',
    backgroundColor: colors.accentLime,
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingHorizontal: 28,
    paddingVertical: 16,
    ...shadow.md,
  },
  successBtnText: {
    color: '#000',
    fontSize: 17,
    fontWeight: '800',
  },
});
