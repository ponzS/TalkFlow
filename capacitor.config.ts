import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ponzs.talkflow',
  appName: 'TalkFlow',
  webDir: 'dist',
  server: {
     androidScheme: 'https',
    //   url: 'http://localhost:5173',
    // cleartext: true,
  },
  plugins: {
    CapacitorSQLite: {
      migrate: true,
    iosDatabaseLocation: 'Library/CapacitorDatabase',
    iosIsEncryption: false,
    iosKeychainPrefix: 'ionic7-vue-sqlite-app',
    iosBiometric: {
        biometricAuth: false,
        biometricTitle : "Biometric login for capacitor sqlite"
    },
    androidIsEncryption: false,
    androidBiometric: {
        biometricAuth : false,
        biometricTitle : "Biometric login for capacitor sqlite",
        biometricSubTitle : "Log in using your biometric"
    },
    electronIsEncryption: false,
    electronWindowsLocation: "C:\\ProgramData\\CapacitorDatabases",
    electronMacLocation: "/Volumes/Development_Lacie/Development/Databases/ionic7-vue-sqlite-app",
    electronLinuxLocation: "Databases"
    }
  }
};

export default config;
