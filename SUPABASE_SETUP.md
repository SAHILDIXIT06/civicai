# Supabase Database Setup Guide

## Overview
This guide will help you set up Supabase as the database for CivicAI, replacing the JSON file storage for production deployment on Vercel.

## Prerequisites
- A Supabase account (free tier works perfectly)
- Node.js installed locally
- Access to your CivicAI project

## Step 1: Create a Supabase Project

1. Go to [Supabase](https://supabase.com) and sign in/sign up
2. Click "New Project"
3. Fill in the details:
   - **Name**: civic-ai-prod (or your preferred name)
   - **Database Password**: Save this securely!
   - **Region**: Choose closest to your users
4. Wait for the project to be created (2-3 minutes)

## Step 2: Run Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy the contents of `backend/schema.sql`
3. Paste it into the SQL Editor
4. Click **Run** to execute the schema
5. Verify tables are created:
   - complaints
   - admins
   - departments

## Step 3: Get API Credentials

1. In Supabase dashboard, go to **Settings** > **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://xxx.supabase.co`)
   - **anon/public key** (the long string under "Project API keys")

## Step 4: Configure Environment Variables

### Local Development

1. Open `backend/.env` (create if it doesn't exist)
2. Add Supabase credentials:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

### Vercel Production

1. Go to your Vercel project dashboard
2. Navigate to **Settings** > **Environment Variables**
3. Add the same variables:
   - `SUPABASE_URL` = your project URL
   - `SUPABASE_ANON_KEY` = your anon key

## Step 5: Install Dependencies

```powershell
cd backend
npm install
```

This will install `@supabase/supabase-js` (already added to package.json).

## Step 6: Migrate Existing Data (Optional)

If you have existing data in JSON files, you can migrate it:

```powershell
node backend/src/migrate-to-supabase.js
```

This script will:
- Read existing complaints from `backend/data/complaints.json`
- Read existing admins from `backend/data/admin_phones.json`
- Read departments from `backend/data/departments.json`
- Upload them all to Supabase

## Step 7: Test Database Connection

```powershell
npm run dev
```

Check the console output:
- ✅ If you see "✅ Supabase connected", you're good!
- ❌ If you see warnings, double-check your credentials

## Step 8: Deploy to Vercel

1. Push your changes to GitHub:
```powershell
git add .
git commit -m "Add Supabase database integration"
git push
```

2. Vercel will automatically deploy
3. Check deployment logs to ensure no errors

## Database Structure

### Complaints Table
- `id` (UUID, Primary Key)
- `created_at`, `status`, `category`, `description`
- `location` (JSONB) - stores latitude, longitude, address
- `user_phone`, `user_name`, `user_id`
- `image` (JSONB) - stores file info
- `analysis` (JSONB) - AI analysis results
- `forwarding_history` (JSONB array)
- Assignment & resolution fields

### Admins Table
- `phone` (TEXT, Primary Key)
- `name`, `added_at`, `added_by`
- `department_id`, `department_name`
- `can_access_complaints`, `can_manage_admins` (permissions)

### Departments Table
- `id` (TEXT, Primary Key)
- `name`, `email`, `description`

## Verifying Everything Works

1. **Create a new complaint** via the web app
2. Check in Supabase dashboard → **Table Editor** → complaints
3. You should see your new complaint there!

## Troubleshooting

### "Database not configured" Error
- Check that `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set in `.env`
- Restart your server after adding env variables

### "Row Level Security policy violation"
- The schema.sql includes policies to allow all operations
- If you get this error, run the schema.sql again

### Queries are slow
- Make sure indexes are created (they're in schema.sql)
- Check Supabase dashboard → **Database** → **Extensions** → enable `pg_stat_statements` for query analysis

### Data not showing up
- Check Supabase dashboard → **Table Editor** to see data directly
- Use **Logs** → **Postgres Logs** to see any errors

## Cost Considerations

**Free Tier includes:**
- 500 MB database space
- 1 GB file storage
- 2 GB bandwidth
- Unlimited API requests
- Social OAuth providers

For CivicAI prototype, this is more than sufficient. You can handle thousands of complaints and users.

## Security Notes

1. **Never commit** `.env` file with real credentials
2. **Row Level Security (RLS)** is enabled but policies allow all operations
   - For production, implement proper auth and restrict policies
3. **anon key is public** - it's safe to expose in client code
4. Use **service_role key** only in trusted server environments (not included in current setup for safety)

## Next Steps

1. Consider implementing Supabase Auth for admin login
2. Add file storage using Supabase Storage for images (replacing local uploads)
3. Set up database backups (automatic in Supabase Pro plan)
4. Monitor database performance via Supabase dashboard

## Support

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
- CivicAI Issues: Check GitHub repository for help
