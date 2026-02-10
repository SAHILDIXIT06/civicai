# Database Setup Quick Start

This script helps you set up the database for CivicAI quickly.

## Prerequisites
- Node.js 18+ installed
- Git installed
- A Supabase account (free tier is fine)

## Steps to Complete

### 1. Install Database Package

Open terminal in project root:

```bash
cd backend
npm install pg
```

### 2. Create Supabase Project

1. Visit https://supabase.com and sign in
2. Click "New Project"
3. Fill in:
   - **Project Name**: civicai-db (or any name)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to you
4. Click "Create new project"
5. Wait 2-3 minutes for provisioning

### 3. Get Database URL

1. In Supabase Dashboard, go to **Settings** → **Database**
2. Scroll to **Connection String** section
3. Copy the **URI** format (starts with `postgresql://`)
4. Replace `[YOUR-PASSWORD]` in the URL with your actual password

Example:
```
postgresql://postgres:your_password_here@db.abcdefghij.supabase.co:5432/postgres
```

### 4. Update Environment Variables

Edit `backend/.env` file and add:

```env
DATABASE_URL=postgresql://postgres:your_password@db.your-ref.supabase.co:5432/postgres
NODE_ENV=development
```

### 5. Create Database Schema

1. In Supabase Dashboard, click **SQL Editor** (left sidebar)
2. Click **New query**
3. Open the file `backend/src/schema.sql` in a text editor
4. Copy ALL the content
5. Paste into Supabase SQL Editor
6. Click **Run** (or press Ctrl+Enter)

You should see "Success. No rows returned" - this is correct!

### 6. Create Models Directory

In terminal:

```bash
# Windows PowerShell
mkdir backend\src\models

# Mac/Linux
mkdir -p backend/src/models
```

### 7. Create Model Files

#### File: `backend/src/models/complaints.js`

Copy the entire code from `COMPLAINTS_MODEL.md` and save it.

#### File: `backend/src/models/admins.js`

Copy the entire code from `ADMINS_MODEL.md` and save it.

### 8. Test Database Connection

Create a test file `backend/test-db.js`:

```javascript
import 'dotenv/config';
import pool from './src/db.js';

async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully!');
    console.log('Server time:', result.rows[0].now);
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();
```

Run it:
```bash
cd backend
node test-db.js
```

If you see "✅ Database connected successfully!" - you're good!

### 9. Update Backend Code (Next Phase)

You'll need to update `backend/src/app.js` to use the database models instead of JSON files. This involves:

1. Import the models at the top
2. Replace `fs.readFile` and `fs.writeFile` calls
3. Use async/await for database operations

See `DATABASE_SETUP.md` for detailed code changes.

### 10. Deploy to Vercel

1. Push code to GitHub
2. In Vercel Dashboard:
   - Go to your project
   - **Settings** → **Environment Variables**
   - Add: `DATABASE_URL` = (your Supabase URL)
   - Add: `NODE_ENV` = `production`
3. Redeploy

## Verification Checklist

- [ ] `npm install pg` completed without errors
- [ ] Supabase project created and running
- [ ] Database password saved securely
- [ ] `DATABASE_URL` added to `backend/.env`
- [ ] Schema created successfully in Supabase
- [ ] `backend/src/models/` directory exists
- [ ] `complaints.js` model file created
- [ ] `admins.js` model file created
- [ ] Test connection script passes
- [ ] Ready to update app.js

## Common Issues

### "Connection refused"
- Check DATABASE_URL is correct
- Verify Supabase project is not paused
- Check your internet connection

### "Password authentication failed"
- Verify password in DATABASE_URL is correct
- Check for special characters that need URL encoding

### "Table already exists"
- This is fine! Schema was already created
- You can skip re-running schema.sql

### "Module not found: pg"
- Run `npm install pg` in backend directory
- Check package.json lists pg in dependencies

## Need Help?

1. Check DATABASE_SETUP.md for full documentation
2. Review schema.sql for table structures
3. Check Supabase documentation: https://supabase.com/docs
4. Verify all environment variables are set

## What's Next?

After setup is complete:
1. Update app.js to use database (see DATABASE_SETUP.md Step 7)
2. Test all API endpoints locally
3. Migrate existing JSON data (optional - see DATABASE_SETUP.md Step 8)
4. Deploy to Vercel
5. Add proper authentication with JWT

## Files Created by This Setup

```
backend/
├── src/
│   ├── db.js                    ✅ Created
│   ├── schema.sql               ✅ Created
│   └── models/
│       ├── complaints.js        ⏳ You create
│       └── admins.js            ⏳ You create
├── .env                         ⏳ You update
└── package.json                 ⏳ Updated by npm
```

## Estimated Time

- Supabase setup: 5 minutes
- Schema creation: 2 minutes
- Code file creation: 10 minutes
- Testing: 5 minutes

**Total: ~20-25 minutes**

Good luck! 🚀
