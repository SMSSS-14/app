'use strict';
/* ═══════════════════════════════════════════════════════════
   ST. MARGARET SR. SEC. SCHOOL  —  FEEDBACK PORTAL  v6
   ─────────────────────────────────────────────────────────
   ① PASTE YOUR GOOGLE APPS SCRIPT /exec URL BELOW
     Apps Script → Deploy → Manage Deployments → copy URL
═══════════════════════════════════════════════════════════ */
const API_URL     = 'https://script.google.com/macros/s/PASTE_YOUR_EXEC_URL_HERE/exec';
const ADMIN_EMAIL = 'insaanschool@gmail.com';
const ADMIN_PASS  = 'admin@123';

/* ─── constants ──────────────────────────────────────────── */
const SCHOOL_DOMAIN = 'stmargaretsrsecschool.com';
const COOL_MS  = 30*60*1000;
const COOL_KEY = 'stm_cool6';
const COORD_KEY  = 'stm_coords6';
const PRINC_KEY  = 'stm_princ6';

/* ─── TOPICS ─────────────────────────────────────────────── */
const TOPICS = [
  {v:'Academics & Curriculum',   i:'📚', toPrincipal:false},
  {v:'Homework & Assignments',   i:'📝', toPrincipal:false},
  {v:'Examination & Results',    i:'📊', toPrincipal:false},
  {v:'Teacher Feedback',         i:'👨‍🏫', toPrincipal:true , reason:'Teacher-related matters go directly to the Principal'},
  {v:'School Facilities',        i:'🏫', toPrincipal:false},
  {v:'Cleanliness & Hygiene',    i:'🧹', toPrincipal:false},
  {v:'Library & Resources',      i:'📖', toPrincipal:false},
  {v:'Transport & Bus',          i:'🚌', toPrincipal:false},
  {v:'School Canteen & Food',    i:'🍱', toPrincipal:false},
  {v:'Sports & Physical Ed',     i:'⚽', toPrincipal:false},
  {v:'Cultural & Activities',    i:'🎭', toPrincipal:false},
  {v:'Discipline & Behaviour',   i:'📏', toPrincipal:false},
  {v:'Bullying & Safety',        i:'🛡️', toPrincipal:true , reason:'Safety concerns require immediate Principal attention'},
  {v:'Fee & Administration',     i:'💰', toPrincipal:true , reason:'Administrative and fee matters are handled by the Principal'},
  {v:'Infrastructure & Repairs', i:'🔧', toPrincipal:false},
  {v:'Mental Health & Wellness', i:'💙', toPrincipal:true , reason:'Welfare concerns are reviewed directly by the Principal'},
  {v:'General Suggestion',       i:'💬', toPrincipal:false},
];

/* staff/parent roles always go to principal */
const STAFF_ROLES = ['Teacher / Staff','Parent / Guardian','Alumni','Other'];
const STUDENT_CLASSES = [
  'Bal Vatika 1','Bal Vatika 2',
  'Class 1','Class 2','Class 3','Class 4','Class 5',
  'Class 6','Class 7','Class 8',
  'Class 9','Class 10','Class 11','Class 12',
];

const PALETTE = ['#7ec8f0','#86efac','#f4d06b','#c4b5fd','#f4a070','#fbbf24','#a5f3fc','#fca5a5','#d8b4fe'];

/* ─── STATE ──────────────────────────────────────────────── */
let allSubs     = [];
let curTab      = 'submissions';
let isAnon      = false;
let cachedIP    = null;
let charts      = {};
let session     = null;   // {type:'admin'|'principal'|'coordinator', key, name}
let coords      = [];     // [{key,name,email,password,classes:[]}]
let princCred   = {email:'principal@stmargaretsrsecschool.com',password:'principal@123',name:'Principal'};

/* ─── PERSIST ─────────────────────────────────────────────── */
function saveCoords(){ localStorage.setItem(COORD_KEY, JSON.stringify(coords)); }
function loadCoords(){ try{ const r=localStorage.getItem(COORD_KEY); if(r) coords=JSON.parse(r); }catch(e){ coords=[]; } }
function savePrinc(){ localStorage.setItem(PRINC_KEY, JSON.stringify(princCred)); }
function loadPrinc(){ try{ const r=localStorage.getItem(PRINC_KEY); if(r) princCred=JSON.parse(r); }catch(e){} }

/* per-user collections — totally private */
function colKey(){ return 'stm_c6_'+(session?session.type+'_'+session.key:'admin'); }
function getCols(){ try{ return JSON.parse(localStorage.getItem(colKey())||'[]'); }catch(e){ return []; } }
function putCols(d){ localStorage.setItem(colKey(), JSON.stringify(d)); }

/* ─── UTILS ──────────────────────────────────────────────── */
function H(s){ if(!s)return''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function setEl(id,v){ const e=document.getElementById(id); if(e) e.textContent=String(v); }
function gi(id){ return (document.getElementById(id)?.value||'').trim(); }
function isSchool(e){ return !!(e&&e.trim().toLowerCase().endsWith('@'+SCHOOL_DOMAIN)); }
function coordByKey(k){ return coords.find(c=>c.key===k)||null; }
function coordColor(k){ const i=coords.findIndex(c=>c.key===k); return PALETTE[i%PALETTE.length]||'#94a3b8'; }
function fmtDate(ts){
  if(!ts) return '—';
  const d=new Date(ts); if(isNaN(d)) return String(ts);
  const p=v=>String(v).padStart(2,'0');
  const mon=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
  return `${p(d.getDate())} ${mon} ${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function assignedLabel(k){
  if(!k||k==='principal') return '🏛️ Principal';
  const c=coordByKey(k); return c?'👤 '+c.name:k;
}

/* ─── API ────────────────────────────────────────────────── */
function qs(o){ return Object.entries(o).map(([k,v])=>encodeURIComponent(k)+'='+encodeURIComponent(v??'')).join('&'); }
async function apiGet(p){ const r=await fetch(API_URL+'?'+qs(p)); return r.json(); }
async function apiPost(p){ const r=await fetch(API_URL+'?'+qs(p),{method:'POST'}); return r.json(); }

/* ─── TOAST ──────────────────────────────────────────────── */
function toast(msg,type='info',ms=3800){
  const c=document.getElementById('toasts'); if(!c) return;
  const icons={ok:'✓',err:'✕',info:'ℹ',warn:'⚠'};
  const cls={ok:'t-ok',err:'t-err',info:'t-info',warn:'t-warn'};
  const t=document.createElement('div');
  t.className='toast '+(cls[type]||'t-info');
  t.innerHTML=`<span style="font-size:15px;flex-shrink:0">${icons[type]||'ℹ'}</span><span>${H(msg)}</span>`;
  c.appendChild(t);
  setTimeout(()=>{ t.style.animation='slideOut .3s ease forwards'; setTimeout(()=>t.remove(),300); },ms);
}

/* ─── NAV ────────────────────────────────────────────────── */
function nav(page){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+page)?.classList.add('active');
  window.scrollTo(0,0);
  if(page==='role-login') buildRoleGrid();
}

/* ─── SIDEBAR ────────────────────────────────────────────── */
function openSB(){ document.getElementById('sidebar').classList.add('open'); document.getElementById('sb-overlay').classList.add('show'); }
function closeSB(){ document.getElementById('sidebar').classList.remove('open'); document.getElementById('sb-overlay').classList.remove('show'); }
function toggleSB(){ document.getElementById('sidebar').classList.contains('open')?closeSB():openSB(); }

/* ─── ADMIN TABS ─────────────────────────────────────────── */
const TAB_META={
  submissions:  {title:'All Submissions',        sub:'Supervisor view — every feedback entry'},
  analytics:    {title:'Analytics & Insights',   sub:'Charts across all submissions'},
  principal:    {title:'Principal Dashboard',    sub:'High-severity & teacher-related submissions → Principal'},
  coordinators: {title:'Coordinator Dashboards', sub:'Class-range based submissions per coordinator'},
  credentials:  {title:'Credentials & Settings', sub:'Manage principal login · Add/edit/remove coordinators · Assign class ranges'},
};
function switchTab(tab){
  curTab=tab;
  document.querySelectorAll('.dash-tab').forEach(e=>e.classList.remove('active'));
  document.getElementById('tab-'+tab)?.classList.add('active');
  document.querySelectorAll('.sb-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('sb-'+tab)?.classList.add('active');
  const m=TAB_META[tab]||{title:tab,sub:''};
  setEl('tab-title',m.title); setEl('tab-sub',m.sub);
  if(tab==='submissions')  renderSubmissions();
  if(tab==='analytics')    renderAnalytics();
  if(tab==='principal')    renderPrincipalTab();
  if(tab==='coordinators') renderCoordsTab();
  if(tab==='credentials')  renderCredPage();
  closeSB();
}

/* ─── ROUTING ────────────────────────────────────────────── */
/*
  ROUTING RULES (two-step):
  Step 1 — SEVERITY CHECK (topic-based, ignores class):
    Teacher Feedback, Bullying & Safety, Fee & Administration,
    Mental Health & Wellness → always Principal
  Step 2 — CLASS CHECK:
    Staff/Parent/Alumni/Other → always Principal
    Student class → check which coordinator has this class → that coordinator
    No coordinator has this class → Principal
*/
function getAssignment(classVal, topicVal){
  // Step 1: severity
  const topicObj = TOPICS.find(t=>t.v===topicVal);
  if(topicObj?.toPrincipal) return {key:'principal', reason:topicObj.reason, by:'severity'};
  // Step 2: staff roles
  if(!classVal||STAFF_ROLES.includes(classVal)) return {key:'principal', reason:'Staff and parent submissions are handled by the Principal', by:'role'};
  // Step 3: class-based coordinator lookup
  for(const c of coords){
    if((c.classes||[]).includes(classVal)) return {key:c.key, reason:`${classVal} is in ${c.name}'s assigned class range`, by:'class'};
  }
  // Fallback
  return {key:'principal', reason:'No coordinator is assigned to this class yet', by:'fallback'};
}

