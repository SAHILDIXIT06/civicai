const yearEl = document.getElementById("year");
if (yearEl) {
  yearEl.textContent = new Date().getFullYear().toString();
}

// Check auth status and show appropriate nav links
const checkAuthNav = () => {
  const authToken = localStorage.getItem('authToken');
  const dashboardLink = document.getElementById('dashboard-link');
  
  if (authToken && dashboardLink) {
    dashboardLink.style.display = 'inline-block';
  }
};

// Call on page load
document.addEventListener('DOMContentLoaded', checkAuthNav);

const API_BASE_URL = "http://localhost:4000";

// DOM Elements
const mainCategorySelect = document.getElementById('main-category');
const subCategorySelect = document.getElementById('sub-category');
const subCategoryField = document.getElementById('sub-category-field');
const fileInput = document.getElementById('issue-file');
const fileStatus = document.getElementById('file-status');
const filePreview = document.getElementById('file-preview');
const analysisBtn = document.getElementById('analysis-btn');
const analysisStatus = document.getElementById('analysis-status');
const descriptionTextarea = document.getElementById('issue-description');
const locationBtn = document.getElementById('location-btn');
const locationMessage = document.getElementById('location-message');
const locationCoords = document.getElementById('location-coords');
const complaintBtn = document.getElementById('complaint-btn');
const complaintHint = document.getElementById('complaint-hint');
const complaintConfirmation = document.getElementById('complaint-confirmation');
const imageSectionTitle = document.getElementById('image-section-title');
const imageUploadSection = document.getElementById('image-upload-section');

// State
let selectedFile = null;
let selectedMainCategory = null;
let selectedSubCategory = null;
let userLocation = null;
let analysisResult = null;
let allCategories = {};

// Initialize: Load categories from backend
async function loadCategories() {
  try {
    console.log('🔄 Loading categories from:', `${API_BASE_URL}/api/categories`);
    const response = await fetch(`${API_BASE_URL}/api/categories`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ Categories loaded:', data);
    
    if (!data.categories || !Array.isArray(data.categories)) {
      throw new Error('Invalid categories data structure');
    }
    
    populateMainCategories(data.categories);
  } catch (error) {
    console.error('❌ Error loading categories:', error);
    
    // Show user-friendly error
    mainCategorySelect.innerHTML = '<option value="">Error loading categories - check backend</option>';
    
    // Try to restart backend connection
    setTimeout(() => {
      console.log('🔄 Retrying category load...');
      loadCategories();
    }, 3000);
  }
}

// Populate main category dropdown
function populateMainCategories(categories) {
  console.log('📋 Populating main categories:', categories.length, 'items');
  
  mainCategorySelect.innerHTML = '<option value="">Select main category</option>';
  
  categories.forEach(cat => {
    console.log('➕ Adding category:', cat.id, '-', cat.label);
    const option = document.createElement('option');
    option.value = cat.id;
    option.textContent = cat.label;
    option.dataset.aiDetectable = cat.aiDetectable;
    option.dataset.requiresImage = cat.requiresImage;
    mainCategorySelect.appendChild(option);
  });
  
  console.log('✅ Main categories populated successfully');
}

// Handle main category selection
mainCategorySelect?.addEventListener('change', async (e) => {
  const categoryId = e.target.value;
  selectedMainCategory = categoryId;
  
  if (!categoryId) {
    subCategoryField.hidden = true;
    subCategorySelect.innerHTML = '<option value="">Select main category first</option>';
    updateImageRequirement(false);
    updateComplaintButton();
    return;
  }
  
  // Load sub-categories
  try {
    const response = await fetch(`${API_BASE_URL}/api/categories/${categoryId}/subcategories`);
    if (!response.ok) throw new Error('Failed to load sub-categories');
    
    const data = await response.json();
    populateSubCategories(data.subCategories);
    
    // Update image requirement based on category
    const selectedOption = e.target.options[e.target.selectedIndex];
    const requiresImage = selectedOption.dataset.requiresImage === 'true';
    updateImageRequirement(requiresImage);
    
  } catch (error) {
    console.error('Error loading sub-categories:', error);
    subCategorySelect.innerHTML = '<option value="">Error loading sub-categories</option>';
  }
  
  updateComplaintButton();
});

// Populate sub-category dropdown
function populateSubCategories(subCategories) {
  subCategorySelect.innerHTML = '<option value="">Select sub-category</option>';
  
  subCategories.forEach(sub => {
    const option = document.createElement('option');
    option.value = sub.id;
    option.textContent = sub.label;
    subCategorySelect.appendChild(option);
  });
  
  subCategoryField.hidden = false;
}

// Handle sub-category selection
subCategorySelect?.addEventListener('change', (e) => {
  selectedSubCategory = e.target.value;
  updateComplaintButton();
});

// Update image requirement UI
function updateImageRequirement(required) {
  if (imageSectionTitle) {
    imageSectionTitle.textContent = required 
      ? '📷 Upload Image (Required)'
      : '📷 Upload Image (Optional)';
  }
  
  if (fileInput) {
    fileInput.required = required;
  }
}

// File input handler
fileInput?.addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (!file) {
    selectedFile = null;
    fileStatus.textContent = 'No image selected.';
    filePreview.hidden = true;
    analysisBtn.disabled = true;
    analysisStatus.textContent = 'Upload an image to enable AI analysis';
    updateComplaintButton();
    return;
  }
  
  selectedFile = file;
  fileStatus.textContent = `Selected: ${file.name}`;
  
  // Show preview
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = filePreview.querySelector('img');
    const caption = filePreview.querySelector('figcaption');
    img.src = e.target.result;
    caption.textContent = file.name;
    filePreview.hidden = false;
  };
  reader.readAsDataURL(file);
  
  // Enable analysis button
  analysisBtn.disabled = false;
  analysisStatus.textContent = 'Ready to analyze image';
  
  updateComplaintButton();
});

