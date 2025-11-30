# Admin Portal Guide

## Overview
The admin system has been enhanced with a new two-tier navigation structure:

1. **Admin Portal Landing Page** (`admin-portal.html`) - Main hub with two options
2. **Complaint Details** (`admin.html`) - Existing complaint management interface
3. **Manage Admins** (`manage-admins.html`) - NEW admin user management interface

## Features

### Admin Portal Landing Page
- **Location**: `/admin-portal.html`
- **Purpose**: Central hub for admin operations
- **Features**:
  - Two navigation cards:
    - 📋 Complaint Details - View and manage complaints
    - 👥 Manage Admins - Add/remove administrators
  - Shows currently logged-in admin phone number
  - Admin access verification

### Manage Admins Page
- **Location**: `/manage-admins.html`
- **Purpose**: Add and remove system administrators
- **Features**:
  - **Add New Admin**: Form to add admin with name and mobile number
  - **Admin List Table**: Shows all current admins with:
    - Name
    - Mobile Number
    - Date Added
    - Remove button (cannot remove yourself)
  - **Validation**: 
    - Phone number format validation (10-15 digits)
    - Prevents duplicate admin phones
    - Prevents removing the last admin
    - Cannot remove yourself
  - **Real-time Updates**: List refreshes after add/remove operations

### Backend API Endpoints

#### GET `/api/admins`
- Returns list of all administrators with details (name, phone, addedAt)
- Auto-migrates old format (phone-only) to new format with names

#### POST `/api/admins`
- Add new administrator
- **Body**: `{ name: string, phone: string, addedBy?: string }`
- **Validation**: Phone format, duplicate check
- **Returns**: Created admin object

#### DELETE `/api/admins/:phone`
- Remove administrator by phone number
- **Body**: `{ removedBy?: string }`
- **Protections**: 
  - Cannot remove last admin
  - Returns 404 if admin not found

### Data Structure

#### admin_phones.json
```json
{
  "adminPhones": ["+917058346137", "+919876543210"],
  "admins": [
    {
      "phone": "+917058346137",
      "name": "Primary Admin",
      "addedAt": "2025-11-30T10:30:00.000Z",
      "addedBy": "+917058346137"
    }
  ]
}
```

## User Flow

1. **Admin clicks "Admin" button** → Redirected to `admin-portal.html`
2. **Admin Portal shows two options**:
   - Click "Complaint Details" → Navigate to `admin.html` (existing complaints dashboard)
   - Click "Manage Admins" → Navigate to `manage-admins.html` (new admin management)

## Navigation Updates

- `index.html` → Admin link now points to `admin-portal.html`
- All admin access checks remain in place
- Theme toggle available on all admin pages

## Security Features

- Admin verification required on all admin pages
- Cannot remove yourself from admin list
- Cannot remove the last administrator
- Phone number validation
- Duplicate prevention

## Styling

- Consistent with existing Civic AI Tech design system
- Responsive layout for mobile/tablet/desktop
- Dark mode support via existing theme system
- Hover effects and smooth transitions

## Usage Instructions

### Adding a New Admin
1. Navigate to Admin Portal → Manage Admins
2. Fill in:
   - Name: Admin's full name
   - Mobile Number: Format +919876543210 (10-15 digits)
3. Click "Add Admin"
4. Success message appears and list updates

### Removing an Admin
1. Navigate to Admin Portal → Manage Admins
2. Find admin in the list
3. Click "🗑️ Remove" button
4. Confirm deletion in popup
5. Success message appears and list updates

**Note**: You cannot remove yourself (button will show 🔒 and be disabled)

## Testing

To test the admin portal:

1. **Login as admin** with phone number from `admin_phones.json`
2. **Click "Admin"** in navigation → Should go to Admin Portal
3. **Test Complaint Details** → Click card → Should show existing complaints dashboard
4. **Test Manage Admins**:
   - Click "Manage Admins" card
   - Add a new admin with name + phone
   - Verify admin appears in list
   - Try to remove an admin (not yourself)
   - Verify admin is removed from list

## Files Created/Modified

### New Files:
- `admin-portal.html` - Admin portal landing page
- `manage-admins.html` - Admin management UI
- `assets/manage-admins.js` - Admin management logic
- `ADMIN_PORTAL_GUIDE.md` - This documentation

### Modified Files:
- `backend/src/server.js` - Added admin management endpoints
- `index.html` - Updated admin link to point to admin-portal.html
- `backend/data/admin_phones.json` - Enhanced with admin details structure

### Unchanged (Still Works):
- `admin.html` - Complaints dashboard (accessed via portal)
- `assets/admin.js` - Complaints management logic
- All complaint-related features and filters
