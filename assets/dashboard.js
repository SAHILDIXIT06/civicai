// Optional: allow ?api=<url> to override backend from the page URL
(() => {
  try {
    const api = new URLSearchParams(window.location.search).get('api');
    if (api) localStorage.setItem('apiBaseUrl', api);
  } catch {}
})();
// Backend API base URL with optional override for HTTPS tunnels
const API_BASE_URL = localStorage.getItem('apiBaseUrl') || `http://${window.location.hostname}:4000`;

// DOM elements
const userPhoneEl = document.getElementById('user-phone');
const logoutBtn = document.getElementById('logout-btn');
const totalCountEl = document.getElementById('total-count');
const pendingCountEl = document.getElementById('pending-count');
const progressCountEl = document.getElementById('progress-count');
const resolvedCountEl = document.getElementById('resolved-count');
const complaintsContainer = document.getElementById('complaints-container');

let currentUser = null;

// Auth check
const checkAuth = () => {
  const userPhone = localStorage.getItem('userPhone');
  const userId = localStorage.getItem('userId');
  const userRole = localStorage.getItem('userRole');
  
  if (!userPhone || !userId) {
    window.location.href = './login.html';
    return false;
  }
  
  currentUser = {
    id: userId,
    phone: userPhone,
    role: userRole
  };
  
  return true;
};

// Display user info
const displayUserInfo = () => {
  if (currentUser && userPhoneEl) {
    userPhoneEl.textContent = currentUser.phone;
  }
};

// Logout functionality
const logout = () => {
  localStorage.removeItem('userPhone');
  localStorage.removeItem('userId');
  localStorage.removeItem('userRole');
  window.location.href = './login.html';
};

// Format date
const formatDate = (isoString) => {
  if (!isoString) return "—";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
};

// Format status
const getStatusClass = (status) => {
  const normalizedStatus = (status || '').toLowerCase().replace(/\s+/g, '-');
  return `status-${normalizedStatus}`;
};

// Load user complaints
const loadUserComplaints = async () => {
  try {
    complaintsContainer.innerHTML = '<div class="loading-message">Loading your complaints...</div>';
    
    const response = await fetch(`${API_BASE_URL}/api/complaints`);
    if (!response.ok) {
      throw new Error("Unable to load complaints.");
    }
    
    const payload = await response.json();
    const allComplaints = Array.isArray(payload.complaints) ? payload.complaints : [];
    
    // 🔥 IMPORTANT FIX: Filter complaints by current user's phone number
    const userComplaints = allComplaints.filter(complaint => 
      complaint.userPhone === currentUser.phone || 
      complaint.userId === currentUser.id
    );
    
    updateStats(userComplaints);
    renderComplaints(userComplaints);
    
  } catch (error) {
    console.error('Error loading complaints:', error);
    complaintsContainer.innerHTML = `
      <div class="empty-message">
        <p>Error loading complaints: ${error.message}</p>
        <button onclick="loadUserComplaints()" class="retry-btn">Retry</button>
      </div>
    `;
  }
};

// Update statistics
const updateStats = (complaints) => {
  const stats = complaints.reduce((acc, complaint) => {
    acc.total++;
    const status = (complaint.status || '').toLowerCase();
    
    if (status === 'submitted') acc.pending++;
    else if (status.includes('progress')) acc.progress++;
    else if (status === 'resolved') acc.resolved++;
    else acc.pending++; // default unknown to pending
    
    return acc;
  }, { total: 0, pending: 0, progress: 0, resolved: 0 });

  if (totalCountEl) totalCountEl.textContent = stats.total;
  if (pendingCountEl) pendingCountEl.textContent = stats.pending;
  if (progressCountEl) progressCountEl.textContent = stats.progress;
  if (resolvedCountEl) resolvedCountEl.textContent = stats.resolved;
};

// Render complaints list
const renderComplaints = (complaints) => {
  if (complaints.length === 0) {
    complaintsContainer.innerHTML = `
      <div class="empty-message">
        <p>No complaints found.</p>
        <a href="./index.html" class="new-complaint-btn">File Your First Complaint</a>
      </div>
    `;
    return;
  }

  const complaintsHTML = complaints.map(complaint => {
    const imageUrl = complaint.image?.url ? `${API_BASE_URL}${complaint.image.url}` : null;
    
    // Format category names
    const formatCategoryName = (category) => {
      if (!category) return 'Unknown';
      return category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };
    
    const mainCategory = formatCategoryName(complaint.mainCategory || complaint.category);
    const subCategory = formatCategoryName(complaint.subCategory);
    
    return `
      <div class="complaint-card">
        <div class="complaint-header">
          <div class="complaint-id">ID: ${complaint.id || 'N/A'}</div>
          <div class="complaint-status ${getStatusClass(complaint.status)}">
            ${complaint.status || 'Submitted'}
          </div>
        </div>
        
        <div class="complaint-details">
          <div class="complaint-category">
            <strong>Main Category:</strong> ${mainCategory}
          </div>
          ${complaint.subCategory ? `
          <div class="complaint-subcategory">
            <strong>Sub-Category:</strong> ${subCategory}
          </div>
          ` : ''}
          <div class="complaint-date">
            <strong>Filed:</strong> ${formatDate(complaint.createdAt)}
          </div>
        </div>
        
        <div class="complaint-description">
          ${complaint.description || 'No description provided'}
        </div>
        
        ${complaint.location ? `
          <div class="complaint-location">
            <strong>Location:</strong> ${complaint.location.latitude?.toFixed(5)}°, ${complaint.location.longitude?.toFixed(5)}°
            ${complaint.location.accuracy ? ` (±${Math.round(complaint.location.accuracy)}m)` : ''}
          </div>
        ` : ''}
        
        ${imageUrl ? `
          <div class="complaint-image-container">
            <img src="${imageUrl}" alt="Complaint image" class="complaint-image" 
                 onclick="window.open('${imageUrl}', '_blank')" style="cursor: pointer;" />
          </div>
        ` : ''}
        
        ${complaint.analysis?.confidence ? `
          <div class="ai-analysis">
            <small>AI Confidence: ${Math.round(complaint.analysis.confidence * 100)}%</small>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  complaintsContainer.innerHTML = complaintsHTML;
};

// Event listeners
logoutBtn?.addEventListener('click', logout);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  if (checkAuth()) {
    displayUserInfo();
    loadUserComplaints();
  }
});

// Make loadUserComplaints available globally for retry button
window.loadUserComplaints = loadUserComplaints;