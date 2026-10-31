# Architecture Decision Records

## ADR 001 — Modular monolith และ origin เดียว

บริบท: ผู้เรียนคนเดียว ต้องตาม request ได้ครบ ทางเลือกคือแยกหลายบริการหรือใช้แอปเดียวที่แบ่งโมดูล เลือกแอปเดียวเพื่อให้ transaction, local setup และ debugging ตรงไปตรงมา แลกกับการ scale API/UI ร่วมกัน รุ่นนี้ยังไม่มีปัญหาที่ต้องแบ่ง microservices

## ADR 002 — SQL โดยตรงและ database exclusion constraint

ใช้ pg กับ parameterized SQL เพื่อให้เห็น join, lock และ transaction โดยไม่ซ่อนอยู่หลัง ORM การเช็ก availability ก่อน insert เพียงอย่างเดียวมี race condition จึงให้ constraint เป็นผู้ตัดสินสุดท้าย และแปลง SQLSTATE 23P01 เป็น HTTP 409

Row lock ของ equipment ประสาน booking กับการปิดรับจอง แต่ constraint ยังจำเป็นเพื่อกัน writer อื่นที่ไม่ใช้ lock ข้อแลกเปลี่ยนคือ PostgreSQL-specific btree_gist และช่วงเวลาที่เขียนพร้อมกันในอุปกรณ์เดียวจะเรียงคิวกัน

## ADR 003 — Server sessions แทน JWT ใน localStorage

เว็บ origin เดียวใช้ HttpOnly cookie และฐานข้อมูลเพื่อ revoke ได้ทันทีเมื่อ logout ไม่ต้องออกแบบ refresh-token flow แลกกับ query session ทุก request และการเก็บ/ล้าง expired rows login ลบ expired sessions; เมื่อผู้ใช้มากขึ้นควรแยก cleanup job และทำ index/monitoring เพิ่ม

## ADR 004 — เวลาที่มี offset และ phase ที่คำนวณ

รับ API เป็น ISO พร้อม offset เก็บ timestamptz และแสดง Asia/Bangkok หน้าจอไม่อิง timezone ของเครื่องผู้ใช้ ไม่ persist upcoming/active/completed เพราะจะต้อง sync state กับเวลา ให้ confirmed/cancelled เป็นสถานะถาวรและ derive phase

## ADR 005 — เครื่องมือให้น้อยก่อนเพิ่มขนาด

ไม่เพิ่ม Redis, queue, Kubernetes หรือ ORM ในรุ่นแรก Deployment เป็น instance เดียวพร้อม PostgreSQL สิ่งที่ยอมรับคือ in-process rate limit reset เมื่อ restart และยังไม่รองรับ HA หากมีความต้องการจริงจึงเพิ่ม shared limiter และสถาปัตยกรรมหลาย instance พร้อมทดสอบ failure modes ใหม่
