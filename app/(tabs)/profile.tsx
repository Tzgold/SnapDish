import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { authClient } from '@/src/lib/auth-client';
import { clearPreAuthOnboarding } from '@/src/lib/pre-auth-onboarding';
import { fetchMyRecipes, type SavedRecipeItem } from '@/src/services/recipes';
import { colors, radius, shadow, typography } from '@/src/theme/snapdish';

export default function ProfileScreen() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const { width } = useWindowDimensions();
  const horizontalPadding = width < 360 ? 14 : width >= 430 ? 24 : 20;
  const statsGap = 8;
  const statsContainerWidth = width - horizontalPadding * 2 - 28;
  const statWidth = (statsContainerWidth - statsGap * 2) / 3;
  const nameSize = width < 360 ? 22 : width >= 430 ? 30 : 28;

  const [recipes, setRecipes] = useState<SavedRecipeItem[]>([]);
  const [recipeLoading, setRecipeLoading] = useState(false);

  const loadRecipes = useCallback(async () => {
    if (!session?.user) return;
    setRecipeLoading(true);
    try {
      const all = await fetchMyRecipes();
      setRecipes(all);
    } catch {
      /* silent */
    } finally {
      setRecipeLoading(false);
    }
  }, [session?.user]);

  useEffect(() => {
    void loadRecipes();
  }, [loadRecipes]);

  const savedCount = recipes.filter((r) => r.saved).length;
  const recentRecipes = recipes.slice(0, 5);

  const openRecipe = (item: SavedRecipeItem) => {
    router.push({
      pathname: '/recipe-result',
      params: {
        source: item.source ?? 'Profile',
        recipe: JSON.stringify(item.recipe),
      },
    });
  };

  const displayName = session?.user?.name ?? 'Guest';
  const displayEmail = session?.user?.email ?? 'Not signed in';

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
              {session?.user?.image ? (
                <View style={[styles.avatarWrap, styles.avatarImageWrap]}>
                  <ThemedText style={styles.avatarFallbackText}>
                    {(displayName.charAt(0) || 'U').toUpperCase()}
                  </ThemedText>
                </View>
              ) : (
                <View style={styles.avatarFallback}>
                  <ThemedText style={styles.avatarFallbackText}>
                    {(displayName.charAt(0) || 'U').toUpperCase()}
                  </ThemedText>
                </View>
              )}
            </View>
            <View style={styles.nameBlock}>
              <ThemedText style={[styles.name, { fontSize: nameSize, lineHeight: nameSize + 2 }]}>
                {isPending ? '…' : displayName}
              </ThemedText>
              <ThemedText style={styles.subtitle}>{displayEmail}</ThemedText>
              {session?.user ? (
                <View style={styles.badge}>
                  <Ionicons name="sparkles" size={12} color={colors.text} />
                  <ThemedText style={styles.badgeText}>SnapDish account</ThemedText>
                </View>
              ) : (
                <Pressable style={styles.signInChip} onPress={() => router.push('/sign-in')}>
                  <ThemedText style={styles.signInChipText}>Sign in</ThemedText>
                </Pressable>
              )}
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={[styles.statCard, { width: statWidth }]}>
              <ThemedText style={styles.statValue}>{recipeLoading ? '–' : savedCount}</ThemedText>
              <ThemedText style={styles.statLabel}>Saved</ThemedText>
            </View>
            <View style={[styles.statCard, { width: statWidth }]}>
              <ThemedText style={styles.statValue}>{recipeLoading ? '–' : recipes.length}</ThemedText>
              <ThemedText style={styles.statLabel}>Generated</ThemedText>
            </View>
            <View style={[styles.statCard, { width: statWidth }]}>
              <ThemedText style={styles.statValue}>{session?.user ? '✓' : '–'}</ThemedText>
              <ThemedText style={styles.statLabel}>Member</ThemedText>
            </View>
          </View>

          <View style={styles.ctaRow}>
            <Pressable style={styles.inlineBtn} onPress={() => router.push('/settings')}>
              <Ionicons name="settings-outline" size={16} color={colors.text} />
              <ThemedText style={styles.inlineBtnText}>Settings</ThemedText>
            </Pressable>
            {session?.user ? (
              <Pressable
                style={[styles.inlineBtn, styles.signOutInlineBtn]}
                onPress={async () => {
                  await clearPreAuthOnboarding();
                  await authClient.signOut();
                }}>
                <Ionicons name="log-out-outline" size={16} color={colors.danger} />
                <ThemedText style={styles.signOutInlineText}>Sign out</ThemedText>
              </Pressable>
            ) : (
              <Pressable style={styles.inlineBtn} onPress={() => router.push('/sign-in')}>
                <ThemedText style={styles.inlineBtnText}>Sign in</ThemedText>
              </Pressable>
            )}
          </View>
        </View>

        {session?.user ? (
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { fontSize: width < 360 ? typography.title : typography.h3 }]}>
              Recently Generated
            </ThemedText>
            {recipeLoading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={colors.text} />
              </View>
            ) : recentRecipes.length === 0 ? (
              <View style={styles.emptySection}>
                <ThemedText style={styles.emptySectionText}>
                  No recipes yet — generate one from Home!
                </ThemedText>
              </View>
            ) : (
              <View style={styles.recentList}>
                {recentRecipes.map((item) => (
                  <Pressable
                    key={item.id}
                    style={styles.recentCard}
                    onPress={() => openRecipe(item)}>
                    <View style={styles.recentIconWrap}>
                      <Ionicons name="restaurant-outline" size={22} color={colors.textTertiary} />
                    </View>
                    <View style={styles.recentInfo}>
                      <ThemedText style={styles.recentTitle} numberOfLines={1}>
                        {item.recipe.recipeTitle}
                      </ThemedText>
                      <View style={styles.recentMeta}>
                        <Ionicons name="time-outline" size={12} color={colors.textTertiary} />
                        <ThemedText style={styles.recentHint}>
                          {(item.recipe.totalTimeMinutes ?? item.recipe.prepTimeMinutes + item.recipe.cookTimeMinutes)} min
                        </ThemedText>
                        {item.saved ? (
                          <Ionicons name="heart" size={12} color={colors.danger} />
                        ) : null}
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        ) : null}
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
  avatarImageWrap: {
    alignItems: 'center',
    backgroundColor: colors.accentLime,
    justifyContent: 'center',
  },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: colors.accentLime,
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
  avatarFallbackText: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
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
  signInChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentLime,
    borderRadius: 10,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  signInChipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 8,
  },
  inlineBtn: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 11,
  },
  inlineBtnText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  signOutInlineBtn: {
    borderColor: colors.border,
    borderWidth: 1,
  },
  signOutInlineText: {
    color: colors.danger,
    fontSize: 14,
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
  loadingWrap: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptySection: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: 16,
  },
  emptySectionText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
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
    padding: 12,
    ...shadow.sm,
  },
  recentIconWrap: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.xs,
    height: 48,
    justifyContent: 'center',
    width: 48,
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
  recentMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  recentHint: {
    color: colors.textSecondary,
    fontSize: 12,
  },
});
