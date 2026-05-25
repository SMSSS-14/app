/* ═══════════════════════════════════════════════════════════════
   St. Margaret Sr. Sec. School — Feedback Portal
   app.js v4.1 — Severity removed, chip class-range, date fix,
                 analytics fix, BV3 added, A/B/C/D sections
   ⚠️  REPLACE API_URL WITH YOUR DEPLOYED /exec URL
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const API_URL      = 'https://script.google.com/macros/s/AKfycbwrhcn0sA4hnLmvKBfCtBau06ONEy61-FPnImZ-w5S0DGqErNctyl2V-sB--TLOkMx4sw/exec';
const COOLDOWN_MS  = 30 * 60 * 1000;
const COOLDOWN_KEY = 'stm_cooldown_ts';
const SCHOOL_DOMAIN= '@stmargaretsrsecschool.com';

/* ══════════════════════════════════════════
   STATE
══════════════════════════════════════════ */
const S = {
  user: null, submissions: [], allUsers: [], coordinators: [],
  collections: [], charts: {}, colItemTarget: null,
  currentPage: 'home', lastAnalytics: null
};

/* ══════════════════════════════════════════
   TOPICS (category → topics)
══════════════════════════════════════════ */
const TOPICS = {
  'Academic': [
    'Homework Pressure','Examination Stress','Marks Dispute',
    'Classroom Teaching Quality','Doubt Clearing Support',
    'Syllabus Concern','Grading Issue','Study Material Problem'
  ],
  'Teacher Behaviour': [
    'Teaching Methodology','Favouritism / Bias','Harsh Behaviour',
    'Misconduct','Absenteeism','Attitude Issue','Lack of Support'
  ],
  'Infrastructure': [
    'Washroom Cleanliness','Drinking Water Quality','Smart Board / Projector Issue',
    'Furniture Damage','Electricity Problem','Fan / AC Issue',
    'Classroom Condition','Playground Safety','Library Issue'
  ],
  'Discipline': [
    'Student Misconduct','Bullying','Fighting',
    'Harassment','Abuse / Serious Concern','Ragging','Uniform Violation'
  ],
  'Transport': [
    'Bus Delay','Driver Behaviour','Route Problem',
    'Safety Concern','Bus Condition','Route Change Request','Overcrowding'
  ],
  'Administration': [
    'Fee Issue','Office Behaviour','ID Card Problem',
    'Document Delay','Certificate Issue','Admission / Transfer Query','Timetable Issue'
  ],
  'Suggestion': [
    'School Improvement','Event Suggestion','Academic Suggestion',
    'Facility Suggestion','Policy Suggestion','Sports / Activity Suggestion','Club / Society'
  ]
};

/* ── Classes (no streams) ── */
const CLASSES = [
  'Bal Vatika 1 (Pre-Nursery)', 'Bal Vatika 2 (Nursery)', 'Bal Vatika 3 (KG)',
  'Class 1','Class 2','Class 3','Class 4','Class 5',
  'Class 6','Class 7','Class 8',
  'Class 9','Class 10',
  'Class 11','Class 12',
  'Teacher / Staff','Parent / Guardian','Other'
];

/* ── Class chips for coordinator assignment modal ── */
const CLASS_CHIPS = [
  { value:'BV1', label:'Bal Vatika 1' },
  { value:'BV2', label:'Bal Vatika 2' },
  { value:'BV3', label:'Bal Vatika 3' },
  { value:'1',  label:'Class 1'  }, { value:'2',  label:'Class 2'  },
  { value:'3',  label:'Class 3'  }, { value:'4',  label:'Class 4'  },
  { value:'5',  label:'Class 5'  }, { value:'6',  label:'Class 6'  },
  { value:'7',  label:'Class 7'  }, { value:'8',  label:'Class 8'  },
  { value:'9',  label:'Class 9'  }, { value:'10', label:'Class 10' },
  { value:'11', label:'Class 11' }, { value:'12', label:'Class 12' }
];

/* ── Routing constants (topic/category — NO severity) ── */
const PRINCIPAL_TOPICS = [
  'Teaching Methodology','Favouritism / Bias','Harsh Behaviour',
  'Misconduct','Absenteeism','Attitude Issue','Lack of Support',
  'Bullying','Harassment','Abuse / Serious Concern','Ragging','Safety Concern'
];
const PRINCIPAL_CATEGORIES = ['Teacher Behaviour'];

/* Chip state for user modal */
let selectedChips = [];

/* ══════════════════════════════════════════
   API LAYER
══════════════════════════════════════════ */
async function apiGet(params) {
  const url  = API_URL + '?' + new URLSearchParams(params).toString();
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('Network error ' + resp.status);
  return resp.json();
}
async function apiPost(params) {
  const resp = await fetch(API_URL, { method:'POST', body: new URLSearchParams(params) });
  if (!resp.ok) throw new Error('Network error ' + resp.status);
  return resp.json();
}

/* ══════════════════════════════════════════
   PAGE NAVIGATION
══════════════════════════════════════════ */
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('page-' + id);
  if (el) { el.classList.add('active'); el.classList.add('fade-in'); }
  S.currentPage = id;
  lucide.createIcons();
}
function openSidebar(role)  {
  document.getElementById('sidebar-'+role)?.classList.add('open');
  document.getElementById('sb-overlay-'+role)?.classList.add('show');
}
function closeSidebar(role) {
  document.getElementById('sidebar-'+role)?.classList.remove('open');
  document.getElementById('sb-overlay-'+role)?.classList.remove('show');
}

/* ══════════════════════════════════════════
   TOAST
══════════════════════════════════════════ */
function showToast(msg, type = 'info', dur = 4000) {
  const icons = { success:'check-circle', error:'alert-circle', info:'info', warning:'alert-triangle' };
  const cls   = { success:'t-success', error:'t-error', info:'t-info', warning:'t-warning' };
  const t     = document.createElement('div');
  t.className = `toast ${cls[type]||'t-info'}`;
  t.innerHTML = `<i data-lucide="${icons[type]||'info'}" style="width:16px;height:16px;flex-shrink:0;"></i><span>${escHtml(msg)}</span>`;
  document.getElementById('toast-wrap').appendChild(t);
  lucide.createIcons();
  setTimeout(() => { t.classList.add('toast-out'); setTimeout(()=>t.remove(),320); }, dur);
}

/* ══════════════════════════════════════════
   MODALS
══════════════════════════════════════════ */
function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

