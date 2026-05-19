import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

export type ProgressCb = (percent: number) => void;

/**
 * Download APK to cache and open Android installer.
 * Falls back to opening the URL in the system browser when:
 *  - not on a native platform
 *  - Filesystem / FileOpener plugins are unavailable
 *  - any "not implemented" style error is thrown
 */
export async function downloadAndInstallApk(
  url: string,
  onProgress?: ProgressCb,
): Promise<void> {
  const fallback = async () => {
    try {
      await Browser.open({ url });
    } catch {
      window.open(url, '_blank');
    }
  };

  if (!Capacitor.isNativePlatform()) {
    return fallback();
  }

  const hasFs = Capacitor.isPluginAvailable('Filesystem');
  const hasOpener = Capacitor.isPluginAvailable('FileOpener');
  if (!hasFs || !hasOpener) {
    return fallback();
  }

  try {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const { FileOpener } = await import('@capacitor-community/file-opener');

    const fileName = `HappyRider_${Date.now()}.apk`;

    const progressListener = await Filesystem.addListener(
      'progress',
      (event: { bytes: number; contentLength: number }) => {
        if (event.contentLength > 0 && onProgress) {
          const pct = Math.round((event.bytes / event.contentLength) * 100);
          onProgress(Math.min(99, pct));
        }
      },
    );

    try {
      const result = await Filesystem.downloadFile({
        url,
        path: fileName,
        directory: Directory.Cache,
        progress: true,
      });

      onProgress?.(100);

      const filePath = (result as { path?: string }).path;
      if (!filePath) throw new Error('Download did not return a file path');

      await FileOpener.open({
        filePath,
        contentType: 'application/vnd.android.package-archive',
      });
    } finally {
      await progressListener.remove();
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/not implemented|UNIMPLEMENTED/i.test(msg)) {
      return fallback();
    }
    throw err;
  }
}
