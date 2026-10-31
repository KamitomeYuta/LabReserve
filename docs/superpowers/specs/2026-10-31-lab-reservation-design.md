# LabReserve — แบบระบบและชุดบทเรียน

สถานะ: รอผู้ใช้อนุมัติแบบ ก่อนเริ่ม implementation

## เป้าหมายและข้อตกลง

สร้างระบบจองอุปกรณ์ห้องแล็บที่รันได้ พร้อมบทเรียนภาษาไทยสำหรับผู้เริ่มต้น Software Development ผู้ช่วยรับผิดชอบ implementation, tests, เอกสาร และแบบฝึกหัด ผู้ใช้เรียนจากระบบและทดลองแก้ไขเอง ผู้ใช้เลือก TypeScript + React + Node.js + PostgreSQL และรูปแบบระบบสมบูรณ์พร้อมบทเรียนเรียงลำดับแล้ว

เป้าหมายคือแสดงพื้นฐานและวิธีทำงานที่ตรวจสอบได้ ไม่อ้างว่ารองรับ production scale หรือเคยมีผู้ใช้จริงโดยไม่มีหลักฐาน ระบุส่วนที่ AI ช่วยสร้าง และสนับสนุนให้ผู้ใช้บันทึกสิ่งที่ตนทดลองและแก้เองเพื่อใช้ในการสัมภาษณ์

## ทางเลือกที่พิจารณา

1. ระบบสมบูรณ์พร้อมบทเรียนเรียงลำดับ: ผู้ใช้เลือกทางนี้ เห็นภาพระบบและ demo ได้ก่อน มีเอกสารนำอ่านโค้ดเพื่อลดความซับซ้อน
2. หลายเวอร์ชันตามบทเรียน: เห็นพัฒนาการชัด แต่เพิ่มภาระสลับเวอร์ชันและดูแลตัวอย่างหลายชุด

## ขอบเขตระบบ (ข้อเสนอของผู้ช่วย)

- แอปเว็บชื่อ LabReserve เน้น desktop และใช้งานผ่านมือถือได้ หน้าตาภาษาไทย เอกสารภาษาไทย identifiers ในโค้ดภาษาอังกฤษ
- อุปกรณ์หนึ่งรายการหมายถึงของจริงหนึ่งชิ้นที่มี asset code ไม่ทำ stock แบบจำนวนรวม
- สมาชิกลงทะเบียน เข้าสู่ระบบ ออกจากระบบ ดูอุปกรณ์และช่วงว่าง จอง ดูรายการของตน และยกเลิกได้
- ผู้ดูแลสร้าง/แก้ไขข้อมูลอุปกรณ์ เปิดหรือปิดรับจอง ดูรายการจองทั้งหมด และยกเลิกรายการพร้อมเหตุผลได้
- ไม่มีหน้าสมัครผู้ดูแล บัญชีผู้ดูแลสร้างด้วยคำสั่ง bootstrap; seed สำหรับ demo ใช้เฉพาะ local/test และแยกจาก production
- รายการจองยืนยันอัตโนมัติ ไม่มีขั้นอนุมัติ ชำระเงิน ส่งอีเมล อัปโหลดไฟล์ หรือ workflow รับคืนในรุ่นแรก
- ประวัติการจองเก็บผู้กระทำ เวลา และเหตุผลการยกเลิก ไม่บันทึกรหัสผ่าน session token หรือข้อมูลลับ
- ปิดรับจองอุปกรณ์แล้วรายการจองเดิมยังอยู่ ผู้ดูแลยกเลิกอย่างชัดเจนหากจำเป็น ไม่ลบข้อมูลที่มีประวัติ

## กติกาการจอง

- จองเป็นช่วงเวลาเริ่มและสิ้นสุด โดย start < end และ start ต้องไม่อยู่ในอดีต ณ เวลาประมวลผลคำขอ
- ขอบเขตช่วงเป็น [start, end) ทำให้จองต่อกันตรงเวลาสิ้นสุดได้
- เวลารับและส่ง API เป็น ISO 8601 ที่มี offset เก็บฐานข้อมูลเป็น timestamptz แสดงและรับค่าหน้าจอใน Asia/Bangkok พร้อมป้ายเขตเวลา
- สมาชิกยกเลิกได้ก่อนเวลาเริ่มเท่านั้น ผู้ดูแลยกเลิกได้ก่อนเวลาสิ้นสุดพร้อมเหตุผล
- สถานะที่บันทึกคือ confirmed/cancelled; upcoming/active/completed คำนวณจากเวลาเพื่อไม่พึ่ง scheduled jobs
- เปลี่ยนช่วงเวลาโดยยกเลิกแล้วจองใหม่ รุ่นแรกไม่มีแก้เวลารายการเดิม
- PostgreSQL exclusion constraint บน equipment_id และ tstzrange เฉพาะ confirmed ป้องกันช่วงซ้อนกันที่ชั้นฐานข้อมูล ใช้ btree_gist ผ่าน migration
- ใช้ transaction และ lock แถวอุปกรณ์ร่วมกันในกระบวนการจองและปิดรับจอง เพื่อให้พฤติกรรมกรณีเกิดพร้อมกันแน่นอน
- การจองที่ชนกันตอบ 409; ข้อมูลผิดตอบ 400; ไม่ login ตอบ 401; ไม่มีสิทธิ์ตอบ 403 หรือ 404 ตาม resource visibility
- ทุกการเปลี่ยนสถานะและ event ประวัติที่เกี่ยวข้องเขียนใน transaction เดียวกัน

