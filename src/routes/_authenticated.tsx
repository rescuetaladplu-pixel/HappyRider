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

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RiderProvider, useRider } from "@/lib/rider-context";
import { OrdersProvider } from "@/lib/orders-context";
import { BottomNav } from "@/components/BottomNav";
import { LoadingScreen } from "@/components/LoadingScreen";
import logo from "@/assets/happyrider-logo.png";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, loading, isRider, roles } = useAuth();
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
    return <LoadingScreen message="กำลังโหลด..." />;
  }

  return (
    <RiderProvider>
      <OrdersProvider>
        <RiderShell />
      </OrdersProvider>
    </RiderProvider>
  );
}

function RiderShell() {
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
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="HappyRider" className="h-8 w-8 object-contain" />
            <span className="font-semibold text-primary">HappyRider</span>
          </Link>

          {rider && isProfileComplete && (
            <div className="flex items-center gap-2">
              <Switch
                id="online-toggle"
                checked={rider.is_online}
                onCheckedChange={() => void toggleOnline()}
                className="h-7 w-[52px] [&>span]:h-6 [&>span]:w-6 [&[data-state=checked]>span]:translate-x-6"
              />
              <Label
                htmlFor="online-toggle"
                className={
                  rider.is_online
                    ? "text-sm font-semibold text-green-600"
                    : "text-sm text-muted-foreground"
                }
              >
                {rider.is_online ? "ออนไลน์" : "ออฟไลน์"}
              </Label>
            </div>
          )}
        </div>
      </header>
      <main className="pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
