import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, ToastAndroid, View, useWindowDimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { secureStorage } from '@/src/lib/secure-storage';
import { colors, radius, shadow, typography } from '@/src/theme/snapdish';

export const CATEGORY_STORAGE_KEY = 'snapdish.selectedCategory';

type Category = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  hint: string;
  cookingStyle: string;
};

const CATEGORIES: Category[] = [
  { id: 'breakfast', label: 'Breakfast', icon: 'sunny-outline', hint: 'Eggs, oats, pancakes', cookingStyle: 'breakfast' },
  { id: 'lunch', label: 'Lunch', icon: 'restaurant-outline', hint: 'Bowls, sandwiches', cookingStyle: 'lunch' },
  { id: 'dinner', label: 'Dinner', icon: 'moon-outline', hint: 'Hearty mains', cookingStyle: 'dinner' },
  { id: 'snacks', label: 'Snacks', icon: 'fast-food-outline', hint: 'Quick bites', cookingStyle: 'snack' },
  { id: 'dessert', label: 'Dessert', icon: 'ice-cream-outline', hint: 'Sweet treats', cookingStyle: 'dessert' },
  { id: 'healthy', label: 'Healthy', icon: 'leaf-outline', hint: 'Light & balanced', cookingStyle: 'healthy and light' },
  { id: 'quick', label: 'Under 20 min', icon: 'timer-outline', hint: 'Fast recipes', cookingStyle: 'quick (under 20 minutes)' },
  { id: 'vegan', label: 'Vegan', icon: 'nutrition-outline', hint: 'Plant-based', cookingStyle: 'vegan' },
];

export async function getSelectedCookingStyle(): Promise<string> {
  try {
    const id = await secureStorage.getItemAsync(CATEGORY_STORAGE_KEY);
    if (!id) return '';
    const cat = CATEGORIES.find((c) => c.id === id);
    return cat?.cookingStyle ?? '';
  } catch {
    return '';
  }
}

function showToast(message: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  }
}

export default function CategoriesScreen() {
  const { width } = useWindowDimensions();
  const isSmall = width < 360;
  const horizontalPadding = isSmall ? 14 : width >= 430 ? 24 : 20;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    secureStorage.getItemAsync(CATEGORY_STORAGE_KEY).then((id) => {
      if (id) setSelectedId(id);
    }).catch(() => {/* ignore */});
  }, []);

  const handleSelect = useCallback(async (cat: Category) => {
    const next = selectedId === cat.id ? null : cat.id;
    setSelectedId(next);
    setSaved(false);
    try {
      if (next) {
        await secureStorage.setItemAsync(CATEGORY_STORAGE_KEY, next);
      } else {
        await secureStorage.deleteItemAsync(CATEGORY_STORAGE_KEY);
      }
      setSaved(true);
      showToast(next ? `${cat.label} set as your focus` : 'Category cleared');
    } catch {/* ignore */}
  }, [selectedId]);

  const gap = 10;
  const columns = 2;
  const cardWidth = useMemo(() => {
    const inner = width - horizontalPadding * 2;
    return (inner - gap * (columns - 1)) / columns;
  }, [width, horizontalPadding]);

  const selectedCat = CATEGORIES.find((c) => c.id === selectedId);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingHorizontal: horizontalPadding, paddingBottom: 110 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemedText style={[styles.title, { fontSize: isSmall ? typography.h1 - 2 : typography.h1 + 2 }]}>Categories</ThemedText>
          <ThemedText style={styles.subtitle}>
            Pick a focus and SnapDish will apply it when you generate a recipe.
          </ThemedText>
        </View>

        {selectedCat ? (
          <View style={styles.activeBanner}>
            <Ionicons name="checkmark-circle" size={16} color={colors.brand} />
            <ThemedText style={styles.activeBannerText}>
              Active: <ThemedText style={styles.activeBannerBold}>{selectedCat.label}</ThemedText>
              {' '}— recipes will be tailored for {selectedCat.cookingStyle}
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.grid}>
          {CATEGORIES.map((cat) => {
            const active = selectedId === cat.id;
            return (
              <Pressable
                key={cat.id}
                onPress={() => void handleSelect(cat)}
                style={[
                  styles.catCard,
                  { width: cardWidth },
                  active && styles.catCardActive,
                ]}>
                <View style={[styles.iconCircle, active && styles.iconCircleActive]}>
                  <Ionicons name={cat.icon} size={22} color={active ? colors.text : colors.textSecondary} />
                </View>
                <ThemedText style={[styles.catLabel, active && styles.catLabelActive]}>{cat.label}</ThemedText>
                <ThemedText style={styles.catHint} numberOfLines={2}>
                  {cat.hint}
                </ThemedText>
                {active ? (
                  <View style={styles.activeChip}>
                    <Ionicons name="checkmark" size={12} color={colors.text} />
                    <ThemedText style={styles.activeChipText}>Active</ThemedText>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
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
    gap: 16,
    paddingTop: 8,
  },
  header: {
    gap: 8,
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
  activeBanner: {
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    flexDirection: 'row',
    gap: 6,
    padding: 12,
    ...shadow.sm,
  },
  activeBannerText: {
    color: colors.textSecondary,
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  activeBannerBold: {
    color: colors.text,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  catCard: {
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    gap: 6,
    minHeight: 120,
    padding: 14,
    ...shadow.sm,
  },
  catCardActive: {
    backgroundColor: colors.accentLime,
  },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  iconCircleActive: {
    backgroundColor: colors.surface,
  },
  catLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  catLabelActive: {
    color: colors.text,
  },
  catHint: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  activeChip: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  activeChipText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
});
