import {timingSafeEqual, createHmac} from 'node:crypto';
import {requireChurchAdmin} from './admin-auth';
import {getCurrentChurch, churchIsEntitled} from './tenant';
export class AppError extends Error { constructor(message,status=400){super(message);this.status=status;} }
// Lesson Builder is leadership-only: callers must be a signed-in church admin
// (or platform super-admin), and church leaders need an active subscription.
export async function authorize(){
 if(!process.env.APP_ACCESS_PASSWORD)throw new AppError('Set APP_ACCESS_PASSWORD in server environment variables.',503);
 const ctx=await requireChurchAdmin();
 if(!ctx)throw new AppError('Lesson Builder is available to church leaders only.',403);
 if(!ctx.isSuperAdmin&&!churchIsEntitled(await getCurrentChurch()))throw new AppError('Your church needs an active subscription to use Lesson Builder.',402);
 return ctx;
}
export async function readBody(request){
 const raw=await request.text();
 if(Buffer.byteLength(raw)>150000)throw new AppError('Lesson exceeds the 150 KB request limit.',413);
 try{return JSON.parse(raw);}catch{throw new AppError('Invalid JSON.');}
}
export async function providerJSON(url,options){
 let response;
 try{response=await fetch(url,{...options,cache:'no-store',signal:AbortSignal.timeout(55000)});}catch{throw new AppError('Provider did not respond. Please try again.',502);}
 let body;try{body=await response.json();}catch{throw new AppError('Provider returned an unreadable response.',502);}
 if(!response.ok||body.error)throw new AppError('Provider rejected the request. Check your API key, account credits, model or avatar settings.',502);
 return body;
}
export function errorResponse(error){return Response.json({error:error instanceof AppError?error.message:'The request could not be completed. Check the entered lesson and server configuration.'},{status:error instanceof AppError?error.status:400});}
export function signJob(id){
 const data=Buffer.from(JSON.stringify({id,expires:Date.now()+7*24*60*60*1000})).toString('base64url');
 return data+'.'+createHmac('sha256',process.env.APP_ACCESS_PASSWORD).update(data).digest('base64url');
}
export function readJob(token){
 const [data,sig]=token.split('.');
 if(!data||!sig)throw new AppError('Invalid video job.');
 const expected=createHmac('sha256',process.env.APP_ACCESS_PASSWORD).update(data).digest('base64url');
 if(sig.length!==expected.length||!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))throw new AppError('Invalid video job.');
 let parsed;try{parsed=JSON.parse(Buffer.from(data,'base64url').toString());}catch{throw new AppError('Invalid video job.');}
 if(typeof parsed.id!=='string'||!Number.isFinite(parsed.expires)||parsed.expires<Date.now())throw new AppError('Video job expired.');
 return parsed.id;
}
