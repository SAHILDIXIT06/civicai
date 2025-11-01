// Optional: allow ?api=<url> to override backend from the page URL
(() => {
  try {
    const api = new URLSearchParams(window.location.search).get('api');
    if (api) localStorage.setItem('apiBaseUrl', api);
  } catch {}
})();
// Backend API base URL with optional override for HTTPS tunnels
const API_BASE_URL = localStorage.getItem('apiBaseUrl') || `http://${window.location.hostname}:4000`;

const tableBody = document.querySelector('[data-role="rows"]');
const messageEl = document.querySelector('[data-role="message"]');
const refreshBtn = document.querySelector('[data-role="refresh"]');
const lastRefreshEl = document.querySelector('[data-role="last-refresh"]');

const summaryEls = {
  total: document.querySelector('[data-summary="total"]'),
  submitted: document.querySelector('[data-summary="Submitted"]'),
  "in-progress": document.querySelector('[data-summary="In Progress"]'),
  resolved: document.querySelector('[data-summary="Resolved"]')
};

// 🔥 NEW: Check if user is admin
const checkAdminAccess = async () => {
  const userPhone = localStorage.getItem('userPhone');
  const userRole = localStorage.getItem('userRole');
  
  console.log('🔐 Admin Access Check:');
  console.log('   User Phone:', userPhone);
  console.log('   User Role:', userRole);
  
  if (!userPhone || !userRole) {
    alert('Please login first to access the admin dashboard.');
    window.location.href = './login.html';
    return false;
  }
  
  // Check if user has admin role
  if (userRole !== 'admin') {
    alert('Access denied. Admin privileges required.');
    window.location.href = './dashboard.html';
    return false;
  }
  
  try {
    const url = `${API_BASE_URL}/api/admin/check?phone=${encodeURIComponent(userPhone)}`;
    console.log('   API Call:', url);
    
    // Fetch admin phones from backend
    const response = await fetch(url);
    
    console.log('   Response Status:', response.status);
    
    if (!response.ok) {
      throw new Error('Not authorized');
    }
    
    const data = await response.json();
    console.log('   API Response:', data);
    
    if (!data.isAdmin) {
      alert('Access Denied: You do not have admin privileges.');
      window.location.href = './index.html';
      return false;
    }
    
    console.log('✅ Admin access granted!');
    return true;
  } catch (error) {
    console.error('❌ Admin check error:', error);
    alert('Access Denied: You do not have admin privileges.');
    window.location.href = './index.html';
    return false;
  }
};

const setMessage = (text, tone = "info") => {
  if (!messageEl) return;
  messageEl.textContent = text;
  messageEl.dataset.tone = tone;
};

const formatDate = (isoString) => {
  if (!isoString) return "—";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleString();
};

const formatLocation = (location) => {
  if (!location) return "—";
  const { latitude, longitude, accuracy, address } = location;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return "—";
  }
  
  // Create a container for location info
  const container = document.createElement("div");
  container.className = "location-info";
  
  // Add address if available
  if (address) {
    const addressText = document.createElement("div");
    addressText.className = "location-address";
    addressText.textContent = address;
    container.appendChild(addressText);
  }
  
  // Create clickable map link
  const mapLink = document.createElement("a");
  mapLink.href = `https://www.google.com/maps?q=${latitude},${longitude}`;
  mapLink.target = "_blank";
  mapLink.rel = "noopener noreferrer";
  mapLink.className = "location-link";
  mapLink.innerHTML = `📍 ${latitude.toFixed(5)}°, ${longitude.toFixed(5)}°`;
  if (Number.isFinite(accuracy)) {
    mapLink.innerHTML += ` <span class="location-accuracy">(±${Math.round(accuracy)}m)</span>`;
  }
  container.appendChild(mapLink);
  
  return container;
};

const statusClass = (status = "") => {
  const slug = status.trim().toLowerCase().replace(/\s+/g, "-");
  if (slug === "submitted" || slug === "in-progress" || slug === "resolved") {
    return `status-${slug}`;
  }
  return "status-unknown";
};

