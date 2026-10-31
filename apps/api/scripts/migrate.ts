import 'dotenv/config';
import { Pool } from 'pg';
import { migrate } from '../src/db.js';
if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const pool=new Pool({connectionString:process.env.DATABASE_URL});
try {await migrate(pool);console.log('Migrations applied');} finally {await pool.end();}
