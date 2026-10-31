// Direct Cloudflare hosting must not trust Sites identity headers supplied by a visitor.
export async function verifyMerchantPassword(request: Request, password: string) {
  const auth=request.headers.get('authorization');
  if(!auth?.startsWith('Basic ') || auth.length>4096 || password.length<20) return false;
  let supplied: string;
  try {supplied=new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(auth.slice(6)),c=>c.charCodeAt(0)));} catch {return false;}
  const digest=async (s:string)=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
  const [actual,expected]=await Promise.all([digest(supplied),digest('admin:'+password)]);
  let difference=0;
  for(let i=0;i<expected.length;i++) difference|=actual[i]^expected[i];
  return difference===0;
}
