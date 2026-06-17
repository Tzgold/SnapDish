import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { API_BASE_URL } from '@/src/config/api';
import { authClient } from '@/src/lib/auth-client';
import { clearGuestMode } from '@/src/lib/guest-mode';
import { googleSignInReadiness, signInWithGoogle, usesNgrokAuth } from '@/src/lib/social-auth';
import { syncOnboardingPreferences } from '@/src/services/preferences';
import { colors, radius, shadow, spacing } from '@/src/theme/snapdish';

export default function SignUpScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const googleReady = googleSignInReadiness();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/sign-in');
  };

  const onSignUp = async () => {
    const e = email.trim();
    const n = name.trim();
    if (!e || !password || password.length < 8) {
      Alert.alert('Sign up', 'Enter name, email, and a password (at least 8 characters).');
      return;
    }
    setBusy(true);
    try {
      const { error } = await authClient.signUp.email({
        email: e,
        password,
        name: n || 'SnapDish cook',
      });
      if (error) {
        const msg = error.message ?? 'Could not create account.';
        if (/email not verified|verify your email/i.test(msg)) {
          Alert.alert(
            'Verify your email',
            'This app is not sending verification emails yet. Ask the developer to disable email verification for testing, or use the link printed in the API server logs.',
          );
          return;
        }
        if (/already exists|already registered/i.test(msg)) {
          Alert.alert('Account exists', 'That email is already registered. Try Sign in instead.');
          return;
        }
        if (/fetch|network|failed to connect|timeout/i.test(msg)) {
          Alert.alert(
            'Cannot reach server',
            `Check that the API is running and EXPO_PUBLIC_API_URL matches BETTER_AUTH_URL (${msg}).`,
          );
          return;
        }
        Alert.alert('Sign up', msg);
        return;
      }
      const session = await authClient.getSession();
      if (!session.data?.session) {
        Alert.alert(
          'Almost there',
          'Account was created but you are not signed in. Try Sign in — if that fails, the API may still require email verification (restart the server after updating server/.env).',
        );
        return;
      }
      await clearGuestMode();
      try {
        await syncOnboardingPreferences();
      } catch (syncErr) {
        console.warn('preferences sync failed', syncErr);
      }
      router.replace('/(tabs)');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not create account.';
      if (/fetch|network|failed|timeout|request failed/i.test(msg)) {
        Alert.alert(
          'Cannot reach server',
          `The app is trying ${API_BASE_URL}. Make sure the API server is running (npm run dev in server/), phone and PC are on the same Wi‑Fi, and both .env files use your current LAN IP (ipconfig → IPv4). Then restart Expo.`,
        );
      } else {
        Alert.alert('Sign up', msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const onContinueWithGoogle = async () => {
    setGoogleBusy(true);
    try {
      const result = await signInWithGoogle();
      if (!result.ok) {
        Alert.alert('Google sign in', result.message);
        return;
      }
      await clearGuestMode();
      try {
        await syncOnboardingPreferences();
      } catch (syncErr) {
        console.warn('preferences sync failed', syncErr);
      }
      router.replace('/(tabs)');
    } catch (err) {
      Alert.alert('Google sign in', err instanceof Error ? err.message : 'Could not continue with Google.');
    } finally {
      setGoogleBusy(false);
    }
  };

  const authBusy = busy || googleBusy;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <ThemedText style={styles.title}>Create account</ThemedText>
        <View style={styles.backSpacer} />
      </View>

      <View style={styles.card}>
        <ThemedText style={styles.label}>Name</ThemedText>
        <TextInput
          style={styles.input}
          placeholder="Your name"
          placeholderTextColor={colors.textTertiary}
          value={name}
          onChangeText={setName}
        />
        <ThemedText style={styles.label}>Email</ThemedText>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
          placeholderTextColor={colors.textTertiary}
          value={email}
          onChangeText={setEmail}
        />
        <ThemedText style={styles.label}>Password</ThemedText>
        <TextInput
          style={styles.input}
          secureTextEntry
          placeholder="At least 8 characters"
          placeholderTextColor={colors.textTertiary}
          value={password}
          onChangeText={setPassword}
        />
        <Pressable style={[styles.primaryBtn, authBusy && styles.primaryBtnDisabled]} onPress={() => void onSignUp()} disabled={authBusy}>
          <ThemedText style={styles.primaryBtnText}>{busy ? 'Creating…' : 'Sign up'}</ThemedText>
        </Pressable>
        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <ThemedText style={styles.dividerText}>or</ThemedText>
          <View style={styles.divider} />
        </View>
        <Pressable
          style={[styles.googleBtn, (authBusy || !googleReady.ready) && styles.primaryBtnDisabled]}
          onPress={() => void onContinueWithGoogle()}
          disabled={authBusy || !googleReady.ready}>
          <View style={styles.googleIconWrap}>
            <Ionicons name="logo-google" size={20} color="#4285F4" />
          </View>
          <ThemedText style={styles.googleBtnText}>
            {googleBusy ? 'Opening Google sign-in…' : 'Continue with Google'}
          </ThemedText>
        </Pressable>
        {!googleReady.ready ? (
          <ThemedText style={styles.googleHint}>
            Google needs HTTPS (ngrok). Email sign-up works on Wi‑Fi now.
          </ThemedText>
        ) : usesNgrokAuth() ? (
          <ThemedText style={styles.googleHint}>
            Opens Google directly — pick your account and you&apos;re in.
          </ThemedText>
        ) : null}
        <Pressable onPress={() => router.push('/sign-in')} style={styles.linkRow}>
          <ThemedText style={styles.linkText}>Already have an account? Sign in</ThemedText>
        </Pressable>
        <Pressable onPress={() => router.push('/forgot-password')} style={styles.forgotRow}>
          <ThemedText style={styles.forgotText}>Forgot password?</ThemedText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    padding: spacing.xxs,
  },
  backSpacer: {
    width: 32,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  card: {
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    padding: spacing.lg,
    ...shadow.md,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: spacing.sm,
    paddingVertical: 12,
  },
  primaryBtn: {
    alignItems: 'center',
    backgroundColor: colors.text,
    borderRadius: radius.sm,
    marginTop: spacing.sm,
    paddingVertical: 14,
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  dividerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  divider: {
    backgroundColor: colors.border,
    flex: 1,
    height: 1,
  },
  dividerText: {
    color: colors.textTertiary,
    fontSize: 13,
    fontWeight: '600',
  },
  googleBtn: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DADCE0',
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  googleIconWrap: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  googleBtnText: {
    color: '#3C4043',
    fontSize: 16,
    fontWeight: '600',
  },
  googleHint: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  linkRow: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  linkText: {
    color: colors.brand,
    fontSize: 15,
    fontWeight: '600',
  },
  forgotRow: {
    alignItems: 'center',
    paddingTop: spacing.xxs,
  },
  forgotText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
