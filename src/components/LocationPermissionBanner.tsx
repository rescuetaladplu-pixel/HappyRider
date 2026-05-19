import { useEffect, useState } from "react";
import { useRider } from "@/lib/rider-context";

type PermState = "granted" | "denied" | "prompt" | "unsupported" | "unknown";

export function LocationPermissionBanner() {
  const { rider } = useRider();
  const [state, setState] = useState<PermState>("unknown");

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    if (!("geolocation" in navigator)) {
      setState("unsupported");
      return;
    }

    let cancelled = false;
    let status: PermissionStatus | null = null;

    // Probe by actually requesting position — works in Capacitor WebView
    // where the Permissions API often returns "prompt" even after the
    // native permission has been granted.
    const probe = () => {
      navigator.geolocation.getCurrentPosition(
        () => {
          if (!cancelled) setState("granted");
        },
        (err) => {
          if (cancelled) return;
          // PERMISSION_DENIED = 1
          if (err.code === 1) setState("denied");
          else setState("prompt");
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
      );
    };

    if ("permissions" in navigator) {
      const handler = () => {
        if (!status || cancelled) return;
        if (status.state === "granted") setState("granted");
        else probe();
      };
      navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((s) => {
          if (cancelled) return;
          status = s;
          if (s.state === "granted") setState("granted");
          else probe();
          s.addEventListener("change", handler);
        })
        .catch(() => probe());
      return () => {
        cancelled = true;
        if (status) status.removeEventListener("change", handler);
      };
    }

    probe();
    return () => {
      cancelled = true;
    };
  }, [rider?.is_online]);

  if (state === "granted" || state === "unknown") return null;

  const isOnline = rider?.is_online ?? false;
  if (state === "prompt" && !isOnline) return null;

  const msg =
    state === "denied"
      ? "🚫 เบราว์เซอร์บล็อกการเข้าถึงตำแหน่ง — คุณจะไม่ได้รับการแจ้งเตือนงานใหม่ กรุณาเปิดสิทธิ์ Location ในการตั้งค่าเบราว์เซอร์"
      : state === "unsupported"
        ? "⚠️ อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง — จะไม่ได้รับการแจ้งเตือนงานใหม่"
        : "📍 กรุณาอนุญาตการระบุตำแหน่ง ไม่งั้นจะไม่ได้รับการแจ้งเตือนงานใหม่";

  return (
    <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-700 dark:bg-red-950 dark:text-red-100">
      {msg}
    </div>
  );
}
