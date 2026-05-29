import type { DietOption, GoalOption, SkillOption, TimeOption } from '@/src/lib/pre-auth-onboarding';
import { getPreAuthOnboarding } from '@/src/lib/pre-auth-onboarding';
import { apiFetch } from '@/src/services/http';

export type UserPreferences = {
  goal: GoalOption;
  skill: SkillOption;
  time: TimeOption;
  diet?: DietOption | null;
};

export async function loadPreferences(): Promise<UserPreferences | null> {
  const res = await apiFetch('/api/me/preferences');
  if (!res.ok) return null;
  const data = (await res.json()) as { preferences: UserPreferences | null };
  return data.preferences;
}

export async function savePreferences(prefs: UserPreferences): Promise<void> {
  const res = await apiFetch('/api/me/preferences', {
    method: 'POST',
    body: JSON.stringify(prefs),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Could not save preferences');
  }
}

export async function syncOnboardingPreferences(): Promise<void> {
  const onboarding = await getPreAuthOnboarding();
  if (!onboarding) return;
  await savePreferences({
    goal: onboarding.goal,
    skill: onboarding.skill,
    time: onboarding.time,
    diet: onboarding.diet,
  });
}
