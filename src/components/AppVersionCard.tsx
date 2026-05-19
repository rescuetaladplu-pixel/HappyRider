import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { supabase } from '@/integrations/supabase/client';
import { APP_VERSION, compareVersions } from '@/lib/app-version';
import { downloadAndInstallApk } from '@/lib/apk-updater';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Download, RefreshCw, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

type AppConfig = {
  latest_version: string;
  apk_download_url: string | null;
  release_notes: string | null;
};

export function AppVersionCard() {
  const [currentVersion, setCurrentVersion] = useState(APP_VERSION);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  const loadCurrent = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const info = await CapApp.getInfo();
        setCurrentVersion(info.version || APP_VERSION);
      } catch {
        /* ignore */
      }
    }
  };

  const check = async () => {
    setChecking(true);
    try {
      await loadCurrent();
      const { data, error } = await supabase
        .from('app_config')
        .select('latest_version, apk_download_url, release_notes')
        .eq('platform', 'android_rider')
        .maybeSingle();
      if (error) throw error;
      setConfig(data);
    } catch (e) {
      toast.error('ตรวจสอบเวอร์ชันไม่สำเร็จ');
      console.error(e);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    void check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasUpdate =
    config && compareVersions(currentVersion, config.latest_version) < 0;

  const handleDownload = async () => {
    if (!config?.apk_download_url) return;
    setDownloading(true);
    setProgress(0);
    try {
      await downloadAndInstallApk(config.apk_download_url, setProgress);
      toast.success('ดาวน์โหลดเสร็จ — ติดตั้งได้เลย');
    } catch (e) {
      console.error(e);
      toast.error('ดาวน์โหลดไม่สำเร็จ');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>เวอร์ชันแอป</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between rounded-lg bg-muted p-3">
          <span className="text-muted-foreground">เวอร์ชันของคุณ</span>
          <span className="font-mono font-semibold">{currentVersion}</span>
        </div>

        {config && (
          <div className="flex items-center justify-between rounded-lg bg-primary/10 p-3">
            <span className="text-muted-foreground">เวอร์ชันล่าสุด</span>
            <span className="font-mono font-semibold text-primary">
              {config.latest_version}
            </span>
          </div>
        )}

        {config && !hasUpdate && (
          <div className="flex items-center gap-2 rounded-lg border border-border p-3 text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            คุณใช้เวอร์ชันล่าสุดอยู่แล้ว
          </div>
        )}

        {hasUpdate && config?.release_notes && (
          <div className="rounded-lg border border-border p-3">
            <p className="mb-1 text-xs font-semibold text-muted-foreground">
              มีอะไรใหม่
            </p>
            <p className="whitespace-pre-line">{config.release_notes}</p>
          </div>
        )}

        {downloading && (
          <div className="space-y-1">
            <Progress value={progress} />
            <p className="text-right text-xs text-muted-foreground">
              {progress}%
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={check}
            disabled={checking || downloading}
            className="gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`}
            />
            ตรวจสอบ
          </Button>
          {hasUpdate && (
            <Button
              onClick={handleDownload}
              disabled={!config?.apk_download_url || downloading}
              className="flex-1 gap-2"
            >
              <Download className="h-4 w-4" />
              {downloading ? 'กำลังดาวน์โหลด...' : 'ดาวน์โหลดอัปเดต'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
