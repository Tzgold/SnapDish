import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { authClient } from '@/src/lib/auth-client';
import { colors, radius, shadow, spacing } from '@/src/theme/snapdish';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async () => {
    const e = email.trim();
    if (!e) {
      Alert.alert('Forgot password', 'Enter your email.');
      return;
    }
    setBusy(true);
    try {
      const { error } = await authClient.forgetPassword({
        email: e,
        redirectTo: 'snapdishapp://reset-password',
      });
      if (error) {
        Alert.alert('Forgot password', error.message ?? 'Could not send reset email.');
        return;
      }
      setSent(true);
    } catch (err) {
      Alert.alert('Forgot password', err instanceof Error ? err.message : 'Could not send reset email.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <ThemedText style={styles.title}>Forgot password</ThemedText>
        <View style={styles.backSpacer} />
      </View>

      <View style={styles.card}>
        {sent ? (
          <>
            <ThemedText style={styles.label}>Check your email</ThemedText>
            <ThemedText style={styles.body}>
              If an account exists for {email.trim()}, we sent a reset link. In development the link is printed in the API server terminal — open it on your phone or paste the token on the next screen.
            </ThemedText>
            <Pressable style={styles.primaryBtn} onPress={() => router.push('/reset-password')}>
              <ThemedText style={styles.primaryBtnText}>I have a reset token</ThemedText>
            </Pressable>
            <Pressable style={styles.linkRow} onPress={() => router.replace('/sign-in')}>
              <ThemedText style={styles.linkText}>Back to sign in</ThemedText>
            </Pressable>
          </>
        ) : (
          <>
            <ThemedText style={styles.body}>
              Enter the email you used to sign up. We will send you a link to set a new password.
            </ThemedText>
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
            <Pressable
              style={[styles.primaryBtn, busy && styles.primaryBtnDisabled]}
              onPress={() => void onSubmit()}
              disabled={busy}
            >
              <ThemedText style={styles.primaryBtnText}>
                {busy ? 'Sending…' : 'Send reset link'}
              </ThemedText>
            </Pressable>
            <Pressable style={styles.linkRow} onPress={() => router.push('/reset-password')}>
              <ThemedText style={styles.linkText}>I already have a reset token</ThemedText>
            </Pressable>
          </>
        )}
      </View>
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
    paddingVertical: spacing.sm,
  },
  backBtn: { padding: spacing.xxs },
  backSpacer: { width: 32 },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    padding: spacing.lg,
    ...shadow.md,
  },
  body: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  label: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
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
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  linkRow: { alignItems: 'center', paddingVertical: spacing.sm },
  linkText: { color: colors.brand, fontSize: 15, fontWeight: '600' },
});
