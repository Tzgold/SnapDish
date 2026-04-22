import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { authClient } from '@/src/lib/auth-client';
import { syncOnboardingPreferences } from '@/src/services/preferences';
import { colors, radius, shadow, spacing } from '@/src/theme/snapdish';

export default function SignUpScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

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
        Alert.alert('Sign up', error.message ?? 'Could not create account.');
        return;
      }
      try {
        await syncOnboardingPreferences();
      } catch (syncErr) {
        console.warn('preferences sync failed', syncErr);
      }
      router.push('/profile');
    } catch (err) {
      Alert.alert('Sign up', err instanceof Error ? err.message : 'Could not create account.');
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
        <Pressable style={[styles.primaryBtn, busy && styles.primaryBtnDisabled]} onPress={() => void onSignUp()} disabled={busy}>
          <ThemedText style={styles.primaryBtnText}>{busy ? 'Creating…' : 'Sign up'}</ThemedText>
        </Pressable>
        <Pressable onPress={() => router.push('/sign-in')} style={styles.linkRow}>
          <ThemedText style={styles.linkText}>Already have an account? Sign in</ThemedText>
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
  linkRow: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  linkText: {
    color: colors.brand,
    fontSize: 15,
    fontWeight: '600',
  },
});
