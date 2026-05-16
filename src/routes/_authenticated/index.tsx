import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useRider } from "@/lib/rider-context";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({ meta: [{ title: "Dashboard — HappyRider" }] }),
  component: RiderDashboard,
});

function RiderDashboard() {
  const { user } = useAuth();
  const { rider, profile } = useRider();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {rider && !rider.is_approved && (
        <div className="mb-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
          ⏳ บัญชีของคุณรอแอดมินอนุมัติ — สามารถทดสอบกดออนไลน์ได้ แต่ยังไม่สามารถรับงานจริงได้
        </div>
      )}

      <h1 className="text-2xl font-bold">
        ยินดีต้อนรับ
        {profile?.first_name ? ` คุณ${profile.first_name}` : " Rider"}
      </h1>
      <p className="mt-2 text-muted-foreground">ล็อกอินสำเร็จในชื่อ {user?.email}</p>

      <div className="mt-6 rounded-lg border bg-card p-4 text-sm">
        <div className="font-medium">สถานะปัจจุบัน</div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-muted-foreground">
          <div>ยานพาหนะ: {rider?.vehicle_type ?? "—"}</div>
          <div>ทะเบียน: {rider?.license_plate ?? "—"}</div>
          <div>
            สถานะ:{" "}
            <span
              className={
                rider?.is_online ? "font-medium text-green-600" : ""
              }
            >
              {rider?.is_online ? "ออนไลน์" : "ออฟไลน์"}
            </span>
          </div>
          <div>อนุมัติแล้ว: {rider?.is_approved ? "✅" : "⏳"}</div>
          {rider?.is_online && rider.current_lat !== null && (
            <div className="col-span-2 text-xs">
              พิกัด: {rider.current_lat?.toFixed(5)},{" "}
              {rider.current_lng?.toFixed(5)}
            </div>
          )}
        </div>
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        Phase 2 (Profile + Online toggle) เสร็จแล้ว — Phase 3 (Order pool) จะมาเร็วๆ นี้
      </p>
    </div>
  );
}
