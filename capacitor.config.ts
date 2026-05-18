import type { CapacitorConfig } from "@capacitor/cli";

// HappyRider — Capacitor (Android) wrapper
// Live URL mode: APK โหลด UI จาก published URL ตรง ๆ
// แก้โค้ดบน Lovable → APK เห็นทันที ไม่ต้อง rebuild
//
// ⚠️ appId ต้อง "ไม่ซ้ำ" กับฝั่ง customer (app.happyeat.customer)
//    เพราะถ้าซ้ำ Android จะถือว่าเป็นแอปเดียวกัน ติดตั้งทับกันไม่ได้
const config: CapacitorConfig = {
  appId: "app.happyrider.driver",
  appName: "HappyRider",
  webDir: "dist",
  server: {
    // Published URL ของห้องไรเดอร์
    url: "https://happyrider.lovable.app",
    cleartext: false,
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#ffffff",
      androidSplashResourceName: "splash",
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