/* ══════════════════════════════════════════
   UTILITY
══════════════════════════════════════════ */
function escHtml(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                  .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* Date formatter — IST-aware, human-readable */
function fmtDate(d) {
  if (!d) return '—';
  try {
    const dt = (d instanceof Date) ? d : new Date(d);
    if (isNaN(dt.getTime())) return '—';
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    // Use local time (browser's timezone = IST for India)
    const day = dt.getDate();
    const mon = M[dt.getMonth()];
    const yr  = dt.getFullYear();
    let h     = dt.getHours();
    const m   = String(dt.getMinutes()).padStart(2,'0');
    const ap  = h >= 12 ? 'PM' : 'AM';
    h         = h % 12 || 12;
    return `${day} ${mon} ${yr}, ${h}:${m} ${ap}`;
  } catch { return '—'; }
}
function fmtDateShort(d) {
  if (!d) return '—';
  try {
    const dt = (d instanceof Date) ? d : new Date(d);
    if (isNaN(dt.getTime())) return '—';
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${dt.getDate()} ${M[dt.getMonth()]} ${dt.getFullYear()}`;
  } catch { return '—'; }
}
function statusClass(st) {
  return { 'Pending':'st-pending','In Review':'st-review','Escalated':'st-escalated',
           'Resolved':'st-resolved','Closed':'st-closed' }[st] || 'st-pending';
}
function getAvatar(name) { return (name||'U').charAt(0).toUpperCase(); }

/* ══════════════════════════════════════════
   AUTH
══════════════════════════════════════════ */
async function handleLogin(e) {
  e.preventDefault();
  const email    = document.getElementById('l-email').value.trim();
  const password = document.getElementById('l-password').value;
  if (!email || !password) { showToast('Please enter email and password.','error'); return; }

  const btn  = document.getElementById('login-btn');
  const icon = document.getElementById('login-icon');
  const spin = document.getElementById('login-spin');
  btn.disabled = true; icon.style.display = 'none'; spin.classList.remove('hidden');

  try {
    const data = await apiGet({ action:'login', email, password });
    if (data.success) {
      S.user = data.user;
      sessionStorage.setItem('stm_user', JSON.stringify(data.user));
      showToast(`Welcome, ${data.user.name}! 👋`, 'success');
      routeToUserDashboard(data.user);
    } else {
      showToast(data.error || 'Invalid credentials.', 'error');
    }
  } catch (err) {
    showToast('Login failed: ' + err.message, 'error');
  } finally {
    btn.disabled = false; icon.style.display = ''; spin.classList.add('hidden');
  }
}

function routeToUserDashboard(user) {
  if (user.role === 'admin') {
    document.getElementById('admin-name').textContent = user.name;
    document.getElementById('admin-avatar').textContent = getAvatar(user.name);
    showPage('admin');
    loadAdminDashboard();
  } else if (user.role === 'principal') {
    document.getElementById('principal-name').textContent = user.name;
    document.getElementById('principal-avatar').textContent = getAvatar(user.name);
    showPage('principal');
    loadRoleDashboard('principal');
  } else if (user.role === 'coordinator') {
    document.getElementById('coordinator-name').textContent = user.name;
    document.getElementById('coord-avatar').textContent = getAvatar(user.name);
    const range = user.assignedClasses || '—';
    document.getElementById('coord-range-badge').textContent = 'Classes ' + range;
    document.getElementById('coord-class-label').textContent = 'Classes ' + range;
    showPage('coordinator');
    loadRoleDashboard('coordinator');
  }
}

function handleLogout() {
  S.user=null; S.submissions=[]; S.collections=[]; S.allUsers=[]; S.lastAnalytics=null;
  sessionStorage.removeItem('stm_user');
  showToast('Logged out.','info');
  showPage('home');
}

function checkSessionRestore() {
  try {
    const saved = sessionStorage.getItem('stm_user');
    if (saved) { S.user = JSON.parse(saved); routeToUserDashboard(S.user); }
  } catch {}
}

/* ══════════════════════════════════════════
   FORM: POPULATE DROPDOWNS
══════════════════════════════════════════ */
function populateClassDropdown() {
  const sel = document.getElementById('f-class');
  if (!sel) return;
  sel.innerHTML = '<option value="">Select class / role…</option>';
  CLASSES.forEach(c => {
    const o = document.createElement('option');
    o.value = c; o.textContent = c; sel.appendChild(o);
  });
}

function updateTopics() {
  const cat = document.getElementById('f-category')?.value || '';
  const sel = document.getElementById('f-topic');
  if (!sel) return;
  sel.innerHTML = '';
  if (!cat || !TOPICS[cat]) {
    sel.innerHTML = '<option value="">Select category first…</option>'; return;
  }
  const def = document.createElement('option');
  def.value = ''; def.textContent = 'Select topic…'; sel.appendChild(def);
  TOPICS[cat].forEach(t => {
    const o = document.createElement('option'); o.value = t; o.textContent = t; sel.appendChild(o);
  });
}

/* Dynamic sections: 1–10 → A,B,C  |  11–12 → A,B,C,D  |  BV/other → N/A */
function updateSections() {
  const cls = document.getElementById('f-class')?.value || '';
  const sel = document.getElementById('f-section');
  if (!sel) return;
  sel.innerHTML = '';

  let sections;
  const lower = cls.toLowerCase();
  if (!cls || lower.includes('bal vatika') || lower.includes('teacher') ||
      lower.includes('parent') || lower.includes('other') || lower.includes('staff')) {
    sections = ['N/A'];
  } else {
    const m = cls.match(/\d+/);
    const num = m ? parseInt(m[0]) : 0;
    sections = (num >= 11) ? ['A','B','C','D','N/A'] : ['A','B','C','N/A'];
  }
  sections.forEach(s => {
    const o = document.createElement('option');
    o.value = s; o.textContent = s === 'N/A' ? 'N/A' : 'Section ' + s; sel.appendChild(o);
  });
}

/* ══════════════════════════════════════════
   ANONYMOUS TOGGLE
══════════════════════════════════════════ */
let isAnonymous = false;
let cachedIP    = null;

function toggleAnonymous() {
  isAnonymous = !isAnonymous;
  const wrap  = document.getElementById('anon-wrap');
  const pill  = document.getElementById('anon-pill');
  const icon  = document.getElementById('anon-icon');
  const lbl   = document.getElementById('anon-label');
  const sub   = document.getElementById('anon-sub');
  const nameI = document.getElementById('f-name');
  const phoneI= document.getElementById('f-phone');
  const rowN  = document.getElementById('row-name');
  const rowP  = document.getElementById('row-phone');

  pill.classList.toggle('on', isAnonymous);
  wrap.classList.toggle('on', isAnonymous);
  icon.setAttribute('data-lucide', isAnonymous ? 'user-check' : 'user-x');
  lbl.textContent = isAnonymous ? 'Anonymous Mode ON' : 'Submit Anonymously';
  sub.textContent = isAnonymous ? 'Identity hidden — IP still recorded' : 'Hide your name & phone number';

  if (isAnonymous) {
    rowN.classList.replace('expanded','collapsed');
    rowP.classList.replace('expanded','collapsed');
    nameI.value=''; nameI.disabled=true; nameI.removeAttribute('required');
    phoneI.value=''; phoneI.disabled=true; phoneI.removeAttribute('required');
  } else {
    rowN.classList.replace('collapsed','expanded');
    rowP.classList.replace('collapsed','expanded');
    nameI.disabled=false; nameI.setAttribute('required','');
    phoneI.disabled=false; phoneI.setAttribute('required','');
  }
  lucide.createIcons();
}

/* ══════════════════════════════════════════
   EMAIL TYPE BADGE
══════════════════════════════════════════ */
function updateEmailBadge() {
  const email = (document.getElementById('f-email')?.value||'').toLowerCase();
  const badge = document.getElementById('email-type-badge');
  if (!badge) return;
  if (email.includes(SCHOOL_DOMAIN)) {
    badge.innerHTML = `<span class="badge badge-indigo" style="font-size:10px;"><i data-lucide="school" style="width:10px;height:10px;"></i> School</span>`;
  } else if (email.length > 3) {
    badge.innerHTML = `<span class="badge badge-slate" style="font-size:10px;"><i data-lucide="globe" style="width:10px;height:10px;"></i> Public</span>`;
  } else { badge.innerHTML = ''; }
  lucide.createIcons();
}

/* ══════════════════════════════════════════
   LOCAL ROUTING (mirrors backend, no severity)
══════════════════════════════════════════ */
function localParseClassNum(cls) {
  if (!cls) return -1;
  const l = cls.toLowerCase();
  if (l.includes('bal vatika') || l.startsWith('bv') ||
      l.includes('nursery') || l.includes('kg') || l.includes('pre-nursery')) return 0;
  if (l.includes('teacher')||l.includes('parent')||l.includes('other')||l.includes('staff')) return -2;
  const m = cls.match(/\d+/); return m ? parseInt(m[0]) : -1;
}

/* Handles: BV1,BV2,BV3,1,2,3,4,5 | 6,7,8 | 1-5 | BV */
function localFindCoord(classNum, coords) {
  if (classNum < 0) return null;
  for (const c of coords) {
    const range = (c.assignedClasses||'').trim().toUpperCase();
    if (!range || range === 'ALL') continue;
    const parts = range.split(',').map(s=>s.trim());
    for (const part of parts) {
      if (classNum === 0 && (part==='BV'||part==='0'||/^BV\d*$/.test(part))) return c;
      const dm = part.match(/^(\d+)-(\d+)$/);
      if (dm) { const lo=parseInt(dm[1]),hi=parseInt(dm[2]); if(classNum>=lo&&classNum<=hi) return c; continue; }
      const n = parseInt(part);
      if (!isNaN(n) && n === classNum) return c;
    }
  }
  return null;
}

function localComputeRouting(category, topic, cls) {
  const needsPrincipal = PRINCIPAL_TOPICS.includes(topic) || PRINCIPAL_CATEGORIES.includes(category);
  if (needsPrincipal) {
    const reason = category==='Teacher Behaviour' ? 'Teacher behaviour complaint — escalated to Principal'
                 : 'Sensitive topic — Principal oversight required';
    return { role:'Principal', name:'Principal', reason, priority:'High' };
  }
  const classNum = localParseClassNum(cls);
  const coord    = localFindCoord(classNum, S.coordinators);
  if (coord) {
    return { role:'Coordinator', name:coord.name, reason:`Class range handler (${coord.assignedClasses})`, priority:'Normal' };
  }
  return { role:'Principal', name:'Principal', reason:'No coordinator assigned for this class', priority:'Normal' };
}

/* ══════════════════════════════════════════
   ROUTING PREVIEW (live, no severity)
══════════════════════════════════════════ */
function updateRoutingPreview() {
  const cat   = document.getElementById('f-category')?.value || '';
  const top   = document.getElementById('f-topic')?.value    || '';
  const cls   = document.getElementById('f-class')?.value    || '';
  const email = document.getElementById('f-email')?.value    || '';
  const prev  = document.getElementById('routing-preview');
  if (!cat || !top || !cls) { prev.classList.add('hidden'); return; }

  const r        = localComputeRouting(cat, top, cls);
  const isSchool = email.toLowerCase().includes(SCHOOL_DOMAIN);

  document.getElementById('prev-name').textContent = r.name;
  document.getElementById('prev-role-badge').innerHTML = r.role==='Principal'
    ? `<span class="badge badge-indigo" style="font-size:10px;"><i data-lucide="crown" style="width:10px;height:10px;"></i> Principal</span>`
    : `<span class="badge badge-amber" style="font-size:10px;"><i data-lucide="user-check" style="width:10px;height:10px;"></i> Coordinator</span>`;
  document.getElementById('prev-reason').textContent = r.reason;
  document.getElementById('prev-priority').innerHTML =
    `<span class="badge ${r.priority==='High'?'badge-red':'badge-green'}" style="font-size:10px;">${r.priority}</span>`;
  document.getElementById('prev-type').textContent   = isSchool ? '🏫 School Submission' : '🌐 Public Submission';
  prev.classList.remove('hidden');
  lucide.createIcons();
}

/* ══════════════════════════════════════════
   IP DETECTION
══════════════════════════════════════════ */
async function getUserIP() {
  if (cachedIP) return cachedIP;
  for (const svc of [
    { url:'https://api.ipify.org?format=json', key:'ip' },
    { url:'https://api64.ipify.org?format=json', key:'ip' }
  ]) {
    try {
      const ctrl  = new AbortController();
      const timer = setTimeout(()=>ctrl.abort(), 4000);
      const resp  = await fetch(svc.url,{signal:ctrl.signal});
      clearTimeout(timer);
      const d  = await resp.json();
      const ip = d[svc.key]||null;
      if (ip && ip.length > 3) { cachedIP=ip; return ip; }
    } catch { continue; }
  }
  cachedIP = 'unavailable'; return cachedIP;
}

function isCooling()  { const t=localStorage.getItem(COOLDOWN_KEY); return t?(Date.now()-parseInt(t))<COOLDOWN_MS:false; }
function setCooling() { localStorage.setItem(COOLDOWN_KEY,Date.now().toString()); }
function coolRemain() {
  const rem = COOLDOWN_MS-(Date.now()-parseInt(localStorage.getItem(COOLDOWN_KEY)||'0'));
  return `${Math.floor(rem/60000)}m ${Math.floor((rem%60000)/1000)}s`;
}

/* ══════════════════════════════════════════
   FORM SUBMISSION (no severity field)
══════════════════════════════════════════ */
async function handleSubmit(e) {
  e.preventDefault();
  if (isCooling()) { showToast(`⏳ Cooldown active: ${coolRemain()} remaining.`,'warning',7000); return; }

  const category = document.getElementById('f-category').value;
  const topic    = document.getElementById('f-topic').value;
  const cls      = document.getElementById('f-class').value;
  const section  = document.getElementById('f-section').value;
  const message  = document.getElementById('f-message').value.trim();
  const email    = document.getElementById('f-email').value.trim();

  if (!category) { showToast('Please select a category.','error'); return; }
  if (!topic)    { showToast('Please select a topic.','error'); return; }
  if (!cls)      { showToast('Please select your class.','error'); return; }
  if (!message||message.length<10) { showToast('Message must be at least 10 characters.','error'); return; }

  let name='', phone='';
  if (!isAnonymous) {
    name  = document.getElementById('f-name').value.trim();
    phone = document.getElementById('f-phone').value.trim();
    if (!name||name.length<2)          { showToast('Please enter your full name.','error'); return; }
    if (!phone||!/^\d{10}$/.test(phone)) { showToast('Phone must be exactly 10 digits.','error'); return; }
  }

  const btn  = document.getElementById('submit-btn');
  const icon = document.getElementById('submit-icon');
  const spin = document.getElementById('submit-spin');
  btn.disabled=true; icon.style.display='none'; spin.classList.remove('hidden');

  try {
    const ip   = await getUserIP();
    const data = await apiPost({
      action:'submit', category, topic, class:cls, section,
      message, email,
      name:  isAnonymous ? 'Anonymous' : name,
      phone: isAnonymous ? ''          : phone,
      anonymous: isAnonymous ? 'yes' : 'no',
      ipAddress: ip
    });

    if (data.success) {
      setCooling();
      document.getElementById('feedback-form').reset();
      if (isAnonymous) toggleAnonymous();
      updateTopics(); updateSections(); updateRoutingPreview(); updateEmailBadge();

      document.getElementById('success-msg').innerHTML =
        isAnonymous
          ? `Your anonymous feedback has been received by <strong style="color:#fbbf24;">St. Margaret Sr. Sec. School</strong>.`
          : `Thank you, <strong style="color:#fbbf24;">${escHtml(name)}</strong>. Your feedback has been received.`;
      document.getElementById('success-assign').innerHTML =
        `Assigned to: <strong style="color:var(--text1);">${escHtml(data.assignedName||data.assignedRole||'Authority')}</strong>
         &nbsp;·&nbsp; ${escHtml(data.submissionType||'Public')} submission`;
      showPage('success');
    } else if (data.cooldown) {
      setCooling(); showToast('⏳ ' + data.error,'warning',7000);
    } else {
      throw new Error(data.error||'Server error');
    }
  } catch (err) {
    showToast('Submission failed: '+err.message,'error');
  } finally {
    btn.disabled=false; icon.style.display=''; spin.classList.add('hidden');
  }
}

/* ══════════════════════════════════════════
   ADMIN DASHBOARD
══════════════════════════════════════════ */
async function loadAdminDashboard() {
  try {
    const [subResp, usersResp, analyticsResp] = await Promise.all([
      apiGet({ action:'getSubmissions', role:'admin', userId:S.user?.id||'' }),
      apiGet({ action:'getUsers' }),
      apiGet({ action:'getAnalytics',   role:'admin', userId:S.user?.id||'' })
    ]);

    if (subResp.success) {
      S.submissions = subResp.data || [];
      renderAdminSubmissions();
      renderAdminRecent();
    }
    if (usersResp.success) {
      S.allUsers     = usersResp.users || [];
      S.coordinators = S.allUsers.filter(u => u.role==='coordinator');
      renderUsersTable();
    }
    if (analyticsResp.success) {
      S.lastAnalytics = analyticsResp.analytics;
      renderAdminStats(analyticsResp.analytics);
    }
    const el = document.getElementById('admin-last-refresh');
    if (el) el.textContent = 'Updated ' + fmtDate(new Date());
    await loadCollections();
  } catch (err) {
    showToast('Dashboard load error: '+err.message,'error');
  }
}

function renderAdminStats(a) {
  if (!a) return;
  const s = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
  s('astat-total',a.total); s('astat-pending',a.pending); s('astat-resolved',a.resolved);
  s('astat-escalated',a.escalated); s('astat-anon',a.anonymous); s('astat-school',a.school);
}

function renderAdminRecent() {
  const el = document.getElementById('admin-recent-list');
  if (!el) return;
  const recent = S.submissions.slice(0,6);
  if (!recent.length) { el.innerHTML=`<div class="empty-state" style="padding:30px;"><p>No submissions yet.</p></div>`; return; }
  el.innerHTML = recent.map(s => buildMiniCard(s)).join('');
  lucide.createIcons();
}

function buildMiniCard(s) {
  const isAnon = s.anonymous==='yes'||s.name==='Anonymous';
  const name   = isAnon
    ? `<span class="badge badge-anon"><i data-lucide="user-x" style="width:10px;height:10px;"></i> Anonymous</span>`
    : `<strong>${escHtml(s.name)}</strong>`;
  return `<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--border);">
    <div style="flex:1;min-width:0;">
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px;">
        ${name}
        <span class="badge ${statusClass(s.status||'Pending')} badge" style="font-size:10px;">${escHtml(s.status||'Pending')}</span>
        <span class="badge badge-amber" style="font-size:10px;">${escHtml(s.category)}</span>
        <span class="badge badge-slate" style="font-size:10px;">${escHtml(s.assignedName||s.assignedRole||'—')}</span>
      </div>
      <div style="font-size:12px;color:var(--text3);">
        ${escHtml(s.class||'')} · ${escHtml(s.topic||'')} · ${fmtDate(s.timestamp)}
      </div>
    </div>
  </div>`;
}

/* ══════════════════════════════════════════
   ADMIN TAB SWITCHING
══════════════════════════════════════════ */
function switchAdminTab(tab) {
  ['overview','submissions','analytics','users','collections'].forEach(t => {
    document.getElementById('tab-admin-'+t)?.classList.toggle('active', t===tab);
    document.getElementById('sb-admin-'+t)?.classList.toggle('active', t===tab);
  });
  const titles = { overview:'Overview', submissions:'All Submissions', analytics:'Analytics',
                   users:'Users & Credentials', collections:'My Collections' };
  const el1 = document.getElementById('admin-dtitle');
  const el2 = document.getElementById('admin-tab-title');
  if (el1) el1.textContent = titles[tab]||tab;
  if (el2) el2.textContent = titles[tab]||tab;

  if (tab==='analytics') {
    if (S.lastAnalytics) renderAdminCharts(S.lastAnalytics);
    else loadAdminAnalytics();
  }
  if (tab==='users')       renderUsersTable();
  if (tab==='collections') renderCollections('admin');
  closeSidebar('admin');
  lucide.createIcons();
}

/* ══════════════════════════════════════════
   RENDER ADMIN SUBMISSIONS
══════════════════════════════════════════ */
function renderAdminSubmissions() {
  const el      = document.getElementById('admin-sub-list');
  if (!el) return;
  const search  = (document.getElementById('admin-search')?.value||'').toLowerCase();
  const fCat    = document.getElementById('admin-f-cat')?.value    ||'';
  const fStatus = document.getElementById('admin-f-status')?.value ||'';
  const fRole   = document.getElementById('admin-f-role')?.value   ||'';
  const fSheet  = document.getElementById('admin-f-sheet')?.value  ||'';

  const data = S.submissions.filter(s => {
    if (search && ![s.name,s.message,s.class,s.topic,s.category,s.id,s.assignedName]
      .some(v=>(v||'').toLowerCase().includes(search))) return false;
    if (fCat    && s.category    !== fCat)    return false;
    if (fStatus && s.status      !== fStatus) return false;
    if (fRole   && s.assignedRole!== fRole)   return false;
    if (fSheet  && s.sourceSheet !== fSheet)  return false;
    return true;
  });

  if (!data.length) {
    el.innerHTML=`<div class="empty-state"><i data-lucide="inbox"></i><p>No submissions found.</p></div>`;
    lucide.createIcons(); return;
  }
  el.innerHTML = data.map((s,i) => buildSubCard(s,'admin',i)).join('');
  lucide.createIcons();
}

/* ══════════════════════════════════════════
   BUILD SUBMISSION CARD (shared)
══════════════════════════════════════════ */
function buildSubCard(s, dashRole, idx) {
  const isAnon  = s.anonymous==='yes'||s.name==='Anonymous';
  const id      = escHtml(s.id);
  const nameHtml = isAnon
    ? `<span class="badge badge-anon"><i data-lucide="user-x" style="width:10px;height:10px;"></i> Anonymous</span>`
    : `<strong style="font-size:14px;color:var(--text1);">${escHtml(s.name)}</strong>`;
  const sourceTag = s.sourceSheet==='SchoolResponses'
    ? `<span class="badge badge-indigo" style="font-size:10px;">🏫 School</span>`
    : `<span class="badge badge-slate"  style="font-size:10px;">🌐 Public</span>`;
  const assignedBadge = `<span class="badge badge-amber" style="font-size:10px;">
    <i data-lucide="user-check" style="width:9px;height:9px;"></i> ${escHtml(s.assignedName||s.assignedRole||'—')}</span>`;

  const statusOpts = ['Pending','In Review','Escalated','Resolved','Closed']
    .map(st=>`<option value="${st}" ${s.status===st?'selected':''}>${st}</option>`).join('');

  const adminExtras = dashRole==='admin' ? `
    <button onclick="openReassignModal('${id}')" class="btn-ghost btn-sm" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;">
      <i data-lucide="shuffle" style="width:11px;height:11px;"></i> Reassign
    </button>` : '';

  const ipHtml = (dashRole==='admin' && s.ipAddress && s.ipAddress!=='unavailable')
    ? `<span style="font-size:11px;color:var(--indigo2);font-family:'DM Mono',monospace;">
         <i data-lucide="wifi" style="width:10px;height:10px;"></i> ${escHtml(s.ipAddress)}</span>` : '';
  const phoneHtml = (!isAnon && dashRole==='admin' && s.phone)
    ? `<span style="font-size:11px;color:var(--text3);">
         <i data-lucide="phone" style="width:10px;height:10px;"></i> ${escHtml(s.phone)}</span>` : '';

  /* Section display */
  const sectionHtml = (s.section && s.section!=='N/A')
    ? ` · Sec. ${escHtml(s.section)}` : '';

  return `
  <div class="sub-card ${isAnon?'is-anon':''}" id="scard-${id}">
    <div class="sub-card-header" onclick="toggleCard('${id}')">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;flex-wrap:wrap;">
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:5px;">
            ${nameHtml}
            <span class="badge ${statusClass(s.status||'Pending')} badge" style="font-size:10px;">${escHtml(s.status||'Pending')}</span>
            <span class="badge badge-amber"  style="font-size:10px;">${escHtml(s.category)}</span>
            <span class="badge badge-purple" style="font-size:10px;">${escHtml(s.topic)}</span>
            ${dashRole==='admin' ? assignedBadge+sourceTag : ''}
          </div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <span style="font-size:12px;color:var(--text3);display:flex;align-items:center;gap:3px;">
              <i data-lucide="graduation-cap" style="width:11px;height:11px;"></i>
              ${escHtml(s.class||'—')}${sectionHtml}
            </span>
            <span style="font-size:12px;color:var(--text3);display:flex;align-items:center;gap:3px;">
              <i data-lucide="clock" style="width:11px;height:11px;"></i> ${fmtDate(s.timestamp)}
            </span>
            ${phoneHtml} ${ipHtml}
          </div>
        </div>
        <i data-lucide="chevron-down" class="chevron" id="chev-${id}" style="width:16px;height:16px;color:var(--text3);flex-shrink:0;margin-top:2px;"></i>
      </div>
    </div>
    <div class="sub-card-body" id="body-${id}">
      ${isAnon ? `<div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text3);margin-bottom:12px;background:rgba(255,255,255,.03);padding:8px 10px;border-radius:8px;">
        <i data-lucide="shield" style="width:13px;height:13px;color:var(--indigo);"></i> Anonymous submission — identity not stored
      </div>` : ''}
      ${!isAnon&&s.email ? `<div style="font-size:12px;color:var(--text3);margin-bottom:10px;"><i data-lucide="mail" style="width:11px;height:11px;"></i> ${escHtml(s.email)}</div>` : ''}
      <p style="font-size:14px;color:var(--text2);line-height:1.75;margin-bottom:16px;padding:12px 14px;background:rgba(255,255,255,.03);border-radius:10px;border-left:3px solid rgba(245,158,11,.3);">${escHtml(s.message)}</p>
      <div style="margin-bottom:14px;">
        <label class="flabel" style="font-size:11px;margin-bottom:5px;">Internal Notes / Response</label>
        <textarea class="notes-ta" id="notes-${id}" placeholder="Add notes, action taken, or response…">${escHtml(s.notes||'')}</textarea>
        <button onclick="saveNotes('${id}')" class="btn-ghost btn-sm" style="margin-top:6px;display:inline-flex;align-items:center;gap:4px;font-size:11px;">
          <i data-lucide="save" style="width:11px;height:11px;"></i> Save Notes
        </button>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
        <label style="font-size:12px;color:var(--text3);font-weight:600;">Update Status:</label>
        <select onchange="updateStatus('${id}',this.value)" class="filter-inp" style="font-size:12px;padding:6px 10px;border-radius:8px;">
          ${statusOpts}
        </select>
        <button onclick="deleteItem('${id}')" class="btn-danger btn-sm" style="display:inline-flex;align-items:center;gap:4px;">
          <i data-lucide="trash-2" style="width:11px;height:11px;"></i> Delete
        </button>
        <button onclick="openCollectionModal('${id}')" class="btn-outline btn-sm" style="display:inline-flex;align-items:center;gap:4px;">
          <i data-lucide="folder-plus" style="width:11px;height:11px;"></i> Add to Collection
        </button>
        ${adminExtras}
      </div>
    </div>
  </div>`;
}

function toggleCard(id) {
  const body = document.getElementById('body-'+id);
  const chev = document.getElementById('chev-'+id);
  if (!body) return;
  const open = body.classList.toggle('open');
  chev?.classList.toggle('rotated', open);
}

/* ══════════════════════════════════════════
   STATUS & NOTES UPDATES
══════════════════════════════════════════ */
async function updateStatus(id, status) {
  try {
    const notes = document.getElementById('notes-'+id)?.value || '';
    const data  = await apiPost({ action:'updateStatus', id, status, notes,
      userId:S.user?.id||'system', userRole:S.user?.role||'system' });
    if (data.success) {
      const sub = S.submissions.find(s=>s.id===id);
      if (sub) { sub.status=status; if(notes) sub.notes=notes; }
      showToast('Status → ' + status, 'success');
      rerenderCurrentTab();
    } else throw new Error(data.error);
  } catch (err) { showToast('Update failed: '+err.message,'error'); }
}

async function saveNotes(id) {
  const notes = document.getElementById('notes-'+id)?.value || '';
  try {
    const data = await apiPost({ action:'updateNotes', id, notes, userId:S.user?.id||'', userRole:S.user?.role||'' });
    if (data.success) {
      const sub = S.submissions.find(s=>s.id===id);
      if (sub) sub.notes=notes;
      showToast('Notes saved.','success');
    } else throw new Error(data.error);
  } catch (err) { showToast('Save failed: '+err.message,'error'); }
}

async function deleteItem(id) {
  if (!confirm('Delete this submission permanently?')) return;
  try {
    const data = await apiPost({ action:'deleteSubmission', id, userId:S.user?.id||'', userRole:S.user?.role||'' });
    if (data.success) {
      S.submissions = S.submissions.filter(s=>s.id!==id);
      removeFromAllCollections(id);
      showToast('Submission deleted.','success');
      rerenderCurrentTab();
    } else throw new Error(data.error);
  } catch (err) { showToast('Delete failed: '+err.message,'error'); }
}

function rerenderCurrentTab() {
  const p = S.currentPage;
  if      (p==='admin')       { renderAdminSubmissions(); renderAdminRecent(); }
  else if (p==='principal')   renderRoleSubmissions('principal');
  else if (p==='coordinator') renderRoleSubmissions('coordinator');
}

/* ══════════════════════════════════════════
   REASSIGN (admin)
══════════════════════════════════════════ */
function openReassignModal(subId) {
  document.getElementById('reassign-subid').value = subId;
  const sel = document.getElementById('reassign-select');
  sel.innerHTML = '<option value="">Select user…</option>';
  const popt = document.createElement('option');
  popt.value = JSON.stringify({ id:'user_principal_001', role:'Principal', name:'Principal' });
  popt.textContent = 'Principal';
  sel.appendChild(popt);
  S.allUsers.filter(u=>u.role==='coordinator').forEach(u => {
    const opt = document.createElement('option');
    opt.value = JSON.stringify({ id:u.id, role:'Coordinator', name:u.name });
    opt.textContent = `${u.name} (Classes ${u.assignedClasses})`;
    sel.appendChild(opt);
  });
  openModal('modal-reassign');
}

async function handleReassign() {
  const subId = document.getElementById('reassign-subid').value;
  const raw   = document.getElementById('reassign-select').value;
  if (!subId || !raw) { showToast('Please select a user.','error'); return; }
  const target = JSON.parse(raw);
  try {
    const data = await apiPost({ action:'reassign', id:subId,
      assignedTo:target.id, assignedRole:target.role, assignedName:target.name,
      adminId:S.user?.id||'admin' });
    if (data.success) {
      const sub = S.submissions.find(s=>s.id===subId);
      if (sub) { sub.assignedTo=target.id; sub.assignedRole=target.role; sub.assignedName=target.name; }
      showToast(`Reassigned to ${target.name}.`,'success');
      closeModal('modal-reassign');
      rerenderCurrentTab();
    } else throw new Error(data.error);
  } catch (err) { showToast('Reassign failed: '+err.message,'error'); }
}

/* ══════════════════════════════════════════
   ROLE DASHBOARDS (Principal / Coordinator)
══════════════════════════════════════════ */
async function loadRoleDashboard(role) {
  const listEl = document.getElementById(role+'-sub-list');
  if (listEl) listEl.innerHTML = `<div style="text-align:center;padding:50px;color:var(--text3);"><div class="spin" style="margin:0 auto 12px;"></div>Loading submissions…</div>`;

  try {
    const [subResp, analyticsResp] = await Promise.all([
      apiGet({ action:'getSubmissions', role, userId:S.user?.id||'' }),
      apiGet({ action:'getAnalytics',   role, userId:S.user?.id||'' })
    ]);
    if (subResp.success) {
      S.submissions = subResp.data || [];
      renderRoleSubmissions(role);
    } else throw new Error(subResp.error);
    if (analyticsResp.success) {
      S.lastAnalytics = analyticsResp.analytics;
      renderRoleStats(role, analyticsResp.analytics);
    }
    await loadCollections();
  } catch (err) {
    showToast('Load failed: '+err.message,'error');
    if (listEl) listEl.innerHTML=`<div class="empty-state"><i data-lucide="wifi-off"></i><p>${escHtml(err.message)}</p></div>`;
  }
}

function renderRoleStats(role, a) {
  if (!a) return;
  const pre = role==='principal' ? 'pstat' : 'cstat';
  const s   = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
  s(pre+'-total',a.total); s(pre+'-pending',a.pending);
  s(pre+'-resolved',a.resolved); s(pre+'-escalated',a.escalated);
  if (role==='coordinator') s('cstat-inreview',a.inReview);
  // analytics tab counters
  const ap = role==='principal' ? 'pan' : 'can';
  s(ap+'-total',a.total); s(ap+'-pending',a.pending);
  s(ap+'-resolved',a.resolved); s(ap+'-escalated',a.escalated);
  if (role==='coordinator') s('can-inreview',a.inReview);
}

function renderRoleSubmissions(role) {
  const el      = document.getElementById(role+'-sub-list');
  if (!el) return;
  const search  = (document.getElementById(role+'-search')?.value||'').toLowerCase();
  const fStatus = document.getElementById(role+'-f-status')?.value||'';
  const fCat    = document.getElementById(role+'-f-cat')?.value   ||'';

  const data = S.submissions.filter(s => {
    if (search && ![s.name,s.message,s.class,s.topic,s.category,s.id]
      .some(v=>(v||'').toLowerCase().includes(search))) return false;
    if (fStatus && s.status   !== fStatus) return false;
    if (fCat    && s.category !== fCat)    return false;
    return true;
  });

  if (!data.length) {
    el.innerHTML=`<div class="empty-state"><i data-lucide="inbox"></i><p>No submissions assigned to you.</p></div>`;
    lucide.createIcons(); return;
  }
  el.innerHTML = data.map((s,i)=>buildSubCard(s,role,i)).join('');
  lucide.createIcons();
}

function switchRoleTab(role, tab) {
  ['submissions','analytics','collections'].forEach(t => {
    document.getElementById('tab-'+role+'-'+t)?.classList.toggle('active', t===tab);
    document.getElementById('sb-'+role+'-'+t)?.classList.toggle('active',  t===tab);
  });
  if (tab==='analytics') {
    if (S.lastAnalytics) renderRoleCharts(role, S.lastAnalytics);
    else loadRoleAnalytics(role);
  }
  if (tab==='collections') renderCollections(role);
  closeSidebar(role);
  lucide.createIcons();
}

/* ══════════════════════════════════════════
   ANALYTICS
══════════════════════════════════════════ */
async function loadAdminAnalytics() {
  try {
    const resp = await apiGet({ action:'getAnalytics', role:'admin', userId:S.user?.id||'' });
    if (resp.success) {
      S.lastAnalytics = resp.analytics;
      renderAdminCharts(resp.analytics);
    }
  } catch (err) { showToast('Analytics error: '+err.message,'error'); }
}

async function loadRoleAnalytics(role) {
  try {
    const resp = await apiGet({ action:'getAnalytics', role, userId:S.user?.id||'' });
    if (resp.success) {
      S.lastAnalytics = resp.analytics;
      renderRoleCharts(role, resp.analytics);
      renderRoleStats(role, resp.analytics);
    }
  } catch (err) { showToast('Analytics error: '+err.message,'error'); }
}

function renderAdminCharts(a) {
  if (!a) return;
  renderChart('chart-cat',     a.byCategory, 'doughnut', CHART_COLORS);
  renderChart('chart-topic',   a.byTopic,    'bar',      CHART_COLORS);
  renderChart('chart-handler', a.byAssignee, 'doughnut', CHART_COLORS);
  renderChart('chart-source',  { School:a.school||0, Public:a.publicCount||0 }, 'doughnut',
              { School:'#6366f1', Public:'#94a3b8' });
  renderTrend('chart-trend', a.weekly);
}

function renderRoleCharts(role, a) {
  if (!a) return;
  if (role==='principal') {
    renderChart('p-chart-cat', a.byCategory, 'doughnut', CHART_COLORS);
    renderChart('p-chart-top', a.byTopic,    'bar',      CHART_COLORS);
  } else {
    renderChart('c-chart-cat',   a.byCategory, 'doughnut', CHART_COLORS);
    renderChart('c-chart-class', a.byClass,    'bar',      CHART_COLORS);
  }
}

const CHART_COLORS = ['#f59e0b','#6366f1','#22c55e','#3b82f6','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16','#ec4899'];

function renderChart(canvasId, dataObj, type, colors) {
  try {
    const c = document.getElementById(canvasId);
    if (!c) return;
    const labels = Object.keys(dataObj||{});
    const values = Object.values(dataObj||{});
    if (!labels.length) { renderEmptyChart(c); return; }
    if (S.charts[canvasId]) { S.charts[canvasId].destroy(); delete S.charts[canvasId]; }
    const colArr = Array.isArray(colors) ? colors.slice(0,labels.length) : labels.map(l=>colors[l]||'#6366f1');
    const isBar  = type === 'bar';
    S.charts[canvasId] = new Chart(c.getContext('2d'), {
      type,
      data:{ labels, datasets:[{
        data: values,
        backgroundColor: isBar ? colArr.map(c=>c+'66') : colArr,
        borderColor:     colArr,
        borderWidth:     isBar ? 1.5 : 0,
        borderRadius:    isBar ? 6   : 0,
        hoverOffset:     isBar ? 0   : 6
      }]},
      options:{
        responsive:true, maintainAspectRatio:false,
        cutout: type==='doughnut' ? '60%' : undefined,
        plugins:{
          legend:{
            display: type==='doughnut',
            position:'bottom',
            labels:{ color:'#94a3b8', font:{family:'Plus Jakarta Sans',size:11}, boxWidth:12, padding:10 }
          }
        },
        scales: isBar ? {
          x:{ ticks:{color:'#64748b',font:{family:'Plus Jakarta Sans',size:10}}, grid:{color:'rgba(255,255,255,.04)'} },
          y:{ ticks:{color:'#64748b',font:{family:'Plus Jakarta Sans',size:10},stepSize:1}, grid:{color:'rgba(255,255,255,.04)'} }
        } : {}
      }
    });
  } catch(e) { console.error('Chart error:', canvasId, e); }
}

function renderEmptyChart(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = '#334155'; ctx.font = '13px Plus Jakarta Sans';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('No data yet', canvas.width/2, canvas.height/2);
}

function renderTrend(canvasId, weekly) {
  const c = document.getElementById(canvasId);
  if (!c) return;
  if (S.charts[canvasId]) { S.charts[canvasId].destroy(); delete S.charts[canvasId]; }
  const days = {};
  for (let i=13;i>=0;i--) {
    const d=new Date(); d.setDate(d.getDate()-i);
    days[d.toISOString().split('T')[0]] = 0;
  }
  Object.entries(weekly||{}).forEach(([k,v])=>{ if(days[k]!==undefined) days[k]=v; });
  const labels = Object.keys(days).map(d => {
    const dt=new Date(d); const M=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${dt.getUTCDate()} ${M[dt.getUTCMonth()]}`;
  });
  S.charts[canvasId] = new Chart(c.getContext('2d'), {
    type:'bar',
    data:{ labels, datasets:[{
      label:'Submissions', data:Object.values(days),
      backgroundColor:'rgba(245,158,11,.4)', borderColor:'#f59e0b',
      borderWidth:1.5, borderRadius:6
    }]},
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false} },
      scales:{
        x:{ ticks:{color:'#64748b',font:{family:'Plus Jakarta Sans',size:10}},grid:{color:'rgba(255,255,255,.04)'} },
        y:{ ticks:{color:'#64748b',font:{family:'Plus Jakarta Sans',size:10},stepSize:1},grid:{color:'rgba(255,255,255,.04)'},beginAtZero:true }
      }
    }
  });
}

