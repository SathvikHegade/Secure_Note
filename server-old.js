require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'models/gemini-2.5-flash';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));

// Storage paths
const PADS_DIR = path.join(__dirname, 'pads');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const SALT_ROUNDS = 10;

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

// Hash password with bcrypt
async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

// Verify password with bcrypt
async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

// Generate secure file ID
function generateId() {
  return crypto.randomBytes(16).toString('hex');
}

// Validate custom URL name
function isValidCustomUrl(urlName) {
  // Only allow alphanumeric, hyphens, and underscores, 3-50 characters
  const regex = /^[a-zA-Z0-9_-]{3,50}$/;
  return regex.test(urlName);
}

// Check if pad exists
async function padExists(padId) {
  try {
    const padPath = path.join(PADS_DIR, `${padId}.json`);
    await fs.access(padPath);
    return true;
  } catch {
    return false;
  }
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

// Root - serve homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve pad interface
app.get('/pad/:padId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pad.html'));
});

// Check if custom URL is available
app.get('/api/check-url/:urlName', async (req, res) => {
  try {
    const { urlName } = req.params;
    
    if (!isValidCustomUrl(urlName)) {
      return res.json({ 
        available: false, 
        error: 'Invalid URL name. Use 3-50 characters (letters, numbers, hyphens, underscores only)' 
      });
    }
    
    const exists = await padExists(urlName);
    res.json({ available: !exists });
  } catch (error) {
    console.error('Check URL error:', error);
    res.status(500).json({ available: false, error: 'Server error' });
  }
});

// Create new pad with custom URL
app.post('/api/create-pad', async (req, res) => {
  try {
    const { urlName, password } = req.body;
    
    // Validate URL name
    if (!urlName || !isValidCustomUrl(urlName)) {
      return res.status(400).json({ 
        error: 'Invalid URL name. Use 3-50 characters (letters, numbers, hyphens, underscores only)' 
      });
    }
    
    // Validate password
    if (!password || password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }
    
    // Check if URL already exists
    if (await padExists(urlName)) {
      return res.status(409).json({ error: 'This URL name is already taken.' });
    }
    
    // Create pad
    const padData = {
      padId: urlName,
      content: '',
      files: [],
      passwordHash: await hashPassword(password),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const padPath = path.join(PADS_DIR, `${urlName}.json`);
    await fs.writeFile(padPath, JSON.stringify(padData, null, 2));
    
    res.json({ success: true, padId: urlName });
  } catch (error) {
    console.error('Create pad error:', error);
    res.status(500).json({ error: 'Failed to create pad' });
  }
});

// Login to existing pad
app.post('/api/login', async (req, res) => {
  try {
    const { urlName, password } = req.body;
    
    if (!urlName || !password) {
      return res.status(400).json({ error: 'URL name and password are required' });
    }
    
    const padPath = path.join(PADS_DIR, `${urlName}.json`);
    
    // Check if pad exists
    if (!await padExists(urlName)) {
      return res.status(401).json({ error: 'Incorrect URL or password.' });
    }
    
    // Verify password
    const data = JSON.parse(await fs.readFile(padPath, 'utf-8'));
    const isValid = await verifyPassword(password, data.passwordHash);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Incorrect URL or password.' });
    }
    
    res.json({ success: true, padId: urlName });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ error: 'Incorrect URL or password.' });
  }
});

// Get pad content (requires password)
app.post('/api/pad/:padId/get', async (req, res) => {
  try {
    const { padId } = req.params;
    const { password } = req.body;
    
    const padPath = path.join(PADS_DIR, `${padId}.json`);
    
    if (!await padExists(padId)) {
      return res.status(404).json({ error: 'Pad not found' });
    }
    
    const data = JSON.parse(await fs.readFile(padPath, 'utf-8'));
    
    // Verify password
    const isValid = await verifyPassword(password, data.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Incorrect password' });
    }
    
    res.json({ content: data.content, files: data.files });
  } catch (error) {
    console.error('Get pad error:', error);
    res.status(500).json({ error: 'Failed to load pad' });
  }
});

// Save pad content (auto-save)
app.post('/api/pad/:padId/save', async (req, res) => {
  try {
    const { padId } = req.params;
    const { password, content } = req.body;
    
    const padPath = path.join(PADS_DIR, `${padId}.json`);
    
    if (!await padExists(padId)) {
      return res.status(404).json({ error: 'Pad not found' });
    }
    
    const data = JSON.parse(await fs.readFile(padPath, 'utf-8'));
    
    // Verify password
    const isValid = await verifyPassword(password, data.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Incorrect password' });
    }
    
    // Update content
    data.content = content;
    data.updatedAt = new Date().toISOString();
    
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
    if (!await padExists(padId)) {
      return res.status(404).json({ error: 'Pad not found' });
    }
    
    const padData = JSON.parse(await fs.readFile(padPath, 'utf-8'));
    const isValid = await verifyPassword(password, padData.passwordHash);
    
    if (!isValid) {
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
    padData.updatedAt = new Date().toISOString();
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
    if (!await padExists(padId)) {
      return res.status(404).json({ error: 'Pad not found' });
    }
    
    const padData = JSON.parse(await fs.readFile(padPath, 'utf-8'));
    const isValid = await verifyPassword(password, padData.passwordHash);
    
    if (!isValid) {
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

// Summarize text with Gemini AI
app.post('/api/summarize/:padId', async (req, res) => {
  try {
    const { padId } = req.params;
    const { password, content } = req.body;
    
    // Verify password
    const padPath = path.join(PADS_DIR, `${padId}.json`);
    if (!await padExists(padId)) {
      return res.status(404).json({ error: 'Pad not found' });
    }
    
    const padData = JSON.parse(await fs.readFile(padPath, 'utf-8'));
    const isValid = await verifyPassword(password, padData.passwordHash);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Validate content
    if (!content || content.trim().length < 50) {
      return res.status(400).json({ error: 'Content must be at least 50 characters' });
    }
    
    // Check if Gemini API key is configured
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ 
        error: 'Gemini API key not configured. Please add GEMINI_API_KEY to .env file' 
      });
    }
    
    // Generate summary using Gemini
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const result = await model.generateContent(`Summarize the following text clearly and concisely:\n\n${content}`);
    const response = await result.response;
    const summary = response.text();
    
    res.json({ 
      success: true, 
      summary: summary.trim()
    });
  } catch (error) {
    console.error('Summarization error:', error);
    
    // Provide helpful error messages
    if (error.message && error.message.includes('API key')) {
      return res.status(503).json({ 
        error: 'Invalid Gemini API key. Please check your .env configuration' 
      });
    }
    
    res.status(500).json({ 
      error: 'Summarization failed. Please try again later.' 
    });
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
      if (expired.length > 0) {
        padData.files = padData.files.filter(f => new Date(f.expiresAt) >= now);
        padData.updatedAt = new Date().toISOString();
        await fs.writeFile(padPath, JSON.stringify(padData, null, 2));
      }
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
║      SECURENOTE - SERVER RUNNING      ║
╠════════════════════════════════════════╣
║  Port: ${PORT.toString().padEnd(31)}║
║  Mode: Production                      ║
║  Storage: JSON + Disk                  ║
║  AI: Google Gemini (${GEMINI_MODEL.padEnd(16)}) ║
║  Password: bcrypt (${SALT_ROUNDS} rounds)${' '.repeat(13)}║
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