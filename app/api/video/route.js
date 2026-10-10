import {authorize,readBody,providerJSON,errorResponse,AppError,signJob,readJob} from '../../../lib/server';
export const runtime='nodejs';
export const maxDuration=60;
function headers(){if(!process.env.HEYGEN_API_KEY)throw new AppError('Set HEYGEN_API_KEY on the server.',503);return {'X-Api-Key':process.env.HEYGEN_API_KEY,'Content-Type':'application/json'};}
export async function POST(request){
 try{
  authorize(request);
  const body=await readBody(request);
  if(body.reviewed!==true)throw new AppError('Review and approve the narration before generating a video.');
  if(typeof body.script!=='string'||!body.script.trim()||body.script.length>4500)throw new AppError('Narration must contain 1-4500 characters.');
  if(!process.env.HEYGEN_AVATAR_ID||!process.env.HEYGEN_VOICE_ID)throw new AppError('Set HEYGEN_AVATAR_ID and HEYGEN_VOICE_ID on the server.',503);
  const json=await providerJSON('https://api.heygen.com/v2/video/generate',{method:'POST',headers:headers(),body:JSON.stringify({
   title:typeof body.title==='string'?body.title.slice(0,100):'Rooted biblical lesson',
   caption:true,dimension:body.portrait?{width:720,height:1280}:{width:1280,height:720},
   video_inputs:[{character:{type:'avatar',avatar_id:process.env.HEYGEN_AVATAR_ID,avatar_style:'normal'},voice:{type:'text',voice_id:process.env.HEYGEN_VOICE_ID,input_text:body.script},background:{type:'color',value:'#102A25'}}]
  })});
  if(typeof json.data?.video_id!=='string')throw new AppError('Video provider did not return a job ID.',502);
  return Response.json({job:signJob(json.data.video_id),status:'pending'});
 }catch(error){return errorResponse(error);}
}
export async function GET(request){
 try{
  authorize(request);
  const token=new URL(request.url).searchParams.get('job')||'';
  const id=readJob(token);
  const json=await providerJSON('https://api.heygen.com/v1/video_status.get?video_id='+encodeURIComponent(id),{headers:headers()});
  const data=json.data;
  if(!data||typeof data.status!=='string')throw new AppError('Invalid video status response.',502);
  const url=typeof data.video_url==='string'&&data.video_url.startsWith('https://')?data.video_url:null;
  return Response.json({status:data.status,url,error:data.status==='failed'?'Video generation failed. Check the job in your HeyGen account.':null});
 }catch(error){return errorResponse(error);}
}
