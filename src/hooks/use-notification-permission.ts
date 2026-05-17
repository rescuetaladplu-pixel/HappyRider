import { useEffect, useState } from "react";

export type NotificationPermissionState =
  | "default"
  | "granted"
  | "denied"
  | "unsupported";

/**
 * Reactive browser Notification.permission.
 * Re-checks on:
 *  - mount
 *  - tab visibility change (user toggled in browser settings then returned)
 *  - window focus
 *  - Permissions API change event (where supported)
 */
export function useNotificationPermission(): NotificationPermissionState {
  const [perm, setPerm] = useState<NotificationPermissionState>(() => {
    if (typeof window === "undefined" || !("Notification" in window))
      return "unsupported";
    return Notification.permission as NotificationPermissionState;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    const read = () =>
      setPerm(Notification.permission as NotificationPermissionState);

    read();

    const onVis = () => {
      if (document.visibilityState === "visible") read();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", read);

    let permStatus: PermissionStatus | undefined;
    const onChange = () => read();
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "notifications" as PermissionName })
        .then((status) => {
          permStatus = status;
          status.addEventListener("change", onChange);
        })
        .catch(() => {
          /* not supported — fallback to visibility/focus only */
        });
    }

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", read);
      permStatus?.removeEventListener("change", onChange);
    };
  }, []);

  return perm;
}
