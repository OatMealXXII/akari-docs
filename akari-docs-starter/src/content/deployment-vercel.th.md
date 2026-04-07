---
title: Deploy บน Vercel
author: Akari Team
description: Checklist สำหรับ deploy production บน Vercel
order: 5
---

# Deploy บน Vercel

## สิ่งที่ต้องมีล่วงหน้า

- โค้ดถูก push ไปยัง Git repository แล้ว
- build ผ่านในเครื่อง (`npm run build` หรือ `bun run build`)
- โปรเจกต์ใช้ `dist` เป็น output folder

## การตั้งค่าโปรเจกต์บน Vercel

ตอน import repo ให้ใช้ค่าเหล่านี้:

- Framework Preset: `Vite`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `dist`

## ข้อกำหนดสำหรับ SPA Routing

ระบบนี้ใช้ history-based routing สำหรับ slug ของหน้า (เช่น `/introduction`)

เพื่อไม่ให้ refresh หน้าแล้วยิง 404 ต้องมี rewrite ไป `index.html`
ไฟล์ `vercel.json` ถูกเตรียมไว้ที่ root ของโปรเจกต์แล้ว

## ขั้นตอน deploy

1. Import repository ใน Vercel dashboard
2. ตรวจ build/output settings
3. กด deploy ครั้งแรก
4. เปิด URL production แล้วทดสอบเส้นทาง

## เช็กหลัง deploy

ทดสอบเคสต่อไปนี้:

1. เปิด `/introduction` ตรงในแท็บใหม่
2. refresh ที่ `/api-reference` (ต้องไม่ 404)
3. เปิด deep hash link เช่น `/getting-started#basic-usage`
4. ตรวจว่า CSS และไอคอนโหลดครบ

## ตัวเลือก deploy ผ่าน CLI

```bash
npx vercel
npx vercel --prod
```

## Troubleshooting

### Refresh แล้วขึ้น 404

- ตรวจว่า `vercel.json` อยู่ที่ root ของโปรเจกต์
- ตรวจว่า rewrite ชี้ไป `/index.html`

### Static assets โหลดไม่ขึ้น

- ตรวจ path ของ assets จาก Vite build
- ตรวจว่า output directory ตั้งเป็น `dist` ตรงตัว

### Local build ผ่าน แต่ Vercel build ไม่ผ่าน

- ให้เวอร์ชัน Node/package manager ใกล้กับเครื่อง local
- ตรวจ build command และ lockfile ให้ตรงกัน

## ขั้นตอนถัดไป

หลัง deploy เสร็จ กลับไปดู [API Reference](/api-reference) เพื่อตรวจ public exports บน production