/* ─── ANONYMOUS TOGGLE ───────────────────────────────────── */
function toggleAnon(){
  isAnon=!isAnon;
  document.getElementById('anon-pill')?.classList.toggle('on',isAnon);
  document.getElementById('anon-note')?.classList.toggle('show',isAnon);
  document.getElementById('anon-toggle')?.classList.toggle('on',isAnon);
  ['row-name','row-phone'].forEach(id=>{
    const el=document.getElementById(id);
    if(!el) return;
    el.classList.toggle('hide',isAnon);
    el.classList.toggle('show',!isAnon);
  });
  const ni=document.getElementById('f-name'), pi=document.getElementById('f-phone');
  if(ni){ ni.disabled=isAnon; if(isAnon) ni.value=''; }
  if(pi){ pi.disabled=isAnon; if(isAnon) pi.value=''; }
}

/* ─── FORM SETUP ─────────────────────────────────────────── */
function setupForm(){
  // Topics
  const ts=document.getElementById('f-topic');
  if(ts) ts.innerHTML='<option value="">— Select Topic —</option>'+TOPICS.map(t=>`<option value="${H(t.v)}">${t.i} ${H(t.v)}</option>`).join('');
  // Admin filter topic
  const at=document.getElementById('a-topic');
  if(at) at.innerHTML='<option value="">All Topics</option>'+TOPICS.map(t=>`<option value="${H(t.v)}">${H(t.v)}</option>`).join('');
  // Role filter topic
  const rt=document.getElementById('r-topic');
  if(rt) rt.innerHTML='<option value="">All Topics</option>'+TOPICS.map(t=>`<option value="${H(t.v)}">${H(t.v)}</option>`).join('');
  // Classes
  const cs=document.getElementById('f-class');
  if(cs) cs.innerHTML=`<option value="">— Select Class / Role —</option>
    <optgroup label="Pre-Primary"><option>Bal Vatika 1</option><option>Bal Vatika 2</option></optgroup>
    <optgroup label="Primary (1–5)"><option>Class 1</option><option>Class 2</option><option>Class 3</option><option>Class 4</option><option>Class 5</option></optgroup>
    <optgroup label="Middle (6–8)"><option>Class 6</option><option>Class 7</option><option>Class 8</option></optgroup>
    <optgroup label="Secondary (9–10)"><option>Class 9</option><option>Class 10</option></optgroup>
    <optgroup label="Sr. Secondary (11–12)"><option>Class 11</option><option>Class 12</option></optgroup>
    <optgroup label="Staff / Other">${STAFF_ROLES.map(r=>`<option>${H(r)}</option>`).join('')}</optgroup>`;
  // Routing events
  ['f-class','f-topic','f-category'].forEach(id=>document.getElementById(id)?.addEventListener('change',updateRouting));
  document.getElementById('f-email')?.addEventListener('input',updateRouting);
}

/* ─── ROUTING PREVIEW ────────────────────────────────────── */
function updateRouting(){
  const cls=gi('f-class'), topic=gi('f-topic'), email=gi('f-email'), cat=gi('f-category');
  const prev=document.getElementById('route-preview');
  const eb=document.getElementById('email-badge');

  // Email badge
  if(eb){
    if(email){ eb.style.display='block';
      eb.innerHTML=isSchool(email)
        ?`<span class="badge bd-ok" style="font-size:11.5px">🏫 School email → saved to SchoolResponses sheet</span>`
        :`<span class="badge bd-blue" style="font-size:11.5px">🌐 Public email → saved to PublicResponses sheet</span>`;
    } else eb.style.display='none';
  }

  if(!prev) return;
  if(!cls && !topic){ prev.className='route-box'; prev.innerHTML=`<span class="route-icon">🔀</span><div><div class="route-to">Select class &amp; topic above</div><div class="route-name" style="color:var(--ts);font-size:13px;font-weight:500">Routing preview will appear here</div></div>`; return; }

  const {key,reason,by}=getAssignment(cls,topic);
  const isPrincipal = key==='principal';
  const label = isPrincipal ? 'Principal' : (coordByKey(key)?.name||key);
  const icon  = isPrincipal ? '🏛️' : '👤';

  let byBadge='';
  if(by==='severity') byBadge=`<span class="badge bd-err" style="font-size:10.5px">⚠️ High-severity → Principal</span>`;
  else if(by==='role') byBadge=`<span class="badge bd-warn" style="font-size:10.5px">👔 Staff/Parent → Principal</span>`;
  else if(by==='class') byBadge=`<span class="badge bd-blue" style="font-size:10.5px">📖 Class-based routing</span>`;
  else byBadge=`<span class="badge bd-dim" style="font-size:10.5px">⚠ No coordinator assigned</span>`;

  const emailPill=email?(isSchool(email)?`<span class="badge bd-ok" style="font-size:10.5px">SchoolResponses</span>`:`<span class="badge bd-blue" style="font-size:10.5px">PublicResponses</span>`):`<span class="badge bd-dim" style="font-size:10.5px">PublicResponses</span>`;

  prev.className='route-box '+(isPrincipal?'principal-route':'coord-route');
  prev.innerHTML=`
    <span class="route-icon">${icon}</span>
    <div style="flex:1">
      <div class="route-to">Submission will go to</div>
      <div class="route-name">${icon} ${H(label)}</div>
      <div class="route-reason">${H(reason)}</div>
      <div class="route-pills">${byBadge}${emailPill}${cat?`<span class="badge bd-fire" style="font-size:10.5px">${H(cat)}</span>`:''}</div>
    </div>`;
}

/* ─── ROLE LOGIN GRID ────────────────────────────────────── */
function buildRoleGrid(){
  const grid=document.getElementById('role-select-grid');
  if(!grid) return;
  const roles=[
    {key:'principal',name:princCred.name||'Principal',icon:'🏛️',range:'Full oversight'},
    ...coords.map(c=>({key:c.key,name:c.name,icon:'👤',range:rangeStr(c)}))
  ];
  grid.innerHTML=roles.map(r=>`
    <div class="role-card" onclick="selRole('${H(r.key)}')" data-role="${H(r.key)}">
      <div class="role-icon">${r.icon}</div>
      <div class="role-name">${H(r.name)}</div>
      <div class="role-range">${H(r.range)}</div>
    </div>`).join('');
}
function selRole(k){
  document.querySelectorAll('.role-card').forEach(c=>c.classList.remove('sel'));
  document.querySelector(`.role-card[data-role="${k}"]`)?.classList.add('sel');
  const inp=document.getElementById('selected-role'); if(inp) inp.value=k;
}
function rangeStr(c){
  const cl=c.classes||[]; if(!cl.length) return 'No classes assigned';
  if(cl.length<=3) return cl.join(', ');
  return cl[0]+' – '+cl[cl.length-1]+' ('+cl.length+' classes)';
}

