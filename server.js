const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));

// Storage paths
const PADS_DIR = path.join(__dirname, 'pads');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Allowed file types
const ALLOWED_TYPES = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
};

// Initialize directories
async function initDirs() {
  await fs.mkdir(PADS_DIR, { recursive: true });
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  console.log('✓ Storage directories initialized');
}

// Hash password with SHA-256
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Generate secure file ID
function generateId() {
  return crypto.randomBytes(16).toString('hex');
}

// Validate MIME type using magic bytes
function validateMime(buffer, filename) {
  const ext = path.extname(filename).toLowerCase();
  if (buffer.length < 8) return false;
  
  const header = buffer.slice(0, 8).toString('hex');
  
  if (ext === '.pdf') return header.startsWith('25504446');
  if (ext === '.jpg' || ext === '.jpeg') return header.startsWith('ffd8ff');
  if (ext === '.png') return header.startsWith('89504e47');
  if (ext === '.docx') return header.startsWith('504b0304') || header.startsWith('504b0506');
  
  return false;
}

// Multer configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = Object.values(ALLOWED_TYPES).flat().includes(ext);
    cb(allowed ? null : new Error('Invalid file type'), allowed);
  }
});

// ============================================
// ROUTES
// ============================================

// Root redirect
app.get('/', (req, res) => {
  res.redirect('/pad/default');
});

// Serve pad interface
app.get('/pad/:padId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pad.html'));
});

// Check if pad exists
app.get('/api/pad/:padId/exists', async (req, res) => {
  try {
    const padPath = path.join(PADS_DIR, `${req.params.padId}.json`);
    await fs.access(padPath);
    res.json({ exists: true });
  } catch {
    res.json({ exists: false });
  }
});

// Create new pad
app.post('/api/pad/:padId/create', async (req, res) => {
  try {
    const { padId } = req.params;
    const { password } = req.body;
    
    if (!password || password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }
    
    const padData = {
      content: '',
      files: [],
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };
    
    const padPath = path.join(PADS_DIR, `${padId}.json`);
    await fs.writeFile(padPath, JSON.stringify(padData, null, 2));
    
    res.json({ success: true });
  } catch (error) {
    console.error('Create error:', error);
    res.status(500).json({ error: 'Failed to create pad' });
  }
});

// Verify password
app.post('/api/pad/:padId/verify', async (req, res) => {
  try {
    const { padId } = req.params;
    const { password } = req.body;
    
    const padPath = path.join(PADS_DIR, `${padId}.json`);
    const data = JSON.parse(await fs.readFile(padPath, 'utf-8'));
    
    const isValid = data.passwordHash === hashPassword(password);
    res.json({ success: isValid });
  } catch {
    res.status(404).json({ success: false, error: 'Pad not found' });
  }
});

// Get pad content
app.post('/api/pad/:padId/get', async (req, res) => {
  try {
    const { padId } = req.params;
    const { password } = req.body;
    
    const padPath = path.join(PADS_DIR, `${padId}.json`);
    const data = JSON.parse(await fs.readFile(padPath, 'utf-8'));
    
    if (data.passwordHash !== hashPassword(password)) {
      return res.status(401).json({ error: 'Incorrect password' });
    }
    
    res.json({ content: data.content, files: data.files });
  } catch {
    res.status(404).json({ error: 'Pad not found' });
  }
});

