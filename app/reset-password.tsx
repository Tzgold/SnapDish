import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { authClient } from '@/src/lib/auth-client';
import { colors, radius, shadow, spacing } from '@/src/theme/snapdish';

function extractTokenFromInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const match = trimmed.match(/[?&]token=([^&\s]+)/i);
  if (match?.[1]) return decodeURIComponent(match[1]);
  return trimmed;
}

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const initialToken = useMemo(() => {
    const t = params.token;
    if (typeof t === 'string') return t;
    if (Array.isArray(t) && t.length > 0) return t[0];
    return '';
  }, [params.token]);

  const [tokenInput, setTokenInput] = useState(initialToken);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    const token = extractTokenFromInput(tokenInput);
    if (!token) {
      Alert.alert('Reset password', 'Paste the reset token or the link from your email.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Reset password', 'Use at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Reset password', 'Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const { error } = await authClient.resetPassword({ newPassword: password, token });
      if (error) {
        Alert.alert('Reset password', error.message ?? 'Could not reset password.');
        return;
      }
      Alert.alert('Password updated', 'You can now sign in with your new password.');
      router.replace('/sign-in');
    } catch (err) {
      Alert.alert('Reset password', err instanceof Error ? err.message : 'Could not reset password.');
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
        <ThemedText style={styles.title}>Reset password</ThemedText>
        <View style={styles.backSpacer} />
      </View>

      <View style={styles.card}>
        <ThemedText style={styles.body}>
          Paste the link from the reset email (or just the token), then set your new password.
        </ThemedText>
        <ThemedText style={styles.label}>Reset link or token</ThemedText>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          autoCapitalize="none"
          multiline
          numberOfLines={3}
          placeholder="snapdishapp://reset-password?token=..."
          placeholderTextColor={colors.textTertiary}
          value={tokenInput}
          onChangeText={setTokenInput}
        />
        <ThemedText style={styles.label}>New password</ThemedText>
        <TextInput
          style={styles.input}
          secureTextEntry
          placeholder="At least 8 characters"
          placeholderTextColor={colors.textTertiary}
          value={password}
          onChangeText={setPassword}
        />
        <ThemedText style={styles.label}>Confirm new password</ThemedText>
        <TextInput
          style={styles.input}
          secureTextEntry
          placeholder="Type it again"
          placeholderTextColor={colors.textTertiary}
          value={confirm}
          onChangeText={setConfirm}
        />
        <Pressable
          style={[styles.primaryBtn, busy && styles.primaryBtnDisabled]}
          onPress={() => void onSubmit()}
          disabled={busy}
        >
          <ThemedText style={styles.primaryBtnText}>
            {busy ? 'Updating…' : 'Update password'}
          </ThemedText>
        </Pressable>
        <Pressable style={styles.linkRow} onPress={() => router.replace('/sign-in')}>
          <ThemedText style={styles.linkText}>Back to sign in</ThemedText>
        </Pressable>
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
  inputMultiline: {
    minHeight: 72,
    textAlignVertical: 'top',
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
