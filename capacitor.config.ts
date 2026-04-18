import type { CapacitorConfig } from '@capacitor/cli';

const liveReloadUrl = process.env.VITE_LIVE_RELOAD_URL;

const config: CapacitorConfig = {
  appId: 'com.pullpush.app',
  appName: 'PullPush',
  webDir: 'dist',
  ios: {
    pluginClasses: ['RestTimerPlugin'],
  },
  ...(liveReloadUrl && {
    server: {
      url: liveReloadUrl,
      cleartext: true,
    },
  }),
};

export default config;
