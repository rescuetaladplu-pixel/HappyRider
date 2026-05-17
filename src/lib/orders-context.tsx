import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useRider } from "@/lib/rider-context";
import { playBeep } from "@/lib/notification-sound";

export interface RestaurantRef {
  name: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
}

export interface OrderRow {
  id: string;
  restaurant_id: string;
  rider_id: string | null;
  status: string;
  delivery_address: string | null;
  delivery_lat: number | null;
  delivery_lng: number | null;
  subtotal: number | null;
  delivery_fee: number | null;
  notes: string | null;
  created_at: string;
  restaurants: RestaurantRef | null;
}

const SELECT = `
  id, restaurant_id, rider_id, status,
  delivery_address, delivery_lat, delivery_lng,
  subtotal, delivery_fee, notes, created_at,
  restaurants(name, address, latitude, longitude, phone)
`;

type ClaimResult = { ok: true } | { ok: false; reason: "taken" | "error" };

interface OrdersContextValue {
  pool: OrderRow[];
  active: OrderRow[];
  loading: boolean;
  claim: (orderId: string) => Promise<ClaimResult>;
  release: (orderId: string) => Promise<boolean>;
  advance: (
    orderId: string,
    from: "ready" | "picked_up" | "delivering",
    to: "picked_up" | "delivering" | "delivered",
    otp?: string,
  ) => Promise<boolean>;
  refresh: () => Promise<void>;
}

const OrdersContext = createContext<OrdersContextValue | undefined>(undefined);

// Pool: งานที่ยังไม่มีไรเดอร์ — รวมงานล่วงหน้า (รอลูกค้าจ่าย) + งานพร้อมส่ง
const POOL_STATUSES = ["awaiting_confirmations", "ready"] as const;
// Active: ทุกสถานะที่ไรเดอร์ถูก assign แล้ว (รวมระหว่างรอลูกค้า/รอร้าน)
const ACTIVE_STATUSES = new Set([
  "awaiting_confirmations",
  "awaiting_payment",
  "awaiting_payment_confirm",
  "preparing",
  "ready",
  "picked_up",
  "delivering",
]);
// สถานะที่ยังปล่อยงานคืนได้ (ก่อนร้านเริ่มทำอาหาร)
export const RELEASABLE_STATUSES = new Set([
  "awaiting_confirmations",
  "awaiting_payment",
  "awaiting_payment_confirm",
]);