/* ══════════════════════════════════════════
   CHIP CLASS-RANGE SELECTOR
══════════════════════════════════════════ */
function renderClassChipsUI() {
  const container = document.getElementById('class-chips-container');
  if (!container) return;
  container.innerHTML = CLASS_CHIPS.map(chip => `
    <span class="col-chip ${selectedChips.includes(chip.value)?'sel':''}"
          onclick="toggleChip('${chip.value}')"
          id="chip-${chip.value}"
          style="cursor:pointer;user-select:none;">
      ${escHtml(chip.label)}
    </span>`).join('');
  // Update hidden input
  document.getElementById('mu-classrange').value = selectedChips.join(',');
}

function toggleChip(value) {
  const idx = selectedChips.indexOf(value);
  if (idx >= 0) selectedChips.splice(idx,1);
  else selectedChips.push(value);
  renderClassChipsUI();
}

/* Parse stored range string back to chip values array */
function parseChipsFromRange(range) {
  if (!range) return [];
  const result = [];
  range.toUpperCase().split(',').forEach(part => {
    part = part.trim();
    if (!part) return;
    if (/^BV\d*$/.test(part)) { result.push(part); return; }
    if (part === 'BV' || part === '0') { result.push('BV1','BV2','BV3'); return; }
    // Range like "1-5"
    const dm = part.match(/^(\d+)-(\d+)$/);
    if (dm) {
      for (let i=parseInt(dm[1]);i<=parseInt(dm[2]);i++) result.push(String(i));
      return;
    }
    const n = parseInt(part);
    if (!isNaN(n)) result.push(String(n));
  });
  return [...new Set(result)];
}

