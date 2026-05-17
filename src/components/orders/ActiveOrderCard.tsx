import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  useOrders,
  RELEASABLE_STATUSES,
  type OrderRow,
} from "@/lib/orders-context";

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
  const { advance, release } = useOrders();
  const [busy, setBusy] = useState(false);
  const [otp, setOtp] = useState("");

  const restoLink = mapsLink(
    order.restaurants?.latitude ?? null,
    order.restaurants?.longitude ?? null,
    order.restaurants?.address ?? null,
  );
  const dropLink = mapsLink(order.delivery_lat, order.delivery_lng, order.delivery_address);

  const fee = order.delivery_fee ?? 0;
  const canRelease = RELEASABLE_STATUSES.has(order.status);

  const handleNext = async () => {
    setBusy(true);
    if (order.status === "ready") {
      await advance(order.id, "ready", "picked_up");
    } else if (order.status === "picked_up") {
      await advance(order.id, "picked_up", "delivering");
    } else if (order.status === "delivering") {
      const ok = await advance(order.id, "delivering", "delivered", otp);
      if (ok) setOtp("");
    }
    setBusy(false);
  };

  const handleRelease = async () => {
    if (!confirm("ปล่อยงานนี้คืนให้ไรเดอร์คนอื่น?")) return;
    setBusy(true);
    await release(order.id);
    setBusy(false);
  };

  const showAction = ["ready", "picked_up", "delivering"].includes(order.status);
  const actionLabel =
    order.status === "ready"
      ? "รับของจากร้าน"
      : order.status === "picked_up"
        ? "เริ่มส่ง"
        : "ยืนยันส่งสำเร็จ";

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="font-semibold">{order.restaurants?.name ?? "ร้านอาหาร"}</div>
        <StatusBadge status={order.status} />
      </div>

      <WaitingNotice status={order.status} />

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

      {order.status === "delivering" && (
        <div className="mt-4 rounded-lg border bg-muted/30 p-3">
          <div className="mb-2 text-sm font-medium">
            กรอก OTP 4 หลักจากลูกค้า
          </div>
          <InputOTP
            maxLength={4}
            value={otp}
            onChange={(v) => setOtp(v.replace(/\D/g, ""))}
            inputMode="numeric"
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
            </InputOTPGroup>
          </InputOTP>
        </div>
      )}

      {showAction && (
        <Button
          className="mt-4 w-full"
          onClick={handleNext}
          disabled={
            busy || (order.status === "delivering" && otp.length !== 4)
          }
        >
          {busy ? "กำลังอัปเดต..." : actionLabel}
        </Button>
      )}

      {canRelease && (
        <Button
          variant="outline"
          className="mt-2 w-full"
          onClick={handleRelease}
          disabled={busy}
        >
          ปล่อยงาน
        </Button>
      )}
    </div>
  );
}

function WaitingNotice({ status }: { status: string }) {
  if (status === "awaiting_confirmations" || status === "awaiting_payment") {
    return (
      <div className="mt-2 rounded bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
        ⏳ กำลังรอลูกค้าชำระเงิน — คุณจองงานนี้ไว้แล้ว ถ้าไม่อยากรอกด "ปล่อยงาน" ได้
      </div>
    );
  }
  if (status === "awaiting_payment_confirm") {
    return (
      <div className="mt-2 rounded bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
        ⏳ ลูกค้าโอนแล้ว — รอร้านตรวจสลิป
      </div>
    );
  }
  if (status === "preparing") {
    return (
      <div className="mt-2 rounded bg-blue-50 p-2 text-xs text-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
        👨‍🍳 ร้านกำลังทำอาหาร — รอสักครู่
      </div>
    );
  }
  if (status === "ready") {
    return (
      <div className="mt-2 rounded bg-green-50 p-2 text-xs text-green-900 dark:bg-green-950/40 dark:text-green-100">
        ✅ อาหารพร้อมแล้ว — ไปรับที่ร้านได้เลย
      </div>
    );
  }
  return null;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    awaiting_confirmations: {
      label: "รอลูกค้าจ่าย",
      cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
    },
    awaiting_payment: {
      label: "รอลูกค้าจ่าย",
      cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
    },
    awaiting_payment_confirm: {
      label: "รอร้านตรวจสลิป",
      cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
    },
    preparing: {
      label: "ร้านกำลังทำ",
      cls: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
    },
    ready: {
      label: "พร้อมรับ",
      cls: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
    },
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
