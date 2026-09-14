/* ─────────────────────────────────────────────────────────────────────────
   SnapWed Admin App JS
   ────────────────────────────────────────────────────────────────────────── */

const api = {
  async get(url) { const r = await fetch(url); if (!r.ok) throw new Error((await r.json()).error); return r.json(); },
  async post(url, body) { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); if (!r.ok) throw new Error((await r.json()).error); return r.json(); },
  async put(url, body) { const r = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); if (!r.ok) throw new Error((await r.json()).error); return r.json(); },
  async del(url) { const r = await fetch(url, { method: 'DELETE' }); if (!r.ok) throw new Error((await r.json()).error); return r.json(); },
};

function toast(msg, duration = 3000) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), duration);
}

// ─── State ────────────────────────────────────────────────────────────────
let currentEventId = null;
let events = [];

// ─── Login ────────────────────────────────────────────────────────────────
const loginOverlay = document.getElementById('login-overlay');
const mainApp = document.getElementById('main-app');

async function checkAuth() {
  const { isAdmin } = await api.get('/api/admin/me');
  if (isAdmin) showApp();
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const pw = document.getElementById('password-input').value;
  const btn = document.getElementById('login-btn');
  const spinner = document.getElementById('login-spinner');
  const errEl = document.getElementById('login-error');
  const btnText = document.getElementById('login-btn-text');
  btn.disabled = true; spinner.classList.remove('hidden'); btnText.textContent = '';
  errEl.classList.add('hidden');
  try {
    await api.post('/api/admin/login', { password: pw });
    showApp();
  } catch {
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false; spinner.classList.add('hidden'); btnText.textContent = 'Login';
  }
});

function showApp() {
  loginOverlay.classList.add('hidden');
  mainApp.classList.remove('hidden');
  checkDriveStatus();
  loadEvents();
  // Handle Drive callback params
  const params = new URLSearchParams(location.search);
  if (params.get('driveConnected')) { toast('✅ Google Drive connected!'); history.replaceState({}, '', '/admin'); }
  if (params.get('driveError')) { toast('❌ Google Drive connection failed. Try again.', 5000); history.replaceState({}, '', '/admin'); }
}

document.getElementById('logout-btn').addEventListener('click', async () => {
  await api.post('/api/admin/logout', {});
  location.reload();
});

// ─── Mobile Sidebar ───────────────────────────────────────────────────────
const sidebar = document.getElementById('sidebar');
document.getElementById('mobile-menu-btn').addEventListener('click', () => {
  sidebar.classList.toggle('open');
  let backdrop = document.querySelector('.sidebar-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'sidebar-backdrop';
    backdrop.onclick = () => { sidebar.classList.remove('open'); backdrop.remove(); };
    document.body.appendChild(backdrop);
  } else {
    backdrop.remove();
  }
});

// ─── Navigation ───────────────────────────────────────────────────────────
function showView(name) {
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  document.getElementById(`view-${name}`).classList.add('active');
  document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
  const btn = document.querySelector(`.nav-item[data-view="${name === 'event-detail' ? 'event-detail' : 'events'}"]`);
  if (btn) btn.classList.add('active');
}

document.getElementById('nav-events').addEventListener('click', () => showView('events'));
document.getElementById('back-btn').addEventListener('click', () => {
  showView('events');
  document.getElementById('nav-detail').style.display = 'none';
});

// ─── Drive Status ─────────────────────────────────────────────────────────
async function checkDriveStatus() {
  try {
    const { connected } = await api.get('/api/admin/drive/status');
    const badge = document.getElementById('drive-status-badge');
    const icon = document.getElementById('drive-status-icon');
    const text = document.getElementById('drive-status-text');
    if (connected) {
      badge.className = 'drive-badge connected';
      icon.textContent = '🟢';
      text.textContent = 'Drive connected';
    } else {
      badge.className = 'drive-badge disconnected';
      icon.textContent = '🔴';
      text.textContent = 'Drive disconnected';
    }
  } catch {}
}

document.getElementById('connect-drive-btn').addEventListener('click', async () => {
  const { url } = await api.get('/api/admin/auth/google');
  window.location.href = url;
});

// ─── Events ───────────────────────────────────────────────────────────────
async function loadEvents() {
  const grid = document.getElementById('events-grid');
  grid.innerHTML = '<div class="loader-wrap"><div class="loader-ring"></div></div>';
  try {
    events = await api.get('/api/admin/events');
    renderEvents();
  } catch (err) {
    grid.innerHTML = `<p style="color:#c2527a;grid-column:1/-1">Error: ${err.message}</p>`;
  }
}