function toggleClassRangeField() {
  const role = document.getElementById('mu-role')?.value;
  const wrap = document.getElementById('mu-classrange-wrap');
  if (wrap) wrap.style.display = role==='coordinator' ? '' : 'none';
}

/* ══════════════════════════════════════════
   USER MANAGEMENT (admin)
══════════════════════════════════════════ */
function renderUsersTable() {
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;
  const users = S.allUsers.filter(u => u.active !== 'false');
  if (!users.length) {
    tbody.innerHTML='<tr><td colspan="6" style="text-align:center;color:var(--text3);padding:24px;">No users found.</td></tr>'; return;
  }
  tbody.innerHTML = users.map(u => {
    const roleColor = {admin:'badge-amber',principal:'badge-indigo',coordinator:'badge-green'}[u.role]||'badge-slate';
    const canDel    = u.role !== 'admin';
    const rangeDisplay = u.role==='coordinator' ? escHtml(u.assignedClasses||'—') : 'ALL';
    return `<tr>
      <td><strong style="color:var(--text1);">${escHtml(u.name)}</strong></td>
      <td style="color:var(--text2);font-size:12px;">${escHtml(u.email)}</td>
      <td><span class="badge ${roleColor}">${escHtml(u.role)}</span></td>
      <td><span style="font-size:11px;color:var(--amber);font-family:'DM Mono',monospace;background:rgba(245,158,11,.1);border-radius:6px;padding:3px 8px;">${rangeDisplay}</span></td>
      <td style="color:var(--text3);font-size:12px;">${fmtDateShort(u.createdAt)}</td>
      <td>
        <div style="display:flex;gap:6px;">
          <button onclick="openEditUserModal('${escHtml(u.id)}')" class="btn-ghost btn-sm" style="display:inline-flex;align-items:center;gap:4px;">
            <i data-lucide="edit-2" style="width:11px;height:11px;"></i> Edit
          </button>
          ${canDel ? `<button onclick="handleDeleteUser('${escHtml(u.id)}')" class="btn-danger btn-sm" style="display:inline-flex;align-items:center;gap:4px;">
            <i data-lucide="trash-2" style="width:11px;height:11px;"></i>
          </button>` : ''}
        </div>
      </td>
    </tr>`;
  }).join('');
  lucide.createIcons();
}

