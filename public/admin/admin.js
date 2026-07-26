const SOCIAL_KEYS = ['facebook','instagram','linkedin','behance','dribbble','github','tiktok','youtube'];

const loginScreen = document.getElementById('loginScreen');
const dashboard = document.getElementById('dashboard');

async function checkSession(){
  const res = await fetch('/api/admin/session');
  const data = await res.json();
  if(data.isAdmin){
    loginScreen.classList.add('hidden');
    dashboard.classList.remove('hidden');
    initDashboard();
  } else {
    loginScreen.classList.remove('hidden');
    dashboard.classList.add('hidden');
  }
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const payload = Object.fromEntries(fd.entries());
  const errEl = document.getElementById('loginError');
  errEl.classList.add('hidden');
  try{
    const res = await fetch('/api/admin/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    if(!res.ok){ const d = await res.json(); throw new Error(d.error || 'Login failed'); }
    checkSession();
  }catch(err){
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch('/api/admin/logout', { method:'POST' });
  checkSession();
});

/* ---------- Tabs ---------- */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
    document.getElementById('tab-' + btn.dataset.tab).classList.remove('hidden');
  });
});

let dashInitialized = false;
function initDashboard(){
  if(dashInitialized) return;
  dashInitialized = true;
  loadMessages();
  loadPortfolio();
  loadTestimonials();
  loadConfig();
  setupPortfolioForm();
  setupTestiForm();
}

/* ---------- Messages ---------- */
async function loadMessages(){
  const res = await fetch('/api/admin/messages');
  const messages = await res.json();
  const unread = messages.filter(m => !m.read).length;
  document.getElementById('unreadBadge').textContent = unread ? `(${unread})` : '';
  const list = document.getElementById('messagesList');
  if(!messages.length){ list.innerHTML = '<p class="text-muted text-sm">No messages yet.</p>'; return; }
  list.innerHTML = messages.map(m => `
    <div class="glass rounded-xl p-4 ${m.read ? 'opacity-70' : ''}">
      <div class="flex items-center justify-between mb-1">
        <p class="font-semibold text-sm">${escapeHtml(m.name)} ${!m.read ? '<span class="text-accent text-[10px] ml-1">NEW</span>' : ''}</p>
        <p class="text-[11px] text-muted">${new Date(m.createdAt).toLocaleString()}</p>
      </div>
      <p class="text-xs text-muted mb-2"><a href="mailto:${m.email}" class="hover:text-white">${escapeHtml(m.email)}</a></p>
      <p class="text-sm mb-3">${escapeHtml(m.message)}</p>
      <div class="flex gap-2">
        ${!m.read ? `<button data-id="${m.id}" class="mark-read-btn text-xs px-3 py-1 rounded-lg glass hover:bg-white/10">Mark read</button>` : ''}
        <button data-id="${m.id}" class="delete-msg-btn text-xs px-3 py-1 rounded-lg glass hover:bg-red-500/20 text-red-300">Delete</button>
      </div>
    </div>`).join('');

  list.querySelectorAll('.mark-read-btn').forEach(b => b.addEventListener('click', async () => {
    await fetch(`/api/admin/messages/${b.dataset.id}/read`, { method:'PATCH' });
    loadMessages();
  }));
  list.querySelectorAll('.delete-msg-btn').forEach(b => b.addEventListener('click', async () => {
    if(!confirm('Delete this message?')) return;
    await fetch(`/api/admin/messages/${b.dataset.id}`, { method:'DELETE' });
    loadMessages();
  }));
}