/* ─── IP / COOLDOWN ──────────────────────────────────────── */
async function getIP(){
  if(cachedIP) return cachedIP;
  try{ const r=await fetch('https://api.ipify.org?format=json'); cachedIP=(await r.json()).ip; }catch(e){ cachedIP='unavailable'; }
  return cachedIP;
}
function isCool(){ const l=localStorage.getItem(COOL_KEY); return l&&(Date.now()-+l)<COOL_MS; }
function setCool(){ localStorage.setItem(COOL_KEY,Date.now()); }
function coolLeft(){ const r=COOL_MS-(Date.now()-+(localStorage.getItem(COOL_KEY)||0)); return `${Math.floor(r/60000)}m ${Math.floor((r%60000)/1000)}s`; }

/* ─── SUBMIT FORM ────────────────────────────────────────── */
async function submitForm(e){
  e.preventDefault();
  if(isCool()){ toast(`Please wait ${coolLeft()} before submitting again`,'err'); return; }
  const cat=gi('f-category'),cls=gi('f-class'),topic=gi('f-topic'),msg=gi('f-message'),email=gi('f-email');
  if(!cat)          { toast('Select a category','err'); return; }
  if(!cls)          { toast('Select your class / role','err'); return; }
  if(!topic)        { toast('Select a topic','err'); return; }
  if(msg.length<10) { toast('Message must be at least 10 characters','err'); return; }
  let name='Anonymous',phone='Anonymous';
  if(!isAnon){
    name=gi('f-name'); phone=gi('f-phone');
    if(name.length<2)          { toast('Enter your full name','err'); return; }
    if(!/^\d{10}$/.test(phone)){ toast('Phone must be exactly 10 digits','err'); return; }
  }
  const btn=document.getElementById('submit-btn'),
        txt=document.getElementById('submit-txt'),
        spin=document.getElementById('submit-spin'),
        ico=document.getElementById('submit-ico');
  btn.disabled=true; txt.textContent='Submitting…'; spin.style.display=''; ico.style.display='none';
  try{
    const ip=await getIP();
    const {key:assigned,reason}=getAssignment(cls,topic);
    const res=await apiPost({action:'submit',category:cat,name,class:cls,phone,email,topic,message:msg,anonymous:isAnon?'yes':'no',ipAddress:ip,assignedTo:assigned,status:'Pending'});
    if(res.success){
      setCool();
      document.getElementById('feedback-form').reset();
      if(isAnon){ isAnon=true; toggleAnon(); }
      const sm=document.getElementById('success-msg');
      const toLabel=assigned==='principal'?'🏛️ Principal':('👤 '+(coordByKey(assigned)?.name||assigned));
      if(sm) sm.innerHTML=`Your ${H(cat.toLowerCase())} has been submitted to <strong style="color:#f4a070">St. Margaret Sr. Sec. School</strong>.<br>Routed to <strong style="color:#f4d06b">${toLabel}</strong>`;
      nav('success');
    } else throw new Error(res.error||'Submission failed');
  }catch(err){ toast('Submission failed: '+err.message,'err',6000); }
  finally{ btn.disabled=false; txt.textContent='Submit Feedback'; spin.style.display='none'; ico.style.display=''; }
}

/* ─── ADMIN LOGIN ────────────────────────────────────────── */
function adminLogin(e){
  e.preventDefault();
  const em=gi('l-email'), pw=document.getElementById('l-password').value;
  const btn=document.getElementById('login-btn'),txt=document.getElementById('login-txt'),sp=document.getElementById('login-spin');
  btn.disabled=true; txt.textContent='Signing in…'; sp.style.display='';
  setTimeout(()=>{
    if(em===ADMIN_EMAIL&&pw===ADMIN_PASS){
      session={type:'admin',key:'admin',name:'Admin'};
      sessionStorage.setItem('sess',JSON.stringify(session));
      toast('Welcome, Admin!','ok');
      nav('dashboard'); openSB(); loadDashboard();
    } else toast('Incorrect admin credentials','err');
    btn.disabled=false; txt.textContent='Sign In to Admin'; sp.style.display='none';
  },400);
}
function adminLogout(){ sessionStorage.removeItem('sess'); session=null; nav('home'); toast('Logged out','info'); }

/* ─── ROLE LOGIN ─────────────────────────────────────────── */
function roleLogin(e){
  e.preventDefault();
  const key=gi('selected-role'),em=gi('rl-email'),pw=document.getElementById('rl-password').value;
  if(!key){ toast('Click a role card first','err'); return; }
  if(!em) { toast('Enter your email','err'); return; }
  if(!pw) { toast('Enter your password','err'); return; }
  const btn=document.getElementById('role-login-btn'),txt=document.getElementById('rl-txt'),sp=document.getElementById('rl-spin');
  btn.disabled=true; txt.textContent='Signing in…'; sp.style.display='';
  setTimeout(()=>{
    let ok=false;
    if(key==='principal'){
      if(princCred.email.toLowerCase()===em.toLowerCase()&&princCred.password===pw){
        ok=true; session={type:'principal',key:'principal',name:princCred.name||'Principal'};
      }
    } else {
      const c=coordByKey(key);
      if(c&&c.email.toLowerCase()===em.toLowerCase()&&c.password===pw){
        ok=true; session={type:'coordinator',key:c.key,name:c.name};
      }
    }
    if(ok){
      sessionStorage.setItem('sess',JSON.stringify(session));
      toast(`Welcome, ${session.name}!`,'ok');
      nav('role-dashboard'); setupRoleHeader(); loadRoleDash();
    } else toast('Incorrect email or password','err');
    btn.disabled=false; txt.textContent='Sign In'; sp.style.display='none';
  },400);
}
function roleLogout(){ sessionStorage.removeItem('sess'); session=null; nav('home'); toast('Logged out','info'); }
function setupRoleHeader(){
  if(!session) return;
  const isPrincipal=session.key==='principal';
  setEl('role-dash-title', session.name+' Dashboard');
  setEl('role-dash-sub',   isPrincipal?'High-severity &amp; teacher-related submissions • Staff &amp; parent submissions':'Submissions assigned to your class range');
  const badge=document.getElementById('role-badge');
  if(badge) badge.textContent=(isPrincipal?'🏛️ ':'👤 ')+session.name;
}

/* ─── LOAD DASHBOARD ─────────────────────────────────────── */
async function loadDashboard(){
  showLoading('admin-sub-list');
  try{
    const res=await apiGet({action:'getAll'});
    if(!res.success) throw new Error(res.error||'Error');
    allSubs=(res.data||[]).map(normalize);
    buildAssignedFilter();
    const el=document.getElementById('refresh-time');
    if(el) el.textContent='Updated '+new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
  }catch(err){
    allSubs=[];
    const el=document.getElementById('admin-sub-list');
    if(el) el.innerHTML=emptyEl('API not connected','Paste your /exec URL in app.js line 5, then deploy and refresh.');
  }
  if(curTab==='submissions')  renderSubmissions();
  if(curTab==='analytics')    renderAnalytics();
  if(curTab==='principal')    renderPrincipalTab();
  if(curTab==='coordinators') renderCoordsTab();
}

async function loadRoleDash(){
  showLoading('role-sub-list');
  try{
    const res=await apiGet({action:'getAll'});
    if(res.success) allSubs=(res.data||[]).map(normalize);
    else throw new Error(res.error);
  }catch(e){ allSubs=[]; }
  renderRoleStats(); renderRoleList();
}

function buildAssignedFilter(){
  const el=document.getElementById('a-assigned'); if(!el) return;
  el.innerHTML='<option value="">All Assigned</option><option value="principal">🏛️ Principal</option>'
    +coords.map(c=>`<option value="${H(c.key)}">👤 ${H(c.name)}</option>`).join('');
}

