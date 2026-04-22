/** @param {{ config: import('expo/config').ExpoConfig }} ctx */
module.exports = ({ config }) => ({
  ...config,
  plugins: [
    ...(Array.isArray(config.plugins) ? config.plugins : []),
    'expo-secure-store',
    [
      'expo-build-properties',
      {
        android: {
          // Dev API over http://YOUR_LAN_IP:4000 — required on Android 9+ without HTTPS
          usesCleartextTraffic: true,
        },
      },
    ],
  ],
  ios: {
    ...(typeof config.ios === 'object' && config.ios !== null ? config.ios : {}),
    infoPlist: {
      ...(typeof config.ios?.infoPlist === 'object' && config.ios?.infoPlist !== null ? config.ios.infoPlist : {}),
      // Dev: allow HTTP to your PC on the LAN (tighten for production / HTTPS-only API)
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: true,
      },
    },
  },
  extra: {
    ...(typeof config.extra === 'object' && config.extra !== null ? config.extra : {}),
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000',
  },
});
