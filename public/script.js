// ============================================
// SECURE NOTE PRO - CLIENT-ONLY
// All storage is local (localStorage + IndexedDB)
// ============================================

// State
let noteId = '';
let currentPassword = '';
let saveTimeout = null;
let pipeline = null;

// IndexedDB setup for files
const DB_NAME = 'secure_note_pro_db';
const DB_VERSION = 1;
let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function idbPut(store, value) {
  const db = await openDb();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value);
    tx.oncomplete = () => res(true);
    tx.onerror = () => rej(tx.error);
  });
}

async function idbGet(store, key) {
  const db = await openDb();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

async function idbDelete(store, key) {
  const db = await openDb();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).delete(key);
    req.onsuccess = () => res(true);
    req.onerror = () => rej(req.error);
  });
}

async function idbAllByPrefix(prefix) {
  const db = await openDb();
  return new Promise((res, rej) => {
    const tx = db.transaction('files', 'readonly');
    const store = tx.objectStore('files');
    const items = [];
    store.openCursor().onsuccess = (e) => {
      const cursor = e.target.result;
      if (!cursor) { res(items); return; }
      if (cursor.key.startsWith(prefix)) items.push(cursor.value);
      cursor.continue();
    };
    store.openCursor().onerror = () => rej('Cursor error');
  });
}

// DOM Elements
const els = {
  authScreen: document.getElementById('authScreen'),
  mainContent: document.getElementById('mainContent'),
  authForm: document.getElementById('authForm'),
  authTitle: document.getElementById('authTitle'),
  authSubtitle: document.getElementById('authSubtitle'),
  passwordInput: document.getElementById('passwordInput'),
  confirmPassword: document.getElementById('confirmPassword'),
  confirmGroup: document.getElementById('confirmGroup'),
  authSubmit: document.getElementById('authSubmit'),
  authError: document.getElementById('authError'),
  toggleAuth: document.getElementById('toggleAuth'),
  padName: document.getElementById('padName'),
  editor: document.getElementById('editor'),
  saveStatus: document.getElementById('saveStatus'),
  fileInput: document.getElementById('fileInput'),
  uploadZone: document.getElementById('uploadZone'),
  filesList: document.getElementById('filesList'),
  fileCount: document.getElementById('fileCount'),
  summarizeBtn: document.getElementById('summarizeBtn'),
  summaryModal: document.getElementById('summaryModal'),
  summaryContent: document.getElementById('summaryContent'),
  closeSummary: document.getElementById('closeSummary'),
  previewModal: document.getElementById('previewModal'),
  previewTitle: document.getElementById('previewTitle'),
  previewBody: document.getElementById('previewBody'),
  closePreview: document.getElementById('closePreview'),
  infoBtn: document.getElementById('infoBtn'),
  infoModal: document.getElementById('infoModal'),
  closeInfo: document.getElementById('closeInfo'),
  devBtn: document.getElementById('devBtn'),
  devBtnAuth: document.getElementById('devBtnAuth'),
  devModal: document.getElementById('devModal'),
  closeDev: document.getElementById('closeDev'),
  closeDevBottom: document.getElementById('closeDevBottom'),
};

