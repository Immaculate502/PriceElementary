'use client';
import {useEffect,useState} from 'react';
import {sections,pointFields,newPoint,emptyLesson,validateLesson,publicLesson} from '../../lib/lesson.mjs';
const KEY='rooted-lesson-studio-drafts';
const initialVideo={job:'',status:'',url:null};
export default function Page(){
 const [lesson,setLesson]=useState(emptyLesson),[step,setStep]=useState(0),[saved,setSaved]=useState([]),[ready,setReady]=useState(false);
 const [password,setPassword]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(''),[tab,setTab]=useState('create');
 const [video,setVideo]=useState(initialVideo),[portrait,setPortrait]=useState(false),[answers,setAnswers]=useState({});
 useEffect(()=>{try{const rows=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(rows))setSaved(rows);}catch{setMessage('Could not read saved drafts. Import a backup if available.');}setReady(true);},[]);
 function edit(change){setLesson(l=>({...l,...change,reviewed:false}));}
 function field(key,value){setLesson(l=>({...l,fields:{...l.fields,[key]:value},reviewed:false}));}
 function point(index,key,value){edit({points:lesson.points.map((p,i)=>i===index?{...p,[key]:value}:p)});}
 function download(value,name){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 function save(){
  const id=lesson.id||crypto.randomUUID();const row={...lesson,id,updatedAt:new Date().toISOString(),video};
  const rows=[row,...saved.filter(x=>x.id!==id)];
  try{localStorage.setItem(KEY,JSON.stringify(rows));setSaved(rows);setLesson(row);setMessage('Draft saved in this browser. Export a backup to keep a separate copy.');}catch{setMessage('Browser storage is full or unavailable. Export your lesson now.');}
 }
 async function api(path,body){
  const r=await fetch(path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','x-app-password':password},...(body?{body:JSON.stringify(body)}:{})});
  const data=await r.json();if(!r.ok)throw new Error(data.error||'Request failed.');return data;
 }
 async function generate(){
  setBusy('lesson');setMessage('Creating your lesson draft…');
  try{const data=await api('/api/lesson',lesson);edit(data);setAnswers({});setTab('preview');setMessage('AI draft ready. Verify scripture, interpretation, and narration before approval.');}catch(e){setMessage(e.message);}finally{setBusy('');}
 }
 async function createVideo(){
  setBusy('video');
  try{const data=await api('/api/video',{title:lesson.fields.Title,script:lesson.script,reviewed:lesson.reviewed,portrait});setVideo({...initialVideo,...data});setMessage('Video submitted. Use Check video status to retrieve the result. Save this draft to keep the job.');}catch(e){setMessage(e.message);}finally{setBusy('');}
 }
 async function checkVideo(){
  setBusy('status');try{const data=await api('/api/video?job='+encodeURIComponent(video.job));setVideo(v=>({...v,...data}));setMessage(data.error||'Video status: '+data.status);}catch(e){setMessage(e.message);}finally{setBusy('');}
 }
 async function importFile(e){
  try{const file=e.target.files?.[0];if(!file)return;if(file.size>200000)throw new Error('Import file is too large.');const parsed=JSON.parse(await file.text());const checked=validateLesson(parsed);setLesson({...checked,id:crypto.randomUUID(),updatedAt:''});setVideo(initialVideo);setAnswers({});setMessage('Lesson imported. Review approval has been reset.');setLesson(l=>({...l,reviewed:false}));}catch(e){setMessage(e.message);}e.target.value='';
 }
 const selected=sections[step];
 return <main className="studio">
  <header><div className="brand">✦ ROOTED <span>LESSON STUDIO</span></div><h1>Teach the Word.<br/><em>Build understanding.</em></h1><p>Create a KJV biblical lesson, review its teaching, and turn it into an AI presenter video.</p></header>
  <div className="toolbar">
   {['create','preview','video','library'].map(t=><button key={t} className={tab===t?'active':''} onClick={()=>setTab(t)}>{t[0].toUpperCase()+t.slice(1)}</button>)}
   <button onClick={save} disabled={!ready||!!busy}>Save draft</button><button onClick={()=>download(lesson,'rooted-lesson-backup.json')}>Export backup</button>
  </div>
  <div className="access"><label>App access password <input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" placeholder="Required for AI requests"/></label><small>Provider API keys are configured on the server. Lessons are saved in this browser.</small></div>
  {message&&<p className="notice" role="status">{message}</p>}
  {tab==='create'&&<div className="workspace"><nav aria-label="Lesson sections">{sections.map((s,i)=><button key={s[0]} className={step===i?'active':''} onClick={()=>setStep(i)}><span>{String(i+1).padStart(2,'0')}</span>{s[0]}</button>)}</nav>
   <section className="panel"><p className="eyebrow">STEP {step+1} OF 15 · KJV</p><h2>{selected[0]}</h2>
    {selected[1].map(key=><label className="field" key={key}>{key}<textarea rows={['Title','Topic','Instructor','Church or ministry'].includes(key)?1:3} value={lesson.fields[key]} maxLength={12000} onChange={e=>field(key,e.target.value)} placeholder={'Enter '+key.toLowerCase()}/></label>)}
    {step===2&&<p className="hint">Paste verified KJV verse text here. This starter does not include automatic Bible retrieval.</p>}
    {step===4&&<p className="hint">Use a separate paragraph per word study. Include your lexicon source; AI suggestions must be checked.</p>}
    {step===7&&<>{lesson.points.map((p,i)=><article className="point" key={i}><div className="toolbar"><h3>Point {i+1}</h3><button onClick={()=>edit({points:lesson.points.filter((_,j)=>i!==j)})}>Remove</button><button disabled={i===0} onClick={()=>{const a=[...lesson.points];[a[i-1],a[i]]=[a[i],a[i-1]];edit({points:a});}}>Move up</button><button disabled={lesson.points.length>=20} onClick={()=>edit({points:[...lesson.points,{...p}]})}>Duplicate</button></div>{pointFields.map(k=><label className="field" key={k}>{k==='privateNotes'?'Private instructor notes':k[0].toUpperCase()+k.slice(1)}<textarea value={p[k]} maxLength={12000} onChange={e=>point(i,k,e.target.value)}/></label>)}</article>)}<button disabled={lesson.points.length>=20} onClick={()=>edit({points:[...lesson.points,newPoint()]})}>+ Add teaching point</button></>}
    <div className="toolbar"><button disabled={step===0} onClick={()=>setStep(step-1)}>Back</button><button disabled={step===14} onClick={()=>setStep(step+1)}>Next section</button><button className="primary" disabled={!!busy||!password} onClick={generate}>{busy==='lesson'?'Generating…':'Create AI lesson + video script'}</button></div>
   </section></div>}
  {tab==='preview'&&<section className="panel"><p className="eyebrow">INSTRUCTOR REVIEW</p><h2>{lesson.fields.Title||'Lesson preview'}</h2><p>AI-generated material is a draft. Verify all KJV quotations, word studies, context, and teaching.</p><article className="print-copy">{lesson.draft}</article><label className="field screen-draft">Editable lesson draft<textarea rows={24} value={lesson.draft} maxLength={60000} onChange={e=>edit({draft:e.target.value})}/></label><div className="toolbar"><button onClick={()=>window.print()}>Print lesson / Save PDF</button><button onClick={()=>download(publicLesson(lesson),'rooted-student-lesson.json')}>Export student content</button></div>
   <h3>Review questions</h3>{lesson.quiz.map((q,i)=><article className="point" key={i}><strong>{i+1}. {q.question}</strong>{q.choices.map((c,j)=><label className="choice" key={j}><input type="radio" name={'q'+i} checked={answers[i]===j} onChange={()=>setAnswers(a=>({...a,[i]:j}))}/>{c}</label>)}{answers[i]!==undefined&&<p>{answers[i]===q.answer?'Correct.':'Review this answer.'} {q.explanation}</p>}</article>)}{lesson.quiz.length>0&&Object.keys(answers).length===lesson.quiz.length&&<p>Score: {lesson.quiz.filter((q,i)=>q.answer===answers[i]).length} / {lesson.quiz.length}</p>}<p className="hint">Student export includes answer explanations for self-study. This is not a secure graded assessment.</p></section>}
  {tab==='video'&&<section className="panel"><p className="eyebrow">AI PRESENTER VIDEO</p><h2>Bring the lesson to life.</h2><p>Review the spoken summary before sending it to HeyGen. Rendering uses your provider credits. The selected avatar and voice come from your server settings.</p><label className="field">Narration script<textarea rows={18} maxLength={4500} value={lesson.script} onChange={e=>edit({script:e.target.value})}/><small>{lesson.script.length} / 4500 characters · Short summary video</small></label><label className="choice"><input type="checkbox" checked={portrait} onChange={e=>setPortrait(e.target.checked)}/>Portrait format (otherwise landscape)</label><label className="choice"><input type="checkbox" checked={lesson.reviewed} onChange={e=>setLesson(l=>({...l,reviewed:e.target.checked}))}/>I have reviewed the lesson and narration for biblical accuracy.</label><div className="toolbar"><button className="primary" onClick={createVideo} disabled={!!busy||!password||!lesson.reviewed||!lesson.script.trim()}>{busy==='video'?'Submitting…':'Generate video — uses provider credits'}</button>{video.job&&<button onClick={checkVideo} disabled={!!busy||!password}>Check video status</button>}</div>{video.status&&<p>Status: {video.status}</p>}{video.url&&<><video controls src={video.url}/><p><a href={video.url} target="_blank" rel="noreferrer">Open video to download</a></p><p className="hint">Download your finished video; provider URLs can expire.</p></>}</section>}
  {tab==='library'&&<section className="panel"><h2>Your saved lessons</h2><p>These drafts are stored on this browser and device. Download backups before clearing browser data.</p><label className="field">Import lesson backup<input type="file" accept="application/json,.json" onChange={importFile}/></label><button onClick={()=>{setLesson(emptyLesson());setVideo(initialVideo);setAnswers({});setTab('create');setStep(0);}}>New lesson</button>{saved.map(row=><article className="point" key={row.id}><h3>{row.fields?.Title||row.fields?.Topic||'Untitled lesson'}</h3><p>{row.updatedAt?new Date(row.updatedAt).toLocaleString():''}</p><button onClick={()=>{try{setLesson({...validateLesson(row),id:row.id});setVideo(row.video||initialVideo);setAnswers({});setTab('create');}catch{setMessage('This saved lesson is invalid. Try importing a backup.');}}}>Open lesson</button></article>)}</section>}
  <footer>Rooted Lesson Studio · KJV teaching · Instructor reviewed</footer>
 </main>;
}
