import 'dotenv/config';
import { Pool } from 'pg';
import { createApp } from './app.js';
import { readConfig } from './config.js';
const config=readConfig();
const pool=new Pool({connectionString:config.databaseUrl,max:10,connectionTimeoutMillis:5000,statement_timeout:10000});
pool.on('error',()=>console.error('Unexpected idle database connection error'));
const server=createApp(pool,config).listen(config.port,'0.0.0.0',()=>console.log(`LabReserve listening on port ${config.port}`));
function shutdown() {
  server.close(()=>{void pool.end().then(()=>process.exit(0));});
  setTimeout(()=>process.exit(1),10000).unref();
}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
