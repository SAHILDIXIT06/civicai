# CivicAI# CivicAI



A civic complaint filing application that works on any laptop with Node.js installed.Run the project locally and share it safely without committing secrets.



## Quick Start (One Command!)## Quick start (Windows PowerShell)



**Windows PowerShell:**1) Clone the repo

```powershell

git clone https://github.com/SAHILDIXIT06/civicai.git```powershell

cd civicai\backendgit clone https://github.com/SAHILDIXIT06/civicai.git

npm installcd civicai

npm run dev```

```

2) Install backend dependencies

**macOS/Linux:**

```bash```powershell

git clone https://github.com/SAHILDIXIT06/civicai.gitcd backend

cd civicai/backendnpm install

npm installcd ..

npm run dev```

```

3) Create your environment file

Then open **http://localhost:4000** in your browser.

```powershell

✅ That's it! The backend now serves both the API and the frontend files.# Copy the example and fill your real values

copy .\backend\.env.example .\backend\.env

## What You Need# Edit backend/.env and set GEMINI_API_KEY, optional CLIENT_ORIGIN and model

```

- **Node.js 18+** (includes npm) — [Download here](https://nodejs.org/)

- Internet connection (only for the first `npm install`)4) Start the app



No separate frontend server needed. No build steps. Just install dependencies and run.Option A — using VS Code tasks (recommended)

- Open the folder in VS Code and run the compound debug config “Full Stack (Frontend + Backend)”.

## How It Works

Option B — using terminals

The backend (`backend/src/server.js`) serves:```powershell

- **API endpoints** at `/api` (health, complaints, categories, analysis, etc.)# Terminal 1 (backend)

- **Static frontend** files from the project root (index.html, login.html, assets/, etc.)cd backend

- **Uploaded images** at `/uploads`npm run dev



Everything runs on one port (default: 4000).# Terminal 2 (frontend from project root)

cd ..

## Configurationnpx http-server -p 3000 .

```

The app uses environment variables in `backend/.env`:Open http://localhost:3000 in your browser.



- `PORT` — Server port (default: 4000)## Notes

- `CLIENT_ORIGIN` — Optional CORS origins, comma-separated (default: allows all)

- `GEMINI_API_KEY` — Required for AI-powered complaint analysis- Do not commit backend/.env. Use backend/.env.example for sharing required keys.

- `GEMINI_MODEL_NAME` — AI model (default: gemini-2.0-flash-exp)- The backend uses these variables:

	- PORT (default 4000)

**Note:** `backend/.env` is already included in the repo for quick testing. In production, you should:	- CLIENT_ORIGIN (optional, comma separated list for CORS)

1. Remove it from Git history	- GEMINI_API_KEY (required)

2. Rotate the API key	- GEMINI_MODEL_NAME (default gemini-2.5-flash)

3. Use environment variables or secrets management instead- Uploads are ignored by git; they’re created at runtime in `backend/uploads/`.



## Phone OTP Login (Demo Only)## Phone OTP login (demo only)



This app uses a built-in demo OTP flow for login. No external SMS provider is required.This app now uses a built‑in demo OTP flow for login. No external SMS provider is required.



- When you click "Send Verification Code", the UI displays: **Demo OTP: 123456**- When you click “Send Verification Code”, the UI will display: `Demo OTP: 123456`.

- Enter `123456` to complete the login- Enter `123456` to complete the login.

- Admin access is granted only to numbers listed in `backend/data/admin_phones.json`- Admin access is allowed only for numbers listed in `assets/auth.js` (`adminPhones`).



To add real SMS in the future, integrate a provider like AWS SNS, MSG91, or Twilio and replace the demo logic in `assets/auth.js`.If, in the future, you want real SMS, you can integrate a provider like AWS SNS, MSG91, or Twilio and replace the demo logic in `assets/auth.js`.



## Access from Mobile## Access from your phone



### Option A: Same Wi-Fi (Local Network)Option A — Same Wi‑Fi, local network

1. Find your PC's local IP:- Find your PC’s IP: `ipconfig` (Windows) or `ifconfig` (macOS/Linux).

   - Windows: `ipconfig` (look for IPv4 Address)- On your phone browser, open: `http://<PC_IP>:3000`.

   - macOS/Linux: `ifconfig` or `ip addr`- If your firewall blocks it, allow Node/HTTP for private networks.

