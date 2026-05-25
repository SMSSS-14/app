app = r"""'use strict';
/* ═══════════════════════════════════════════════════════
   St. Margaret Sr. Sec. School — app.js v4.3 (RESTORED)
   ⚠️ Replace API_URL with your deployed /exec URL
═══════════════════════════════════════════════════════ */
const API_URL      = 'https://script.google.com/macros/s/YOUR_DEPLOYED_SCRIPT_ID/exec';
const COOLDOWN_MS  = 30*60*1000;
const COOLDOWN_KEY = 'stm_cooldown_ts';
const SCHOOL_DOMAIN= '@stmargaretsrsecschool.com';

/* ─── STATE ─── */
const S = {
  user:null, submissions:[], allUsers:[], coordinators:[],
  collections:[], charts:{}, colItemTarget:null, currentPage:'home',
  dateFilter:{ admin:{preset:'',from:'',to:''}, principal:{preset:'',from:'',to:''}, coordinator:{preset:'',from:'',to:''} }
};

/* ─── TOPICS ─── */
const TOPICS = {
  'Academic':['Homework Pressure','Examination Stress','Marks Dispute','Classroom Teaching Quality','Doubt Clearing Support','Syllabus Concern','Grading Issue','Study Material Problem'],
  'Teacher Behaviour':['Teaching Methodology','Favouritism / Bias','Harsh Behaviour','Misconduct','Absenteeism','Attitude Issue','Lack of Support'],
  'Infrastructure':['Washroom Cleanliness','Drinking Water Quality','Smart Board / Projector Issue','Furniture Damage','Electricity Problem','Fan / AC Issue','Classroom Condition','Playground Safety','Library Issue'],
  'Discipline':['Student Misconduct','Bullying','Fighting','Harassment','Abuse / Serious Concern','Ragging','Uniform Violation'],
  'Transport':['Bus Delay','Driver Behaviour','Route Problem','Safety Concern','Bus Condition','Route Change Request','Overcrowding'],
  'Administration':['Fee Issue','Office Behaviour','ID Card Problem','Document Delay','Certificate Issue','Admission / Transfer Query','Timetable Issue'],
  'Suggestion':['School Improvement','Event Suggestion','Academic Suggestion','Facility Suggestion','Policy Suggestion','Sports / Activity Suggestion','Club / Society']
};

/* ─── CLASSES (no BV3, no streams) ─── */
const CLASSES = [
  'Bal Vatika 1','Bal Vatika 2',
  'Class 1','Class 2','Class 3','Class 4','Class 5',
  'Class 6','Class 7','Class 8',
  'Class 9','Class 10','Class 11','Class 12',
  'Teacher / Staff','Parent / Guardian','Other'
];

/* ─── COORDINATOR MODAL CLASS CHIPS ─── */
const CLASS_CHIPS = [
  {v:'BV1',l:'Bal Vatika 1'},{v:'BV2',l:'Bal Vatika 2'},
  {v:'1',l:'Class 1'},{v:'2',l:'Class 2'},{v:'3',l:'Class 3'},
  {v:'4',l:'Class 4'},{v:'5',l:'Class 5'},{v:'6',l:'Class 6'},
  {v:'7',l:'Class 7'},{v:'8',l:'Class 8'},{v:'9',l:'Class 9'},
  {v:'10',l:'Class 10'},{v:'11',l:'Class 11'},{v:'12',l:'Class 12'}
];

const PRINCIPAL_TOPICS=['Teaching Methodology','Favouritism / Bias','Harsh Behaviour','Misconduct','Absenteeism','Attitude Issue','Lack of Support','Bullying','Harassment','Abuse / Serious Concern','Ragging','Safety Concern'];
const PRINCIPAL_CATS=['Teacher Behaviour'];
const CHART_COLORS=['#f59e0b','#6366f1','#22c55e','#3b82f6','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16','#ec4899'];

let selectedChips=[], cachedIP=null, isAnonymous=false;

/* ═══ API ═══ */
async function apiGet(p){const r=await fetch(API_URL+'?'+new URLSearchParams(p));if(!r.ok)throw new Error('HTTP '+r.status);return r.json();}
async function apiPost(p){const r=await fetch(API_URL,{method:'POST',body:new URLSearchParams(p)});if(!r.ok)throw new Error('HTTP '+r.status);return r.json();}

/* ═══ NAV ═══ */
function showPage(id){document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));const el=document.getElementById('page-'+id);if(el){el.classList.add('active');el.classList.add('fade-in');}S.currentPage=id;lucide.createIcons();}
function openSidebar(r){document.getElementById('sidebar-'+r)?.classList.add('open');document.getElementById('sb-overlay-'+r)?.classList.add('show');}
function closeSidebar(r){document.getElementById('sidebar-'+r)?.classList.remove('open');document.getElementById('sb-overlay-'+r)?.classList.remove('show');}
function openModal(id){document.getElementById(id)?.classList.add('open');}
function closeModal(id){document.getElementById(id)?.classList.remove('open');}

/* ═══ TOAST ═══ */
function showToast(msg,type='info',dur=4000){
  const icons={success:'check-circle',error:'alert-circle',info:'info',warning:'alert-triangle'};
  const cls={success:'t-success',error:'t-error',info:'t-info',warning:'t-warning'};
  const t=document.createElement('div');t.className=`toast ${cls[type]||'t-info'}`;
  t.innerHTML=`<i data-lucide="${icons[type]||'info'}" style="width:16px;height:16px;flex-shrink:0;"></i><span>${escHtml(msg)}</span>`;
  document.getElementById('toast-wrap').appendChild(t);lucide.createIcons();
  setTimeout(()=>{t.classList.add('toast-out');setTimeout(()=>t.remove(),320);},dur);
}

/* ═══ UTILS ═══ */
function escHtml(s){if(s==null)return'';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}

function fmtDate(d){
  if(!d)return'—';
  try{
    const dt=d instanceof Date?d:new Date(d);
    if(isNaN(dt.getTime()))return'—';
    const M=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    let h=dt.getHours();const m=String(dt.getMinutes()).padStart(2,'0');
    const ap=h>=12?'PM':'AM';h=h%12||12;
    return`${dt.getDate()} ${M[dt.getMonth()]} ${dt.getFullYear()}, ${h}:${m} ${ap}`;
  }catch{return'—';}
}
function fmtDateShort(d){
  if(!d)return'—';
  try{const dt=d instanceof Date?d:new Date(d);if(isNaN(dt.getTime()))return'—';
    const M=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return`${dt.getDate()} ${M[dt.getMonth()]} ${dt.getFullYear()}`;}catch{return'—';}
}
function statusClass(st){return{'Pending':'st-pending','In Review':'st-review','Escalated':'st-escalated','Resolved':'st-resolved','Closed':'st-closed'}[st]||'st-pending';}
function getAvatar(n){return(n||'U').charAt(0).toUpperCase();}

/* ═══ DATE RANGE HELPER ═══ */
function getDateRange(preset,from,to){
  const now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const end=d=>new Date(d.getTime()+86399999);
  switch(preset){
    case'today':     return{from:today,to:end(today)};
    case'yesterday': {const y=new Date(today);y.setDate(y.getDate()-1);return{from:y,to:end(y)};}
    case'7days':     {const f=new Date(today);f.setDate(f.getDate()-6);return{from:f,to:end(today)};}
    case'30days':    {const f=new Date(today);f.setDate(f.getDate()-29);return{from:f,to:end(today)};}
    case'thisMonth': return{from:new Date(now.getFullYear(),now.getMonth(),1),to:end(new Date(now.getFullYear(),now.getMonth()+1,0))};
    case'prevMonth': return{from:new Date(now.getFullYear(),now.getMonth()-1,1),to:end(new Date(now.getFullYear(),now.getMonth(),0))};
    case'thisYear':  return{from:new Date(now.getFullYear(),0,1),to:end(new Date(now.getFullYear(),11,31))};
    case'custom':    return{from:from?new Date(from):null,to:to?new Date(to+'T23:59:59'):null};
    default:         return null;
  }
}

/* ═══ FILTER + DATE + RENDER ═══ */
function onDatePreset(role){
  const preset=document.getElementById(role+'-date-preset')?.value||'';
  S.dateFilter[role].preset=preset;
  const cr=document.getElementById(role+'-custom-range');
  if(cr)cr.style.display=(preset==='custom')?'flex':'none';
  if(preset!=='custom'){S.dateFilter[role].from='';S.dateFilter[role].to='';}
  applyAndRender(role);
}

function applyAndRender(role){
  const listId=role+'-sub-list';
  const el=document.getElementById(listId);
  if(!el)return;
  const search=(document.getElementById(role+'-search')?.value||'').toLowerCase();
  const fCat=document.getElementById(role+'-f-cat')?.value||'';
  const fStatus=document.getElementById(role+'-f-status')?.value||'';
  const fRole=document.getElementById(role+'-f-role')?.value||'';
  const fSheet=document.getElementById(role+'-f-sheet')?.value||'';
  const df=S.dateFilter[role];
  const fromEl=document.getElementById(role+'-date-from');
  const toEl=document.getElementById(role+'-date-to');
  if(fromEl)df.from=fromEl.value;if(toEl)df.to=toEl.value;
  const dateRange=df.preset?getDateRange(df.preset,df.from,df.to):null;

  let data=S.submissions.filter(s=>{
    if(search&&![s.name,s.message,s.class,s.topic,s.category,s.id,s.assignedName,s.email].some(v=>(v||'').toLowerCase().includes(search)))return false;
    if(fCat&&s.category!==fCat)return false;
    if(fStatus&&s.status!==fStatus)return false;
    if(fRole&&s.assignedRole!==fRole)return false;
    if(fSheet&&s.sourceSheet!==fSheet)return false;
    if(dateRange){const ts=new Date(s.timestamp);if(dateRange.from&&ts<dateRange.from)return false;if(dateRange.to&&ts>dateRange.to)return false;}
    return true;
  });

  // Update count and chips
  const rc=document.getElementById(role+'-result-count');
  if(rc)rc.textContent=`${data.length} submission${data.length!==1?'s':''}`;
  renderFilterChips(role,{search,fCat,fStatus,fRole,fSheet,datePreset:df.preset});

  if(!data.length){el.innerHTML=`<div class="empty-state"><i data-lucide="inbox"></i><p>No submissions match your filters.</p></div>`;lucide.createIcons();return;}

  // Group by date
  const groups=new Map();
  data.forEach(s=>{
    const dt=new Date(s.timestamp);
    const now=new Date();
    const tod=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    const yest=new Date(tod.getTime()-86400000);
    const dtDay=new Date(dt.getFullYear(),dt.getMonth(),dt.getDate());
    let label;
    if(dtDay.getTime()===tod.getTime())label='Today';
    else if(dtDay.getTime()===yest.getTime())label='Yesterday';
    else{const M=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];label=`${dt.getDate()} ${M[dt.getMonth()]} ${dt.getFullYear()}`;}
    if(!groups.has(label))groups.set(label,[]);groups.get(label).push(s);
  });

  let html='';
  groups.forEach((items,label)=>{
    html+=`<div class="date-grp-hdr"><span style="font-size:12px;font-weight:700;color:var(--text2);">${escHtml(label)}</span><span style="font-size:11px;color:var(--text3);margin-left:6px;">${items.length}</span></div>`;
    html+=items.map((s,i)=>buildSubCard(s,role,i)).join('');
  });
  el.innerHTML=html;lucide.createIcons();
}

function renderFilterChips(role,f){
  const el=document.getElementById(role+'-filter-chips');if(!el)return;
  const chips=[];
  if(f.search)chips.push({l:`"${f.search}"`,k:'search'});
  if(f.fCat)chips.push({l:f.fCat,k:'cat'});
  if(f.fStatus)chips.push({l:f.fStatus,k:'status'});
  if(f.fRole)chips.push({l:f.fRole,k:'role'});
  if(f.fSheet)chips.push({l:f.fSheet==='SchoolResponses'?'School':'Public',k:'sheet'});
  const dl={today:'Today',yesterday:'Yesterday','7days':'Last 7 Days','30days':'Last 30 Days',thisMonth:'This Month',prevMonth:'Last Month',thisYear:'This Year',custom:'Custom Range'};
  if(f.datePreset)chips.push({l:dl[f.datePreset]||f.datePreset,k:'date'});
  el.innerHTML=chips.map(c=>`<span class="active-fchip" onclick="removeChip('${role}','${c.k}')"><i data-lucide="x" style="width:10px;height:10px;"></i>${escHtml(c.l)}</span>`).join('');
  lucide.createIcons();
}

function removeChip(role,key){
  if(key==='search'){const el=document.getElementById(role+'-search');if(el)el.value='';}
  else if(key==='cat'){const el=document.getElementById(role+'-f-cat');if(el)el.value='';}
  else if(key==='status'){const el=document.getElementById(role+'-f-status');if(el)el.value='';}
  else if(key==='role'){const el=document.getElementById(role+'-f-role');if(el)el.value='';}
  else if(key==='sheet'){const el=document.getElementById(role+'-f-sheet');if(el)el.value='';}
  else if(key==='date'){S.dateFilter[role]={preset:'',from:'',to:''};const el=document.getElementById(role+'-date-preset');if(el)el.value='';const cr=document.getElementById(role+'-custom-range');if(cr)cr.style.display='none';}
  applyAndRender(role);
}

function resetFilters(role){
  S.dateFilter[role]={preset:'',from:'',to:''};
  ['search','f-cat','f-status','f-role','f-sheet','date-preset'].forEach(id=>{const el=document.getElementById(role+'-'+id);if(el)el.value='';});
  const cr=document.getElementById(role+'-custom-range');if(cr)cr.style.display='none';
  applyAndRender(role);
}

/* ═══ AUTH ═══ */
async function handleLogin(e){
  e.preventDefault();
  const email=document.getElementById('l-email').value.trim(),password=document.getElementById('l-password').value;
  if(!email||!password){showToast('Enter email and password.','error');return;}
  const btn=document.getElementById('login-btn'),icon=document.getElementById('login-icon'),spin=document.getElementById('login-spin');
  btn.disabled=true;icon.style.display='none';spin.classList.remove('hidden');
  try{
    const data=await apiGet({action:'login',email,password});
    if(data.success){S.user=data.user;sessionStorage.setItem('stm_user',JSON.stringify(data.user));showToast(`Welcome, ${data.user.name}! 👋`,'success');routeToUserDashboard(data.user);}
    else showToast(data.error||'Invalid credentials.','error');
  }catch(err){showToast('Login failed: '+err.message,'error');}
  finally{btn.disabled=false;icon.style.display='';spin.classList.add('hidden');}
}

function routeToUserDashboard(user){
  if(user.role==='admin'){document.getElementById('admin-name').textContent=user.name;document.getElementById('admin-avatar').textContent=getAvatar(user.name);showPage('admin');loadAdminDashboard();}
  else if(user.role==='principal'){document.getElementById('principal-name').textContent=user.name;document.getElementById('principal-avatar').textContent=getAvatar(user.name);showPage('principal');loadRoleDashboard('principal');}
  else if(user.role==='coordinator'){document.getElementById('coordinator-name').textContent=user.name;document.getElementById('coord-avatar').textContent=getAvatar(user.name);const rng=user.assignedClasses||'—';document.getElementById('coord-range-badge').textContent='Classes '+rng;document.getElementById('coord-class-label').textContent='Classes '+rng;showPage('coordinator');loadRoleDashboard('coordinator');}
}

function handleLogout(){S.user=null;S.submissions=[];S.collections=[];S.allUsers=[];sessionStorage.removeItem('stm_user');showToast('Logged out.','info');showPage('home');}
function checkSessionRestore(){try{const s=sessionStorage.getItem('stm_user');if(s){S.user=JSON.parse(s);routeToUserDashboard(S.user);}}catch{}}

/* ═══ FORM ═══ */
function populateClassDropdown(){
  const sel=document.getElementById('f-class');if(!sel)return;
  sel.innerHTML='<option value="">Select class…</option>';
  CLASSES.forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;sel.appendChild(o);});
}

function updateTopics(){
  const cat=document.getElementById('f-category')?.value||'';
  const sel=document.getElementById('f-topic');if(!sel)return;
  sel.innerHTML='';
  if(!cat||!TOPICS[cat]){sel.innerHTML='<option value="">Select category first…</option>';return;}
  const def=document.createElement('option');def.value='';def.textContent='Select topic…';sel.appendChild(def);
  TOPICS[cat].forEach(t=>{const o=document.createElement('option');o.value=t;o.textContent=t;sel.appendChild(o);});
}

/* SECTIONS — dynamic: 1-10→A,B,C  11-12→A,B,C,D  BV/other→N/A only */
function updateSections(){
  const cls=document.getElementById('f-class')?.value||'';
  const sel=document.getElementById('f-section');if(!sel)return;
  sel.innerHTML='';
  const lower=cls.toLowerCase();
  let sections;
  if(!cls||lower.includes('bal vatika')||lower.includes('teacher')||lower.includes('parent')||lower.includes('other')){
    sections=['N/A'];
  }else{
    const m=cls.match(/\d+/);const n=m?parseInt(m[0]):0;
    sections=n>=11?['A','B','C','D']:['A','B','C'];
  }
  sections.forEach(s=>{const o=document.createElement('option');o.value=s;o.textContent=s==='N/A'?'N/A':'Section '+s;sel.appendChild(o);});
}

function updateEmailBadge(){
  const email=(document.getElementById('f-email')?.value||'').toLowerCase();
  const badge=document.getElementById('email-type-badge');if(!badge)return;
  if(email.includes(SCHOOL_DOMAIN))badge.innerHTML=`<span class="badge badge-indigo" style="font-size:10px;">🏫 School</span>`;
  else if(email.length>3)badge.innerHTML=`<span class="badge badge-slate" style="font-size:10px;">🌐 Public</span>`;
  else badge.innerHTML='';
  lucide.createIcons();
}

/* ═══ ANONYMOUS TOGGLE ═══ */
function toggleAnonymous(){
  isAnonymous=!isAnonymous;
  const pill=document.getElementById('anon-pill'),wrap=document.getElementById('anon-wrap');
  const icon=document.getElementById('anon-icon'),lbl=document.getElementById('anon-label'),sub=document.getElementById('anon-sub');
  const nameI=document.getElementById('f-name'),phoneI=document.getElementById('f-phone');
  const rowN=document.getElementById('row-name'),rowP=document.getElementById('row-phone');
  pill.classList.toggle('on',isAnonymous);wrap.classList.toggle('on',isAnonymous);
  icon.setAttribute('data-lucide',isAnonymous?'user-check':'user-x');
  lbl.textContent=isAnonymous?'Anonymous Mode ON':'Submit Anonymously';
  sub.textContent=isAnonymous?'Identity hidden — IP still recorded':'Hide your name & phone number';
  if(isAnonymous){rowN.classList.replace('expanded','collapsed');rowP.classList.replace('expanded','collapsed');nameI.value='';nameI.disabled=true;nameI.removeAttribute('required');phoneI.value='';phoneI.disabled=true;phoneI.removeAttribute('required');}
  else{rowN.classList.replace('collapsed','expanded');rowP.classList.replace('collapsed','expanded');nameI.disabled=false;nameI.setAttribute('required','');phoneI.disabled=false;phoneI.setAttribute('required','');}
  lucide.createIcons();
}

/* ═══ ROUTING PREVIEW ═══ */
function localParseClassNum(cls){
  if(!cls)return-1;const l=cls.toLowerCase();
  if(l.includes('bal vatika')||/^bv\d*$/.test(l))return 0;
  if(l.includes('teacher')||l.includes('parent')||l.includes('other'))return-2;
  const m=cls.match(/\d+/);return m?parseInt(m[0]):-1;
}
function localFindCoord(cn,coords){
  if(cn<0)return null;
  for(const c of coords){
    const range=(c.assignedClasses||'').trim().toUpperCase();if(!range||range==='ALL')continue;
    const parts=range.split(',').map(s=>s.trim());
    for(const pt of parts){
      if(cn===0&&(pt==='BV'||pt==='0'||/^BV\d*$/.test(pt)))return c;
      const dm=pt.match(/^(\d+)-(\d+)$/);if(dm){if(cn>=parseInt(dm[1])&&cn<=parseInt(dm[2]))return c;continue;}
      const n=parseInt(pt);if(!isNaN(n)&&n===cn)return c;
    }
  }return null;
}
function updateRoutingPreview(){
  const cat=document.getElementById('f-category')?.value||'';
  const top=document.getElementById('f-topic')?.value||'';
  const cls=document.getElementById('f-class')?.value||'';
  const email=document.getElementById('f-email')?.value||'';
  const prev=document.getElementById('routing-preview');
  if(!cat||!top||!cls){prev.classList.add('hidden');return;}
  const needsPrincipal=PRINCIPAL_TOPICS.includes(top)||PRINCIPAL_CATS.includes(cat);
  let role,name,reason,priority;
  if(needsPrincipal){role='Principal';name='Principal';reason=cat==='Teacher Behaviour'?'Teacher behaviour → Principal':'Sensitive topic → Principal';priority='High';}
  else{const coord=localFindCoord(localParseClassNum(cls),S.coordinators);if(coord){role='Coordinator';name=coord.name;reason=`Class range handler (${coord.assignedClasses})`;priority='Normal';}else{role='Principal';name='Principal';reason='No coordinator for this class';priority='Normal';}}
  document.getElementById('prev-name').textContent=name;
  document.getElementById('prev-role-badge').innerHTML=role==='Principal'?`<span class="badge badge-indigo" style="font-size:10px;">Principal</span>`:`<span class="badge badge-amber" style="font-size:10px;">Coordinator</span>`;
  document.getElementById('prev-reason').textContent=reason;
  document.getElementById('prev-priority').innerHTML=`<span class="badge ${priority==='High'?'badge-red':'badge-green'}" style="font-size:10px;">${priority}</span>`;
  document.getElementById('prev-type').textContent=email.toLowerCase().includes(SCHOOL_DOMAIN)?'🏫 School Submission':'🌐 Public Submission';
  prev.classList.remove('hidden');lucide.createIcons();
}

/* ═══ IP + COOLDOWN ═══ */
async function getUserIP(){if(cachedIP)return cachedIP;try{const ctrl=new AbortController();const t=setTimeout(()=>ctrl.abort(),4000);const r=await fetch('https://api.ipify.org?format=json',{signal:ctrl.signal});clearTimeout(t);const d=await r.json();if(d.ip){cachedIP=d.ip;return d.ip;}}catch{}cachedIP='unavailable';return cachedIP;}
function isCooling(){const t=localStorage.getItem(COOLDOWN_KEY);return t?(Date.now()-parseInt(t))<COOLDOWN_MS:false;}
function setCooling(){localStorage.setItem(COOLDOWN_KEY,Date.now().toString());}
function coolRemain(){const rem=COOLDOWN_MS-(Date.now()-parseInt(localStorage.getItem(COOLDOWN_KEY)||'0'));return`${Math.floor(rem/60000)}m ${Math.floor((rem%60000)/1000)}s`;}

/* ═══ FORM SUBMIT ═══ */
async function handleSubmit(e){
  e.preventDefault();
  if(isCooling()){showToast(`⏳ Cooldown: ${coolRemain()} remaining.`,'warning',7000);return;}
  const category=document.getElementById('f-category').value,topic=document.getElementById('f-topic').value;
  const cls=document.getElementById('f-class').value,section=document.getElementById('f-section').value||'N/A';
  const message=document.getElementById('f-message').value.trim(),email=document.getElementById('f-email').value.trim();
  if(!category){showToast('Please select a category.','error');return;}
  if(!topic){showToast('Please select a topic.','error');return;}
  if(!cls){showToast('Please select your class.','error');return;}
  if(!message||message.length<10){showToast('Message must be at least 10 characters.','error');return;}
  let name='',phone='';
  if(!isAnonymous){
    name=document.getElementById('f-name').value.trim();phone=document.getElementById('f-phone').value.trim();
    if(!name||name.length<2){showToast('Please enter your full name.','error');return;}
    if(!phone||!/^\d{10}$/.test(phone)){showToast('Phone must be exactly 10 digits.','error');return;}
  }
  const btn=document.getElementById('submit-btn'),icon=document.getElementById('submit-icon'),spin=document.getElementById('submit-spin');
  btn.disabled=true;icon.style.display='none';spin.classList.remove('hidden');
  try{
    const ip=await getUserIP();
    const data=await apiPost({action:'submit',category,topic,class:cls,section,message,email,
      name:isAnonymous?'Anonymous':name,phone:isAnonymous?'':phone,
      anonymous:isAnonymous?'yes':'no',ipAddress:ip});
    if(data.success){
      setCooling();document.getElementById('feedback-form').reset();
      if(isAnonymous)toggleAnonymous();
      updateTopics();updateSections();updateRoutingPreview();updateEmailBadge();
      document.getElementById('success-msg').innerHTML=isAnonymous
        ?`Anonymous feedback received by <strong style="color:#fbbf24;">St. Margaret Sr. Sec. School</strong>.`
        :`Thank you, <strong style="color:#fbbf24;">${escHtml(name)}</strong>. Your feedback has been received.`;
      document.getElementById('success-assign').innerHTML=`Assigned to: <strong style="color:var(--text1);">${escHtml(data.assignedName||'Authority')}</strong> &nbsp;·&nbsp; ${escHtml(data.submissionType||'Public')} submission`;
      showPage('success');
    }else if(data.cooldown){setCooling();showToast('⏳ '+data.error,'warning',7000);}
    else throw new Error(data.error||'Server error');
  }catch(err){showToast('Submission failed: '+err.message,'error');}
  finally{btn.disabled=false;icon.style.display='';spin.classList.add('hidden');}
}

/* ═══ ADMIN DASHBOARD ═══ */
async function loadAdminDashboard(){
  try{
    const[subR,usrR,anR]=await Promise.all([
      apiGet({action:'getSubmissions',role:'admin',userId:S.user?.id||''}),
      apiGet({action:'getUsers'}),
      apiGet({action:'getAnalytics',role:'admin',userId:S.user?.id||''})
    ]);
    if(subR.success){S.submissions=subR.data||[];applyAndRender('admin');renderAdminRecent();}
    if(usrR.success){S.allUsers=usrR.users||[];S.coordinators=S.allUsers.filter(u=>u.role==='coordinator');renderUsersTable();}
    if(anR.success){const a=anR.analytics;const s=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};s('astat-total',a.total);s('astat-pending',a.pending);s('astat-resolved',a.resolved);s('astat-escalated',a.escalated);s('astat-anon',a.anonymous);s('astat-school',a.school);}
    await loadCollections();
  }catch(err){showToast('Dashboard error: '+err.message,'error');}
}

function renderAdminRecent(){
  const el=document.getElementById('admin-recent-list');if(!el)return;
  const recent=S.submissions.slice(0,6);
  if(!recent.length){el.innerHTML=`<div class="empty-state" style="padding:30px;"><p>No submissions yet.</p></div>`;return;}
  el.innerHTML=recent.map(s=>{
    const isAnon=s.anonymous==='yes'||s.name==='Anonymous';
    const nm=isAnon?`<span class="badge badge-anon">Anonymous</span>`:`<strong>${escHtml(s.name)}</strong>`;
    return`<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);">
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px;">${nm}
          <span class="badge ${statusClass(s.status||'Pending')} badge" style="font-size:10px;">${escHtml(s.status||'Pending')}</span>
          <span class="badge badge-amber" style="font-size:10px;">${escHtml(s.category)}</span>
          <span class="badge badge-slate" style="font-size:10px;">${escHtml(s.assignedName||'—')}</span></div>
        <div style="font-size:12px;color:var(--text3);">${escHtml(s.class||'')} · ${escHtml(s.topic||'')} · ${fmtDate(s.timestamp)}</div>
      </div></div>`;
  }).join('');lucide.createIcons();
}

function switchAdminTab(tab){
  ['overview','submissions','analytics','users','collections'].forEach(t=>{
    document.getElementById('tab-admin-'+t)?.classList.toggle('active',t===tab);
    document.getElementById('sb-admin-'+t)?.classList.toggle('active',t===tab);
  });
  const titles={overview:'Overview',submissions:'All Submissions',analytics:'Analytics',users:'Users & Credentials',collections:'My Collections'};
  const el=document.getElementById('admin-tab-title');if(el)el.textContent=titles[tab]||tab;
  if(tab==='analytics')renderAnalyticsCharts(S.submissions,'admin');
  if(tab==='users')renderUsersTable();
  if(tab==='collections')renderCollections('admin');
  closeSidebar('admin');lucide.createIcons();
}

function onAnalyticsDateChange(){
  const preset=document.getElementById('an-date-preset')?.value||'';
  let filtered=S.submissions;
  if(preset){const range=getDateRange(preset,'','');if(range)filtered=S.submissions.filter(s=>{const ts=new Date(s.timestamp);if(range.from&&ts<range.from)return false;if(range.to&&ts>range.to)return false;return true;});}
  renderAnalyticsCharts(filtered,'admin');
}

/* ═══ ANALYTICS (computed from local data) ═══ */
function computeAnalytics(data){
  const a={total:0,pending:0,inReview:0,escalated:0,resolved:0,closed:0,anonymous:0,school:0,publicCount:0,byCategory:{},byTopic:{},byClass:{},byAssignee:{},bySeverity:{},weekly:{}};
  const inc=(o,k)=>{o[k]=(o[k]||0)+1;};
  data.forEach(s=>{
    a.total++;if(s.sourceSheet==='SchoolResponses')a.school++;else a.publicCount++;
    if(s.anonymous==='yes'||s.name==='Anonymous')a.anonymous++;
    const st=s.status||'Pending';
    if(st==='Pending')a.pending++;else if(st==='In Review')a.inReview++;else if(st==='Escalated')a.escalated++;else if(st==='Resolved')a.resolved++;else if(st==='Closed')a.closed++;
    inc(a.byCategory,s.category||'Unknown');inc(a.byTopic,s.topic||'Unknown');
    inc(a.byClass,s.class||'Unknown');inc(a.byAssignee,s.assignedName||s.assignedRole||'Unknown');
    inc(a.bySeverity,s.priority||'Normal'); /* priority used as severity proxy */
    try{const dt=new Date(s.timestamp);if(!isNaN(dt)){const k=dt.toISOString().split('T')[0];inc(a.weekly,k);}}catch{}
  });return a;
}

function renderAnalyticsCharts(data,role){
  const a=computeAnalytics(data);
  const s=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
  if(role==='admin'){
    s('an-total',a.total);s('an-pending',a.pending);s('an-review',a.inReview);s('an-resolved',a.resolved);s('an-escalated',a.escalated);s('an-anon',a.anonymous);
    renderChart('chart-cat',a.byCategory,'doughnut',CHART_COLORS);
    renderChart('chart-sev',a.bySeverity,'doughnut',{High:'#ef4444',Medium:'#f97316',Normal:'#22c55e'});
    renderChart('chart-handler',a.byAssignee,'doughnut',CHART_COLORS);
    renderChart('chart-source',{School:a.school,Public:a.publicCount},'doughnut',{School:'#6366f1',Public:'#94a3b8'});
    renderTrend('chart-trend',a.weekly);
  }else if(role==='principal'){
    s('pan-total',a.total);s('pan-pending',a.pending);s('pan-resolved',a.resolved);s('pan-escalated',a.escalated);
    renderChart('p-chart-cat',a.byCategory,'doughnut',CHART_COLORS);
    renderChart('p-chart-sev',a.bySeverity,'doughnut',{High:'#ef4444',Medium:'#f97316',Normal:'#22c55e'});
  }else{
    s('can-total',a.total);s('can-pending',a.pending);s('can-resolved',a.resolved);s('can-inreview',a.inReview);
    renderChart('c-chart-cat',a.byCategory,'doughnut',CHART_COLORS);
    renderChart('c-chart-class',a.byClass,'bar',CHART_COLORS);
  }
}

function renderChart(id,dataObj,type,colors){
  try{
    const c=document.getElementById(id);if(!c)return;
    const labels=Object.keys(dataObj||{});const values=Object.values(dataObj||{});
    if(!labels.length){const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle='#334155';ctx.font='13px Plus Jakarta Sans';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('No data yet',c.width/2,c.height/2);return;}
    if(S.charts[id]){S.charts[id].destroy();delete S.charts[id];}
    const isBar=type==='bar';
    const colArr=Array.isArray(colors)?colors.slice(0,labels.length):labels.map(l=>colors[l]||'#6366f1');
    S.charts[id]=new Chart(c.getContext('2d'),{type,
      data:{labels,datasets:[{data:values,backgroundColor:isBar?colArr.map(c=>c+'55'):colArr,borderColor:colArr,borderWidth:isBar?1.5:0,borderRadius:isBar?6:0,hoverOffset:isBar?0:6}]},
      options:{responsive:true,maintainAspectRatio:false,cutout:type==='doughnut'?'60%':undefined,
        plugins:{legend:{display:type==='doughnut',position:'bottom',labels:{color:'#94a3b8',font:{family:'Plus Jakarta Sans',size:11},boxWidth:12,padding:10}}},
        scales:isBar?{x:{ticks:{color:'#64748b',font:{size:10}},grid:{color:'rgba(255,255,255,.04)'}},y:{ticks:{color:'#64748b',font:{size:10},stepSize:1},grid:{color:'rgba(255,255,255,.04)'},beginAtZero:true}}:{}}});
  }catch(e){console.error(id,e);}
}

function renderTrend(id,weekly){
  const c=document.getElementById(id);if(!c)return;if(S.charts[id]){S.charts[id].destroy();delete S.charts[id];}
  const days={};for(let i=13;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);days[d.toISOString().split('T')[0]]=0;}
  Object.entries(weekly||{}).forEach(([k,v])=>{if(days[k]!==undefined)days[k]=v;});
  const M=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const labels=Object.keys(days).map(d=>{const dt=new Date(d);return`${dt.getUTCDate()} ${M[dt.getUTCMonth()]}`;});
  S.charts[id]=new Chart(c.getContext('2d'),{type:'bar',data:{labels,datasets:[{label:'Submissions',data:Object.values(days),backgroundColor:'rgba(245,158,11,.4)',borderColor:'#f59e0b',borderWidth:1.5,borderRadius:6}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#64748b',font:{size:10}},grid:{color:'rgba(255,255,255,.04)'}},y:{ticks:{color:'#64748b',font:{size:10},stepSize:1},grid:{color:'rgba(255,255,255,.04)'},beginAtZero:true}}}});
}

/* ═══ ROLE DASHBOARDS ═══ */
async function loadRoleDashboard(role){
  const el=document.getElementById(role+'-sub-list');
  if(el)el.innerHTML=`<div style="text-align:center;padding:50px;color:var(--text3);"><div class="spin" style="margin:0 auto 12px;"></div>Loading submissions…</div>`;
  try{
    const subR=await apiGet({action:'getSubmissions',role,userId:S.user?.id||''});
    if(subR.success){S.submissions=subR.data||[];applyAndRender(role);const a=computeAnalytics(S.submissions);renderAnalyticsStats(role,a);}
    else throw new Error(subR.error);
    await loadCollections();
  }catch(err){showToast('Load failed: '+err.message,'error');if(el)el.innerHTML=`<div class="empty-state"><i data-lucide="wifi-off"></i><p>${escHtml(err.message)}</p></div>`;}
}

function renderAnalyticsStats(role,a){
  const s=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
  if(role==='principal'){s('pstat-total',a.total);s('pstat-pending',a.pending);s('pstat-resolved',a.resolved);s('pstat-escalated',a.escalated);}
  else{s('cstat-total',a.total);s('cstat-pending',a.pending);s('cstat-resolved',a.resolved);s('cstat-inreview',a.inReview);}
}

function switchRoleTab(role,tab){
  ['submissions','analytics','collections'].forEach(t=>{
    document.getElementById('tab-'+role+'-'+t)?.classList.toggle('active',t===tab);
    document.getElementById('sb-'+role+'-'+t)?.classList.toggle('active',t===tab);
  });
  if(tab==='analytics')renderAnalyticsCharts(S.submissions,role);
  if(tab==='collections')renderCollections(role);
  closeSidebar(role);lucide.createIcons();
}

/* ═══ SUBMISSION CARD ═══ */
function buildSubCard(s,dashRole,idx){
  const isAnon=s.anonymous==='yes'||s.name==='Anonymous';
  const id=escHtml(s.id);
  const nameHtml=isAnon?`<span class="badge badge-anon"><i data-lucide="user-x" style="width:10px;height:10px;"></i> Anonymous</span>`:`<strong style="font-size:14px;color:var(--text1);">${escHtml(s.name)}</strong>`;
  const sectionHtml=(s.section&&s.section!=='N/A')?' · Sec. '+escHtml(s.section):'';
  const adminBadges=dashRole==='admin'?`<span class="badge badge-amber" style="font-size:10px;">${escHtml(s.assignedName||'—')}</span>${s.sourceSheet==='SchoolResponses'?`<span class="badge badge-indigo" style="font-size:10px;">🏫</span>`:`<span class="badge badge-slate" style="font-size:10px;">🌐</span>`}`:'';
  const statusOpts=['Pending','In Review','Escalated','Resolved','Closed'].map(st=>`<option value="${st}"${s.status===st?' selected':''}>${st}</option>`).join('');
  const adminExtra=dashRole==='admin'?`<button onclick="openReassignModal('${id}')" class="btn-ghost btn-sm" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;"><i data-lucide="shuffle" style="width:11px;height:11px;"></i> Reassign</button>`:'';
  const ipHtml=dashRole==='admin'&&s.ipAddress&&s.ipAddress!=='unavailable'?`<span style="font-size:11px;color:#818cf8;font-family:'DM Mono',monospace;"><i data-lucide="wifi" style="width:10px;height:10px;"></i> ${escHtml(s.ipAddress)}</span>`:'';
  const phoneHtml=!isAnon&&dashRole==='admin'&&s.phone?`<span style="font-size:11px;color:var(--text3);"><i data-lucide="phone" style="width:10px;height:10px;"></i> ${escHtml(s.phone)}</span>`:'';
  const priColor={High:'badge-red',Medium:'badge-orange',Normal:'badge-green'}[s.priority||'Normal']||'badge-slate';
  return`<div class="sub-card ${isAnon?'is-anon':''}" id="scard-${id}">
    <div class="sub-card-header" onclick="toggleCard('${id}')">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;flex-wrap:wrap;">
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:5px;">
            ${nameHtml}<span class="badge ${statusClass(s.status||'Pending')} badge" style="font-size:10px;">${escHtml(s.status||'Pending')}</span>
            <span class="badge badge-amber" style="font-size:10px;">${escHtml(s.category)}</span>
            <span class="badge badge-purple" style="font-size:10px;">${escHtml(s.topic)}</span>
            ${s.priority?`<span class="badge ${priColor}" style="font-size:10px;">${escHtml(s.priority)}</span>`:''}
            ${adminBadges}
          </div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <span style="font-size:12px;color:var(--text3);display:flex;align-items:center;gap:3px;"><i data-lucide="graduation-cap" style="width:11px;height:11px;"></i>${escHtml(s.class||'—')}${sectionHtml}</span>
            <span style="font-size:12px;color:var(--text3);display:flex;align-items:center;gap:3px;"><i data-lucide="clock" style="width:11px;height:11px;"></i>${fmtDate(s.timestamp)}</span>
            ${phoneHtml}${ipHtml}
          </div>
        </div>
        <i data-lucide="chevron-down" class="chevron" id="chev-${id}" style="width:16px;height:16px;color:var(--text3);flex-shrink:0;margin-top:2px;"></i>
      </div>
    </div>
    <div class="sub-card-body" id="body-${id}">
      ${isAnon?`<div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text3);margin-bottom:12px;background:rgba(255,255,255,.03);padding:8px 10px;border-radius:8px;"><i data-lucide="shield" style="width:13px;height:13px;color:var(--indigo);"></i> Anonymous — identity not stored</div>`:''}
      ${!isAnon&&s.email?`<div style="font-size:12px;color:var(--text3);margin-bottom:10px;"><i data-lucide="mail" style="width:11px;height:11px;"></i> ${escHtml(s.email)}</div>`:''}
      <p style="font-size:14px;color:var(--text2);line-height:1.75;margin-bottom:16px;padding:12px 14px;background:rgba(255,255,255,.03);border-radius:10px;border-left:3px solid rgba(245,158,11,.3);">${escHtml(s.message)}</p>
      <div style="margin-bottom:14px;">
        <label class="flabel" style="font-size:11px;margin-bottom:5px;">Notes / Response</label>
        <textarea class="notes-ta" id="notes-${id}" placeholder="Add notes or action taken…">${escHtml(s.notes||'')}</textarea>
        <button onclick="saveNotes('${id}')" class="btn-ghost btn-sm" style="margin-top:6px;display:inline-flex;align-items:center;gap:4px;font-size:11px;"><i data-lucide="save" style="width:11px;height:11px;"></i> Save Notes</button>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
        <label style="font-size:12px;color:var(--text3);font-weight:600;">Update Status:</label>
        <select onchange="updateStatus('${id}',this.value)" class="filter-inp" style="font-size:12px;padding:6px 10px;border-radius:8px;">${statusOpts}</select>
        <button onclick="deleteItem('${id}')" class="btn-danger btn-sm" style="display:inline-flex;align-items:center;gap:4px;"><i data-lucide="trash-2" style="width:11px;height:11px;"></i> Delete</button>
        <button onclick="openCollectionModal('${id}')" class="btn-outline btn-sm" style="display:inline-flex;align-items:center;gap:4px;"><i data-lucide="folder-plus" style="width:11px;height:11px;"></i> Collection</button>
        ${adminExtra}
      </div>
    </div>
  </div>`;
}

function toggleCard(id){const body=document.getElementById('body-'+id),chev=document.getElementById('chev-'+id);if(!body)return;const open=body.classList.toggle('open');chev?.classList.toggle('rotated',open);}

/* ═══ STATUS / NOTES / DELETE ═══ */
async function updateStatus(id,status){
  try{const notes=document.getElementById('notes-'+id)?.value||'';const d=await apiPost({action:'updateStatus',id,status,notes,userId:S.user?.id||'',userRole:S.user?.role||''});
    if(d.success){const s=S.submissions.find(x=>x.id===id);if(s){s.status=status;if(notes)s.notes=notes;}showToast('Status → '+status,'success');}else throw new Error(d.error);}
  catch(err){showToast('Update failed: '+err.message,'error');}
}
async function saveNotes(id){const notes=document.getElementById('notes-'+id)?.value||'';
  try{const d=await apiPost({action:'updateNotes',id,notes,userId:S.user?.id||''});if(d.success){const s=S.submissions.find(x=>x.id===id);if(s)s.notes=notes;showToast('Notes saved.','success');}else throw new Error(d.error);}
  catch(err){showToast('Save failed: '+err.message,'error');}
}
async function deleteItem(id){if(!confirm('Delete this submission?'))return;
  try{const d=await apiPost({action:'deleteSubmission',id,userId:S.user?.id||''});
    if(d.success){S.submissions=S.submissions.filter(s=>s.id!==id);removeFromAllCollections(id);showToast('Deleted.','success');['admin','principal','coordinator'].forEach(r=>{const el=document.getElementById(r+'-sub-list');if(el&&el.childElementCount>0)applyAndRender(r);});}else throw new Error(d.error);}
  catch(err){showToast('Delete failed: '+err.message,'error');}
}

/* ═══ REASSIGN ═══ */
function openReassignModal(subId){
  document.getElementById('reassign-subid').value=subId;const sel=document.getElementById('reassign-select');
  sel.innerHTML='<option value="">Select user…</option>';
  const po=document.createElement('option');po.value=JSON.stringify({id:'user_principal_001',role:'Principal',name:'Principal'});po.textContent='Principal';sel.appendChild(po);
  S.allUsers.filter(u=>u.role==='coordinator').forEach(u=>{const o=document.createElement('option');o.value=JSON.stringify({id:u.id,role:'Coordinator',name:u.name});o.textContent=`${u.name} (${u.assignedClasses})`;sel.appendChild(o);});
  openModal('modal-reassign');
}
async function handleReassign(){
  const subId=document.getElementById('reassign-subid').value,raw=document.getElementById('reassign-select').value;
  if(!subId||!raw){showToast('Select a user.','error');return;}const t=JSON.parse(raw);
  try{const d=await apiPost({action:'reassign',id:subId,assignedTo:t.id,assignedRole:t.role,assignedName:t.name,adminId:S.user?.id||''});
    if(d.success){const s=S.submissions.find(x=>x.id===subId);if(s){s.assignedTo=t.id;s.assignedRole=t.role;s.assignedName=t.name;}showToast(`Reassigned to ${t.name}.`,'success');closeModal('modal-reassign');applyAndRender('admin');}else throw new Error(d.error);}
  catch(err){showToast('Reassign failed: '+err.message,'error');}
}

/* ═══ COORDINATOR CLASS CHIPS (admin modal only) ═══ */
function renderClassChipsUI(){
  const container=document.getElementById('class-chips-container');if(!container)return;
  container.innerHTML=CLASS_CHIPS.map(c=>`<span class="class-chip ${selectedChips.includes(c.v)?'sel':''}" onclick="toggleChip('${c.v}')">${escHtml(c.l)}</span>`).join('');
  document.getElementById('mu-classrange').value=selectedChips.join(',');
}
function toggleChip(v){const idx=selectedChips.indexOf(v);if(idx>=0)selectedChips.splice(idx,1);else selectedChips.push(v);renderClassChipsUI();}
function parseChipsFromRange(range){
  if(!range)return[];const result=[];
  range.toUpperCase().split(',').forEach(pt=>{pt=pt.trim();if(!pt)return;
    if(/^BV\d*$/.test(pt)){result.push(pt);return;}
    const dm=pt.match(/^(\d+)-(\d+)$/);if(dm){for(let i=parseInt(dm[1]);i<=parseInt(dm[2]);i++)result.push(String(i));return;}
    const n=parseInt(pt);if(!isNaN(n))result.push(String(n));
  });return[...new Set(result)];
}
function toggleClassRangeField(){const role=document.getElementById('mu-role')?.value;const wrap=document.getElementById('mu-classrange-wrap');if(wrap)wrap.style.display=role==='coordinator'?'':'none';}

/* ═══ USER MANAGEMENT ═══ */
function renderUsersTable(){
  const tbody=document.getElementById('users-tbody');if(!tbody)return;
  const users=S.allUsers.filter(u=>u.active!=='false');
  if(!users.length){tbody.innerHTML='<tr><td colspan="6" style="text-align:center;color:var(--text3);padding:24px;">No users found.</td></tr>';return;}
  tbody.innerHTML=users.map(u=>{
    const rc={admin:'badge-amber',principal:'badge-indigo',coordinator:'badge-green'}[u.role]||'badge-slate';
    return`<tr><td><strong style="color:var(--text1);">${escHtml(u.name)}</strong></td>
      <td style="color:var(--text2);font-size:12px;">${escHtml(u.email)}</td>
      <td><span class="badge ${rc}">${escHtml(u.role)}</span></td>
      <td><span style="font-size:11px;color:var(--amber);background:rgba(245,158,11,.1);border-radius:6px;padding:3px 8px;font-family:'DM Mono',monospace;">${escHtml(u.assignedClasses||'ALL')}</span></td>
      <td style="color:var(--text3);font-size:12px;">${fmtDateShort(u.createdAt)}</td>
      <td><div style="display:flex;gap:6px;">
        <button onclick="openEditUserModal('${escHtml(u.id)}')" class="btn-ghost btn-sm" style="display:inline-flex;align-items:center;gap:4px;"><i data-lucide="edit-2" style="width:11px;height:11px;"></i> Edit</button>
        ${u.role!=='admin'?`<button onclick="handleDeleteUser('${escHtml(u.id)}')" class="btn-danger btn-sm"><i data-lucide="trash-2" style="width:11px;height:11px;"></i></button>`:''}
      </div></td></tr>`;
  }).join('');lucide.createIcons();
}
function openAddUserModal(){document.getElementById('mu-name').value='';document.getElementById('mu-email').value='';document.getElementById('mu-password').value='';document.getElementById('mu-role').value='coordinator';document.getElementById('mu-userid').value='';document.getElementById('modal-user-title').textContent='Add New User';document.getElementById('btn-save-user').textContent='Add User';selectedChips=[];toggleClassRangeField();renderClassChipsUI();openModal('modal-user');}
function openEditUserModal(userId){const user=S.allUsers.find(u=>u.id===userId);if(!user)return;document.getElementById('mu-name').value=user.name||'';document.getElementById('mu-email').value=user.email||'';document.getElementById('mu-password').value='';document.getElementById('mu-role').value=user.role||'coordinator';document.getElementById('mu-userid').value=userId;document.getElementById('modal-user-title').textContent='Edit User';document.getElementById('btn-save-user').textContent='Save Changes';selectedChips=parseChipsFromRange(user.assignedClasses||'');toggleClassRangeField();renderClassChipsUI();openModal('modal-user');}
async function handleSaveUser(){
  const userId=document.getElementById('mu-userid').value,name=document.getElementById('mu-name').value.trim(),email=document.getElementById('mu-email').value.trim(),password=document.getElementById('mu-password').value.trim(),role=document.getElementById('mu-role').value,classes=document.getElementById('mu-classrange').value.trim();
  if(!name||!email){showToast('Name and email required.','error');return;}if(!userId&&!password){showToast('Password required.','error');return;}if(role==='coordinator'&&!classes){showToast('Please select at least one class.','error');return;}
  try{let d;if(userId){const p={action:'updateUser',userId,name,email,assignedClasses:classes,adminId:S.user?.id||''};if(password)p.password=password;d=await apiPost(p);}else{d=await apiPost({action:'addUser',role,name,email,password,assignedClasses:classes,adminId:S.user?.id||''});}
    if(d.success){showToast(userId?'User updated.':'User added.','success');closeModal('modal-user');const r=await apiGet({action:'getUsers'});if(r.success){S.allUsers=r.users;S.coordinators=r.users.filter(u=>u.role==='coordinator');renderUsersTable();}}else throw new Error(d.error);}
  catch(err){showToast('Save failed: '+err.message,'error');}
}
async function handleDeleteUser(userId){const user=S.allUsers.find(u=>u.id===userId);if(!confirm(`Deactivate "${user?.name||userId}"?`))return;
  try{const d=await apiPost({action:'deleteUser',userId,adminId:S.user?.id||''});if(d.success){showToast('Deactivated.','info');const r=await apiGet({action:'getUsers'});if(r.success){S.allUsers=r.users;S.coordinators=r.users.filter(u=>u.role==='coordinator');renderUsersTable();}}else throw new Error(d.error);}
  catch(err){showToast('Failed: '+err.message,'error');}
}

/* ═══ COLLECTIONS ═══ */
async function loadCollections(){if(!S.user?.id)return;try{const d=await apiGet({action:'getCollections',userId:S.user.id});if(d.success)S.collections=d.collections||[];}catch{S.collections=[];}}
async function persistCollections(){if(!S.user?.id)return;try{await apiPost({action:'saveCollections',userId:S.user.id,collectionsJson:JSON.stringify(S.collections)});}catch{showToast('Sync failed.','warning');}}
function renderCollections(role){
  const el=document.getElementById(role+'-collections-list');if(!el)return;
  if(!S.collections.length){el.innerHTML=`<div class="empty-state"><i data-lucide="folder-open"></i><p>No collections. Create one to organise submissions.</p></div>`;lucide.createIcons();return;}
  el.innerHTML=S.collections.map(col=>{
    const items=S.submissions.filter(s=>col.items.includes(s.id));
    return`<div class="col-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div><div style="font-size:15px;font-weight:800;display:flex;align-items:center;gap:8px;"><i data-lucide="folder" style="width:16px;height:16px;color:var(--amber);"></i>${escHtml(col.name)}</div>
          <div style="font-size:12px;color:var(--text3);margin-top:2px;">${items.length} item${items.length!==1?'s':''}</div></div>
        <button onclick="deleteCollection('${col.id}','${role}')" class="btn-danger btn-sm" style="display:inline-flex;align-items:center;gap:4px;"><i data-lucide="trash-2" style="width:11px;height:11px;"></i> Delete</button>
      </div>
      ${!items.length?`<p style="font-size:13px;color:var(--text3);font-style:italic;">Empty collection.</p>`:
        items.map(s=>`<div style="padding:9px 0;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
          <div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:600;margin-bottom:2px;">${escHtml(s.anonymous==='yes'?'Anonymous':s.name)}<span class="badge badge-amber" style="font-size:9px;margin-left:5px;">${escHtml(s.category)}</span></div>
            <div style="font-size:11.5px;color:var(--text3);">${escHtml(s.class)} · ${escHtml(s.topic)} · ${fmtDate(s.timestamp)}</div></div>
          <button onclick="removeFromCollection('${col.id}','${s.id}','${role}')" class="btn-ghost btn-sm">Remove</button>
        </div>`).join('')}
    </div>`;
  }).join('');lucide.createIcons();
}
async function promptCreateCollection(){const name=prompt('Collection name:');if(!name||!name.trim())return;S.collections.push({id:'col_'+Date.now(),name:name.trim(),items:[],createdAt:new Date().toISOString()});await persistCollections();showToast(`"${name.trim()}" created.`,'success');renderCollections(S.currentPage);}
async function deleteCollection(colId,role){if(!confirm('Delete collection? Submissions not deleted.'))return;S.collections=S.collections.filter(c=>c.id!==colId);await persistCollections();showToast('Deleted.','info');renderCollections(role||S.currentPage);}
async function removeFromCollection(colId,subId,role){const col=S.collections.find(c=>c.id===colId);if(!col)return;col.items=col.items.filter(i=>i!==subId);await persistCollections();showToast('Removed.','info');renderCollections(role||S.currentPage);}
function removeFromAllCollections(subId){S.collections.forEach(c=>{c.items=c.items.filter(i=>i!==subId);});persistCollections();}
function openCollectionModal(subId){S.colItemTarget=subId;renderCollectionModal();openModal('modal-collection');}
function renderCollectionModal(){
  const body=document.getElementById('modal-col-body');const sub=S.submissions.find(s=>s.id===S.colItemTarget);if(!body)return;
  let html='';if(sub){const ia=sub.anonymous==='yes'||sub.name==='Anonymous';html+=`<p style="font-size:13px;color:var(--text2);margin-bottom:14px;">Adding: <strong>${escHtml(ia?'Anonymous':sub.name)}</strong> — ${escHtml(sub.topic)}</p>`;}
  if(!S.collections.length)html+=`<p style="font-size:13px;color:var(--text3);margin-bottom:14px;">No collections yet.</p>`;
  else{html+=`<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;">`;S.collections.forEach(col=>{const inCol=col.items.includes(S.colItemTarget);html+=`<span class="col-chip ${inCol?'sel':''}" onclick="toggleInCollection('${col.id}')"><i data-lucide="${inCol?'check-circle':'folder'}" style="width:12px;height:12px;"></i>${escHtml(col.name)} (${col.items.length})</span>`;});html+=`</div>`;}
  html+=`<div style="display:flex;gap:8px;"><input id="col-new-name" class="inp" style="border-radius:10px;font-size:13px;padding:9px 12px;" placeholder="New collection name…"/><button onclick="createFromModal()" class="btn-indigo" style="border-radius:10px;padding:9px 14px;font-size:13px;white-space:nowrap;">Create</button></div><button onclick="closeModal('modal-collection')" class="btn-ghost" style="width:100%;margin-top:10px;font-size:13px;">Done</button>`;
  body.innerHTML=html;lucide.createIcons();
}
async function toggleInCollection(colId){const col=S.collections.find(c=>c.id===colId);if(!col||!S.colItemTarget)return;const idx=col.items.indexOf(S.colItemTarget);if(idx>=0){col.items.splice(idx,1);showToast('Removed.','info');}else{col.items.push(S.colItemTarget);showToast('Added.','success');}await persistCollections();renderCollectionModal();}
async function createFromModal(){const name=document.getElementById('col-new-name')?.value.trim();if(!name){showToast('Enter name.','error');return;}S.collections.push({id:'col_'+Date.now(),name,items:S.colItemTarget?[S.colItemTarget]:[],createdAt:new Date().toISOString()});await persistCollections();showToast(`"${name}" created.`,'success');renderCollectionModal();}

/* ═══ CSV EXPORT ═══ */
function exportCSV(role){
  if(!S.submissions.length){showToast('No data to export.','warning');return;}
  const hdr=['ID','Timestamp','Category','Topic','Class','Section','Message','Name','Email','Phone','Anonymous','IP','Assigned To','Assigned Role','Status','Notes','Priority','Source','Last Updated'];
  const rows=S.submissions.map(s=>{const ia=s.anonymous==='yes'||s.name==='Anonymous';const ph=ia?'':(s.phone||'');
    return[s.id||'',fmtDate(s.timestamp),s.category||'',s.topic||'',s.class||'',s.section||'',(s.message||'').replace(/"/g,'""'),ia?'Anonymous':(s.name||''),s.email||'',ph?`\t${ph}`:'',ia?'Yes':'No',s.ipAddress||'',s.assignedName||'',s.assignedRole||'',s.status||'',(s.notes||'').replace(/"/g,'""'),s.priority||'',s.sourceSheet||'',fmtDate(s.lastUpdated)].map(v=>`"${v}"`).join(',');
  });
  const csv='\uFEFF'+[hdr.join(','),...rows].join('\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`StMargaret_${role}_${new Date().toISOString().split('T')[0]}.csv`;document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
  showToast(`Exported ${S.submissions.length} records.`,'success');
}

/* ═══ INIT ═══ */
document.addEventListener('DOMContentLoaded',()=>{
  lucide.createIcons();
  populateClassDropdown();
  updateTopics();
  updateSections();

  apiGet({action:'getUsers'}).then(r=>{if(r.success)S.coordinators=(r.users||[]).filter(u=>u.role==='coordinator');}).catch(()=>{});
  getUserIP().catch(()=>{});
  checkSessionRestore();

  document.querySelectorAll('.modal-overlay').forEach(overlay=>{overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.classList.remove('open');});});

  console.log('[StMargaret v4.3 RESTORED] API:',API_URL);
});
