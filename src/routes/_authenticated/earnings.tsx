import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";

export const Route = createFileRoute("/_authenticated/earnings")({
  head: () => ({ meta: [{ title: "รายได้ — HappyRider" }] }),
  component: EarningsPage,
});

function EarningsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 text-center">
      <Wallet className="mx-auto h-12 w-12 text-muted-foreground" />
      <h1 className="mt-4 text-2xl font-bold">รายได้</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        กำลังพัฒนา — ที่นี่จะสรุปรายได้รายวัน/สัปดาห์/เดือน
      </p>
    </div>
  );
}