/* ─── NORMALIZE ──────────────────────────────────────────── */
function normalize(s){
  return {
    id:         s.id         ||String(Date.now()+Math.random()),
    timestamp:  s.timestamp  ||'',
    category:   s.category   ||'',
    topic:      s.topic      ||'',
    message:    s.message    ||'',
    name:       s.name       ||'Anonymous',
    email:      s.email      ||'',
    phone:      s.phone      ||'',
    class:      s.class      ||s.Class||'',
    anonymous:  s.anonymous  ||'no',
    ipAddress:  s.ipAddress  ||s['IP Address']||'',
    assignedTo: s.assignedTo ||s['Assigned To']||'',
    status:     s.status     ||'Pending',
    sourceSheet:s.sourceSheet||s['Source Sheet']||(isSchool(s.email)?'SchoolResponses':'PublicResponses'),
  };
}

/* ─── ADMIN SUBMISSIONS ──────────────────────────────────── */
function renderSubmissions(){
  const listEl=document.getElementById('admin-sub-list'), cntEl=document.getElementById('a-count');
  if(!listEl) return;
  const q=gi('a-search').toLowerCase(), catF=document.getElementById('a-cat')?.value||'',
        topF=document.getElementById('a-topic')?.value||'', stF=document.getElementById('a-status')?.value||'',
        asF=document.getElementById('a-assigned')?.value||'', shF=document.getElementById('a-sheet')?.value||'',
        anF=document.getElementById('a-anon')?.value||'', dtF=document.getElementById('a-date')?.value||'';
  const f=allSubs.filter(s=>{
    if(catF&&s.category!==catF) return false;
    if(topF&&s.topic!==topF)    return false;
    if(stF&&s.status!==stF)     return false;
    if(asF&&s.assignedTo!==asF) return false;
    if(shF&&s.sourceSheet!==shF)return false;
    if(anF&&s.anonymous!==anF)  return false;
    if(dtF){ try{ if(new Date(s.timestamp).toISOString().split('T')[0]!==dtF) return false; }catch(e){ return false; } }
    if(q&&![s.name,s.email,s.phone,s.message,s.topic,s.category,s.class,s.ipAddress].join(' ').toLowerCase().includes(q)) return false;
    return true;
  });
  if(cntEl) cntEl.textContent=`Showing ${f.length} of ${allSubs.length} submissions`;
  listEl.innerHTML=f.length ? f.map(s=>subCard(s,true)).join('') : emptyEl('No submissions match','Try adjusting your filters');
}

/* ─── SUBMISSION CARD ────────────────────────────────────── */
function subCard(s, isAdmin){
  const anon=s.anonymous==='yes'||s.name==='Anonymous';
  const aLabel=assignedLabel(s.assignedTo);
  const aColor=s.assignedTo==='principal'?'#f4a070':coordColor(s.assignedTo);
  const inCols=getCols().filter(c=>c.ids?.includes(s.id)).map(c=>c.name);
  const allRoles=[{key:'principal',name:'🏛️ Principal'},...coords.map(c=>({key:c.key,name:'👤 '+c.name}))];
  const assignOpts=isAdmin?allRoles.map(r=>`<option value="${H(r.key)}"${s.assignedTo===r.key?' selected':''}>${H(r.name)}</option>`).join(''):'';
  const bodyId=`sb-${H(s.id)}`;
  return `<div class="sub-card${anon?' is-anon':''}">
  <div class="sub-head" onclick="toggleBody('${bodyId}')">
    <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap">
      ${anon?`<span class="badge bd-dim">👤 Anonymous</span>`:`<span style="font-weight:700;font-size:14px;color:var(--tp)">${H(s.name)}</span>`}
      <span class="badge bd-fire" style="font-size:10.5px">${H(s.category)}</span>
      <span class="badge bd-gold" style="font-size:10.5px">${H(s.topic)}</span>
      ${s.status==='Completed'?`<span class="badge bd-ok">✓ Done</span>`:`<span class="badge bd-warn">⏳ Pending</span>`}
      ${s.sourceSheet==='SchoolResponses'?`<span class="badge bd-ok" style="font-size:10.5px">🏫 School</span>`:`<span class="badge bd-blue" style="font-size:10.5px">🌐 Public</span>`}
    </div>
    <div style="margin-top:8px;color:var(--ts);font-size:13px;line-height:1.55">${H((s.message||'').substring(0,170))}${(s.message||'').length>170?'…':''}</div>
    <div style="margin-top:7px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      <span class="badge" style="background:${aColor}22;color:${aColor};border:1px solid ${aColor}44;font-size:10.5px">${H(aLabel)}</span>
      ${s.class?`<span style="font-size:11.5px;color:var(--tm)">📖 ${H(s.class)}</span>`:''}
      ${s.timestamp?`<span style="font-size:11.5px;color:var(--tm)">🕐 ${fmtDate(s.timestamp)}</span>`:''}
    </div>
    ${inCols.length?`<div style="margin-top:7px">${inCols.map(n=>`<span class="col-chip">${H(n)}</span>`).join(' ')}</div>`:''}
  </div>
  <div id="${bodyId}" style="display:none;padding:0 16px 15px;border-top:1px solid rgba(255,255,255,.06)">
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;padding-top:12px;font-size:12.5px;color:var(--ts)">
      ${!anon&&s.phone&&s.phone!=='Anonymous'?`<div><b style="color:var(--tm)">Phone:</b> +91 ${H(s.phone)}</div>`:''}
      ${s.email?`<div><b style="color:var(--tm)">Email:</b> ${H(s.email)}</div>`:''}
      ${s.ipAddress?`<div><b style="color:var(--tm)">IP:</b> ${H(s.ipAddress)}</div>`:''}
      <div><b style="color:var(--tm)">Sheet:</b> ${H(s.sourceSheet)}</div>
    </div>
    <div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.06)">
      <p style="font-size:13px;color:var(--ts);line-height:1.65">${H(s.message)}</p>
    </div>
    ${isAdmin?`<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;padding-top:10px;border-top:1px solid rgba(255,255,255,.06);align-items:center">
      <button onclick="markStatus('${H(s.id)}','${s.status==='Completed'?'Pending':'Completed'}','${H(s.sourceSheet)}')"
        class="${s.status==='Completed'?'btn-err':'btn-ok'}" style="font-size:12px">
        ${s.status==='Completed'?'↩ Mark Pending':'✓ Mark Complete'}
      </button>
      <button onclick="openColModal('${H(s.id)}')" class="btn-ghost" style="font-size:12px;padding:7px 13px">📁 Add to Collection</button>
      <select class="filter-sel" style="font-size:12px" onchange="reassign('${H(s.id)}',this.value,'${H(s.sourceSheet)}')">
        ${assignOpts}
      </select>
    </div>`:''}
  </div>
</div>`;
}
function toggleBody(id){ const b=document.getElementById(id); if(b) b.style.display=b.style.display==='none'?'block':'none'; }

/* ─── PRINCIPAL DASHBOARD (admin view) ───────────────────── */
function renderPrincipalTab(){
  const f=allSubs.filter(s=>s.assignedTo==='principal');
  setEl('p-total',    f.length);
  setEl('p-pending',  f.filter(s=>s.status!=='Completed').length);
  setEl('p-completed',f.filter(s=>s.status==='Completed').length);
  setEl('p-complaints',f.filter(s=>s.category==='Complaint').length);
  const el=document.getElementById('principal-list'); if(!el) return;
  el.innerHTML=f.length ? f.map(s=>subCard(s,true)).join('') : emptyEl('No submissions yet','Teacher feedback, high-severity &amp; staff submissions will appear here.');
}

