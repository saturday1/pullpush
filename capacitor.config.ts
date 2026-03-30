import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pullpush.app',
  appName: 'PullPush',
  webDir: 'dist',
  ios: {
    pluginClasses: ['RestTimerPlugin'],
  },
};

export default config;
