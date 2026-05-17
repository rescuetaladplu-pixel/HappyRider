// Simple WebAudio beep — no asset required
let ctx: AudioContext | null = null;

const SOUND_KEY = "happyrider:notification-sound";

export function isNotificationSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(SOUND_KEY) !== "off";
}

export function setNotificationSoundEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SOUND_KEY, enabled ? "on" : "off");
}

export function playBeep() {
  if (typeof window === "undefined") return;
  if (!isNotificationSoundEnabled()) return;
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
    }
    const now = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(880, now);
    o.frequency.setValueAtTime(1320, now + 0.12);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    o.connect(g).connect(ctx.destination);
    o.start(now);
    o.stop(now + 0.32);
  } catch {
    // ignore
  }
}
