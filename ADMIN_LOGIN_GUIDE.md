# 🔐 Admin Login - Step by Step Guide

## ✅ CORRECT Way to Login as Admin

### Step 1: Select "Admin Login" Role FIRST
**IMPORTANT:** You MUST select the Admin role BEFORE entering your phone number!

```
┌─────────────────────────────────────┐
│  👤 Citizen Login                   │  ← Don't select this
│  File and track civic complaints    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  🛡️ Admin Login          ✓ SELECTED │  ← Select THIS!
│  Manage and review all complaints   │
└─────────────────────────────────────┘
```

### Step 2: Enter Phone Number
**Format:** `7058346137` (without +91)

The system will automatically add +91 to make: `+917058346137`

### Step 3: Click "Send Verification Code"

### Step 4: Enter the 6-digit code shown on screen

### Step 5: Click "Verify & Login"

**Result:** You'll be redirected to Admin Dashboard ✅

---

## ❌ Common Mistakes

### Mistake 1: Selecting Citizen Role
```
✗ Selected: 👤 Citizen Login
✗ Entered: 7058346137
✗ Result: Access Denied (even if you're an admin)
```

**Why?** The role is locked in when you click "Send Verification Code"

### Mistake 2: Wrong Phone Format
```
✗ Entered: +917058346137 (with +91)
✗ System creates: +91+917058346137 (double prefix!)
✗ Result: Access Denied
```

**Correct Format:** Just enter `7058346137`

---

## 📋 Admin Phone Numbers

Current admins in `admin_phones.json`:
- `+917058346137` ✅
- `+919876543210` ✅

**To add more admins:** Edit `backend/data/admin_phones.json`

---

## 🧪 Testing Admin Login

### Test 1: Admin Login
1. ✅ Select "🛡️ Admin Login"
2. ✅ Enter: `7058346137`
3. ✅ Click "Send Verification Code"
4. ✅ Enter the code shown (e.g., `123456`)
5. ✅ Click "Verify & Login"
6. ✅ Should redirect to `admin.html`

### Test 2: Citizen Login (for comparison)
1. ✅ Select "👤 Citizen Login"
2. ✅ Enter: `9011341175`
3. ✅ Click "Send Verification Code"
4. ✅ Enter the code
5. ✅ Click "Verify & Login"
6. ✅ Should redirect to `dashboard.html`

---

## 🔍 Debugging

### Check Current Login Info:

Open browser console (F12) and paste:

```javascript
console.log('Auth Token:', localStorage.getItem('authToken'));
console.log('User Phone:', localStorage.getItem('userPhone'));
console.log('User Role:', localStorage.getItem('userRole'));
```

**Expected for Admin:**
```
Auth Token: (long string)
User Phone: +917058346137
User Role: admin
```

### Clear Login and Try Again:

```javascript
localStorage.clear();
window.location.reload();
```

---

## 💡 Quick Fix

If you already logged in as Citizen by mistake:

1. **Logout** (click Logout button)
2. **Or clear storage:**
   - Press F12
   - Go to Application → Local Storage
   - Click "Clear All"
3. **Return to login page**
4. **Select "Admin Login" THIS TIME**
5. **Enter phone and complete login**

---

## 🎯 Visual Flow

### Citizen Login Flow:
```
Select 👤 Citizen → Enter Phone → Get Code → Verify 
     ↓
Redirect to dashboard.html
```

### Admin Login Flow:
```
Select 🛡️ Admin → Enter Phone → Get Code → Verify → Check Admin List
     ↓                                              ↓
Redirect to admin.html                    Is +917058346137 in list? YES ✅
```

### Wrong Flow (Access Denied):
```
Select 👤 Citizen → Enter 7058346137 → Verify
     ↓
Try to access admin.html → Access Denied ❌
(Role was set to "citizen" at login time)
```

---

## 🚀 Try It Now!

1. Open: `http://localhost:3000/login.html`
2. **Click on "🛡️ Admin Login" card** (should highlight in blue)
3. Enter: `7058346137`
4. Click "Send Verification Code"
5. Copy the code from the green success message
6. Paste it in "Verification Code" field
7. Click "Verify & Login"
8. **You should see the Admin Dashboard!** 🎉

---

**Key Takeaway:** Always select your role BEFORE entering phone number! 🔑
