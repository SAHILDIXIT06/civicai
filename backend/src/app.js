import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promises as fs } from 'node:fs';
import { analyseImageWithGemini } from './gemini.js';
import { PMC_CATEGORIES, getMainCategories, getSubCategories } from './categories.js';
import { sendComplaintEmail, isEmailConfigured } from './emailService.js';
import { complaintsDB, adminsDB, departmentsDB, supabase } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use /tmp on Vercel (read-only filesystem elsewhere), local uploads dir for dev
const isVercel = process.env.VERCEL === '1';
const uploadDir = isVercel ? '/tmp/uploads' : path.join(__dirname, '..', 'uploads');

// Create upload directory (might fail on Vercel, that's ok)
try {
  await fs.mkdir(uploadDir, { recursive: true });
} catch (err) {
  if (err.code !== 'EEXIST') {
    console.warn('Warning: Could not create upload directory:', err.message);
  }
}

const app = express();
const PORT = process.env.PORT || 4000;

const allowedOriginSetting = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',').map((value) => value.trim())
  : true;

app.use(cors({ origin: allowedOriginSetting }));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Multer upload configuration
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => { cb(null, uploadDir); },
    filename: (req, file, cb) => { const ext = path.extname(file.originalname); cb(null, `temp_${Date.now()}${ext}`); }
  }),
  limits: { fileSize: 10 * 1024 * 1024 }
});

const stripDataUrlPrefix = (value) => {
  if (typeof value !== 'string') return null;
  const match = value.match(/^data:(?<mime>[^;]+);base64,(?<data>[A-Za-z0-9+/=]+)$/);
  return match?.groups?.data ? match.groups.data : value;
};

const parseLocation = (payload) => {
  if (!payload) return null;
  const latitudeValue = Number.parseFloat(payload.latitude ?? payload.lat);
  const longitudeValue = Number.parseFloat(payload.longitude ?? payload.lon);
  const accuracyValue = payload.accuracy !== undefined ? Number.parseFloat(payload.accuracy) : undefined;
  if (!Number.isFinite(latitudeValue) || !Number.isFinite(longitudeValue)) return null;
  return { latitude: latitudeValue, longitude: longitudeValue, accuracy: Number.isFinite(accuracyValue) ? accuracyValue : undefined, address: payload.address || null };
};

app.get('/api/health', (_req, res) => { 
  res.json({ 
    ok: true, 
    timestamp: new Date().toISOString(),
    database: supabase ? 'connected' : 'not configured'
  }); 
});

app.post('/api/analyze', async (req, res) => {
  try {
    const { imageBase64, location } = req.body ?? {};
    const stripped = stripDataUrlPrefix(imageBase64);
    if (!stripped) return res.status(400).json({ message: 'imageBase64 is required.' });
    const locationInfo = parseLocation(location);
    const analysis = await analyseImageWithGemini({ imageBase64: stripped, location: locationInfo });
    res.json({ categoryId: analysis.categoryId, categoryLabel: analysis.categoryLabel, description: analysis.description, confidence: analysis.confidence });
  } catch (error) {
    console.error('Gemini analysis failed:', error); 
    res.status(500).json({ message: 'Unable to analyse image automatically.' });
  }
});

app.post('/api/analyse', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image file is required for analysis.' });
    const imagePath = req.file.path; 
    let analysis;
    try { 
      analysis = await analyseImageWithGemini(imagePath); 
    } finally { 
      try { await fs.unlink(imagePath); } catch (e) { console.error('Failed to delete temporary file:', e); } 
    }
    const aiFailed = analysis.confidence === 0;
    res.json({ category: analysis.category, mainCategory: analysis.mainCategory, subCategory: analysis.subCategory, description: analysis.description, confidence: analysis.confidence, provider: 'gemini', aiFailed });
  } catch (error) {
    console.error('❌ /api/analyse error:', error); 
    return res.status(500).json({ error: 'AI analysis failed server-side. Please pick category manually.', details: error.message });
  }
});

app.get('/api/complaints', async (_req, res, next) => { 
  try {
    console.log('📋 Fetching all complaints from database...');
    const complaints = await complaintsDB.getAll();
    console.log(`✅ Retrieved ${complaints.length} complaints`);
    res.json({ complaints }); 
  } catch (e) { 
    console.error('❌ Error in GET /api/complaints:', e);
    next(e); 
  } 
});

