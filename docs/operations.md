# คู่มือรัน ดูแล และกู้คืน

ทุกคำสั่งรันจากรากโปรเจกต์ Compose ที่ให้มาเป็น local demo เท่านั้น บัญชีและ secrets ในตัวอย่างเป็นข้อมูลสาธารณะ

## Configuration

| ค่า          | ความหมาย                                                               |
| ------------ | ---------------------------------------------------------------------- |
| DATABASE_URL | PostgreSQL connection string; runtime ไม่ใช้ fallback                  |
| APP_ORIGIN   | origin ของหน้าเว็บ ตรงกับ Origin header ไม่มี path/trailing slash      |
| CSRF_SECRET  | random secret อย่างน้อย 32 ตัวอักษร; เปลี่ยนแล้วผู้ใช้ต้องโหลดหน้าใหม่ |
| NODE_ENV     | production บังคับ HTTPS origin และ Secure cookies                      |
| TRUST_PROXY  | 1 เฉพาะเมื่ออยู่หลัง proxy ที่ควบคุมและมีหนึ่ง hop; ค่าเริ่มต้น 0      |
| PORT         | พอร์ตภายใน API ค่าเริ่มต้น 3000                                        |

Compose แยก `COMPOSE_APP_ORIGIN` จาก APP_ORIGIN ในไฟล์ dev เพื่อไม่ให้ค่า Vite ปนกัน หากใช้ APP_PORT=3001 ต้องใช้ COMPOSE_APP_ORIGIN=http://localhost:3001

## Deployment ที่ผู้ใช้เลือก provider ภายหลัง

1. ใช้ managed PostgreSQL ที่รองรับ btree_gist หรือเตรียม extension ด้วยบัญชี migration ที่ได้รับสิทธิ์
2. Build image จาก commit ที่ผ่าน CI แล้ว tag ด้วย commit SHA; push ไป registry ของคุณเมื่อพร้อม
3. ตั้ง secrets ผ่าน secret manager/environment ของ hosting, NODE_ENV=production และ APP_ORIGIN=https://ชื่อโดเมนจริง
4. ให้ HTTPS reverse proxy ส่งต่อไป container พอร์ต 3000 และเปิด TRUST_PROXY=1 เมื่อ topology มีหนึ่ง proxy ที่เชื่อถือได้จริง จำกัดการเข้าถึง backend โดยตรง
5. รัน migration เป็น release job หนึ่งครั้ง: `node apps/api/dist/apps/api/scripts/migrate.js` อย่ารัน `seed` บน production
6. สร้างผู้ดูแลด้วย `ADMIN_EMAIL` และ `ADMIN_PASSWORD` ผ่าน secret environment แล้วรัน `node apps/api/dist/apps/api/scripts/bootstrap-admin.js` คำสั่งไม่เปลี่ยนหรือเลื่อนสิทธิ์บัญชีที่มีอยู่
7. ตรวจ readiness แล้ว smoke test login, booking, conflict, cancellation ผ่าน HTTPS จริง
8. เก็บ image เก่าและ backup ก่อน migration พร้อมตั้ง backup schedule/retention และ alert ของ hosting

Docker image ใช้ non-root user; runtime ไม่มี dev dependencies แต่ schema migration ใช้สิทธิ์ DDL จึงควรแยก migration role กับ application role ใน deployment จริง หลังเลือก provider ต้องตรวจ TLS ของ database ด้วย ห้ามแก้ certificate verification เป็น false เพื่อให้เชื่อมต่อผ่าน

## ตรวจปัญหา

```bash
docker compose ps
docker compose logs --tail=100 app
curl -i http://localhost:3000/health/live
curl -i http://localhost:3000/health/ready
```

- live=200 แต่ ready=503: process ยังอยู่แต่ฐานข้อมูลไม่พร้อม ตรวจ network/credentials/DB โดยไม่ paste secrets ลง issue
- 403 CSRF_FAILED: Origin ไม่ตรง หรือ cookie/token เปลี่ยน โหลดหน้าใหม่และตรวจ APP_ORIGIN
- 409 BOOKING_CONFLICT: เป็น business outcome ปกติ ไม่ใช่ server crash ให้ผู้ใช้เลือกเวลาใหม่
- 500: จด X-Request-Id แล้วหา requestId เดียวกันใน JSON logs; log จะแสดง errorCode โดยไม่เก็บ body
- 429: จุด login/register จำกัด 30 requests ต่อ 15 นาทีต่อ IP ใน deployment instance เดียว

Logs มี responseTime และ statusCode ใช้ provider log query ทำกราฟ latency/error rate ได้ รุ่นนี้ไม่มี metrics exporter หรือ dashboard สำเร็จรูป ก่อนตั้ง SLO ต้องมีปริมาณ traffic และช่วงวัดที่มีความหมาย

## Rollback

เก็บ image จาก commit ก่อนหน้า แล้ว deploy image นั้นโดยไม่ย้อนฐานข้อมูลทันที Migration รุ่นนี้สร้าง schema เริ่มต้น ยังไม่มี destructive migration และยังไม่มี down migration

สำหรับ migration ถัดไปให้ใช้ expand/contract: เพิ่มคอลัมน์ที่ optional ก่อน → deploy code ที่รองรับทั้งสอง schema → backfill → เลิกใช้ของเดิมใน release หลัง การ rollback binary จะปลอดภัยก็ต่อเมื่อ schema ยังเข้ากันได้ อย่าเรียก restore backup ว่า rollback ทั่วไป เพราะอาจสูญเสียข้อมูลที่เกิดหลัง backup

## Backup และ restore drill

ใช้ demo ที่ไม่มีการเขียนข้อมูลระหว่าง drill:

```bash
bash scripts/restore-check.sh
```

สคริปต์ pg_dump เป็น custom format ไป `.local/backups/` แล้วสร้างฐานข้อมูลชื่อ `labreserve_restore_<timestamp>` ใหม่ ใช้ pg_restore และเทียบ fingerprint ของ users/equipment/reservations/events ไม่เขียนทับ source และคงฐาน restored ไว้ให้ตรวจ ข้อมูล session ถูก dump ด้วยแต่ไม่นำมาเทียบ fingerprint เพราะอาจหมดอายุระหว่างตรวจ

ไฟล์ backup มีข้อมูลบัญชีและ password hashes ให้ป้องกันสิทธิ์เข้าถึงและ encrypt เมื่อเก็บนอกเครื่อง โฟลเดอร์นี้อยู่ใน .gitignore ไม่ใช้ `docker compose down -v` เป็นขั้นตอนแก้ปัญหา เพราะลบข้อมูลถาวร

เวลาที่ drill ใช้เป็นค่าที่วัดใน local ไม่ใช่ RTO ที่รับประกัน ส่วน RPO ขึ้นกับความถี่ backup ยังไม่ได้ตั้ง schedule สำหรับ production

## Load test

```bash
npm run load:test
LOAD_REQUESTS=1000 LOAD_CONCURRENCY=10 npm run load:test
```

สคริปต์ยอมรับเฉพาะ localhost/127.0.0.1 ใช้บัญชีสมาชิก local demo login แล้วอ่านหน้าอุปกรณ์ซ้ำ รายงาน count, concurrency, errors, p50/p95/p99 และ elapsed time การทดลองนี้ไม่ครอบคลุม writes, network WAN, cold start หรือความเสถียรระยะยาว
