# 🚀 Quick Start Guide - SecureNote

## Installation (3 steps)

### 1️⃣ Install Dependencies
```bash
npm install
```

### 2️⃣ Setup Environment
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your Gemini API key
# Get one free at: https://makersuite.google.com/app/apikey
```

Your `.env` should look like:
```env
PORT=3000
GEMINI_API_KEY=AIzaSyC...your_actual_key_here
GEMINI_MODEL=gemini-1.5-flash
```

### 3️⃣ Start Server
```bash
npm start
```

Open browser to: **http://localhost:3000**

---

## Usage

### Create a New Pad
1. Click **"Create New Pad"** tab
2. Enter custom URL name (e.g., "myproject")
3. Create a password
4. Confirm password
5. Click **"Create My Pad"**

### Access Existing Pad
1. Click **"Access Existing Pad"** tab
2. Enter your custom URL name
3. Enter your password
4. Click **"Access My Pad"**

### AI Summarization
1. Type at least 50 characters
2. Click **"✨ Summarize"** button
3. View AI-generated summary

### Upload Files
1. Click upload zone or drag & drop
2. Supported: PDF, JPG, PNG, DOCX (max 10MB)
3. Files expire after 24 hours

---

## Deployment

### Render.com (Recommended)
1. Create account at https://render.com
2. Click "New +" → "Web Service"
3. Connect your repository
4. Set **Environment Variables**:
   - `GEMINI_API_KEY` = your_api_key
5. Click "Create Web Service"

### Heroku
```bash
heroku create your-app-name
heroku config:set GEMINI_API_KEY=your_api_key
git push heroku main
```

---

## Key Features

✅ Custom URLs (e.g., `/pad/myproject`)  
✅ bcrypt password hashing (10 rounds)  
✅ Auto-save (every 2 seconds)  
✅ File uploads (PDF, JPG, PNG, DOCX)  
✅ AI summarization (Google Gemini)  
✅ Dark mode  
✅ Mobile responsive  

---

## Troubleshooting

**"Gemini API key not configured"**
→ Add valid API key to `.env` file

**"This URL name is already taken"**
→ Choose a different custom URL name

**File upload fails**
→ Check file size (max 10MB) and type

**Server won't start**
→ Check if port 3000 is in use, change PORT in `.env`

---

## Documentation

📖 **Full Setup Guide**: See `SETUP.md`  
📖 **Changes Log**: See `CHANGES.md`  
📖 **README**: See `README.md`

## Support

📧 **Email**: sathvikhegade3@gmail.com  
🐛 **Bug Reports**: Email above

---

**Made with ❤️ by T S Sathvik Hegade**
