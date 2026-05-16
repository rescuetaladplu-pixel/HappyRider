import {
  createFileRoute,
  Outlet,
  useNavigate,
  Link,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

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
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="font-semibold">
            HappyRider
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">{user.email}</span>
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
      <main>
        <Outlet />
      </main>
    </div>
  );
}
