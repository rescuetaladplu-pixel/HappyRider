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

function PoolCard({
  order,
  onClaimed,
}: {
  order: OrderRow;
  onClaimed?: () => void;
}) {
  const { claim } = useOrders();
  const [busy, setBusy] = useState(false);

  const handleClaim = async () => {
    setBusy(true);
    const r = await claim(order.id);
    setBusy(false);
    if (r.ok) onClaimed?.();
  };

  const fee = order.delivery_fee ?? 0;

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-semibold">
            {order.restaurants?.name ?? "ร้านอาหาร"}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            📍 รับที่: {order.restaurants?.address ?? "—"}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            🏠 ส่งที่: {order.delivery_address ?? "—"}
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
