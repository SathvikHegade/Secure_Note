// ============================================
// SECURE PAD PRO - CLIENT
// ============================================

// State
let padId = '';
let currentPassword = '';
let saveTimeout = null;
let pipeline = null;

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
  closeInfo: document.getElementById('closeInfo')
};

// ============================================
// INITIALIZATION
// ============================================

async function init() {
  padId = window.location.pathname.split('/').pop() || 'default';
  els.padName.textContent = padId;
  
  const exists = await checkPadExists();
  setupAuthScreen(exists);
  setupEventListeners();
  
  console.log('✓ Secure Pad initialized');
}

async function checkPadExists() {
  try {
    const res = await fetch(`/api/pad/${padId}/exists`);
    const data = await res.json();
    return data.exists;
  } catch {
    return false;
  }
}

function setupAuthScreen(exists) {
  if (exists) {
    els.authTitle.textContent = '🔐 Enter Password';
    els.authSubtitle.textContent = 'This pad is password protected';
    els.confirmGroup.classList.add('hidden');
    els.authSubmit.textContent = 'Access Pad';
    els.toggleAuth.textContent = 'Create new pad instead';
  } else {
    els.authTitle.textContent = '🆕 Create New Pad';
    els.authSubtitle.textContent = 'Set a password to protect your pad';
    els.confirmGroup.classList.remove('hidden');
    els.authSubmit.textContent = 'Create & Access';
    els.toggleAuth.textContent = 'Access existing pad instead';
  }
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
  // Auth
  els.authForm.addEventListener('submit', handleAuth);
  els.toggleAuth.addEventListener('click', () => {
    const isCreate = !els.confirmGroup.classList.contains('hidden');
    setupAuthScreen(isCreate);
    els.authError.classList.add('hidden');
  });
  
  // Editor
  els.editor.addEventListener('input', handleEditorChange);
  
  // Files
  els.uploadZone.addEventListener('click', () => els.fileInput.click());
  els.fileInput.addEventListener('change', handleFileSelect);
  els.uploadZone.addEventListener('dragover', handleDragOver);
  els.uploadZone.addEventListener('dragleave', handleDragLeave);
  els.uploadZone.addEventListener('drop', handleDrop);
  
  // Summarize
  els.summarizeBtn.addEventListener('click', handleSummarize);
  
  // Modals
  els.closeSummary.addEventListener('click', () => closeModal(els.summaryModal));
  els.closePreview.addEventListener('click', () => closeModal(els.previewModal));
  els.closeInfo.addEventListener('click', () => closeModal(els.infoModal));
  els.infoBtn.addEventListener('click', () => showModal(els.infoModal));
  
  // Click outside modal
  [els.summaryModal, els.previewModal, els.infoModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });
  
  // Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal(els.summaryModal);
      closeModal(els.previewModal);
      closeModal(els.infoModal);
    }
  });
}

// ============================================
// AUTHENTICATION
// ============================================

async function handleAuth(e) {
  e.preventDefault();
  
  const password = els.passwordInput.value.trim();
  const confirm = els.confirmPassword.value.trim();
  const isCreate = !els.confirmGroup.classList.contains('hidden');
  
  // Validation
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
      await createPad(password);
    } else {
      await verifyPad(password);
    }
    
    currentPassword = password;
    await loadPad();
    showMainScreen();
  } catch (error) {
    showError(error.message);
    els.authSubmit.disabled = false;
    els.authSubmit.textContent = isCreate ? 'Create & Access' : 'Access Pad';
  }
}

async function createPad(password) {
  const res = await fetch(`/api/pad/${padId}/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
  
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to create pad');
}

async function verifyPad(password) {
  const res = await fetch(`/api/pad/${padId}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
  
  const data = await res.json();
  if (!data.success) throw new Error('Incorrect password');
}

function showError(message) {
  els.authError.textContent = message;
  els.authError.classList.remove('hidden');
  setTimeout(() => els.authError.classList.add('hidden'), 4000);
}

function showMainScreen() {
  els.authScreen.classList.add('hidden');
  els.mainContent.classList.remove('hidden');
}

// ============================================
// PAD OPERATIONS
// ============================================

async function loadPad() {
  try {
    const res = await fetch(`/api/pad/${padId}/get`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: currentPassword })
    });
    
    const data = await res.json();
    els.editor.value = data.content || '';
    renderFiles(data.files || []);
  } catch (error) {
    console.error('Load error:', error);
  }
}

function handleEditorChange() {
  clearTimeout(saveTimeout);
  els.saveStatus.textContent = 'Typing...';
  els.saveStatus.style.background = '#feebc8';
  
  saveTimeout = setTimeout(savePad, 2000);
}

