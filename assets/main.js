// 🔒 IMMEDIATE AUTH CHECK - Runs before anything else
// This ensures login page is shown first when app opens
(function() {
  const userPhone = localStorage.getItem('userPhone');
  const userId = localStorage.getItem('userId');
  
  if (!userPhone || !userId) {
    // Not logged in - redirect to login page immediately
    window.location.href = './login.html';
  }
})();

const yearEl = document.getElementById("year");
if (yearEl) {
  yearEl.textContent = new Date().getFullYear().toString();
}

// Check auth status and show appropriate nav links
const checkAuthNav = async () => {
  const userPhone = localStorage.getItem('userPhone');
  const userRole = localStorage.getItem('userRole');
  const loginLink = document.getElementById('login-link');
  const dashboardLink = document.getElementById('dashboard-link');
  const adminLink = document.getElementById('admin-link');
  const logoutLink = document.getElementById('logout-link');
  
  if (userPhone && userRole) {
    // User is logged in
    if (loginLink) loginLink.style.display = 'none';
    if (dashboardLink) dashboardLink.style.display = 'inline-block';
    if (logoutLink) logoutLink.style.display = 'inline-block';
    
    // Check if user is admin
    if (userRole === 'admin' && adminLink) {
      adminLink.style.display = 'inline-block';
    }
  } else {
    // User is not logged in
    if (loginLink) loginLink.style.display = 'inline-block';
    if (dashboardLink) dashboardLink.style.display = 'none';
    if (adminLink) adminLink.style.display = 'none';
    if (logoutLink) logoutLink.style.display = 'none';
  }
};

// Logout function
const logout = () => {
  localStorage.removeItem('userPhone');
  localStorage.removeItem('userId');
  localStorage.removeItem('userRole');
  window.location.href = './login.html';
};

// Check if user is authenticated before allowing access to complaint page
const checkAuthAndRedirect = () => {
  const userPhone = localStorage.getItem('userPhone');
  const userId = localStorage.getItem('userId');
  
  // If not logged in, redirect to login page
  if (!userPhone || !userId) {
    window.location.href = './login.html';
    return false;
  }
  return true;
};

