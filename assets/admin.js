// Optional: allow ?api=<url> to override backend from the page URL
(() => {
  try {
    const api = new URLSearchParams(window.location.search).get('api');
    if (api) localStorage.setItem('apiBaseUrl', api);
  } catch {}
})();
// Backend API base URL - relative path on production, localhost:4000 for local dev
const API_BASE_URL = localStorage.getItem('apiBaseUrl') || 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:4000' 
    : '');

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

// 🔥 NEW: Global state
let allComplaints = [];
let allDepartments = [];
let complaintIndex = 0;
let currentForwardingComplaint = null;
let currentStatusComplaint = null;

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
    
    // Check permission to access complaints
    if (data.canAccessComplaints === false) {
      alert('Access Denied: You do not have permission to view Complaint Management.');
      window.location.href = './admin-portal.html';
      return false;
    }
    
    console.log('? Admin access granted!');
    return true;
  } catch (error) {
    console.error('? Admin check error:', error);
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
  if (slug === "submitted" || slug === "in-progress" || slug === "resolved" || slug === "appeal-to-resolve") {
    return `status-${slug}`;
  }
  return "status-unknown";
};

const buildRow = (complaint) => {
  const row = document.createElement("tr");
  row.dataset.complaintId = complaint.id;
  row.dataset.mainCategory = complaint.mainCategory || '';
  row.dataset.subCategory = complaint.subCategory || '';

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

  // 🔥 NEW: Checkbox cell
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'complaint-checkbox';
  checkbox.dataset.complaintId = complaint.id;
  checkbox.addEventListener('change', updateBulkSelection);
  addCell(checkbox);

  // 🔥 NEW: Index cell
  complaintIndex++;
  addCell(complaintIndex.toString(), 'index-cell');

addCell(complaint.id ?? "—");
  addCell(formatDate(complaint.createdAt));
  
  // Display Main Category
  const mainCategory = complaint.mainCategory 
    ? complaint.mainCategory.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    : (complaint.category ?? "—");
  addCell(mainCategory);
  
  // Display Sub-Category
  const subCategory = complaint.subCategory 
    ? complaint.subCategory.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    : "—";
  addCell(subCategory);

  const statusBadge = document.createElement("span");
  statusBadge.className = `status-badge ${statusClass(complaint.status)}`;
  statusBadge.textContent = complaint.status ?? "Unknown";
  statusBadge.dataset.status = complaint.status ?? "Unknown";  // Store raw status for filtering
  
// Add forwarded indicator
  if (complaint.forwardedTo) {
    const forwardedIcon = document.createElement('span');
    forwardedIcon.className = 'forwarded-icon';
    forwardedIcon.title = `Forwarded to ${complaint.forwardedTo}`;
    forwardedIcon.textContent = ' ✉️';
    statusBadge.appendChild(forwardedIcon);
  }
  
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

  // 🔥 NEW: Actions dropdown
  const actionsDropdown = document.createElement('div');
  actionsDropdown.className = 'actions-dropdown';
  
  const actionsBtn = document.createElement('button');
  actionsBtn.className = 'actions-btn';
  actionsBtn.textContent = '⋮';
  actionsBtn.type = 'button';
  
  const actionsMenu = document.createElement('div');
  actionsMenu.className = 'actions-menu';
  
  const forwardAction = document.createElement('button');
  forwardAction.className = 'action-item';
  forwardAction.innerHTML = '📧 Forward';
  forwardAction.onclick = () => showForwardModal(complaint);
  
  const statusAction = document.createElement('button');
  statusAction.className = 'action-item';
  statusAction.innerHTML = '🔄 Change Status';
  statusAction.onclick = () => showStatusModal(complaint);
  
  const historyAction = document.createElement('button');
  historyAction.className = 'action-item';
  historyAction.innerHTML = '📜 View History';
  historyAction.onclick = () => showHistoryModal(complaint);
  if (!complaint.forwardingHistory || complaint.forwardingHistory.length === 0) {
    historyAction.disabled = true;
    historyAction.style.opacity = '0.5';
  }
  
  actionsMenu.appendChild(forwardAction);
  actionsMenu.appendChild(statusAction);
  actionsMenu.appendChild(historyAction);
  
  actionsDropdown.appendChild(actionsBtn);
  actionsDropdown.appendChild(actionsMenu);
  
  // Toggle menu on button click
  actionsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    // Close all other menus
    document.querySelectorAll('.actions-menu.show').forEach(menu => {
      if (menu !== actionsMenu) menu.classList.remove('show');
    });
    actionsMenu.classList.toggle('show');
  });
  
  addCell(actionsDropdown, 'actions-cell');

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
  complaintIndex = 0; // Reset index

  if (complaints.length === 0) {
    const emptyRow = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 12; // Updated column count
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
    allComplaints = complaints; // Store globally

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

// 🔥 NEW: Load departments

// Load admins for a specific department
const loadDepartmentAdmins = async (departmentId) => {
  const adminSelectGroup = document.getElementById('admin-select-group');
  const adminSelect = document.querySelector('[data-role="admin-select"]');
  
  if (!adminSelectGroup || !adminSelect) return;
  
  if (!departmentId) {
    adminSelectGroup.style.display = 'none';
    adminSelect.innerHTML = '<option value="">-- Select an admin (optional) --</option>';
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/admins/department/${departmentId}`);
    if (!response.ok) return;
    
    const data = await response.json();
    const admins = data.admins || [];
    
    adminSelect.innerHTML = '<option value="">-- Select an admin (optional) --</option>';
    
    if (admins.length > 0) {
      admins.forEach(admin => {
        const option = document.createElement('option');
        option.value = admin.phone;
        option.dataset.name = admin.name;
        option.textContent = `${admin.name} (${admin.phone})`;
        adminSelect.appendChild(option);
      });
      adminSelectGroup.style.display = 'block';
    } else {
      adminSelectGroup.style.display = 'none';
    }
  } catch (error) {
    console.error('Error loading department admins:', error);
    adminSelectGroup.style.display = 'none';
  }
};
const loadDepartments = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/departments`);
    if (!response.ok) throw new Error("Unable to load departments");
    
    const data = await response.json();
    allDepartments = data.departments || [];
    
    // Populate department dropdown
    const departmentSelect = document.querySelector('[data-role="department-select"]');
    if (departmentSelect) {
      departmentSelect.innerHTML = '<option value="">-- Select a department --</option>';
      allDepartments.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept.id;
        option.textContent = dept.name;
        departmentSelect.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error loading departments:', error);
  }
};

// Load categories for filters (normalized response: { categories: [...] })
const loadCategories = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/categories`);
    if (!response.ok) {
      console.error('Failed to load categories. Status:', response.status);
      return;
    }
    const { categories } = await response.json();
    if (!Array.isArray(categories) || categories.length === 0) {
      console.warn('No categories received from API');
      return;
    }
    const mainCategorySelect = document.querySelector('[data-role="filter-main"]');
    if (mainCategorySelect) {
      categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.mainLabel || cat.label || cat.id;
        mainCategorySelect.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error loading categories:', error);
  }
};

// Update subcategory filter based on main category (normalized response: { subCategories: [...] })
const updateSubCategoryFilter = async (mainCategoryId) => {
  const subCategorySelect = document.querySelector('[data-role="filter-sub"]');
  if (!subCategorySelect) return;
  subCategorySelect.innerHTML = '<option value="">All Sub-Categories</option>';
  if (!mainCategoryId) return;
  try {
    const response = await fetch(`${API_BASE_URL}/api/categories/${mainCategoryId}/subcategories`);
    if (!response.ok) {
      console.error('Failed to load subcategories. Status:', response.status);
      return;
    }
    const { subCategories } = await response.json();
    if (!Array.isArray(subCategories) || subCategories.length === 0) {
      return;
    }
    subCategories.forEach(sub => {
      const option = document.createElement('option');
      option.value = sub.id;
      option.textContent = sub.label || sub.id;
      subCategorySelect.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading subcategories:', error);
  }
};

// 🔥 NEW: Filter complaints
const filterComplaints = () => {
  const mainCategoryFilter = document.querySelector('[data-role="filter-main"]')?.value || '';
  const subCategoryFilter = document.querySelector('[data-role="filter-sub"]')?.value || '';
  const statusFilterRaw = document.querySelector('[data-role="filter-status"]')?.value || '';
  const statusFilter = statusFilterRaw === 'total' ? '' : statusFilterRaw;
  
  const rows = tableBody.querySelectorAll('tr');
  let visibleCount = 0;
  
  rows.forEach(row => {
    const mainCat = row.dataset.mainCategory || '';
    const subCat = row.dataset.subCategory || '';
    
    const mainMatch = !mainCategoryFilter || mainCat === mainCategoryFilter;
    const subMatch = !subCategoryFilter || subCat === subCategoryFilter;
    const statusBadge = row.querySelector('.status-badge');
    const statusValue = statusBadge?.dataset?.status || statusBadge?.textContent?.trim() || '';
    const statusMatch = !statusFilter || statusValue === statusFilter;
    
    if (mainMatch && subMatch && statusMatch) {
      row.style.display = '';
      visibleCount++;
    } else {
      row.style.display = 'none';
    }
  });
  
  setMessage(`Showing ${visibleCount} of ${allComplaints.length} complaints`, 'info');
};

// 🔥 NEW: Clear filters
const clearFilters = () => {
  const mainSelect = document.querySelector('[data-role="filter-main"]');
  const subSelect = document.querySelector('[data-role="filter-sub"]');
  const statusSelect = document.querySelector('[data-role="filter-status"]');
  
  if (mainSelect) mainSelect.value = '';
  if (subSelect) subSelect.value = '';
  if (statusSelect) statusSelect.value = '';
  
  filterComplaints();
};

// 🔥 NEW: Update bulk selection
const updateBulkSelection = () => {
  const checkboxes = document.querySelectorAll('.complaint-checkbox:not([disabled])');
  const checked = document.querySelectorAll('.complaint-checkbox:checked');
  const selectAll = document.getElementById('select-all-complaints');
  const bulkBtn = document.querySelector('[data-role="bulk-forward"]');
  const countEl = document.querySelector('[data-role="selected-count"]');
  
  if (selectAll) {
    selectAll.checked = checked.length > 0 && checked.length === checkboxes.length;
    selectAll.indeterminate = checked.length > 0 && checked.length < checkboxes.length;
  }
  
  if (countEl) countEl.textContent = checked.length;
  if (bulkBtn) bulkBtn.disabled = checked.length === 0;
};

// 🔥 NEW: Select/deselect all
const toggleSelectAll = (checked) => {
  const visibleCheckboxes = Array.from(document.querySelectorAll('.complaint-checkbox'))
    .filter(cb => cb.closest('tr').style.display !== 'none');
  
  visibleCheckboxes.forEach(cb => cb.checked = checked);
  updateBulkSelection();
};

// 🔥 NEW: Show forward modal
const showForwardModal = (complaint) => {
  currentForwardingComplaint = complaint;
  const modal = document.getElementById('forward-modal');
  const preview = document.querySelector('[data-role="complaint-preview"]');
  
  if (preview) {
    const mainCat = complaint.mainCategory?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'N/A';
    const subCat = complaint.subCategory?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'N/A';
    
    preview.innerHTML = `
      <div class="preview-field"><strong>ID:</strong> ${complaint.id}</div>
      <div class="preview-field"><strong>Category:</strong> ${mainCat} > ${subCat}</div>
      <div class="preview-field"><strong>Status:</strong> ${complaint.status}</div>
      <div class="preview-field"><strong>Description:</strong> ${complaint.description || 'N/A'}</div>
      ${complaint.forwardedTo ? `<div class="preview-alert">⚠️ Already forwarded to: ${complaint.forwardedTo}</div>` : ''}
    `;
  }
  
  modal.style.display = 'flex';
};

// Close forward modal
const closeForwardModal = () => {
  const modal = document.getElementById('forward-modal');
  modal.style.display = 'none';
  currentForwardingComplaint = null;
  document.querySelector('[data-role="department-select"]').value = '';
  // Reset admin select
  const adminSelectGroup = document.getElementById('admin-select-group');
  const adminSelect = document.querySelector('[data-role="admin-select"]');
  if (adminSelectGroup) adminSelectGroup.style.display = 'none';
  if (adminSelect) adminSelect.innerHTML = '<option value="">-- Select an admin (optional) --</option>';
};

// 🔥 NEW: Confirm forward
const confirmForward = async () => {
  if (!currentForwardingComplaint) return;
  
  const departmentId = document.querySelector('[data-role="department-select"]').value;
  if (!departmentId) {
    alert('Please select a department');
    return;
  }
  
  const adminPhone = localStorage.getItem('userPhone');
  const confirmBtn = document.querySelector('[data-role="confirm-forward"]');
  
  // Get selected admin if any
  const adminSelect = document.querySelector('[data-role="admin-select"]');
  const assignedTo = adminSelect?.value || null;
  const assignedToName = assignedTo ? adminSelect.options[adminSelect.selectedIndex]?.dataset?.name : null;
  
  try {
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Forwarding...';
    
    const response = await fetch(`${API_BASE_URL}/api/complaints/${currentForwardingComplaint.id}/forward`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ departmentId, adminPhone, assignedTo, assignedToName })
    });
    
    const result = await response.json();
    
if (response.ok && result.success) {
      alert(`? ${result.message}`);
      closeForwardModal();
      loadComplaints(); // Refresh
    } else {
      alert(`? ${result.message || result.error || 'Failed to forward complaint'}`);
    }
  } catch (error) {
    console.error('Forward error:', error);
    alert('? Failed to forward complaint. Please try again.');
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.textContent = 'Forward Complaint';
  }
};

// 🔥 NEW: Bulk forward
const bulkForward = async () => {
  const checked = Array.from(document.querySelectorAll('.complaint-checkbox:checked'));
  if (checked.length === 0) return;
  
  const complaintIds = checked.map(cb => cb.dataset.complaintId);
  const departmentId = prompt(`Enter department ID to forward ${complaintIds.length} complaints to:`);
  
  if (!departmentId) return;
  
  const adminPhone = localStorage.getItem('userPhone');
  const bulkBtn = document.querySelector('[data-role="bulk-forward"]');
  
  try {
    bulkBtn.disabled = true;
    bulkBtn.textContent = 'Forwarding...';
    
    const response = await fetch(`${API_BASE_URL}/api/complaints/bulk-forward`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ complaintIds, departmentId, adminPhone })
    });
    
    const result = await response.json();
    
if (response.ok) {
      alert(`? ${result.message}\nSucceeded: ${result.results.success.length}\nFailed: ${result.results.failed.length}`);
      loadComplaints(); // Refresh
    } else {
      alert(`? ${result.error || 'Bulk forward failed'}`);
    }
  } catch (error) {
    console.error('Bulk forward error:', error);
    alert('? Failed to forward complaints. Please try again.');
  } finally {
    bulkBtn.disabled = false;
    bulkBtn.textContent = `Forward Selected (${checked.length})`;
  }
};

// Show status modal
const showStatusModal = (complaint) => {
  currentStatusComplaint = complaint;
  const modal = document.getElementById('status-modal');
  const statusSelect = document.querySelector('[data-role="status-select"]');
  const proofUploadGroup = document.getElementById('proof-upload-group');
  const proofPreviewGroup = document.getElementById('proof-preview-group');
  const proofPreview = document.getElementById('proof-preview');
  
  if (statusSelect) {
    statusSelect.value = complaint.status || 'Submitted';
    // Show/hide proof upload based on selected status
    if (proofUploadGroup) {
      proofUploadGroup.style.display = statusSelect.value === 'Appeal to Resolve' ? 'block' : 'none';
    }
  }
  
  // Show existing proof of work if available
  if (proofPreviewGroup && proofPreview && complaint.proofOfWork?.filename) {
    proofPreview.src = `${API_BASE_URL}/uploads/${complaint.proofOfWork.filename}`;
    proofPreviewGroup.style.display = 'block';
  } else if (proofPreviewGroup) {
    proofPreviewGroup.style.display = 'none';
  }
  
  // Reset proof image input
  const proofInput = document.querySelector('[data-role="proof-image"]');
  if (proofInput) proofInput.value = '';
  
  modal.style.display = 'flex';
};

// Close status modal
const closeStatusModal = () => {
  const modal = document.getElementById('status-modal');
  modal.style.display = 'none';
  currentStatusComplaint = null;
  
  // Reset proof groups
  const proofUploadGroup = document.getElementById('proof-upload-group');
  const proofPreviewGroup = document.getElementById('proof-preview-group');
  if (proofUploadGroup) proofUploadGroup.style.display = 'none';
  if (proofPreviewGroup) proofPreviewGroup.style.display = 'none';
};

// Confirm status change
const confirmStatusChange = async () => {
  if (!currentStatusComplaint) return;
  
  const status = document.querySelector('[data-role="status-select"]').value;
  const adminPhone = localStorage.getItem('userPhone');
  const confirmBtn = document.querySelector('[data-role="confirm-status"]');
  const proofInput = document.querySelector('[data-role="proof-image"]');
  
  // Check if proof image is required for Appeal to Resolve (only if no existing proof)
  if (status === 'Appeal to Resolve' && !currentStatusComplaint.proofOfWork && (!proofInput || !proofInput.files[0])) {
    alert('Please upload a proof of work image for Appeal to Resolve');
    return;
  }
  
  try {
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Updating...';
    
    // Use FormData to send both status and optional image
    const formData = new FormData();
    formData.append('status', status);
    formData.append('adminPhone', adminPhone);
    
    if (status === 'Appeal to Resolve' && proofInput?.files[0]) {
      formData.append('proofImage', proofInput.files[0]);
    }
    
    const response = await fetch(`${API_BASE_URL}/api/complaints/${currentStatusComplaint.id}/status`, {
      method: 'PATCH',
      body: formData
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      alert(`✅ ${result.message}`);
      closeStatusModal();
      loadComplaints(); // Refresh
    } else {
      alert(`❌ ${result.error || 'Failed to update status'}`);
    }
  } catch (error) {
    console.error('Status update error:', error);
    alert('❌ Failed to update status. Please try again.');
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.textContent = 'Update Status';
  }
};

// Show forwarding history modal
const showHistoryModal = (complaint) => {
  const modal = document.getElementById('history-modal');
  const content = document.querySelector('[data-role="history-content"]');
  
if (!complaint.forwardingHistory || complaint.forwardingHistory.length === 0) {
    content.innerHTML = '<p>No forwarding history available.</p>';
  } else {
    let html = '<table class="history-table"><thead><tr>';
    html += '<th>Date/Time</th><th>Department</th><th>Forwarded By</th><th>Assigned To</th>';
    html += '</tr></thead><tbody>';
    
    complaint.forwardingHistory.forEach(entry => {
      const timestamp = new Date(entry.timestamp).toLocaleString();
      // Show forwarding admin (name + phone)
      const forwardedBy = entry.adminName 
        ? `${entry.adminName}<br><small style="color: var(--text-secondary);">${entry.adminPhone}</small>` 
        : entry.adminPhone;
      // Show assigned admin (name + phone) if assigned
      const assignedTo = entry.assignedToName 
        ? `${entry.assignedToName}<br><small style="color: var(--text-secondary);">${entry.assignedTo}</small>` 
        : (entry.assignedTo || '—');
      html += `<tr>
        <td>${timestamp}</td>
        <td>${entry.departmentName}</td>
        <td>${forwardedBy}</td>
        <td>${assignedTo}</td>
      </tr>`;
    });
    
    html += '</tbody></table>';
    content.innerHTML = html;
  }
  
  modal.style.display = 'flex';
};

// 🔥 NEW: Close history modal
const closeHistoryModal = () => {
  const modal = document.getElementById('history-modal');
  modal.style.display = 'none';
};

// 🔥 NEW: Close modals on background click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.style.display = 'none';
  }
  
  // Close action menus
  if (!e.target.closest('.actions-dropdown')) {
    document.querySelectorAll('.actions-menu.show').forEach(menu => {
      menu.classList.remove('show');
    });
  }
});

if (refreshBtn) {
  refreshBtn.addEventListener("click", () => {
    loadComplaints();
  });
}

// 🔥 NEW: Filter event listeners
const mainCatFilter = document.querySelector('[data-role="filter-main"]');
if (mainCatFilter) {
  mainCatFilter.addEventListener('change', (e) => {
    updateSubCategoryFilter(e.target.value);
    filterComplaints();
  });
}

const subCatFilter = document.querySelector('[data-role="filter-sub"]');
if (subCatFilter) {
  subCatFilter.addEventListener('change', filterComplaints);
}

// 🔥 NEW: Status filter listener
const statusFilter = document.querySelector('[data-role="filter-status"]');
if (statusFilter) {
  statusFilter.addEventListener('change', filterComplaints);
}

const clearFiltersBtn = document.querySelector('[data-role="clear-filters"]');
if (clearFiltersBtn) {
  clearFiltersBtn.addEventListener('click', clearFilters);
}

// 🔥 NEW: Bulk selection listeners
const selectAllCheckbox = document.getElementById('select-all-complaints');
if (selectAllCheckbox) {
  selectAllCheckbox.addEventListener('change', (e) => toggleSelectAll(e.target.checked));
}

const bulkForwardBtn = document.querySelector('[data-role="bulk-forward"]');
if (bulkForwardBtn) {
  bulkForwardBtn.addEventListener('click', bulkForward);
}

// 🔥 NEW: Modal event listeners
document.querySelectorAll('[data-role="close-forward-modal"]').forEach(btn => {
  btn.addEventListener('click', closeForwardModal);
});

document.querySelector('[data-role="confirm-forward"]')?.addEventListener('click', confirmForward);

// Department select change listener - load admins for selected department
document.querySelector('[data-role="department-select"]')?.addEventListener('change', (e) => {
  loadDepartmentAdmins(e.target.value);
});

document.querySelectorAll('[data-role="close-status-modal"]').forEach(btn => {
  btn.addEventListener('click', closeStatusModal);
});

document.querySelector('[data-role="confirm-status"]')?.addEventListener('click', confirmStatusChange);

document.querySelectorAll('[data-role="close-history-modal"]').forEach(btn => {
  btn.addEventListener('click', closeHistoryModal);
});

// Status select change - show/hide proof upload
document.querySelector('[data-role="status-select"]')?.addEventListener('change', (e) => {
  const proofUploadGroup = document.getElementById('proof-upload-group');
  if (proofUploadGroup) {
    proofUploadGroup.style.display = e.target.value === 'Appeal to Resolve' ? 'block' : 'none';
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  // Check admin access first
  const isAdmin = await checkAdminAccess();
  if (isAdmin) {
    await loadDepartments();
    await loadCategories();
    await loadComplaints();
  }
});
