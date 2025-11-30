# Vercel Deployment Guide

## Prerequisites
- GitHub repository connected to Vercel
- Vercel account (free tier works)
- Environment variables configured

## Quick Deploy

### 1. Connect Repository
1. Visit [vercel.com](https://vercel.com)
2. Click "Import Project"
3. Select your GitHub repository: `SAHILDIXIT06/civicai`
4. Click "Import"

### 2. Configure Environment Variables
In Vercel dashboard → Settings → Environment Variables, add:

```
GEMINI_API_KEY=your_actual_gemini_key
CLIENT_ORIGIN=https://your-deployed-domain.vercel.app
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=your_email@gmail.com
```

### 3. Deploy
Click "Deploy" — Vercel will:
- Install dependencies from root `package.json`
- Build serverless function from `api/server.js`
- Serve static assets (HTML/CSS/JS)
- Generate HTTPS URL

## Project Structure
```
civic-ai.tech/
├── api/
│   └── server.js          # Vercel serverless entrypoint
├── backend/
│   └── src/
│       ├── app.js         # Express app (no listen)
│       └── server.js      # Local dev server
├── assets/                # Static JS/CSS
├── *.html                 # Static pages
├── package.json           # Root deps for Vercel
├── vercel.json            # Build config
└── .env.example           # Template for secrets
```

## Local Development
```powershell
# Install dependencies
npm install

# Create .env from example
Copy-Item .env.example .env
# Edit .env with your keys

# Run dev server (Express serves static + API)
npm run dev

# Open http://localhost:4000
```

## Production Limitations (Current Setup)

### ⚠️ Critical Issues
1. **File Storage**: `uploads/` folder ephemeral on Vercel serverless
   - Images lost after 10 min idle or redeploy
   - **Fix**: Use Vercel Blob, Cloudinary, or S3

2. **Data Persistence**: JSON files in `backend/data/` not persisted
   - Complaints/admins reset on redeploy
   - **Fix**: Migrate to MongoDB Atlas, Supabase, or Postgres

3. **Authentication**: Phone-based admin check lacks real auth
   - No sessions, tokens, or passwords
   - **Fix**: Add JWT auth or OAuth

4. **Concurrent Writes**: JSON file writes not atomic
   - Race conditions under load
   - **Fix**: Use database with transactions

### Next Steps for Production
1. **Storage Migration**: Replace multer disk with blob storage
2. **Database Setup**: Migrate JSON to hosted DB (MongoDB Atlas free tier)
3. **Auth Layer**: Add JWT middleware for admin routes
4. **Security**: Add helmet, rate limiting, input validation
5. **Monitoring**: Integrate Vercel Analytics / Sentry

## API Routes
After deploy, endpoints available at:
- `https://your-domain.vercel.app/api/health`
- `https://your-domain.vercel.app/api/complaints`
- `https://your-domain.vercel.app/api/admin/check`
- (See `backend/src/app.js` for full list)

## Troubleshooting

### Build Fails
- Check Vercel build logs for missing dependencies
- Ensure `package.json` has all imports used in `app.js`

### Functions Timeout
- Vercel free tier: 10s timeout
- Gemini AI calls may exceed; upgrade plan or optimize

### Static Files 404
- Verify `vercel.json` routes prioritize `/api/*` over static
- Check HTML files are in project root

## Cost Estimate
- **Free Tier**: 100GB bandwidth, serverless functions included
- **Pro**: $20/mo if scaling needed (unlikely for prototype)

## Support
- Vercel Docs: https://vercel.com/docs
- GitHub Issues: https://github.com/SAHILDIXIT06/civicai/issues