// AI Analysis
analysisBtn?.addEventListener('click', async () => {
  if (!selectedFile) return;
  
  analysisBtn.disabled = true;
  analysisStatus.textContent = '🔄 Analyzing image with AI...';
  
  try {
    const formData = new FormData();
    formData.append('image', selectedFile);
    
    const response = await fetch(`${API_BASE_URL}/api/analyse`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Analysis failed');
    }
    
    analysisResult = await response.json();
    
    // 🔥 DEBUG: Log what AI returned
    console.log('🤖 AI Analysis Result:', analysisResult);
    console.log('📋 Main Category from AI:', analysisResult.mainCategory);
    console.log('📋 Sub Category from AI:', analysisResult.subCategory);
    
    // 🔥 STEP 1: Auto-select main category
    if (analysisResult.mainCategory) {
      console.log('🔍 Looking for main category:', analysisResult.mainCategory);
      console.log('📋 Available main categories:', Array.from(mainCategorySelect.options).map(opt => `"${opt.value}"`));
      
      // Find the main category option
      let mainCategoryFound = false;
      for (let i = 0; i < mainCategorySelect.options.length; i++) {
        const option = mainCategorySelect.options[i];
        if (option.value === analysisResult.mainCategory) {
          console.log('✅ Found main category:', option.textContent);
          
          // Select main category
          mainCategorySelect.value = analysisResult.mainCategory;
          selectedMainCategory = analysisResult.mainCategory;
          mainCategoryFound = true;
          
          // 🔥 CRITICAL: Manually trigger the change event
          console.log('🔄 Triggering main category change event...');
          const event = new Event('change', { bubbles: true });
          mainCategorySelect.dispatchEvent(event);
          
          break;
        }
      }
      
      if (!mainCategoryFound) {
        console.warn('❌ Main category not found:', analysisResult.mainCategory);
        console.log('Available options:', Array.from(mainCategorySelect.options).map(opt => opt.value));
      }
      
      // 🔥 STEP 2: Auto-select sub-category after delay
      if (analysisResult.subCategory && mainCategoryFound) {
        const selectSubCategory = () => {
          console.log('🔍 Looking for sub-category:', analysisResult.subCategory);
          console.log('📋 Available sub-categories:', Array.from(subCategorySelect.options).map(opt => `"${opt.value}"`));
          
          let subCategoryFound = false;
          for (let i = 0; i < subCategorySelect.options.length; i++) {
            const option = subCategorySelect.options[i];
            if (option.value === analysisResult.subCategory) {
              console.log('✅ Found sub-category:', option.textContent);
              
              // Select sub-category
              subCategorySelect.value = analysisResult.subCategory;
              selectedSubCategory = analysisResult.subCategory;
              subCategoryFound = true;
              
              // Trigger change event for sub-category
              const subEvent = new Event('change', { bubbles: true });
              subCategorySelect.dispatchEvent(subEvent);
              
              updateComplaintButton();
              break;
            }
          }
          
          if (!subCategoryFound) {
            console.warn('❌ Sub-category not found:', analysisResult.subCategory);
            console.log('Available sub-options:', Array.from(subCategorySelect.options).map(opt => opt.value));
          }
        };
        
        // Try multiple times with different delays
        setTimeout(selectSubCategory, 1000);
        setTimeout(selectSubCategory, 2000);
        setTimeout(selectSubCategory, 3000);
      }
    }
    
    // 🔥 STEP 3: Auto-fill description
    if (analysisResult.description) {
      console.log('📝 Auto-filling description...');
      descriptionTextarea.value = analysisResult.description;
      
      // Trigger input event to update button state
      const inputEvent = new Event('input', { bubbles: true });
      descriptionTextarea.dispatchEvent(inputEvent);
    }
    
    analysisStatus.textContent = `✅ Analysis complete! Detected: ${analysisResult.mainCategory || 'Unknown'} → ${analysisResult.subCategory || 'Unknown'}`;
    analysisBtn.disabled = false;
    
    // Force update complaint button
    updateComplaintButton();
    
  } catch (error) {
    console.error('Analysis error:', error);
    analysisStatus.textContent = '❌ Analysis failed. You can still submit manually.';
    analysisBtn.disabled = false;
  }
});

