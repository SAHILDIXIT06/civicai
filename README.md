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

## Snapshot tags

We create tags to bookmark stable states. For example: `snapshot-2025-11-02`.