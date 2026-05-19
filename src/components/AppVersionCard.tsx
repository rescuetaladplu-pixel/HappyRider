import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { supabase } from "@/integrations/supabase/client";
import { APP_VERSION, compareVersions } from "@/lib/app-version";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Smartphone, Download, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { downloadAndInstallApk } from "@/lib/apk-updater";

export function AppVersionCard() {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentVersion, setCurrentVersion] = useState<string>(APP_VERSION);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [apkUrl, setApkUrl] = useState<string | null>(null);
  const [releaseNotes, setReleaseNotes] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const isNative = Capacitor.isNativePlatform();

  async function loadVersion() {
    setChecking(true);
    try {
      if (isNative) {
        try {
          const info = await CapApp.getInfo();
          setCurrentVersion(info.version || APP_VERSION);
        } catch {
          /* ignore */
        }
      }
      // ⚠️ ฝั่งไรเดอร์ใช้ platform = "android_rider"
      const { data } = await supabase
        .from("app_config")
        .select("latest_version, apk_download_url, release_notes")
        .eq("platform", "android_rider")
        .maybeSingle();
      if (data) {
        setLatestVersion(data.latest_version);
        setApkUrl(data.apk_download_url);
        setReleaseNotes(data.release_notes);
      }
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    void loadVersion();
  }, []);

  const hasUpdate = latestVersion
    ? compareVersions(currentVersion, latestVersion) < 0
    : false;

  async function handleDownload() {
    if (!apkUrl) return;
    setDownloading(true);
    setProgress(0);
    try {
      await downloadAndInstallApk(apkUrl, ({ percent }) => setProgress(percent));
      if (
        Capacitor.isNativePlatform() &&
        Capacitor.getPlatform() === "android"
      ) {
        toast.success("โหลดเสร็จแล้ว กดติดตั้งเพื่ออัปเดต");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ดาวน์โหลดไม่สำเร็จ");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Card className="space-y-4 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Smartphone className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">เวอร์ชันแอป</h3>
          <p className="text-sm text-muted-foreground">
            ปัจจุบัน {currentVersion}
            {latestVersion && <> · ล่าสุด {latestVersion}</>}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void loadVersion();
            toast.success("ตรวจสอบเรียบร้อย");
          }}
          disabled={checking}
        >
          {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : "ตรวจสอบ"}
        </Button>
      </div>

      {hasUpdate ? (
        <>
          {releaseNotes && (
            <div className="rounded-lg border border-border p-3">
              <p className="mb-1 text-xs font-semibold text-muted-foreground">
                มีอะไรใหม่
              </p>
              <p className="whitespace-pre-line text-sm">{releaseNotes}</p>
            </div>
          )}
          {downloading && (
            <div className="space-y-1">
              <Progress value={progress} />
              <p className="text-right text-xs text-muted-foreground">
                กำลังดาวน์โหลด {progress}%
              </p>
            </div>
          )}
          <Button
            onClick={handleDownload}
            disabled={!apkUrl || downloading}
            className="w-full gap-2"
          >
            {downloading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                กำลังโหลด...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                ดาวน์โหลดเวอร์ชันใหม่ ({latestVersion})
              </>
            )}
          </Button>
          {!isNative && (
            <p className="text-center text-xs text-muted-foreground">
              เปิดลิงก์บนมือถือ Android เพื่อติดตั้ง APK
            </p>
          )}
        </>
      ) : (
        latestVersion && (
          <div className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            คุณใช้เวอร์ชันล่าสุดอยู่แล้ว
          </div>
        )
      )}
    </Card>
  );
}
