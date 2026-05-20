import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Settings, ChevronRight, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useRider } from "@/lib/rider-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "โปรไฟล์ — HappyRider" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const { profile, loading, refresh, isProfileComplete } = useRider();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name ?? "");
      setLastName(profile.last_name ?? "");
      setPhone(profile.phone ?? "");
    }
  }, [profile]);

  const phoneOk = /^\d{10}$/.test(phone);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!firstName.trim() || !lastName.trim()) {
      toast.error("กรุณากรอกชื่อและนามสกุล");
      return;
    }
    if (!phoneOk) {
      toast.error("เบอร์โทรต้องเป็นตัวเลข 10 หลัก");
      return;
    }

    setSaving(true);
    const { error: pErr } = await supabase.from("profiles").upsert({
      id: user.id,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone: phone.trim(),
    });
    setSaving(false);

    if (pErr) {
      console.error("[profile] save error:", pErr.message);
      toast.error("บันทึกไม่สำเร็จ — กรุณาลองใหม่");
      return;
    }
    toast.success("บันทึกโปรไฟล์เรียบร้อย");
    await refresh();
    if (!isProfileComplete) {
      navigate({ to: "/" });
    }
  };

  if (loading) {
    return <LoadingScreen message="กำลังโหลดโปรไฟล์..." />;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">โปรไฟล์ Rider</h1>
      {!isProfileComplete && (
        <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          กรุณากรอกข้อมูลให้ครบก่อนเริ่มใช้งานแอป
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>ข้อมูลส่วนตัว</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="first_name">ชื่อ</Label>
                <Input
                  id="first_name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">นามสกุล</Label>
                <Input
                  id="last_name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">เบอร์โทร (10 หลัก)</Label>
              <Input
                id="phone"
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                }
                placeholder="0812345678"
                required
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={saving} className="w-full">
          {saving ? "กำลังบันทึก..." : "บันทึก"}
        </Button>
      </form>

      <div className="mt-6">
        <Link
          to="/settings"
          className="flex w-full items-center justify-between rounded-lg border bg-background px-4 py-4 transition-colors hover:bg-muted"
        >
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-base font-medium">ตั้งค่า</div>
              <div className="text-xs text-muted-foreground">
                เสียงแจ้งเตือน · ธีม · เวอร์ชันแอป
              </div>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Link>
      </div>

      <div className="mt-6 border-t pt-6">
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          onClick={async () => {
            await supabase.auth.signOut();
            navigate({ to: "/login" });
          }}
        >
          <LogOut className="h-4 w-4" />
          ออกจากระบบ
        </Button>
        {user?.email && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            เข้าสู่ระบบในชื่อ {user.email}
          </p>
        )}
      </div>
    </div>
  );
}
