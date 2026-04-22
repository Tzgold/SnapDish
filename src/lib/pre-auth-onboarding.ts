import { secureStorage } from '@/src/lib/secure-storage';

const ONBOARDING_KEY = 'snapdish.preAuthOnboarding';

export type GoalOption = 'learn' | 'quick' | 'healthy' | 'budget';
export type SkillOption = 'beginner' | 'intermediate' | 'advanced';
export type TimeOption = '10-15' | '30' | '60+';
export type DietOption = 'vegetarian' | 'vegan' | 'halal' | 'none';

export type PreAuthOnboarding = {
  goal: GoalOption;
  skill: SkillOption;
  time: TimeOption;
  diet?: DietOption;
  completedAt: string;
};

export async function getPreAuthOnboarding(): Promise<PreAuthOnboarding | null> {
  const raw = await secureStorage.getItemAsync(ONBOARDING_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PreAuthOnboarding;
  } catch {
    return null;
  }
}

export async function savePreAuthOnboarding(payload: Omit<PreAuthOnboarding, 'completedAt'>): Promise<void> {
  const data: PreAuthOnboarding = {
    ...payload,
    completedAt: new Date().toISOString(),
  };
  await secureStorage.setItemAsync(ONBOARDING_KEY, JSON.stringify(data));
}

export async function clearPreAuthOnboarding(): Promise<void> {
  await secureStorage.deleteItemAsync(ONBOARDING_KEY);
}