// ============================================
// UTILITIES
// ============================================

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(isoString) {
  return new Date(isoString).toLocaleString();
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function showModal(modal) {
  modal.classList.remove('hidden');
}

function closeModal(modal) {
  modal.classList.add('hidden');
}

// SHA-256 hash utility (returns hex)
async function sha256Hex(message) {
  const enc = new TextEncoder();
  const data = enc.encode(message);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const arr = Array.from(new Uint8Array(hash));
  return arr.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate random id
function generateId() {
  const arr = new Uint8Array(12);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(n => n.toString(16).padStart(2, '0')).join('');
}

// ============================================
// NOTE STORAGE (localStorage + IndexedDB for files)
// Keys:
// - note:<noteId>:content
// - note:<noteId>:passwordHash
// Files stored in IndexedDB store 'files' with id: "<noteId>_<fileId>"
// ============================================

function noteContentKey(id) { return `note:${id}:content`; }
function notePasswordKey(id) { return `note:${id}:passwordHash`; }
function noteFilesMetaKey(id) { return `note:${id}:filesMeta`; }

async function noteExists(id) {
  return localStorage.getItem(notePasswordKey(id)) !== null;
}

async function createNote(id, password) {
  const hash = await sha256Hex(password);
  localStorage.setItem(notePasswordKey(id), hash);
  localStorage.setItem(noteContentKey(id), '');
  localStorage.setItem(noteFilesMetaKey(id), JSON.stringify([]));
  return true;
}

async function verifyNote(id, password) {
  const saved = localStorage.getItem(notePasswordKey(id));
  if (!saved) return false;
  const hash = await sha256Hex(password);
  return saved === hash;
}

async function saveNoteContent(id, password, content) {
  const ok = await verifyNote(id, password);
  if (!ok) throw new Error('Incorrect password');
  localStorage.setItem(noteContentKey(id), content);
  return true;
}

async function loadNote(id, password) {
  const ok = await verifyNote(id, password);
  if (!ok) throw new Error('Incorrect password');
  const content = localStorage.getItem(noteContentKey(id)) || '';
  const filesMeta = JSON.parse(localStorage.getItem(noteFilesMetaKey(id)) || '[]');
  return { content, files: filesMeta };
}

// File functions: store blob in IndexedDB and metadata in localStorage
async function addFileForNote(id, password, file) {
  const ok = await verifyNote(id, password);
  if (!ok) throw new Error('Incorrect password');

  if (file.size > 10 * 1024 * 1024) throw new Error('File too large');

  // basic magic header checks
  const ext = file.name.split('.').pop().toLowerCase();
  const validExts = ['pdf','jpg','jpeg','png','docx'];
  if (!validExts.includes(ext)) throw new Error('Invalid file type');

  const fileId = generateId();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  // store blob in IDB
  const rec = {
    id: `${id}_${fileId}`,
    noteId: id,
    name: file.name,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    expiresAt,
    blob: file // store as blob
  };
  await idbPut('files', rec);

  // update metadata
  const metaKey = noteFilesMetaKey(id);
  const meta = JSON.parse(localStorage.getItem(metaKey) || '[]');
  meta.push({
    id: fileId,
    name: file.name,
    size: file.size,
    uploadedAt: rec.uploadedAt,
    expiresAt
  });
  localStorage.setItem(metaKey, JSON.stringify(meta));
  return meta[meta.length - 1];
}

async function getFileBlob(id, fileId) {
  const rec = await idbGet('files', `${id}_${fileId}`);
  if (!rec) throw new Error('File not found');
  if (new Date(rec.expiresAt) < new Date()) {
    // cleanup if expired
    await idbDelete('files', `${id}_${fileId}`);
    const metaKey = noteFilesMetaKey(id);
    const meta = JSON.parse(localStorage.getItem(metaKey) || '[]').filter(f => f.id !== fileId);
    localStorage.setItem(metaKey, JSON.stringify(meta));
    throw new Error('File expired');
  }
  return rec.blob;
}

// cleanup expired files (local) - remove expired metadata and IDB entries
async function cleanupExpiredLocal() {
  const metaFiles = [];
  // gather all note files meta keys
  for (let i=0;i<localStorage.length;i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('note:') && k.endsWith(':filesMeta')) {
      metaFiles.push(k);
    }
  }
  for (const key of metaFiles) {
    const id = key.split(':')[1];
    const meta = JSON.parse(localStorage.getItem(key) || '[]');
    const now = new Date();
    const expired = meta.filter(f => new Date(f.expiresAt) < now);
    for (const f of expired) {
      try { await idbDelete('files', `${id}_${f.id}`); } catch(e){}
    }
    const kept = meta.filter(f => new Date(f.expiresAt) >= now);
    localStorage.setItem(key, JSON.stringify(kept));
  }
}

// ============================================
// UI and Event handling
// ============================================

async function init() {
  // parse noteId (last segment) -- allow both /note/id and /pad/id URLs
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  if (pathParts.length === 0) noteId = 'default';
  else noteId = pathParts[pathParts.length - 1] || 'default';

  els.padName.textContent = noteId;

  // Setup UI based on whether note exists locally
  const exists = await noteExists(noteId);
  setupAuthScreen(exists);

  setupEventListeners();

  // run a local cleanup
  cleanupExpiredLocal();

  console.log('✓ Secure Note (client-only) initialized');
}

function setupAuthScreen(exists) {
  if (exists) {
    els.authTitle.textContent = '🔐 Enter Password';
    els.authSubtitle.textContent = 'This note is password protected (local)';
    els.confirmGroup.classList.add('hidden');
    els.authSubmit.textContent = 'Access Note';
    els.toggleAuth.textContent = 'Create new note instead';
  } else {
    els.authTitle.textContent = '🆕 Create New Note';
    els.authSubtitle.textContent = 'Set a password to protect your note (stored locally)';
    els.confirmGroup.classList.remove('hidden');
    els.authSubmit.textContent = 'Create & Access';
    els.toggleAuth.textContent = 'Access existing note instead';
  }
}

function setupEventListeners() {
  // Modals & dev
  if (els.devBtn) els.devBtn.addEventListener('click', () => showModal(els.devModal));
  if (els.devBtnAuth) els.devBtnAuth.addEventListener('click', () => showModal(els.devModal));
  if (els.closeDev) els.closeDev.addEventListener('click', () => closeModal(els.devModal));
  if (els.closeDevBottom) els.closeDevBottom.addEventListener('click', () => closeModal(els.devModal));

  if (els.infoBtn) els.infoBtn.addEventListener('click', () => showModal(els.infoModal));
  if (els.closeInfo) els.closeInfo.addEventListener('click', () => closeModal(els.infoModal));

  if (els.closeSummary) els.closeSummary.addEventListener('click', () => closeModal(els.summaryModal));
  if (els.closePreview) els.closePreview.addEventListener('click', () => closeModal(els.previewModal));

  // Auth
  if (els.authForm) els.authForm.addEventListener('submit', handleAuth);
  if (els.toggleAuth) els.toggleAuth.addEventListener('click', () => {
    const isCreate = !els.confirmGroup.classList.contains('hidden');
    setupAuthScreen(isCreate);
    els.authError.classList.add('hidden');
  });

  // Editor
  if (els.editor) els.editor.addEventListener('input', handleEditorChange);

  // Files
  if (els.uploadZone) {
    els.uploadZone.addEventListener('click', () => els.fileInput.click());
    els.uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); els.uploadZone.classList.add('drag-over'); });
    els.uploadZone.addEventListener('dragleave', () => els.uploadZone.classList.remove('drag-over'));
    els.uploadZone.addEventListener('drop', async (e) => {
      e.preventDefault(); els.uploadZone.classList.remove('drag-over');
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) await handleFileUpload(f);
    });
  }
  if (els.fileInput) els.fileInput.addEventListener('change', async (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) await handleFileUpload(f);
    e.target.value = '';
  });

  // Summarize
  if (els.summarizeBtn) els.summarizeBtn.addEventListener('click', handleSummarize);

  // Close on outside click
  [els.summaryModal, els.previewModal, els.infoModal, els.devModal].forEach(modal => {
    if (!modal) return;
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(modal); });
  });

  // Escape closes
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal(els.summaryModal);
      closeModal(els.previewModal);
      closeModal(els.infoModal);
      closeModal(els.devModal);
    }
  });

  // Theme
  const themeToggle = document.getElementById("themeToggle");
  const themeIcon = document.getElementById("themeIcon");
  if (themeToggle) {
    if (localStorage.getItem("theme") === "dark") {
      document.body.classList.add("dark-mode");
      if (themeIcon) themeIcon.src = "https://cdn.jsdelivr.net/npm/heroicons@2.1.1/24/outline/sun.svg";
    }
    themeToggle.addEventListener("click", () => {
      document.body.classList.toggle("dark-mode");
      if (document.body.classList.contains("dark-mode")) {
        localStorage.setItem("theme", "dark");
        if (themeIcon) themeIcon.src = "https://cdn.jsdelivr.net/npm/heroicons@2.1.1/24/outline/sun.svg";
      } else {
        localStorage.setItem("theme", "light");
        if (themeIcon) themeIcon.src = "https://cdn.jsdelivr.net/npm/heroicons@2.1.1/24/outline/moon.svg";
      }
    });
  }
}

