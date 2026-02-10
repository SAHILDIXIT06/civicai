# Admins Model Code

Create file: `backend/src/models/admins.js`

```javascript
import { query } from '../db.js';

// Get all admins
export async function getAllAdmins() {
  const result = await query('SELECT * FROM admins WHERE is_active = true ORDER BY added_at DESC');
  return result.rows.map(convertDbRowToAdmin);
}

// Get admin by phone
export async function getAdminByPhone(phone) {
  const result = await query('SELECT * FROM admins WHERE phone = $1 AND is_active = true', [phone]);
  if (result.rows.length === 0) return null;
  return convertDbRowToAdmin(result.rows[0]);
}

// Check if phone is admin
export async function isAdmin(phone) {
  const result = await query('SELECT COUNT(*) as count FROM admins WHERE phone = $1 AND is_active = true', [phone]);
  return parseInt(result.rows[0].count) > 0;
}

// Create new admin
export async function createAdmin(adminData) {
  const {
    phone,
    name,
    addedBy,
    departmentId,
    departmentName,
    canAccessComplaints,
    canManageAdmins
  } = adminData;

  const queryText = `
    INSERT INTO admins (
      phone, name, added_by, department_id, department_name,
      can_access_complaints, can_manage_admins
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;

  const params = [
    phone,
    name,
    addedBy,
    departmentId,
    departmentName,
    canAccessComplaints !== false,
    canManageAdmins || false
  ];

  const result = await query(queryText, params);
  return convertDbRowToAdmin(result.rows[0]);
}

// Update admin
export async function updateAdmin(phone, updates) {
  const allowedFields = [
    'name',
    'department_id',
    'department_name',
    'can_access_complaints',
    'can_manage_admins',
    'permissions_updated_by'
  ];

  const setClause = [];
  const params = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(updates)) {
    const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (allowedFields.includes(dbKey)) {
      setClause.push(`${dbKey} = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }
  }

  if (setClause.length === 0) {
    throw new Error('No valid fields to update');
  }

  // Always update permissions_updated_at when permissions change
  if (updates.canAccessComplaints !== undefined || updates.canManageAdmins !== undefined) {
    setClause.push(`permissions_updated_at = NOW()`);
  }

  params.push(phone);
  const queryText = `
    UPDATE admins
    SET ${setClause.join(', ')}
    WHERE phone = $${paramIndex}
    RETURNING *
  `;

  const result = await query(queryText, params);
  if (result.rows.length === 0) return null;
  return convertDbRowToAdmin(result.rows[0]);
}

// Delete (deactivate) admin
export async function deleteAdmin(phone) {
  const result = await query(
    'UPDATE admins SET is_active = false WHERE phone = $1 RETURNING phone',
    [phone]
  );
  return result.rowCount > 0;
}

// Update last login
export async function updateLastLogin(phone) {
  await query('UPDATE admins SET last_login = NOW() WHERE phone = $1', [phone]);
}

// Get admin list (legacy format for compatibility)
export async function getAdminPhones() {
  const result = await query('SELECT phone FROM admins WHERE is_active = true');
  return result.rows.map(row => row.phone);
}

// Helper function to convert database row to admin object
function convertDbRowToAdmin(row) {
  return {
    phone: row.phone,
    name: row.name,
    addedAt: row.added_at,
    addedBy: row.added_by,
    departmentId: row.department_id,
    departmentName: row.department_name,
    canAccessComplaints: row.can_access_complaints,
    canManageAdmins: row.can_manage_admins,
    permissionsUpdatedAt: row.permissions_updated_at,
    permissionsUpdatedBy: row.permissions_updated_by,
    lastLogin: row.last_login,
    isActive: row.is_active
  };
}
```