// Location handling
locationBtn?.addEventListener('click', () => {
  if (!navigator.geolocation) {
    locationMessage.textContent = 'Geolocation not supported by your browser.';
    return;
  }
  
  locationMessage.textContent = 'Requesting location...';
  locationBtn.disabled = true;
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      userLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      };
      
      locationMessage.textContent = '✅ Location access granted';
      locationCoords.textContent = `Lat: ${userLocation.latitude.toFixed(6)}, Lon: ${userLocation.longitude.toFixed(6)}`;
      locationBtn.textContent = '📍 Location granted';
      
      updateComplaintButton();
    },
    (error) => {
      console.error('Location error:', error);
      locationMessage.textContent = '❌ Location access denied. Please enable location.';
      locationBtn.disabled = false;
    }
  );
});

// Update complaint button state
function updateComplaintButton() {
  const selectedOption = mainCategorySelect?.options[mainCategorySelect.selectedIndex];
  const requiresImage = selectedOption?.dataset.requiresImage === 'true';
  
  const hasRequiredFields = 
    selectedMainCategory &&
    selectedSubCategory &&
    descriptionTextarea?.value.trim() &&
    userLocation &&
    (!requiresImage || selectedFile);
  
  if (complaintBtn) {
    complaintBtn.disabled = !hasRequiredFields;
  }
  
  if (complaintHint) {
    if (hasRequiredFields) {
      complaintHint.textContent = 'Ready to file complaint!';
    } else {
      const missing = [];
      if (!selectedMainCategory) missing.push('main category');
      if (!selectedSubCategory) missing.push('sub-category');
      if (!descriptionTextarea?.value.trim()) missing.push('description');
      if (!userLocation) missing.push('location');
      if (requiresImage && !selectedFile) missing.push('image');
      
      complaintHint.textContent = `Missing: ${missing.join(', ')}`;
    }
  }
}

// Listen to description changes
descriptionTextarea?.addEventListener('input', updateComplaintButton);

// Submit complaint
complaintBtn?.addEventListener('click', async () => {
  const selectedOption = mainCategorySelect.options[mainCategorySelect.selectedIndex];
  const requiresImage = selectedOption.dataset.requiresImage === 'true';
  
  if (!selectedMainCategory || !selectedSubCategory || !descriptionTextarea.value.trim() || !userLocation) {
    alert('Please complete all required fields.');
    return;
  }
  
  if (requiresImage && !selectedFile) {
    alert('This category requires an image. Please upload one.');
    return;
  }
  
  complaintBtn.disabled = true;
  complaintBtn.textContent = 'Submitting...';
  
  try {
    const formData = new FormData();
    
    // Only append image if provided
    if (selectedFile) {
      formData.append('image', selectedFile);
    }
    
    formData.append('mainCategory', selectedMainCategory);
    formData.append('subCategory', selectedSubCategory);
    formData.append('description', descriptionTextarea.value.trim());
    formData.append('latitude', userLocation.latitude);
    formData.append('longitude', userLocation.longitude);
    formData.append('accuracy', userLocation.accuracy);
    
    // Add user info if logged in
    const userPhone = localStorage.getItem('userPhone');
    const userId = localStorage.getItem('userId');
    
    if (userPhone) formData.append('userPhone', userPhone);
    if (userId) formData.append('userId', userId);
    
    // Add user name from profile if exists
    const mockUsers = JSON.parse(localStorage.getItem('mockUsers') || '{}');
    const currentUserProfile = mockUsers[userPhone]?.profile;
    if (currentUserProfile?.name) {
      formData.append('userName', currentUserProfile.name);
    }
    
    // Add analysis data if available
    if (analysisResult) {
      if (analysisResult.category) formData.append('category', analysisResult.category);
      if (analysisResult.description) formData.append('suggestedDescription', analysisResult.description);
      if (analysisResult.confidence) formData.append('suggestedConfidence', analysisResult.confidence);
      formData.append('analysisProvider', 'gemini');
    }
    
    const response = await fetch(`${API_BASE_URL}/api/complaints`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to submit complaint');
    }
    
    const result = await response.json();
    
    complaintConfirmation.textContent = `✅ Complaint filed successfully! ID: ${result.complaint.id}`;
    complaintConfirmation.hidden = false;
    
    // Reset form
    setTimeout(() => {
      window.location.reload();
    }, 2000);
    
  } catch (error) {
    console.error('Submit error:', error);
    alert(`Failed to submit complaint: ${error.message}`);
    complaintBtn.disabled = false;
    complaintBtn.textContent = 'File Complaint';
  }
});

// Check if user is logged in
document.addEventListener('DOMContentLoaded', () => {
  const authToken = localStorage.getItem('authToken');
  const dashboardLink = document.getElementById('dashboard-link');
  
  if (authToken && dashboardLink) {
    dashboardLink.style.display = 'inline-block';
  }
  
  // Load categories
  loadCategories();
  
  // Set current year in footer
  const yearSpan = document.getElementById('year');
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }
});