/* ---------- Portfolio ---------- */
function setupPortfolioForm(){
  document.getElementById('addPortfolioBtn').addEventListener('click', () => {
    resetPortfolioForm();
    document.getElementById('portfolioForm').classList.remove('hidden');
  });
  document.getElementById('pf-cancel').addEventListener('click', () => {
    document.getElementById('portfolioForm').classList.add('hidden');
  });
  document.getElementById('pf-save').addEventListener('click', async () => {
    const id = document.getElementById('pf-id').value;
    const fd = new FormData();
    fd.append('title', document.getElementById('pf-title').value);
    fd.append('category', document.getElementById('pf-category').value);
    fd.append('description', document.getElementById('pf-desc').value);
    const fileInput = document.getElementById('pf-image');
    if(fileInput.files[0]) fd.append('image', fileInput.files[0]);

    const url = id ? `/api/admin/portfolio/${id}` : '/api/admin/portfolio';
    const method = id ? 'PUT' : 'POST';
    await fetch(url, { method, body: fd });
    document.getElementById('portfolioForm').classList.add('hidden');
    loadPortfolio();
  });
}
function resetPortfolioForm(){
  document.getElementById('pf-id').value = '';
  document.getElementById('pf-title').value = '';
  document.getElementById('pf-category').value = 'branding';
  document.getElementById('pf-desc').value = '';
  document.getElementById('pf-image').value = '';
}
async function loadPortfolio(){
  const res = await fetch('/api/admin/portfolio');
  const items = await res.json();
  const list = document.getElementById('portfolioList');
  if(!items.length){ list.innerHTML = '<p class="text-muted text-sm">No portfolio items yet.</p>'; return; }
  list.innerHTML = items.map(p => `
    <div class="glass rounded-xl p-4 flex items-center gap-4">
      ${p.image ? `<img src="${p.image}" class="thumb">` : `<div class="thumb flex items-center justify-center"><i class="fa-solid fa-image text-muted/50"></i></div>`}
      <div class="flex-1 min-w-0">
        <p class="font-semibold text-sm truncate">${escapeHtml(p.title)}</p>
        <p class="text-[11px] text-accent uppercase tracking-wide">${p.category}</p>
        <p class="text-xs text-muted truncate">${escapeHtml(p.description||'')}</p>
      </div>
      <div class="flex gap-2 flex-shrink-0">
        <button data-id="${p.id}" class="edit-p-btn text-xs px-3 py-1.5 rounded-lg glass hover:bg-white/10">Edit</button>
        <button data-id="${p.id}" class="del-p-btn text-xs px-3 py-1.5 rounded-lg glass hover:bg-red-500/20 text-red-300">Delete</button>
      </div>
    </div>`).join('');

  list.querySelectorAll('.edit-p-btn').forEach(b => b.addEventListener('click', () => {
    const item = items.find(i => i.id === b.dataset.id);
    document.getElementById('pf-id').value = item.id;
    document.getElementById('pf-title').value = item.title;
    document.getElementById('pf-category').value = item.category;
    document.getElementById('pf-desc').value = item.description || '';
    document.getElementById('portfolioForm').classList.remove('hidden');
    document.getElementById('portfolioForm').scrollIntoView({behavior:'smooth'});
  }));
  list.querySelectorAll('.del-p-btn').forEach(b => b.addEventListener('click', async () => {
    if(!confirm('Delete this project?')) return;
    await fetch(`/api/admin/portfolio/${b.dataset.id}`, { method:'DELETE' });
    loadPortfolio();
  }));
}

