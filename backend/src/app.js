import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promises as fs } from 'node:fs';
import { analyseImageWithGemini } from './gemini.js';
import { PMC_CATEGORIES, getMainCategories, getSubCategories, mapAIToPMC } from './categories.js';
import { sendComplaintEmail, isEmailConfigured } from './emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '..', 'uploads');
const dataDir = path.join(__dirname, '..', 'data');
const dataFile = path.join(dataDir, 'complaints.json');

await fs.mkdir(uploadDir, { recursive: true });
await fs.mkdir(dataDir, { recursive: true });

try {
  await fs.access(dataFile);
} catch {
  await fs.writeFile(dataFile, JSON.stringify({ complaints: [] }, null, 2), 'utf8');
}

const app = express();
const PORT = process.env.PORT || 4000; // retained for log messages only

const allowedOriginSetting = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',').map((value) => value.trim())
  : true; // reflect request origin by default for local demos

app.use(cors({ origin: allowedOriginSetting }));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

const uploadsDir = path.join(__dirname, '..', 'uploads');

// Disk storage (ephemeral on Vercel; should replace with blob storage later)
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => { cb(null, uploadsDir); },
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

const readComplaints = async () => {
  const raw = await fs.readFile(dataFile, 'utf8');
  return JSON.parse(raw).complaints ?? [];
};
const writeComplaints = async (complaints) => {
  await fs.writeFile(dataFile, JSON.stringify({ complaints }, null, 2), 'utf8');
};

app.get('/api/health', (_req, res) => { res.json({ ok: true, timestamp: new Date().toISOString() }); });

app.post('/api/analyze', async (req, res) => {
  try {
    const { imageBase64, location } = req.body ?? {};
    const stripped = stripDataUrlPrefix(imageBase64);
    if (!stripped) return res.status(400).json({ message: 'imageBase64 is required.' });
    const locationInfo = parseLocation(location);
    const analysis = await analyseImageWithGemini({ imageBase64: stripped, location: locationInfo });
    res.json({ categoryId: analysis.categoryId, categoryLabel: analysis.categoryLabel, description: analysis.description, confidence: analysis.confidence });
  } catch (error) {
    console.error('Gemini analysis failed:', error); res.status(500).json({ message: 'Unable to analyse image automatically.' });
  }
});

app.post('/api/analyse', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image file is required for analysis.' });
    const imagePath = req.file.path; let analysis;
    try { analysis = await analyseImageWithGemini(imagePath); } finally { try { await fs.unlink(imagePath); } catch (e) { console.error('Failed to delete temporary file:', e); } }
    const aiFailed = analysis.confidence === 0;
    res.json({ category: analysis.category, mainCategory: analysis.mainCategory, subCategory: analysis.subCategory, description: analysis.description, confidence: analysis.confidence, provider: 'gemini', aiFailed });
  } catch (error) {
    console.error('❌ /api/analyse error:', error); return res.status(500).json({ error: 'AI analysis failed server-side. Please pick category manually.', details: error.message });
  }
});

app.get('/api/complaints', async (_req, res, next) => { try { res.json({ complaints: await readComplaints() }); } catch (e) { next(e); } });

app.post('/api/complaints', upload.single('image'), async (req, res, next) => {
  try {
    const { category, description, latitude, longitude, accuracy, address, suggestedCategory, suggestedDescription, suggestedConfidence, analysisProvider, userPhone, userId, userName, mainCategory, subCategory } = req.body;
    if (!description || description.trim() === '') return res.status(400).json({ error: 'Description is required.' });
    if (!mainCategory || !subCategory) return res.status(400).json({ error: 'Main category and sub-category are required.' });
    const categoryData = PMC_CATEGORIES[mainCategory];
    if (categoryData?.requiresImage && !req.file) return res.status(400).json({ error: `Image is required for ${categoryData.mainLabel} complaints.` });
    const lat = latitude ? Number.parseFloat(latitude) : null; const lon = longitude ? Number.parseFloat(longitude) : null; const acc = accuracy ? Number.parseFloat(accuracy) : null;
    const locationFromForm = lat !== null && lon !== null ? { latitude: lat, longitude: lon, accuracy: acc ?? null, address: address || null } : null;
    const complaintId = randomUUID(); const createdAt = new Date().toISOString();
    let imageData = null;
    if (req.file) { const ext = path.extname(req.file.originalname); const fileName = `${complaintId}${ext}`; await fs.rename(req.file.path, path.join(uploadsDir, fileName)); imageData = { fileName, originalName: req.file.originalname, mimeType: req.file.mimetype, url: `/uploads/${fileName}` }; }
    const complaint = { id: complaintId, createdAt, status: 'Submitted', category: category || null, mainCategory, subCategory, description, location: locationFromForm, userPhone: userPhone || null, userId: userId || null, userName: userName || null, image: imageData, analysis: { provider: analysisProvider ?? null, suggestedCategory: suggestedCategory ?? null, suggestedMainCategory: null, suggestedSubCategory: null, suggestedDescription: suggestedDescription ?? null, confidence: suggestedConfidence ? Number.parseFloat(suggestedConfidence) : null } };
    let complaintsData = { complaints: [] }; try { const raw = await fs.readFile(dataFile, 'utf8'); complaintsData = JSON.parse(raw); } catch {}
    complaintsData.complaints.unshift(complaint); await fs.writeFile(dataFile, JSON.stringify(complaintsData, null, 2), 'utf8');
    res.status(201).json({ complaint, message: 'Complaint filed successfully' });
  } catch (error) { next(error); }
});

