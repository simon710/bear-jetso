import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bigfootws.jetso',
  appName: '小熊優惠助手',
  webDir: 'dist',
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_jetso",
      iconColor: "#FF69B4"
    }
  }
};

export default config;
