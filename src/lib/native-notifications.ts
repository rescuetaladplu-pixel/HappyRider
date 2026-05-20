// Native Android notification channels via Capacitor PushNotifications.
// Each preset gets its own channel with a unique sound from res/raw.
// User's preferred channel id is persisted in localStorage and (optionally)
// reported to the backend so FCM payloads can target the right channel.
//
// REQUIREMENTS (must be done on the Android build machine):
//   1) Copy android-resources/raw/*.mp3 → android/app/src/main/res/raw/
//   2) Run: npx cap sync android && rebuild APK
//   3) Backend (happyeat) FCM payload for this rider must set:
//        android.notification.channel_id = "happyrider_<preset>"
//        android.notification.sound      = "happyrider_<preset>"
//      Without channel_id the system uses the default channel sound.

import { Capacitor } from "@capacitor/core";
import {
  PushNotifications,
  type Channel,
} from "@capacitor/push-notifications";
import { LocalNotifications } from "@capacitor/local-notifications";
import {
  SOUND_PRESETS,
  getNotificationPreset,
  playBeep,
  type SoundPresetId,
} from "@/lib/notification-sound";

const CHANNEL_PREFIX = "happyrider_";

export function channelIdFor(preset: SoundPresetId): string {
  return CHANNEL_PREFIX + preset;
}

let initialized = false;

export async function initNativeNotifications() {
  if (initialized) return;
  if (!Capacitor.isNativePlatform()) return;
  if (Capacitor.getPlatform() !== "android") return;
  initialized = true;

  try {
    // 1) Permission
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== "granted") {
      console.warn("[native-notif] push permission not granted");
      return;
    }

    await LocalNotifications.requestPermissions();

    // 2) Create one channel per preset (each with its own loud sound).
    //    Android caches channels — once created, sound cannot change.
    //    Channel id matches the mp3 filename in res/raw (without extension).
    for (const p of SOUND_PRESETS) {
      const ch: Channel = {
        id: channelIdFor(p.id),
        name: `HappyRider — ${p.label}`,
        description: `แจ้งเตือนงานใหม่ (${p.description})`,
        sound: channelIdFor(p.id), // res/raw/happyrider_<preset>.mp3
        importance: 5, // IMPORTANCE_HIGH (heads-up)
        visibility: 1,
        vibration: true,
        lights: true,
      };
      try {
        await PushNotifications.createChannel(ch);
      } catch (e) {
        console.warn("[native-notif] createChannel failed", ch.id, e);
      }
    }

    // 3) Register for FCM token
    await PushNotifications.register();

    // 4) Foreground: Android suppresses notification UI when app is open.
    //    Re-emit via LocalNotifications using the user's chosen channel so
    //    the loud sound plays even with the app in foreground.
    PushNotifications.addListener("pushNotificationReceived", async (notif) => {
      const preset = getNotificationPreset();
      const channelId = channelIdFor(preset);
      const title = notif.title || notif.data?.title || "HappyRider";
      const body = notif.body || notif.data?.body || "มีงานใหม่!";
      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: Math.floor(Math.random() * 2_147_483_647),
              title,
              body,
              channelId,
              smallIcon: "ic_stat_icon_config_sample",
              extra: notif.data ?? {},
            },
          ],
        });
      } catch (e) {
        console.warn("[native-notif] local schedule failed", e);
        // Fallback: web beep (foreground only)
        playBeep();
      }
    });

    PushNotifications.addListener("registrationError", (err) => {
      console.error("[native-notif] registration error", err);
    });
  } catch (e) {
    console.error("[native-notif] init failed", e);
  }
}
