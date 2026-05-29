import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import type { DietOption, GoalOption, SkillOption, TimeOption } from '@/src/lib/pre-auth-onboarding';
import { loadPreferences, savePreferences } from '@/src/services/preferences';
import { colors, radius, shadow, spacing, typography } from '@/src/theme/snapdish';

const GOALS: { value: GoalOption; label: string }[] = [
  { value: 'learn', label: '🍳 Learn how to cook meals' },
  { value: 'quick', label: '⚡ Quick recipes from images' },
  { value: 'healthy', label: '🥗 Eat healthier' },
  { value: 'budget', label: '💰 Cook on a budget' },
];

const SKILLS: { value: SkillOption; label: string }[] = [
  { value: 'beginner', label: 'Beginner 👶' },
  { value: 'intermediate', label: 'Intermediate 🍳' },
  { value: 'advanced', label: 'Advanced 🔥' },
];

const TIMES: { value: TimeOption; label: string }[] = [
  { value: '10-15', label: '⏱ 10–15 min' },
  { value: '30', label: '⏱ 30 min' },
  { value: '60+', label: '⏱ 1 hour+' },
];

const DIETS: { value: DietOption; label: string }[] = [
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'halal', label: 'Halal' },
  { value: 'none', label: 'No restrictions' },
];

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <ThemedText style={[styles.chipText, active && styles.chipTextActive]}>{label}</ThemedText>
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      <View style={styles.chipRow}>{children}</View>
    </View>
  );
}

export default function PreferencesScreen() {
  const router = useRouter();
  const [goal, setGoal] = useState<GoalOption | null>(null);
  const [skill, setSkill] = useState<SkillOption | null>(null);
  const [time, setTime] = useState<TimeOption | null>(null);
  const [diet, setDiet] = useState<DietOption | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPreferences()
      .then((prefs) => {
        if (prefs) {
          setGoal(prefs.goal);
          setSkill(prefs.skill);
          setTime(prefs.time);
          setDiet(prefs.diet ?? null);
        }
      })
      .catch(() => {/* silent */})
      .finally(() => setLoading(false));
  }, []);

  const onSave = async () => {
    if (!goal || !skill || !time) {
      Alert.alert('Incomplete', 'Please select a goal, skill level, and preferred time.');
      return;
    }
    setSaving(true);
    try {
      await savePreferences({ goal, skill, time, diet: diet ?? undefined });
      Alert.alert('Saved', 'Your preferences have been updated. They will apply to your next recipe.');
      router.back();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save preferences.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <ThemedText style={styles.title}>Food Preferences</ThemedText>
        <View style={styles.backSpacer} />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.text} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <ThemedText style={styles.intro}>
            These preferences guide SnapDish AI when generating recipes tailored to you.
          </ThemedText>

          <Section title="What do you want to do?">
            {GOALS.map((g) => (
              <Chip key={g.value} label={g.label} active={goal === g.value} onPress={() => setGoal(g.value)} />
            ))}
          </Section>

          <Section title="Cooking level">
            {SKILLS.map((s) => (
              <Chip key={s.value} label={s.label} active={skill === s.value} onPress={() => setSkill(s.value)} />
            ))}
          </Section>

          <Section title="How much time do you have?">
            {TIMES.map((t) => (
              <Chip key={t.value} label={t.label} active={time === t.value} onPress={() => setTime(t.value)} />
            ))}
          </Section>

          <Section title="Dietary preference (optional)">
            {DIETS.map((d) => (
              <Chip key={d.value} label={d.label} active={diet === d.value} onPress={() => setDiet(d.value)} />
            ))}
          </Section>

          <Pressable
            style={[styles.saveBtn, (!goal || !skill || !time || saving) && styles.saveBtnDisabled]}
            onPress={() => void onSave()}
            disabled={!goal || !skill || !time || saving}>
            <ThemedText style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save preferences'}</ThemedText>
          </Pressable>
        </ScrollView>
      )}
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
  loadingWrap: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  container: {
    gap: 16,
    padding: spacing.md,
    paddingBottom: 40,
  },
  intro: {
    color: colors.textSecondary,
    fontSize: typography.bodySm,
    lineHeight: 20,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    gap: 8,
    padding: spacing.md,
    ...shadow.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  chipRow: {
    gap: 8,
  },
  chip: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 12,
  },
  chipActive: {
    backgroundColor: colors.accentLime,
  },
  chipText: { color: colors.text, fontSize: 14, fontWeight: '500' },
  chipTextActive: { fontWeight: '700' },
  saveBtn: {
    alignItems: 'center',
    backgroundColor: colors.text,
    borderRadius: radius.sm,
    marginTop: 4,
    paddingVertical: 16,
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