function openAddUserModal() {
  document.getElementById('mu-name').value     = '';
  document.getElementById('mu-email').value    = '';
  document.getElementById('mu-password').value = '';
  document.getElementById('mu-role').value     = 'coordinator';
  document.getElementById('mu-userid').value   = '';
  document.getElementById('modal-user-title').textContent = 'Add New User';
  document.getElementById('btn-save-user').textContent    = 'Add User';
  selectedChips = [];
  toggleClassRangeField();
  renderClassChipsUI();
  openModal('modal-user');
}

function openEditUserModal(userId) {
  const user = S.allUsers.find(u=>u.id===userId);
  if (!user) return;
  document.getElementById('mu-name').value     = user.name    || '';
  document.getElementById('mu-email').value    = user.email   || '';
  document.getElementById('mu-password').value = '';
  document.getElementById('mu-role').value     = user.role    || 'coordinator';
  document.getElementById('mu-userid').value   = userId;
  document.getElementById('modal-user-title').textContent = 'Edit User';
  document.getElementById('btn-save-user').textContent    = 'Save Changes';
  selectedChips = parseChipsFromRange(user.assignedClasses || '');
  toggleClassRangeField();
  renderClassChipsUI();
  openModal('modal-user');
}

async function handleSaveUser() {
  const userId   = document.getElementById('mu-userid').value;
  const name     = document.getElementById('mu-name').value.trim();
  const email    = document.getElementById('mu-email').value.trim();
  const password = document.getElementById('mu-password').value.trim();
  const role     = document.getElementById('mu-role').value;
  const classes  = document.getElementById('mu-classrange').value.trim(); // built by chip toggles

  if (!name || !email)          { showToast('Name and email are required.','error'); return; }
  if (!userId && !password)     { showToast('Password is required for new user.','error'); return; }
  if (role==='coordinator' && !classes) { showToast('Please select at least one class for this coordinator.','error'); return; }

  try {
    let data;
    if (userId) {
      const params = { action:'updateUser', userId, name, email, assignedClasses:classes, adminId:S.user?.id||'' };
      if (password) params.password = password;
      data = await apiPost(params);
    } else {
      data = await apiPost({ action:'addUser', role, name, email, password, assignedClasses:classes, adminId:S.user?.id||'' });
    }
    if (data.success) {
      showToast(userId ? 'User updated.' : 'User added.','success');
      closeModal('modal-user');
      const resp = await apiGet({ action:'getUsers' });
      if (resp.success) {
        S.allUsers     = resp.users;
        S.coordinators = resp.users.filter(u=>u.role==='coordinator');
        renderUsersTable();
      }
    } else throw new Error(data.error);
  } catch (err) { showToast('Save failed: '+err.message,'error'); }
}

