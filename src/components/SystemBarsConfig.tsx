import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

/**
 * Runtime config สำหรับ Android system bars
 * - ปิด overlay status bar (webview จะไม่ทับแถบบน)
 * - ตั้งสีพื้นหลัง status bar ให้เข้ากับธีม
 *
 * หมายเหตุ: ตัว navigation bar (ล่าง) + adjustMarginsForEdgeToEdge
 * แก้ที่ runtime ไม่ได้ — ต้อง rebuild APK เท่านั้น
 * (แก้ใน capacitor.config.ts แล้ว)
 */
export function SystemBarsConfig() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (Capacitor.getPlatform() !== "android") return;

    (async () => {
      try {
        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setStyle({ style: Style.Default });
        await StatusBar.setBackgroundColor({ color: "#ffffff" });
      } catch (e) {
        console.warn("StatusBar config failed:", e);
      }
    })();
  }, []);

  return null;
}
