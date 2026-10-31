import {expect,it} from 'vitest';
import {readConfig} from '../src/config.js';
const env={DATABASE_URL:'postgres://example:example@localhost/test',APP_ORIGIN:'http://localhost:3000',CSRF_SECRET:'a'.repeat(32)};
it('rejects insecure production origins and short secrets',()=> {
  expect(()=>readConfig({...env,NODE_ENV:'production'})).toThrow('HTTPS');
  expect(()=>readConfig({...env,CSRF_SECRET:'short'})).toThrow();
  expect(()=>readConfig({...env,APP_ORIGIN:'https://example.test/path'})).toThrow();
});