app.get('/api/categories', (_req, res) => {
  try { res.json({ categories: getMainCategories() }); } catch (error) { console.error('Error fetching categories:', error); res.status(500).json({ error: 'Failed to fetch categories' }); }
});

app.get('/api/categories/:mainCategoryId/subcategories', (req, res) => {
  try {
    const subCategories = getSubCategories(req.params.mainCategoryId);
    if (!subCategories || subCategories.length === 0) return res.status(404).json({ error: 'Category not found' });
    res.json({ subCategories });
  } catch (error) { console.error('Error fetching sub-categories:', error); res.status(500).json({ error: 'Failed to fetch sub-categories' }); }
});

app.get('/api/admin-phones', async (_req, res, next) => {
  try {
    const adminPhonesFile = path.join(dataDir, 'admin_phones.json');
    try { await fs.access(adminPhonesFile); } catch { await fs.writeFile(adminPhonesFile, JSON.stringify({ adminPhones: ['+917058346137', '+919876543210'] }, null, 2), 'utf8'); }
    const raw = await fs.readFile(adminPhonesFile, 'utf8'); res.json(JSON.parse(raw));
  } catch (error) { next(error); }
});

app.get('/api/admins', async (_req, res, next) => {
  try {
    const adminPhonesFile = path.join(dataDir, 'admin_phones.json');
    try { await fs.access(adminPhonesFile); } catch { await fs.writeFile(adminPhonesFile, JSON.stringify({ adminPhones: ['+917058346137', '+919876543210'], admins: [{ phone: '+917058346137', name: 'Primary Admin', addedAt: new Date().toISOString() }, { phone: '+919876543210', name: 'Secondary Admin', addedAt: new Date().toISOString() }] }, null, 2), 'utf8'); }
    const raw = await fs.readFile(adminPhonesFile, 'utf8'); const data = JSON.parse(raw);
    if (!data.admins && data.adminPhones) { data.admins = data.adminPhones.map(phone => ({ phone, name: 'Admin', addedAt: new Date().toISOString(), departmentId: null, departmentName: null })); await fs.writeFile(adminPhonesFile, JSON.stringify(data, null, 2), 'utf8'); }
    res.json({ admins: data.admins || [] });
  } catch (error) { next(error); }
});

app.post('/api/admins', async (req, res, next) => {
  try {
    const { name, phone, addedBy, departmentId, canAccessComplaints, canManageAdmins } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'Name and phone are required' });
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    if (!phoneRegex.test(phone)) return res.status(400).json({ error: 'Invalid phone number format' });
    const adminPhonesFile = path.join(dataDir, 'admin_phones.json');
    const raw = await fs.readFile(adminPhonesFile, 'utf8'); const data = JSON.parse(raw);
    if (!data.admins) data.admins = []; if (!data.adminPhones) data.adminPhones = [];
    if (data.adminPhones.includes(phone)) return res.status(400).json({ error: 'This phone number is already an administrator' });
    let departmentName = null;
    if (departmentId) {
      try {
        const departmentsFile = path.join(dataDir, 'departments.json');
        const departmentsData = JSON.parse(await fs.readFile(departmentsFile, 'utf8'));
        const dept = departmentsData.departments.find(d => d.id === departmentId);
        if (!dept) return res.status(400).json({ error: 'Invalid departmentId' });
        departmentName = dept.name;
      } catch (e) { console.error('Failed to resolve department:', e); return res.status(500).json({ error: 'Failed to resolve department' }); }
    }
    const newAdmin = { phone, name, addedAt: new Date().toISOString(), addedBy: addedBy || null, departmentId: departmentId || null, departmentName, canAccessComplaints: canAccessComplaints !== false, canManageAdmins: canManageAdmins !== false };
    data.admins.push(newAdmin); data.adminPhones.push(phone);
    await fs.writeFile(adminPhonesFile, JSON.stringify(data, null, 2), 'utf8');
    console.log(`✅ New admin added: ${name} (${phone})`);
    res.status(201).json({ message: `Administrator ${name} added successfully`, admin: newAdmin });
  } catch (error) { next(error); }
});

