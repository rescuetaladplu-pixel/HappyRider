import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { requestFcmToken } from "@/lib/firebase-client";
import { registerFcmToken } from "@/lib/fcm.functions";

export function EnablePushBanner() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const register = useServerFn(registerFcmToken);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    // Show banner whenever permission is not yet decided.
    // (granted/denied → don't show. Auto silent-register handled by EnablePushButton.)
    if (Notification.permission === "default") setVisible(true);
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const token = await requestFcmToken();
      if (!token) {
        toast.error("ไม่ได้รับสิทธิ์แจ้งเตือน — กรุณาเปิดในตั้งค่าเบราว์เซอร์");
        setVisible(false);
        return;
      }
      await register({
        data: {
          token,
          restaurantId: null,
          userAgent: navigator.userAgent.slice(0, 500),
        },
      });
      toast.success("เปิดการแจ้งเตือนสำเร็จ! พร้อมรับงานใหม่ทุกเมื่อ");
      setVisible(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "เปิดไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  if (!visible || dismissed) return null;

  return (
    <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold">เปิดการแจ้งเตือนเพื่อรับงานใหม่</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            ระบบจะแจ้งเตือนเมื่อมีงานใกล้คุณ แม้ปิดหน้าจอหรือใช้แอปอื่นอยู่
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={enable} disabled={busy} className="gap-2">
              <Bell className="h-4 w-4" />
              {busy ? "กำลังเปิด..." : "เปิดแจ้งเตือนตอนนี้"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
              ไว้ทีหลัง
            </Button>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground"
          aria-label="ปิด"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
