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
    order.delivery_distance_km != null
      ? order.delivery_distance_km
      : rLat != null && rLng != null && dLat != null && dLng != null
        ? haversineKm(rLat, rLng, dLat, dLng)
        : null;

  return (
    <div className="rounded-lg border bg-card p-4">
      {/* Quick-scan summary: pickup distance | delivery distance | fee */}
      <div className="mb-3 grid grid-cols-3 gap-2 rounded-lg border bg-muted/40 p-2 text-center">
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-muted-foreground">🏍️ ไปรับ</span>
          <span className="text-base font-bold leading-tight">
            {riderToRestaurantKm != null ? formatKm(riderToRestaurantKm) : "—"}
          </span>
        </div>
        <div className="flex flex-col items-center border-x">
          <span className="text-[10px] text-muted-foreground">📦 ไปส่ง</span>
          <span className="text-base font-bold leading-tight">
            {restaurantToCustomerKm != null ? formatKm(restaurantToCustomerKm) : "—"}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-muted-foreground">💰 ค่าส่ง</span>
          <span className="text-base font-bold leading-tight text-green-600">
            ฿{fee.toFixed(0)}
          </span>
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="font-semibold truncate">
            {order.restaurants?.name ?? "ร้านอาหาร"}
          </div>
          {order.status === "awaiting_confirmations" && (
            <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              จองล่วงหน้า
            </span>
          )}
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          📍 {order.restaurants?.address ?? "—"}
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          🏠 {order.delivery_address ?? "—"}
        </div>
        {order.notes && (
          <div className="mt-2 rounded bg-muted/50 p-2 text-xs">
            📝 {order.notes}
          </div>
        )}
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
