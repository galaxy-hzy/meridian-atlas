import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'io.github.galaxyhzy.meridianatlas',
  appName: '经络图谱',
  webDir: 'dist-mobile',
  ios: { path: 'mobile/ios', contentInset: 'never', webContentsDebuggingEnabled: false },
  // No remote server URL, navigation allowlist, credentials, or live-update service.
};
export default config;
