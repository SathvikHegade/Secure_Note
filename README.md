# 🔒 Secure Pad Pro

A professional, password-protected notepad with file uploads and AI-powered summarization. **100% free to deploy and run.**

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)

## ✨ Features

- 🔐 **Password Protection** - SHA-256 hashed passwords
- 💾 **Auto-Save** - Notes saved every 2 seconds
- 📎 **File Uploads** - Up to 10MB (PDF, JPG, PNG, DOCX)
- 👁️ **File Preview** - View PDFs and images instantly
- ✨ **AI Summarization** - Local AI model (Transformers.js)
- ⏰ **Auto-Expiry** - Files deleted after 24 hours
- 📱 **Responsive** - Works on mobile and desktop
- 🚀 **100% Free** - No paid APIs or services
- 🔒 **Secure** - MIME validation, file size limits

## 🏗️ Architecture

```
┌──────────────────────────────────────┐
│          Frontend (Browser)          │
│  • HTML/CSS/JS                       │
│  • Transformers.js (Local AI)        │
│  • File upload/preview               │
└─────────────┬────────────────────────┘
              │ HTTPS/REST API
┌─────────────▼────────────────────────┐
│         Backend (Express.js)         │
│  • Password hashing (SHA-256)        │
│  • File validation & storage         │
│  • JSON-based pad storage            │
│  • Cleanup cron job                  │
└─────────────┬────────────────────────┘
              │
┌─────────────▼────────────────────────┐
│          File System                 │
│  • /pads/*.json (pad data)           │
│  • /uploads/*/* (uploaded files)     │
└──────────────────────────────────────┘
```

## 📁 Project Structure

```
secure-pad-pro/
├── server.js              # Express backend
├── package.json           # Dependencies
├── README.md             # This file
├── .gitignore            # Git ignore
├── render.yaml           # Render config
├── public/
│   ├── index.html        # Landing page (optional)
│   ├── pad.html          # Main pad interface
│   ├── style.css         # Styling
│   ├── script.js         # Client logic + AI
│   ├── manifest.json     # PWA manifest
│   └── icon.svg          # App icon
├── pads/                 # JSON storage (auto-created)
└── uploads/              # File storage (auto-created)
```

## 🚀 Quick Start

### Local Development

```bash
# 1. Clone or create project directory
mkdir secure-pad-pro
cd secure-pad-pro

# 2. Install dependencies
npm install

# 3. Start server
npm start

# 4. Open browser
# Visit http://localhost:3000
```

## 🌐 Deployment

### Option 1: Render (Recommended)

**100% Free Tier - No credit card required**

1. **Push to GitHub:**
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin YOUR_GITHUB_URL
git push -u origin main
```

2. **Deploy on Render:**
   - Go to https://render.com
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Use these settings:
     - **Name:** secure-pad-pro
     - **Environment:** Node
     - **Build Command:** `npm install`
     - **Start Command:** `npm start`
     - **Instance Type:** Free
   - Click "Create Web Service"

3. **Access your app:**
   - URL: `https://your-app-name.onrender.com`

**Note:** Free tier may sleep after inactivity but wakes up on first request.

### Option 2: Railway

**Free $5 credit monthly**

1. **Push to GitHub** (same as above)

2. **Deploy on Railway:**
   - Go to https://railway.app
   - Click "Start a New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Railway auto-detects Node.js
   - Click "Deploy"

3. **Generate domain:**
   - Go to Settings → Generate Domain
   - Access at: `https://your-app.up.railway.app`

### Option 3: Cyclic.sh

**Free unlimited apps**

1. Go to https://cyclic.sh
2. Connect GitHub
3. Deploy repository
4. Done!

## 🔧 Configuration

### Environment Variables

No environment variables required! Everything works out of the box.

### Custom Port

```bash
PORT=8080 npm start
```

### File Size Limit

Edit `server.js`:
```javascript
const MAX_FILE_SIZE = 10 * 1024 * 1024; // Change to desired size
```

### File Expiry Time

Edit `server.js`:
```javascript
expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
// Change to: 48 * 60 * 60 * 1000 for 48 hours
```

## 🧪 Testing

### Manual Testing

1. **Create Pad:**
   - Visit `/pad/test123`
   - Set password "test123"
   - Verify pad is created

2. **Save Notes:**
   - Type text
   - Wait 2 seconds
   - Check "Saved" status appears

3. **Upload File:**
   - Click upload zone
   - Select a PDF or image
   - Verify file appears in list

4. **Preview File:**
   - Click "Preview" button
   - Verify modal opens with content

5. **AI Summarization:**
   - Write at least 50 characters
   - Click "Summarize"
   - Wait for AI model to load (first time only)
   - Verify summary appears

6. **Password Protection:**
   - Close browser
   - Reopen `/pad/test123`
   - Enter correct password → access granted
   - Enter wrong password → access denied

