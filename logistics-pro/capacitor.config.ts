import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.logisticsapp.beta',
  appName: 'LogisticHub',
  webDir: 'dist',
  server: {
    // This allows the app to talk to your Firebase/API over HTTPS
    androidScheme: 'https'
  }
};

export default config;