// ============================================
// AUTH HANDLERS (create / verify)
// ============================================

async function handleAuth(e) {
  e && e.preventDefault();
  const password = els.passwordInput.value.trim();
  const confirm = els.confirmPassword.value.trim();
  const isCreate = !els.confirmGroup.classList.contains('hidden');

  if (!password || password.length < 4) {
    showError('Password must be at least 4 characters');
    return;
  }
  if (isCreate && password !== confirm) {
    showError('Passwords do not match');
    return;
  }

  els.authSubmit.disabled = true;
  els.authSubmit.textContent = isCreate ? 'Creating...' : 'Verifying...';

  try {
    if (isCreate) {
      await createNote(noteId, password);
    } else {
      const ok = await verifyNote(noteId, password);
      if (!ok) throw new Error('Incorrect password');
    }
    currentPassword = password;
    const data = await loadNote(noteId, password);
    els.editor.value = data.content || '';
    renderFiles(data.files || []);
    showMainScreen();
  } catch (err) {
    showError(err.message || 'Auth failed');
    els.authSubmit.disabled = false;
    els.authSubmit.textContent = isCreate ? 'Create & Access' : 'Access Note';
  }
}

function showError(message) {
  if (!els.authError) return;
  els.authError.textContent = message;
  els.authError.classList.remove('hidden');
  setTimeout(() => els.authError.classList.add('hidden'), 4000);
}