// Save pad content
app.post('/api/pad/:padId/save', async (req, res) => {
  try {
    const { padId } = req.params;
    const { password, content } = req.body;
    
    const padPath = path.join(PADS_DIR, `${padId}.json`);
    const data = JSON.parse(await fs.readFile(padPath, 'utf-8'));
    
    if (data.passwordHash !== hashPassword(password)) {
      return res.status(401).json({ error: 'Incorrect password' });
    }
    
    data.content = content;
    data.lastModified = new Date().toISOString();
    
    await fs.writeFile(padPath, JSON.stringify(data, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({ error: 'Failed to save' });
  }
});

// Upload file
app.post('/api/upload/:padId', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }
    
    const { padId } = req.params;
    const { password } = req.body;
    
    // Verify password
    const padPath = path.join(PADS_DIR, `${padId}.json`);
    const padData = JSON.parse(await fs.readFile(padPath, 'utf-8'));
    
    if (padData.passwordHash !== hashPassword(password)) {
      return res.status(401).json({ error: 'Incorrect password' });
    }
    
    // Validate MIME
    const fileBuffer = req.file.buffer;
    if (!validateMime(fileBuffer, req.file.originalname)) {
      return res.status(400).json({ error: 'Invalid or corrupted file' });
    }
    
    // Save file
    const fileId = generateId();
    const ext = path.extname(req.file.originalname);
    const padDir = path.join(UPLOADS_DIR, padId);
    await fs.mkdir(padDir, { recursive: true });
    
    const filePath = path.join(padDir, `${fileId}${ext}`);
    await fs.writeFile(filePath, fileBuffer);
    
    // Update pad data
    const fileInfo = {
      id: fileId,
      name: req.file.originalname,
      size: req.file.size,
      uploadedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };
    
    padData.files.push(fileInfo);
    await fs.writeFile(padPath, JSON.stringify(padData, null, 2));
    
    res.json({ success: true, file: fileInfo });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Download file
app.post('/files/:padId/:fileId', async (req, res) => {
  try {
    const { padId, fileId } = req.params;
    const { password } = req.body;
    
    // Verify password
    const padPath = path.join(PADS_DIR, `${padId}.json`);
    const padData = JSON.parse(await fs.readFile(padPath, 'utf-8'));
    
    if (padData.passwordHash !== hashPassword(password)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Find file
    const fileInfo = padData.files.find(f => f.id === fileId);
    if (!fileInfo) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Check expiry
    if (new Date(fileInfo.expiresAt) < new Date()) {
      return res.status(410).json({ error: 'File expired' });
    }
    
    // Serve file
    const padDir = path.join(UPLOADS_DIR, padId);
    const files = await fs.readdir(padDir);
    const fileName = files.find(f => f.startsWith(fileId));
    
    if (!fileName) {
      return res.status(404).json({ error: 'File not found on disk' });
    }
    
    res.download(path.join(padDir, fileName), fileInfo.name);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Download failed' });
  }
});

// ============================================
// CLEANUP
// ============================================

async function cleanupExpired() {
  try {
    console.log('Running cleanup...');
    const padFiles = await fs.readdir(PADS_DIR);
    let cleaned = 0;
    
    for (const padFile of padFiles) {
      const padId = path.basename(padFile, '.json');
      const padPath = path.join(PADS_DIR, padFile);
      const padData = JSON.parse(await fs.readFile(padPath, 'utf-8'));
      
      const now = new Date();
      const expired = padData.files.filter(f => new Date(f.expiresAt) < now);
      
      // Delete expired files
      for (const file of expired) {
        try {
          const padDir = path.join(UPLOADS_DIR, padId);
          const files = await fs.readdir(padDir);
          const fileName = files.find(f => f.startsWith(file.id));
          if (fileName) {
            await fs.unlink(path.join(padDir, fileName));
            cleaned++;
          }
        } catch (err) {
          console.error(`Error deleting file ${file.id}:`, err);
        }
      }
      
      // Update pad data
      padData.files = padData.files.filter(f => new Date(f.expiresAt) >= now);
      await fs.writeFile(padPath, JSON.stringify(padData, null, 2));
    }
    
    console.log(`✓ Cleanup complete. Removed ${cleaned} expired files.`);
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

// Run cleanup every hour
setInterval(cleanupExpired, 60 * 60 * 1000);

// ============================================
// SERVER START
// ============================================

initDirs().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔════════════════════════════════════════╗
║   SECURE PAD PRO - SERVER RUNNING     ║
╠════════════════════════════════════════╣
║  Port: ${PORT.toString().padEnd(31)}║
║  Mode: Production                      ║
║  Storage: JSON + Disk                  ║
║  AI: Client-side (Transformers.js)     ║
╚════════════════════════════════════════╝
    `);
    
    // Initial cleanup
    cleanupExpired();
  });
}).catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});