export function OrdersProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { rider } = useRider();
  const isOnline = !!rider?.is_online;

  const [pool, setPool] = useState<OrderRow[]>([]);
  const [active, setActive] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPool = useCallback(async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(SELECT)
      .is("rider_id", null)
      .eq("status", POOL_STATUS)
      .order("created_at", { ascending: true });
    if (!error && data) setPool(data as unknown as OrderRow[]);
  }, []);

  const fetchActive = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("orders")
      .select(SELECT)
      .eq("rider_id", user.id)
      .in("status", ["picked_up", "delivering"])
      .order("created_at", { ascending: true });
    if (!error && data) setActive(data as unknown as OrderRow[]);
  }, [user]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchPool(), fetchActive()]);
    setLoading(false);
  }, [fetchPool, fetchActive]);

  useEffect(() => {
    if (!user) {
      setPool([]);
      setActive([]);
      return;
    }
    void fetchActive();
  }, [user, fetchActive]);

  useEffect(() => {
    if (!user) return;
    if (!isOnline) {
      setPool([]);
      return;
    }
    void fetchPool();

    const channel = supabase
      .channel("rider-pool")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          const newRow = payload.new as Partial<OrderRow> | null;
          const oldRow = payload.old as Partial<OrderRow> | null;
          const row = newRow ?? oldRow;
          if (!row?.id) return;

          const inPoolNow =
            !!newRow &&
            newRow.rider_id == null &&
            newRow.status === POOL_STATUS;
          const wasInPool =
            !!oldRow &&
            oldRow.rider_id == null &&
            oldRow.status === POOL_STATUS;

          if (inPoolNow && !wasInPool) {
            supabase
              .from("orders")
              .select(SELECT)
              .eq("id", row.id)
              .maybeSingle()
              .then(({ data }) => {
                if (!data) return;
                const full = data as unknown as OrderRow;
                setPool((prev) =>
                  prev.some((p) => p.id === full.id) ? prev : [...prev, full],
                );
                toast("งานใหม่!", { description: full.restaurants?.name ?? "" });
                playBeep();
              });
          } else if (!inPoolNow && wasInPool) {
            setPool((prev) => prev.filter((p) => p.id !== row.id));
          } else if (inPoolNow && wasInPool) {
          }

          const mineNow =
            !!newRow &&
            newRow.rider_id === user.id &&
            typeof newRow.status === "string" &&
            ACTIVE_STATUSES.has(newRow.status);
          const mineWas =
            !!oldRow &&
            oldRow.rider_id === user.id &&
            typeof oldRow.status === "string" &&
            ACTIVE_STATUSES.has(oldRow.status);

          if (mineNow && !mineWas) {
            supabase
              .from("orders")
              .select(SELECT)
              .eq("id", row.id)
              .maybeSingle()
              .then(({ data }) => {
                if (!data) return;
                const full = data as unknown as OrderRow;
                setActive((prev) =>
                  prev.some((p) => p.id === full.id)
                    ? prev.map((p) => (p.id === full.id ? full : p))
                    : [...prev, full],
                );
              });
          } else if (mineNow && mineWas) {
            setActive((prev) =>
              prev.map((p) =>
                p.id === row.id ? { ...p, status: newRow!.status! } : p,
              ),
            );
          } else if (!mineNow && mineWas) {
            setActive((prev) => prev.filter((p) => p.id !== row.id));
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, isOnline, fetchPool]);

  const claim = useCallback(
    async (orderId: string): Promise<ClaimResult> => {
      if (!user) return { ok: false, reason: "error" };
      const { data, error } = await supabase
        .from("orders")
        .update({ rider_id: user.id, status: "picked_up" })
        .eq("id", orderId)
        .is("rider_id", null)
        .eq("status", "ready")
        .select("id");
      if (error) {
        console.error("[claim] db error:", error.message);
        toast.error("รับงานไม่สำเร็จ — กรุณาลองใหม่");
        return { ok: false, reason: "error" };
      }
      if (!data || data.length === 0) {
        toast.error("งานนี้มีคนรับไปแล้ว");
        setPool((prev) => prev.filter((p) => p.id !== orderId));
        void fetchPool();
        return { ok: false, reason: "taken" };
      }
      toast.success("รับงานสำเร็จ");
      setPool((prev) => prev.filter((p) => p.id !== orderId));
      void fetchActive();
      return { ok: true };
    },
    [user, fetchPool, fetchActive],
  );

  const advance = useCallback(
    async (
      orderId: string,
      from: "picked_up" | "delivering",
      to: "delivering" | "delivered",
      otp?: string,
    ) => {
      if (!user) return false;

      if (to === "delivered") {
        const code = (otp ?? "").trim();
        if (!/^\d{4}$/.test(code)) {
          toast.error("กรุณากรอก OTP 4 หลัก");
          return false;
        }
        const { data, error } = await supabase.rpc("confirm_delivery", {
          order_id: orderId,
          otp_code: code,
        });
        if (error) {
          console.error("[confirm_delivery] rpc error:", error.message);
          toast.error("ยืนยันส่งไม่สำเร็จ — กรุณาลองใหม่");
          return false;
        }
        if (data !== true) {
          toast.error("OTP ไม่ถูกต้อง");
          return false;
        }
        toast.success("ส่งสำเร็จ — รับเงินค่าส่งจากลูกค้า");
        setActive((prev) => prev.filter((p) => p.id !== orderId));
        return true;
      }

      // picked_up → delivering
      const { data, error } = await supabase
        .from("orders")
        .update({ status: to })
        .eq("id", orderId)
        .eq("rider_id", user.id)
        .eq("status", from)
        .select("id");
      if (error) {
        console.error("[advance] db error:", error.message);
        toast.error("อัปเดตสถานะไม่สำเร็จ — กรุณาลองใหม่");
        return false;
      }
      if (!data || data.length === 0) {
        toast.error("ไม่สามารถอัปเดตสถานะได้ (อาจถูกอัปเดตไปแล้ว)");
        void fetchActive();
        return false;
      }
      toast.success("เริ่มส่งแล้ว");
      setActive((prev) =>
        prev.map((p) => (p.id === orderId ? { ...p, status: to } : p)),
      );
      return true;
    },
    [user, fetchActive],
  );
  return (
    <OrdersContext.Provider
      value={{ pool, active, loading, claim, advance, refresh }}
    >
      {children}
    </OrdersContext.Provider>
  );
}

export function useOrders() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error("useOrders must be used within OrdersProvider");
  return ctx;
}
