## เป้าหมาย
เพิ่ม **Bottom Navigation Bar** แบบมือถือ ติดด้านล่างจอ มีปุ่มโลโก้ตรงกลางเป็นปุ่ม "หน้าแรก" (พร้อมรับงาน) เหมือนแอป Grab/Bolt

## โครงสร้าง Bottom Nav (5 tabs)

```text
┌─────────────────────────────────────────────┐
│  ประวัติ  รายได้   [LOGO]  แจ้งเตือน  โปรไฟล์ │
│   📋      💰      ⬤      🔔        👤      │
└─────────────────────────────────────────────┘
```

- ปุ่มกลาง = วงกลมยกขึ้นเล็กน้อย ใช้รูป `public/icon-512.png` → คลิกไปที่ `/` (หน้ารับงาน)
- ปุ่มอื่นๆ = ไอคอน + label เล็กๆ พร้อม active state ใช้สี primary
- ใช้ `<Link>` ของ TanStack Router + `activeProps`/`data-status` เพื่อ highlight tab ปัจจุบัน

## ไฟล์ที่จะสร้าง/แก้

### สร้างใหม่
1. **`src/components/BottomNav.tsx`** — bottom nav bar component (fixed bottom, 5 ช่อง, ปุ่มกลางใหญ่กว่า+ยกขึ้น)
2. **`src/routes/_authenticated/history.tsx`** — placeholder "ประวัติงาน" (coming soon)
3. **`src/routes/_authenticated/earnings.tsx`** — placeholder "รายได้" (coming soon)
4. **`src/routes/_authenticated/notifications.tsx`** — placeholder "แจ้งเตือน/ข่าวสาร" (coming soon)

> หน้า placeholder ทั้ง 3 ใช้เป็น stub ก่อน เพื่อให้ nav ทำงานได้ครบ ไม่กระทบ schema/contract

### แก้ไข
5. **`src/routes/_authenticated.tsx`**
   - เพิ่ม `<BottomNav />` ใต้ `<main><Outlet /></main>`
   - เพิ่ม `pb-24` ที่ `<main>` กัน content ถูก nav บัง
   - ย้ายลิงก์ "โปรไฟล์" ออกจาก header (เพราะอยู่ใน bottom nav แล้ว) — header เหลือแค่ logo, online toggle, อีเมล, ออกจากระบบ

## รายละเอียดทางเทคนิค

- ใช้ `useLocation()` เช็ค active tab + แสดง state ด้วย `text-primary` vs `text-muted-foreground`
- ปุ่มกลาง: `<Link to="/">` ครอบ `<div className="-mt-6 h-16 w-16 rounded-full bg-primary shadow-lg flex items-center justify-center">` ข้างในใส่ `<img src="/icon-512.png" />` ขนาด ~52px
- Container: `fixed bottom-0 inset-x-0 z-40 border-t bg-background` + `safe-area-inset-bottom` (`pb-[env(safe-area-inset-bottom)]`)
- Responsive: แสดงทุก viewport (เป็น mobile-first app อยู่แล้ว)

## สิ่งที่ไม่เปลี่ยน
- ไม่แตะ DB / schema / RLS / context providers
- ไม่แตะ logic การรับงาน-online toggle
- หน้า `/` ยังคงเป็นหน้ารับงานเดิม

## หลังจากทำ
รีไมนด์ผู้ใช้ว่า: ถ้าอยากให้หน้า "ประวัติงาน / รายได้ / แจ้งเตือน" มีข้อมูลจริง ต้องบอก scope ต่อ (และอาจต้องเพิ่ม table/view ฝั่ง happyeat)