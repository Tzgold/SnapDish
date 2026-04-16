import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { getMockRecipeResponse } from '@/src/services/analyze';
import { RecipeResult } from '@/src/types/recipe';
import { colors, radius, shadow } from '@/src/theme/snapdish';

type TabKey = 'ingredients' | 'directions';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=1200&q=80';

export default function RecipeResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ recipe?: string; source?: string }>();
  const [activeTab, setActiveTab] = useState<TabKey>('ingredients');
  const [favorite, setFavorite] = useState(false);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());
  const [servingsOverride, setServingsOverride] = useState<number | null>(null);

  const recipe = useMemo<RecipeResult>(() => {
    if (!params.recipe) return getMockRecipeResponse().recipe;
    try {
      return JSON.parse(params.recipe) as RecipeResult;
    } catch {
      return getMockRecipeResponse().recipe;
    }
  }, [params.recipe]);

  useEffect(() => {
    setServingsOverride(null);
    setCheckedIngredients(new Set());
    setFavorite(false);
    setActiveTab('ingredients');
  }, [recipe.recipeTitle]);

  const source = typeof params.source === 'string' ? params.source : 'AI recipe';
  const displayServings = servingsOverride ?? recipe.servings;

  const toggleIngredient = (key: string) => {
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const onShare = async () => {
    try {
      await Share.share({
        title: recipe.recipeTitle,
        message: `${recipe.recipeTitle}\n\n${recipe.steps.map((s) => `${s.order}. ${s.instruction}`).join('\n\n')}`,
      });
    } catch {
      Alert.alert('Share', 'Could not open the share sheet.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.heroWrap}>
          <Image source={HERO_IMAGE} style={styles.heroImage} contentFit="cover" />
          <LinearGradient
            colors={['transparent', 'rgba(28,28,30,0.15)', 'rgba(28,28,30,0.88)']}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroTopBar}>
            <Pressable
              style={styles.roundBtn}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Close recipe">
              <Ionicons name="close" size={20} color={colors.text} />
            </Pressable>
            <View style={styles.heroTopRight}>
              <Pressable
                style={styles.roundBtn}
                onPress={() => void onShare()}
                accessibilityRole="button"
                accessibilityLabel="Share recipe">
                <Ionicons name="share-outline" size={18} color={colors.text} />
              </Pressable>
              <Pressable
                style={styles.roundBtn}
                onPress={() => setFavorite((f) => !f)}
                accessibilityRole="button"
                accessibilityLabel={favorite ? 'Remove from favorites' : 'Save to favorites'}>
                <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={18} color={favorite ? colors.danger : colors.text} />
              </Pressable>
            </View>
          </View>
          <View style={styles.heroBottom}>
            <ThemedText style={styles.heroTitle} numberOfLines={2}>
              {recipe.recipeTitle}
            </ThemedText>
            <ThemedText style={styles.heroMeta}>Recipe · {source}</ThemedText>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.quickRow}>
            <QuickPill icon="flame-outline" label="Prep" value={`${recipe.prepTimeMinutes} min`} tint={colors.statPrep} iconColor={colors.statPrepIcon} />
            <QuickPill icon="restaurant-outline" label="Cook" value={`${recipe.cookTimeMinutes} min`} tint={colors.statCook} iconColor={colors.statCookIcon} />
          </View>

          <View style={styles.statsGrid}>
            <StatBox
              label="Servings"
              value={`${displayServings}`}
              icon="people-outline"
              bg={colors.statCal}
              iconColor={colors.statCalIcon}
            />
            <StatBox
              label="Total"
              value={`${recipe.totalTimeMinutes}m`}
              icon="timer-outline"
              bg={colors.statPrep}
              iconColor={colors.statPrepIcon}
            />
            <StatBox
              label="Calories"
              value={`${recipe.calories ?? '—'}`}
              icon="flame-outline"
              bg={colors.statCook}
              iconColor={colors.statCookIcon}
            />
            <StatBox
              label="Rating"
              value={`${recipe.rating ?? 4.5}/5`}
              icon="star"
              bg={colors.statRate}
              iconColor={colors.statRateIcon}
            />
          </View>

          <View style={styles.servingsRow}>
            <ThemedText style={styles.servingsLabel}>Adjust servings</ThemedText>
            <View style={styles.stepper}>
              <Pressable
                style={[styles.stepperBtn, displayServings <= 1 && styles.stepperBtnDisabled]}
                onPress={() => setServingsOverride(Math.max(1, displayServings - 1))}
                disabled={displayServings <= 1}>
                <Ionicons name="remove" size={18} color={displayServings <= 1 ? colors.textTertiary : colors.text} />
              </Pressable>
              <ThemedText style={styles.stepperValue}>{displayServings}</ThemedText>
              <Pressable style={styles.stepperBtn} onPress={() => setServingsOverride(displayServings + 1)}>
                <Ionicons name="add" size={18} color={colors.text} />
              </Pressable>
            </View>
          </View>

          <View style={styles.tabRow}>
            <Pressable
              style={[styles.tabButton, activeTab === 'ingredients' && styles.tabButtonActive]}
              onPress={() => setActiveTab('ingredients')}>
              <ThemedText style={[styles.tabLabel, activeTab === 'ingredients' && styles.tabLabelActive]}>Ingredients</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.tabButton, activeTab === 'directions' && styles.tabButtonActive]}
              onPress={() => setActiveTab('directions')}>
              <ThemedText style={[styles.tabLabel, activeTab === 'directions' && styles.tabLabelActive]}>Directions</ThemedText>
            </Pressable>
          </View>

          {activeTab === 'ingredients' ? (
            <View style={styles.listWrap}>
              {recipe.ingredients.map((item) => {
                const key = `${item.name}-${item.quantity}`;
                const checked = checkedIngredients.has(key);
                return (
                  <Pressable
                    key={key}
                    style={[styles.ingRow, checked && styles.ingRowChecked]}
                    onPress={() => toggleIngredient(key)}>
                    <View style={[styles.checkCircle, checked && styles.checkCircleOn]}>
                      {checked ? <Ionicons name="checkmark" size={14} color="#FFF" /> : null}
                    </View>
                    <View style={styles.ingTextBlock}>
                      <ThemedText style={[styles.ingName, checked && styles.ingNameChecked]}>{item.name}</ThemedText>
                      {item.optional ? (
                        <ThemedText style={styles.optionalTag}>optional</ThemedText>
                      ) : null}
                    </View>
                    <ThemedText style={styles.ingQty}>{item.quantity}</ThemedText>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.directionWrap}>
              {recipe.steps.map((step) => (
                <View key={step.order} style={styles.stepCard}>
                  <View style={styles.stepHeader}>
                    <View style={styles.stepBadge}>
                      <ThemedText style={styles.stepBadgeText}>{step.order}</ThemedText>
                    </View>
                    <ThemedText style={styles.stepHeading}>Step {step.order}</ThemedText>
                  </View>
                  <ThemedText style={styles.stepText}>{step.instruction}</ThemedText>
                  {step.durationMinutes ? (
                    <Pressable style={styles.timerBtn} onPress={() => Alert.alert('Timer', `${step.durationMinutes} minute timer — coming soon.`)}>
                      <Ionicons name="timer-outline" size={18} color={colors.text} />
                      <ThemedText style={styles.timerBtnText}>Start {step.durationMinutes} min timer</ThemedText>
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </View>
          )}

          {recipe.notes && recipe.notes.length > 0 ? (
            <View style={styles.notesBlock}>
              <ThemedText style={styles.notesTitle}>Chef notes</ThemedText>
              {recipe.notes.map((n, i) => (
                <View key={i} style={styles.noteRow}>
                  <View style={styles.noteDot} />
                  <ThemedText style={styles.noteText}>{n}</ThemedText>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.bottomActions}>
            <Pressable style={styles.outlineBtn} onPress={() => void onShare()}>
              <Ionicons name="share-outline" size={18} color={colors.text} />
              <ThemedText style={styles.outlineBtnText}>Share</ThemedText>
            </Pressable>
            <Pressable style={styles.primaryMini} onPress={() => setFavorite((f) => !f)}>
              <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={18} color="#FFF" />
              <ThemedText style={styles.primaryMiniText}>{favorite ? 'Saved' : 'Save'}</ThemedText>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickPill({
  icon,
  label,
  value,
  tint,
  iconColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  tint: string;
  iconColor: string;
}) {
  return (
    <View style={[styles.quickPill, { backgroundColor: tint }]}>
      <Ionicons name={icon} size={16} color={iconColor} />
      <View>
        <ThemedText style={styles.quickPillLabel}>{label}</ThemedText>
        <ThemedText style={styles.quickPillValue}>{value}</ThemedText>
      </View>
    </View>
  );
}

function StatBox({
  label,
  value,
  icon,
  bg,
  iconColor,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  bg: string;
  iconColor: string;
}) {
  return (
    <View style={[styles.statBox, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={16} color={iconColor} />
      <ThemedText style={styles.statValue}>{value}</ThemedText>
      <ThemedText style={styles.statLabel}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
  container: {
    paddingBottom: 32,
  },
  heroWrap: {
    borderRadius: radius.xl,
    height: 260,
    marginHorizontal: 14,
    marginTop: 4,
    overflow: 'hidden',
    ...shadow.md,
  },
  heroImage: {
    height: '100%',
    width: '100%',
  },
  heroTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 12,
    position: 'absolute',
    right: 12,
    top: 12,
  },
  heroTopRight: {
    flexDirection: 'row',
    gap: 8,
  },
  roundBtn: {
    alignItems: 'center',
    backgroundColor: colors.overlayLight,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  heroBottom: {
    bottom: 0,
    left: 0,
    paddingBottom: 16,
    paddingHorizontal: 16,
    position: 'absolute',
    right: 0,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 30,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  heroMeta: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    gap: 12,
    marginHorizontal: 14,
    marginTop: -28,
    paddingBottom: 20,
    paddingHorizontal: 16,
    paddingTop: 18,
    ...shadow.md,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickPill: {
    alignItems: 'center',
    borderRadius: radius.md,
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  quickPillLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  quickPillValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  statBox: {
    alignItems: 'center',
    borderRadius: radius.sm,
    minWidth: '23%',
    paddingVertical: 10,
  },
  statValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  servingsRow: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  servingsLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  stepper: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  stepperBtn: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    height: 36,
    justifyContent: 'center',
    width: 36,
    ...shadow.sm,
  },
  stepperBtnDisabled: {
    opacity: 0.5,
  },
  stepperValue: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    minWidth: 28,
    textAlign: 'center',
  },
  tabRow: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.xl,
    flexDirection: 'row',
    gap: 6,
    padding: 4,
  },
  tabButton: {
    alignItems: 'center',
    borderRadius: radius.lg,
    flex: 1,
    paddingVertical: 10,
  },
  tabButtonActive: {
    backgroundColor: colors.text,
  },
  tabLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#FFFFFF',
  },
  listWrap: {
    gap: 6,
    marginTop: 4,
  },
  ingRow: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  ingRowChecked: {
    opacity: 0.72,
  },
  checkCircle: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 2,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  checkCircleOn: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  ingTextBlock: {
    flex: 1,
    gap: 2,
  },
  ingName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  ingNameChecked: {
    textDecorationLine: 'line-through',
  },
  optionalTag: {
    color: colors.textTertiary,
    fontSize: 12,
  },
  ingQty: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  directionWrap: {
    gap: 12,
    marginTop: 4,
  },
  stepCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: 14,
  },
  stepHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  stepBadge: {
    alignItems: 'center',
    backgroundColor: colors.accentLime,
    borderRadius: 12,
    height: 28,
    justifyContent: 'center',
    minWidth: 28,
    paddingHorizontal: 8,
  },
  stepBadgeText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  stepHeading: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  stepText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  timerBtn: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.accentLime,
    borderRadius: 20,
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  timerBtnText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  notesBlock: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    gap: 8,
    padding: 14,
  },
  notesTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  noteRow: {
    flexDirection: 'row',
    gap: 10,
  },
  noteDot: {
    backgroundColor: colors.brand,
    borderRadius: 4,
    height: 8,
    marginTop: 6,
    width: 8,
  },
  noteText: {
    color: colors.textSecondary,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  bottomActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  outlineBtn: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  outlineBtnText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  primaryMini: {
    alignItems: 'center',
    backgroundColor: colors.text,
    borderRadius: radius.md,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  primaryMiniText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