async function handleDeleteUser(userId) {
  const user = S.allUsers.find(u=>u.id===userId);
  if (!confirm(`Deactivate "${user?.name||userId}"? They will lose login access.`)) return;
  try {
    const data = await apiPost({ action:'deleteUser', userId, adminId:S.user?.id||'' });
    if (data.success) {
      showToast('User deactivated.','info');
      const resp = await apiGet({ action:'getUsers' });
      if (resp.success) {
        S.allUsers     = resp.users;
        S.coordinators = resp.users.filter(u=>u.role==='coordinator');
        renderUsersTable();
      }
    } else throw new Error(data.error);
  } catch (err) { showToast('Delete failed: '+err.message,'error'); }
}

/* ══════════════════════════════════════════
   COLLECTIONS (private per user)
══════════════════════════════════════════ */
async function loadCollections() {
  if (!S.user?.id) return;
  try {
    const data = await apiGet({ action:'getCollections', userId:S.user.id });
    if (data.success) S.collections = data.collections || [];
  } catch { S.collections = []; }
}

async function persistCollections() {
  if (!S.user?.id) return;
  try { await apiPost({ action:'saveCollections', userId:S.user.id, collectionsJson:JSON.stringify(S.collections) }); }
  catch { showToast('Collection sync failed.','warning'); }
}

