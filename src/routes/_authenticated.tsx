import {
  createFileRoute,
  Outlet,
  useNavigate,
  useLocation,
  Link,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RiderProvider, useRider } from "@/lib/rider-context";
import { OrdersProvider } from "@/lib/orders-context";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, loading, isRider, roles, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (roles.length > 0 && !isRider) {
      toast.error("บัญชีนี้ไม่ใช่ rider");
      supabase.auth.signOut().then(() => navigate({ to: "/login" }));
      return;
    }
    if (isRider) {
      supabase
        .from("riders")
        .upsert({ id: user.id }, { onConflict: "id", ignoreDuplicates: true })
        .then(({ error }) => {
          if (error && !error.message.toLowerCase().includes("duplicate")) {
            console.warn("riders upsert failed:", error.message);
          }
        });
    }
  }, [user, loading, isRider, roles, navigate]);

  if (loading || !user || !isRider) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        กำลังโหลด...
      </div>
    );
  }

  return (
    <RiderProvider>
      <OrdersProvider>
        <RiderShell signOut={signOut} email={user.email ?? ""} />
      </OrdersProvider>
    </RiderProvider>
  );
}

function RiderShell({
  signOut,
  email,
}: {
  signOut: () => Promise<void>;
  email: string;
}) {
  const { rider, isProfileComplete, loading, toggleOnline } = useRider();
  const navigate = useNavigate();
  const location = useLocation();

  // Force profile completion before using the app
  useEffect(() => {
    if (loading) return;
    if (!isProfileComplete && location.pathname !== "/profile") {
      toast("กรุณากรอกโปรไฟล์ให้ครบก่อนใช้งาน");
      navigate({ to: "/profile" });
    }
  }, [loading, isProfileComplete, location.pathname, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="font-semibold">
            HappyRider
          </Link>

          <div className="flex items-center gap-4 text-sm">
            {rider && isProfileComplete && (
              <div className="flex items-center gap-2">
                <Switch
                  id="online-toggle"
                  checked={rider.is_online}
                  onCheckedChange={() => void toggleOnline()}
                />
                <Label
                  htmlFor="online-toggle"
                  className={
                    rider.is_online
                      ? "font-medium text-green-600"
                      : "text-muted-foreground"
                  }
                >
                  {rider.is_online ? "ออนไลน์" : "ออฟไลน์"}
                </Label>
              </div>
            )}
            <span className="hidden text-muted-foreground sm:inline">
              {email}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await signOut();
                navigate({ to: "/login" });
              }}
            >
              ออกจากระบบ
            </Button>
          </div>
        </div>
      </header>
      <main className="pb-28">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
