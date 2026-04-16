/** @param {{ config: import('expo/config').ExpoConfig }} ctx */
module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...(typeof config.extra === 'object' && config.extra !== null ? config.extra : {}),
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000',
  },
});