function showMainScreen() {
  els.authScreen.classList.add('hidden');
  els.mainContent.classList.remove('hidden');
}

// ============================================
// NOTE OPERATIONS (save/load auto-save)
// ============================================

function handleEditorChange() {
  clearTimeout(saveTimeout);
  els.saveStatus.textContent = 'Typing...';
  els.saveStatus.style.background = '#feebc8';
  saveTimeout = setTimeout(async () => {
    try {
      await saveNoteContent(noteId, currentPassword, els.editor.value);
      els.saveStatus.textContent = 'Saved ✓';
      els.saveStatus.style.background = '#c6f6d5';
      setTimeout(() => { els.saveStatus.textContent = 'Saved'; els.saveStatus.style.background = ''; }, 2000);
    } catch (err) {
      els.saveStatus.textContent = 'Save failed';
      els.saveStatus.style.background = '#fed7d7';
    }
  }, 2000);
}

// ============================================
// FILE HANDLING (IndexedDB)
// ============================================

async function handleFileUpload(file) {
  try {
    const added = await addFileForNote(noteId, currentPassword, file);
    // reload metadata and UI
    const meta = JSON.parse(localStorage.getItem(noteFilesMetaKey(noteId)) || '[]');
    renderFiles(meta);
  } catch (err) {
    alert('Upload failed: ' + (err.message || err));
  }
}

function renderFiles(files) {
  els.fileCount.textContent = `${files.length} file${files.length !== 1 ? 's' : ''}`;

  if (files.length === 0) {
    els.filesList.innerHTML = '<p style="text-align:center;color:#a0aec0;padding:2rem">No files uploaded yet</p>';
    return;
  }

  els.filesList.innerHTML = files.map(file => `
    <div class="file-item">
      <div class="file-info-text">
        <div class="file-name">${escapeHtml(file.name)}</div>
        <div class="file-meta">
          ${formatSize(file.size)} • Uploaded ${formatDate(file.uploadedAt)} • 
          Expires ${formatDate(file.expiresAt)}
        </div>
      </div>
      <div class="file-actions">
        ${canPreview(file.name) ? `<button class="btn btn-secondary btn-sm" data-action="preview" data-id="${file.id}" data-name="${escapeHtml(file.name)}">👁️ Preview</button>` : ''}
        <button class="btn btn-primary btn-sm" data-action="download" data-id="${file.id}" data-name="${escapeHtml(file.name)}">⬇️ Download</button>
      </div>
    </div>
  `).join('');

  // attach listeners
  els.filesList.querySelectorAll('button[data-action]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const action = btn.getAttribute('data-action');
      const fid = btn.getAttribute('data-id');
      const fname = btn.getAttribute('data-name');
      if (action === 'preview') {
        await previewFile(noteId, fid, fname);
      } else {
        await downloadFile(noteId, fid, fname);
      }
    });
  });
}

function canPreview(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  return ['pdf', 'jpg', 'jpeg', 'png'].includes(ext);
}

