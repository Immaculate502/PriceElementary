'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import {getSupabaseBrowserClient} from '@/lib/supabase/client';
import './rooted-community.css';
export default function RootedCommunity(){
 const db=useMemo(getSupabaseBrowserClient,[]);
 const [user,setUser]=useState(null),[authReady,setAuthReady]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [email,setEmail]=useState(''),[password,setPassword]=useState('');
 const [rooms,setRooms]=useState([]),[members,setMembers]=useState([]),[branches,setBranches]=useState([]),[memberships,setMemberships]=useState([]),[mods,setMods]=useState([]),[blocks,setBlocks]=useState([]),[prefs,setPrefs]=useState([]),[reports,setReports]=useState([]),[unread,setUnread]=useState({});
 const [roomId,setRoomId]=useState(''),[messages,setMessages]=useState([]),[draft,setDraft]=useState(''),[tab,setTab]=useState('rooms'),[filter,setFilter]=useState(''),[limit,setLimit]=useState(50),[messageLoading,setMessageLoading]=useState(false);
 const [restricted,setRestricted]=useState(false),[roomMemberId,setRoomMemberId]=useState(''),[roomNameEdit,setRoomNameEdit]=useState(''),[roomMembers,setRoomMembers]=useState([]);
 const [name,setName]=useState(''),[bio,setBio]=useState(''),[avatar,setAvatar]=useState(''),[cross,setCross]=useState(false),[profileLoaded,setProfileLoaded]=useState(false);
 const [newRoom,setNewRoom]=useState(''),[newKind,setNewKind]=useState('branch'),[adminBranch,setAdminBranch]=useState(''),[createBranch,setCreateBranch]=useState(''),[admitId,setAdmitId]=useState('');
 const [reportTarget,setReportTarget]=useState(null),[reason,setReason]=useState('');
 const refreshVersion=useRef(0),messageVersion=useRef(0),feed=useRef(null),currentUser=useRef(null),currentRoom=useRef('');
 currentUser.current=user?.id;currentRoom.current=roomId;
 const room=rooms.find(r=>r.id===roomId);
 const profile=members.find(m=>m.id===user?.id);
 const myMemberships=memberships.filter(m=>m.user_id===user?.id&&m.active);
 const adminMemberships=memberships.filter(m=>m.user_id===user?.id&&m.active&&m.role==='admin');
 const branchName=id=>branches.find(b=>b.id===id)?.name||'Church';
 const memberName=id=>members.find(m=>m.id===id)?.display_name||'Member';
 const isModerator=r=>!!r&&((r.kind==='branch'&&adminMemberships.some(m=>m.branch_id===r.branch_id))||mods.some(m=>m.room_id===r.id&&m.user_id===user?.id));
 const muted=!!prefs.find(p=>p.room_id===roomId)?.muted;
 const meFellow=!!profile?.cross_opt_in&&memberships.some(m=>m.user_id===user?.id&&m.active&&branches.some(b=>b.id===m.branch_id&&b.fellowship_enabled));
 const roomTitle=r=>r.kind==='dm'?memberName(r.requester===user?.id?r.recipient:r.requester):r.name;
 const check=result=>{if(result.error)throw new Error(result.error.message);return result.data||[];};
 const refresh=useCallback(async()=>{
  if(!db||!user)return;
  const version=++refreshVersion.current,uid=user.id;
  try{
   const queries=['rc_rooms','rc_profiles','rc_branches','rc_memberships','rc_moderators','rc_blocks','rc_preferences','rc_reports','rc_room_members'];
   const results=await Promise.all(queries.map(t=>db.from(t).select('*').limit(1000)));
   const [counts,ownMemberResult,ownProfileResult]=await Promise.all([db.rpc('rc_unread'),db.from('rc_memberships').select('*').eq('user_id',uid),db.from('rc_profiles').select('*').eq('id',uid)]);
   const [r,p,b,m,mo,bl,pr,re,rm]=results.map(check);const countData=check(counts);
   const ownMembers=check(ownMemberResult),ownProfiles=check(ownProfileResult);
   const combinedMembers=[...m.filter(x=>x.user_id!==uid),...ownMembers];
   const combinedProfiles=[...p.filter(x=>x.id!==uid),...ownProfiles];
   if(version!==refreshVersion.current||currentUser.current!==uid)return;
   setRooms(r);setMembers(combinedProfiles);setBranches(b);setMemberships(combinedMembers);setMods(mo);setBlocks(bl);setPrefs(pr);setReports(re);setRoomMembers(rm);setUnread(Object.fromEntries(countData.map(x=>[x.room_id,Number(x.unread)])));
   setRoomId(id=>r.some(x=>x.id===id)?id:'');
  }catch(e){if(version===refreshVersion.current){setError(e.message);setRooms([]);setMembers([]);setMessages([]);setRoomId('');}}
 },[db,user]);
 const refreshMessages=useCallback(async()=>{
  if(!db||!user||!roomId){setMessages([]);return;}
  const version=++messageVersion.current,uid=user.id,id=roomId;
  try{
   const result=await db.from('rc_messages').select('*').eq('room_id',id).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(limit);
   const rows=check(result);
   if(version===messageVersion.current&&currentUser.current===uid&&currentRoom.current===id)setMessages(rows.reverse());
  }catch(e){if(version===messageVersion.current){setMessages([]);setError(e.message);}}
 },[db,user,roomId,limit]);
 useEffect(()=>{
  if(!db){setAuthReady(true);return;}
  let live=true;
  db.auth.getSession().then(({data,error})=>{if(live){if(error)setError(error.message);setUser(data.session?.user||null);setAuthReady(true);}});
  const {data}=db.auth.onAuthStateChange((_event,session)=>{if(live){setUser(session?.user||null);setAuthReady(true);}});
  return()=>{live=false;data.subscription.unsubscribe();};
 },[db]);
 useEffect(()=>{
  // A different account never inherits cached private conversation content.
  refreshVersion.current++;messageVersion.current++;setMessages([]);setRooms([]);setMembers([]);setMemberships([]);setReports([]);setBlocks([]);setRoomId('');setProfileLoaded(false);setName('');setBio('');setAvatar('');setCross(false);setDraft('');setPrefs([]);setUnread({});setAdminBranch('');setCreateBranch('');
 },[user?.id]);
 useEffect(()=>{if(!user)return;refresh();const timer=setInterval(refresh,8000);return()=>clearInterval(timer);},[user,refresh]);
 useEffect(()=>{if(!profileLoaded&&profile){setName(profile.display_name);setBio(profile.bio);setAvatar(profile.avatar_url||'');setCross(profile.cross_opt_in);setProfileLoaded(true);}},[profile,profileLoaded]);
 useEffect(()=>{
  setMessages([]);setLimit(50);setDraft('');setReportTarget(null);setRoomMemberId('');setRoomNameEdit('');
 },[roomId]);
 useEffect(()=>{
  if(!db||!user||!roomId)return;
  let live=true;setMessageLoading(true);
  refreshMessages().finally(()=>{if(live)setMessageLoading(false);});
  const channel=db.channel('rooted-room-'+roomId+'-'+user.id)
   .on('postgres_changes',{event:'INSERT',schema:'public',table:'rc_messages',filter:'room_id=eq.'+roomId},refreshMessages)
   .on('postgres_changes',{event:'UPDATE',schema:'public',table:'rc_messages',filter:'room_id=eq.'+roomId},refreshMessages)
   .subscribe(status=>{if(status==='SUBSCRIBED')refreshMessages();});
  // Polling also removes messages hidden by revocation, blocks, or soft removal.
  const timer=setInterval(refreshMessages,5000);
  return()=>{live=false;clearInterval(timer);db.removeChannel(channel);};
 },[db,user,roomId,refreshMessages]);
 useEffect(()=>{if(feed.current&&limit===50)feed.current.scrollTop=feed.current.scrollHeight;},[messages,limit]);
 useEffect(()=>{
  if(!adminBranch&&adminMemberships.length)setAdminBranch(adminMemberships[0].branch_id);
 },[adminMemberships,adminBranch]);
 useEffect(()=>{if(!createBranch&&myMemberships.length)setCreateBranch(myMemberships[0].branch_id);},[myMemberships,createBranch]);
 async function act(fn){if(busy)return;setBusy(true);setError('');try{await fn();await refresh();}catch(e){setError(e.message);}finally{setBusy(false);}}
 async function rpc(fn,args){const r=await db.rpc(fn,args);if(r.error)throw new Error(r.error.message);return r.data;}
 async function login(e){e.preventDefault();await act(async()=>{check(await db.auth.signInWithPassword({email,password}));setPassword('');});}
 async function send(e){e.preventDefault();const text=draft.trim();if(!text||!roomId)return;const id=roomId;await act(async()=>{await rpc('rc_send',{p_room:id,p_body:text});if(currentRoom.current===id)setDraft('');await refreshMessages();});}
 function openRoom(id){messageVersion.current++;setMessages([]);setRoomId(id);setTab('rooms');}
 const visibleRooms=rooms.filter(r=>r.kind==='dm'||!filter||r.name.toLowerCase().includes(filter.toLowerCase()));
 if(!db)return <div className="rc"><div className="rc-card"><h1>Community is unavailable</h1><p>Community chat needs the Rooted database connection. Please contact your church administrator.</p></div></div>;
 if(!authReady)return <div className="rc"><p>Loading your community…</p></div>;
 if(!user)return <div className="rc"><div className="rc-card rc-login"><p className="rc-kicker">ROOTED COMMUNITY</p><h1>Welcome to fellowship.</h1><p>Sign in with your Rooted member account to join the conversation.</p><Link className="rc-link-button" href="/login">Go to sign in</Link></div></div>;
 return <div className="rc">
  <header className="rc-header"><div><p className="rc-kicker">ROOTED COMMUNITY</p><h1>A place to belong.</h1><p>Connect within your church and across our fellowship.</p></div></header>
  <div className="rc-tabs">{['rooms','members','create room','profile',...(adminMemberships.length?['admin']:[]),'reports'].map(t=><button key={t} className={tab===t?'':'rc-secondary'} onClick={()=>setTab(t)}>{t[0].toUpperCase()+t.slice(1)}</button>)}<button className="rc-secondary" onClick={refresh}>Refresh</button></div>
  {error&&<div className="rc-notice" role="alert">{error}</div>}
  {!profile&&<p className="rc-notice">Setting up your community profile. If this message stays, open Profile and save your display name.</p>}
  {profile&&!memberships.some(m=>m.user_id===user.id&&m.active)&&<p className="rc-notice">Community chat opens once you belong to a church on Rooted. Join your church from your Rooted profile, or ask your church administrator for help.</p>}
  {tab==='rooms'&&<div className="rc-layout"><aside className="rc-card"><h2>Your conversations</h2><input aria-label="Search rooms" placeholder="Search rooms" value={filter} onChange={e=>setFilter(e.target.value)}/>{['branch','fellowship','dm'].map(kind=><div key={kind}><h3>{kind==='branch'?'My church':kind==='fellowship'?'Cross-church fellowship':'Private conversations'}</h3>{visibleRooms.filter(r=>r.kind===kind).map(r=><button className={'rc-room '+(r.id===roomId?'':'rc-secondary')} key={r.id} onClick={()=>openRoom(r.id)}><span>{roomTitle(r)}<small>{(r.kind==='branch'?branchName(r.branch_id):r.kind==='dm'?r.dm_status:'Shared fellowship')+(r.kind==='dm'?'':r.is_default?' · Default':' · Member-created')}</small></span>{unread[r.id]>0&&<b className="rc-badge">{unread[r.id]}</b>}</button>)}</div>)}{!meFellow&&<p className="rc-hint">Shared fellowship requires your profile opt-in and your church’s participation.</p>}</aside>
   <section className="rc-card rc-chat">{!room?<div className="rc-empty"><h2>Choose a conversation</h2><p>Select a church room or meet a member in the directory.</p></div>:<><div className="rc-chat-head"><div><h2>{roomTitle(room)}</h2><small>{room.kind==='branch'?branchName(room.branch_id):room.kind==='fellowship'?'Participating churches':'Private conversation'}</small></div><div><button className="rc-secondary" disabled={busy} onClick={()=>act(()=>rpc('rc_room_preference',{p_room:roomId,p_muted:!muted,p_mark_read:false}))}>{muted?'Unmute':'Mute'}</button><button className="rc-secondary" disabled={busy} onClick={()=>act(()=>rpc('rc_room_preference',{p_room:roomId,p_muted:muted,p_mark_read:true}))}>Mark read</button></div></div>
    {room.kind==='dm'&&room.dm_status==='pending'?<div className="rc-empty"><h3>Message request</h3>{room.recipient===user.id?<><p>{memberName(room.requester)} would like to connect.</p><button disabled={busy} onClick={()=>act(()=>rpc('rc_respond_dm',{p_room:roomId,p_accept:true}))}>Accept</button><button className="rc-secondary" disabled={busy} onClick={()=>act(()=>rpc('rc_respond_dm',{p_room:roomId,p_accept:false}))}>Decline</button></>:<p>Waiting for this member to accept your request. No messages can be sent yet.</p>}</div>:<>
    {isModerator(room)&&<details className="rc-room-controls"><summary>Manage this room</summary><input aria-label="Rename room" placeholder="New room name" value={roomNameEdit} onChange={e=>setRoomNameEdit(e.target.value)} maxLength={120}/><button className="rc-secondary" disabled={busy||!roomNameEdit.trim()} onClick={()=>act(()=>rpc('rc_manage_room',{p_room:roomId,p_name:roomNameEdit,p_restricted:room.restricted}))}>Rename</button><button className="rc-secondary" disabled={busy} onClick={()=>act(()=>rpc('rc_manage_room',{p_room:roomId,p_name:room.name,p_restricted:!room.restricted}))}>{room.restricted?'Make open to eligible members':'Restrict to group members'}</button><input aria-label="Room member account ID" placeholder="Member account UUID" value={roomMemberId} onChange={e=>setRoomMemberId(e.target.value)}/><button disabled={busy||!roomMemberId.trim()} onClick={()=>act(()=>rpc('rc_room_member',{p_room:roomId,p_user:roomMemberId.trim(),p_add:true}))}>Add member</button>{roomMembers.filter(x=>x.room_id===roomId).map(x=><p key={x.user_id}>{memberName(x.user_id)} <button className="rc-secondary" disabled={busy} onClick={()=>act(()=>rpc('rc_room_member',{p_room:roomId,p_user:x.user_id,p_add:false}))}>Remove from group</button></p>)}</details>}
    <div className="rc-feed" ref={feed} aria-label="Conversation history">{limit<500&&messages.length>=limit&&<button className="rc-secondary" onClick={()=>setLimit(n=>Math.min(n+50,500))}>Load older messages</button>}{messageLoading&&<p>Loading messages…</p>}{messages.map(m=><article className={'rc-message '+(m.sender_id===user.id?'rc-mine':'')} key={m.id}><div className="rc-meta"><strong>{memberName(m.sender_id)}</strong><time>{new Date(m.created_at).toLocaleString()}</time></div><p>{m.removed?'[Removed by moderator]':m.body}</p><div className="rc-actions">{m.sender_id!==user.id&&!m.removed&&<button onClick={()=>{setReportTarget(m.id);setReason('');}}>Report</button>}{isModerator(room)&&!m.removed&&<button disabled={busy} onClick={()=>act(async()=>{await rpc('rc_moderate',{p_message:m.id});await refreshMessages();})}>Remove message</button>}</div></article>)}{!messages.length&&!messageLoading&&<p className="rc-hint">Start the conversation with a welcoming message.</p>}</div>
    <form className="rc-composer" onSubmit={send}><textarea aria-label="Message" placeholder="Share a message…" maxLength={2000} value={draft} onChange={e=>setDraft(e.target.value)} required/><button disabled={busy||!draft.trim()}>Send</button></form></>}
   </>}</section></div>}
  {tab==='members'&&<section className="rc-card"><h2>Meet your community</h2><p>The directory includes approved members of your church and eligible members who opted into shared fellowship.</p><input aria-label="Search members" placeholder="Search members" value={filter} onChange={e=>setFilter(e.target.value)}/><div className="rc-grid">{members.filter(m=>m.id!==user.id&&m.display_name.toLowerCase().includes(filter.toLowerCase())).map(m=><article className="rc-member" key={m.id}><div className="rc-avatar">{m.avatar_url?<img src={m.avatar_url} alt="" referrerPolicy="no-referrer" loading="lazy"/>:m.display_name.slice(0,1).toUpperCase()}</div><h3>{m.display_name}</h3><p>{memberships.filter(x=>x.user_id===m.id&&x.active).map(x=>branchName(x.branch_id)).join(' · ')}</p><p>{m.bio}</p><button disabled={busy} onClick={()=>act(async()=>{const id=await rpc('rc_request_dm',{p_recipient:m.id});await refresh();openRoom(id);})}>Request conversation</button><button className="rc-secondary" disabled={busy} onClick={()=>act(async()=>{await rpc('rc_block',{p_target:m.id,p_block:true});await refreshMessages();})}>Block member</button></article>)}</div></section>}
  {tab==='profile'&&<section className="rc-card"><h2>Your fellowship profile</h2><label>Display name<input value={name} onChange={e=>setName(e.target.value)} maxLength={80}/></label><label>Short introduction<textarea value={bio} onChange={e=>setBio(e.target.value)} maxLength={500}/></label><label>Profile photo HTTPS URL<input type="url" value={avatar} onChange={e=>setAvatar(e.target.value)} maxLength={1000} placeholder="https://…"/></label><label className="rc-check"><input type="checkbox" checked={cross} onChange={e=>setCross(e.target.checked)}/>I choose to appear in cross-church fellowship and receive message requests from participating members.</label><p className="rc-hint">Your church must also opt in. You can withdraw here at any time. Existing messages remain in the shared rooms for other eligible participants.</p><button disabled={busy||!name.trim()} onClick={()=>act(async()=>{await rpc('rc_save_profile',{p_name:name,p_bio:bio,p_cross:cross,p_avatar:avatar});setProfileLoaded(false);await refreshMessages();})}>Save profile</button><p>Your account ID for church approval:</p><code className="rc-id">{user.id}</code><h3>Blocked members</h3>{blocks.map(b=><p key={b.blocked_id}><code>{b.blocked_id}</code> <button className="rc-secondary" disabled={busy} onClick={()=>act(()=>rpc('rc_block',{p_target:b.blocked_id,p_block:false}))}>Unblock</button></p>)}<small>Blocking prevents private communication and hides each other’s ordinary room messages. Moderators retain moderation access.</small></section>}
  {tab==='admin'&&<section className="rc-card"><h2>Church administrator</h2><label>Manage branch<select value={adminBranch} onChange={e=>setAdminBranch(e.target.value)}>{adminMemberships.map(m=><option key={m.branch_id} value={m.branch_id}>{branchName(m.branch_id)}</option>)}</select></label><p>Cross-church fellowship: <strong>{branches.find(b=>b.id===adminBranch)?.fellowship_enabled?'Enabled':'Disabled'}</strong></p><button disabled={busy} onClick={()=>act(async()=>{await rpc('rc_set_branch_fellowship',{p_branch:adminBranch,p_enabled:!branches.find(b=>b.id===adminBranch)?.fellowship_enabled});await refreshMessages();})}>Toggle church participation</button><h3>Approve member</h3><p>Ask the member to save their profile and provide their account ID.</p><input aria-label="Member account UUID" placeholder="Member account UUID" value={admitId} onChange={e=>setAdmitId(e.target.value)}/><button disabled={busy||!admitId.trim()} onClick={()=>act(()=>rpc('rc_manage_member',{p_branch:adminBranch,p_user:admitId.trim(),p_role:'member',p_active:true}))}>Approve member</button><h3>Branch members</h3>{memberships.filter(m=>m.branch_id===adminBranch).map(m=><div className="rc-admin-member" key={m.user_id}><span>{memberName(m.user_id)} · {m.role} · {m.active?'active':'restricted'}<small>{m.user_id}</small></span>{m.user_id!==user.id&&<><button className="rc-secondary" disabled={busy} onClick={()=>act(()=>rpc('rc_manage_member',{p_branch:adminBranch,p_user:m.user_id,p_role:m.role,p_active:!m.active}))}>{m.active?'Restrict':'Restore'}</button><button className="rc-secondary" disabled={busy} onClick={()=>act(()=>rpc('rc_manage_member',{p_branch:adminBranch,p_user:m.user_id,p_role:m.role==='admin'?'member':'admin',p_active:m.active}))}>{m.role==='admin'?'Remove admin role':'Make admin'}</button></>}</div>)}</section>}
  {tab==='create room'&&<section className="rc-card"><h2>Create a chat room</h2><p>Start a conversation for your church or the shared fellowship. Creating a room makes you its moderator.</p><label>Church branch<select value={createBranch} onChange={e=>setCreateBranch(e.target.value)}>{myMemberships.map(m=><option key={m.branch_id} value={m.branch_id}>{branchName(m.branch_id)}</option>)}</select></label><input placeholder="Room name" aria-label="Room name" value={newRoom} onChange={e=>setNewRoom(e.target.value)} maxLength={120}/><select aria-label="Room type" value={newKind} onChange={e=>setNewKind(e.target.value)}><option value="branch">Private church room</option><option value="fellowship">Shared fellowship room</option></select><label className="rc-check"><input type="checkbox" checked={restricted} onChange={e=>setRestricted(e.target.checked)}/>Restricted ministry or small-group room</label><p className="rc-hint">Open rooms admit every eligible member. Restricted rooms admit only members added by the room moderator. Church membership and fellowship opt-in requirements still apply.</p><button disabled={busy||!newRoom.trim()||(newKind==='branch'?!createBranch:!meFellow)} onClick={()=>act(async()=>{const id=await rpc('rc_create_room',{p_name:newRoom,p_kind:newKind,p_branch:newKind==='branch'?createBranch:null,p_restricted:restricted});setNewRoom('');await refresh();openRoom(id);})}>Create room</button></section>}
  {tab==='reports'&&<section className="rc-card"><h2>Reports and moderation</h2><p>Your own reports are shown here. Room moderators can also review reports in the rooms they manage. Private conversations remain accessible only to their participants.</p>{reports.map(r=><article className="rc-member" key={r.id}><p>{r.reason}</p><small>{r.status} · {new Date(r.created_at).toLocaleString()}</small>{isModerator(rooms.find(x=>x.id===r.room_id))&&<div><button className="rc-secondary" onClick={()=>openRoom(r.room_id)}>Open room</button><button disabled={busy} onClick={()=>act(()=>rpc('rc_moderate',{p_message:r.message_id}))}>Remove reported message</button><button className="rc-secondary" disabled={busy||r.status==='closed'} onClick={()=>act(()=>rpc('rc_close_report',{p_report:r.id}))}>Close report</button></div>}</article>)}</section>}
  {reportTarget&&<div className="rc-modal"><form className="rc-card" onSubmit={e=>{e.preventDefault();act(async()=>{await rpc('rc_report',{p_message:reportTarget,p_reason:reason});setReportTarget(null);});}}><h2>Report message</h2><textarea aria-label="Report reason" value={reason} onChange={e=>setReason(e.target.value)} maxLength={1000} required/><button disabled={busy||!reason.trim()}>Submit report</button><button type="button" className="rc-secondary" onClick={()=>setReportTarget(null)}>Cancel</button></form></div>}
  <footer className="rc-hint">Private church spaces · Optional shared fellowship · Respectful conversations</footer>
 </div>;
}
