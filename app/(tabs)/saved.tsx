import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { colors, radius, shadow } from '@/src/theme/snapdish';

type SavedRecipe = {
  id: string;
  title: string;
  image: string;
  time: string;
  savedAt: string;
};

const MOCK_SAVED: SavedRecipe[] = [
  {
    id: 's1',
    title: 'Creamy Garlic Pasta',
    image:
      'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=600&q=80',
    time: '25 min',
    savedAt: '2 days ago',
  },
  {
    id: 's2',
    title: 'Honey Glazed Salmon',
    image:
      'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=600&q=80',
    time: '22 min',
    savedAt: '1 week ago',
  },
  {
    id: 's3',
    title: 'Veggie Buddha Bowl',
    image:
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80',
    time: '18 min',
    savedAt: '2 weeks ago',
  },
];

export default function SavedScreen() {
  const { width } = useWindowDimensions();
  const horizontalPadding = width < 360 ? 14 : 20;
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MOCK_SAVED;
    return MOCK_SAVED.filter((r) => r.title.toLowerCase().includes(q));
  }, [query]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
        <ThemedText style={styles.title}>Saved</ThemedText>
        <ThemedText style={styles.subtitle}>Recipes you’ve saved from Home or marked with the heart.</ThemedText>
      </View>

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

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingHorizontal: horizontalPadding, paddingBottom: 110 },
        ]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="heart-outline" size={48} color={colors.border} />
            <ThemedText style={styles.emptyTitle}>No saved recipes yet</ThemedText>
            <ThemedText style={styles.emptyText}>
              Generate a recipe from the Home tab, then tap the heart to save it here.
            </ThemedText>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.card}>
            <Image source={item.image} style={styles.cardImage} contentFit="cover" />
            <View style={styles.cardBody}>
              <ThemedText style={styles.cardTitle} numberOfLines={2}>
                {item.title}
              </ThemedText>
              <View style={styles.cardMeta}>
                <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                <ThemedText style={styles.cardMetaText}>{item.time}</ThemedText>
                <ThemedText style={styles.dot}>·</ThemedText>
                <ThemedText style={styles.cardMetaText}>{item.savedAt}</ThemedText>
              </View>
            </View>
            <Pressable style={styles.moreBtn} hitSlop={8}>
              <Ionicons name="ellipsis-horizontal" size={18} color={colors.textSecondary} />
            </Pressable>
          </Pressable>
        )}
        showsVerticalScrollIndicator={false}
      />
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
  cardImage: {
    borderRadius: radius.sm,
    height: 72,
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
  moreBtn: {
    padding: 4,
  },
  empty: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingTop: 48,
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
});
