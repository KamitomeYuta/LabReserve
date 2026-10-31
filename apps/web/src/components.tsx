import {useEffect,useState} from 'react';
import {AlertCircle,ArrowLeft,ArrowRight,LoaderCircle} from 'lucide-react';
import {ApiError} from './api.js';
export function ErrorNotice({error}:{error:unknown}) { if(!error)return null;return <div role="alert" className="notice error"><AlertCircle size={18}/><div>{error instanceof Error?error.message:'เกิดข้อผิดพลาด กรุณาลองใหม่'}{error instanceof ApiError&&error.status>=500&&<small>Request ID: {error.requestId}</small>}</div></div>; }
export function Loading(){return <div className="loading" role="status"><LoaderCircle className="spin" size={22}/> กำลังโหลดข้อมูล…</div>;}
export function Pagination({page,total,pageSize,onChange}:{page:number;total:number;pageSize:number;onChange:(page:number)=>void}) {return <div className="pagination"><span>ทั้งหมด {total} รายการ</span><div><button className="icon-button" aria-label="หน้าก่อนหน้า" disabled={page===1} onClick={()=>onChange(page-1)}><ArrowLeft size={18}/></button><span>หน้า {page}</span><button className="icon-button" aria-label="หน้าถัดไป" disabled={page*pageSize>=total} onClick={()=>onChange(page+1)}><ArrowRight size={18}/></button></div></div>;}
export function useLoad<T>(load:()=>Promise<T>,key:string){
  const [data,setData]=useState<T>();const [error,setError]=useState<unknown>();const [busy,setBusy]=useState(true);const [revision,setRevision]=useState(0);
  useEffect(()=>{let active=true;setBusy(true);setError(undefined);load().then(v=>{if(active)setData(v);}).catch(e=>{if(active)setError(e);}).finally(()=>{if(active)setBusy(false);});return()=>{active=false;};},[key,revision]);
  return {data,error,busy,reload:()=>setRevision(n=>n+1)};
}