app.post('/api/complaints', upload.single('image'), async (req, res, next) => {
  try {
    const { category, description, latitude, longitude, accuracy, address, suggestedCategory, suggestedDescription, suggestedConfidence, analysisProvider, userPhone, userId, userName, mainCategory, subCategory } = req.body;
    if (!description || description.trim() === '') return res.status(400).json({ error: 'Description is required.' });
    if (!mainCategory || !subCategory) return res.status(400).json({ error: 'Main category and sub-category are required.' });
    
    const categoryData = PMC_CATEGORIES[mainCategory];
    if (categoryData?.requiresImage && !req.file) return res.status(400).json({ error: `Image is required for ${categoryData.mainLabel} complaints.` });
    
    const lat = latitude ? Number.parseFloat(latitude) : null; 
    const lon = longitude ? Number.parseFloat(longitude) : null; 
    const acc = accuracy ? Number.parseFloat(accuracy) : null;
    const locationFromForm = lat !== null && lon !== null ? { latitude: lat, longitude: lon, accuracy: acc ?? null, address: address || null } : null;
    
    const complaintId = randomUUID(); 
    const createdAt = new Date().toISOString();
    
    let imageData = null;
    if (req.file) { 
      const ext = path.extname(req.file.originalname); 
      const fileName = `${complaintId}${ext}`; 
      await fs.rename(req.file.path, path.join(uploadDir, fileName)); 
      imageData = { fileName, originalName: req.file.originalname, mimeType: req.file.mimetype, url: `/uploads/${fileName}` }; 
    }
    
    const complaint = { 
      id: complaintId, 
      createdAt, 
      status: 'Submitted', 
      category: category || null, 
      mainCategory, 
      subCategory, 
      description, 
      location: locationFromForm, 
      userPhone: userPhone || null, 
      userId: userId || null, 
      userName: userName || null, 
      image: imageData, 
      analysis: { 
        provider: analysisProvider ?? null, 
        suggestedCategory: suggestedCategory ?? null, 
        suggestedMainCategory: null, 
        suggestedSubCategory: null, 
        suggestedDescription: suggestedDescription ?? null, 
        confidence: suggestedConfidence ? Number.parseFloat(suggestedConfidence) : null 
      },
      forwardingHistory: []
    };
    
    await complaintsDB.create(complaint);
    res.status(201).json({ complaint, message: 'Complaint filed successfully' });
  } catch (error) { next(error); }
});

app.get('/api/categories', (_req, res) => {
  try { 
    res.json({ categories: getMainCategories() }); 
  } catch (error) { 
    console.error('Error fetching categories:', error); 
    res.status(500).json({ error: 'Failed to fetch categories' }); 
  }
});

app.get('/api/categories/:mainCategoryId/subcategories', (req, res) => {
  try {
    const subCategories = getSubCategories(req.params.mainCategoryId);
    if (!subCategories || subCategories.length === 0) return res.status(404).json({ error: 'Category not found' });
    res.json({ subCategories });
  } catch (error) { 
    console.error('Error fetching sub-categories:', error); 
    res.status(500).json({ error: 'Failed to fetch sub-categories' }); 
  }
});

app.get('/api/admin-phones', async (_req, res, next) => {
  try {
    const admins = await adminsDB.getAll();
    const adminPhones = admins.map(a => a.phone);
    res.json({ adminPhones });
  } catch (error) { next(error); }
});

app.get('/api/admins', async (_req, res, next) => {
  try {
    const admins = await adminsDB.getAll();
    res.json({ admins });
  } catch (error) { next(error); }
});

