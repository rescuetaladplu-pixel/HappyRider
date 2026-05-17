import { createFileRoute } from "@tanstack/react-router";
import { History } from "lucide-react";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({ meta: [{ title: "ประวัติงาน — HappyRider" }] }),
  component: HistoryPage,
});

function HistoryPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 text-center">
      <History className="mx-auto h-12 w-12 text-muted-foreground" />
      <h1 className="mt-4 text-2xl font-bold">ประวัติงาน</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        กำลังพัฒนา — ที่นี่จะแสดงงานที่คุณส่งสำเร็จย้อนหลัง
      </p>
    </div>
  );
}
