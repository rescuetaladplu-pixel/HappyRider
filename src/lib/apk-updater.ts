import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { FileOpener } from "@capacitor-community/file-opener";
import { Browser } from "@capacitor/browser";

export type ApkProgress = { percent: number; bytes: number; total: number };

export async function downloadAndInstallApk(
  url: string,
  onProgress?: (p: ApkProgress) => void,
): Promise<void> {
  const isNative = Capacitor.isNativePlatform();
  const platform = isNative ? Capacitor.getPlatform() : "web";

  if (!isNative || platform !== "android") {
    try {
      await Browser.open({ url });
    } catch {
      window.open(url, "_blank");
    }
    return;
  }

  const hasFilesystem = Capacitor.isPluginAvailable("Filesystem");
  const hasFileOpener = Capacitor.isPluginAvailable("FileOpener");
  if (!hasFilesystem || !hasFileOpener) {
    // APK เก่ายังไม่มี plugin → fallback browser
    try {
      await Browser.open({ url });
    } catch {
      window.open(url, "_blank");
    }
    return;
  }

  const fileName = `happyrider-update-${Date.now()}.apk`;
  let listenerHandle: { remove: () => Promise<void> } | undefined;
  if (onProgress) {
    try {
      listenerHandle = await Filesystem.addListener("progress", (event) => {
        const total = event.contentLength || 0;
        const bytes = event.bytes || 0;
        const percent = total > 0 ? Math.round((bytes / total) * 100) : 0;
        onProgress({ percent, bytes, total });
      });
    } catch {
      /* ignore */
    }
  }

  try {
    const result = await Filesystem.downloadFile({
      url,
      path: fileName,
      directory: Directory.Cache,
      progress: true,
    });
    if (!result.path) throw new Error("ไม่สามารถบันทึกไฟล์ APK ได้");
    await FileOpener.open({
      filePath: result.path,
      contentType: "application/vnd.android.package-archive",
      openWithDefault: true,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes("not implemented") ||
      msg.includes("not available") ||
      msg.includes("UNIMPLEMENTED")
    ) {
      try {
        await Browser.open({ url });
      } catch {
        window.open(url, "_blank");
      }
      return;
    }
    throw err;
  } finally {
    if (listenerHandle) {
      try {
        await listenerHandle.remove();
      } catch {
        /* ignore */
      }
    }
  }
}