/* ─── COORDINATOR DASHBOARDS (admin view) ────────────────── */
function renderCoordsTab(){
  const area=document.getElementById('coord-area'); if(!area) return;
  if(!coords.length){
    area.innerHTML=`<div class="card-sm" style="padding:30px;text-align:center;color:var(--tm)">
      <div style="font-size:32px;margin-bottom:12px">👥</div>
      <h3 style="color:var(--ts);font-size:15px;margin-bottom:6px">No coordinators added yet</h3>
      <p style="font-size:13px">Go to <strong style="color:#f4a070">Credentials</strong> to add coordinators and assign class ranges.</p>
    </div>`;
    return;
  }
  const tabsHtml=coords.map((c,i)=>`<button class="ctab-btn${i===0?' active':''}" onclick="switchCoordPanel('${H(c.key)}')" id="ctab-${H(c.key)}">${H(c.name)}</button>`).join('');
  const panelsHtml=coords.map((c,i)=>{
    const f=allSubs.filter(s=>s.assignedTo===c.key);
    const col=coordColor(c.key);
    const pending=f.filter(s=>s.status!=='Completed').length;
    const done=f.filter(s=>s.status==='Completed').length;
    return `<div class="cpanel${i===0?' active':''}" id="cpanel-${H(c.key)}">
      <div style="background:${col}14;border:1px solid ${col}30;border-radius:var(--r12);padding:14px 18px;margin-bottom:14px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <div style="flex:1"><div style="font-size:14px;font-weight:700;color:var(--tp)">👤 ${H(c.name)}</div><div style="font-size:12px;color:var(--tm);margin-top:3px">${H(rangeStr(c))}</div></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <span class="badge" style="background:${col}22;color:${col};border:1px solid ${col}44">Total: ${f.length}</span>
          <span class="badge bd-warn">Pending: ${pending}</span>
          <span class="badge bd-ok">Done: ${done}</span>
        </div>
      </div>
      ${f.length ? f.map(s=>subCard(s,true)).join('') : emptyEl('No submissions yet','Submissions from '+H(rangeStr(c))+' will appear here.')}
    </div>`;
  }).join('');
  area.innerHTML=`<div class="ctabs">${tabsHtml}</div>${panelsHtml}`;
}
function switchCoordPanel(k){
  document.querySelectorAll('.ctab-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.cpanel').forEach(p=>p.classList.remove('active'));
  document.getElementById('ctab-'+k)?.classList.add('active');
  document.getElementById('cpanel-'+k)?.classList.add('active');
}

/* ─── STATUS / REASSIGN ──────────────────────────────────── */
async function markStatus(id,status,sheet){
  const s=allSubs.find(x=>String(x.id)===String(id)); if(s) s.status=status;
  try{
    const res=await apiPost({action:'updateStatus',id,status,sheet});
    if(!res.success) throw new Error(res.error);
  }catch(e){ toast('Sheet update failed: '+e.message,'warn'); }
  toast(`Marked as ${status}`,'ok');
  renderSubmissions();
  if(curTab==='principal')    renderPrincipalTab();
  if(curTab==='coordinators') renderCoordsTab();
}
async function reassign(id,role,sheet){
  const s=allSubs.find(x=>String(x.id)===String(id)); if(s) s.assignedTo=role;
  try{ const res=await apiPost({action:'updateAssignment',id,assignedTo:role,sheet}); if(!res.success) throw new Error(res.error); }catch(e){ toast('Sheet update failed: '+e.message,'warn'); }
  toast(`Reassigned to ${assignedLabel(role)}`,'ok');
  renderSubmissions();
}

/* ─── ROLE DASHBOARD FUNCTIONS ───────────────────────────── */
function switchRTab(t){
  document.querySelectorAll('.rtab-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.rpanel').forEach(p=>p.classList.remove('active'));
  document.getElementById('rt-'+t)?.classList.add('active');
  document.getElementById('rp-'+t)?.classList.add('active');
  if(t==='cols') renderRoleCols();
}
async function roleDashRefresh(){
  const btn=document.querySelector('[onclick="roleDashRefresh()"]');
  if(btn){ btn.disabled=true; btn.style.opacity='.6'; }
  try{
    const res=await apiGet({action:'getAll'});
    if(res.success){ allSubs=(res.data||[]).map(normalize); toast('Refreshed','ok'); }
    else throw new Error(res.error);
  }catch(e){ toast('Refresh failed: '+e.message,'err'); }
  finally{ if(btn){ btn.disabled=false; btn.style.opacity=''; } }
  renderRoleStats(); renderRoleList();
}
function renderRoleStats(){
  if(!session) return;
  const f=allSubs.filter(s=>s.assignedTo===session.key);
  setEl('rs-total',    f.length);
  setEl('rs-pending',  f.filter(s=>s.status!=='Completed').length);
  setEl('rs-completed',f.filter(s=>s.status==='Completed').length);
  setEl('rs-complaints',f.filter(s=>s.category==='Complaint').length);
}
function renderRoleList(){
  if(!session) return;
  const listEl=document.getElementById('role-sub-list'), cntEl=document.getElementById('r-count');
  if(!listEl) return;
  const q=gi('r-search').toLowerCase(), catF=document.getElementById('r-cat')?.value||'',
        topF=document.getElementById('r-topic')?.value||'', stF=document.getElementById('r-status')?.value||'',
        anF=document.getElementById('r-anon')?.value||'', dtF=document.getElementById('r-date')?.value||'';
  const mine=allSubs.filter(s=>s.assignedTo===session.key);
  const f=mine.filter(s=>{
    if(catF&&s.category!==catF) return false;
    if(topF&&s.topic!==topF)    return false;
    if(stF&&s.status!==stF)     return false;
    if(anF&&s.anonymous!==anF)  return false;
    if(dtF){ try{ if(new Date(s.timestamp).toISOString().split('T')[0]!==dtF) return false; }catch(e){ return false; } }
    if(q&&![s.name,s.email,s.phone,s.message,s.topic,s.category,s.class].join(' ').toLowerCase().includes(q)) return false;
    return true;
  });
  if(cntEl) cntEl.textContent=`Showing ${f.length} of ${mine.length} submissions`;
  listEl.innerHTML=f.length ? f.map(s=>roleCard(s)).join('') : emptyEl('No submissions found','Try different filters');
}

/* role card — can mark complete, add to collection */
function roleCard(s){
  const anon=s.anonymous==='yes'||s.name==='Anonymous';
  const inCols=getCols().filter(c=>c.ids?.includes(s.id)).map(c=>c.name);
  const bodyId=`rb-${H(s.id)}`;
  return `<div class="sub-card${anon?' is-anon':''}">
  <div class="sub-head" onclick="toggleBody('${bodyId}')">
    <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap">
      ${anon?`<span class="badge bd-dim">👤 Anonymous</span>`:`<span style="font-weight:700;font-size:14px;color:var(--tp)">${H(s.name)}</span>`}
      <span class="badge bd-fire" style="font-size:10.5px">${H(s.category)}</span>
      <span class="badge bd-gold" style="font-size:10.5px">${H(s.topic)}</span>
      ${s.status==='Completed'?`<span class="badge bd-ok">✓ Done</span>`:`<span class="badge bd-warn">⏳ Pending</span>`}
      ${s.sourceSheet==='SchoolResponses'?`<span class="badge bd-ok" style="font-size:10.5px">🏫 School</span>`:`<span class="badge bd-blue" style="font-size:10.5px">🌐 Public</span>`}
    </div>
    <div style="margin-top:8px;color:var(--ts);font-size:13px;line-height:1.55">${H((s.message||'').substring(0,180))}${(s.message||'').length>180?'…':''}</div>
    <div style="margin-top:7px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      ${s.class?`<span style="font-size:11.5px;color:var(--tm)">📖 ${H(s.class)}</span>`:''}
      ${s.timestamp?`<span style="font-size:11.5px;color:var(--tm)">🕐 ${fmtDate(s.timestamp)}</span>`:''}
    </div>
    ${inCols.length?`<div style="margin-top:7px">${inCols.map(n=>`<span class="col-chip">${H(n)}</span>`).join(' ')}</div>`:''}
  </div>
  <div id="${bodyId}" style="display:none;padding:0 16px 15px;border-top:1px solid rgba(255,255,255,.06)">
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;padding-top:12px;font-size:12.5px;color:var(--ts)">
      ${!anon&&s.phone&&s.phone!=='Anonymous'?`<div><b style="color:var(--tm)">Phone:</b> +91 ${H(s.phone)}</div>`:''}
      ${s.email?`<div><b style="color:var(--tm)">Email:</b> ${H(s.email)}</div>`:''}
      <div><b style="color:var(--tm)">Class:</b> ${H(s.class||'—')}</div>
      <div><b style="color:var(--tm)">Source:</b> ${H(s.sourceSheet)}</div>
    </div>
    <div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.06)">
      <p style="font-size:13px;color:var(--ts);line-height:1.65">${H(s.message)}</p>
    </div>
    <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;padding-top:10px;border-top:1px solid rgba(255,255,255,.06)">
      <button onclick="roleMarkStatus('${H(s.id)}','${s.status==='Completed'?'Pending':'Completed'}','${H(s.sourceSheet)}')"
        class="${s.status==='Completed'?'btn-err':'btn-ok'}" style="font-size:12px">
        ${s.status==='Completed'?'↩ Mark Pending':'✓ Mark Complete'}
      </button>
      <button onclick="openColModal('${H(s.id)}')" class="btn-ghost" style="font-size:12px;padding:7px 13px">📁 My Collections</button>
    </div>
  </div>
</div>`;
}
async function roleMarkStatus(id,status,sheet){
  const s=allSubs.find(x=>String(x.id)===String(id)); if(s) s.status=status;
  try{
    const res=await apiPost({action:'updateStatus',id,status,sheet});
    if(!res.success) throw new Error(res.error);
  }catch(e){ toast('Sheet update failed: '+e.message,'warn'); }
  toast(`Marked as ${status}`,'ok');
  renderRoleStats(); renderRoleList();
}
function roleDashExport(){
  if(!session) return;
  const mine=allSubs.filter(s=>s.assignedTo===session.key);
  if(!mine.length){ toast('No submissions to export','warn'); return; }
  doExport(mine, session.name.replace(/\s+/g,'_'));
}

