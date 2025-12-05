# PostgreSQL Setup Guide for SecureNote

## Local Development Setup

### 1. Install PostgreSQL

**Windows:**
1. Download from: https://www.postgresql.org/download/windows/
2. Run installer and set password for `postgres` user
3. Default port: `5432`

**Mac (using Homebrew):**
```bash
brew install postgresql
brew services start postgresql
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE securenote;

# Exit
\q
```

### 3. Update .env File

```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/securenote
```

Replace `your_password` with your PostgreSQL password.

### 4. Test Connection

```bash
node server.js
```

You should see:
```
✓ Database tables initialized
╔════════════════════════════════════════╗
║      SECURENOTE - SERVER RUNNING      ║
╠════════════════════════════════════════╣
║  Storage: PostgreSQL + Disk            ║
╚════════════════════════════════════════╝
```

---

## Render Deployment Setup

### 1. Create PostgreSQL Database on Render

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"PostgreSQL"**
3. Fill in:
   - **Name:** `securenote-db`
   - **Database:** `securenote`
   - **User:** `securenote` (auto-generated)
   - **Region:** Same as your web service
   - **PostgreSQL Version:** 16
   - **Plan:** Free (or Starter for production)

4. Click **"Create Database"**
5. Wait 2-3 minutes for provisioning

### 2. Get Database URL

1. Click on your PostgreSQL instance
2. Scroll to **"Connections"**
3. Copy the **"Internal Database URL"** (starts with `postgresql://`)

Example:
```
postgresql://securenote:ABC123xyz@dpg-xxx.oregon-postgres.render.com/securenote
```

### 3. Create Web Service

1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository: `SathvikHegade/secure_pad_pro`
3. Configure:
   - **Name:** `securenote`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Instance Type:** Free

### 4. Add Environment Variables

In your web service settings, add these environment variables:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `DATABASE_URL` | `<paste Internal Database URL from step 2>` |
| `GEMINI_API_KEY` | `AIzaSyAJPpoKXJ2ae-zHh5dNx1aA_sKNE5_yuZQ` |
| `GEMINI_MODEL` | `models/gemini-2.5-flash` |

### 5. Deploy

1. Click **"Create Web Service"**
2. Render will build and deploy
3. Check logs for:
   ```
   ✓ Database tables initialized
   SECURENOTE - SERVER RUNNING
   ```

### 6. Test Your App

Visit your Render URL:
```
https://securenote.onrender.com
```

---

## Database Schema

### Tables Created Automatically

**pads table:**
```sql
CREATE TABLE pads (
  id SERIAL PRIMARY KEY,
  pad_id VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  content TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**files table:**
```sql
CREATE TABLE files (
  id SERIAL PRIMARY KEY,
  pad_id VARCHAR(255) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  path TEXT NOT NULL,
  size INTEGER NOT NULL,
  mime_type VARCHAR(100),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  FOREIGN KEY (pad_id) REFERENCES pads(pad_id) ON DELETE CASCADE
);
```

---

## Troubleshooting

### Connection Failed

**Error:** `ECONNREFUSED` or `Connection timeout`

**Solution:**
- Check `DATABASE_URL` is correct
- Ensure PostgreSQL is running
- Check firewall settings

### SSL Error on Render

**Error:** `self signed certificate`

**Solution:** Already handled in code:
```javascript
ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
```

### Tables Not Created

**Error:** `relation "pads" does not exist`

**Solution:**
- Check logs for database initialization errors
- Manually run SQL from schema above
- Restart server

---

## Migration from JSON to PostgreSQL

Your old JSON files in `/pads/*.json` are not automatically migrated.

**To migrate manually:**

1. Backup old JSON files
2. For each pad, create via the app UI
3. Copy content manually

**Or use this migration script:**

```javascript
// migrate.js
const fs = require('fs').promises;
const path = require('path');
const { db } = require('./db');

async function migrate() {
  const padsDir = path.join(__dirname, 'pads');
  const files = await fs.readdir(padsDir);
  
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    
    const data = JSON.parse(await fs.readFile(path.join(padsDir, file), 'utf-8'));
    
    // Create pad
    await db.createPad(data.padId, data.passwordHash);
    
    // Update content
    if (data.content) {
      await db.updatePad(data.padId, data.content);
    }
    
    console.log(`Migrated: ${data.padId}`);
  }
  
  console.log('Migration complete!');
}

migrate().catch(console.error);
```

---

## Benefits of PostgreSQL

✅ **Persistent storage** - Data survives server restarts
✅ **Scalable** - Handle thousands of notes
✅ **ACID compliant** - Data integrity guaranteed
✅ **Free tier on Render** - 1GB storage included
✅ **Automatic backups** - Point-in-time recovery
✅ **Better performance** - Indexed queries

---

## Support

For issues, contact: sathvikhegade3@gmail.com