app.delete('/api/admins/:phone', async (req, res, next) => {
  try {
    const { phone } = req.params; const { removedBy } = req.body;
    const adminPhonesFile = path.join(dataDir, 'admin_phones.json');
    const raw = await fs.readFile(adminPhonesFile, 'utf8'); const data = JSON.parse(raw);
    if (!data.adminPhones || !data.adminPhones.includes(phone)) return res.status(404).json({ error: 'Administrator not found' });
    if (data.adminPhones.length <= 1) return res.status(400).json({ error: 'Cannot remove the last administrator' });
    data.adminPhones = data.adminPhones.filter(p => p !== phone);
    if (data.admins) data.admins = data.admins.filter(a => a.phone !== phone);
    await fs.writeFile(adminPhonesFile, JSON.stringify(data, null, 2), 'utf8');
    console.log(`🗑️ Admin removed: ${phone} by ${removedBy || 'unknown'}`);
    res.json({ message: 'Administrator removed successfully' });
  } catch (error) { next(error); }
});

app.put('/api/admins/:phone/permissions', async (req, res, next) => {
  try {
    const { phone } = req.params; const { canAccessComplaints, canManageAdmins, updatedBy } = req.body;
    const adminPhonesFile = path.join(dataDir, 'admin_phones.json');
    const raw = await fs.readFile(adminPhonesFile, 'utf8'); const data = JSON.parse(raw);
    if (!data.adminPhones || !data.adminPhones.includes(phone)) return res.status(404).json({ error: 'Administrator not found' });
    if (data.admins) {
      const adminIndex = data.admins.findIndex(a => a.phone === phone);
      if (adminIndex !== -1) { data.admins[adminIndex].canAccessComplaints = canAccessComplaints; data.admins[adminIndex].canManageAdmins = canManageAdmins; data.admins[adminIndex].permissionsUpdatedAt = new Date().toISOString(); data.admins[adminIndex].permissionsUpdatedBy = updatedBy || null; }
    }
    await fs.writeFile(adminPhonesFile, JSON.stringify(data, null, 2), 'utf8');
    console.log(`🔐 Admin permissions updated: ${phone} by ${updatedBy || 'unknown'}`);
    res.json({ message: 'Permissions updated successfully', permissions: { canAccessComplaints, canManageAdmins } });
  } catch (error) { next(error); }
});

app.get('/api/admins/department/:departmentId', async (req, res, next) => {
  try {
    const { departmentId } = req.params;
    const adminPhonesFile = path.join(dataDir, 'admin_phones.json');
    const raw = await fs.readFile(adminPhonesFile, 'utf8'); const data = JSON.parse(raw);
    const admins = (data.admins || []).filter(a => a.departmentId === departmentId);
    res.json({ admins });
  } catch (error) { next(error); }
});

app.get('/api/complaints/assigned/:adminPhone', async (req, res, next) => {
  try {
    const { adminPhone } = req.params;
    const complaints = await readComplaints();
    const assignedComplaints = complaints.filter(c => c.assignedTo === adminPhone);
    res.json({ complaints: assignedComplaints });
  } catch (error) { next(error); }
});

app.get('/api/admin/check', async (req, res, next) => {
  try {
    const phone = req.query.phone || req.body.phone;
    if (!phone) return res.status(400).json({ isAdmin: false, message: 'Phone number required' });
    const adminPhonesFile = path.join(dataDir, 'admin_phones.json');
    const raw = await fs.readFile(adminPhonesFile, 'utf8'); const data = JSON.parse(raw);
    console.log('🔍 Admin Check Request:', phone, 'Match:', data.adminPhones.includes(phone));
    const isAdmin = data.adminPhones.includes(phone);
    const adminDetails = data.admins?.find(a => a.phone === phone) || {};
    res.json({ isAdmin, phone, canAccessComplaints: adminDetails.canAccessComplaints !== false, canManageAdmins: adminDetails.canManageAdmins !== false, name: adminDetails.name || null, departmentId: adminDetails.departmentId || null, departmentName: adminDetails.departmentName || null });
  } catch (error) { next(error); }
});

