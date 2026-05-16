
# Phase 3 — Rider Job Pool + Active Orders

อ้างอิง SHARED_CONTRACT.md (happyeat) sections 3–6. ไม่มี migration ในห้องนี้, ไม่แตะ schema, ไม่แตะ tables อื่นนอก `orders` + `riders`.

## โครงสร้างหน้า

แท็บใน dashboard `/` แทน placeholder ปัจจุบัน:
- **งานที่รับได้** (Pool) — default tab
- **งานที่ทำอยู่** (Active)

ใช้ `Tabs` ของ shadcn. หน้า profile ยังอยู่ที่ `/profile` เหมือนเดิม.

## ไฟล์ที่จะแก้/สร้าง

### สร้างใหม่
- `src/lib/orders-context.tsx` — รวม state ของ pool + active orders + realtime subscription
- `src/components/orders/PoolList.tsx` — รายการงานพร้อมรับ + ปุ่ม "รับงาน"
- `src/components/orders/ActiveOrderCard.tsx` — งานที่ทำอยู่ + ปุ่ม transition + ลิงก์ Google Maps
- `src/lib/notification-sound.ts` — เล่นเสียงแจ้งเตือนสั้นๆ (WebAudio beep, ไม่ต้องโหลด asset)

### แก้
- `src/routes/_authenticated/index.tsx` — ใช้ OrdersProvider + Tabs (Pool / Active)
- `src/lib/rider-context.tsx` — เพิ่ม mode parameter ให้ GPS watcher: throttle 15s/50m เมื่อมี active delivery (vs 10s/30m เดิม). คงพฤติกรรมเดิมตอน online-only.

## รายละเอียดแต่ละส่วน

### 1. OrdersProvider (`src/lib/orders-context.tsx`)
State:
- `pool: OrderRow[]` — เฉพาะ `rider_id IS NULL AND status='ready'`
- `active: OrderRow[]` — `rider_id = me AND status IN ('picked_up','delivering')`
- `claim(id)`, `advanceStatus(id, next)`, `loading`

Lifecycle:
- เมื่อ `isOnline=true` → fetch pool + active, subscribe realtime channel `rider-pool` (table `orders`, event `*`)
- เมื่อ `isOnline=false` → clear pool, unsubscribe (active list คงไว้ถ้ามี — ไรเดอร์ที่กำลังส่งของไม่ควรหาย)
- unmount → unsubscribe

Realtime handler (ใช้ payload.new + payload.old):
- กรอง `auth.uid()` เอง (channel ไม่ filter server-side)
- INSERT/UPDATE → ถ้าตรง pool condition และไม่มีในลิสต์ → push + toast "งานใหม่!" + beep
- UPDATE → ถ้า row เคยอยู่ pool แต่ตอนนี้ `rider_id != null` หรือ status ไม่ใช่ ready → ลบจาก pool
- UPDATE → ถ้า `rider_id = me` และ status in (picked_up/delivering) → ใส่/อัปเดต active
- UPDATE → ถ้า row อยู่ active แต่ status = delivered/cancelled → ลบจาก active
- DELETE → ลบจาก list ทั้งสอง

Fetch (เลือก columns ตาม spec + join `restaurants`):
```ts
supabase.from('orders').select(`
  id, restaurant_id, status, rider_id,
  delivery_address, delivery_lat, delivery_lng,
  subtotal, delivery_fee, notes, created_at,
  restaurants(name, address, latitude, longitude, phone)
`).is('rider_id', null).eq('status','ready').order('created_at', { ascending: true })
```

### 2. Claim (race-safe)
```ts
const { data, error } = await supabase
  .from('orders')
  .update({ rider_id: user.id, status: 'picked_up' })
  .eq('id', orderId)
  .is('rider_id', null)
  .eq('status', 'ready')
  .select('id');
```
- `data.length === 0` → toast "งานนี้มีคนรับไปแล้ว" + ลบจาก pool local + refetch pool
- success → toast + ย้ายไปแท็บ active (setActiveTab)

### 3. Status transitions
- `picked_up → delivering` ปุ่ม "เริ่มส่ง"
- `delivering → delivered` ปุ่ม "ส่งสำเร็จ" (กดตรงๆ ไม่มี OTP — ดู Phase 3.5 ด้านล่าง)

Update with guards เหมือน claim:
```ts
.update({ status: next }).eq('id', id).eq('rider_id', user.id).eq('status', current)
```

### 4. GPS live update
แก้ `rider-context.tsx`:
- เพิ่ม `hasActiveDelivery` (อ่านจาก OrdersContext) → ถ้า true ใช้ throttle 15s/50m
- ตอน status delivered/cancelled (active.length เป็น 0) + offline → กลับไป default
- ใช้ watcher เดียวที่มีอยู่แล้ว, แค่ปรับ constant

หมายเหตุ: RiderProvider จะต้องอยู่นอก OrdersProvider, แล้ว OrdersProvider expose `hasActive` ผ่าน hook ที่ rider-context อ่าน — เพื่อเลี่ยง circular, จะใช้ลำดับ provider:
```
<RiderProvider>
  <OrdersProvider>  // อ่าน useRider().rider.is_online
    <Shell />
  </OrdersProvider>
</RiderProvider>
```
ปรับ throttle โดยให้ `OrdersProvider` เรียก `setDeliveryMode(true|false)` ที่ rider-context expose ออกมาเป็น setter.

### 5. Active order UI
แสดง:
- ชื่อร้าน, ที่อยู่ร้าน, เบอร์ร้าน (tel: link), ปุ่ม "นำทางไปร้าน" → `google.com/maps/dir/?api=1&destination={r.lat},{r.lng}`
- ที่อยู่ลูกค้า, ปุ่ม "นำทางไปลูกค้า" → destination = `delivery_lat,delivery_lng`
- ค่าส่ง (delivery_fee) — เน้นชัด เพราะเป็นเงินที่ต้องเก็บปลายทาง
- notes (ถ้ามี)
- ปุ่ม transition ตาม status ปัจจุบัน

## Phase 3.5 — OTP (ยังไม่ทำรอบนี้)
Schema ปัจจุบันไม่มี `delivery_otp` ใน `orders`. ต้องสั่งห้อง **happyeat** ทำ migration เพิ่ม:
- `orders.delivery_otp text` (generate ตอน `ready`?) หรือ
- column ใน `orders` + UI ฝั่ง customer แสดง OTP

จะรายงานท้ายงานให้ user ไปสั่งห้อง happyeat.

## ข้อห้ามที่จะรักษา
- ไม่มี update orders field อื่นนอก `rider_id`, `status`
- ไม่ touch `restaurants` / `menu_*` / `order_items` (อ่าน restaurants ผ่าน join เท่านั้น)
- ไม่ migration
- ไม่ assume customer role

## รายงานท้ายงาน
จะ confirm:
1. Pool + realtime + เสียง/toast
2. Claim race-safe (rows updated = 0 handling)
3. Active flow picked_up→delivering→delivered
4. GPS throttle เปลี่ยนตาม mode
5. ขอ migration `delivery_otp` ที่ห้อง happyeat สำหรับ Phase 3.5
