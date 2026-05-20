// Native Android notification channels via Capacitor PushNotifications.
// MUST match HappyEat SHARED_CONTRACT.md (entry 2026-05-20) exactly:
//   channel IDs: orders_siren | orders_airhorn | orders_emergency
//   sound files: siren.mp3   | airhorn.mp3   | emergency.mp3
//                in android/app/src/main/res/raw/
// User's preferred preset is stored in profiles.notification_sound and the
// HappyEat backend reads it to set android.notification.channel_id per push.

import { Capacitor } from "@capacitor/core";
import {
  PushNotifications,
  type Channel,
} from "@capacitor/push-notifications";
import { LocalNotifications } from "@capacitor/local-notifications";
import {
  SOUND_PRESETS,
  getNotificationPreset,
  syncNotificationPresetFromDB,
  playBeep,
  type SoundPresetId,
} from "@/lib/notification-sound";

const CHANNEL_PREFIX = "orders_";

export function channelIdFor(preset: SoundPresetId): string {
  return CHANNEL_PREFIX + preset;
}

let initialized = false;

/** Public entry — called from rider-context on auth. Safe to call repeatedly. */
export async function initNativeNotifications() {
  if (initialized) return;
  // Pull DB pref into local cache regardless of platform
  void syncNotificationPresetFromDB();
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

    // 2) Create one channel per preset, sound name = res/raw/<preset>.mp3
    //    Android caches channels — once created, sound cannot change.
    for (const p of SOUND_PRESETS) {
      const ch: Channel = {
        id: channelIdFor(p.id), // orders_<preset>
        name: `HappyRider — ${p.label}`,
        description: `แจ้งเตือนงานใหม่ (${p.description})`,
        sound: p.id, // res/raw/<preset>.mp3 (siren / airhorn / emergency)
        importance: 5,
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

    // 4) Foreground: re-emit via LocalNotifications on the user's chosen channel
    //    so the loud sound plays even with the app in foreground.
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
