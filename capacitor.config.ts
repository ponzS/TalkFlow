import { CapacitorConfig } from '@capacitor/cli';
import { CapacitorHttp } from '@capacitor/core';
import { KeyboardResize, KeyboardStyle } from '@capacitor/keyboard'
const config: CapacitorConfig = {
  appId: 'com.ponzs.talkflow',
  appName: 'TalkFlow',
  webDir: 'dist',
  server: {
    //  iosScheme: 'https',
      //  androidScheme: 'https',
  //  url: 'http://localhost:5173',
   // url: 'http://192.168.50.36:5173',
  // url:'http://192.168.1.9:5173/',
   //   cleartext: true,
  //     hostname: 'localhost',
  //     allowNavigation: [                        // 允许导航的白名单
  //       'https://peer.wallie.io/gun',
  // 'https://gun.defucc.me/gun',
  // 'http://123.57.225.210:8080/gun',
  //     ],
  },
 
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    // BackgroundRunner: {
    //   label: 'com.talkflow.background.task',
    //   src: 'runners/background.js',
    //   event: 'checkMessages',
    //   repeat: true,
    //   interval: 15, 
    //   autoStart: true,
    // },
    Keyboard: {
      resize: KeyboardResize.None,
      resizeOnFullScreen: true,
   
    },
    CapacitorSQLite: {
      migrate: true,
    iosDatabaseLocation: 'Library/CapacitorDatabase',
    iosIsEncryption: true,
    iosKeychainPrefix: 'talkflow',
    iosBiometric: {
        biometricAuth: false,
        biometricTitle : "Biometric login for capacitor sqlite"
    },
    androidIsEncryption: true,
    androidBiometric: {
        biometricAuth : false,
        biometricTitle : "Biometric login for capacitor sqlite",
        biometricSubTitle : "Log in using your biometric"
    },
    electronIsEncryption: true,
    electronWindowsLocation: "C:\\ProgramData\\CapacitorDatabases",
    electronMacLocation: "~/Databases/",
    electronLinuxLocation: "Databases"
    }
  }
};

export default config;