function renderEvents() {
  const grid = document.getElementById('events-grid');
  if (events.length === 0) {
    grid.innerHTML = `
      <div class="empty-events">
        <div class="empty-icon">🎉</div>
        <p>No events yet. Create your first wedding album!</p>
        <button class="btn-primary" onclick="openNewEventModal()">+ Create Event</button>
      </div>`;
    return;
  }
  grid.innerHTML = '';
  events.forEach((ev) => {
    const card = document.createElement('div');
    card.className = 'event-card';
    card.style.setProperty('--accent-color', ev.coverColor || '#e8749a');
    card.innerHTML = `
      <div class="event-card-header">
        <div>
          <div class="event-card-title">${esc(ev.name)}</div>
          <div class="event-card-couple">💍 ${esc(ev.coupleNames)}</div>
          ${ev.date ? `<div class="event-card-date">📅 ${formatDate(ev.date)}</div>` : ''}
        </div>
        <button class="event-menu-btn" title="More options" data-id="${ev.id}">⋯</button>
      </div>
      <div class="event-card-actions">
        <button class="btn-primary btn-sm" onclick="openEventDetail('${ev.id}')">Open →</button>
        <button class="btn-outline btn-sm" onclick="editEvent('${ev.id}')">Edit</button>
        <button class="btn-ghost btn-sm" style="color:#dc2626" onclick="deleteEvent('${ev.id}')">Delete</button>
      </div>`;
    grid.appendChild(card);
  });
}

function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function formatDate(d) { if (!d) return ''; try { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); } catch { return d; } }

// ─── Event Detail ─────────────────────────────────────────────────────────
async function openEventDetail(id) {
  currentEventId = id;
  const ev = events.find((e) => e.id === id);
  if (!ev) return;

  document.getElementById('detail-title').textContent = ev.name;
  document.getElementById('detail-sub').textContent = `${ev.coupleNames}${ev.date ? ' · ' + formatDate(ev.date) : ''}`;
  document.getElementById('nav-detail-label').textContent = ev.name;
  document.getElementById('nav-detail').style.display = 'flex';

  const base = `${location.protocol}//${location.host}`;
  document.getElementById('view-gallery-btn').href = `/gallery/${id}`;
  document.getElementById('view-upload-btn').href = `/upload/${id}`;

  showView('event-detail');
  switchTab('qr');
  loadQR(id);
}

// ─── Tabs ─────────────────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

function switchTab(name) {
  document.querySelectorAll('.tab').forEach((t) => { t.classList.toggle('active', t.dataset.tab === name); t.setAttribute('aria-selected', t.dataset.tab === name); });
  document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
  document.getElementById(`tab-${name}`).classList.add('active');
  if (name === 'photos') loadPhotos(currentEventId);
  if (name === 'guestbook') loadGuestbook(currentEventId);
}

// ─── QR Code ─────────────────────────────────────────────────────────────
async function loadQR(id) {
  const qrImg = document.getElementById('qr-image');
  const qrLoading = document.getElementById('qr-loading');
  const urlDisplay = document.getElementById('qr-url-display');
  const downloadBtn = document.getElementById('download-qr-btn');
  qrImg.style.display = 'none';
  qrLoading.style.display = 'block';
  try {
    const { qrDataUrl, uploadUrl } = await api.get(`/api/admin/events/${id}/qr`);
    qrImg.src = qrDataUrl;
    qrImg.style.display = 'block';
    qrLoading.style.display = 'none';
    urlDisplay.value = uploadUrl;
    downloadBtn.href = qrDataUrl;
  } catch (err) {
    qrLoading.style.display = 'none';
    toast('Error generating QR: ' + err.message);
  }
}

document.getElementById('copy-url-btn').addEventListener('click', () => {
  const val = document.getElementById('qr-url-display').value;
  if (val) { navigator.clipboard.writeText(val); toast('📋 URL copied to clipboard!'); }
});

// ─── Photos ───────────────────────────────────────────────────────────────
async function loadPhotos(id) {
  const grid = document.getElementById('photos-grid');
  const countEl = document.getElementById('photos-count');
  grid.innerHTML = '<div class="loader-wrap"><div class="loader-ring"></div></div>';
  try {
    const photos = await api.get(`/api/admin/events/${id}/photos`);
    countEl.textContent = `${photos.length} photo${photos.length !== 1 ? 's' : ''}`;
    grid.innerHTML = '';
    if (photos.length === 0) {
      grid.innerHTML = '<div class="empty-list"><div class="empty-icon">📷</div><p>No photos uploaded yet</p></div>';
      return;
    }
    photos.forEach((photo, idx) => {
      const item = document.createElement('div');
      item.className = 'masonry-item';
      item.innerHTML = `
        <img src="${photo.thumbnail || photo.url}" alt="${esc(photo.name)}" loading="lazy" onerror="this.src='${photo.url}'" />
        <div class="masonry-overlay">
          <span class="overlay-name">${esc(photo.name)}</span>
        </div>`;
      item.onclick = () => window.open(photo.url, '_blank');
      grid.appendChild(item);
    });
  } catch (err) {
    grid.innerHTML = `<p style="color:#c2527a">Error loading photos: ${err.message}</p>`;
  }
}

