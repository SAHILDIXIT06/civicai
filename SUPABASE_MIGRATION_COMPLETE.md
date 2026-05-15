# 🚀 Next Steps - Complete Supabase Migration

## What We Fixed  

✅ Schema now drops and recreates tables properly
✅ database.js uses SERVICE_ROLE_KEY (not anon key)
✅ Migration script matches schema exactly  
✅ app.js now uses Supabase instead of JSON files
✅ Cleaned up duplicate files (supabase.js, db.js, src/schema.sql)

## Before You Continue

### Step 1: Update Your .env File

Open `backend/.env` and make sure you have:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Find these in Supabase Dashboard:
# Settings → API → Project URL
# Settings → API → Service Role Key (SECRET - keep safe!)
```

⚠️ **IMPORTANT**: Use **SERVICE_ROLE_KEY**, NOT the anon/public key!

### Step 2: Re-run the Schema in Supabase

Go to Supabase SQL Editor and run: `backend/schema.sql`

This will DROP existing tables and recreate them with the correct structure.

### Step 3: Run Migration Script

```bash
node backend/src/migrate-to-supabase.js
```

This will copy all your JSON data into Supabase tables.

### Step 4: Test Locally

```bash
npm run dev
# or
cd backend && npm run dev
```

Check:

- https ://localhost:4000/api/health - should show `"database": "connected"`

- File a test complaint
- Check Supabase Dashboard → Table Editor for data

### Step 5: Deploy to Vercel

**5a. Add Environment Variables in Vercel**
Go to Vercel Dashboard → Your Project → Settings → Environment Variables

Add:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `CLIENT_ORIGIN` (your vercel domain, e.g., https ://yourapp.vercel.app)

**5b. Deploy**

```bash
vercel --prod
```

or push to your connected GitHub repo.

## Verification Checklist
- [ ] Schema re-run in Supabase (tables dropped & recreated)
- [ ] .env has SUPABASE_SERVICE_ROLE_KEY
- [ ] Migration script completed successfully
- [ ] Supabase tables show data in Table Editor
- [ ] Local server runs without errors
- [ ] Test complaint works locally
- [ ] Vercel env vars configured
- [ ] Deployed to Vercel

## What Changed in the Code

### Files Modified:
- ✏️ `backend/schema.sql` - Drops/recreates tables, fixed departments structure
- ✏️ `backend/src/database.js` - Uses SERVICE_ROLE_KEY
- ✏️ `backend/src/migrate-to-supabase.js` - Matches new schema
- ✏️ `backend/src/app.js` - All routes use Supabase (old backed up as app-json-backup.js)
- ✏️ `backend/.env.example` - Documents SERVICE_ROLE_KEY

### Files Deleted:
- ❌ `backend/src/supabase.js` (duplicate/unused)
- ❌ `backend/src/db.js` (duplicate pg config)
- ❌ `backend/src/schema.sql` (duplicate schema)

## Troubleshooting

**Error: "Database not configured"**
- Check .env has SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
- Make sure keys don't have extra spaces or quotes

**Error: "column does not exist"**
- Re-run backend/schema.sql in Supabase (it drops tables first)

**Empty tables after migration**
- Check backend/data/*.json files exist
- Run migration again: `node backend/src/migrate-to-supabase.js`

**Cannot connect to database**
- Verify Supabase project is not paused
- Check service role key is correct (not anon key)

Need help? Check what step failed and I can guide you through it!
