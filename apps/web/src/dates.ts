export function bangkokToIso(value: string): string {
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('กรุณาระบุวันและเวลา');
  const date=new Date(`${value}:00+07:00`);
  if(!Number.isFinite(+date) || new Date(+date+7*3600000).toISOString().slice(0,16)!==value) throw new Error('วันหรือเวลาไม่ถูกต้อง');
  return date.toISOString();
}
export const displayDate=(value:string)=>new Intl.DateTimeFormat('th-TH',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Bangkok'}).format(new Date(value));
export const localDate=(date:Date)=>new Date(+date+7*3600000).toISOString().slice(0,16);
