// WebAudio notification presets — no asset files required.
// Each preset schedules a short (~0.8-1.2s) sequence. Loud + distinct.

let ctx: AudioContext | null = null;

const SOUND_KEY = "happyrider:notification-sound";
const PRESET_KEY = "happyrider:notification-preset";
const SOUND_EVENT = "happyrider:notification-sound-changed";

export type SoundPresetId =
  | "classic"
  | "siren"
  | "alarm"
  | "chime"
  | "horn"
  | "alert";

export interface SoundPreset {
  id: SoundPresetId;
  label: string;
  description: string;
}

export const SOUND_PRESETS: SoundPreset[] = [
  { id: "classic", label: "ปี๊บคู่ (มาตรฐาน)", description: "เสียงสั้น 2 ครั้ง" },
  { id: "siren", label: "ไซเรน", description: "เสียงหวอกวาดสูง-ต่ำ" },
  { id: "alarm", label: "ปลุก", description: "ปี๊บถี่ๆ 4 ครั้ง" },
  { id: "chime", label: "ระฆัง", description: "3 โน้ตไล่ขึ้น" },
  { id: "horn", label: "แตร", description: "เสียงต่ำดังลั่น" },
  { id: "alert", label: "เตือนภัย", description: "ปี๊บสูงต่อเนื่อง" },
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
  if (typeof window === "undefined") return "classic";
  const v = localStorage.getItem(PRESET_KEY) as SoundPresetId | null;
  return v && SOUND_PRESETS.some((p) => p.id === v) ? v : "classic";
}

export function setNotificationPreset(id: SoundPresetId) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PRESET_KEY, id);
  window.dispatchEvent(new CustomEvent(SOUND_EVENT, { detail: id }));
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

// ---------------- Audio engine ----------------
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
    case "classic":
      tone(ac, t, 0.18, 880, "sine", 0.3);
      tone(ac, t + 0.2, 0.22, 1320, "sine", 0.3);
      break;
    case "siren":
      tone(ac, t, 0.5, [600, 1400], "sawtooth", 0.35);
      tone(ac, t + 0.5, 0.5, [1400, 600], "sawtooth", 0.35);
      break;
    case "alarm":
      for (let i = 0; i < 4; i++) {
        tone(ac, t + i * 0.18, 0.12, 1500, "square", 0.3);
      }
      break;
    case "chime":
      tone(ac, t, 0.35, 784, "triangle", 0.35); // G5
      tone(ac, t + 0.18, 0.35, 988, "triangle", 0.35); // B5
      tone(ac, t + 0.36, 0.55, 1175, "triangle", 0.35); // D6
      break;
    case "horn":
      tone(ac, t, 0.6, 220, "square", 0.35);
      tone(ac, t, 0.6, 330, "sawtooth", 0.2);
      break;
    case "alert":
      for (let i = 0; i < 5; i++) {
        tone(ac, t + i * 0.13, 0.1, 2000, "square", 0.28);
      }
      break;
  }
}

export function playBeep(presetOverride?: SoundPresetId) {
  if (typeof window === "undefined") return;
  if (!isNotificationSoundEnabled() && !presetOverride) return;
  try {
    playPreset(presetOverride ?? getNotificationPreset());
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
