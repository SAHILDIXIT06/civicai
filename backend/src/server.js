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
const PORT = process.env.PORT || 4000;

const allowedOriginSetting = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',').map((value) => value.trim())
  : true; // reflect request origin by default for local demos

app.use(cors({ origin: allowedOriginSetting }));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

const uploadsDir = path.join(__dirname, '..', 'uploads');

// 🔥 FIX: Use disk storage instead of memory storage
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      // Use timestamp + original extension to avoid collisions
      const ext = path.extname(file.originalname);
      const uniqueName = `temp_${Date.now()}${ext}`;
      cb(null, uniqueName);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB limit
});

const stripDataUrlPrefix = (value) => {
  if (typeof value !== 'string') return null;
  const match = value.match(/^data:(?<mime>[^;]+);base64,(?<data>[A-Za-z0-9+/=]+)$/);
  if (match?.groups?.data) {
    return match.groups.data;
  }
  return value;
};

const parseLocation = (payload) => {
  if (!payload) return null;
  const latitudeValue = Number.parseFloat(payload.latitude ?? payload.lat);
  const longitudeValue = Number.parseFloat(payload.longitude ?? payload.lon);
  const accuracyValue = payload.accuracy !== undefined ? Number.parseFloat(payload.accuracy) : undefined;

  if (!Number.isFinite(latitudeValue) || !Number.isFinite(longitudeValue)) {
    return null;
  }

  return {
    latitude: latitudeValue,
    longitude: longitudeValue,
    accuracy: Number.isFinite(accuracyValue) ? accuracyValue : undefined,
    address: payload.address || null // Store address from map selection
  };
};

const readComplaints = async () => {
  const raw = await fs.readFile(dataFile, 'utf8');
  return JSON.parse(raw).complaints ?? [];
};

const writeComplaints = async (complaints) => {
  await fs.writeFile(dataFile, JSON.stringify({ complaints }, null, 2), 'utf8');
};

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.post('/api/analyze', async (req, res, next) => {
  try {
    const { imageBase64, location } = req.body ?? {};
    const stripped = stripDataUrlPrefix(imageBase64);

    if (!stripped) {
      return res.status(400).json({ message: 'imageBase64 is required.' });
    }

    const locationInfo = parseLocation(location);
    const analysis = await analyseImageWithGemini({ imageBase64: stripped, location: locationInfo });

    res.json({
      categoryId: analysis.categoryId,
      categoryLabel: analysis.categoryLabel,
      description: analysis.description,
      confidence: analysis.confidence
    });
  } catch (error) {
    console.error('Gemini analysis failed:', error);
    res.status(500).json({ message: 'Unable to analyse image automatically.' });
  }
});

app.post('/api/analyse', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required for analysis.' });
    }
    const imagePath = req.file.path;
    let analysis;
    try {
      analysis = await analyseImageWithGemini(imagePath);
    } finally {
      try { await fs.unlink(imagePath); } catch (unlinkError) { console.error('Failed to delete temporary file:', unlinkError); }
    }
    // If analysis has zero confidence, indicate failure to frontend but allow manual flow
    const aiFailed = analysis.confidence === 0;
    res.json({
      category: analysis.category,
      mainCategory: analysis.mainCategory,
      subCategory: analysis.subCategory,
      description: analysis.description,
      confidence: analysis.confidence,
      provider: 'gemini',
      aiFailed
    });
  } catch (error) {
    console.error('❌ /api/analyse error:', error);
    return res.status(500).json({ error: 'AI analysis failed server-side. Please pick category manually.', details: error.message });
  }
});

app.get('/api/complaints', async (_req, res, next) => {
  try {
    const complaints = await readComplaints();
    res.json({ complaints });
  } catch (error) {
    next(error);
  }
});

