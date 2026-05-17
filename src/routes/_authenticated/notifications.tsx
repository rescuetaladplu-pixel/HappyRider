import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "แจ้งเตือน — HappyRider" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 text-center">
      <Bell className="mx-auto h-12 w-12 text-muted-foreground" />
      <h1 className="mt-4 text-2xl font-bold">แจ้งเตือน / ข่าวสาร</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        กำลังพัฒนา — ที่นี่จะแสดงข่าวสารและประกาศจากระบบ
      </p>
    </div>
  );
}
