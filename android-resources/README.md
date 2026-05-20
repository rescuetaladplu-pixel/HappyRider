# HappyRider — Native Android notification sounds

ไฟล์เสียงแจ้งเตือน 6 แบบ (.mp3, mono, 44.1kHz) สำหรับใช้เป็น Android Notification Channel sound ผ่าน Capacitor `@capacitor/push-notifications`.

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

## ชื่อไฟล์ (ห้ามแก้)

ชื่อไฟล์ต้องตรงกับ `channelId` ใน `src/lib/native-notifications.ts`:

| ไฟล์ | Channel ID | เสียง |
|------|------------|------|
| `happyrider_classic.mp3` | `happyrider_classic` | ปี๊บคู่มาตรฐาน |
| `happyrider_siren.mp3`   | `happyrider_siren`   | ไซเรนหวอ |
| `happyrider_alarm.mp3`   | `happyrider_alarm`   | ปลุกถี่ๆ |
| `happyrider_chime.mp3`   | `happyrider_chime`   | ระฆัง 3 โน้ต |
| `happyrider_horn.mp3`    | `happyrider_horn`    | แตรต่ำ |
| `happyrider_alert.mp3`   | `happyrider_alert`   | เตือนภัยสูง |

ชื่อไฟล์ใน `res/raw/` ต้อง: **ตัวพิมพ์เล็ก + a-z 0-9 _ เท่านั้น** (ห้ามมี - หรือเว้นวรรค)

## สิ่งที่ฝั่งห้อง HappyEat ต้องทำ (Backend FCM payload)

แอปฝั่งไรเดอร์สร้าง Notification Channel ครบทั้ง 6 แบบให้ระบบ Android อัตโนมัติเมื่อเข้าแอปครั้งแรก แต่จะให้ Android **เล่นเสียงตามที่ไรเดอร์เลือก** ได้ ต้องอย่างใดอย่างหนึ่ง:

**ทางเลือก A (แนะนำ) — ส่ง FCM พร้อม channel_id**
ฝั่ง happyeat ต้องเก็บ `preferred_channel_id` ของไรเดอร์ (เช่นในตาราง `rider_push_tokens`) แล้วใส่ใน FCM payload:
```json
{
  "to": "<fcm_token>",
  "android": {
    "notification": {
      "channel_id": "happyrider_alert",
      "sound": "happyrider_alert"
    }
  }
}
```

**ทางเลือก B (ง่ายกว่า) — ส่ง data-only FCM**
ส่งเฉพาะ `data` payload (ไม่มี `notification`). ฝั่งไรเดอร์จะเรียก `LocalNotifications.schedule({ channelId: <preset ของไรเดอร์> })` เอง → ใช้เสียงตามที่ไรเดอร์เลือกได้ทันที โดยฝั่ง happyeat ไม่ต้องรู้ preset
```json
{
  "to": "<fcm_token>",
  "data": { "title": "งานใหม่!", "body": "ร้านครัวคุณยาย", "order_id": "..." }
}
```
⚠️ ข้อจำกัด: บางรุ่นของ Android (โดยเฉพาะที่ปิดแอป kill จากเมนู recents) อาจไม่ปลุก data-only FCM ขึ้นมา

## หมายเหตุ
- ไฟล์ใน `public/sounds/` เป็นชุดเดียวกัน ใช้สำหรับพรีวิวบนเว็บ/webview ในหน้า ตั้งค่า → เสียงแจ้งเตือน
- ถ้าจะเพิ่ม/แก้เสียง ต้อง rebuild APK ใหม่เสมอ (เสียงฝัง native ไม่ใช่ web)
