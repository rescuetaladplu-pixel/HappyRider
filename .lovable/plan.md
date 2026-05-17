## สรุปสั้น

ฝั่ง happyeat ใช้ **Leaflet + OpenStreetMap** (ฟรี, ไม่ต้อง API key) — ใช้สแตกเดียวกันที่ HappyRider จะดีที่สุด เพราะ:
- ไม่ต้องตั้ง billing / API key อะไรเลย
- ลูกค้าและร้านในฝั่ง happyeat เห็นแผนที่หน้าตาเดียวกัน → brand consistent
- ระบบ tracking GPS ของไรเดอร์มีอยู่แล้ว (`riders.current_lat/lng` อัปเดตทุก 10 วินาที / 30 เมตร ผ่าน `watchPosition`) — แค่เอามาแสดงบนแผนที่

## สิ่งที่จะเพิ่ม

แผนที่ขนาดสูง ~280px ติดอยู่ด้านบนของหน้า dashboard `/` เหนือแท็บ "งานที่รับได้ / งานที่ทำอยู่" — หมุดสีเขียวขยับตามตำแหน่งจริงของไรเดอร์เรียลไทม์ พร้อมปุ่ม "📍 ตรงกลาง" ให้กลับมาที่ตำแหน่งตัวเอง

ตอนออฟไลน์ → แสดง overlay จาง ๆ บอก "ออนไลน์เพื่อเริ่มติดตามตำแหน่ง" (ไม่ขยับเพราะ GPS watcher หยุด)

## ไฟล์ที่จะแก้/สร้าง

### สร้าง
- `src/components/RiderLocationMap.tsx` — wrapper ที่ render เฉพาะฝั่ง client (กัน SSR crash) + จัดการ state empty/offline
- `src/components/RiderLocationMapInner.tsx` — `MapContainer` + `TileLayer` + `Marker` + auto-recenter เมื่อพิกัดเปลี่ยน (โครงเดียวกับ `LocationPickerInner.tsx` ของ happyeat)

### แก้
- `src/routes/_authenticated/index.tsx` — แทรก `<RiderLocationMap />` ด้านบน Tabs
- `package.json` — เพิ่ม `leaflet`, `react-leaflet`, `@types/leaflet` (เวอร์ชันเดียวกับ happyeat: 1.9.4 / 5.0.0 / 1.9.21)

## รายละเอียดเทคนิค

**1. Client-only render (สำคัญ)**
Leaflet เรียก `window` ตอน import → ต้อง dynamic import + render หลัง mount เท่านั้น ไม่งั้น SSR / prerender พัง:
```tsx
const [Inner, setInner] = useState<ComponentType<Props> | null>(null);
useEffect(() => {
  import("./RiderLocationMapInner").then((m) => setInner(() => m.default));
}, []);
```

**2. แหล่งข้อมูลตำแหน่ง**
อ่านจาก `useRider().rider.current_lat / current_lng` ที่มีอยู่แล้ว — ไม่ต้องตั้ง `watchPosition` ซ้ำ ระบบ throttle 10s/30m เดิมก็ทำงานอยู่แล้วเวลา online

**3. หมุดเคลื่อน + auto-recenter**
ใน Inner: ใช้ `useEffect([lat, lng])` เรียก `map.panTo([lat, lng])` (smooth) แทน `setView` (ตัดภาพแข็ง) — ให้รู้สึกลื่นเหมือน Grab/Bolt

**4. กรณีไม่มีพิกัด**
- ออฟไลน์ → แสดง placeholder card "เปิดออนไลน์เพื่อดูตำแหน่ง" (ไม่ render leaflet)
- ออนไลน์แต่ยังไม่ได้พิกัด → spinner "กำลังหาตำแหน่ง..."

**5. ทำไมไม่ใช้ Google Maps**
- ต้องผูกบัตรเครดิต + จัดการ API key + restrict referer
- ค่าใช้จ่ายเริ่มหลัง free tier
- OSM tiles ฟรีไม่จำกัด attribution แค่ "© OpenStreetMap"

**6. ข้อจำกัด OSM tiles**
- ไม่มี traffic layer (Google Maps มี) — สำหรับ "ดูตำแหน่งตัวเอง" ไม่จำเป็น
- ปุ่ม "นำทาง" ในการ์ดงาน active ยังลิงก์ออก Google Maps app ปกติ (ใช้ deep link `google.com/maps/dir/?api=1&...` ไม่ต้อง API key)

## ไม่แตะ

- ไม่แตะ schema / database (ใช้ field `current_lat/lng` เดิม)
- ไม่แตะ business logic / orders / RLS
- ไม่แตะ GPS watcher logic ใน `rider-context.tsx`
- ไม่ต้องประสานห้อง happyeat (ไม่มีอะไรเปลี่ยนใน contract)

## หลังทำเสร็จจะตรวจ

- เปิดออนไลน์ → เห็นหมุดตัวเองบนแผนที่
- เดิน/ขยับ → หมุด pan ตาม (รอ throttle ~10s)
- ออฟไลน์ → แผนที่หายไป โชว์ placeholder
- ปิด/เปิดแท็บ → ไม่ค้าง, ไม่ leak watcher
