# HappyRider — Native Android notification sounds

ไฟล์เสียงแจ้งเตือน **3 แบบ** สำหรับใช้เป็น Android Notification Channel sound ผ่าน Capacitor `@capacitor/push-notifications`

> ⚠️ ชื่อไฟล์และ channel ID ต้อง **ตรงเป๊ะ** กับ HappyEat shared contract (`docs/SHARED_CONTRACT.md` ของห้อง happyeat entry 2026-05-20) ไม่งั้น push จาก backend จะไม่ออกเสียงที่ไรเดอร์เลือก

## วิธีใช้ (ต้องทำที่เครื่อง build APK)

1. คัดลอกไฟล์ทั้งหมดจาก `android-resources/raw/` ไปวางที่:
   ```
   android/app/src/main/res/raw/
   ```
   ถ้าโฟลเดอร์ `raw/` ยังไม่มี ให้สร้างเอง

2. Sync + Build:
   ```bash
   npx cap sync android
   cd android && ./gradlew assembleRelease
   ```

3. ติดตั้ง APK ใหม่บนมือถือไรเดอร์

## ชื่อไฟล์ + Channel ID (ห้ามแก้)

| ไฟล์ใน `res/raw/` | Channel ID | preset |
|---|---|---|
| `siren.mp3`     | `orders_siren`     | ไซเรนตำรวจ (default) |
| `airhorn.mp3`   | `orders_airhorn`   | แตรลม |
| `emergency.mp3` | `orders_emergency` | รถพยาบาล |

ชื่อไฟล์ใน `res/raw/` ต้อง: **ตัวพิมพ์เล็ก + a-z 0-9 _ เท่านั้น** (ห้ามมี - หรือเว้นวรรค)

## Flow ฝั่ง Backend (happyeat รับผิดชอบ)

- ไรเดอร์เลือก preset → save ลง `profiles.notification_sound` (column ที่ happyeat เพิ่มให้แล้ว)
- Backend ใส่ใน FCM payload:
  ```json
  {
    "android": {
      "notification": {
        "channel_id": "orders_<preset>",
        "sound": "<preset>"
      }
    }
  }
  ```

## หมายเหตุ
- ไฟล์ใน `public/sounds/` เป็นชุดเดียวกัน ใช้สำหรับพรีวิวบนเว็บ/webview ในหน้า ตั้งค่า → เสียงแจ้งเตือน
- ถ้าจะเพิ่ม/เปลี่ยนเสียง ต้อง **rebuild APK ใหม่** + ใช้ channel ID ใหม่ (Android cache channel — id เดิม sound เปลี่ยนไม่ได้) และ **ประสานกับห้อง happyeat ให้เปลี่ยนพร้อมกัน**