/* ─── ANALYTICS ──────────────────────────────────────────── */
function renderAnalytics(){
  const s=allSubs;
  setEl('st-total',    s.length);
  setEl('st-pending',  s.filter(x=>x.status!=='Completed').length);
  setEl('st-completed',s.filter(x=>x.status==='Completed').length);
  setEl('st-complaints',s.filter(x=>x.category==='Complaint').length);
  setEl('st-suggest',  s.filter(x=>x.category==='Suggestion').length);
  setEl('st-feedback', s.filter(x=>x.category==='Feedback').length);
  setEl('st-anon',     s.filter(x=>x.anonymous==='yes').length);
  setEl('st-school',   s.filter(x=>x.sourceSheet==='SchoolResponses').length);
  setEl('st-public',   s.filter(x=>x.sourceSheet!=='SchoolResponses').length);
  drawCat(); drawTopic(); drawDate(); drawWork(); drawEmail();
}
function kc(id){ if(charts[id]){ charts[id].destroy(); delete charts[id]; } }
const CD={ plugins:{legend:{labels:{color:'#94a3b8',font:{family:'DM Sans',size:11}}}}, scales:{x:{ticks:{color:'#64748b',font:{size:10}},grid:{color:'rgba(255,255,255,.05)'}},y:{ticks:{color:'#64748b',font:{size:10}},grid:{color:'rgba(255,255,255,.05)'}}} };
function drawCat(){ kc('cc'); const c=document.getElementById('ch-cat'); if(!c) return; const cats=['Suggestion','Complaint','Feedback']; charts['cc']=new Chart(c,{type:'doughnut',data:{labels:cats,datasets:[{data:cats.map(x=>allSubs.filter(s=>s.category===x).length),backgroundColor:['rgba(212,160,23,.8)','rgba(200,64,26,.8)','rgba(42,127,193,.8)'],borderWidth:0}]},options:{plugins:CD.plugins,cutout:'65%',responsive:true,maintainAspectRatio:false}}); }
function drawTopic(){ kc('ct'); const c=document.getElementById('ch-topic'); if(!c) return; const tops=TOPICS.map(t=>t.v); charts['ct']=new Chart(c,{type:'bar',data:{labels:tops.map(t=>t.length>13?t.slice(0,13)+'…':t),datasets:[{data:tops.map(t=>allSubs.filter(s=>s.topic===t).length),backgroundColor:'rgba(200,64,26,.65)',borderRadius:5,borderWidth:0}]},options:{...CD,plugins:{legend:{display:false}},responsive:true,maintainAspectRatio:false}}); }
function drawDate(){ kc('cd'); const c=document.getElementById('ch-date'); if(!c) return; const days=[],lbs=[]; for(let i=6;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); days.push(d.toISOString().split('T')[0]); lbs.push(d.toLocaleDateString('en-IN',{day:'2-digit',month:'short'})); } charts['cd']=new Chart(c,{type:'line',data:{labels:lbs,datasets:[{data:days.map(ds=>allSubs.filter(s=>{ try{ return new Date(s.timestamp).toISOString().split('T')[0]===ds; }catch(e){ return false; } }).length),fill:true,borderColor:'rgba(212,160,23,.9)',backgroundColor:'rgba(212,160,23,.07)',tension:.4,pointBackgroundColor:'rgba(212,160,23,1)',pointRadius:4,borderWidth:2}]},options:{...CD,plugins:{legend:{display:false}},responsive:true,maintainAspectRatio:false}}); }
function drawWork(){ kc('cw'); const c=document.getElementById('ch-work'); if(!c) return; const roles=[{key:'principal',name:'Principal'},...coords.map(x=>({key:x.key,name:x.name}))]; const clrs=['rgba(200,64,26,.75)',...coords.map((_,i)=>PALETTE[i%PALETTE.length]+'bb')]; charts['cw']=new Chart(c,{type:'bar',data:{labels:roles.map(r=>r.name),datasets:[{data:roles.map(r=>allSubs.filter(s=>s.assignedTo===r.key).length),backgroundColor:clrs,borderRadius:7,borderWidth:0}]},options:{...CD,indexAxis:'y',plugins:{legend:{display:false}},responsive:true,maintainAspectRatio:false}}); }
function drawEmail(){ kc('ce'); const c=document.getElementById('ch-email'); if(!c) return; const school=allSubs.filter(s=>s.sourceSheet==='SchoolResponses').length,pub=allSubs.filter(s=>s.sourceSheet!=='SchoolResponses').length; charts['ce']=new Chart(c,{type:'pie',data:{labels:['School Email','Public / No Email'],datasets:[{data:[school,pub],backgroundColor:['rgba(16,185,129,.75)','rgba(42,127,193,.75)'],borderWidth:0}]},options:{plugins:CD.plugins,responsive:true,maintainAspectRatio:false}}); }

