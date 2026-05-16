import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useRider } from "@/lib/rider-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "โปรไฟล์ — HappyRider" }] }),
  component: ProfilePage,
});

type VehicleType = "motorcycle" | "bicycle" | "car";

function ProfilePage() {
  const { user } = useAuth();
  const { profile, rider, loading, refresh, isProfileComplete } = useRider();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType | "">("");
  const [licensePlate, setLicensePlate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name ?? "");
      setLastName(profile.last_name ?? "");
      setPhone(profile.phone ?? "");
    }
    if (rider) {
      setVehicleType((rider.vehicle_type as VehicleType) || "");
      setLicensePlate(rider.license_plate ?? "");
    }
  }, [profile, rider]);

  const phoneOk = /^\d{10}$/.test(phone);
  const plateRequired = vehicleType !== "" && vehicleType !== "bicycle";

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
    if (!vehicleType) {
      toast.error("กรุณาเลือกประเภทยานพาหนะ");
      return;
    }
    if (plateRequired && !licensePlate.trim()) {
      toast.error("กรุณากรอกเลขทะเบียน");
      return;
    }

    setSaving(true);
    const [{ error: pErr }, { error: rErr }] = await Promise.all([
      supabase.from("profiles").upsert({
        id: user.id,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
      }),
      supabase
        .from("riders")
        .update({
          vehicle_type: vehicleType,
          license_plate: plateRequired ? licensePlate.trim() : null,
        })
        .eq("id", user.id),
    ]);
    setSaving(false);

    if (pErr || rErr) {
      toast.error(
        "บันทึกไม่สำเร็จ: " + (pErr?.message ?? rErr?.message ?? ""),
      );
      return;
    }
    toast.success("บันทึกโปรไฟล์เรียบร้อย");
    await refresh();
    if (!isProfileComplete) {
      // first time → go to home
      navigate({ to: "/" });
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 text-muted-foreground">
        กำลังโหลด...
      </div>
    );
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

        <Card>
          <CardHeader>
            <CardTitle>ยานพาหนะ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>ประเภท</Label>
              <Select
                value={vehicleType}
                onValueChange={(v) => setVehicleType(v as VehicleType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกประเภทยานพาหนะ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="motorcycle">มอเตอร์ไซค์</SelectItem>
                  <SelectItem value="car">รถยนต์</SelectItem>
                  <SelectItem value="bicycle">จักรยาน</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {plateRequired && (
              <div className="space-y-2">
                <Label htmlFor="license_plate">เลขทะเบียน</Label>
                <Input
                  id="license_plate"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  required
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Button type="submit" disabled={saving} className="w-full">
          {saving ? "กำลังบันทึก..." : "บันทึก"}
        </Button>
      </form>
    </div>
  );
}
