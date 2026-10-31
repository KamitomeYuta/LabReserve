import 'dotenv/config';
import { Pool } from 'pg';
import argon2 from 'argon2';
import { transaction } from '../src/db.js';
if(process.env.NODE_ENV==='production' || process.env.ALLOW_DEMO_SEED!=='1') throw new Error('Demo seed requires ALLOW_DEMO_SEED=1 and non-production mode');
if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const pool=new Pool({connectionString:process.env.DATABASE_URL});
try {
  const hash=await argon2.hash('Local-demo-123!',{type:argon2.argon2id});
  await transaction(pool,async db=> {
    for(const [email,role] of [['admin@labreserve.test','admin'],['member@labreserve.test','member']]) await db.query('INSERT INTO users(email,password_hash,role) VALUES($1,$2,$3) ON CONFLICT(email) DO NOTHING',[email,hash,role]);
    const items=[['CAM-001','กล้อง Mirrorless','เก็บภาพไอเดียให้คมชัด • พร้อมเลนส์ 16–50 mm และแบตเตอรี่'],['OSC-001','Digital Oscilloscope','สำรวจสัญญาณวงจร • 2 channels, 100 MHz'],['PI-001','Raspberry Pi Kit','เริ่มต้นโปรเจกต์ IoT • พร้อมแหล่งจ่ายไฟและ microSD'],['MIC-001','USB Studio Microphone','บันทึกเสียงสำหรับงานนำเสนอ • พร้อมขาตั้ง'],['VR-001','VR Headset','ทดลองประสบการณ์เสมือนจริง • พร้อม controllers'],['LOG-001','Logic Analyzer','ตรวจสัญญาณดิจิทัล • 8 channels พร้อมสายวัด']];
    for(const [code,name,description] of items) await db.query('INSERT INTO equipment(asset_code,name,description) VALUES($1,$2,$3) ON CONFLICT(asset_code) DO NOTHING',[code,name,description]);
  });console.log('Local demo seed ready (existing accounts unchanged)');
} finally {await pool.end();}
