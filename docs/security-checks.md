# การตรวจความปลอดภัยก่อนส่งมอบ LabReserve

[Security workflow](../.github/workflows/security.yml) ทำงานเมื่อเปิดหรืออัปเดต PR เข้า main, push เข้า main และทุกวันจันทร์ 09:23 น. ตามเวลาไทย ผู้ดูแลสั่ง Run workflow จากแท็บ Actions ได้ด้วย การสแกนตามรอบช่วยตรวจ advisory ที่ประกาศหลังการแก้โค้ดครั้งล่าสุด

| เครื่องมือ | สิ่งที่ตรวจ                                                                                | อ่านผลที่ไหน                                                                   |
| ---------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| CodeQL     | วิเคราะห์ JavaScript และ TypeScript เพื่อหาการใช้ข้อมูลที่อาจนำไปสู่ช่องโหว่               | Security → Code scanning และ annotations ของ PR เมื่อพบปัญหาบนบรรทัดที่เปลี่ยน |
| Trivy      | ตรวจแพ็กเกจระบบและไลบรารีใน image ที่สร้างจาก Dockerfile รวมถึงส่วนที่อยู่นอก npm lockfile | Actions → Security → Scan production image → Report findings                   |
| npm audit  | ตรวจ advisory ของ npm dependencies ที่ใช้รันแอป ตั้งแต่ระดับ high ขึ้นไปทำให้ job ล้ม      | [verify workflow](../.github/workflows/ci.yml)                                 |

Trivy รายงาน HIGH และ CRITICAL พร้อมชื่อแพ็กเกจ รุ่นที่ติดตั้ง และรุ่นที่แก้แล้ว เมื่อพบอย่างน้อยหนึ่งรายการที่มีรุ่นแก้ job จะล้ม รายการที่ยังไม่มีรุ่นแก้จะแสดงใน log เพื่อให้ติดตามรอบถัดไป เมื่อพบปัญหาให้ดูว่าแพ็กเกจมาจาก base image หรือ dependencies ของแอป อัปเดตหรือเอาส่วนที่ไม่ใช้ตอนรันออก แล้วดูผลสแกนใหม่บน PR

CodeQL job ที่สำเร็จหมายถึงวิเคราะห์และส่งผลได้ ให้เปิด Code scanning เพื่อตรวจ alerts ด้วย ก่อน merge ให้ตรวจทั้ง Security และ verify การตั้งค่า required checks และการสั่ง deploy อยู่ภายใต้การจัดการของเจ้าของ repository และ Render ตามลำดับ

Workflow ใช้ GitHub-hosted Linux runner ของ public repository และ image ใน runner ชั่วคราว การสแกนใช้สิทธิ์อ่าน source และให้เฉพาะ CodeQL เขียนผล security events ได้ โดยไม่ต้องใช้ข้อมูลรับรอง Neon หรือ Render
