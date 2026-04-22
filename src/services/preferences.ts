import { getPreAuthOnboarding } from '@/src/lib/pre-auth-onboarding';
import { apiFetch } from '@/src/services/http';

export async function syncOnboardingPreferences(): Promise<void> {
  const onboarding = await getPreAuthOnboarding();
  if (!onboarding) return;

  const res = await apiFetch('/api/me/preferences', {
    method: 'POST',
    body: JSON.stringify({
      goal: onboarding.goal,
      skill: onboarding.skill,
      time: onboarding.time,
      diet: onboarding.diet,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Could not sync preferences');
  }
}