// Add logout event listener
document.addEventListener('DOMContentLoaded', () => {
  // First check if user is authenticated
  if (!checkAuthAndRedirect()) {
    return; // Stop execution if redirecting to login
  }
  
  checkAuthNav();
  const logoutLink = document.getElementById('logout-link');
  if (logoutLink) {
    logoutLink.addEventListener('click', logout);
  }
});

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
    img.src = e.target.result;
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
    async (position) => {
      userLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      };
      
      locationMessage.textContent = '✅ Location access granted';
      locationCoords.textContent = `Lat: ${userLocation.latitude.toFixed(6)}, Lon: ${userLocation.longitude.toFixed(6)}`;
      
      // Fetch address for the location
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLocation.latitude}&lon=${userLocation.longitude}`
        );
        const data = await response.json();
        if (data && data.display_name) {
          userLocation.address = data.display_name;
          locationCoords.textContent = `📍 ${data.display_name}`;
        }
      } catch (error) {
        console.error('Error fetching address:', error);
      }
      
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

// ===== MAP LOCATION PICKER (FREE - Using OpenStreetMap) =====
const mapLocationBtn = document.getElementById('map-location-btn');
const mapModal = document.getElementById('map-modal');
const closeMapBtn = document.getElementById('close-map');
const locationSearchInput = document.getElementById('location-search');
const searchLocationBtn = document.getElementById('search-location-btn');
const confirmLocationBtn = document.getElementById('confirm-location-btn');
const selectedAddressEl = document.getElementById('selected-address');

let map = null;
let marker = null;
let selectedLocation = null;

// Initialize map when modal opens
function initMap() {
  if (map) return; // Already initialized
  
  // Default center (India - Mumbai)
  const defaultCenter = [19.0760, 72.8777];
  
  map = L.map('map').setView(defaultCenter, 12);
  
  // Add OpenStreetMap tiles (completely free!)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(map);
  
  // Click on map to select location
  map.on('click', async (e) => {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    
    // Remove old marker if exists
    if (marker) {
      map.removeLayer(marker);
    }
    
    // Add new marker
    marker = L.marker([lat, lng]).addTo(map);
    
    // Store selected location
    selectedLocation = {
      latitude: lat,
      longitude: lng
    };
    
    // Get address using reverse geocoding (free Nominatim API)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      
      if (data.display_name) {
        selectedAddressEl.textContent = `📍 ${data.display_name}`;
        selectedLocation.address = data.display_name;
      } else {
        selectedAddressEl.textContent = `📍 Lat: ${lat.toFixed(6)}, Lon: ${lng.toFixed(6)}`;
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      selectedAddressEl.textContent = `📍 Lat: ${lat.toFixed(6)}, Lon: ${lng.toFixed(6)}`;
    }
    
    confirmLocationBtn.disabled = false;
  });
}

// Open map modal
mapLocationBtn?.addEventListener('click', () => {
  mapModal.style.display = 'flex';
  initMap();
  
  // Try to center on user's current location if available
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;
      map.setView([userLat, userLng], 13);
    });
  }
  
  // Refresh map size (fix for hidden div issue)
  setTimeout(() => {
    map.invalidateSize();
  }, 100);
});

// Close map modal
closeMapBtn?.addEventListener('click', () => {
  mapModal.style.display = 'none';
});

// Close modal on outside click
mapModal?.addEventListener('click', (e) => {
  if (e.target === mapModal) {
    mapModal.style.display = 'none';
  }
});

// Search location
searchLocationBtn?.addEventListener('click', async () => {
  const query = locationSearchInput.value.trim();
  
  if (!query) {
    alert('Please enter a location to search');
    return;
  }
  
  try {
    searchLocationBtn.disabled = true;
    searchLocationBtn.textContent = '🔍 Searching...';
    
    // Use free Nominatim geocoding API
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
    );
    const data = await response.json();
    
    if (data.length > 0) {
      const result = data[0];
      const lat = parseFloat(result.lat);
      const lng = parseFloat(result.lon);
      
      // Move map to searched location
      map.setView([lat, lng], 15);
      
      // Remove old marker
      if (marker) {
        map.removeLayer(marker);
      }
      
      // Add marker
      marker = L.marker([lat, lng]).addTo(map);
      
      // Set selected location
      selectedLocation = {
        latitude: lat,
        longitude: lng,
        address: result.display_name
      };
      
      selectedAddressEl.textContent = `📍 ${result.display_name}`;
      confirmLocationBtn.disabled = false;
    } else {
      alert('Location not found. Please try a different search term.');
    }
  } catch (error) {
    console.error('Geocoding error:', error);
    alert('Error searching for location. Please try again.');
  } finally {
    searchLocationBtn.disabled = false;
    searchLocationBtn.textContent = '🔍 Search';
  }
});

// "Your Location" button in map
const myLocationBtn = document.getElementById('my-location-btn');
myLocationBtn?.addEventListener('click', () => {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported by your browser');
    return;
  }
  
  myLocationBtn.disabled = true;
  myLocationBtn.textContent = '📍 Locating...';
  
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      
      // Move map to user's location
      map.setView([lat, lng], 15);
      
      // Remove old marker
      if (marker) {
        map.removeLayer(marker);
      }
      
      // Add marker
      marker = L.marker([lat, lng]).addTo(map);
      
      // Fetch address
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
        );
        const data = await response.json();
        
        selectedLocation = {
          latitude: lat,
          longitude: lng,
          address: data.display_name || `Lat: ${lat.toFixed(6)}, Lon: ${lng.toFixed(6)}`
        };
        
        selectedAddressEl.textContent = `📍 ${selectedLocation.address}`;
        confirmLocationBtn.disabled = false;
      } catch (error) {
        console.error('Error fetching address:', error);
        selectedLocation = {
          latitude: lat,
          longitude: lng,
          address: `Lat: ${lat.toFixed(6)}, Lon: ${lng.toFixed(6)}`
        };
        selectedAddressEl.textContent = `📍 ${selectedLocation.address}`;
        confirmLocationBtn.disabled = false;
      }
      
      myLocationBtn.disabled = false;
      myLocationBtn.textContent = '📍 Your Location';
    },
    (error) => {
      console.error('Location error:', error);
      alert('Could not get your location. Please enable location services.');
      myLocationBtn.disabled = false;
      myLocationBtn.textContent = '📍 Your Location';
    }
  );
});

// Confirm location
confirmLocationBtn?.addEventListener('click', () => {
  if (selectedLocation) {
    userLocation = {
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      accuracy: 0, // Map selection is precise
      address: selectedLocation.address || `${selectedLocation.latitude}, ${selectedLocation.longitude}`
    };
    
    locationMessage.textContent = '✅ Location selected from map';
    locationCoords.textContent = selectedLocation.address || 
      `Lat: ${selectedLocation.latitude.toFixed(6)}, Lon: ${selectedLocation.longitude.toFixed(6)}`;
    
    // Close modal
    mapModal.style.display = 'none';
    
    updateComplaintButton();
  }
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
    
    // Add address if available from map selection
    if (userLocation.address) {
      formData.append('address', userLocation.address);
    }
    
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
    
    // Save complaint data to localStorage for success page
    localStorage.setItem('lastComplaint', JSON.stringify({
      id: result.complaint.id,
      mainCategory: result.complaint.mainCategory,
      subCategory: result.complaint.subCategory,
      createdAt: result.complaint.createdAt,
      status: result.complaint.status,
      location: result.complaint.location || null // Include location data
    }));
    
    // Redirect to success page
    window.location.href = './success.html';
    
  } catch (error) {
    console.error('Submit error:', error);
    alert(`Failed to submit complaint: ${error.message}`);
    complaintBtn.disabled = false;
    complaintBtn.textContent = 'File Complaint';
  }
});

// Check if user is logged in
document.addEventListener('DOMContentLoaded', () => {
  const userPhone = localStorage.getItem('userPhone');
  const dashboardLink = document.getElementById('dashboard-link');
  
  if (userPhone && dashboardLink) {
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
