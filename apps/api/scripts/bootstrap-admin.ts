import 'dotenv/config';
import { Pool } from 'pg';
import argon2 from 'argon2';
import { credentialsSchema } from '../../../packages/contracts/src/index.js';
if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const data=credentialsSchema.parse({email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD});
const pool=new Pool({connectionString:process.env.DATABASE_URL});
try {
  const hash=await argon2.hash(data.password,{type:argon2.argon2id});
  await pool.query("INSERT INTO users(email,password_hash,role) VALUES($1,$2,'admin')",[data.email,hash]);
  console.log('Administrator created');
} finally {await pool.end();}
