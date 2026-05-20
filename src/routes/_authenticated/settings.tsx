import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, Play, Sun, Moon, Monitor, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  isNotificationSoundEnabled,
  setNotificationSoundEnabled,
  getNotificationPreset,
  setNotificationPreset,
  playBeep,
  SOUND_PRESETS,
  type SoundPresetId,
} from "@/lib/notification-sound";
import { useTheme, type ThemeMode } from "@/lib/theme-context";
import { AppVersionCard } from "@/components/AppVersionCard";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "ตั้งค่า — HappyRider" }] }),
  component: SettingsPage,
});

function ThemeCard() {
  const { theme, setTheme } = useTheme();
  const options: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "กลางวัน", icon: Sun },
    { value: "dark", label: "กลางคืน", icon: Moon },
    { value: "system", label: "ตามระบบ", icon: Monitor },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>การแสดงผลหน้าจอ</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2">
          {options.map((o) => {
            const Icon = o.icon;
            const active = theme === o.value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => setTheme(o.value)}
                className={
                  "flex flex-col items-center justify-center gap-1 rounded-md border px-3 py-3 text-sm transition-colors " +
                  (active
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-muted")
                }
              >
                <Icon className="h-5 w-5" />
                <span>{o.label}</span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function NotificationSoundCard() {
  const [soundOn, setSoundOn] = useState(true);
  const [preset, setPreset] = useState<SoundPresetId>("siren");

  useEffect(() => {
    setSoundOn(isNotificationSoundEnabled());
    setPreset(getNotificationPreset());
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>เสียงแจ้งเตือน</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Volume2 className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div>
              <Label htmlFor="sound-toggle" className="text-base">
                เปิดเสียงแจ้งเตือนงานใหม่
              </Label>
              <p className="text-xs text-muted-foreground">
                ส่งเสียงเมื่อมีงานใหม่เข้ามา
              </p>
            </div>
          </div>
          <Switch
            id="sound-toggle"
            checked={soundOn}
            onCheckedChange={(v) => {
              setSoundOn(v);
              setNotificationSoundEnabled(v);
              if (v) playBeep();
            }}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">เลือกเสียง</Label>
          <p className="text-xs text-muted-foreground">
            แตะเพื่อเลือก กดปุ่มเล่นเพื่อฟังตัวอย่าง
          </p>
          <div className="space-y-2">
            {SOUND_PRESETS.map((p) => {
              const active = preset === p.id;
              return (
                <div
                  key={p.id}
                  className={
                    "flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors " +
                    (active
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background")
                  }
                >
                  <button
                    type="button"
                    onClick={() => {
                      setPreset(p.id);
                      setNotificationPreset(p.id);
                      playBeep(p.id);
                    }}
                    className="flex-1 text-left"
                  >
                    <div className="text-sm font-medium">{p.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.description}
                    </div>
                  </button>
                  <button
                    type="button"
                    aria-label={`ฟัง ${p.label}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      playBeep(p.id);
                    }}
                    className="ml-2 flex h-9 w-9 items-center justify-center rounded-full border bg-background text-primary hover:bg-muted"
                  >
                    <Play className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Link
          to="/profile"
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
          aria-label="ย้อนกลับ"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold">ตั้งค่า</h1>
      </div>

      <div className="space-y-6">
        <NotificationSoundCard />
        <ThemeCard />
        <AppVersionCard />
      </div>

      <div className="mt-8">
        <Button asChild variant="outline" className="w-full">
          <Link to="/profile">กลับไปหน้าโปรไฟล์</Link>
        </Button>
      </div>
    </div>
  );
}
