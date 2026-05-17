import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useOrders, type OrderRow } from "@/lib/orders-context";
import { useRider } from "@/lib/rider-context";

export function PoolList({ onClaimed }: { onClaimed?: () => void }) {
  const { pool } = useOrders();
  const { rider } = useRider();

  if (!rider?.is_online) {
    return (
      <div className="rounded-lg border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        คุณกำลังออฟไลน์ — เปิดออนไลน์ที่ด้านบนเพื่อเริ่มดูงาน
      </div>
    );
  }

  if (pool.length === 0) {
    return (
      <div className="rounded-lg border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        ยังไม่มีงานในตอนนี้ — ระบบจะแจ้งเตือนเมื่อมีงานใหม่
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {pool.map((order) => (
        <PoolCard key={order.id} order={order} onClaimed={onClaimed} />
      ))}
    </div>
  );
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function formatKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} ม.`;
  return `${km.toFixed(1)} กม.`;
}

function PoolCard({
  order,
  onClaimed,
}: {
  order: OrderRow;
  onClaimed?: () => void;
}) {
  const { claim } = useOrders();
  const { rider } = useRider();
  const [busy, setBusy] = useState(false);

  const handleClaim = async () => {
    setBusy(true);
    const r = await claim(order.id);
    setBusy(false);
    if (r.ok) onClaimed?.();
  };

  const fee = order.delivery_fee ?? 0;

  const rLat = order.restaurants?.latitude;
  const rLng = order.restaurants?.longitude;
  const dLat = order.delivery_lat;
  const dLng = order.delivery_lng;
  const riderLat = rider?.current_lat;
  const riderLng = rider?.current_lng;

  const riderToRestaurantKm =
    riderLat != null && riderLng != null && rLat != null && rLng != null
      ? haversineKm(riderLat, riderLng, rLat, rLng)
      : null;
  const restaurantToCustomerKm =
    rLat != null && rLng != null && dLat != null && dLng != null
      ? haversineKm(rLat, rLng, dLat, dLng)
      : null;

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-semibold">
            {order.restaurants?.name ?? "ร้านอาหาร"}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            📍 {order.restaurants?.address ?? "—"}
            {riderToRestaurantKm != null && (
              <span className="ml-2 text-xs text-foreground">
                ไปร้านอาหาร - {formatKm(riderToRestaurantKm)}
              </span>
            )}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            🏠 {order.delivery_address ?? "—"}
            {restaurantToCustomerKm != null && (
              <span className="ml-2 text-xs text-foreground">
                ไปส่งลูกค้า - {formatKm(restaurantToCustomerKm)}
              </span>
            )}
          </div>
          {order.notes && (
            <div className="mt-2 rounded bg-muted/50 p-2 text-xs">
              📝 {order.notes}
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">ค่าส่ง</div>
          <div className="text-lg font-bold text-green-600">
            ฿{fee.toFixed(0)}
          </div>
        </div>
      </div>
      <Button
        className="mt-3 w-full"
        onClick={handleClaim}
        disabled={busy}
      >
        {busy ? "กำลังรับงาน..." : "รับงาน"}
      </Button>
    </div>
  );
}
