import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { authClient } from '@/src/lib/auth-client';

function routeFromAuthDeepLink(url: string): string | null {
  try {
    const parsed = Linking.parse(url);
    const path = (parsed.path ?? '').replace(/^\//, '');
    if (path === 'reset-password' || path.startsWith('reset-password')) {
      const token = parsed.queryParams?.token;
      const t = typeof token === 'string' ? token : Array.isArray(token) ? token[0] : '';
      return t ? `/reset-password?token=${encodeURIComponent(t)}` : '/reset-password';
    }
    if (path === 'profile' || path.startsWith('profile')) {
      return '/profile';
    }
  } catch {
    /* ignore */
  }
  return null;
}

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    const handleUrl = (url: string) => {
      const route = routeFromAuthDeepLink(url);
      if (route) router.push(route as '/reset-password' | '/profile');
    };

    void Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, [router]);

  useEffect(() => {
    if (isPending) return;

    const current = segments[0];
    const inAuth =
      current === 'sign-in' ||
      current === 'sign-up' ||
      current === 'forgot-password' ||
      current === 'reset-password';
    const inOnboarding = current === 'onboarding';

    if (!session) {
      if (!inOnboarding && !inAuth) {
        router.replace('/onboarding');
        return;
      }
      return;
    }

    if (session && (inAuth || inOnboarding)) {
      router.replace('/profile');
    }
  }, [isPending, router, segments, session]);

  if (isPending) {
    return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
        <StatusBar style="auto" />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="recipe-result" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        <Stack.Screen name="sign-up" options={{ headerShown: false }} />
        <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
        <Stack.Screen name="reset-password" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
