import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.logistihub.mobile',
  appName: 'LogistiHub',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
