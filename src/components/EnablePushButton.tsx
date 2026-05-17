import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, BellRing } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { requestFcmToken, onForegroundMessage } from "@/lib/firebase-client";
import { registerFcmToken } from "@/lib/fcm.functions";

interface Props {
  restaurantId?: string | null;
}

export function EnablePushButton({ restaurantId = null }: Props) {
  const [status, setStatus] = useState<"idle" | "granted" | "denied" | "busy">("idle");
  const register = useServerFn(registerFcmToken);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    if (Notification.permission === "granted") {
      setStatus("granted");
      // Silently re-register token on every load (no user gesture needed when already granted)
      (async () => {
        try {
          const token = await requestFcmToken();
          if (!token) return;
          await register({
            data: {
              token,
              restaurantId: restaurantId ?? null,
              userAgent: navigator.userAgent.slice(0, 500),
            },
          });
        } catch {
          // silent — token refresh failure shouldn't bother user
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status !== "granted") return;
    let unsub: (() => void) | undefined;
    (async () => {
      const off = await onForegroundMessage(({ title, body }) => {
        toast.success(title || "แจ้งเตือน", { description: body });
      });
      unsub = typeof off === "function" ? off : undefined;
    })();
    return () => unsub?.();
  }, [status]);

  async function enable() {
    setStatus("busy");
    try {
      const token = await requestFcmToken();
      if (!token) {
        setStatus("denied");
        toast.error("ไม่ได้รับสิทธิ์แจ้งเตือน — กรุณาเปิดในตั้งค่าเบราว์เซอร์");
        return;
      }
      await register({
        data: {
          token,
          restaurantId: restaurantId ?? null,
          userAgent: navigator.userAgent.slice(0, 500),
        },
      });
      setStatus("granted");
      toast.success("เปิดการแจ้งเตือนสำเร็จ!");
    } catch (e) {
      setStatus("idle");
      toast.error(e instanceof Error ? e.message : "เปิดไม่สำเร็จ");
    }
  }

  if (status === "granted") {
    return (
      <div className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-medium text-primary">
        <BellRing className="h-5 w-5" />
        เปิดแจ้งเตือนแล้ว — พร้อมรับงาน
      </div>
    );
  }
  if (status === "denied") {
    return (
      <div className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-destructive/50 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
        <BellOff className="h-5 w-5" />
        แจ้งเตือนถูกบล็อก — เปิดในตั้งค่าเบราว์เซอร์
      </div>
    );
  }
  return (
    <Button
      onClick={enable}
      disabled={status === "busy"}
      className="h-auto w-full gap-2 py-3 text-base font-semibold shadow-md"
    >
      <Bell className="h-5 w-5" />
      {status === "busy" ? "กำลังเปิด..." : "🔔 เปิดแจ้งเตือน Push เพื่อรับงานใหม่"}
    </Button>
  );
}
