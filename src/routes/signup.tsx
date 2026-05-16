import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Signup — HappyRider" }] }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("รหัสผ่านไม่ตรงกัน");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: {
          full_name: `${firstName} ${lastName}`,
          phone,
          role: "rider",
        },
      },
    });

    if (error) {
      setLoading(false);
      const msg = error.message.toLowerCase();
      let thai = error.message;
      if (msg.includes("weak") || msg.includes("password")) {
        if (msg.includes("at least") || msg.includes("6") || msg.includes("short")) {
          thai = "รหัสผ่านสั้นเกินไป (อย่างน้อย 6 ตัวอักษร)";
        } else {
          thai = "รหัสผ่านไม่ปลอดภัย กรุณาใช้รหัสที่ซับซ้อนกว่านี้ (ผสมตัวอักษร ตัวเลข และสัญลักษณ์)";
        }
      } else if (msg.includes("already registered") || msg.includes("already exists") || msg.includes("user already")) {
        thai = "อีเมลนี้ถูกใช้สมัครไปแล้ว";
      } else if (msg.includes("invalid email")) {
        thai = "รูปแบบอีเมลไม่ถูกต้อง";
      } else if (msg.includes("rate limit")) {
        thai = "ลองสมัครบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่";
      }
      toast.error(thai);
      return;
    }

    const userId = data.user?.id;

    // Insert rider row (RLS: Riders insert own — auth.uid() = id)
    // If there is no active session (email confirm required), this will fail RLS.
    // In that case the rider row is created on first login via _authenticated guard fallback.
    if (data.session && userId) {
      const { error: riderError } = await supabase.from("riders").insert({
        id: userId,
      });
      if (riderError && !riderError.message.includes("duplicate")) {
        console.warn("riders insert failed:", riderError.message);
      }
    }

    setLoading(false);
    toast.success(
      "สมัครสำเร็จ! กรุณาเช็คอีเมลเพื่อยืนยันบัญชีก่อนเข้าสู่ระบบ",
      { duration: 6000 },
    );
    navigate({ to: "/login" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>สมัครเป็น Rider</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <Label htmlFor="phone">เบอร์โทร</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                autoComplete="tel"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">อีเมล</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password">ยืนยันรหัสผ่าน</Label>
              <Input
                id="confirm_password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "กำลังสมัคร..." : "สมัคร"}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              มีบัญชีแล้ว?{" "}
              <Link to="/login" className="underline">
                เข้าสู่ระบบ
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
