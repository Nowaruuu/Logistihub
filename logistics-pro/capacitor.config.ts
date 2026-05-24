import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.logisticsapp.beta',
  appName: 'LogisticHub',
  webDir: 'dist',
  server: {
    url: 'https://logistihub.ddns.net/app',
    androidScheme: 'https'
  }
};

export default config;
