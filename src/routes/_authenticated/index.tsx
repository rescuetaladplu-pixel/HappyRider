import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useRider } from "@/lib/rider-context";
import { useOrders } from "@/lib/orders-context";
import { PoolList } from "@/components/orders/PoolList";
import { ActiveOrderCard } from "@/components/orders/ActiveOrderCard";
import { LocationPermissionBanner } from "@/components/LocationPermissionBanner";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({ meta: [{ title: "Dashboard — HappyRider" }] }),
  component: RiderDashboard,
});

function RiderDashboard() {
  const { rider } = useRider();
  const { pool, active } = useOrders();
  const [tab, setTab] = useState<"pool" | "active">("pool");

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <LocationPermissionBanner />
      {rider && !rider.is_approved && (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
          ⏳ บัญชีของคุณรอแอดมินอนุมัติ — รับงานจริงไม่ได้จนกว่าจะอนุมัติ
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as "pool" | "active")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pool">
            งานที่รับได้
            {pool.length > 0 && (
              <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {pool.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="active">
            งานที่ทำอยู่
            {active.length > 0 && (
              <span className="ml-2 rounded-full bg-green-600 px-2 py-0.5 text-xs text-white">
                {active.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pool" className="mt-4">
          <PoolList onClaimed={() => setTab("active")} />
        </TabsContent>

        <TabsContent value="active" className="mt-4">
          {active.length === 0 ? (
            <div className="rounded-lg border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              ยังไม่มีงานที่ทำอยู่
            </div>
          ) : (
            <div className="space-y-3">
              {active.map((o) => (
                <ActiveOrderCard key={o.id} order={o} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
