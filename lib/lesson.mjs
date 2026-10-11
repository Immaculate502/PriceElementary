// Shared field configuration; all sections are saved and sent to the AI.
export const sections = [
 ['Lesson information', ['Title','Subtitle','Description','Category','Topic','Series','Lesson number','Instructor','Church or ministry','Audience','Maturity level','Lesson duration in minutes','Tags']],
 ['Purpose and objectives',['Primary purpose','Central biblical truth','Students should know','Students should understand','Students should believe','Students should practice','Expected spiritual growth','Measurable outcomes','Key takeaway']],
 ['KJV scriptures',['Foundational reference','Foundational KJV text','Supporting references and KJV text','Old Testament references','New Testament references','Cross references','Scripture explanation','Memory verse']],
 ['Background and context',['Biblical author','Original audience','Historical period','Geographic location','Historical background','Cultural background','Political and social conditions','Literary genre','Events before passage','Events after passage','Contextual meaning','Timeline','Historical sources']],
 ['Word studies',['English words','Hebrew or Greek terms','Original language','Transliteration','Strong numbers','Pronunciation','Lexical definitions','Root words','Grammatical forms','Meaning in passage','Other biblical uses','Related terms','Word study explanation','Lexicon sources']],
 ['Interpretation and insights',['Literal meaning','Original intended meaning','Theological meaning','Spiritual insights','Supporting evidence','Commands','Promises','Warnings','Conditions for promises','Biblical principles','Relationship to Jesus Christ','Relationship to Holy Spirit','Doctrinal considerations','Interpretation notes']],
 ['Introduction',['Opening statement','Opening scripture','Opening question','Opening illustration','Real life situation','Importance of lesson','Connection to previous lesson','Introduction duration']],
 ['Main teaching points',[]],
 ['Biblical examples',['Biblical characters','Biblical events','Example scripture references','Historical setting','Character challenges','Character responses','Actions taken','Consequences and outcomes','Spiritual lessons','Relevance to topic','Modern application']],
 ['Faith and application',['Faith principles','Developing faith','Required obedience','Daily life application','Relationship application','Stewardship application','Ministry application','Obstacles','Biblical strategies','Personal action steps','Weekly challenge','Completion deadline','Personal reflection']],
 ['Discussion and activities',['Opening discussion','Comprehension questions','Interpretation questions','Reflection questions','Group discussion','Scenario questions','Group activities','Individual activities','Interactive exercises','Discussion duration']],
 ['Meditation and prayer',['Meditation scriptures','Memorization scriptures','Meditation instructions','Faith declarations','Scriptures supporting declarations','Prayer focus','Opening prayer','Closing prayer','Personal prayer points','Corporate prayer points','Prayer assignment','Worship activity']],
 ['Assessment and assignments',['Assessment title','Assessment instructions','Assignment title','Assignment description','Assignment due date','Completion criteria','Passing score','Allowed attempts']],
 ['Resources',['Cover image URL','Teaching video URL','Audio URL','Slides URL','Study guide URL','Instructor manual URL','Workbook URL','Charts URL','Maps URL','Additional reading URLs','Download URLs']],
 ['Review and distribution',['Instructor review notes','Intended class or group','Prerequisite lessons','Suggested publication date','Student feedback questions']]
];
export const pointFields=['title','scripture','explanation','principle','example','application','discussion','privateNotes'];
export function newPoint(){return Object.fromEntries(pointFields.map(k=>[k,'']));}
export function emptyLesson(){return {fields:Object.fromEntries(sections.flatMap(s=>s[1]).map(k=>[k,''])),points:[newPoint()],draft:'',script:'',quiz:[],reviewed:false,updatedAt:''};}
export function validateLesson(v){
 if(!v || typeof v!=='object' || !v.fields || Array.isArray(v.fields)) throw new Error('Invalid lesson.');
 const base=emptyLesson();
 for(const key of Object.keys(base.fields)){
  const value=v.fields[key] ?? '';
  if(typeof value!=='string' || value.length>12000) throw new Error('Invalid field: '+key);
  base.fields[key]=value;
 }
 if(!Array.isArray(v.points) || v.points.length>20) throw new Error('Use at most 20 teaching points.');
 base.points=v.points.map(p=>Object.fromEntries(pointFields.map(k=>{
  const value=p?.[k] ?? ''; if(typeof value!=='string'||value.length>12000) throw new Error('Invalid teaching point.');return [k,value];
 })));
 for(const key of ['draft','script']){if(typeof v[key]!=='string'||v[key].length>60000)throw new Error('Invalid '+key);base[key]=v[key];}
 if(!Array.isArray(v.quiz)||v.quiz.length>30)throw new Error('Invalid quiz.');
 base.quiz=v.quiz.map(q=>{
  if(!q || typeof q.question!=='string'||q.question.length>2000||!Array.isArray(q.choices)||q.choices.length!==4||q.choices.some(c=>typeof c!=='string'||c.length>2000)||!Number.isInteger(q.answer)||q.answer<0||q.answer>3||typeof q.explanation!=='string'||q.explanation.length>4000)throw new Error('Invalid quiz question.');
  return {question:q.question,choices:q.choices,answer:q.answer,explanation:q.explanation};
 });
 base.reviewed=v.reviewed===true;
 return base;
}
export function publicLesson(v){
 const copy=validateLesson(v);
 copy.points=copy.points.map(({privateNotes,...p})=>p);
 delete copy.fields['Instructor review notes'];
 return copy;
}
