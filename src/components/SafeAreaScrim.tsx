/**
 * Fixed background bars covering the device safe areas (status bar / nav bar).
 * Sits above page content (z-40) but below modals/toasts (z-50+),
 * so scroll content never bleeds under the system bars.
 */
export function SafeAreaScrim() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-40 bg-background"
        style={{ height: "var(--app-safe-top)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 bg-background"
        style={{ height: "var(--app-safe-bottom)" }}
      />
    </>
  );
}