## สถาปัตยกรรมและเครื่องมือ

ใช้ monorepo แบบ npm workspaces: apps/web (React + Vite), apps/api (Node.js + Express), packages/contracts (ชนิดข้อมูล/schema ที่จำเป็น), docs และ examples สำหรับแบบฝึกพื้นฐานที่แยกจากแอป

- TypeScript strict; เลือก Node LTS และ package versions ที่เข้ากันได้ตอน implementation พร้อม lockfile
- Backend แบ่ง route/controller, service สำหรับกติกา และ repository สำหรับ SQL; แบ่งโมดูลตาม auth/equipment/reservations
- PostgreSQL ใช้ parameterized SQL ผ่าน pg และ SQL migrations เพื่อให้อ่าน SQL/transaction จริงได้ ไม่ใช้ ORM ในรุ่นแรก
- ตรวจ input ที่ runtime ด้วย schema validation; TypeScript ไม่แทน validation
- API อยู่ใต้ /api/v1 และมี OpenAPI documentation พร้อมตัวอย่าง error ที่มี code, message และ requestId
- Production build ให้ Express เสิร์ฟ frontend ที่ build แล้วเพื่อเป็น origin เดียว; development ใช้ Vite proxy
- ใช้ database-backed session, cookie HttpOnly/SameSite/Secure ตาม environment, CSRF protection สำหรับคำขอเปลี่ยนข้อมูล และ password hashing ด้วย library มาตรฐาน ไม่เขียน crypto เอง
- ใช้ role/ownership authorization ที่ server ทุกครั้ง พร้อม rate limit จุด login/register; รองรับ deployment instance เดียวในขอบเขตแรก
- Structured logs + requestId, liveness และ readiness endpoint ที่ไม่เผยข้อมูลลับ; graceful shutdown
- Docker Compose สำหรับแอปและฐานข้อมูล, GitHub Actions สำหรับ lint/typecheck/tests/build, Vitest สำหรับ unit/integration และ Playwright สำหรับ browser tests
- รูปแบบ UI รายละเอียด library ย่อย และชื่อไฟล์ให้ผู้ implement ตัดสินใจได้ โดยรักษาความเรียบง่าย keyboard access, labels, loading/empty/error states

## แบบข้อมูล

- users: id, email unique ที่ normalize, password_hash, role, timestamps
- sessions: token hash/identifier ตาม session library, user_id, expiry และข้อมูลเท่าที่จำเป็น
- equipment: id, asset_code unique, name, description, active, timestamps
- reservations: id, equipment_id, user_id, start_at, end_at, status, cancellation_reason, timestamps
- reservation_events: reservation_id, actor_id, event_type, timestamp, metadata ที่จำกัด schema

ทุกตารางมี constraints/index ตาม query และ foreign keys; ไม่ expose password_hash หรือ session data ผ่าน DTO

## หน้าจอหลัก

เข้าสู่ระบบ/สมัครสมาชิก, รายการอุปกรณ์พร้อมค้นหาและแบ่งหน้า, รายละเอียดและฟอร์มจอง, การจองของฉันและรายละเอียดประวัติ, หน้าผู้ดูแลสำหรับอุปกรณ์และรายการจอง ระบบใช้เวลาและ validation ที่เข้าใจง่ายพร้อมข้อความข้อผิดพลาดที่แก้ไขได้

## เกณฑ์รับงานและหลักฐาน

