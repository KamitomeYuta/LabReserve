# ผลการตรวจและข้อจำกัด

## หลักฐานจากเดโมและ GitHub Actions

- **6 พฤศจิกายน 2026** — ทดสอบผ่าน HTTPS บน Render และ Neon ครอบคลุมสมัครสมาชิก เข้าสู่ระบบ จอง ปฏิเสธช่วงเวลาซ้อน ยกเลิก และออกจากระบบ [รายละเอียดการ deploy](deploy-free.md)
- **7 พฤศจิกายน 2026** — CI ของ PR #4 ผ่าน รวมถึงเทสต์อ่านคำอธิบายจากฐานข้อมูลหลังปิดและเปิดรับจอง เวอร์ชันที่แก้ถูก deploy บนเดโมแล้ว [ผล CI](https://github.com/KamitomeYuta/LabReserve/actions/runs/42258299080) · [กรณีศึกษา](case-studies/equipment-description.md)

## บันทึกจากเครื่องพัฒนาเมื่อ 1 พฤศจิกายน 2026

ผล load/restore ด้านล่างบันทึกเมื่อ 31 ตุลาคม 2026; ดู [ผล code review และข้อแก้ไข](review.md)

## สิ่งที่รันจริง

| การตรวจ                     | ผลการตรวจ                                                                                                                                    |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit tests                  | 10 ผ่าน: กติกาเวลา, config, เวลาไทย และ inventory example                                                                                    |
| PostgreSQL integration      | 15 ผ่าน: sessions/CSRF, authorization, concurrent booking, exclusion โดยตรง, disable/book, rollback, cancellation และ HTTP/health boundaries |
| Chromium E2E                | 4 ผ่าน: สมัคร–จอง–ยกเลิก, ผู้ดูแล, mobile error/overflow และ conflict UI                                                                     |
| TypeScript / ESLint / build | ผ่านหลังแก้ review findings                                                                                                                  |
| Docker Compose clean build  | แอปและ PostgreSQL healthy; seed ทำงาน                                                                                                        |
| Runtime dependency audit    | 0 vulnerabilities จาก npm audit --omit=dev ในวันที่ตรวจ                                                                                      |
| Restore drill               | pg_dump/pg_restore ไปฐานใหม่ สำเร็จและ fingerprint ตรง                                                                                       |
| Race lab                    | naive 2 แถว; constraint 1 สำเร็จ/1 ถูกปฏิเสธ เหลือ 1 แถว                                                                                     |

## สภาพแวดล้อม

- macOS ARM64; host Node v26.10.0, npm 11.19.1
- Docker image ใช้ Node 24 บน Debian slim; PostgreSQL 17 Alpine
- ส่งมอบบน Compose PostgreSQL พอร์ต 55432 โดยแยกฐาน demo, integration, E2E และ race lab
- ช่วงทดลองวันที่ 31 ตุลาคมใช้ Compose demo DB พอร์ต 55433; ปรับกลับค่ามาตรฐานและรันทดสอบซ้ำวันที่ 1 พฤศจิกายน
- Demo UI/API พอร์ต 3000; browser test server แยกพอร์ต 3100
- ณ วันที่บันทึกผล local (1 พฤศจิกายน) การทดสอบรอบนั้นรันบนเครื่องพัฒนา ผล GitHub Actions หลังเผยแพร่แสดงไว้ด้านบน

## Local read microbenchmark

เวลาเริ่มตามผลสคริปต์: 2026-10-31T14:52:50Z (21:52 น. เวลาไทย)

Workload: สมาชิก login แล้ว GET /equipment?pageSize=12; dataset อุปกรณ์ 6 ชิ้น, สมาชิก seed 2 บัญชี; 200 requests, concurrency 5, ไม่มี errors; รวม 170 ms, p50=3.32 ms, p95=6.69 ms, p99=32.75 ms, throughput ประมาณ 1176 requests/s

นี่เป็นการทดลองสั้นมากบน loopback และ cache อุ่น ไม่ใช่ stress/soak test ไม่ครอบคลุม writes หรือผู้ใช้จริง และไม่ใช้เป็นหลักฐาน production capacity รัน `npm run load:test` เพื่อวัดซ้ำบนเครื่องของคุณ โดยบันทึกเครื่อง/dataset/workload ทุกครั้ง

## Restore drill

สำรองฐาน demo ที่หยุดการเขียนระหว่างทดลองไป `.local/backups/` แล้ว restore ลงฐานใหม่ `labreserve_restore_20261031215253` ใช้เวลารวมประมาณ 1 วินาที ข้อมูลหลัง restore: users=2, equipment=6, reservations=0, events=0 และ fingerprint ตรงกับ source

ผลนี้พิสูจน์การกู้ข้อมูล demo ขนาดเล็ก ยังไม่ใช่การรับรอง RTO/RPO สำหรับระบบจริง และยังไม่ทดสอบ recovery จากฐานใหญ่หรือ network/storage failure

## ข้อจำกัดที่ต้องรู้

- Local demo ไม่ใช่ public-production deployment; ไม่มี HA, autoscaling, SSO, email verification หรือ password recovery
- Rate limit อยู่ใน memory ของ instance เดียว รีเซ็ตเมื่อ restart
- มี structured logs และ health endpoints แต่ยังไม่มี metrics exporter, alerting หรือ dashboard สำเร็จรูป
- ไม่มีการแก้เวลารายการเดิม ให้ยกเลิกแล้วจองใหม่ ไม่มี email notifications, file uploads หรือการชำระเงิน
- Availability คืนสูงสุด 200 ช่วงที่ชนกัน ใช้แจ้งว่ามี conflict; ไม่ใช่ calendar export แบบครบไม่จำกัด
- Tests ช่วยพิสูจน์กรณีที่ระบุ ไม่ใช่ security audit หรือการรับรอง ASVS ทั้งชุด
- Google Fonts เป็นส่วนเสริม; เมื่อ offline ใช้ system-font fallback
- Full dependency audit ยังรายงาน moderate ใน minimatch ผ่านชุด ESLint/typescript-eslint (dev-only); runtime audit ไม่พบรายการ ไม่มีการ force downgrade/override ที่เสี่ยงทำลายเครื่องมือเพื่อทำให้ audit เป็นศูนย์

## ความโปร่งใสในการพัฒนา

เขียน tests ก่อน implementation หลักและบันทึกการรันที่ล้มเพราะ module/behavior ยังไม่มี จากนั้นตรวจ green กับ implementation จริง บาง tests สำหรับขอบเขตเพิ่มเติมเขียนหลังโค้ดมีอยู่แล้ว จึงไม่อ้างว่าทุก test ผ่าน strict red–green ตั้งแต่ต้น ตรวจ review findings ด้วย regression tests ตามผลที่พบ

โค้ดตั้งต้นและบทเรียนสร้างโดย AI ตามแบบที่เจ้าของโปรเจกต์อนุมัติ ผู้เรียนควรระบุสิ่งที่อ่าน ทดลอง และแก้เองตามจริง ดู docs/portfolio.md