app.get('/api/departments', async (_req, res, next) => {
  try {
    const departmentsFile = path.join(dataDir, 'departments.json');
    const raw = await fs.readFile(departmentsFile, 'utf8'); res.json(JSON.parse(raw));
  } catch (error) { console.error('Error reading departments:', error); next(error); }
});

app.post('/api/complaints/:id/forward', async (req, res, next) => {
  try {
    const { id } = req.params; const { departmentId, adminPhone, assignedTo, assignedToName } = req.body;
    if (!adminPhone) return res.status(401).json({ error: 'Admin phone number required' });
    const adminPhonesFile = path.join(dataDir, 'admin_phones.json');
    const adminData = JSON.parse(await fs.readFile(adminPhonesFile, 'utf8'));
    if (!adminData.adminPhones.includes(adminPhone)) return res.status(403).json({ error: 'Unauthorized: Admin access required' });
    const complaints = await readComplaints(); const complaint = complaints.find(c => c.id === id);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });
    const departmentsFile = path.join(dataDir, 'departments.json');
    const departmentsData = JSON.parse(await fs.readFile(departmentsFile, 'utf8'));
    const department = departmentsData.departments.find(d => d.id === departmentId);
    if (!department) return res.status(404).json({ error: 'Department not found' });
    let emailResult = { success: false, skipped: true, error: 'Email not configured' };
    if (isEmailConfigured()) { emailResult = await sendComplaintEmail(complaint, department, adminPhone); } else { console.warn('⚠️ Email not configured. Forwarding without email notification.'); }
    const forwardingAdmin = adminData.admins?.find(a => a.phone === adminPhone); const adminName = forwardingAdmin?.name || null;
    const timestamp = new Date().toISOString();
    if (!complaint.forwardingHistory) complaint.forwardingHistory = [];
    complaint.forwardingHistory.push({ departmentId: department.id, departmentName: department.name, timestamp, adminPhone, adminName, assignedTo: assignedTo || null, assignedToName: assignedToName || null, emailStatus: emailResult.success ? 'sent' : (emailResult.skipped ? 'skipped' : 'failed'), error: emailResult.error || undefined, messageId: emailResult.messageId || undefined });
    complaint.forwardedTo = department.id; complaint.forwardedAt = timestamp; complaint.forwardedBy = adminPhone;
    if (assignedTo) { complaint.assignedTo = assignedTo; complaint.assignedToName = assignedToName || null; complaint.assignedAt = timestamp; }
    if (complaint.status === 'Submitted') complaint.status = 'In Progress';
    await writeComplaints(complaints);
    console.log(`📧 Complaint ${id.substring(0, 8)} forwarded to ${department.name}`);
    let message; if (emailResult.success) { message = `Complaint forwarded to ${department.name} and email notification sent`; } else if (emailResult.skipped) { message = `Complaint forwarded to ${department.name} (email notification skipped - not configured)`; } else { message = `Complaint forwarded to ${department.name} (email failed: ${emailResult.error})`; }
    res.json({ success: true, message, complaint, emailResult });
  } catch (error) { console.error('Error forwarding complaint:', error); next(error); }
});

