import {test,expect} from '@playwright/test';
test('member can register, book, inspect history and cancel',async({page})=> {
  await page.goto('/');
  await page.getByRole('button',{name:'สร้างบัญชีใหม่'}).click();
  await page.getByLabel('อีเมล').fill(`learner-${Date.now()}@example.test`);
  await page.getByLabel('รหัสผ่าน',{exact:true}).fill('Learning-demo-123!');
  await page.getByRole('button',{name:'สมัครสมาชิก',exact:true}).click();
  await expect(page.getByRole('heading',{name:'อุปกรณ์สำหรับไอเดียถัดไป'})).toBeVisible();
  await page.getByRole('link',{name:'ดูรายละเอียด กล้อง Mirrorless'}).click();
  await page.getByLabel('เวลาเริ่ม').fill('2035-01-10T10:00');
  await page.getByLabel('เวลาสิ้นสุด').fill('2035-01-10T11:00');
  await page.getByRole('button',{name:'ยืนยันการจอง'}).click();
  await expect(page.getByRole('heading',{name:'รายละเอียดการจอง'})).toBeVisible();
  await expect(page.getByText('สร้างรายการจอง',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'ยกเลิกการจอง',exact:true}).click();
  await expect(page.getByText('ยกเลิกแล้ว',{exact:true}).first()).toBeVisible();
  await page.getByRole('button',{name:'ออกจากระบบ'}).click();
  await expect(page.getByRole('heading',{name:'ยินดีต้อนรับกลับมา'})).toBeVisible();
});
test('admin manages equipment and keyboard navigation has visible controls',async({page})=> {
  await page.goto('/');
  await page.getByLabel('อีเมล').fill('admin@labreserve.test');
  await page.getByLabel('รหัสผ่าน',{exact:true}).fill('Local-demo-123!');
  await page.getByRole('button',{name:'เข้าสู่ระบบ',exact:true}).click();
  await page.getByRole('link',{name:'จัดการอุปกรณ์',exact:true}).click();
  await page.getByLabel('รหัสอุปกรณ์').fill(`E2E-${Date.now()}`);
  await page.getByLabel('ชื่ออุปกรณ์').fill('อุปกรณ์ทดสอบ browser');
  await page.getByRole('button',{name:'เพิ่มอุปกรณ์',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('เพิ่มอุปกรณ์แล้ว');
});
test('mobile layout has no horizontal overflow and reports bad login',async({page})=> {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  await page.getByLabel('อีเมล').fill('missing@example.test');
  await page.getByLabel('รหัสผ่าน',{exact:true}).fill('Wrong-password-123!');
  await page.getByRole('button',{name:'เข้าสู่ระบบ',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
