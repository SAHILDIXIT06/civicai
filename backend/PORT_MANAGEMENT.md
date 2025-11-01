# Port Management Guide

## Automatic Port Cleanup

Your `package.json` now includes automatic port cleanup to prevent `EADDRINUSE` errors.

## Available Scripts

### Development Mode (with auto-cleanup)
```bash
npm run dev
```
- Automatically kills any process on port 4000 before starting
- Runs the server with nodemon for auto-restart on file changes

### Production Mode (with auto-cleanup)
```bash
npm start
```
- Automatically kills any process on port 4000 before starting
- Runs the server with Node.js

### Manual Port Cleanup
```bash
npm run clean
```
- Manually kills any process using port 4000
- Useful if you need to free the port without starting the server

## How It Works

The `predev` and `prestart` scripts automatically run `kill-port 4000` before starting the server. This ensures:

✅ No more "port already in use" errors  
✅ No need to manually kill processes  
✅ Faster development workflow  

## Manual Port Management (if needed)

### Windows (PowerShell)
```powershell
# Find process on port 4000
netstat -ano | findstr :4000

# Kill process by PID
taskkill /PID <PID> /F
```

### Linux/Mac
```bash
# Find process on port 4000
lsof -i :4000

# Kill process by PID
kill -9 <PID>
```

## Packages Installed

- **kill-port**: Cross-platform package to kill processes on specific ports
- **npm-run-all**: Utility to run multiple npm scripts (for future use)

---

**Note:** The `kill-port` package works on Windows, Linux, and macOS, making your scripts cross-platform compatible! 🎉