app.post('/api/admins', async (req, res, next) => {
  try {
    const { name, phone, addedBy, departmentId, canAccessComplaints, canManageAdmins } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'Name and phone are required' });
    
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    if (!phoneRegex.test(phone)) return res.status(400).json({ error: 'Invalid phone number format' });
    
    const existingAdmin = await adminsDB.getByPhone(phone);
    if (existingAdmin) return res.status(400).json({ error: 'This phone number is already an administrator' });
    
    let departmentName = null;
    if (departmentId) {
      const dept = await departmentsDB.getById(departmentId);
      if (!dept) return res.status(400).json({ error: 'Invalid departmentId' });
      departmentName = dept.name;
    }
    
    const newAdmin = { 
      phone, 
      name, 
      addedAt: new Date().toISOString(), 
      addedBy: addedBy || null, 
      departmentId: departmentId || null, 
      departmentName, 
      canAccessComplaints: canAccessComplaints !== false, 
      canManageAdmins: canManageAdmins !== false 
    };
    
    await adminsDB.create(newAdmin);
    console.log(`✅ New admin added: ${name} (${phone})`);
    res.status(201).json({ message: `Administrator ${name} added successfully`, admin: newAdmin });
  } catch (error) { next(error); }
});

app.delete('/api/admins/:phone', async (req, res, next) => {
  try {
    const { phone } = req.params;
    
    const existingAdmin = await adminsDB.getByPhone(phone);
    if (!existingAdmin) return res.status(404).json({ error: 'Administrator not found' });
    
    const allAdmins = await adminsDB.getAll();
    if (allAdmins.length <= 1) return res.status(400).json({ error: 'Cannot remove the last administrator' });
    
    await adminsDB.delete(phone);
    console.log(`🗑️ Admin removed: ${phone}`);
    res.json({ message: 'Administrator removed successfully' });
  } catch (error) { next(error); }
});

app.put('/api/admins/:phone/permissions', async (req, res, next) => {
  try {
    const { phone } = req.params; 
    const { canAccessComplaints, canManageAdmins, updatedBy } = req.body;
    
    const admin = await adminsDB.getByPhone(phone);
    if (!admin) return res.status(404).json({ error: 'Administrator not found' });
    
    await adminsDB.update(phone, {
      canAccessComplaints,
      canManageAdmins,
      permissionsUpdatedAt: new Date().toISOString(),
      permissionsUpdatedBy: updatedBy || null
    });
    
    console.log(`🔐 Admin permissions updated: ${phone} by ${updatedBy || 'unknown'}`);
    res.json({ message: 'Permissions updated successfully', permissions: { canAccessComplaints, canManageAdmins } });
  } catch (error) { next(error); }
});

app.get('/api/admins/department/:departmentId', async (req, res, next) => {
  try {
    const { departmentId } = req.params;
    const allAdmins = await adminsDB.getAll();
    const admins = allAdmins.filter(a => a.departmentId === departmentId);
    res.json({ admins });
  } catch (error) { next(error); }
});

app.get('/api/complaints/assigned/:adminPhone', async (req, res, next) => {
  try {
    const { adminPhone } = req.params;
    const allComplaints = await complaintsDB.getAll();
    const assignedComplaints = allComplaints.filter(c => c.assignedTo === adminPhone);
    res.json({ complaints: assignedComplaints });
  } catch (error) { next(error); }
});

app.get('/api/admin/check', async (req, res, next) => {
  try {
    const phone = req.query.phone || req.body.phone;
    if (!phone) return res.status(400).json({ isAdmin: false, message: 'Phone number required' });
    
    const admin = await adminsDB.getByPhone(phone);
    const isAdmin = admin !== null;
    
    console.log('🔍 Admin Check Request:', phone, 'Match:', isAdmin);
    
    if (!isAdmin) {
      return res.json({ isAdmin: false, phone });
    }
    
    res.json({ 
      isAdmin, 
      phone, 
      canAccessComplaints: admin.canAccessComplaints !== false, 
      canManageAdmins: admin.canManageAdmins !== false, 
      name: admin.name || null, 
      departmentId: admin.departmentId || null, 
      departmentName: admin.departmentName || null 
    });
  } catch (error) { next(error); }
});

app.get('/api/departments', async (_req, res, next) => {
  try {
    const departments = await departmentsDB.getAll();
    res.json({ departments });
  } catch (error) { 
    console.error('Error reading departments:', error); 
    next(error); 
  }
});

