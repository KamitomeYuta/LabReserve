# Final code review — 1 พฤศจิกายน 2026

Reviewer อิสระตรวจโค้ดตั้งแต่ commit 673c0f6 ถึง c13ccf0 แบบ read-only ไม่พบ Critical findings และพบ Important 2 ข้อ ซึ่งแก้แล้ว:

1. **CSRF comparison:** เปรียบเทียบความยาว Buffer ก่อน timingSafeEqual แทนความยาว JavaScript string เพิ่ม HTTP regression ที่ใช้ non-ASCII header ผลก่อนแก้เป็น 500 (test ต้องการ 403) หลังแก้เป็น 403 และ session เดิมยังใช้งานได้ Integration suite ผ่าน 15/15
2. **บทเรียน TypeScript:** เพิ่ม examples/tsconfig.json ใน npm run typecheck ทดลองใส่ borrowed เป็น string ใน Item: ก่อนแก้ไม่ถูกตรวจ หลังแก้ได้ TS2322 ตามที่บทเรียนอธิบาย แล้วนำ temporary probe ออกและตรวจ suite ปกติ

ไม่ได้ขอ reviewer ตรวจซ้ำ ผลแก้ยืนยันด้วย regression และการตรวจทั้งชุด

## Minor ที่ยังคงไว้

- Browser tests บันทึกภาพลง docs/images โดยตรง ภาพ catalog มีชื่อบัญชีตาม timestamp จึงอาจทำให้ Git แสดง binary diff หลังรัน แม้ระบบทำงานเหมือนเดิม ควรย้ายไป test output และมีคำสั่งอัปเดตภาพเอกสารแยกในรอบถัดไป ไม่กระทบข้อมูล demo เพราะ browser fixtures ใช้ฐานแยก

## ข้อเสนอเพิ่มเติมจาก reviewer

- เพิ่ม deterministic synchronization ใน disable/book test เพื่อยืนยันว่า request รอ lock จริงก่อนปล่อย transaction ปัจจุบัน test ยืนยันผลปฏิเสธหลังปิดรับจอง และมี exclusion test แยก แต่ยังไม่ pin ทุก interleaving
- เพิ่มการจำลอง history insert ล้มเหลวขณะยกเลิก ปัจจุบันมี rollback test ฝั่งสร้างรายการ และ implementation ฝั่งยกเลิกใช้ transaction helper เดียวกัน

## การตัดสินใจและขอบเขต

- เริ่ม repository ใหม่บน feat/labreserve ใน workspace ว่าง ไม่สร้าง worktree ซ้อน จึงไม่มีงานเดิมบน main ที่ถูกแก้
- ดำเนิน implementation ต่อโดยไม่ขออนุมัติแผนซ้ำ เพราะผู้ใช้อนุมัติให้วางแผนและพัฒนาจนจบแล้ว
- เก็บ advisory ของ minimatch ใน dev tooling ไว้ในรายงาน ไม่ force override major version ที่อาจทำให้ ESLint เสีย Runtime audit ที่รันก่อนหน้าพบ 0 vulnerabilities; dev tooling ยังมีความเสี่ยง moderate เมื่อรับ hostile globs
- Public deployment, email recovery/verification, HA และ distributed rate limiting อยู่นอกแบบรุ่นนี้ ก่อนใช้งานสาธารณะต้องออกแบบและตรวจเพิ่มเติม
- ผล load/restore เป็นการทดลอง local ขนาดเล็ก ไม่อ้าง production capacity หรือ RTO/RPO จริง
- Reviewer ไม่ได้รัน full suite ซ้ำเอง ผู้ implement เป็นผู้รันและบันทึกผลใน verification.md
- ย้ายสภาพแวดล้อมส่งมอบมาใช้ Compose พอร์ต 55432 ตาม README และแยกฐานทดสอบ; หยุด container ทดลองเดิมโดยเก็บข้อมูลไว้
- เก็บ branch และ workspace ไว้ให้เรียนต่อ ไม่มี remote repository จึงไม่มีการ push, PR หรือ merge ไปยัง branch อื่น

## จุดเริ่มต้นของผู้เรียน

อ่านบท 00 แล้วลอง demo จากนั้นทำบท 01–12 ตามลำดับ จดสิ่งที่ทดลองเองและปัญหาที่แก้เองแยกจากโค้ดตั้งต้นที่ AI ช่วยสร้าง
