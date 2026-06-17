import { expoClient } from '@better-auth/expo/client';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { WebBrowserPresentationStyle } from 'expo-web-browser';

import { API_BASE_URL } from '@/src/config/api';

/** Auth uses LAN IP — fast and no ngrok interstitial. Google idToken sign-in skips browser OAuth entirely. */
export const authClient = createAuthClient({
  baseURL: API_BASE_URL,
  plugins: [
    expoClient({
      scheme: 'snapdishapp',
      storagePrefix: 'snapdish',
      storage: SecureStore,
      cookiePrefix: 'better-auth',
      webBrowserOptions: {
        preferEphemeralSession: false,
        createTask: true,
        showInRecents: true,
        showTitle: true,
        enableBarCollapsing: false,
        toolbarColor: '#FFFFFF',
        ...(Platform.OS === 'ios'
          ? {
              presentationStyle: WebBrowserPresentationStyle.FULL_SCREEN,
              dismissButtonStyle: 'close' as const,
            }
          : {}),
      },
    }),
  ],
});