app.post('/api/complaints/bulk-forward', async (req, res, next) => {
  try {
    const { complaintIds, departmentId, adminPhone } = req.body;
    if (!Array.isArray(complaintIds) || complaintIds.length === 0) return res.status(400).json({ error: 'complaintIds array is required' });
    if (!departmentId) return res.status(400).json({ error: 'departmentId is required' });
    if (!adminPhone) return res.status(401).json({ error: 'Admin phone number required' });
    const adminPhonesFile = path.join(dataDir, 'admin_phones.json');
    const adminData = JSON.parse(await fs.readFile(adminPhonesFile, 'utf8'));
    if (!adminData.adminPhones.includes(adminPhone)) return res.status(403).json({ error: 'Unauthorized: Admin access required' });
    const departmentsFile = path.join(dataDir, 'departments.json');
    const departmentsData = JSON.parse(await fs.readFile(departmentsFile, 'utf8'));
    const department = departmentsData.departments.find(d => d.id === departmentId);
    if (!department) return res.status(404).json({ error: 'Department not found' });
    const emailConfigured = isEmailConfigured();
    if (!emailConfigured) console.warn('⚠️ Email not configured. Bulk forwarding without email notifications.');
    const complaints = await readComplaints(); const results = { success: [], failed: [] };
    for (const id of complaintIds) {
      const complaint = complaints.find(c => c.id === id);
      if (!complaint) { results.failed.push({ id, reason: 'Complaint not found' }); continue; }
      try {
        let emailResult = { success: false, skipped: true, error: 'Email not configured' };
        if (emailConfigured) emailResult = await sendComplaintEmail(complaint, department, adminPhone);
        const timestamp = new Date().toISOString();
        if (!complaint.forwardingHistory) complaint.forwardingHistory = [];
        complaint.forwardingHistory.push({ departmentId: department.id, departmentName: department.name, timestamp, adminPhone, emailStatus: emailResult.success ? 'sent' : (emailResult.skipped ? 'skipped' : 'failed'), error: emailResult.error || undefined, messageId: emailResult.messageId || undefined });
        complaint.forwardedTo = department.id; complaint.forwardedAt = timestamp; complaint.forwardedBy = adminPhone;
        if (complaint.status === 'Submitted') complaint.status = 'In Progress';
        if (emailResult.success) { results.success.push({ id, messageId: emailResult.messageId }); } else { results.failed.push({ id, reason: emailResult.error }); }
      } catch (error) { results.failed.push({ id, reason: error.message }); }
    }
    await writeComplaints(complaints);
    console.log(`📨 Bulk forward complete: ${results.success.length} succeeded, ${results.failed.length} failed`);
    res.json({ message: `Forwarded ${results.success.length} of ${complaintIds.length} complaints to ${department.name}`, department: department.name, results });
  } catch (error) { console.error('Error in bulk forward:', error); next(error); }
});

app.patch('/api/complaints/:id/status', upload.single('proofImage'), async (req, res, next) => {
  try {
    const { id } = req.params; const { status, adminPhone } = req.body;
    if (!adminPhone) return res.status(401).json({ error: 'Admin phone number required' });
    const adminPhonesFile = path.join(dataDir, 'admin_phones.json');
    const adminData = JSON.parse(await fs.readFile(adminPhonesFile, 'utf8'));
    if (!adminData.adminPhones.includes(adminPhone)) return res.status(403).json({ error: 'Unauthorized: Admin access required' });
    const validStatuses = ['Submitted', 'In Progress', 'Appeal to Resolve', 'Resolved'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    const complaints = await readComplaints(); const complaint = complaints.find(c => c.id === id);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });
    const oldStatus = complaint.status;
    complaint.status = status; complaint.statusUpdatedAt = new Date().toISOString(); complaint.statusUpdatedBy = adminPhone;
    const updatingAdmin = adminData.admins?.find(a => a.phone === adminPhone);
    complaint.statusUpdatedByName = updatingAdmin?.name || null;
    if (status === 'Appeal to Resolve') {
      if (req.file) { complaint.proofOfWork = { filename: req.file.filename, originalName: req.file.originalname, uploadedAt: new Date().toISOString(), uploadedBy: adminPhone, uploadedByName: updatingAdmin?.name || null }; } else if (!complaint.proofOfWork) { return res.status(400).json({ error: 'Proof of work image is required for Appeal to Resolve' }); }
    }
    if (status === 'Resolved' && oldStatus === 'Appeal to Resolve') { complaint.resolvedAt = new Date().toISOString(); complaint.resolvedBy = adminPhone; complaint.resolvedByName = updatingAdmin?.name || null; }
    await writeComplaints(complaints);
    console.log(`🔄 Complaint ${id.substring(0, 8)} status updated: ${oldStatus} → ${status}`);
    res.json({ success: true, message: `Status updated from ${oldStatus} to ${status}`, complaint });
  } catch (error) { console.error('Error updating complaint status:', error); next(error); }
});

app.use('/uploads', express.static(uploadDir));

try {
  const projectRoot = path.resolve(__dirname, '..', '..');
  app.use(express.static(projectRoot));
  console.log(`Static frontend enabled from: ${projectRoot}`);
  console.log(`Open: http://localhost:${PORT}`);
} catch (e) { console.warn('Static frontend serving disabled:', e?.message || e); }

app.use((error, _req, res, _next) => {
  if (error?.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Upload too large. Please choose an image under ~20 MB or reduce its resolution.' });
  }
  console.error('API error:', error);
  res.status(500).json({ message: 'Unexpected server error.' });
});

export default app;