1. เครื่องใหม่ที่มี prerequisites ตาม README รันผ่าน Docker Compose ได้ และมีเส้นทาง local development ชัดเจน
2. สมาชิกทำ flow สมัคร/login/จอง/ยกเลิก/logout ได้; ผู้ดูแลจัดการอุปกรณ์และรายการได้
3. Test ส่งคำขอจองช่วงชนกันพร้อมกันกับ PostgreSQL จริง ต้องสำเร็จเพียงหนึ่งคำขอและอีกคำขอได้ 409; ช่วงติดกันและรายการ cancelled ไม่ขวางการจอง
4. มี tests สำหรับสิทธิ์ข้ามบัญชี, admin-only operations, เวลา/ช่วงผิด, cancellation rules, CSRF/session และ input validation ที่เกี่ยวข้อง
5. มี integration tests สำหรับ transaction rollback เพื่อไม่ให้เกิดประวัติหรือสถานะค้างบางส่วน และกรณีปิดรับจอง
6. Browser tests ครอบคลุมเส้นทางหลักและ UI error; ตรวจ responsive/keyboard ด้วย ไม่ใช้ coverage percentage เป็นหลักฐานคุณภาพเพียงอย่างเดียว
7. CI ตรวจ formatting/lint/typecheck/unit/integration/browser/build ตามความเหมาะสม พร้อมบันทึกผลที่รันจริง
8. มี demo seed local, API docs, architecture/ER diagram, ADRs และ known limitations
9. มีคู่มือ deploy, migration, rollback, backup/restore และรายงานทดลอง restore ใน local ที่ตรวจข้อมูลหลัง restore จริง
10. มี load-test script และรายงานที่ระบุ environment, dataset, concurrency, duration, latency และ errors; ไม่แต่งผลและไม่เรียก local benchmark ว่า production capacity

## บทเรียนภาษาไทย

ทุกบทมี prerequisites, เป้าหมาย, ไฟล์ที่ต้องอ่าน, คำสั่งทดลอง, ผลที่ควรเห็น, ข้อผิดพลาดที่พบบ่อย, คำถามตรวจความเข้าใจ และแบบฝึกพร้อมเฉลยแยกไฟล์ ไม่ต้องให้ผู้ใช้เรียนทั้งหมดก่อนลอง demo

0. เปิด demo และติดตามหนึ่งคำขอจาก browser ถึง database
1. JavaScript: ตัวแปร function array/object เงื่อนไข error และโปรแกรม CLI จัดการอุปกรณ์ขนาดเล็ก
2. Git, terminal, npm และ debugging เบื้องต้น
3. TypeScript: types, unions, narrowing และความต่างระหว่าง compile-time/runtime
4. HTTP/JSON/async-await และ browser DevTools
5. SQL: schema, join, constraints, index, transaction และ parameterized query
6. Express API: validation, error handling และแยกความรับผิดชอบ
7. Authentication, authorization, session และ CSRF
8. การจองพร้อมกัน: สาธิตวิธีที่มี race condition ใน lab แยก แล้วเทียบวิธีแก้ในแอปจริง
9. React: components, state, forms, API และ loading/error states
10. Testing: unit/integration/E2E พร้อมแบบฝึกทำ test ให้ล้มเหลวและแก้
11. Docker, CI, deployment, logs, migration และ backup/restore
12. อ่าน architecture trade-offs, เพิ่มฟีเจอร์เล็กด้วยตัวเอง และเขียน portfolio อย่างตรงกับสิ่งที่ทำจริง

แบบฝึกหัดไม่เปลี่ยนค่าเริ่มต้นของแอปและไม่ใส่ช่องโหว่ตัวอย่างใน production code path; ทุกคำสั่งต้องระบุ working directory และไม่แนะนำให้ลบข้อมูลจริง

## ขอบเขต deployment และข้อจำกัด

ส่งมอบ local system ที่ตรวจสอบได้และเอกสาร deployment แบบ provider-neutral ก่อน ไม่มีบัญชี cloud/domain หรือ credentials ที่ผู้ใช้ให้ไว้ จึงไม่สร้าง resource เสียเงิน ไม่เปิด public endpoint และไม่อ้างว่า deploy ออนไลน์แล้ว

ยังไม่ทำ Kubernetes, microservices, Redis, distributed queue, multi-region/HA, password reset email หรือ SSO หากนำไปเปิดสมัครสาธารณะจริงต้องทบทวน account recovery/email verification, abuse protection, privacy/retention, TLS, shared rate limits เมื่อ scale และนโยบาย backup ตามสภาพแวดล้อม ระบุขอบเขตนี้ใน README อย่างตรงไปตรงมา

## ขั้นตอนถัดไป

ให้ reviewer ตรวจความครบถ้วนของแบบ ปรับประเด็นที่ผู้ช่วยตัดสินใจได้ จากนั้นขอผู้ใช้อนุมัติแบบ แล้วเขียน implementation plan ก่อนเริ่มสร้างแอป พื้นที่ปัจจุบันยังไม่เป็น Git repository จึงยังไม่มีการ commit แบบนี้ การตั้ง Git repository เป็นส่วนหนึ่งของขั้น implementation
