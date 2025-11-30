# 🚀 Quick Start Guide - Complaint Forwarding Feature

## ✅ Implementation Complete!

The admin complaint forwarding system has been successfully implemented with:
- ✅ Email notifications to departments
- ✅ Bulk forwarding operations
- ✅ Category-based filtering
- ✅ Complete audit trail
- ✅ Status management
- ✅ Index numbering

## 🎯 Next Steps to Enable Email Forwarding

### 1. Configure Email Settings

**Option A: Using Gmail (Recommended for Testing)**

1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password:
   - Visit: https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the 16-character password

3. Create `.env` file in `backend/` folder:
   ```bash
   cd backend
   cp .env.example .env
   ```

4. Edit `backend/.env` and add:
   ```env
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-password-here
   EMAIL_FROM=civic-ai@pmc.gov.in
   ```

**Option B: Using SendGrid**

1. Sign up at https://sendgrid.com
2. Generate API key
3. Update `backend/.env`:
   ```env
   EMAIL_HOST=smtp.sendgrid.net
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=apikey
   EMAIL_PASSWORD=your-sendgrid-api-key
   EMAIL_FROM=noreply@yourdomain.com
   ```

### 2. Update Department Email Addresses

Edit `backend/data/departments.json` and replace placeholder emails with real PMC department addresses:

```json
{
  "id": "drainage",
  "name": "Drainage Department",
  "primaryEmail": "drainage@pmc.gov.in",  // ← Update this
  "ccEmails": ["supervisor@pmc.gov.in"], // ← Optional CC recipients
  "contactPerson": "John Doe",
  "phone": "+91-20-1234-5678"
}
```

Do this for all 33 departments in the file.

### 3. Restart Backend Server

```bash
cd backend
npm run dev
```

### 4. Test the Feature

1. **Access Admin Dashboard:**
   - Open browser: http://localhost:4000/admin.html
   - Login with admin phone number

2. **Filter Complaints (Optional):**
   - Use "Main Category" dropdown
   - Select specific "Sub-Category"

3. **Forward Single Complaint:**
   - Click ⋮ (actions menu) on any complaint
   - Select "📧 Forward"
   - Choose department from dropdown
   - Click "Forward Complaint"
   - ✅ Email will be sent with complaint details + image

4. **Bulk Forward:**
   - Check boxes next to multiple complaints
   - Click "Forward Selected (N)"
   - Enter department ID
   - Confirm
   - ✅ All selected complaints forwarded at once

5. **Change Status:**
   - Click ⋮ → "🔄 Change Status"
   - Select new status (Submitted/In Progress/Resolved)
   - Click "Update Status"

6. **View Forwarding History:**
   - Click ⋮ → "📜 View History"
   - See complete audit trail of all forwards

## 📧 What Gets Sent in Email?

Each forwarded complaint email includes:

✅ Professional HTML template with PMC branding  
✅ Complaint ID, category, status, description  
✅ Complainant phone and name  
✅ Location with Google Maps link  
✅ Complaint image as attachment  
✅ Forwarding admin details  
✅ Department contact information  

## 🔧 Troubleshooting

### "Email service not configured" error?
- Check that `backend/.env` file exists
- Verify `EMAIL_USER` and `EMAIL_PASSWORD` are set
- Restart backend server after editing `.env`

### Gmail not working?
- Make sure 2FA is enabled
- Use App Password, not regular password
- Check "Less secure app access" is NOT needed (App Passwords work without it)

### Email sent but not received?
- Check spam/junk folder
- Verify department email addresses in `departments.json`
- Check backend console logs for message ID

### Filters not populating?
- Backend must be running on port 4000
- Check browser console for errors
- Verify `/api/categories` endpoint is accessible

## 📊 Current Configuration

**Admin Phones (can forward complaints):**
- Configured in: `backend/data/admin_phones.json`
- Current admins: +917058346137, +919876543210

**Departments:**
- Total: 33 PMC departments configured
- File: `backend/data/departments.json`
- Status: Ready for email customization

**Features Enabled:**
- ✅ Single complaint forwarding
- ✅ Bulk forwarding (multiple at once)
- ✅ Email with attachments
- ✅ Category filtering
- ✅ Status management
- ✅ Audit trail tracking
- ✅ Index numbering

## 🎉 You're Ready!

Once email is configured, admins can:
1. Filter complaints by category
2. Forward to appropriate departments via email
3. Track all forwarding history
4. Update complaint status
5. Perform bulk operations

**Server is running at:** http://localhost:4000  
**Admin Dashboard:** http://localhost:4000/admin.html

---

For detailed documentation, see: `FORWARDING_IMPLEMENTATION.md`