// ─── Guestbook ────────────────────────────────────────────────────────────
async function loadGuestbook(id) {
  const list = document.getElementById('guestbook-list');
  list.innerHTML = '<div class="loader-wrap"><div class="loader-ring"></div></div>';
  try {
    const entries = await api.get(`/api/admin/events/${id}/guestbook`);
    list.innerHTML = '';
    if (entries.length === 0) {
      list.innerHTML = '<div class="empty-list"><div class="empty-icon">💌</div><p>No guestbook entries yet</p></div>';
      return;
    }
    // Newest first
    [...entries].reverse().forEach((entry) => {
      const el = document.createElement('div');
      el.className = 'guestbook-entry';
      el.innerHTML = `
        <div class="entry-header">
          <span class="entry-name">👤 ${esc(entry.guestName || 'Anonymous')}</span>
          <span class="entry-date">${formatDateTime(entry.uploadedAt)}</span>
        </div>
        ${entry.message ? `<div class="entry-message">"${esc(entry.message)}"</div>` : ''}
        <div class="entry-photos">📷 ${(entry.photoIds || []).length} photo${(entry.photoIds || []).length !== 1 ? 's' : ''} uploaded</div>`;
      list.appendChild(el);
    });
  } catch (err) {
    list.innerHTML = `<p style="color:#c2527a">Error: ${err.message}</p>`;
  }
}

function formatDateTime(iso) {
  try { return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
}

// ─── Event Modal ──────────────────────────────────────────────────────────
const eventModal = document.getElementById('event-modal');

function openNewEventModal() {
  document.getElementById('modal-title').textContent = 'Create New Event';
  document.getElementById('modal-submit-btn').textContent = 'Create Event';
  document.getElementById('event-form').reset();
  document.getElementById('event-id-input').value = '';
  document.getElementById('cover-color').value = '#e8749a';
  document.getElementById('color-label').textContent = '#e8749a';
  eventModal.classList.remove('hidden');
}
window.openNewEventModal = openNewEventModal;

function editEvent(id) {
  const ev = events.find((e) => e.id === id);
  if (!ev) return;
  document.getElementById('modal-title').textContent = 'Edit Event';
  document.getElementById('modal-submit-btn').textContent = 'Save Changes';
  document.getElementById('event-id-input').value = ev.id;
  document.getElementById('event-name').value = ev.name;
  document.getElementById('couple-names').value = ev.coupleNames;
  document.getElementById('event-date').value = ev.date || '';
  document.getElementById('welcome-msg').value = ev.welcomeMessage || '';
  document.getElementById('cover-color').value = ev.coverColor || '#e8749a';
  document.getElementById('color-label').textContent = ev.coverColor || '#e8749a';
  eventModal.classList.remove('hidden');
}
window.editEvent = editEvent;

function closeModal() { eventModal.classList.add('hidden'); }
document.getElementById('modal-close-btn').addEventListener('click', closeModal);
document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);
document.getElementById('cover-color').addEventListener('input', (e) => {
  document.getElementById('color-label').textContent = e.target.value;
});

document.getElementById('event-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('event-id-input').value;
  const payload = {
    name: document.getElementById('event-name').value.trim(),
    coupleNames: document.getElementById('couple-names').value.trim(),
    date: document.getElementById('event-date').value,
    welcomeMessage: document.getElementById('welcome-msg').value.trim(),
    coverColor: document.getElementById('cover-color').value,
  };
  const submitBtn = document.getElementById('modal-submit-btn');
  submitBtn.disabled = true;
  try {
    if (id) {
      await api.put(`/api/admin/events/${id}`, payload);
      toast('✅ Event updated!');
    } else {
      await api.post('/api/admin/events', payload);
      toast('🎉 Event created!');
    }
    closeModal();
    await loadEvents();
  } catch (err) {
    toast('Error: ' + err.message, 4000);
  } finally {
    submitBtn.disabled = false;
  }
});

async function deleteEvent(id) {
  const ev = events.find((e) => e.id === id);
  if (!ev) return;
  if (!confirm(`Delete "${ev.name}"? This removes it from SnapWed but does NOT delete photos from Google Drive.`)) return;
  try {
    await api.del(`/api/admin/events/${id}`);
    toast('🗑️ Event deleted');
    await loadEvents();
  } catch (err) {
    toast('Error: ' + err.message);
  }
}
window.deleteEvent = deleteEvent;

document.getElementById('new-event-btn').addEventListener('click', openNewEventModal);

// ─── Init ─────────────────────────────────────────────────────────────────
window.openEventDetail = openEventDetail;
checkAuth().catch(() => {}); // If not authed, login overlay stays