/* ─── COLLECTIONS (private per user) ─────────────────────── */
function renderRoleCols(){
  const el=document.getElementById('role-col-list'); if(!el) return;
  const cols=getCols();
  if(!cols.length){ el.innerHTML=emptyEl('No collections yet','Create one with the button above. Collections are private — only you can see them.'); return; }
  el.innerHTML=cols.map((col,i)=>{
    const items=allSubs.filter(s=>(col.ids||[]).includes(s.id));
    return `<div class="card-sm" style="padding:18px;margin-bottom:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:36px;height:36px;border-radius:var(--r12);background:rgba(212,160,23,.18);display:flex;align-items:center;justify-content:center;font-size:18px">📁</div>
          <div><div style="font-size:14px;font-weight:700;color:var(--tp)">${H(col.name)}</div><div style="font-size:12px;color:var(--tm)">${items.length} submission${items.length!==1?'s':''}</div></div>
        </div>
        <button onclick="delCol(${i})" class="btn-err" style="font-size:11.5px;padding:6px 12px">Delete</button>
      </div>
      ${items.length
        ? items.map(s=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:9px 12px;background:rgba(255,255,255,.03);border-radius:var(--r8);margin-bottom:7px;gap:8px;flex-wrap:wrap">
            <div style="font-size:13px;color:var(--ts)">
              <span class="badge bd-fire" style="margin-right:6px;font-size:10.5px">${H(s.category)}</span>
              ${s.anonymous==='yes'?'<span class="badge bd-dim" style="font-size:10.5px">Anon</span>':H(s.name)}
              <span style="color:var(--tm);font-size:12px;margin-left:6px">${H(s.topic)}</span>
            </div>
            <button onclick="removeFromCol(${i},'${H(s.id)}')" class="btn-ghost" style="font-size:11px;padding:4px 10px">Remove</button>
          </div>`).join('')
        : `<p style="font-size:12.5px;color:var(--tm);padding:4px 0">Empty collection.</p>`}
    </div>`;
  }).join('');
}
function newCol(){ const n=prompt('Collection name:'); if(!n?.trim()) return; const c=getCols(); c.push({id:Date.now(),name:n.trim(),ids:[]}); putCols(c); renderRoleCols(); toast(`"${n.trim()}" created`,'ok'); }
function delCol(i){ if(!confirm('Delete this collection?')) return; const c=getCols(); c.splice(i,1); putCols(c); renderRoleCols(); toast('Deleted','info'); }
function removeFromCol(i,id){ const c=getCols(); if(c[i]) c[i].ids=(c[i].ids||[]).filter(x=>x!==id); putCols(c); renderRoleCols(); }

let _cmId=null;
function openColModal(id){
  _cmId=id;
  const modal=document.getElementById('col-modal'), body=document.getElementById('col-modal-body');
  if(!modal||!body) return;
  const cols=getCols();
  body.innerHTML=!cols.length
    ?`<p style="color:var(--ts);margin-bottom:14px">No collections yet.</p><button onclick="newCol();_closeColModal()" class="btn btn-fire" style="padding:10px 20px;font-size:13px">+ New Collection</button>`
    :`<p style="color:var(--tm);font-size:12.5px;margin-bottom:12px">Pick a collection:</p><div style="display:grid;gap:8px">${cols.map((c,i)=>{const inC=(c.ids||[]).includes(id);return`<button onclick="togCol(${i},'${H(id)}')" class="btn-ghost" style="justify-content:space-between;width:100%;padding:11px 14px;font-size:13px"><span>📁 ${H(c.name)}</span><span style="color:${inC?'#6ee7b7':'var(--tm)'}">${inC?'✓ Added':'+ Add'}</span></button>`;}).join('')}</div>`;
  modal.classList.add('open');
}
function togCol(i,id){ const c=getCols(); if(!c[i]) return; c[i].ids=c[i].ids||[]; if(c[i].ids.includes(id)){ c[i].ids=c[i].ids.filter(x=>x!==id); toast('Removed','info'); }else{ c[i].ids.push(id); toast(`Added to "${c[i].name}"`,'ok'); } putCols(c); openColModal(id); renderRoleList(); renderSubmissions(); }
function closeColModal(e){ if(e?.target!==document.getElementById('col-modal')) return; _closeColModal(); }
function _closeColModal(){ document.getElementById('col-modal')?.classList.remove('open'); _cmId=null; }
// alias
function promptNewCollection(){ newCol(); }

/* ─── CREDENTIALS PAGE ───────────────────────────────────── */
async function renderCredPage(){
  const el=document.getElementById('tab-credentials'); if(!el) return;
  // Sync from sheet first
  try{
    const res=await apiGet({action:'getCredentials'});
    if(res.success&&res.data){
      const d=res.data;
      if(d.principal){ princCred.email=d.principal.email||princCred.email; princCred.name=d.principal.name||princCred.name; savePrinc(); }
      Object.entries(d).filter(([k])=>k!=='principal').forEach(([k,v])=>{
        let ex=coordByKey(k);
        if(ex){ ex.name=v.name||ex.name; ex.email=v.email||ex.email; if(v.classes) ex.classes=v.classes.split(',').map(s=>s.trim()).filter(Boolean); }
        else if(v.email){ coords.push({key:k,name:v.name||k,email:v.email,password:v.password||'',classes:v.classes?v.classes.split(',').map(s=>s.trim()).filter(Boolean):[]}); }
      });
      saveCoords();
    }
  }catch(e){}

  el.innerHTML=`
<div style="max-width:880px">
  <!-- Header -->
  <div style="margin-bottom:24px">
    <h2 style="font-size:18px;font-weight:700;color:var(--tp)">Credentials &amp; Settings</h2>
    <p style="color:var(--ts);font-size:13px;margin-top:5px">Manage who can log in, change passwords, assign class ranges. All changes sync to Google Sheets.</p>
  </div>

  <!-- PRINCIPAL -->
  <div style="font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--tm);margin-bottom:12px">Principal Login</div>
  <div class="cred-card" style="margin-bottom:24px;border-left:3px solid #f4a070">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px">
      <div style="width:44px;height:44px;border-radius:var(--r12);background:rgba(200,64,26,.18);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">🏛️</div>
      <div><div style="font-size:15px;font-weight:700;color:var(--tp)">Principal</div><div style="font-size:12px;color:var(--tm)">Receives: Teacher feedback · Bullying &amp; Safety · Fee issues · Staff &amp; parent submissions</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:14px">
      <div><label class="form-label">Display Name</label><input id="pc-name" type="text" class="inp" value="${H(princCred.name||'Principal')}"/></div>
      <div><label class="form-label">Email</label><input id="pc-email" type="email" class="inp" value="${H(princCred.email||'')}"/></div>
      <div><label class="form-label">New Password <span style="font-size:10px;font-weight:400;text-transform:none;color:var(--tm)">(blank = keep)</span></label><input id="pc-pass" type="password" class="inp" placeholder="Enter to change"/></div>
    </div>
    <div style="display:flex;align-items:center;gap:10px">
      <button onclick="savePrincCred()" class="btn btn-fire" style="padding:9px 20px;font-size:13px">💾 Save Principal</button>
      <span id="pc-ok" style="display:none;color:#6ee7b7;font-size:12px">✓ Saved!</span>
    </div>
  </div>

  <!-- ADD COORDINATOR -->
  <div style="font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--tm);margin-bottom:12px">Add New Coordinator</div>
  <div class="cred-card" style="margin-bottom:24px">
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:12px;align-items:end">
      <div><label class="form-label">Name</label><input id="nc-name" type="text" class="inp" placeholder="e.g. Mrs. Sharma"/></div>
      <div><label class="form-label">Email</label><input id="nc-email" type="email" class="inp" placeholder="email@school.com"/></div>
      <div><label class="form-label">Password</label><input id="nc-pass" type="password" class="inp" placeholder="password"/></div>
      <button onclick="addCoord()" class="btn btn-fire" style="padding:12px 20px;font-size:13px;white-space:nowrap;align-self:end">+ Add</button>
    </div>
    <p style="color:var(--tm);font-size:12px;margin-top:10px">After adding, assign classes in the coordinator card below. New coordinator appears in Staff Login immediately.</p>
  </div>

  <!-- COORDINATOR LIST -->
  <div style="font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--tm);margin-bottom:12px">Coordinators (${coords.length})</div>
  <div id="coord-cred-list" style="display:grid;gap:14px;margin-bottom:8px">
    ${coords.length
      ? coords.map(c=>coordCard(c)).join('')
      : `<div class="cred-card" style="text-align:center;padding:28px;color:var(--tm)"><div style="font-size:32px;margin-bottom:10px">👥</div><p>No coordinators added yet. Add one above.</p></div>`}
  </div>
</div>`;
}

function coordCard(c){
  const col=coordColor(c.key);
  return `<div class="cred-card" style="border-left:3px solid ${col}" id="cc-${H(c.key)}">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
    <div style="display:flex;align-items:center;gap:10px">
      <div style="width:40px;height:40px;border-radius:var(--r12);background:${col}22;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">👤</div>
      <div><div style="font-size:14px;font-weight:700;color:var(--tp)">${H(c.name)}</div><div style="font-size:12px;color:var(--tm)">${H(rangeStr(c))}</div></div>
    </div>
    <button onclick="deleteCoord('${H(c.key)}')" class="btn-err" style="font-size:11.5px;padding:6px 12px">🗑 Remove</button>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px">
    <div><label class="form-label">Name</label><input id="c-${H(c.key)}-name" type="text" class="inp" value="${H(c.name)}"/></div>
    <div><label class="form-label">Email</label><input id="c-${H(c.key)}-email" type="email" class="inp" value="${H(c.email)}"/></div>
    <div><label class="form-label">Password <span style="font-size:10px;font-weight:400;text-transform:none;color:var(--tm)">(blank = keep)</span></label><input id="c-${H(c.key)}-pass" type="password" class="inp" placeholder="Enter to change"/></div>
  </div>
  <div style="margin-bottom:14px">
    <label class="form-label" style="margin-bottom:10px">Assigned Classes — click to toggle</label>
    <div style="display:flex;flex-wrap:wrap;gap:8px">
      ${STUDENT_CLASSES.map(cls=>{
        const on=(c.classes||[]).includes(cls);
        return `<label style="display:inline-flex;align-items:center;gap:5px;cursor:pointer;padding:6px 12px;border-radius:var(--r8);border:1.5px solid ${on?col+'55':'rgba(255,255,255,.08)'};background:${on?col+'18':'rgba(255,255,255,.04)'};color:${on?col:'var(--ts)'};font-size:12px;font-weight:${on?700:500};transition:all .18s;user-select:none">
          <input type="checkbox" ${on?'checked':''} style="display:none" onchange="toggleClass('${H(c.key)}','${H(cls)}',this)"/>
          ${on?'✓ ':''}<span>${H(cls)}</span>
        </label>`;
      }).join('')}
    </div>
  </div>
  <div style="display:flex;align-items:center;gap:10px">
    <button onclick="saveCoordCred('${H(c.key)}')" class="btn btn-fire" style="padding:9px 20px;font-size:13px">💾 Save Changes</button>
    <span id="c-${H(c.key)}-ok" style="display:none;color:#6ee7b7;font-size:12px">✓ Saved!</span>
  </div>
</div>`;
}

/* ─── SAVE PRINCIPAL ─────────────────────────────────────── */
async function savePrincCred(){
  const name=gi('pc-name'),email=gi('pc-email'),pass=document.getElementById('pc-pass')?.value||'';
  if(!email){ toast('Email cannot be empty','err'); return; }
  princCred.name=name||princCred.name; princCred.email=email;
  if(pass) princCred.password=pass;
  savePrinc();
  document.getElementById('pc-pass').value='';
  const ok=document.getElementById('pc-ok'); if(ok){ ok.style.display='inline'; setTimeout(()=>ok.style.display='none',2500); }
  toast('Principal credentials saved','ok');
  try{ await apiPost({action:'saveCred',role:'principal',name:princCred.name,email,password:pass||'__keep__'}); }catch(e){}
  buildRoleGrid(); setupRoleHeader();
}

/* ─── ADD COORDINATOR ────────────────────────────────────── */
async function addCoord(){
  const name=gi('nc-name'),email=gi('nc-email'),pass=document.getElementById('nc-pass')?.value||'';
  if(!name)  { toast('Enter coordinator name','err'); return; }
  if(!email) { toast('Enter email','err'); return; }
  if(!pass)  { toast('Enter password','err'); return; }
  if(coords.some(c=>c.email.toLowerCase()===email.toLowerCase())){ toast('This email already exists','err'); return; }
  const key='c_'+Date.now();
  coords.push({key,name,email,password:pass,classes:[]});
  saveCoords();
  ['nc-name','nc-email','nc-pass'].forEach(id=>{ const e=document.getElementById(id); if(e) e.value=''; });
  toast(`${name} added`,'ok');
  try{ await apiPost({action:'saveCred',role:key,name,email,password:pass,classes:''}); }catch(e){}
  renderCredPage(); buildRoleGrid(); buildAssignedFilter();
}

/* ─── SAVE COORDINATOR ───────────────────────────────────── */
async function saveCoordCred(key){
  const c=coordByKey(key); if(!c) return;
  const name=gi(`c-${key}-name`),email=gi(`c-${key}-email`),pass=document.getElementById(`c-${key}-pass`)?.value||'';
  if(!email){ toast('Email cannot be empty','err'); return; }
  c.name=name||c.name; c.email=email; if(pass) c.password=pass;
  saveCoords();
  document.getElementById(`c-${key}-pass`).value='';
  const ok=document.getElementById(`c-${key}-ok`); if(ok){ ok.style.display='inline'; setTimeout(()=>ok.style.display='none',2500); }
  toast(`${c.name} saved`,'ok');
  try{ await apiPost({action:'saveCred',role:key,name:c.name,email,password:pass||'__keep__',classes:(c.classes||[]).join(',')}); }catch(e){}
  buildRoleGrid(); buildAssignedFilter();
  if(curTab==='coordinators') renderCoordsTab();
  if(curTab==='submissions')  renderSubmissions();
}

/* ─── TOGGLE CLASS CHECKBOX ──────────────────────────────── */
function toggleClass(coordKey,cls,checkbox){
  const c=coordByKey(coordKey); if(!c) return;
  if(!c.classes) c.classes=[];
  if(checkbox.checked){
    // Remove from other coordinators first
    coords.forEach(co=>{ if(co.key!==coordKey) co.classes=(co.classes||[]).filter(x=>x!==cls); });
    if(!c.classes.includes(cls)) c.classes.push(cls);
  } else {
    c.classes=c.classes.filter(x=>x!==cls);
  }
  // Update label style
  const lbl=checkbox.closest('label');
  if(lbl){
    const col=coordColor(coordKey);
    lbl.style.borderColor=checkbox.checked?col+'55':'rgba(255,255,255,.08)';
    lbl.style.background=checkbox.checked?col+'18':'rgba(255,255,255,.04)';
    lbl.style.color=checkbox.checked?col:'var(--ts)';
    lbl.style.fontWeight=checkbox.checked?700:500;
    const sp=lbl.querySelector('span'); if(sp) sp.previousSibling.textContent=checkbox.checked?'✓ ':'';
  }
}

/* ─── DELETE COORDINATOR ─────────────────────────────────── */
async function deleteCoord(key){
  const c=coordByKey(key);
  if(!confirm(`Remove coordinator "${c?.name||key}"? Their submissions remain but will show as unassigned.`)) return;
  coords=coords.filter(x=>x.key!==key);
  saveCoords();
  toast('Coordinator removed','info');
  try{ await apiPost({action:'deleteCred',role:key}); }catch(e){}
  renderCredPage(); buildRoleGrid(); buildAssignedFilter();
  if(curTab==='coordinators') renderCoordsTab();
}

/* ─── EXPORT CSV ─────────────────────────────────────────── */
function adminExport(){ if(!allSubs.length){ toast('No data to export','warn'); return; } doExport(allSubs,'stmargarets_all'); }
function doExport(data,fname){
  const H2=['ID','Date & Time','Name','Email','Phone','Category','Topic','Message','Class','Anonymous','IP Address','Assigned To','Status','Source Sheet'];
  const rows=data.map(s=>[
    s.id, fmtDate(s.timestamp), s.name, s.email,
    `'${String(s.phone||'').replace(/'/g,'')}`,   // prefix ' to prevent Excel scientific notation
    s.category, s.topic, (s.message||'').replace(/\n/g,' '),
    s.class, s.anonymous, s.ipAddress,
    assignedLabel(s.assignedTo), s.status, s.sourceSheet
  ].map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(','));
  const csv=[H2.map(h=>`"${h}"`).join(','),...rows].join('\n');
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'}));
  a.download=`${fname}_${new Date().toISOString().split('T')[0]}.csv`;
  a.click(); URL.revokeObjectURL(a.href);
  toast('CSV exported','ok');
}

/* ─── HELPERS ────────────────────────────────────────────── */
function showLoading(id){ const e=document.getElementById(id); if(e) e.innerHTML=`<div style="text-align:center;padding:50px 20px;color:var(--tm)"><div class="spin" style="width:28px;height:28px;margin:0 auto 14px;border-width:3px"></div><p>Loading submissions…</p></div>`; }
function emptyEl(h,p=''){
  return `<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="2"/></svg><h3>${h}</h3>${p?`<p>${p}</p>`:''}</div>`;
}

/* ─── INIT ───────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded',()=>{
  loadCoords(); loadPrinc();
  setupForm();
  getIP();
  // Restore session
  try{
    const raw=sessionStorage.getItem('sess');
    if(raw){
      session=JSON.parse(raw);
      if(session.type==='admin'){ nav('dashboard'); openSB(); loadDashboard(); return; }
      if(session.type==='principal'||session.type==='coordinator'){ nav('role-dashboard'); setupRoleHeader(); loadRoleDash(); return; }
    }
  }catch(e){}
  buildRoleGrid();
});