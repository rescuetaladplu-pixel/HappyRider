import { useEffect, useState, type ComponentType } from "react";
import { useRider } from "@/lib/rider-context";
import { Button } from "@/components/ui/button";

interface InnerProps {
  lat: number;
  lng: number;
  recenterTrigger: number;
}

export function RiderLocationMap() {
  const { rider } = useRider();
  const [Inner, setInner] = useState<ComponentType<InnerProps> | null>(null);
  const [recenterTrigger, setRecenterTrigger] = useState(0);

  useEffect(() => {
    let cancelled = false;
    import("./RiderLocationMapInner").then((m) => {
      if (!cancelled) setInner(() => m.default);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const isOnline = rider?.is_online ?? false;
  const lat = rider?.current_lat ?? null;
  const lng = rider?.current_lng ?? null;
  const hasFix = lat !== null && lng !== null;

  return (
    <div className="relative mb-4 h-[280px] w-full overflow-hidden rounded-lg border bg-muted/30">
      {!isOnline ? (
        <div className="flex h-full w-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
          🛵 เปิดออนไลน์เพื่อเริ่มติดตามตำแหน่งของคุณบนแผนที่
        </div>
      ) : !hasFix || !Inner ? (
        <div className="flex h-full w-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
          กำลังหาตำแหน่ง...
        </div>
      ) : (
        <>
          <Inner lat={lat} lng={lng} recenterTrigger={recenterTrigger} />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setRecenterTrigger((n) => n + 1)}
            className="absolute right-3 top-3 z-[400] shadow-md"
          >
            📍 ตำแหน่งของฉัน
          </Button>
        </>
      )}
    </div>
  );
}