app.post('/api/complaints/:id/forward', async (req, res, next) => {
  try {
    const { id } = req.params; 
    const { departmentId, adminPhone, assignedTo, assignedToName } = req.body;
    
    if (!adminPhone) return res.status(401).json({ error: 'Admin phone number required' });
    
    const admin = await adminsDB.getByPhone(adminPhone);
    if (!admin) return res.status(403).json({ error: 'Unauthorized: Admin access required' });
    
    const complaint = await complaintsDB.getById(id);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });
    
    const department = await departmentsDB.getById(departmentId);
    if (!department) return res.status(404).json({ error: 'Department not found' });
    
    let emailResult = { success: false, skipped: true, error: 'Email not configured' };
    if (isEmailConfigured()) { 
      emailResult = await sendComplaintEmail(complaint, department, adminPhone); 
    } else { 
      console.warn('⚠️ Email not configured. Forwarding without email notification.'); 
    }
    
    const adminName = admin.name || null;
    const timestamp = new Date().toISOString();
    
    const forwardingHistory = complaint.forwardingHistory || [];
    forwardingHistory.push({ 
      departmentId: department.id, 
      departmentName: department.name, 
      timestamp, 
      adminPhone, 
      adminName, 
      assignedTo: assignedTo || null, 
      assignedToName: assignedToName || null, 
      emailStatus: emailResult.success ? 'sent' : (emailResult.skipped ? 'skipped' : 'failed'), 
      error: emailResult.error || undefined, 
      messageId: emailResult.messageId || undefined 
    });
    
    const updates = {
      forwardingHistory,
      forwardedTo: department.id, 
      forwardedAt: timestamp, 
      forwardedBy: adminPhone,
      status: complaint.status === 'Submitted' ? 'In Progress' : complaint.status
    };
    
    if (assignedTo) { 
      updates.assignedTo = assignedTo; 
      updates.assignedToName = assignedToName || null; 
      updates.assignedAt = timestamp; 
    }
    
    const updatedComplaint = await complaintsDB.update(id, updates);
    
    console.log(`📧 Complaint ${id.substring(0, 8)} forwarded to ${department.name}`);
    
    let message; 
    if (emailResult.success) { 
      message = `Complaint forwarded to ${department.name} and email notification sent`; 
    } else if (emailResult.skipped) { 
      message = `Complaint forwarded to ${department.name} (email notification skipped - not configured)`; 
    } else { 
      message = `Complaint forwarded to ${department.name} (email failed: ${emailResult.error})`; 
    }
    
    res.json({ success: true, message, complaint: updatedComplaint, emailResult });
  } catch (error) { 
    console.error('Error forwarding complaint:', error); 
    next(error); 
  }
});

app.post('/api/complaints/bulk-forward', async (req, res, next) => {
  try {
    const { complaintIds, departmentId, adminPhone } = req.body;
    
    if (!Array.isArray(complaintIds) || complaintIds.length === 0) {
      return res.status(400).json({ error: 'complaintIds array is required' });
    }
    if (!departmentId) return res.status(400).json({ error: 'departmentId is required' });
    if (!adminPhone) return res.status(401).json({ error: 'Admin phone number required' });
    
    const admin = await adminsDB.getByPhone(adminPhone);
    if (!admin) return res.status(403).json({ error: 'Unauthorized: Admin access required' });
    
    const department = await departmentsDB.getById(departmentId);
    if (!department) return res.status(404).json({ error: 'Department not found' });
    
    const emailConfigured = isEmailConfigured();
    if (!emailConfigured) console.warn('⚠️ Email not configured. Bulk forwarding without email notifications.');
    
    const results = { success: [], failed: [] };
    
    for (const id of complaintIds) {
      try {
        const complaint = await complaintsDB.getById(id);
        if (!complaint) { 
          results.failed.push({ id, reason: 'Complaint not found' }); 
          continue; 
        }
        
        let emailResult = { success: false, skipped: true, error: 'Email not configured' };
        if (emailConfigured) emailResult = await sendComplaintEmail(complaint, department, adminPhone);
        
        const timestamp = new Date().toISOString();
        const forwardingHistory = complaint.forwardingHistory || [];
        forwardingHistory.push({ 
          departmentId: department.id, 
          departmentName: department.name, 
          timestamp, 
          adminPhone, 
          emailStatus: emailResult.success ? 'sent' : (emailResult.skipped ? 'skipped' : 'failed'), 
          error: emailResult.error || undefined, 
          messageId: emailResult.messageId || undefined 
        });
        
        await complaintsDB.update(id, {
          forwardingHistory,
          forwardedTo: department.id, 
          forwardedAt: timestamp, 
          forwardedBy: adminPhone,
          status: complaint.status === 'Submitted' ? 'In Progress' : complaint.status
        });
        
        if (emailResult.success) { 
          results.success.push({ id, messageId: emailResult.messageId }); 
        } else { 
          results.failed.push({ id, reason: emailResult.error }); 
        }
      } catch (error) { 
        results.failed.push({ id, reason: error.message }); 
      }
    }
    
    console.log(`📨 Bulk forward complete: ${results.success.length} succeeded, ${results.failed.length} failed`);
    res.json({ 
      message: `Forwarded ${results.success.length} of ${complaintIds.length} complaints to ${department.name}`, 
      department: department.name, 
      results 
    });
  } catch (error) { 
    console.error('Error in bulk forward:', error); 
    next(error); 
  }
});