/* ---------- Testimonials ---------- */
function setupTestiForm(){
  document.getElementById('addTestiBtn').addEventListener('click', () => {
    resetTestiForm();
    document.getElementById('testiForm').classList.remove('hidden');
  });
  document.getElementById('tf-cancel').addEventListener('click', () => {
    document.getElementById('testiForm').classList.add('hidden');
  });
  document.getElementById('tf-save').addEventListener('click', async () => {
    const id = document.getElementById('tf-id').value;
    const payload = {
      quote: document.getElementById('tf-quote').value,
      name: document.getElementById('tf-name').value,
      role: document.getElementById('tf-role').value,
    };
    const url = id ? `/api/admin/testimonials/${id}` : '/api/admin/testimonials';
    const method = id ? 'PUT' : 'POST';
    await fetch(url, { method, headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    document.getElementById('testiForm').classList.add('hidden');
    loadTestimonials();
  });
}
function resetTestiForm(){
  document.getElementById('tf-id').value = '';
  document.getElementById('tf-quote').value = '';
  document.getElementById('tf-name').value = '';
  document.getElementById('tf-role').value = '';
}
async function loadTestimonials(){
  const res = await fetch('/api/admin/testimonials');
  const items = await res.json();
  const list = document.getElementById('testiList');
  if(!items.length){ list.innerHTML = '<p class="text-muted text-sm">No testimonials yet.</p>'; return; }
  list.innerHTML = items.map(t => `
    <div class="glass rounded-xl p-4">
      <p class="text-sm mb-2">"${escapeHtml(t.quote)}"</p>
      <p class="text-xs text-muted mb-3">— ${escapeHtml(t.name)}, ${escapeHtml(t.role)}</p>
      <div class="flex gap-2">
        <button data-id="${t.id}" class="edit-t-btn text-xs px-3 py-1.5 rounded-lg glass hover:bg-white/10">Edit</button>
        <button data-id="${t.id}" class="del-t-btn text-xs px-3 py-1.5 rounded-lg glass hover:bg-red-500/20 text-red-300">Delete</button>
      </div>
    </div>`).join('');

  list.querySelectorAll('.edit-t-btn').forEach(b => b.addEventListener('click', () => {
    const item = items.find(i => i.id === b.dataset.id);
    document.getElementById('tf-id').value = item.id;
    document.getElementById('tf-quote').value = item.quote;
    document.getElementById('tf-name').value = item.name;
    document.getElementById('tf-role').value = item.role;
    document.getElementById('testiForm').classList.remove('hidden');
    document.getElementById('testiForm').scrollIntoView({behavior:'smooth'});
  }));
  list.querySelectorAll('.del-t-btn').forEach(b => b.addEventListener('click', async () => {
    if(!confirm('Delete this testimonial?')) return;
    await fetch(`/api/admin/testimonials/${b.dataset.id}`, { method:'DELETE' });
    loadTestimonials();
  }));
}

/* ---------- Settings ---------- */
document.getElementById('socialInputs').innerHTML = SOCIAL_KEYS.map(k => `
  <div><label class="text-xs text-muted block mb-1 capitalize">${k}</label><input id="soc-${k}" class="w-full rounded-lg px-3 py-2 text-sm" placeholder="https://"></div>
`).join('');

async function loadConfig(){
  const res = await fetch('/api/config');
  const cfg = await res.json();
  document.getElementById('cfg-phone').value = cfg.phone || '';
  document.getElementById('cfg-whatsapp').value = cfg.whatsapp || '';
  document.getElementById('cfg-email').value = cfg.email || '';
  document.getElementById('cfg-website').value = cfg.website || '';
  document.getElementById('cfg-location').value = cfg.location || '';
  SOCIAL_KEYS.forEach(k => { document.getElementById('soc-' + k).value = (cfg.socials || {})[k] || ''; });
}

document.getElementById('saveConfigBtn').addEventListener('click', async () => {
  const socials = {};
  SOCIAL_KEYS.forEach(k => { socials[k] = document.getElementById('soc-' + k).value.trim(); });
  const payload = {
    phone: document.getElementById('cfg-phone').value.trim(),
    whatsapp: document.getElementById('cfg-whatsapp').value.trim(),
    email: document.getElementById('cfg-email').value.trim(),
    website: document.getElementById('cfg-website').value.trim(),
    location: document.getElementById('cfg-location').value.trim(),
    socials,
  };
  await fetch('/api/admin/config', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
  const note = document.getElementById('configNote');
  note.classList.remove('hidden');
  setTimeout(() => note.classList.add('hidden'), 2500);
});

/* ---------- Account ---------- */
document.getElementById('changePassBtn').addEventListener('click', async () => {
  const currentPassword = document.getElementById('acc-current').value;
  const newPassword = document.getElementById('acc-new').value;
  const note = document.getElementById('accNote');
  try{
    const res = await fetch('/api/admin/change-password', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ currentPassword, newPassword }) });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error);
    note.textContent = 'Password updated successfully.';
    note.className = 'text-xs text-accent';
    document.getElementById('acc-current').value = '';
    document.getElementById('acc-new').value = '';
  }catch(err){
    note.textContent = err.message;
    note.className = 'text-xs text-red-400';
  }
  note.classList.remove('hidden');
});

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

checkSession();