function renderCollections(role) {
  const el = document.getElementById(role+'-collections-list');
  if (!el) return;
  if (!S.collections.length) {
    el.innerHTML=`<div class="empty-state"><i data-lucide="folder-open"></i><p>No collections. Create one to group related submissions.</p></div>`;
    lucide.createIcons(); return;
  }
  el.innerHTML = S.collections.map(col => {
    const items = S.submissions.filter(s=>col.items.includes(s.id));
    return `<div class="col-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div>
          <div style="font-size:15px;font-weight:800;color:var(--text1);display:flex;align-items:center;gap:8px;">
            <i data-lucide="folder" style="width:16px;height:16px;color:var(--amber);"></i> ${escHtml(col.name)}
          </div>
          <div style="font-size:12px;color:var(--text3);margin-top:2px;">${items.length} submission${items.length!==1?'s':''}</div>
        </div>
        <button onclick="deleteCollection('${col.id}','${role}')" class="btn-danger btn-sm" style="display:inline-flex;align-items:center;gap:4px;">
          <i data-lucide="trash-2" style="width:11px;height:11px;"></i> Delete
        </button>
      </div>
      ${!items.length
        ? `<p style="font-size:13px;color:var(--text3);font-style:italic;">Empty collection.</p>`
        : items.map(s=>`<div style="padding:9px 0;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
            <div style="flex:1;min-width:0;">
              <div style="font-size:13px;font-weight:600;color:var(--text1);margin-bottom:2px;">
                ${escHtml(s.anonymous==='yes'?'Anonymous':s.name)}
                <span class="badge badge-amber" style="font-size:9px;">${escHtml(s.category)}</span>
              </div>
              <div style="font-size:11.5px;color:var(--text3);">${escHtml(s.class)} · ${escHtml(s.topic)} · ${fmtDate(s.timestamp)}</div>
            </div>
            <button onclick="removeFromCollection('${col.id}','${s.id}','${role}')" class="btn-ghost btn-sm">Remove</button>
          </div>`).join('')
      }
    </div>`;
  }).join('');
  lucide.createIcons();
}

