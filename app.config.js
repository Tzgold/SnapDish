/** @param {{ config: import('expo/config').ExpoConfig }} ctx */
module.exports = ({ config }) => ({
  ...config,
  plugins: [...(Array.isArray(config.plugins) ? config.plugins : []), 'expo-secure-store'],
  extra: {
    ...(typeof config.extra === 'object' && config.extra !== null ? config.extra : {}),
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000',
  },
});