### API Testing with curl

```bash
# Create pad
curl -X POST http://localhost:3000/api/pad/test/create \
  -H "Content-Type: application/json" \
  -d '{"password":"test123"}'

# Verify password
curl -X POST http://localhost:3000/api/pad/test/verify \
  -H "Content-Type: application/json" \
  -d '{"password":"test123"}'

# Save content
curl -X POST http://localhost:3000/api/pad/test/save \
  -H "Content-Type: application/json" \
  -d '{"password":"test123","content":"Hello World"}'

# Get content
curl -X POST http://localhost:3000/api/pad/test/get \
  -H "Content-Type: application/json" \
  -d '{"password":"test123"}'
```

## 🔒 Security

### Implemented

✅ **Password Hashing** - SHA-256, never stored in plain text  
✅ **MIME Validation** - Magic byte checking prevents file spoofing  
✅ **File Size Limits** - Prevents abuse  
✅ **Auto-Expiry** - Files deleted after 24 hours  
✅ **No SQL Injection** - JSON-based storage  
✅ **CORS Protection** - Optional CORS configuration

### Best Practices

- Use strong passwords (8+ characters, mixed case, numbers)
- Don't share URLs publicly if content is sensitive
- Files expire in 24 hours - download important files
- AI runs locally - no data sent to external services

### Recommended Enhancements for Production

1. **Rate Limiting:**
```bash
npm install express-rate-limit
```

2. **HTTPS Only:**
```javascript
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});
```

3. **Helmet.js for security headers:**
```bash
npm install helmet
```

## 📊 Performance

- **Initial Load:** < 2s
- **Auto-Save:** Every 2 seconds
- **File Upload:** < 5s for 10MB
- **AI Model Load:** ~ 30s (first time only, cached after)
- **Summarization:** ~ 5-10s depending on text length

## 🐛 Troubleshooting

### Server won't start

```bash
# Check if port is in use
lsof -i :3000  # Mac/Linux
netstat -ano | findstr :3000  # Windows

# Try different port
PORT=8080 npm start
```

### Files not uploading

- Check file size < 10MB
- Verify file type is allowed (PDF, JPG, PNG, DOCX)
- Check disk space

### AI summarization fails

- First load takes ~30s to download model
- Requires modern browser (Chrome, Firefox, Safari)
- Fallback summary shown if AI fails
- Check browser console for errors

### Pad not saving

- Check password is correct
- Verify `pads/` directory exists and is writable
- Check server logs for errors

## 🎨 Customization

### Change Theme Colors

Edit `public/style.css`:
```css
:root {
  --primary: #667eea;  /* Change to your color */
  --secondary: #48bb78;
  /* ... */
}
```

### Add Custom Logo

Replace icon in `public/icon.svg`

### Modify Landing Page

Create `public/index.html` to customize homepage

## 🚀 Future Enhancements

Potential features to add:

- [ ] Markdown support in editor
- [ ] Real-time collaborative editing
- [ ] Export to PDF
- [ ] Version history
- [ ] Custom expiry times per file
- [ ] Encryption at rest
- [ ] 2FA authentication
- [ ] Dark mode
- [ ] Mobile apps (React Native)
- [ ] Browser extension

## 📝 API Documentation

### POST `/api/pad/:padId/create`

Create new pad with password.

**Request:**
```json
{
  "password": "string (min 4 chars)"
}
```

**Response:**
```json
{
  "success": true
}
```

### POST `/api/pad/:padId/verify`

Verify password for existing pad.

**Request:**
```json
{
  "password": "string"
}
```

**Response:**
```json
{
  "success": true|false
}
```

### POST `/api/pad/:padId/get`

Get pad content.

**Request:**
```json
{
  "password": "string"
}
```

**Response:**
```json
{
  "content": "string",
  "files": [...]
}
```

### POST `/api/pad/:padId/save`

Save pad content.

**Request:**
```json
{
  "password": "string",
  "content": "string"
}
```

**Response:**
```json
{
  "success": true
}
```

### POST `/api/upload/:padId`

Upload file (multipart/form-data).

**Form Data:**
- `file`: File to upload
- `password`: Pad password

**Response:**
```json
{
  "success": true,
  "file": {
    "id": "string",
    "name": "string",
    "size": number,
    "uploadedAt": "ISO date",
    "expiresAt": "ISO date"
  }
}
```

## 📄 License

MIT License - feel free to use, modify, and distribute.

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 💬 Support

- **Issues:** Open a GitHub issue
- **Questions:** Start a discussion
- **Security:** Report privately to [your-email]

## 🙏 Acknowledgments

- **Transformers.js** by Xenova for local AI
- **Express.js** for the backend framework
- **Multer** for file uploads

---

**Made with ❤️ for secure, private note-taking**

**Deploy now and enjoy your free, secure notepad!** 🚀