async function promptCreateCollection() {
  const name = prompt('Enter collection name:');
  if (!name||!name.trim()) return;
  S.collections.push({ id:'col_'+Date.now(), name:name.trim(), items:[], createdAt:new Date().toISOString() });
  await persistCollections();
  showToast(`Collection "${name.trim()}" created.`,'success');
  renderCollections(S.currentPage);
}

async function deleteCollection(colId, role) {
  if (!confirm('Delete this collection? (Submissions are NOT deleted)')) return;
  S.collections = S.collections.filter(c=>c.id!==colId);
  await persistCollections();
  showToast('Collection deleted.','info');
  renderCollections(role||S.currentPage);
}

async function removeFromCollection(colId, subId, role) {
  const col = S.collections.find(c=>c.id===colId);
  if (!col) return;
  col.items = col.items.filter(i=>i!==subId);
  await persistCollections();
  showToast('Removed from collection.','info');
  renderCollections(role||S.currentPage);
}

function removeFromAllCollections(subId) {
  S.collections.forEach(c=>{ c.items=c.items.filter(i=>i!==subId); });
  persistCollections();
}

function openCollectionModal(subId) {
  S.colItemTarget = subId;
  renderCollectionModal();
  openModal('modal-collection');
}

function renderCollectionModal() {
  const body = document.getElementById('modal-col-body');
  const sub  = S.submissions.find(s=>s.id===S.colItemTarget);
  if (!body) return;
  let html = '';
  if (sub) {
    const isAnon = sub.anonymous==='yes'||sub.name==='Anonymous';
    html += `<p style="font-size:13px;color:var(--text2);margin-bottom:14px;">Adding: <strong>${escHtml(isAnon?'Anonymous':sub.name)}</strong> — ${escHtml(sub.topic)}</p>`;
  }
  if (!S.collections.length) {
    html += `<p style="font-size:13px;color:var(--text3);margin-bottom:14px;">No collections yet. Create one below.</p>`;
  } else {
    html += `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;">`;
    S.collections.forEach(col => {
      const inCol = col.items.includes(S.colItemTarget);
      html += `<span class="col-chip ${inCol?'sel':''}" onclick="toggleInCollection('${col.id}')">
        <i data-lucide="${inCol?'check-circle':'folder'}" style="width:12px;height:12px;"></i>
        ${escHtml(col.name)} (${col.items.length})
      </span>`;
    });
    html += `</div>`;
  }
  html += `<div style="display:flex;gap:8px;margin-top:4px;">
    <input id="col-new-name" class="inp" style="border-radius:10px;font-size:13px;padding:9px 12px;" placeholder="New collection name…"/>
    <button onclick="createFromModal()" class="btn-indigo" style="border-radius:10px;padding:9px 14px;font-size:13px;white-space:nowrap;">Create</button>
  </div>
  <button onclick="closeModal('modal-collection')" class="btn-ghost" style="width:100%;margin-top:10px;font-size:13px;">Done</button>`;
  body.innerHTML = html;
  lucide.createIcons();
}

async function toggleInCollection(colId) {
  const col = S.collections.find(c=>c.id===colId);
  if (!col || !S.colItemTarget) return;
  const idx = col.items.indexOf(S.colItemTarget);
  if (idx>=0) { col.items.splice(idx,1); showToast('Removed from collection.','info'); }
  else        { col.items.push(S.colItemTarget); showToast('Added to collection.','success'); }
  await persistCollections();
  renderCollectionModal();
}

async function createFromModal() {
  const name = document.getElementById('col-new-name')?.value.trim();
  if (!name) { showToast('Enter a collection name.','error'); return; }
  const col = { id:'col_'+Date.now(), name, items:S.colItemTarget?[S.colItemTarget]:[], createdAt:new Date().toISOString() };
  S.collections.push(col);
  await persistCollections();
  showToast(`Collection "${name}" created.`,'success');
  renderCollectionModal();
}

/* ══════════════════════════════════════════
   CSV EXPORT
══════════════════════════════════════════ */
function exportCSV(role) {
  if (!S.submissions.length) { showToast('No data to export.','warning'); return; }
  const headers = ['ID','Timestamp','Category','Topic','Class','Section','Message',
                   'Name','Email','Phone','Anonymous','IP Address','Assigned To',
                   'Assigned Role','Status','Notes','Priority','Source','Last Updated'];
  const rows = S.submissions.map(s => {
    const isAnon = s.anonymous==='yes'||s.name==='Anonymous';
    const phone  = isAnon ? '' : (s.phone||'');
    return [
      s.id||'', fmtDate(s.timestamp),
      s.category||'', s.topic||'',
      s.class||'', s.section||'',
      (s.message||'').replace(/"/g,'""'),
      isAnon ? 'Anonymous' : (s.name||''),
      s.email||'',
      phone ? `\t${phone}` : '',   /* Tab prefix prevents Excel sci-notation */
      isAnon ? 'Yes' : 'No',
      s.ipAddress||'',
      s.assignedName||s.assignedRole||'', s.assignedRole||'',
      s.status||'', (s.notes||'').replace(/"/g,'""'),
      s.priority||'', s.sourceSheet||'',
      fmtDate(s.lastUpdated)
    ].map(v=>`"${v}"`).join(',');
  });
  const csv  = '\uFEFF' + [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href=url; a.download=`StMargaret_${role}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(`Exported ${S.submissions.length} records.`,'success');
}

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  populateClassDropdown();
  updateTopics();
  updateSections();

  /* Pre-load coordinators for routing preview */
  apiGet({ action:'getUsers' }).then(r => {
    if (r.success) S.coordinators = (r.users||[]).filter(u=>u.role==='coordinator');
  }).catch(()=>{});

  getUserIP().catch(()=>{});
  checkSessionRestore();

  /* Close modals on background click */
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target===overlay) overlay.classList.remove('open');
    });
  });

  console.log('[StMargaret] Portal v4.1 ready. API:', API_URL);
});