const buildRow = (complaint) => {
  const row = document.createElement("tr");

  const addCell = (content, className) => {
    const cell = document.createElement("td");
    if (className) {
      cell.classList.add(className);
    }
    if (content instanceof Node) {
      cell.appendChild(content);
    } else {
      cell.textContent = content ?? "—";
    }
    row.appendChild(cell);
  };

  addCell(complaint.id ?? "—");
  addCell(formatDate(complaint.createdAt));
  
  // 🔥 NEW: Display Main Category
  const mainCategory = complaint.mainCategory 
    ? complaint.mainCategory.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    : (complaint.category ?? "—");
  addCell(mainCategory);
  
  // 🔥 NEW: Display Sub-Category
  const subCategory = complaint.subCategory 
    ? complaint.subCategory.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    : "—";
  addCell(subCategory);

  const statusBadge = document.createElement("span");
  statusBadge.className = `status-badge ${statusClass(complaint.status)}`;
  statusBadge.textContent = complaint.status ?? "Unknown";
  addCell(statusBadge);

  // 🔥 NEW: Add complainer details
  const complainerInfo = complaint.userPhone 
    ? `${complaint.userPhone}${complaint.userName ? `\n${complaint.userName}` : ''}`
    : "—";
  addCell(complainerInfo, "complainer-info");

  addCell(formatLocation(complaint.location), "location");
  addCell(complaint.description ?? "—", "description");

  if (complaint.image?.url) {
    const link = document.createElement("a");
    link.href = `${API_BASE_URL}${complaint.image.url}`;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = complaint.image.originalName ?? "View";
    addCell(link);
  } else {
    addCell("—");
  }

  return row;
};

const updateSummary = (complaints) => {
  const counts = complaints.reduce(
    (acc, complaint) => {
      acc.total += 1;
      const status = (complaint.status || "").toLowerCase();
      if (status === "submitted") acc.submitted += 1;
      if (status === "in progress" || status === "in-progress") acc["in-progress"] += 1;
      if (status === "resolved") acc.resolved += 1;
      return acc;
    },
    { total: 0, submitted: 0, "in-progress": 0, resolved: 0 }
  );

  Object.entries(counts).forEach(([key, value]) => {
    const el = summaryEls[key];
    if (el) {
      el.textContent = value.toString();
    }
  });
};

const renderComplaints = (complaints) => {
  if (!tableBody) return;
  tableBody.innerHTML = "";

  if (complaints.length === 0) {
    const emptyRow = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 9; // Updated from 7 to 9 (added 2 columns)
    cell.textContent = "No complaints found.";
    emptyRow.appendChild(cell);
    tableBody.appendChild(emptyRow);
    return;
  }

  complaints.forEach((complaint) => {
    tableBody.appendChild(buildRow(complaint));
  });
};

const loadComplaints = async () => {
  setMessage("Loading complaints…", "info");
  if (refreshBtn) refreshBtn.disabled = true;

  try {
    const response = await fetch(`${API_BASE_URL}/api/complaints`);
    if (!response.ok) {
      throw new Error("Unable to load complaints.");
    }

    const payload = await response.json();
    const complaints = Array.isArray(payload.complaints) ? payload.complaints : [];

    updateSummary(complaints);
    renderComplaints(complaints);

    const countText = complaints.length === 1 ? "1 complaint" : `${complaints.length} complaints`;
    setMessage(`Loaded ${countText}.`, complaints.length ? "success" : "info");

    if (lastRefreshEl) {
      lastRefreshEl.textContent = new Date().toLocaleTimeString();
    }
  } catch (error) {
    console.error(error);
    setMessage(error.message ?? "Unexpected error while loading complaints.", "error");
  } finally {
    if (refreshBtn) refreshBtn.disabled = false;
  }
};

if (refreshBtn) {
  refreshBtn.addEventListener("click", () => {
    loadComplaints();
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  // Check admin access first
  const isAdmin = await checkAdminAccess();
  if (isAdmin) {
    loadComplaints();
  }
});
