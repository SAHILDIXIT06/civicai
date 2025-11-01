# CivicAI

Run the project locally and share it safely without committing secrets.

## Quick start (Windows PowerShell)

1) Clone the repo

```powershell
git clone https://github.com/SAHILDIXIT06/civicai.git
cd civicai
```

2) Install backend dependencies

```powershell
cd backend
npm install
cd ..
```

3) Create your environment file

```powershell
# Copy the example and fill your real values
copy .\backend\.env.example .\backend\.env
# Edit backend/.env and set GEMINI_API_KEY, optional CLIENT_ORIGIN and model
```

4) Start the app

Option A — using VS Code tasks (recommended)
- Open the folder in VS Code and run the compound debug config “Full Stack (Frontend + Backend)”.

Option B — using terminals
```powershell
# Terminal 1 (backend)
cd backend
npm run dev

# Terminal 2 (frontend from project root)
cd ..
npx http-server -p 3000 .
```
Open http://localhost:3000 in your browser.

## Notes

- Do not commit backend/.env. Use backend/.env.example for sharing required keys.
- The backend uses these variables:
	- PORT (default 4000)
	- CLIENT_ORIGIN (optional, comma separated list for CORS)
	- GEMINI_API_KEY (required)
	- GEMINI_MODEL_NAME (default gemini-2.5-flash)
- Uploads are ignored by git; they’re created at runtime in `backend/uploads/`.

## Phone OTP login (Firebase)

This repo includes optional Firebase Phone Authentication. If not configured, the app falls back to a demo OTP (123456) for local testing.

To enable real OTP:
1) Create a Firebase project (free tier is fine) and add a Web App.
2) Enable Authentication → Sign-in method → Phone.
3) In Authentication → Settings → Authorized domains, add:
	 - localhost
	 - 127.0.0.1
	 - Your PC’s LAN IP (e.g., 192.168.x.x) if you’ll access from phone on same Wi‑Fi
	 - Your ngrok domain if you expose the app publicly
4) Copy your web app config and update `assets/firebase-config.js` values.
5) Reload `login.html` and use real phone OTP.

You’ll see “✅ Firebase Phone Auth enabled” in the browser console on success.

## Access from your phone

Option A — Same Wi‑Fi, local network
- Find your PC’s IP: `ipconfig` (Windows) or `ifconfig` (macOS/Linux).
- On your phone browser, open: `http://<PC_IP>:3000`.
- If your firewall blocks it, allow Node/HTTP for private networks.

Option B — Public tunnel using ngrok
- Install ngrok and run: `ngrok http 3000`.
- Add the ngrok domain to Firebase authorized domains.
- Open the ngrok HTTPS URL on your phone.

## Snapshot tags

We create tags to bookmark stable states. For example: `snapshot-2025-11-02`.