// Notification sound presets — MUST match HappyEat shared contract exactly
// (channel IDs `orders_siren`, `orders_airhorn`, `orders_emergency`).
// User's pick is persisted to `profiles.notification_sound` so backend FCM
// payloads target the correct Android channel for this rider.

import { supabase } from "@/integrations/supabase/client";

let ctx: AudioContext | null = null;

const SOUND_KEY = "happyrider:notification-sound";
const PRESET_KEY = "happyrider:notification-preset";
const SOUND_EVENT = "happyrider:notification-sound-changed";

export type SoundPresetId = "siren" | "airhorn" | "emergency";

export interface SoundPreset {
  id: SoundPresetId;
  label: string;
  description: string;
}

export const SOUND_PRESETS: SoundPreset[] = [
  { id: "siren", label: "Siren ตำรวจ (แนะนำ)", description: "ไซเรนกวาดสองโทน ดังมาก" },
  { id: "airhorn", label: "Air Horn แตรลม", description: "แตรลมโทนต่ำ ก้องสนาม สะเทือนหู" },
  { id: "emergency", label: "Emergency รถพยาบาล", description: "สลับสองโทนเร็วๆ คล้ายรถฉุกเฉิน" },
];

// ---------------- Settings ----------------
export function isNotificationSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(SOUND_KEY) !== "off";
}

export function setNotificationSoundEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SOUND_KEY, enabled ? "on" : "off");
  window.dispatchEvent(new CustomEvent(SOUND_EVENT, { detail: enabled }));
}

export function getNotificationPreset(): SoundPresetId {
  if (typeof window === "undefined") return "siren";
  const v = localStorage.getItem(PRESET_KEY) as SoundPresetId | null;
  return v && SOUND_PRESETS.some((p) => p.id === v) ? v : "siren";
}

export function setNotificationPreset(id: SoundPresetId) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PRESET_KEY, id);
  window.dispatchEvent(new CustomEvent(SOUND_EVENT, { detail: id }));
  // Persist to DB so backend FCM payload uses the right channel
  void (async () => {
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) return;
      await supabase.from("profiles").update({ notification_sound: id }).eq("id", uid);
    } catch (e) {
      console.warn("[notification-sound] persist pref failed", e);
    }
  })();
}

/** Pull DB pref into local cache on app boot. */
export async function syncNotificationPresetFromDB(): Promise<void> {
  try {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) return;
    const { data } = await supabase
      .from("profiles")
      .select("notification_sound")
      .eq("id", uid)
      .maybeSingle();
    const v = (data as { notification_sound?: string } | null)?.notification_sound;
    if (v && SOUND_PRESETS.some((p) => p.id === v)) {
      localStorage.setItem(PRESET_KEY, v);
      window.dispatchEvent(new CustomEvent(SOUND_EVENT, { detail: v }));
    }
  } catch {
    // ignore — keep local pref
  }
}

export function onNotificationSoundChange(cb: (enabled: boolean) => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb(isNotificationSoundEnabled());
  window.addEventListener(SOUND_EVENT, handler);
  window.addEventListener("storage", (e) => {
    if (e.key === SOUND_KEY) handler();
  });
  return () => window.removeEventListener(SOUND_EVENT, handler);
}

// ---------------- Audio engine (WebAudio fallback for preview) ----------------
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  return ctx;
}

function tone(
  ac: AudioContext,
  start: number,
  duration: number,
  freq: number | [number, number],
  type: OscillatorType = "sine",
  gain = 0.35,
) {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  if (Array.isArray(freq)) {
    o.frequency.setValueAtTime(freq[0], start);
    o.frequency.linearRampToValueAtTime(freq[1], start + duration);
  } else {
    o.frequency.setValueAtTime(freq, start);
  }
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  o.connect(g).connect(ac.destination);
  o.start(start);
  o.stop(start + duration + 0.02);
}

function playPreset(id: SoundPresetId) {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  switch (id) {
    case "siren":
      tone(ac, t, 0.5, [600, 1200], "sawtooth", 0.4);
      tone(ac, t + 0.5, 0.5, [1200, 600], "sawtooth", 0.4);
      tone(ac, t + 1.0, 0.5, [600, 1200], "sawtooth", 0.4);
      break;
    case "airhorn":
      tone(ac, t, 0.9, 220, "sawtooth", 0.4);
      tone(ac, t, 0.9, 330, "sawtooth", 0.3);
      tone(ac, t, 0.9, 110, "sawtooth", 0.35);
      break;
    case "emergency":
      for (let i = 0; i < 4; i++) {
        tone(ac, t + i * 0.32, 0.28, 950, "sawtooth", 0.35);
        tone(ac, t + i * 0.32 + 0.16, 0.28, 650, "sawtooth", 0.35);
      }
      break;
  }
}

// Prefer the .mp3 used by the native channel so web preview matches Android.
let mp3Cache: Record<string, HTMLAudioElement> = {};
function playMp3(id: SoundPresetId): boolean {
  if (typeof window === "undefined" || typeof Audio === "undefined") return false;
  try {
    let el = mp3Cache[id];
    if (!el) {
      el = new Audio(`/sounds/${id}.mp3`);
      el.preload = "auto";
      mp3Cache[id] = el;
    }
    el.currentTime = 0;
    el.volume = 1.0;
    const p = el.play();
    if (p && typeof p.then === "function") {
      p.catch(() => playPreset(id));
    }
    return true;
  } catch {
    return false;
  }
}

export function playBeep(presetOverride?: SoundPresetId) {
  if (typeof window === "undefined") return;
  if (!isNotificationSoundEnabled() && !presetOverride) return;
  const id = presetOverride ?? getNotificationPreset();
  try {
    if (!playMp3(id)) playPreset(id);
  } catch {
    // ignore
  }
}

// ---- Looping beep (foreground only) ----
let loopTimer: ReturnType<typeof setInterval> | null = null;
let stopHandlers: Array<() => void> = [];

export function isBeepLooping() {
  return loopTimer !== null;
}

export function stopBeepLoop() {
  if (loopTimer) {
    clearInterval(loopTimer);
    loopTimer = null;
  }
  stopHandlers.forEach((fn) => fn());
  stopHandlers = [];
}

export function startBeepLoop(intervalMs = 2200, maxMs = 60_000) {
  if (typeof window === "undefined") return;
  if (!isNotificationSoundEnabled()) return;
  stopBeepLoop();
  playBeep();
  loopTimer = setInterval(playBeep, intervalMs);

  const stop = () => stopBeepLoop();
  const onHide = () => {
    if (document.visibilityState === "hidden") stop();
  };
  window.addEventListener("pointerdown", stop, { once: true });
  window.addEventListener("keydown", stop, { once: true });
  document.addEventListener("visibilitychange", onHide);
  const timeout = window.setTimeout(stop, maxMs);

  stopHandlers.push(() => {
    window.removeEventListener("pointerdown", stop);
    window.removeEventListener("keydown", stop);
    document.removeEventListener("visibilitychange", onHide);
    window.clearTimeout(timeout);
  });
}