async function previewFile(noteIdLocal, fileId, filename) {
  try {
    const blob = await getFileBlob(noteIdLocal, fileId);
    const url = URL.createObjectURL(blob);
    const ext = filename.split('.').pop().toLowerCase();
    els.previewTitle.textContent = filename;
    if (ext === 'pdf') {
      els.previewBody.innerHTML = `<iframe src="${url}" style="width:100%;height:70vh;border:none"></iframe>`;
    } else {
      els.previewBody.innerHTML = `<img src="${url}" style="max-width:100%;height:auto;display:block;margin:0 auto">`;
    }
    showModal(els.previewModal);
  } catch (err) {
    alert('Preview failed: ' + (err.message || err));
  }
}

async function downloadFile(noteIdLocal, fileId, filename) {
  try {
    const blob = await getFileBlob(noteIdLocal, fileId);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  } catch (err) {
    alert('Download failed: ' + (err.message || err));
  }
}

// ============================================
// AI Summarization (client-side) - optional; fallback available
// ============================================

async function handleSummarize() {
  const text = els.editor.value.trim();
  if (!text || text.length < 50) { alert('Please write at least 50 characters to summarize'); return; }

  showModal(els.summaryModal);
  els.summaryContent.innerHTML = '<div class="loading"><div class="spinner"></div><p>Analyzing your note...</p></div>';

  try {
    if (!pipeline) {
      // try to load transformers (optional)
      await loadModel();
    }
    const summary = await generateSummary(text);
    displaySummary(summary);
  } catch (err) {
    const fallback = generateFallbackSummary(text);
    displaySummary(fallback);
  }
}

// load model (optional)
async function loadModel() {
  if (window.Transformers && window.Transformers.pipeline) {
    const { pipeline: createPipeline } = window.Transformers;
    pipeline = await createPipeline('summarization', 'Xenova/distilbart-cnn-6-6');
    return;
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.0';
    s.onload = async () => {
      try {
        const { pipeline: createPipeline } = window.Transformers;
        pipeline = await createPipeline('summarization', 'Xenova/distilbart-cnn-6-6');
        resolve();
      } catch (e) { resolve(); } // resolve even on failure (fallback will be used)
    };
    s.onerror = () => resolve();
    document.head.appendChild(s);
  });
}

async function generateSummary(text) {
  if (!pipeline) return generateFallbackSummary(text);
  const maxLength = 1000;
  const truncated = text.length > maxLength ? text.substring(0, maxLength) : text;
  const result = await pipeline(truncated, { max_length: 130, min_length: 30, do_sample: false });
  return {
    summary: result[0].summary_text,
    keyPoints: extractKeyPoints(text),
    insights: generateInsights(text)
  };
}

function generateFallbackSummary(text) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  const summary = sentences.slice(0, 3).join(' ').trim();
  return {
    summary: summary || text.substring(0, 200) + '...',
    keyPoints: extractKeyPoints(text),
    insights: 'This is a basic summary. For AI summaries, enable the model (optional).'
  };
}

function extractKeyPoints(text) {
  const lines = text.split('\n').filter(l => l.trim());
  const points = lines.filter(l => l.match(/^[-*•]\s/) || l.length < 100).slice(0,5).map(l=>l.replace(/^[-*•]\s*/,'').trim());
  return points.length ? points : ['Main theme', 'Key idea', 'Further details in full text'];
}

function generateInsights(text) {
  const wordCount = text.split(/\s+/).length;
  const lineCount = text.split('\n').length;
  return `This note contains approximately ${wordCount} words across ${lineCount} lines. ${
    wordCount > 500 ? 'This is a detailed document.' :
    wordCount > 200 ? 'This is medium length.' :
    'This is a brief note.'
  }`;
}

function displaySummary(data) {
  els.summaryContent.innerHTML = `
    <div class="summary-section">
      <h3>📝 Summary</h3>
      <p>${escapeHtml(data.summary)}</p>
    </div>

    <div class="summary-section">
      <h3>🔑 Key Points</h3>
      <ul>${data.keyPoints.map(p=>`<li>${escapeHtml(p)}</li>`).join('')}</ul>
    </div>

    <div class="summary-section">
      <h3>💡 Insights</h3>
      <p>${escapeHtml(data.insights)}</p>
    </div>
  `;
}

// ============================================
// INIT
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  await openDb();
  init();
});