async function savePad() {
  try {
    const res = await fetch(`/api/pad/${padId}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password: currentPassword,
        content: els.editor.value
      })
    });
    
    if (res.ok) {
      els.saveStatus.textContent = 'Saved ✓';
      els.saveStatus.style.background = '#c6f6d5';
      setTimeout(() => {
        els.saveStatus.textContent = 'Saved';
        els.saveStatus.style.background = '';
      }, 2000);
    }
  } catch (error) {
    els.saveStatus.textContent = 'Save failed';
    els.saveStatus.style.background = '#fed7d7';
  }
}

// ============================================
// FILE OPERATIONS
// ============================================

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) uploadFile(file);
}

function handleDragOver(e) {
  e.preventDefault();
  els.uploadZone.classList.add('drag-over');
}

function handleDragLeave() {
  els.uploadZone.classList.remove('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  els.uploadZone.classList.remove('drag-over');
  
  const file = e.dataTransfer.files[0];
  if (file) uploadFile(file);
}

async function uploadFile(file) {
  if (file.size > 10 * 1024 * 1024) {
    alert('File too large. Maximum size is 10MB.');
    return;
  }
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('password', currentPassword);
  
  try {
    const res = await fetch(`/api/upload/${padId}`, {
      method: 'POST',
      body: formData
    });
    
    const data = await res.json();
    if (data.success) {
      await loadPad();
    } else {
      alert(data.error || 'Upload failed');
    }
  } catch (error) {
    alert('Upload failed: ' + error.message);
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
        ${canPreview(file.name) ? `<button class="btn btn-secondary btn-sm" onclick="previewFile('${file.id}', '${escapeHtml(file.name)}')">👁️ Preview</button>` : ''}
        <button class="btn btn-primary btn-sm" onclick="downloadFile('${file.id}', '${escapeHtml(file.name)}')">⬇️ Download</button>
      </div>
    </div>
  `).join('');
}

function canPreview(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  return ['pdf', 'jpg', 'jpeg', 'png'].includes(ext);
}

async function previewFile(fileId, filename) {
  try {
    const res = await fetch(`/files/${padId}/${fileId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: currentPassword })
    });
    
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const ext = filename.split('.').pop().toLowerCase();
    
    els.previewTitle.textContent = filename;
    
    if (ext === 'pdf') {
      els.previewBody.innerHTML = `<iframe src="${url}" style="width:100%;height:70vh;border:none"></iframe>`;
    } else {
      els.previewBody.innerHTML = `<img src="${url}" style="max-width:100%;height:auto;display:block;margin:0 auto">`;
    }
    
    showModal(els.previewModal);
  } catch (error) {
    alert('Preview failed');
  }
}

async function downloadFile(fileId, filename) {
  try {
    const res = await fetch(`/files/${padId}/${fileId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: currentPassword })
    });
    
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  } catch (error) {
    alert('Download failed');
  }
}

// ============================================
// AI SUMMARIZATION
// ============================================

async function handleSummarize() {
  const text = els.editor.value.trim();
  
  if (!text || text.length < 50) {
    alert('Please write at least 50 characters to summarize');
    return;
  }
  
  showModal(els.summaryModal);
  els.summaryContent.innerHTML = '<div class="loading"><div class="spinner"></div><p>Analyzing your notes...</p></div>';
  
  try {
    // Load model if not loaded
    if (!pipeline) {
      els.summaryContent.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading AI model (first time only)...</p></div>';
      await loadModel();
    }
    
    // Generate summary using local AI
    const summary = await generateSummary(text);
    displaySummary(summary);
  } catch (error) {
    els.summaryContent.innerHTML = `<p style="color:var(--danger)">Summarization failed. Using fallback method...</p>`;
    setTimeout(() => {
      const fallback = generateFallbackSummary(text);
      displaySummary(fallback);
    }, 1000);
  }
}

async function loadModel() {
  // Load Transformers.js (lightweight summarization)
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.0';
  document.head.appendChild(script);
  
  return new Promise((resolve, reject) => {
    script.onload = async () => {
      try {
        const { pipeline: createPipeline } = window.Transformers;
        pipeline = await createPipeline('summarization', 'Xenova/distilbart-cnn-6-6');
        resolve();
      } catch (err) {
        reject(err);
      }
    };
    script.onerror = reject;
  });
}

async function generateSummary(text) {
  // Truncate if too long
  const maxLength = 1000;
  const truncated = text.length > maxLength ? text.substring(0, maxLength) : text;
  
  const result = await pipeline(truncated, {
    max_length: 130,
    min_length: 30,
    do_sample: false
  });
  
  return {
    summary: result[0].summary_text,
    keyPoints: extractKeyPoints(text),
    insights: generateInsights(text)
  };
}

function generateFallbackSummary(text) {
  // Simple fallback without AI
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  const summary = sentences.slice(0, 3).join(' ').trim();
  
  return {
    summary: summary || text.substring(0, 200) + '...',
    keyPoints: extractKeyPoints(text),
    insights: 'This is a basic summary. For AI-powered summaries, the system needs to load the model first.'
  };
}

function extractKeyPoints(text) {
  // Extract lines that look like bullet points or important statements
  const lines = text.split('\n').filter(l => l.trim());
  const points = lines
    .filter(l => l.match(/^[-*•]\s/) || l.length < 100)
    .slice(0, 5)
    .map(l => l.replace(/^[-*•]\s*/, '').trim());
  
  return points.length > 0 ? points : [
    'Main content focuses on the topics discussed',
    'Multiple points and ideas are covered',
    'Further details available in full text'
  ];
}

function generateInsights(text) {
  const wordCount = text.split(/\s+/).length;
  const lineCount = text.split('\n').length;
  
  return `This note contains approximately ${wordCount} words across ${lineCount} lines. ${
    wordCount > 500 ? 'This is a detailed document with substantial content.' :
    wordCount > 200 ? 'This is a medium-length note.' :
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
      <ul>
        ${data.keyPoints.map(point => `<li>${escapeHtml(point)}</li>`).join('')}
      </ul>
    </div>
    
    <div class="summary-section">
      <h3>💡 Insights</h3>
      <p>${escapeHtml(data.insights)}</p>
    </div>
  `;
}

// ============================================
// UTILITIES
// ============================================

function showModal(modal) {
  modal.classList.remove('hidden');
}

function closeModal(modal) {
  modal.classList.add('hidden');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDate(isoString) {
  return new Date(isoString).toLocaleString();
}
// ============================================
// DARK MODE
// ============================================

function setupDarkMode() {
  const themeToggle = document.getElementById('themeToggle');
  
  // Check saved preference
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    themeToggle.textContent = '☀️';
  }
  
  // Toggle theme
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    themeToggle.textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });
}

// ============================================
// INIT
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  init();
  setupDarkMode();
});
