# เผยแพร่ LabReserve แบบไม่มีค่าใช้จ่าย

[เปิดเดโม LabReserve](https://labreserve-nx8c.onrender.com) — ตรวจผ่าน HTTPS เมื่อ 6 พฤศจิกายน 2026 เว็บใช้ Render Free เชื่อมกับโปรเจกต์ Neon Free ที่มีอยู่ในสิงคโปร์ (PostgreSQL 18)

## แบบที่ใช้

Render Free รัน Docker image เดิมซึ่งเสิร์ฟ React และ Express จาก origin เดียว ใช้ PostgreSQL 17 บน Neon Free เป็นฐานข้อมูลถาวร เลือก Singapore ทั้งสองบริการหากมีให้เลือก ได้ URL `https://<ชื่อจริง>.onrender.com` โดยไม่ต้องซื้อโดเมน

ไฟล์ [render.yaml](../render.yaml) สร้างเฉพาะเว็บ `plan: free` ไม่สร้างฐานข้อมูล Render, disk, worker หรือ cron ที่อาจเสียเงิน แผนนี้เป็นข้อเสนอของผู้พัฒนาตามข้อจำกัด “ฟรีเท่านั้น”

ทางเลือกที่พิจารณา: Render Free + Render Postgres Free ตั้งค่าน้อยกว่า แต่ฐานข้อมูลหมดอายุ 30 วัน จึงไม่เหมาะกับลิงก์ portfolio ระยะยาว การแยก frontend ไป static hosting เพิ่ม origin และการตั้งค่า cookie โดยไม่จำเป็นสำหรับแอปนี้

## เงื่อนไขฟรี (ตรวจเอกสารวันที่ 5 พฤศจิกายน 2026)

- เลือก Free ทั้ง Render web service และ Neon project; ไม่เปิดแผนทดลองเสียเงินหรืออัปเกรด
- Render พักเว็บหลังไม่มี traffic 15 นาที; เปิดใหม่อาจรอประมาณหนึ่งนาที แจ้งผู้ชมใน portfolio
- Render มีชั่วโมง instance, bandwidth และ build minutes จำกัด หากไม่มีวิธีชำระเงินและใช้โควตาหมด บริการหรือ builds จะหยุดแทนคิดเงินเพิ่ม อย่าเพิ่มวิธีชำระเงินสำหรับเดโมนี้ หากขั้นตอนสมัครบังคับบัตร ให้หยุดตรวจเงื่อนไขก่อน
- Neon Free ไม่มีระยะเวลาทดลองหมดอายุ แต่มีโควตา compute/storage/network และพัก compute เมื่อไม่ได้ใช้ ตรวจ Usage เป็นระยะ หากโควตาหมดให้รอรอบใหม่หรือลดการใช้งาน ไม่อัปเกรดอัตโนมัติ
- ไม่ตั้งระบบ ping กันหลับหรือ health checks ภายนอกถี่ ๆ เพื่อรักษาโควตา
- แผนและเงื่อนไขอาจเปลี่ยน นี่เป็นเดโม portfolio ไม่ใช่การรับประกัน uptime สำหรับบริการธุรกิจ

อ้างอิง: [Render Free](https://render.com/docs/free), [Neon pricing](https://neon.com/pricing), [Neon extensions](https://neon.com/docs/extensions/pg-extensions)

## 1. บัญชีและ source repository

ใช้บัญชี GitHub ที่มีอยู่ สมัคร Render และ Neon ด้วยตนเอง แล้วติดตั้ง/เชื่อมปลั๊กอินบริการเหล่านี้ถ้าต้องการให้ agent ดำเนินการต่อ ไม่ส่ง password, API token หรือ connection string ลงแชต

นำ source ขึ้น repository ของคุณก่อนสร้าง Blueprint; เลือก branch ที่มี `render.yaml` และ Dockerfile นี้ ไม่จำเป็นต้องเปลี่ยนชื่อ branch เดิม `feat/labreserve` ตรวจ `.gitignore` และ `git diff --cached` ก่อน push ไม่รวม `.env`, database dump หรือ credentials

พบ repository [KamitomeYuta/LabReserve](https://github.com/KamitomeYuta/LabReserve) ในบัญชี GitHub ที่เชื่อมแล้ว โดย branch main มี source และ Blueprint ที่ใช้ deploy

## 2. Neon Free

สร้าง project ใหม่สำหรับ public demo โดยเฉพาะ เลือก PostgreSQL 17 และ region ใกล้ Render ตั้งชื่อ database `labreserve` หรือใช้ชื่อที่ provider สร้างจริง

คัดลอก connection string แบบ Direct (ไม่ใช้ pooler สำหรับชุดเริ่มต้นนี้) จาก Connect ไปใส่ช่อง secret `DATABASE_URL` ใน Render โดยตรง ใช้ TLS และตรวจ certificate: ตั้ง query parameter `sslmode=verify-full` โดยคงค่า host/database/user/password จริงจาก Neon ไม่ใช้ `rejectUnauthorized: false` หรือ `NODE_TLS_REJECT_UNAUTHORIZED=0` หาก certificate ไม่ผ่านให้แก้ certificate/connection configuration

Migration เดิมสร้าง extension `btree_gist` ซึ่ง Neon รองรับ และใช้ advisory lock กับ transaction ป้องกัน migration ซ้อนกัน

## 3. Render Blueprint

1. เลือก workspace ฟรีและ New → Blueprint เชื่อม repository/branch จากขั้น 1
2. ให้ Render อ่าน `render.yaml` ตรวจ preview ว่ามีเพียง web service หนึ่งตัวและแผน Free ไม่มีทรัพยากรเสียเงิน
3. ใส่ `DATABASE_URL` ของ Neon ในช่อง secret ที่ระบบถาม ไม่ใส่ไว้ใน YAML
4. Deploy ครั้งแรก Dockerfile จะติดตั้ง dependencies และ build ทั้ง frontend/backend
5. คำสั่งเริ่มระบบจะรัน migration ก่อน; หากล้มเหลวจะไม่เริ่ม server จึงไม่รับ traffic ด้วย schema ที่ไม่พร้อม
6. `APP_ORIGIN` ใช้ `RENDER_EXTERNAL_URL` อัตโนมัติ ไม่ต้องเดาชื่อ subdomain ถ้าเปลี่ยนไป custom domain ภายหลังให้ตั้ง APP_ORIGIN เป็น HTTPS origin จริงไม่มี path หรือ slash ท้าย
7. Render สร้าง `CSRF_SECRET` ให้; `NODE_ENV=production` เปิด secure cookies และบังคับ HTTPS ส่วน `TRUST_PROXY=1` ใช้กับทางเข้าผ่าน Render proxy เท่านั้น ไม่เปิด container ให้เข้าถึงตรงด้วยเส้นทางอื่น

Auto-deploy ตั้งเป็น off เพื่อลดการ build ทุก commit: หลัง CI ผ่าน ให้เลือก Manual Deploy สำหรับ commit ที่ตรวจแล้ว เปลี่ยนเป็น `checksPass` ได้ภายหลังเมื่อเชื่อม CI เรียบร้อย

Render Free ไม่มี shell/one-off jobs จึงรัน migration ตอนเริ่มระบบแทน paid pre-deploy job คำสั่งเดิมข้าม migration ที่เคยรันแล้ว ไม่ใช้ seed ที่มีรหัสผ่านสาธารณะบนออนไลน์

Health check ของ provider ใช้ `/health/live` เพื่อไม่ query Neon ทุกไม่กี่วินาที ซึ่งอาจกันฐานข้อมูลพักและกินโควตา ข้อแลกเปลี่ยนคือ provider ไม่ตรวจฐานข้อมูลระหว่างรัน ต้องตรวจ `/health/ready` ในขั้น smoke test ด้านล่าง และดู application errors เมื่อพบปัญหา

## 4. สร้างผู้ดูแลและข้อมูลตัวอย่าง

สร้าง admin หนึ่งครั้งจากเครื่องคุณด้วยสคริปต์เดิม โดยใช้ฐานข้อมูล Neon ตัวใหม่ ให้เก็บ `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` ใน `.env.deploy` ที่ถูก ignore อยู่แล้ว ตั้ง `NODE_ENV=production` ด้วย ไม่ใช้รหัสผ่าน local demo และไม่ commit ไฟล์นี้

```bash
npm run build
node --env-file=.env.deploy apps/api/dist/apps/api/scripts/bootstrap-admin.js
```

รันเมื่อ migration สำเร็จแล้ว คำสั่งสร้างบัญชีใหม่เท่านั้น หากอีเมลมีอยู่จะ fail โดยไม่เลื่อนสิทธิ์ member เดิม อย่ารันซ้ำเพื่อ reset password ลบ ADMIN_PASSWORD จากไฟล์เมื่อสร้างเสร็จ

เข้าเว็บด้วย admin แล้วเพิ่มอุปกรณ์ตัวอย่างผ่านหน้าเว็บ ผู้ชมสมัครบัญชีสมาชิกของตัวเองเพื่อทดลองจองได้ ไม่เผยแพร่บัญชี admin และไม่อัปโหลดข้อมูลส่วนตัวจริงเพื่อใช้เป็นตัวอย่าง

## 5. ตรวจเว็บจริงก่อนใส่ลิงก์ใน portfolio

แทน `<ชื่อจริง>` ด้วย URL จากผล deploy:

```bash
curl --fail --show-error https://<ชื่อจริง>.onrender.com/health/live
curl --fail --show-error https://<ชื่อจริง>.onrender.com/health/ready
```

ต้องได้ `ok` และ `ready` จากนั้นตรวจผ่าน browser:

- เปิดหน้าเว็บบน HTTPS; สมัครสมาชิกและ login ได้
- admin เพิ่มอุปกรณ์; สมาชิกจองได้และมีประวัติ
- ใช้สมาชิกอีกคนจองอุปกรณ์/เวลาที่ซ้อนกัน ต้องได้ข้อผิดพลาด conflict
- สมาชิกดู/ยกเลิกรายการของคนอื่นไม่ได้ และใช้คำสั่ง admin ไม่ได้
- ยกเลิกรายการของตนก่อนเริ่มได้; logout แล้วเข้าหน้าสมาชิกไม่ได้
- ตรวจ cookie `Secure`, `HttpOnly`, `SameSite=Strict` และไม่มี mixed content
- หลัง restart/redeploy ข้อมูลอุปกรณ์และการจองยังอยู่ใน Neon
- ทดสอบเปิดหลังพักระบบ และบันทึกเวลารอจริงไว้ใน README

อย่ารัน integration/E2E ชุด local โดยเปลี่ยน TEST_DATABASE_URL ให้ชี้ public demo: ชุดทดสอบล้างข้อมูลในฐานทดสอบโดยตั้งใจ

## 6. ดูแลและ rollback

ตรวจ Usage ของทั้งสองบริการและเก็บ backup ที่ปลอดภัยเป็นระยะ การ restore drill ใน operations.md ใช้ฐาน local เดิม ไม่ใช่หลักฐานว่า backup บน Neon ถูกตั้งแล้ว

เมื่อ deploy ผิดให้เลือก rollback ไป image ก่อนหน้าที่ schema ยังเข้ากันได้ อย่าย้อน schema หรือ restore ทับข้อมูลเพื่อแก้โค้ดผิดโดยอัตโนมัติ การ migrate ระหว่าง boot เหมาะกับเดโมขนาดเล็กนี้; migration ถัดไปต้องรองรับ app version เดิมระหว่าง rollout

## ผลตรวจของ configuration

ทดสอบ public HTTPS ผ่านหน้าแรกและ API จริง: readiness, สมัครสมาชิก, login, อ่านคลังอุปกรณ์, จอง, ได้ 409 เมื่อเวลาชน, ยกเลิก และ logout แล้วเข้าถึงบัญชีไม่ได้

เอกสารอ้างอิง configuration: [Blueprint](https://render.com/docs/blueprint-spec), [Environment variables](https://render.com/docs/environment-variables), [Health checks](https://render.com/docs/health-checks)
