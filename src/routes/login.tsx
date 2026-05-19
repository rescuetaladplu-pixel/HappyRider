import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import logo from "@/assets/happyrider-logo.png";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login — HappyRider" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("เข้าสู่ระบบสำเร็จ");
    navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      <img src={logo} alt="HappyRider" className="mb-4 h-28 w-28 object-contain" />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center text-primary">เข้าสู่ระบบ Rider</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <Label htmlFor="password">รหัสผ่าน</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </Button>
            {/* TODO: Google OAuth — เปิด Google provider ใน Supabase + ใช้ Lovable broker หลัง enable Cloud */}
            <Button type="button" variant="outline" className="w-full" disabled>
              เข้าสู่ระบบด้วย Google (เร็วๆ นี้)
            </Button>
            <div className="text-center text-sm text-muted-foreground space-y-1">
              <div>
                <Link to="/forgot-password" className="underline">
                  ลืมรหัสผ่าน?
                </Link>
              </div>
              <div>
                ยังไม่มีบัญชี?{" "}
                <Link to="/signup" className="underline">
                  สมัครเป็น Rider
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

