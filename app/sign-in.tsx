import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { authClient } from '@/src/lib/auth-client';
import { syncOnboardingPreferences } from '@/src/services/preferences';
import { colors, radius, shadow, spacing } from '@/src/theme/snapdish';

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/onboarding');
  };

  const onSignIn = async () => {
    const e = email.trim();
    if (!e || !password) {
      Alert.alert('Sign in', 'Enter email and password.');
      return;
    }
    setBusy(true);
    try {
      const { error } = await authClient.signIn.email({ email: e, password });
      if (error) {
        const status = (error as { status?: number }).status;
        const msg = error.message ?? 'Could not sign in.';
        if (status === 403 || /email not verified|verify your email/i.test(msg)) {
          Alert.alert('Verify your email', 'Please verify your email before signing in.');
          return;
        }
        if (status === 401 || /invalid|incorrect|wrong password|credentials/i.test(msg)) {
          Alert.alert('Wrong email or password', 'Check your password, or sign up if you do not have an account yet.');
          return;
        }
        if ((error.message ?? '').toLowerCase().includes('credential account not found')) {
          Alert.alert('Use Google sign in', 'This account was created with Google. Tap Continue with Google.');
          return;
        }
        if (status === 404 || /fetch|network|failed to connect|timeout|not found/i.test(msg)) {
          Alert.alert(
            'Cannot reach server',
            'Start the API (npm run dev in server/), use the same URL in app .env and server BETTER_AUTH_URL, and use your PC Wi‑Fi IP (not an old ngrok link).',
          );
          return;
        }
        Alert.alert('Sign in', msg);
        return;
      }
      const session = await authClient.getSession();
      if (!session.data?.session) {
        Alert.alert(
          'Sign in',
          'Server responded but no session was saved. Restart Expo after changing .env, and confirm BETTER_AUTH_URL matches EXPO_PUBLIC_API_URL.',
        );
        return;
      }
      try {
        await syncOnboardingPreferences();
      } catch (syncErr) {
        console.warn('preferences sync failed', syncErr);
      }
      router.push('/profile');
    } catch (err) {
      Alert.alert('Sign in', err instanceof Error ? err.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  };

  const onContinueWithGoogle = async () => {
    setBusy(true);
    try {
      const { error } = await authClient.signIn.social({
        provider: 'google',
        callbackURL: '/profile',
      });
      if (error) {
        const msg = error.message ?? '';
        if (/redirect_uri|invalid.*redirect|unauthorized|origin|insecure/i.test(msg)) {
          Alert.alert(
            'Google sign in needs a public URL',
            'Google does not allow OAuth callbacks to LAN IPs like 192.168.x.x. Run the API behind ngrok (https://...ngrok-free.dev) and add that URL + /api/auth/callback/google as an authorized redirect URI in Google Cloud → OAuth client. For now, please use email and password.',
          );
          return;
        }
        Alert.alert('Google sign in', msg || 'Could not continue with Google. Use email and password for now.');
        return;
      }
      try {
        await syncOnboardingPreferences();
      } catch (syncErr) {
        console.warn('preferences sync failed', syncErr);
      }
      router.push('/profile');
    } catch (err) {
      Alert.alert(
        'Google sign in',
        err instanceof Error ? err.message : 'Could not continue with Google. Use email and password for now.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <ThemedText style={styles.title}>Sign in</ThemedText>
        <View style={styles.backSpacer} />
      </View>

      <View style={styles.card}>
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
          placeholder="••••••••"
          placeholderTextColor={colors.textTertiary}
          value={password}
          onChangeText={setPassword}
        />
        <Pressable style={[styles.primaryBtn, busy && styles.primaryBtnDisabled]} onPress={() => void onSignIn()} disabled={busy}>
          <ThemedText style={styles.primaryBtnText}>{busy ? 'Signing in…' : 'Continue'}</ThemedText>
        </Pressable>
        <Pressable onPress={() => router.push('/forgot-password')} style={styles.forgotRow}>
          <ThemedText style={styles.forgotText}>Forgot password?</ThemedText>
        </Pressable>
        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <ThemedText style={styles.dividerText}>or</ThemedText>
          <View style={styles.divider} />
        </View>
        <Pressable style={[styles.googleBtn, busy && styles.primaryBtnDisabled]} onPress={() => void onContinueWithGoogle()} disabled={busy}>
          <Ionicons name="logo-google" size={18} color={colors.text} />
          <ThemedText style={styles.googleBtnText}>Continue with Google</ThemedText>
        </Pressable>
        <Pressable onPress={() => router.push('/sign-up')} style={styles.linkRow}>
          <ThemedText style={styles.linkText}>New here? Create an account</ThemedText>
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
    backgroundColor: colors.surfaceBorder,
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
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.surfaceBorder,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    paddingVertical: 14,
  },
  googleBtnText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
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
    alignItems: 'flex-end',
    paddingVertical: spacing.xxs,
  },
  forgotText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
});
