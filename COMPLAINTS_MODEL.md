# Complaints Model Code

Create file: `backend/src/models/complaints.js`

```javascript
import { query } from '../db.js';

// Get all complaints with optional filtering
export async function getAllComplaints(filters = {}) {
  let queryText = 'SELECT * FROM complaints WHERE 1=1';
  const params = [];
  let paramIndex = 1;

  if (filters.status) {
    queryText += ` AND status = $${paramIndex}`;
    params.push(filters.status);
    paramIndex++;
  }

  if (filters.category) {
    queryText += ` AND category = $${paramIndex}`;
    params.push(filters.category);
    paramIndex++;
  }

  if (filters.userPhone) {
    queryText += ` AND user_phone = $${paramIndex}`;
    params.push(filters.userPhone);
    paramIndex++;
  }

  queryText += ' ORDER BY created_at DESC';

  const result = await query(queryText, params);
  return result.rows.map(convertDbRowToComplaint);
}

// Get complaint by ID
export async function getComplaintById(id) {
  const result = await query('SELECT * FROM complaints WHERE id = $1', [id]);
  if (result.rows.length === 0) return null;
  return convertDbRowToComplaint(result.rows[0]);
}

// Create new complaint
export async function createComplaint(complaintData) {
  const {
    id,
    status,
    category,
    mainCategory,
    subCategory,
    description,
    location,
    userPhone,
    userId,
    userName,
    image,
    analysis,
    urgency,
    departmentId,
    departmentName
  } = complaintData;

  const queryText = `
    INSERT INTO complaints (
      id, status, category, main_category, sub_category, description,
      location, user_phone, user_id, user_name, image, analysis,
      urgency, department_id, department_name
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING *
  `;

  const params = [
    id,
    status || 'Pending',
    category,
    mainCategory,
    subCategory,
    description,
    JSON.stringify(location),
    userPhone,
    userId,
    userName,
    JSON.stringify(image),
    JSON.stringify(analysis),
    urgency,
    departmentId,
    departmentName
  ];

  const result = await query(queryText, params);
  return convertDbRowToComplaint(result.rows[0]);
}

// Update complaint
export async function updateComplaint(id, updates) {
  const allowedFields = [
    'status',
    'category',
    'main_category',
    'sub_category',
    'description',
    'urgency',
    'department_id',
    'department_name',
    'forwarded_at',
    'forwarded_to',
    'resolved_at',
    'resolved_by',
    'admin_notes'
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

  params.push(id);
  const queryText = `
    UPDATE complaints
    SET ${setClause.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const result = await query(queryText, params);
  if (result.rows.length === 0) return null;
  return convertDbRowToComplaint(result.rows[0]);
}

// Delete complaint
export async function deleteComplaint(id) {
  const result = await query('DELETE FROM complaints WHERE id = $1 RETURNING id', [id]);
  return result.rowCount > 0;
}

// Get complaint statistics
export async function getComplaintStats() {
  const result = await query(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'Pending') as pending,
      COUNT(*) FILTER (WHERE status = 'Forwarded') as forwarded,
      COUNT(*) FILTER (WHERE status = 'In Progress') as in_progress,
      COUNT(*) FILTER (WHERE status = 'Resolved') as resolved
    FROM complaints
  `);

  return result.rows[0];
}

// Helper function to convert database row to complaint object
function convertDbRowToComplaint(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    status: row.status,
    category: row.category,
    mainCategory: row.main_category,
    subCategory: row.sub_category,
    description: row.description,
    location: row.location,
    userPhone: row.user_phone,
    userId: row.user_id,
    userName: row.user_name,
    image: row.image,
    analysis: row.analysis,
    urgency: row.urgency,
    departmentId: row.department_id,
    departmentName: row.department_name,
    forwardedAt: row.forwarded_at,
    forwardedTo: row.forwarded_to,
    resolvedAt: row.resolved_at,
    resolvedBy: row.resolved_by,
    adminNotes: row.admin_notes,
    updatedAt: row.updated_at
  };
}
```
