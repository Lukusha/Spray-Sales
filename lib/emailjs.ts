import { ORDER_EMAILS } from './order-notification-targets.ts';

export interface EmailJsConfig {
  EMAILJS_SERVICE_ID?: string;
  EMAILJS_PUBLIC_KEY?: string;
  EMAILJS_TEMPLATE_LUCKY?: string;
  EMAILJS_TEMPLATE_EKA?: string;
  EMAILJS_PRIVATE_KEY?: string;
}
export function emailJsReady(env: EmailJsConfig) {
  return [env.EMAILJS_SERVICE_ID,env.EMAILJS_PUBLIC_KEY,env.EMAILJS_TEMPLATE_LUCKY,env.EMAILJS_TEMPLATE_EKA]
    .every(value=>typeof value==='string' && /^[a-zA-Z0-9_-]{3,100}$/.test(value));
}

export async function sendEmailJs(recipient: string, orderId: string, details: string, env: EmailJsConfig, send: typeof fetch=fetch) {
  // Each provider template also has its recipient fixed. No dynamic destination is sent to EmailJS.
  const template=recipient===ORDER_EMAILS[0]?env.EMAILJS_TEMPLATE_LUCKY:recipient===ORDER_EMAILS[1]?env.EMAILJS_TEMPLATE_EKA:null;
  if(!emailJsReady(env) || !template) return {status:'failed' as const,error:'EmailJS configuration or recipient is invalid.'};
  try {
    const response=await send('https://api.emailjs.com/api/v1.0/email/send',{
      method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(10000),
      body:JSON.stringify({service_id:env.EMAILJS_SERVICE_ID,template_id:template,user_id:env.EMAILJS_PUBLIC_KEY,
        ...(env.EMAILJS_PRIVATE_KEY?{accessToken:env.EMAILJS_PRIVATE_KEY}:{}),
        template_params:{order_id:orderId,order_details:details}}),
    });
    if(response.status===429) return {status:'retry' as const,error:'EmailJS rate limit reached; queued for retry.'};
    if(!response.ok) return {status:response.status>=500?'uncertain' as const:'failed' as const,error:`EmailJS HTTP ${response.status}`};
    const result=await response.text();
    return result.trim()==='OK' ? {status:'submitted' as const,providerId:`emailjs:${orderId}:${template}`}
      : {status:'uncertain' as const,error:'EmailJS acceptance could not be confirmed.'};
  } catch {
    // EmailJS has no idempotency API: do not resend an ambiguous request automatically.
    return {status:'uncertain' as const,error:'EmailJS response was lost; check its Email History before resending.'};
  }
}
