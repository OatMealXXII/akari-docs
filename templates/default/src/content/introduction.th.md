---
title: เกริ่นนำ
author: Akari Team
description: Akari-Docs คืออะไร และแนวคิด zero-bloat คืออะไร
order: 1
---

# แนะนำ Akari-Docs

## Akari-Docs คืออะไร

Akari-Docs คือแพ็กเกจเอกสารสำหรับ **Vue + Vite** ที่ออกแบบมาให้ทีมทำ docs ได้เร็วและสะอาด โดยไม่ต้องแบก runtime หนักเกินจำเป็น

แพ็กเกจนี้มี:

- ปลั๊กอิน markdown สำหรับอ่าน frontmatter และ headings
- Layout สำหรับเอกสารที่พร้อมใช้งานจริง
- TOC และตัวนำทางหน้าแบบ dynamic พร้อม active highlight

## ทำไมต้อง Zero-Bloat

Akari-Docs ใช้หลักเดียวคือ **ใส่เฉพาะสิ่งที่จำเป็นกับงานเอกสาร**

หลักการหลัก:

- ระบุ runtime dependency ให้ชัดเจน
- ไม่พกโค้ด demo ที่ไม่จำเป็นในแพ็กเกจที่ปล่อยจริง
- ทำ TOC tracking ให้มีประสิทธิภาพสำหรับเอกสารยาว
- สร้างเนื้อหาจาก markdown โดยตรง

## ภาพรวมสถาปัตยกรรม

```text
Markdown Content -> akariMarkdownPlugin -> heading/frontmatter index -> Layout (TOC + Navigator)
```

## เหมาะกับใคร

- ทีมที่ทำ component library แล้วต้องมี docs ทั้งภายใน/ภายนอก
- โปรเจกต์ที่ใช้ Vue + Vite อยู่แล้ว
- ทีมที่ต้องการควบคุมขนาดแพ็กเกจอย่างจริงจัง

## ขั้นตอนถัดไป

ไปต่อที่ [Getting Started](/getting-started) เพื่อติดตั้งและเชื่อมกับโปรเจกต์ Vite ของคุณ

จากนั้นอ่าน [User Guide](/user-guide) เพื่อดู flow การใช้งานฝั่งผู้ใช้ในระบบเอกสาร
