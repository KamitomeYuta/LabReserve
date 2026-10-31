let csrf: string | undefined;
export class ApiError extends Error { constructor(message:string,public status:number,public requestId?:string){super(message);} }
export async function api<T>(path:string,method='GET',data?:unknown):Promise<T> {
  if(method!=='GET' && !csrf) csrf=(await api<{csrfToken:string}>('/auth/csrf')).csrfToken;
  const response=await fetch(`/api/v1${path}`,{method,credentials:'same-origin',headers:{...(data===undefined?{}:{'Content-Type':'application/json'}),...(method==='GET'?{}:{'X-CSRF-Token':csrf!})},body:data===undefined?undefined:JSON.stringify(data)});
  if(response.status===204) return undefined as T;
  const body=await response.json();
  if(!response.ok) {if(body.error?.code==='CSRF_FAILED') csrf=undefined;throw new ApiError(body.error?.message??'เชื่อมต่อระบบไม่สำเร็จ',response.status,body.error?.requestId);}
  return body as T;
}
