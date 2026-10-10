import {authorize,readBody,providerJSON,errorResponse,AppError,signJob,readJob} from '../../../lib/server';
export const runtime='nodejs';
export const maxDuration=60;
const BASE='https://api.weryai.com/v1/generation';
function headers(){if(!process.env.WERYAI_API_KEY)throw new AppError('Set WERYAI_API_KEY on the server.',503);return {Authorization:'Bearer '+process.env.WERYAI_API_KEY,'Content-Type':'application/json'};}
function buildPrompt(title,script){
 const intro='Reverent, cinematic biblical scene illustrating the lesson'+(title?' "'+title.slice(0,100)+'"':'')+'. Warm natural light, historically grounded setting, no on-screen text. Scene inspired by: ';
 return (intro+script.replace(/\s+/g,' ').trim()).slice(0,2000);
}
export async function POST(request){
 try{
  authorize(request);
  const body=await readBody(request);
  if(body.reviewed!==true)throw new AppError('Review and approve the narration before generating a video.');
  if(typeof body.script!=='string'||!body.script.trim()||body.script.length>4500)throw new AppError('Narration must contain 1-4500 characters.');
  const title=typeof body.title==='string'?body.title:'';
  const duration=Number.parseInt(process.env.WERYAI_DURATION||'10',10);
  const json=await providerJSON(BASE+'/text-to-video',{method:'POST',headers:headers(),body:JSON.stringify({
   model:process.env.WERYAI_MODEL||'WERYAI_VIDEO_1_0',
   prompt:buildPrompt(title,body.script),
   aspect_ratio:body.portrait?'9:16':'16:9',
   duration:Number.isFinite(duration)?duration:10,
   resolution:'720p',
   video_number:1
  })});
  if(json.status!==0)throw new AppError('WeryAI rejected the request: '+(json.desc||json.message||'unknown error'),502);
  const taskId=json.data?.task_ids?.[0];
  if(typeof taskId!=='string')throw new AppError('Video provider did not return a job ID.',502);
  return Response.json({job:signJob(taskId),status:'waiting'});
 }catch(error){return errorResponse(error);}
}
export async function GET(request){
 try{
  authorize(request);
  const token=new URL(request.url).searchParams.get('job')||'';
  const id=readJob(token);
  const json=await providerJSON(BASE+'/'+encodeURIComponent(id)+'/status',{headers:headers()});
  const data=json.data;
  if(!data||typeof data.task_status!=='string')throw new AppError('Invalid video status response.',502);
  const first=Array.isArray(data.videos)?data.videos[0]:null;
  const url=typeof first==='string'&&first.startsWith('https://')?first:null;
  return Response.json({status:data.task_status,url,error:data.task_status==='failed'?'Video generation failed'+(data.msg?': '+data.msg:'.')+' Check the task in your WeryAI account.':null});
 }catch(error){return errorResponse(error);}
}
