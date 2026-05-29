import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { authClient } from '@/src/lib/auth-client';
import { fetchMyRecipes, unbookmarkRecipe, type SavedRecipeItem } from '@/src/services/recipes';
import { colors, radius, shadow, typography } from '@/src/theme/snapdish';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export default function SavedScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { width } = useWindowDimensions();
  const isSmall = width < 360;
  const horizontalPadding = isSmall ? 14 : width >= 430 ? 24 : 20;
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<SavedRecipeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    setError(null);
    try {
      const all = await fetchMyRecipes();
      setItems(all.filter((r) => r.saved));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load saved recipes.');
    } finally {
      setLoading(false);
    }
  }, [session?.user]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((r) => r.recipe.recipeTitle.toLowerCase().includes(q));
  }, [query, items]);

  const openRecipe = (item: SavedRecipeItem) => {
    router.push({
      pathname: '/recipe-result',
      params: {
        source: item.source ?? 'Saved',
        recipe: JSON.stringify(item.recipe),
      },
    });
  };

  const onRemove = async (item: SavedRecipeItem) => {
    try {
      await unbookmarkRecipe(item.id);
      setItems((prev) => prev.filter((r) => r.id !== item.id));
    } catch {
      /* ignore */
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
        <ThemedText style={[styles.title, { fontSize: isSmall ? typography.h1 - 2 : typography.h1 + 2 }]}>Saved</ThemedText>
        <ThemedText style={styles.subtitle}>Recipes you've saved with the heart button.</ThemedText>
      </View>

      {!session?.user ? (
        <View style={styles.empty}>
          <Ionicons name="lock-closed-outline" size={48} color={colors.border} />
          <ThemedText style={styles.emptyTitle}>Sign in to see saved recipes</ThemedText>
          <Pressable style={styles.signInBtn} onPress={() => router.push('/sign-in')}>
            <ThemedText style={styles.signInBtnText}>Sign in</ThemedText>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={[styles.searchWrap, { marginHorizontal: horizontalPadding }]}>
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <TextInput
              placeholder="Search saved recipes"
              placeholderTextColor={colors.textTertiary}
              value={query}
              onChangeText={setQuery}
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {query.length > 0 ? (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
              </Pressable>
            ) : null}
          </View>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.text} />
            </View>
          ) : error ? (
            <View style={styles.empty}>
              <Ionicons name="cloud-offline-outline" size={48} color={colors.border} />
              <ThemedText style={styles.emptyTitle}>Could not load recipes</ThemedText>
              <Pressable onPress={() => void load()} style={styles.retryBtn}>
                <ThemedText style={styles.retryText}>Retry</ThemedText>
              </Pressable>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              contentContainerStyle={[styles.listContent, { paddingHorizontal: horizontalPadding, paddingBottom: 110 }]}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Ionicons name="heart-outline" size={48} color={colors.border} />
                  <ThemedText style={styles.emptyTitle}>No saved recipes yet</ThemedText>
                  <ThemedText style={styles.emptyText}>
                    Generate a recipe from Home, then tap the heart to save it here.
                  </ThemedText>
                </View>
              }
              renderItem={({ item }) => {
                const mins = item.recipe.totalTimeMinutes ?? item.recipe.prepTimeMinutes + item.recipe.cookTimeMinutes;
                return (
                  <Pressable style={styles.card} onPress={() => openRecipe(item)}>
                    <View style={styles.cardImageWrap}>
                      <Ionicons name="restaurant-outline" size={28} color={colors.textTertiary} />
                    </View>
                    <View style={styles.cardBody}>
                      <ThemedText style={styles.cardTitle} numberOfLines={2}>
                        {item.recipe.recipeTitle}
                      </ThemedText>
                      <View style={styles.cardMeta}>
                        <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                        <ThemedText style={styles.cardMetaText}>{mins} min</ThemedText>
                        <ThemedText style={styles.dot}>·</ThemedText>
                        <ThemedText style={styles.cardMetaText}>{timeAgo(item.created_at)}</ThemedText>
                      </View>
                    </View>
                    <Pressable style={styles.removeBtn} hitSlop={8} onPress={() => void onRemove(item)}>
                      <Ionicons name="heart" size={20} color={colors.danger} />
                    </Pressable>
                  </Pressable>
                );
              }}
              showsVerticalScrollIndicator={false}
              onRefresh={() => void load()}
              refreshing={loading}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
  header: {
    gap: 6,
    paddingBottom: 12,
    paddingTop: 8,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  searchWrap: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...shadow.sm,
  },
  searchInput: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
  },
  listContent: {
    gap: 12,
    paddingTop: 4,
  },
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: 12,
    overflow: 'hidden',
    padding: 10,
    ...shadow.sm,
  },
  cardImageWrap: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  cardBody: {
    flex: 1,
    gap: 6,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  cardMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  cardMetaText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  dot: {
    color: colors.textTertiary,
    fontSize: 13,
  },
  removeBtn: {
    padding: 4,
  },
  loadingWrap: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    flex: 1,
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  signInBtn: {
    backgroundColor: colors.text,
    borderRadius: radius.sm,
    marginTop: 4,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  signInBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  retryBtn: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
});