2. On your phone browser: `http://<PC_IP>:4000`

3. If blocked, allow Node.js through Windows Firewall for Private networksOption B — Public tunnel using ngrok

- Install ngrok and run: `ngrok http 3000`.

### Option B: Public HTTPS Tunnel- Open the ngrok HTTPS URL on your phone.

Use a tunneling service for HTTPS (required for mobile geolocation):

## Snapshot tags

**Using localtunnel (free, no signup):**

```powershellWe create tags to bookmark stable states. For example: `snapshot-2025-11-02`.
npx localtunnel --port 4000
```

**Using ngrok (free with signup):**
```bash
ngrok http 4000
```

Share the HTTPS URL with your phone.

**Note:** Mobile browsers require HTTPS for geolocation. The app includes a map picker as a fallback for HTTP access.

## Troubleshooting

### "kill-port is not recognized"
This should no longer happen after our fix. The scripts now use:
```json
"predev": "kill-port 4000 || echo Port cleanup skipped"
```

If it still fails:
```powershell
cd backend
npm install
npm run dev
```

### Port 4000 Already in Use
1. Kill the process:
   ```powershell
   # Windows
   netstat -ano | findstr :4000
   taskkill /PID <PID> /F
   ```
2. Or use a different port:
   - Edit `backend/.env` and set `PORT=5000`
   - Run `npm run dev`
   - Open `http://localhost:5000`

### Cannot Access from Mobile (Firewall)
**Windows Firewall:**
1. Search "Windows Defender Firewall"
2. Click "Allow an app through firewall"
3. Find Node.js and check "Private" networks
4. Or temporarily disable firewall for Private networks (testing only)

### Frontend Not Loading
If you see a blank page:
1. Check browser console (F12) for errors
2. Verify the server logs show: `Static frontend enabled from: C:\civic-ai.tech`
3. Try clearing browser cache or use incognito mode
4. Ensure you're accessing `http://localhost:4000` (not 3000)

### Geolocation Not Working on Mobile
Geolocation requires HTTPS on mobile browsers:
- Use a tunnel (localtunnel or ngrok) for HTTPS access
- Or use the built-in map picker to manually select location

## Features

- 📱 **Phone OTP Login** (demo mode with 123456)
- 📝 **Complaint Filing** with category selection and AI analysis
- 📸 **Image Upload** (camera or gallery)
- 📍 **Location Detection** with map picker fallback
- 👨‍💼 **Admin Dashboard** for complaint management
- 🤖 **AI Analysis** powered by Google Gemini (optional)

## Project Structure

```
civicai/
├── backend/
│   ├── src/
│   │   ├── server.js       # Main Express server
│   │   ├── gemini.js       # AI analysis integration
│   │   └── categories.js   # Complaint categories
│   ├── data/
│   │   ├── complaints.json # Stored complaints
│   │   └── admin_phones.json # Admin phone numbers
│   ├── uploads/            # Uploaded images (gitignored)
│   └── package.json
├── assets/
│   ├── auth.js            # Login and authentication
│   ├── main.js            # Complaint filing logic
│   ├── dashboard.js       # User dashboard
│   ├── admin.js           # Admin panel
│   └── *.css              # Styling
├── index.html             # Main complaint form
├── login.html             # Login page
├── dashboard.html         # User complaints view
├── admin.html             # Admin management
└── README.md
```

## Development

The backend uses `nodemon` for auto-reload during development:
```powershell
cd backend
npm run dev  # Auto-reloads on file changes
```

For production:
```powershell
npm start    # Runs without auto-reload
```

## Deployment

### Backend (Render, Railway, etc.)
- **Root Directory:** `backend`
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Health Check:** `/api/health`
- **Environment Variables:** Set `GEMINI_API_KEY`, `CLIENT_ORIGIN`, `PORT`

### Frontend Only (GitHub Pages)
If you want to deploy the frontend separately:
1. Host backend on a service like Render
2. Enable GitHub Pages for the repo
3. Access frontend via Pages URL with `?api=https://your-backend.onrender.com`

The frontend supports API override via:
- Query parameter: `?api=https://backend-url`
- localStorage: `localStorage.setItem('apiBaseUrl', 'https://backend-url')`

## License

This project is open source and available for educational and civic purposes.

## Support

For issues or questions:
- Check the Troubleshooting section above
- Open an issue on GitHub
- Review recent commits for updates and fixes
