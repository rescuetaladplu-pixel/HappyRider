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
    if (!("permissions" in navigator)) {
      setState("unknown");
      return;
    }
    let status: PermissionStatus | null = null;
    const handler = () => {
      if (status) setState(status.state as PermState);
    };
    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((s) => {
        status = s;
        setState(s.state as PermState);
        s.addEventListener("change", handler);
      })
      .catch(() => setState("unknown"));
    return () => {
      if (status) status.removeEventListener("change", handler);
    };
  }, []);

  if (state === "granted" || state === "unknown") return null;

  // Only nag when rider is trying to be online, or always show if denied/unsupported
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
