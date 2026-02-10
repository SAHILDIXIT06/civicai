# Database Implementation Guide for CivicAI

## Overview
This guide will help you migrate from JSON file storage to PostgreSQL database using Supabase.

## Step 1: Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and sign up for free
2. Create a new project
3. Wait for the database to be provisioned (2-3 minutes)
4. Go to **Settings** → **Database** → **Connection String**
5. Copy the **URI** connection string (it starts with `postgresql://`)

## Step 2: Install PostgreSQL Client

Open terminal in the backend directory and run:

```bash
npm install pg
```

## Step 3: Update Environment Variables

Add to `backend/.env`:

```env
# Existing variables...
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
NODE_ENV=production
```

Replace `[YOUR-PASSWORD]` and `[YOUR-PROJECT-REF]` with your Supabase credentials.

## Step 4: Create Database Schema

1. Go to Supabase Dashboard → **SQL Editor**
2. Copy the contents of `backend/src/schema.sql` (already created)
3. Paste in the SQL Editor
4. Click **Run**

This will create all tables, indexes, and default data.

## Step 5: Create Directory Structure

Create the following directory if it doesn't exist:
```bash
mkdir backend\src\models
```

## Step 6: Create Database Files

### File 1: `backend/src/db.js`
Already created - database connection pool

### File 2: `backend/src/models/complaints.js`
Create this file with the complaints data access functions (see COMPLAINTS_MODEL.md)

### File 3: `backend/src/models/admins.js`
Create this file with the admin data access functions (see ADMINS_MODEL.md)

## Step 7: Update app.js to Use Database

Replace JSON file operations in `backend/src/app.js` with database calls:

### Before (JSON):
```javascript
const data = JSON.parse(await fs.readFile(dataFile, 'utf8'));
const complaints = data.complaints || [];
```

### After (Database):
```javascript
import { getAllComplaints, createComplaint, updateComplaint, deleteComplaint } from './models/complaints.js';
import { getAllAdmins, getAdminByPhone, isAdmin, createAdmin, updateAdmin, deleteAdmin } from './models/admins.js';

// Get complaints
const complaints = await getAllComplaints();

// Create complaint
const newComplaint = await createComplaint(complaintData);

// Update complaint
await updateComplaint(complaintId, { status: 'Resolved' });

// Check admin
const adminExists = await isAdmin(phoneNumber);
```

## Step 8: Migration Script (Optional)

To migrate existing JSON data to database, create `backend/migrate-data.js`:

```javascript
import 'dotenv/config';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createComplaint } from './src/models/complaints.js';
import { createAdmin } from './src/models/admins.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrate() {
  console.log('Starting migration...');
  
  // Migrate complaints
  const complaintsFile = path.join(__dirname, 'data', 'complaints.json');
  const complaintsData = JSON.parse(await fs.readFile(complaintsFile, 'utf8'));
  
  for (const complaint of complaintsData.complaints) {
    try {
      await createComplaint({
        id: complaint.id,
        status: complaint.status,
        category: complaint.category,
        mainCategory: complaint.mainCategory,
        subCategory: complaint.subCategory,
        description: complaint.description,
        location: complaint.location,
        userPhone: complaint.userPhone,
        userId: complaint.userId,
        userName: complaint.userName,
        image: complaint.image,
        analysis: complaint.analysis,
        urgency: complaint.urgency,
        departmentId: complaint.departmentId,
        departmentName: complaint.departmentName
      });
      console.log(`✓ Migrated complaint ${complaint.id}`);
    } catch (err) {
      console.error(`✗ Failed to migrate complaint ${complaint.id}:`, err.message);
    }
  }
  
  // Migrate admins
  const adminsFile = path.join(__dirname, 'data', 'admin_phones.json');
  const adminsData = JSON.parse(await fs.readFile(adminsFile, 'utf8'));
  
  for (const admin of adminsData.admins) {
    try {
      await createAdmin({
        phone: admin.phone,
        name: admin.name,
        addedBy: admin.addedBy,
        departmentId: admin.departmentId,
        departmentName: admin.departmentName,
        canAccessComplaints: admin.canAccessComplaints,
        canManageAdmins: admin.canManageAdmins
      });
      console.log(`✓ Migrated admin ${admin.phone}`);
    } catch (err) {
      console.error(`✗ Failed to migrate admin ${admin.phone}:`, err.message);
    }
  }
  
  console.log('Migration complete!');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
```

Run migration:
```bash
node backend/migrate-data.js
```

## Step 9: Test the Application

1. Start the backend:
```bash
cd backend
npm run dev
```

2. Test endpoints:
   - Health check: http://localhost:4000/api/health
   - Get complaints: http://localhost:4000/api/complaints
   - Admin check: http://localhost:4000/api/admin/check?phone=+917058346137

## Step 10: Deploy to Vercel

1. Push changes to GitHub
2. Vercel will auto-deploy
3. Add `DATABASE_URL` to Vercel environment variables:
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add `DATABASE_URL` with your Supabase connection string
4. Redeploy

## Key Changes Summary

### Files Created:
- `backend/src/db.js` - Database connection
- `backend/src/schema.sql` - Database schema
- `backend/src/models/complaints.js` - Complaint operations
- `backend/src/models/admins.js` - Admin operations

### Files to Update:
- `backend/src/app.js` - Replace JSON operations with database calls
- `backend/.env` - Add DATABASE_URL
- `backend/package.json` - Add pg dependency

### Files to Keep (for backup):
- `backend/data/*.json` - Keep until migration is successful

## Troubleshooting

### Connection Error
- Check DATABASE_URL is correct
- Verify Supabase project is running
- Check if IP is whitelisted (Supabase allows all by default)

### Schema Errors
- Re-run schema.sql in Supabase SQL Editor
- Check for table name conflicts

### Migration Errors
- Check JSON file formats
- Verify UUIDs are valid
- Check for duplicate entries

## Benefits of This Approach

✅ **Persistent Storage** - Data survives deployments
✅ **Scalability** - Handle thousands of complaints
✅ **ACID Compliance** - No data corruption
✅ **Concurrent Access** - Multiple users safely
✅ **Free Tier** - Supabase free tier is generous
✅ **Backup & Recovery** - Automatic backups

## Next Steps

After database is working:
1. Add authentication with JWT tokens
2. Implement file upload to Vercel Blob Storage
3. Add API rate limiting
4. Set up database backups
5. Add monitoring and logging

## Support

- Supabase Docs: https://supabase.com/docs
- PostgreSQL Docs: https://www.postgresql.org/docs/
- Node.js pg: https://node-postgres.com/