app.post('/api/complaints', upload.single('image'), async (req, res, next) => {
  try {
    const { 
      category, 
      description, 
      latitude, 
      longitude, 
      accuracy,
      address,           // 🔥 NEW: Address from map selection
      suggestedCategory, 
      suggestedDescription, 
      suggestedConfidence, 
      analysisProvider, 
      userPhone, 
      userId, 
      userName,
      mainCategory,      // 🔥 NEW
      subCategory        // 🔥 NEW
    } = req.body;

    // Validate required fields
    if (!description || description.trim() === '') {
      return res.status(400).json({ error: 'Description is required.' });
    }

    // 🔥 NEW: Validate categories (image optional for some categories)
    if (!mainCategory || !subCategory) {
      return res.status(400).json({ error: 'Main category and sub-category are required.' });
    }

    // Check if image is required for this category
    const categoryData = PMC_CATEGORIES[mainCategory];
    if (categoryData?.requiresImage && !req.file) {
      return res.status(400).json({ error: `Image is required for ${categoryData.mainLabel} complaints.` });
    }

    const lat = latitude ? Number.parseFloat(latitude) : null;
    const lon = longitude ? Number.parseFloat(longitude) : null;
    const acc = accuracy ? Number.parseFloat(accuracy) : null;

    const locationFromForm =
      lat !== null && lon !== null
        ? { 
            latitude: lat, 
            longitude: lon, 
            accuracy: acc ?? null,
            address: address || null // 🔥 Include address from map selection
          }
        : null;

    const complaintId = randomUUID();
    const createdAt = new Date().toISOString();
    
    let imageData = null;
    
    // Process image if provided
    if (req.file) {
      const ext = path.extname(req.file.originalname);
      const fileName = `${complaintId}${ext}`;
      const oldPath = req.file.path;
      const newPath = path.join(uploadsDir, fileName);
      await fs.rename(oldPath, newPath);
      
      imageData = {
        fileName,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        url: `/uploads/${fileName}`
      };
    }

    const complaint = {
      id: complaintId,
      createdAt,
      status: 'Submitted',
      category: category || null,  // Legacy field
      mainCategory,                 // 🔥 NEW
      subCategory,                  // 🔥 NEW
      description,
      location: locationFromForm,
      userPhone: userPhone || null,
      userId: userId || null,
      userName: userName || null,
      image: imageData,
      analysis: {
        provider: analysisProvider ?? null,
        suggestedCategory: suggestedCategory ?? null,
        suggestedMainCategory: null,    // 🔥 NEW
        suggestedSubCategory: null,      // 🔥 NEW
        suggestedDescription: suggestedDescription ?? null,
        confidence: suggestedConfidence ? Number.parseFloat(suggestedConfidence) : null
      }
    };

    const complaintsFile = path.join(dataDir, 'complaints.json');
    let complaintsData = { complaints: [] };

    try {
      const raw = await fs.readFile(complaintsFile, 'utf8');
      complaintsData = JSON.parse(raw);
    } catch {
      // File doesn't exist yet
    }

    complaintsData.complaints.unshift(complaint);
    await fs.writeFile(complaintsFile, JSON.stringify(complaintsData, null, 2), 'utf8');

    res.status(201).json({ 
      complaint,
      message: 'Complaint filed successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Get all main categories
app.get('/api/categories', (_req, res) => {
  try {
    const mainCategories = getMainCategories();
    res.json({ categories: mainCategories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get sub-categories for a main category
app.get('/api/categories/:mainCategoryId/subcategories', (req, res) => {
  try {
    const { mainCategoryId } = req.params;
    const subCategories = getSubCategories(mainCategoryId);
    
    if (!subCategories || subCategories.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json({ subCategories });
  } catch (error) {
    console.error('Error fetching sub-categories:', error);
    res.status(500).json({ error: 'Failed to fetch sub-categories' });
  }
});

// Admin phone numbers endpoint (already provided earlier)
app.get('/api/admin-phones', async (_req, res, next) => {
  try {
    const adminPhonesFile = path.join(dataDir, 'admin_phones.json');
    
    // Check if file exists, if not create it
    try {
      await fs.access(adminPhonesFile);
    } catch {
      const defaultAdminPhones = {
        adminPhones: ['+917058346137', '+919876543210']
      };
      await fs.writeFile(adminPhonesFile, JSON.stringify(defaultAdminPhones, null, 2), 'utf8');
    }
    
    const raw = await fs.readFile(adminPhonesFile, 'utf8');
    const data = JSON.parse(raw);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// 🔥 NEW: Get all admins with details
app.get('/api/admins', async (_req, res, next) => {
  try {
    const adminPhonesFile = path.join(dataDir, 'admin_phones.json');
    
    // Ensure file exists
    try {
      await fs.access(adminPhonesFile);
    } catch {
      const defaultAdminPhones = {
        adminPhones: ['+917058346137', '+919876543210'],
        admins: [
          { phone: '+917058346137', name: 'Primary Admin', addedAt: new Date().toISOString() },
          { phone: '+919876543210', name: 'Secondary Admin', addedAt: new Date().toISOString() }
        ]
      };
      await fs.writeFile(adminPhonesFile, JSON.stringify(defaultAdminPhones, null, 2), 'utf8');
    }
    
    const raw = await fs.readFile(adminPhonesFile, 'utf8');
    const data = JSON.parse(raw);
    
    // Migrate old format if needed
    if (!data.admins && data.adminPhones) {
      data.admins = data.adminPhones.map(phone => ({
        phone,
        name: 'Admin',
        addedAt: new Date().toISOString(),
        departmentId: null,
        departmentName: null
      }));
      await fs.writeFile(adminPhonesFile, JSON.stringify(data, null, 2), 'utf8');
    }
    
    res.json({ admins: data.admins || [] });
  } catch (error) {
    next(error);
  }
});

// 🔥 NEW: Add new admin
app.post('/api/admins', async (req, res, next) => {
  try {
    const { name, phone, addedBy, departmentId, canAccessComplaints, canManageAdmins } = req.body;
    
    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }
    
    // Validate phone format
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }
    
    const adminPhonesFile = path.join(dataDir, 'admin_phones.json');
    const raw = await fs.readFile(adminPhonesFile, 'utf8');
    const data = JSON.parse(raw);
    
    // Initialize arrays if needed
    if (!data.admins) data.admins = [];
    if (!data.adminPhones) data.adminPhones = [];
    
    // Check if admin already exists
    if (data.adminPhones.includes(phone)) {
      return res.status(400).json({ error: 'This phone number is already an administrator' });
    }
    
    // Resolve department if provided
    let departmentName = null;
    if (departmentId) {
      try {
        const departmentsFile = path.join(dataDir, 'departments.json');
        const departmentsData = JSON.parse(await fs.readFile(departmentsFile, 'utf8'));
        const dept = departmentsData.departments.find(d => d.id === departmentId);
        if (!dept) {
          return res.status(400).json({ error: 'Invalid departmentId' });
        }
        departmentName = dept.name;
      } catch (e) {
        console.error('Failed to resolve department:', e);
        return res.status(500).json({ error: 'Failed to resolve department' });
      }
    }

    // Add new admin with access permissions
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
    
    data.admins.push(newAdmin);
    data.adminPhones.push(phone);
    
    await fs.writeFile(adminPhonesFile, JSON.stringify(data, null, 2), 'utf8');
    
    console.log(`? New admin added: ${name} (${phone})`);
    
    res.status(201).json({ 
      message: `Administrator ${name} added successfully`,
      admin: newAdmin 
    });
  } catch (error) {
    next(error);
  }
});

// 🔥 NEW: Remove admin
app.delete('/api/admins/:phone', async (req, res, next) => {
  try {
    const { phone } = req.params;
    const { removedBy } = req.body;
    
    const adminPhonesFile = path.join(dataDir, 'admin_phones.json');
    const raw = await fs.readFile(adminPhonesFile, 'utf8');
    const data = JSON.parse(raw);
    
    // Check if admin exists
    if (!data.adminPhones || !data.adminPhones.includes(phone)) {
      return res.status(404).json({ error: 'Administrator not found' });
    }
    
    // Prevent removing the last admin
    if (data.adminPhones.length <= 1) {
      return res.status(400).json({ error: 'Cannot remove the last administrator' });
    }
    
    // Remove from both arrays
    data.adminPhones = data.adminPhones.filter(p => p !== phone);
    if (data.admins) {
      data.admins = data.admins.filter(a => a.phone !== phone);
    }
    
    await fs.writeFile(adminPhonesFile, JSON.stringify(data, null, 2), 'utf8');
    
console.log(`??? Admin removed: ${phone} by ${removedBy || 'unknown'}`);
    
    res.json({ message: 'Administrator removed successfully' });
  } catch (error) {
    next(error);
  }
});

// ?? NEW: Update admin permissions
app.put('/api/admins/:phone/permissions', async (req, res, next) => {
  try {
    const { phone } = req.params;
    const { canAccessComplaints, canManageAdmins, updatedBy } = req.body;
    
    const adminPhonesFile = path.join(dataDir, 'admin_phones.json');
    const raw = await fs.readFile(adminPhonesFile, 'utf8');
    const data = JSON.parse(raw);
    
    // Check if admin exists
    if (!data.adminPhones || !data.adminPhones.includes(phone)) {
      return res.status(404).json({ error: 'Administrator not found' });
    }
    
    // Find and update the admin in the admins array
    if (data.admins) {
      const adminIndex = data.admins.findIndex(a => a.phone === phone);
      if (adminIndex !== -1) {
        data.admins[adminIndex].canAccessComplaints = canAccessComplaints;
        data.admins[adminIndex].canManageAdmins = canManageAdmins;
        data.admins[adminIndex].permissionsUpdatedAt = new Date().toISOString();
        data.admins[adminIndex].permissionsUpdatedBy = updatedBy || null;
      }
    }
    
    await fs.writeFile(adminPhonesFile, JSON.stringify(data, null, 2), 'utf8');
    
    console.log(`?? Admin permissions updated: ${phone} by ${updatedBy || 'unknown'}`);
    console.log(`   - canAccessComplaints: ${canAccessComplaints}`);
    console.log(`   - canManageAdmins: ${canManageAdmins}`);
    
    res.json({ 
      message: 'Permissions updated successfully',
      permissions: { canAccessComplaints, canManageAdmins }
    });
  } catch (error) {
    next(error);
  }
});

//  NEW: Get admins by department
app.get('/api/admins/department/:departmentId', async (req, res, next) => {
  try {
    const { departmentId } = req.params;
    
    const adminPhonesFile = path.join(dataDir, 'admin_phones.json');
    const raw = await fs.readFile(adminPhonesFile, 'utf8');
    const data = JSON.parse(raw);
    
    const admins = (data.admins || []).filter(a => a.departmentId === departmentId);
    
    res.json({ admins });
  } catch (error) {
    next(error);
  }
});

//  NEW: Get complaints assigned to specific admin
app.get('/api/complaints/assigned/:adminPhone', async (req, res, next) => {
  try {
    const { adminPhone } = req.params;
    
    const complaints = await readComplaints();
    const assignedComplaints = complaints.filter(c => c.assignedTo === adminPhone);
    
    res.json({ complaints: assignedComplaints });
  } catch (error) {
    next(error);
  }
});

// 🔥 NEW: Admin check endpoint
app.get('/api/admin/check', async (req, res, next) => {
  try {
    // Get phone from query or body
    const phone = req.query.phone || req.body.phone;
    
    if (!phone) {
      return res.status(400).json({ isAdmin: false, message: 'Phone number required' });
    }
    
    const adminPhonesFile = path.join(dataDir, 'admin_phones.json');
    const raw = await fs.readFile(adminPhonesFile, 'utf8');
    const data = JSON.parse(raw);
    
    console.log('🔍 Admin Check Request:');
    console.log('   Phone from request:', phone);
    console.log('   Admin phones in list:', data.adminPhones);
    console.log('   Match found:', data.adminPhones.includes(phone));
    
    const isAdmin = data.adminPhones.includes(phone);
    
    // Get admin details including permissions
    const adminDetails = data.admins?.find(a => a.phone === phone) || {};
    
    res.json({ 
      isAdmin, 
      phone,
      canAccessComplaints: adminDetails.canAccessComplaints !== false,
      canManageAdmins: adminDetails.canManageAdmins !== false,
      name: adminDetails.name || null,
      departmentId: adminDetails.departmentId || null,
      departmentName: adminDetails.departmentName || null
    });
  } catch (error) {
    next(error);
  }
});

// 🔥 NEW: Get all departments
app.get('/api/departments', async (_req, res, next) => {
  try {
    const departmentsFile = path.join(dataDir, 'departments.json');
    const raw = await fs.readFile(departmentsFile, 'utf8');
    const data = JSON.parse(raw);
    res.json(data);
  } catch (error) {
    console.error('Error reading departments:', error);
    next(error);
  }
});

// 🔥 NEW: Forward complaint to department
app.post('/api/complaints/:id/forward', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { departmentId, adminPhone, assignedTo, assignedToName } = req.body;

    // Validate admin
    if (!adminPhone) {
      return res.status(401).json({ error: 'Admin phone number required' });
    }

    const adminPhonesFile = path.join(dataDir, 'admin_phones.json');
    const adminData = JSON.parse(await fs.readFile(adminPhonesFile, 'utf8'));
    if (!adminData.adminPhones.includes(adminPhone)) {
      return res.status(403).json({ error: 'Unauthorized: Admin access required' });
    }

    // Load complaints
    const complaints = await readComplaints();
    const complaint = complaints.find(c => c.id === id);
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    // Load departments
    const departmentsFile = path.join(dataDir, 'departments.json');
    const departmentsData = JSON.parse(await fs.readFile(departmentsFile, 'utf8'));
    const department = departmentsData.departments.find(d => d.id === departmentId);
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

// Check email configuration
    let emailResult = { success: false, skipped: true, error: 'Email not configured' };
    if (isEmailConfigured()) {
      // Send email
      emailResult = await sendComplaintEmail(complaint, department, adminPhone);
    } else {
      console.warn('?? Email not configured. Forwarding without email notification.');
    }

    // Get admin name from admins list
    const forwardingAdmin = adminData.admins?.find(a => a.phone === adminPhone);
    const adminName = forwardingAdmin?.name || null;

    // Update complaint with forwarding info
    const timestamp = new Date().toISOString();
    
    // Initialize forwardingHistory if not exists
    if (!complaint.forwardingHistory) {
      complaint.forwardingHistory = [];
    }

    // Add to history
    complaint.forwardingHistory.push({
      departmentId: department.id,
      departmentName: department.name,
      timestamp: timestamp,
      adminPhone: adminPhone,
      adminName: adminName,
      assignedTo: assignedTo || null,
      assignedToName: assignedToName || null,
      emailStatus: emailResult.success ? 'sent' : (emailResult.skipped ? 'skipped' : 'failed'),
      error: emailResult.error || undefined,
      messageId: emailResult.messageId || undefined
    });

    // Update current forwarding info
    complaint.forwardedTo = department.id;
    complaint.forwardedAt = timestamp;
    complaint.forwardedBy = adminPhone;

    // Assign to specific admin if provided
    if (assignedTo) {
      complaint.assignedTo = assignedTo;
      complaint.assignedToName = assignedToName || null;
      complaint.assignedAt = timestamp;
    }

    // Update status if still submitted
    if (complaint.status === 'Submitted') {
      complaint.status = 'In Progress';
    }

    // Save updated complaints
    await writeComplaints(complaints);

    console.log(`? Complaint ${id.substring(0, 8)} forwarded to ${department.name}`);

    // Determine success message
    let message;
    if (emailResult.success) {
      message = `Complaint forwarded to ${department.name} and email notification sent`;
    } else if (emailResult.skipped) {
      message = `Complaint forwarded to ${department.name} (email notification skipped - not configured)`;
    } else {
      message = `Complaint forwarded to ${department.name} (email failed: ${emailResult.error})`;
    }

    res.json({
      success: true, // Forwarding succeeded even if email failed
      message: message,
      complaint: complaint,
      emailResult: emailResult
    });

  } catch (error) {
    console.error('Error forwarding complaint:', error);
    next(error);
  }
});

// 🔥 NEW: Bulk forward complaints
app.post('/api/complaints/bulk-forward', async (req, res, next) => {
  try {
    const { complaintIds, departmentId, adminPhone } = req.body;

    // Validate inputs
    if (!Array.isArray(complaintIds) || complaintIds.length === 0) {
      return res.status(400).json({ error: 'complaintIds array is required' });
    }

    if (!departmentId) {
      return res.status(400).json({ error: 'departmentId is required' });
    }

    if (!adminPhone) {
      return res.status(401).json({ error: 'Admin phone number required' });
    }

    // Validate admin
    const adminPhonesFile = path.join(dataDir, 'admin_phones.json');
    const adminData = JSON.parse(await fs.readFile(adminPhonesFile, 'utf8'));
    if (!adminData.adminPhones.includes(adminPhone)) {
      return res.status(403).json({ error: 'Unauthorized: Admin access required' });
    }

    // Load departments
    const departmentsFile = path.join(dataDir, 'departments.json');
    const departmentsData = JSON.parse(await fs.readFile(departmentsFile, 'utf8'));
    const department = departmentsData.departments.find(d => d.id === departmentId);
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    // Check email configuration
    const emailConfigured = isEmailConfigured();
    if (!emailConfigured) {
      console.warn('?? Email not configured. Bulk forwarding without email notifications.');
    }

    // Load complaints
    const complaints = await readComplaints();
    const results = {
      success: [],
      failed: []
    };

    // Process each complaint
    for (const id of complaintIds) {
      const complaint = complaints.find(c => c.id === id);
      if (!complaint) {
        results.failed.push({ id, reason: 'Complaint not found' });
        continue;
      }

      try {
        // Send email if configured
        let emailResult = { success: false, skipped: true, error: 'Email not configured' };
        if (emailConfigured) {
          emailResult = await sendComplaintEmail(complaint, department, adminPhone);
        }

        const timestamp = new Date().toISOString();

        // Initialize forwardingHistory if not exists
        if (!complaint.forwardingHistory) {
          complaint.forwardingHistory = [];
        }

        // Add to history
        complaint.forwardingHistory.push({
          departmentId: department.id,
          departmentName: department.name,
          timestamp: timestamp,
          adminPhone: adminPhone,
          emailStatus: emailResult.success ? 'sent' : (emailResult.skipped ? 'skipped' : 'failed'),
          error: emailResult.error || undefined,
          messageId: emailResult.messageId || undefined
        });

        // Update current forwarding info
        complaint.forwardedTo = department.id;
        complaint.forwardedAt = timestamp;
        complaint.forwardedBy = adminPhone;

    // Assign to specific admin if provided
    if (assignedTo) {
      complaint.assignedTo = assignedTo;
      complaint.assignedToName = assignedToName || null;
      complaint.assignedAt = timestamp;
    }

        // Update status if still submitted
        if (complaint.status === 'Submitted') {
          complaint.status = 'In Progress';
        }

        if (emailResult.success) {
          results.success.push({ id, messageId: emailResult.messageId });
        } else {
          results.failed.push({ id, reason: emailResult.error });
        }

      } catch (error) {
        results.failed.push({ id, reason: error.message });
      }
    }

    // Save all updated complaints
    await writeComplaints(complaints);

    console.log(`📨 Bulk forward complete: ${results.success.length} succeeded, ${results.failed.length} failed`);

    res.json({
      message: `Forwarded ${results.success.length} of ${complaintIds.length} complaints to ${department.name}`,
      department: department.name,
      results: results
    });

  } catch (error) {
    console.error('Error in bulk forward:', error);
    next(error);
  }
});

// 🔥 NEW: Update complaint status
app.patch('/api/complaints/:id/status', upload.single('proofImage'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, adminPhone } = req.body;

    // Validate admin
    if (!adminPhone) {
      return res.status(401).json({ error: 'Admin phone number required' });
    }

    const adminPhonesFile = path.join(dataDir, 'admin_phones.json');
    const adminData = JSON.parse(await fs.readFile(adminPhonesFile, 'utf8'));
    if (!adminData.adminPhones.includes(adminPhone)) {
      return res.status(403).json({ error: 'Unauthorized: Admin access required' });
    }

    // Validate status
    const validStatuses = ['Submitted', 'In Progress', 'Appeal to Resolve', 'Resolved'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    // Load and update complaint
    const complaints = await readComplaints();
    const complaint = complaints.find(c => c.id === id);
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    const oldStatus = complaint.status;
    complaint.status = status;
    complaint.statusUpdatedAt = new Date().toISOString();
    complaint.statusUpdatedBy = adminPhone;

    // Get admin name
    const updatingAdmin = adminData.admins?.find(a => a.phone === adminPhone);
    complaint.statusUpdatedByName = updatingAdmin?.name || null;

    // Handle proof image for Appeal to Resolve
    if (status === 'Appeal to Resolve') {
      if (req.file) {
        complaint.proofOfWork = {
          filename: req.file.filename,
          originalName: req.file.originalname,
          uploadedAt: new Date().toISOString(),
          uploadedBy: adminPhone,
          uploadedByName: updatingAdmin?.name || null
        };
      } else if (!complaint.proofOfWork) {
        return res.status(400).json({ error: 'Proof of work image is required for Appeal to Resolve' });
      }
    }

    // If changing from Appeal to Resolved, keep the proof image and record resolver
    if (status === 'Resolved' && oldStatus === 'Appeal to Resolve') {
      complaint.resolvedAt = new Date().toISOString();
      complaint.resolvedBy = adminPhone;
      complaint.resolvedByName = updatingAdmin?.name || null;
    }

// Save updated complaints
    await writeComplaints(complaints);

    console.log(`?? Complaint ${id.substring(0, 8)} status updated: ${oldStatus} ? ${status}`);

    res.json({
      success: true,
      message: `Status updated from ${oldStatus} to ${status}`,
      complaint: complaint
    });

  } catch (error) {
    console.error('Error updating complaint status:', error);
    next(error);
  }
});

app.use('/uploads', express.static(uploadDir));

// Serve the frontend statically from the project root so the app can run with a single process
try {
  const projectRoot = path.resolve(__dirname, '..', '..');
  app.use(express.static(projectRoot));
  console.log(`Static frontend enabled from: ${projectRoot}`);
  console.log(`Open: http://localhost:${PORT}`);
} catch (e) {
  console.warn('Static frontend serving disabled:', e?.message || e);
}

app.use((error, _req, res, _next) => {
  if (error?.type === 'entity.too.large') {
    console.warn('Rejected payload exceeding limit.');
    return res.status(413).json({
      message: 'Upload too large. Please choose an image under ~20 MB or reduce its resolution.'
    });
  }

  console.error('API error:', error);
  res.status(500).json({ message: 'Unexpected server error.' });
});

app.listen(PORT, () => {
  console.log(`Civic AI backend listening on port ${PORT}`);
});
