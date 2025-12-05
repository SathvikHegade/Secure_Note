# SecureNote - Setup & Deployment Guide

## 📋 Table of Contents
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running Locally](#running-locally)
- [Deployment](#deployment)
- [Database Schema](#database-schema)
- [API Documentation](#api-documentation)
- [Security Features](#security-features)
- [Troubleshooting](#troubleshooting)

## ✨ Features

### Core Functionality
- ✅ **Custom URL Creation** - Users create memorable, unique pad URLs (e.g., `/pad/myproject123`)
- ✅ **Secure Password Protection** - bcrypt password hashing with 10 salt rounds
- ✅ **Auto-Save** - Content automatically saves every 2 seconds
- ✅ **File Uploads** - Support for PDF, JPG, PNG, DOCX (max 10MB per file)
- ✅ **AI Summarization** - Google Gemini API integration for text summaries
- ✅ **Dark Mode** - Automatic theme switching with localStorage persistence
- ✅ **File Expiration** - Uploaded files auto-delete after 24 hours

### Security Features
- bcrypt password hashing (10 rounds)
- URL name validation (alphanumeric, hyphens, underscores only)
- File MIME type validation using magic bytes
- Custom URL uniqueness checks
- Password-protected pad access
- No plain text password storage

## 🔧 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18.0.0 or higher)
- **npm** (comes with Node.js)
- **Google Gemini API Key** (get one at https://makersuite.google.com/app/apikey)

## 📦 Installation

### 1. Clone or Download the Repository

```bash
git clone https://github.com/yourusername/secure_pad_pro.git
cd secure_pad_pro
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages:
- `express` - Web framework
- `multer` - File upload handling
- `cors` - Cross-origin resource sharing
- `bcrypt` - Password hashing
- `@google/generative-ai` - Google Gemini API SDK
- `dotenv` - Environment variable management

## ⚙️ Configuration

### 1. Create Environment File

Copy the example environment file:

```bash
cp .env.example .env
```

### 2. Configure Environment Variables

Edit the `.env` file with your settings:

```env
# Server Configuration
PORT=3000

# Google Gemini API Configuration
# Get your API key from: https://makersuite.google.com/app/apikey
GEMINI_API_KEY=your_actual_gemini_api_key_here

# Optional: Gemini Model Configuration
GEMINI_MODEL=gemini-1.5-flash
```

**Important:** 
- Replace `your_actual_gemini_api_key_here` with your real Gemini API key
- Never commit your `.env` file to version control
- The `.env` file is already in `.gitignore`

### Available Gemini Models:
- `gemini-1.5-flash` (default) - Fast and efficient
- `gemini-1.5-pro` - More powerful, slower
- `gemini-pro` - Previous generation

## 🚀 Running Locally

### Development Mode (with auto-restart)

```bash
npm run dev
```

This uses `nodemon` for automatic server restart on file changes.

### Production Mode

```bash
npm start
```

The server will start on `http://localhost:3000` (or your configured PORT).

### Verify Server is Running

You should see this output:

```
╔════════════════════════════════════════╗
║      SECURENOTE - SERVER RUNNING      ║
╠════════════════════════════════════════╣
║  Port: 3000                            ║
║  Mode: Production                      ║
║  Storage: JSON + Disk                  ║
║  AI: Google Gemini (gemini-1.5-flash)  ║
║  Password: bcrypt (10 rounds)          ║
╚════════════════════════════════════════╝
```

## 🌐 Deployment

### Deploy to Render.com

1. **Create a Render Account** at https://render.com

2. **Create a New Web Service**
   - Connect your Git repository
   - Or use "Deploy from Git URL"

3. **Configure Build Settings**
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** Node

4. **Set Environment Variables**
   - Go to Environment tab
   - Add `GEMINI_API_KEY` with your API key
   - Add `PORT` (Render sets this automatically, but you can override)
   - Add `GEMINI_MODEL` if you want to use a different model

5. **Deploy**
   - Click "Create Web Service"
   - Render will automatically deploy your app

### Deploy to Other Platforms

#### Heroku
```bash
# Install Heroku CLI
heroku create your-app-name
heroku config:set GEMINI_API_KEY=your_api_key
git push heroku main
```

#### Railway
```bash
# Install Railway CLI
railway init
railway add
railway up
```

#### DigitalOcean App Platform
1. Create new app
2. Link repository
3. Set environment variables
4. Deploy

### Environment Variables for Production

Make sure to set these in your hosting platform:

```
GEMINI_API_KEY=your_actual_api_key
GEMINI_MODEL=gemini-1.5-flash
PORT=3000
NODE_ENV=production
```

## 🗄️ Database Schema

### Storage Structure

The app uses a **file-based JSON database** for simplicity and portability.

#### Directory Structure
```
secure_pad_pro/
├── pads/           # Pad metadata and content
│   ├── myproject.json
│   ├── notes123.json
│   └── ...
└── uploads/        # Uploaded files
    ├── myproject/
    │   ├── abc123...pdf
    │   └── def456...jpg
    └── notes123/
```

#### Pad Schema (JSON)

Each pad is stored as `pads/{padId}.json`:

```json
{
  "padId": "myproject123",
  "content": "Note content here...",
  "files": [
    {
      "id": "abc123def456...",
      "name": "document.pdf",
      "size": 245678,
      "uploadedAt": "2025-12-05T10:30:00.000Z",
      "expiresAt": "2025-12-06T10:30:00.000Z"
    }
  ],
  "passwordHash": "$2b$10$abcdef...",
  "createdAt": "2025-12-05T10:00:00.000Z",
  "updatedAt": "2025-12-05T10:35:00.000Z"
}
```

#### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `padId` | string | Custom URL name (unique identifier) |
| `content` | string | Pad text content (unlimited length) |
| `files` | array | List of uploaded file metadata |
| `passwordHash` | string | bcrypt hashed password (10 rounds) |
| `createdAt` | ISO 8601 | Timestamp when pad was created |
| `updatedAt` | ISO 8601 | Last modification timestamp |

#### File Object Schema

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique file identifier (32 char hex) |
| `name` | string | Original filename |
| `size` | number | File size in bytes |
| `uploadedAt` | ISO 8601 | Upload timestamp |
| `expiresAt` | ISO 8601 | Expiration timestamp (24h after upload) |

### Migration to Database

If you need to scale to a real database, consider:
- **PostgreSQL** - For relational data
- **MongoDB** - For document-based storage
- **Redis** - For caching and sessions

## 📡 API Documentation

### Homepage & Authentication

#### `GET /`
- **Description:** Serve homepage with login/create interface
- **Response:** HTML page

#### `POST /api/create-pad`
- **Description:** Create a new pad with custom URL
- **Request Body:**
  ```json
  {
    "urlName": "myproject123",
    "password": "securepass"
  }
  ```
- **Validation:**
  - `urlName`: 3-50 chars, alphanumeric/hyphen/underscore only
  - `password`: min 4 characters
  - URL must be unique
- **Success Response (200):**
  ```json
  {
    "success": true,
    "padId": "myproject123"
  }
  ```
- **Error Responses:**
  - `409 Conflict`: URL already taken
  - `400 Bad Request`: Invalid input

#### `POST /api/login`
- **Description:** Login to existing pad
- **Request Body:**
  ```json
  {
    "urlName": "myproject123",
    "password": "securepass"
  }
  ```
- **Success Response (200):**
  ```json
  {
    "success": true,
    "padId": "myproject123"
  }
  ```
- **Error Response (401):**
  ```json
  {
    "error": "Incorrect URL or password."
  }
  ```

#### `GET /api/check-url/:urlName`
- **Description:** Check if custom URL is available
- **Response:**
  ```json
  {
    "available": true
  }
  ```

### Pad Operations

#### `GET /pad/:padId`
- **Description:** Serve pad editor interface
- **Response:** HTML page

#### `POST /api/pad/:padId/get`
- **Description:** Get pad content (requires password)
- **Request Body:**
  ```json
  {
    "password": "securepass"
  }
  ```
- **Success Response (200):**
  ```json
  {
    "content": "Note text...",
    "files": [...]
  }
  ```

#### `POST /api/pad/:padId/save`
- **Description:** Save pad content (auto-save)
- **Request Body:**
  ```json
  {
    "password": "securepass",
    "content": "Updated content..."
  }
  ```
- **Success Response (200):**
  ```json
  {
    "success": true
  }
  ```

### File Operations

#### `POST /api/upload/:padId`
- **Description:** Upload file to pad
- **Content-Type:** `multipart/form-data`
- **Fields:**
  - `file`: File to upload
  - `password`: Pad password
- **Allowed Types:** PDF, JPG, PNG, DOCX
- **Max Size:** 10MB
- **Success Response (200):**
  ```json
  {
    "success": true,
    "file": {
      "id": "abc123...",
      "name": "document.pdf",
      "size": 245678,
      "uploadedAt": "2025-12-05T10:30:00.000Z",
      "expiresAt": "2025-12-06T10:30:00.000Z"
    }
  }
  ```

#### `POST /files/:padId/:fileId`
- **Description:** Download file
- **Request Body:**
  ```json
  {
    "password": "securepass"
  }
  ```
- **Response:** File download

### AI Summarization

#### `POST /api/summarize/:padId`
- **Description:** Generate AI summary using Google Gemini
- **Request Body:**
  ```json
  {
    "password": "securepass",
    "content": "Long text to summarize..."
  }
  ```
- **Requirements:**
  - Content must be at least 50 characters
  - Valid Gemini API key configured
- **Success Response (200):**
  ```json
  {
    "success": true,
    "summary": "Concise summary of the content..."
  }
  ```
- **Error Responses:**
  - `503 Service Unavailable`: API key not configured
  - `400 Bad Request`: Content too short

## 🔒 Security Features

### Password Security
- **bcrypt Hashing:** 10 salt rounds
- **No Plain Text Storage:** Passwords never stored in plain text
- **Secure Comparison:** Timing-safe password verification

### Input Validation
- **URL Names:** Regex validation (`^[a-zA-Z0-9_-]{3,50}$`)
- **Password Strength:** Minimum 4 characters (configurable)
- **File Types:** MIME type validation using magic bytes
- **File Size:** 10MB limit per file

### File Security
- **MIME Validation:** Checks file headers, not just extensions
- **Sandboxed Storage:** Files stored in isolated directories
- **Auto-Expiration:** Files deleted after 24 hours

### API Security
- **Password Required:** All pad operations require password
- **Error Messages:** Generic error messages to prevent enumeration
- **Rate Limiting:** Consider adding rate limiting in production

## 🐛 Troubleshooting

### Common Issues

#### "Gemini API key not configured"
**Solution:** Ensure `.env` file exists with `GEMINI_API_KEY` set:
```bash
echo "GEMINI_API_KEY=your_key_here" > .env
```

#### "This URL name is already taken"
**Solution:** Choose a different custom URL name. Each URL must be unique.

#### "Failed to save pad"
**Solution:** 
1. Check disk space
2. Verify `pads/` directory exists and is writable
3. Check server logs for detailed error

#### File uploads fail
**Solution:**
1. Check file size (max 10MB)
2. Verify file type is allowed (PDF, JPG, PNG, DOCX)
3. Ensure `uploads/` directory exists and is writable

#### Server won't start
**Solution:**
1. Check if port 3000 is already in use:
   ```bash
   # Windows
   netstat -ano | findstr :3000
   
   # Linux/Mac
   lsof -i :3000
   ```
2. Change PORT in `.env` file
3. Verify all dependencies installed: `npm install`

### Debugging

Enable detailed logging:

```javascript
// Add to server.js
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});
```

### Getting Help

- Check server logs in terminal
- Review browser console for client-side errors
- Verify environment variables are set correctly
- Ensure Gemini API key is valid and has quota

## 📝 Usage Guide

### Creating Your First Pad

1. Navigate to `http://localhost:3000`
2. Click "Create New Pad" tab
3. Enter a custom URL name (e.g., "myproject")
4. Create a secure password
5. Confirm password
6. Click "Create My Pad"
7. You'll be redirected to `/pad/myproject`

### Accessing an Existing Pad

1. Go to homepage
2. Click "Access Existing Pad" tab
3. Enter your custom URL name
4. Enter your password
5. Click "Access My Pad"

### Using AI Summarization

1. Type at least 50 characters in the editor
2. Click "✨ Summarize" button
3. Wait for Gemini AI to generate summary
4. View summary, statistics, and insights

### Uploading Files

1. Click upload zone or drag & drop files
2. Supported formats: PDF, JPG, PNG, DOCX
3. Files expire after 24 hours
4. Preview or download files

## 🚀 Performance Optimization

### Production Optimizations

1. **Enable Gzip Compression:**
   ```bash
   npm install compression
   ```
   ```javascript
   const compression = require('compression');
   app.use(compression());
   ```

2. **Add Rate Limiting:**
   ```bash
   npm install express-rate-limit
   ```
   ```javascript
   const rateLimit = require('express-rate-limit');
   app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
   ```

3. **Use PM2 for Process Management:**
   ```bash
   npm install -g pm2
   pm2 start server.js --name securenote
   pm2 startup
   pm2 save
   ```

## 📄 License

MIT License - Feel free to use and modify for your needs.

## 👨‍💻 Developer

**T S Sathvik Hegade**
- Email: sathvikhegade3@gmail.com
- Institution: BMS Institute of Technology and Management

## 🙏 Acknowledgments

- Google Gemini AI for summarization
- bcrypt for secure password hashing
- Express.js framework
- Multer for file uploads

---

**Need Help?** Contact sathvikhegade3@gmail.com for support or bug reports.
