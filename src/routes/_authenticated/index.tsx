import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({ meta: [{ title: "Dashboard — HappyRider" }] }),
  component: RiderDashboard,
});

function RiderDashboard() {
  const { user } = useAuth();
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold">ยินดีต้อนรับ Rider</h1>
      <p className="mt-2 text-muted-foreground">
        ล็อกอินสำเร็จในชื่อ {user?.email}
      </p>
      <p className="mt-4 text-sm text-muted-foreground">
        Phase 1 (Auth) เสร็จแล้ว — Phase 2 (Profile/Vehicle), Phase 3
        (Order pool) จะมาเร็วๆ นี้
      </p>
    </div>
  );
}
