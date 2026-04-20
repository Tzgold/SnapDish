import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { colors, radius, shadow, typography } from '@/src/theme/snapdish';

type Category = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  hint: string;
};

const CATEGORIES: Category[] = [
  { id: 'breakfast', label: 'Breakfast', icon: 'sunny-outline', hint: 'Eggs, oats, pancakes' },
  { id: 'lunch', label: 'Lunch', icon: 'restaurant-outline', hint: 'Bowls, sandwiches' },
  { id: 'dinner', label: 'Dinner', icon: 'moon-outline', hint: 'Hearty mains' },
  { id: 'snacks', label: 'Snacks', icon: 'fast-food-outline', hint: 'Quick bites' },
  { id: 'dessert', label: 'Dessert', icon: 'ice-cream-outline', hint: 'Sweet treats' },
  { id: 'healthy', label: 'Healthy', icon: 'leaf-outline', hint: 'Light & balanced' },
  { id: 'quick', label: 'Under 20 min', icon: 'timer-outline', hint: 'Fast recipes' },
  { id: 'vegan', label: 'Vegan', icon: 'nutrition-outline', hint: 'Plant-based' },
];

export default function CategoriesScreen() {
  const { width } = useWindowDimensions();
  const isSmall = width < 360;
  const horizontalPadding = isSmall ? 14 : width >= 430 ? 24 : 20;
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const gap = 10;
  const columns = width < 380 ? 2 : 2;
  const cardWidth = useMemo(() => {
    const inner = width - horizontalPadding * 2;
    return (inner - gap * (columns - 1)) / columns;
  }, [width, horizontalPadding, columns]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingHorizontal: horizontalPadding, paddingBottom: 110 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemedText style={[styles.title, { fontSize: isSmall ? typography.h1 - 2 : typography.h1 + 2 }]}>Categories</ThemedText>
          <ThemedText style={styles.subtitle}>
            Tap a category to focus recipe ideas. Full filtering will use your saved and generated recipes.
          </ThemedText>
        </View>

        <View style={styles.grid}>
          {CATEGORIES.map((cat) => {
            const active = selectedId === cat.id;
            return (
              <Pressable
                key={cat.id}
                onPress={() => {
                  setSelectedId(cat.id);
                  Alert.alert(cat.label, `We’ll prioritize ${cat.label.toLowerCase()} style recipes when you generate.`);
                }}
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
});
