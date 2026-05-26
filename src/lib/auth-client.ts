import { expoClient } from '@better-auth/expo/client';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';

import { API_BASE_URL } from '@/src/config/api';

const isNgrok = /ngrok/i.test(API_BASE_URL);

export const authClient = createAuthClient({
  baseURL: API_BASE_URL,
  fetchOptions: isNgrok
    ? {
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      }
    : undefined,
  plugins: [
    expoClient({
      scheme: 'snapdishapp',
      storagePrefix: 'snapdish',
      storage: SecureStore,
    }),
  ],
});