app.patch('/api/complaints/:id/status', upload.single('proofImage'), async (req, res, next) => {
  try {
    const { id } = req.params; 
    const { status, adminPhone } = req.body;
    
    if (!adminPhone) return res.status(401).json({ error: 'Admin phone number required' });
    
    const admin = await adminsDB.getByPhone(adminPhone);
    if (!admin) return res.status(403).json({ error: 'Unauthorized: Admin access required' });
    
    const validStatuses = ['Submitted', 'In Progress', 'Appeal to Resolve', 'Resolved'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }
    
    const complaint = await complaintsDB.getById(id);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });
    
    const oldStatus = complaint.status;
    const updates = {
      status,
      statusUpdatedAt: new Date().toISOString(),
      statusUpdatedBy: adminPhone,
      statusUpdatedByName: admin.name || null
    };
    
    if (status === 'Appeal to Resolve') {
      if (req.file) { 
        updates.proofOfWork = { 
          filename: req.file.filename, 
          originalName: req.file.originalname, 
          uploadedAt: new Date().toISOString(), 
          uploadedBy: adminPhone, 
          uploadedByName: admin.name || null 
        }; 
      } else if (!complaint.proofOfWork) { 
        return res.status(400).json({ error: 'Proof of work image is required for Appeal to Resolve' }); 
      }
    }
    
    if (status === 'Resolved' && oldStatus === 'Appeal to Resolve') { 
      updates.resolvedAt = new Date().toISOString(); 
      updates.resolvedBy = adminPhone; 
      updates.resolvedByName = admin.name || null; 
    }
    
    const updatedComplaint = await complaintsDB.update(id, updates);
    
    console.log(`🔄 Complaint ${id.substring(0, 8)} status updated: ${oldStatus} → ${status}`);
    res.json({ success: true, message: `Status updated from ${oldStatus} to ${status}`, complaint: updatedComplaint });
  } catch (error) { 
    console.error('Error updating complaint status:', error); 
    next(error); 
  }
});

app.use('/uploads', express.static(uploadDir));

try {
  const projectRoot = path.resolve(__dirname, '..', '..');
  app.use(express.static(projectRoot));
  console.log(`Static frontend enabled from: ${projectRoot}`);
  console.log(`Open: http://localhost:${PORT}`);
} catch (e) { 
  console.warn('Static frontend serving disabled:', e?.message || e); 
}

app.use((error, req, res, _next) => {
  if (error?.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Upload too large. Please choose an image under ~20 MB or reduce its resolution.' });
  }
  
  // Log detailed error info
  console.error('=== API ERROR ===');
  console.error('Path:', req.method, req.path);
  console.error('Error:', error);
  console.error('Stack:', error?.stack);
  console.error('================');
  
  // Return detailed error in development, generic in production
  const isDev = process.env.NODE_ENV !== 'production';
  res.status(500).json({ 
    message: 'Unexpected server error.',
    error: isDev || true ? error.message : undefined, // Always show for now to debug
    details: isDev || true ? error.stack : undefined
  });
});

export default app;
