import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { savePreAuthOnboarding, type DietOption, type GoalOption, type SkillOption, type TimeOption } from '@/src/lib/pre-auth-onboarding';
import { colors, radius, shadow, spacing, typography } from '@/src/theme/snapdish';

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<GoalOption | null>(null);
  const [skill, setSkill] = useState<SkillOption | null>(null);
  const [time, setTime] = useState<TimeOption | null>(null);
  const [diet, setDiet] = useState<DietOption | null>(null);
  const [busy, setBusy] = useState(false);

  const canAdvance =
    step === 0 ? Boolean(goal) : step === 1 ? Boolean(skill) : step === 2 ? Boolean(time) : true;
  const isLast = step === 3;

  const onFinish = async () => {
    if (!goal || !skill || !time || busy) return;
    setBusy(true);
    try {
      await savePreAuthOnboarding({
        goal,
        skill,
        time,
        diet: diet ?? undefined,
      });
      router.replace('/sign-in');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>Before you start</ThemedText>
          <ThemedText style={styles.subtitle}>Answer a few quick questions so SnapDish can personalize recipes.</ThemedText>
          <ThemedText style={styles.progress}>Step {step + 1} of 4</ThemedText>
        </View>

        {step === 0 ? (
          <QuestionCard title="What do you want to do with SnapDish?">
            <OptionChip active={goal === 'learn'} onPress={() => setGoal('learn')} label="🍳 Learn how to cook meals" />
            <OptionChip active={goal === 'quick'} onPress={() => setGoal('quick')} label="⚡ Get quick recipes from videos/images" />
            <OptionChip active={goal === 'healthy'} onPress={() => setGoal('healthy')} label="🥗 Eat healthier" />
            <OptionChip active={goal === 'budget'} onPress={() => setGoal('budget')} label="💰 Cook on a budget" />
          </QuestionCard>
        ) : null}

        {step === 1 ? (
          <QuestionCard title="What’s your cooking level?">
            <OptionChip active={skill === 'beginner'} onPress={() => setSkill('beginner')} label="Beginner 👶" />
            <OptionChip active={skill === 'intermediate'} onPress={() => setSkill('intermediate')} label="Intermediate 🍳" />
            <OptionChip active={skill === 'advanced'} onPress={() => setSkill('advanced')} label="Advanced 🔥" />
          </QuestionCard>
        ) : null}

        {step === 2 ? (
          <QuestionCard title="How much time do you usually have?">
            <OptionChip active={time === '10-15'} onPress={() => setTime('10-15')} label="⏱ 10–15 min" />
            <OptionChip active={time === '30'} onPress={() => setTime('30')} label="⏱ 30 min" />
            <OptionChip active={time === '60+'} onPress={() => setTime('60+')} label="⏱ 1 hour+" />
          </QuestionCard>
        ) : null}

        {step === 3 ? (
          <QuestionCard title="Any dietary preferences? (optional)">
            <OptionChip active={diet === 'vegetarian'} onPress={() => setDiet('vegetarian')} label="Vegetarian" />
            <OptionChip active={diet === 'vegan'} onPress={() => setDiet('vegan')} label="Vegan" />
            <OptionChip active={diet === 'halal'} onPress={() => setDiet('halal')} label="Halal" />
            <OptionChip active={diet === 'none'} onPress={() => setDiet('none')} label="No restrictions" />
            <Pressable onPress={() => setDiet(null)} style={styles.skipLink}>
              <ThemedText style={styles.skipText}>Skip for now</ThemedText>
            </Pressable>
          </QuestionCard>
        ) : null}

        <View style={styles.footerRow}>
          <Pressable
            style={[styles.secondaryBtn, step === 0 && styles.secondaryBtnDisabled]}
            onPress={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || busy}>
            <ThemedText style={styles.secondaryBtnText}>Back</ThemedText>
          </Pressable>
          <Pressable
            style={[styles.primaryBtn, !canAdvance && styles.primaryBtnDisabled]}
            disabled={!canAdvance || busy}
            onPress={() => {
              if (isLast) {
                void onFinish();
              } else {
                setStep((s) => Math.min(3, s + 1));
              }
            }}>
            <ThemedText style={styles.primaryBtnText}>
              {isLast ? (busy ? 'Saving...' : 'Continue to sign in') : 'Next'}
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function QuestionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <ThemedText style={styles.cardTitle}>{title}</ThemedText>
      <View style={styles.options}>{children}</View>
    </View>
  );
}

function OptionChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <ThemedText style={[styles.chipText, active && styles.chipTextActive]}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.canvas, flex: 1 },
  container: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  header: { gap: spacing.xs, paddingTop: spacing.xs },
  title: { color: colors.text, fontSize: typography.h2, fontWeight: '700' },
  subtitle: { color: colors.textSecondary, fontSize: typography.bodySm, lineHeight: 20 },
  progress: { color: colors.textTertiary, fontSize: 12, fontWeight: '600' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadow.sm,
  },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  options: { gap: 8 },
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
  primaryBtn: {
    alignItems: 'center',
    backgroundColor: colors.text,
    borderRadius: radius.sm,
    flex: 1,
    paddingVertical: 14,
  },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  footerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  secondaryBtn: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    flex: 1,
    paddingVertical: 14,
  },
  secondaryBtnDisabled: {
    opacity: 0.45,
  },
  secondaryBtnText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  skipLink: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingVertical: 4,
  },
  skipText: {
    color: colors.brand,
    fontSize: 14,
    fontWeight: '600',
  },
});
