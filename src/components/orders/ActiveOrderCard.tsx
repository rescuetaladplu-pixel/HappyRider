import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useOrders, type OrderRow } from "@/lib/orders-context";

function mapsLink(lat: number | null, lng: number | null, fallback?: string | null) {
  if (lat != null && lng != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }
  if (fallback) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fallback)}`;
  }
  return null;
}

export function ActiveOrderCard({ order }: { order: OrderRow }) {
  const { advance } = useOrders();
  const [busy, setBusy] = useState(false);

  const restoLink = mapsLink(
    order.restaurants?.latitude ?? null,
    order.restaurants?.longitude ?? null,
    order.restaurants?.address ?? null,
  );
  const dropLink = mapsLink(order.delivery_lat, order.delivery_lng, order.delivery_address);

  const fee = order.delivery_fee ?? 0;

  const handleNext = async () => {
    setBusy(true);
    if (order.status === "picked_up") {
      await advance(order.id, "picked_up", "delivering");
    } else if (order.status === "delivering") {
      await advance(order.id, "delivering", "delivered");
    }
    setBusy(false);
  };

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="font-semibold">{order.restaurants?.name ?? "ร้านอาหาร"}</div>
        <StatusBadge status={order.status} />
      </div>

      <div className="mt-3 space-y-3 text-sm">
        <div>
          <div className="text-muted-foreground">📍 ร้าน</div>
          <div>{order.restaurants?.address ?? "—"}</div>
          <div className="mt-1 flex gap-2">
            {order.restaurants?.phone && (
              <a
                href={`tel:${order.restaurants.phone}`}
                className="text-primary underline"
              >
                โทรร้าน
              </a>
            )}
            {restoLink && (
              <a
                href={restoLink}
                target="_blank"
                rel="noreferrer"
                className="text-primary underline"
              >
                นำทางไปร้าน
              </a>
            )}
          </div>
        </div>

        <div>
          <div className="text-muted-foreground">🏠 ลูกค้า</div>
          <div>{order.delivery_address ?? "—"}</div>
          {dropLink && (
            <a
              href={dropLink}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-primary underline"
            >
              นำทางไปลูกค้า
            </a>
          )}
        </div>

        {order.notes && (
          <div className="rounded bg-muted/50 p-2 text-xs">📝 {order.notes}</div>
        )}

        <div className="flex items-center justify-between rounded bg-green-50 p-2 dark:bg-green-950/40">
          <span className="text-xs text-muted-foreground">
            เก็บค่าส่งปลายทาง
          </span>
          <span className="font-bold text-green-700 dark:text-green-400">
            ฿{fee.toFixed(0)}
          </span>
        </div>
      </div>

      <Button className="mt-4 w-full" onClick={handleNext} disabled={busy}>
        {busy
          ? "กำลังอัปเดต..."
          : order.status === "picked_up"
            ? "เริ่มส่ง"
            : "ส่งสำเร็จ"}
      </Button>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    picked_up: {
      label: "รับของแล้ว",
      cls: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
    },
    delivering: {
      label: "กำลังส่ง",
      cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
    },
  };
  const m = map[status] ?? { label: status, cls: "bg-muted" };
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${m.cls}`}>
      {m.label}
    </span>
  );
}
