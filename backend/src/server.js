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
    accuracy: Number.isFinite(accuracyValue) ? accuracyValue : undefined
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

    try {
      const analysis = await analyseImageWithGemini(imagePath);
      
      // 🔥 NEW: Return main and sub-category
      res.json({
        category: analysis.category,
        mainCategory: analysis.mainCategory,      // 🔥 NEW
        subCategory: analysis.subCategory,        // 🔥 NEW
        description: analysis.description,
        confidence: analysis.confidence,
        provider: 'gemini'
      });
    } finally {
      try {
        await fs.unlink(imagePath);
      } catch (unlinkError) {
        console.error('Failed to delete temporary file:', unlinkError);
      }
    }
  } catch (error) {
    next(error);
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
        ? { latitude: lat, longitude: lon, accuracy: acc ?? null }
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

app.use('/uploads', express.static(uploadDir));

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
