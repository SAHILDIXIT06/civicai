// My Work - Shows complaints assigned to the current admin (Table Format)

// Backend API base URL
const API_BASE_URL = localStorage.getItem('apiBaseUrl') || `http://${window.location.hostname}:4000`;

// DOM Elements
const tableBody = document.querySelector('[data-role="rows"]');
const messageEl = document.querySelector('[data-role="message"]');
const refreshBtn = document.querySelector('[data-role="refresh"]');

// Global state
let assignedComplaints = [];
let currentComplaint = null;
let complaintIndex = 0;

// Check admin access
const checkAdminAccess = async () => {
  const userPhone = localStorage.getItem('userPhone');
  const userRole = localStorage.getItem('userRole');
  
  if (!userPhone || userRole !== 'admin') {
    alert('Access denied. Admin privileges required.');
    window.location.href = './login.html';
    return false;
  }

  // Display admin phone
  const phoneEl = document.getElementById('admin-phone');
  if (phoneEl) phoneEl.textContent = userPhone;

  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/check?phone=${encodeURIComponent(userPhone)}`);
    const data = await response.json();
    
    if (!response.ok || !data.isAdmin) {
      alert('Access Denied: You do not have admin privileges.');
      window.location.href = './index.html';
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Admin check error:', error);
    alert('Access Denied: Unable to verify admin status.');
    window.location.href = './index.html';
    return false;
  }
};

// Set message
const setMessage = (text, tone = "info") => {
  if (!messageEl) return;
  messageEl.textContent = text;
  messageEl.dataset.tone = tone;
};

// Format date for display
const formatDate = (isoString) => {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
};

// Format location
const formatLocation = (location) => {
  if (!location) return '—';
  const { latitude, longitude, accuracy, address } = location;
  if (address) return address;
  if (latitude && longitude) {
    return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}${accuracy ? ` (±${Math.round(accuracy)}m)` : ''}`;
  }
  return '—';
};

// Get status class
const statusClass = (status) => {
  switch (status?.toLowerCase()) {
    case 'submitted': return 'status-submitted';
    case 'in progress': return 'status-in-progress';
    case 'resolved': return 'status-resolved';
    case 'appeal to resolve': return 'status-appeal-to-resolve';
    default: return 'status-submitted';
  }
};

// Build table row for a complaint
const buildRow = (complaint) => {
  const row = document.createElement('tr');
  row.dataset.complaintId = complaint.id;

  const addCell = (content, className) => {
    const cell = document.createElement('td');
    if (className) cell.classList.add(className);
    if (content instanceof Node) {
      cell.appendChild(content);
    } else {
      cell.textContent = content ?? '—';
    }
    row.appendChild(cell);
  };

  // Index
  complaintIndex++;
  addCell(complaintIndex.toString(), 'index-cell');

  // ID
  addCell(complaint.id ?? '—');

  // Created Date
  addCell(formatDate(complaint.createdAt || complaint.submittedAt));

  // Main Category
  const mainCategory = complaint.mainCategory 
    ? complaint.mainCategory.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    : (complaint.category ?? '—');
  addCell(mainCategory);

  // Sub-Category
  const subCategory = complaint.subCategory 
    ? complaint.subCategory.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    : '—';
  addCell(subCategory);

  // Status Badge
  const statusBadge = document.createElement('span');
  statusBadge.className = `status-badge ${statusClass(complaint.status)}`;
  statusBadge.textContent = complaint.status ?? 'Unknown';
  addCell(statusBadge);

  // Complainer Info
  const complainerInfo = complaint.userPhone 
    ? `${complaint.userPhone}${complaint.userName ? `\n${complaint.userName}` : ''}`
    : '—';
  addCell(complainerInfo, 'complainer-info');

  // Location
  addCell(formatLocation(complaint.location), 'location');

  // Description
  addCell(complaint.description ?? '—', 'description');

  // Image
  if (complaint.image?.url) {
    const link = document.createElement('a');
    link.href = `${API_BASE_URL}${complaint.image.url}`;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = complaint.image.originalName ?? 'View';
    addCell(link);
  } else {
    addCell('—');
  }

  // Forwarded At
  addCell(formatDate(complaint.forwardedAt));

  // Actions
  const actionsDropdown = document.createElement('div');
  actionsDropdown.className = 'actions-dropdown';

  const actionsBtn = document.createElement('button');
  actionsBtn.className = 'actions-btn';
  actionsBtn.textContent = '⋮';
  actionsBtn.type = 'button';

  const actionsMenu = document.createElement('div');
  actionsMenu.className = 'actions-menu';

  const statusAction = document.createElement('button');
  statusAction.className = 'action-item';
  statusAction.innerHTML = '🔄 Change Status';
  statusAction.onclick = () => openStatusModal(complaint);

  actionsMenu.appendChild(statusAction);

  actionsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.actions-menu.show').forEach(m => m.classList.remove('show'));
    actionsMenu.classList.toggle('show');
  });

  actionsDropdown.appendChild(actionsBtn);
  actionsDropdown.appendChild(actionsMenu);

  addCell(actionsDropdown, 'col-actions');

  return row;
};

// Render complaints table
const renderComplaints = () => {
  if (!tableBody) return;
  tableBody.innerHTML = '';
  complaintIndex = 0;

  const statusFilter = document.querySelector('[data-role="status-filter"]')?.value || '';

  let filteredComplaints = assignedComplaints;
  if (statusFilter) {
    filteredComplaints = assignedComplaints.filter(c => c.status === statusFilter);
  }

  if (filteredComplaints.length === 0) {
    const emptyRow = document.createElement('tr');
    const emptyCell = document.createElement('td');
    emptyCell.colSpan = 12;
    emptyCell.textContent = statusFilter 
      ? `No ${statusFilter.toLowerCase()} complaints assigned to you`
      : 'No complaints assigned to you yet';
    emptyCell.style.textAlign = 'center';
    emptyCell.style.padding = '2rem';
    emptyRow.appendChild(emptyCell);
    tableBody.appendChild(emptyRow);
    setMessage(`No complaints found`, 'info');
    return;
  }

  filteredComplaints.forEach(complaint => {
    tableBody.appendChild(buildRow(complaint));
  });

  setMessage(`Showing ${filteredComplaints.length} assigned complaint(s)`, 'success');
};

// Update statistics
const updateStats = () => {
  const totalEl = document.querySelector('[data-stat="total"]');
  const inProgressEl = document.querySelector('[data-stat="in-progress"]');
  const resolvedEl = document.querySelector('[data-stat="resolved"]');

  const total = assignedComplaints.length;
  const inProgress = assignedComplaints.filter(c => c.status === 'In Progress').length;
  const resolved = assignedComplaints.filter(c => c.status === 'Resolved').length;

  if (totalEl) totalEl.textContent = total;
  if (inProgressEl) inProgressEl.textContent = inProgress;
  if (resolvedEl) resolvedEl.textContent = resolved;
};

// Load assigned complaints
const loadAssignedComplaints = async () => {
  const userPhone = localStorage.getItem('userPhone');

  try {
    if (refreshBtn) refreshBtn.disabled = true;
    setMessage('Loading assigned complaints…', 'info');

    const response = await fetch(`${API_BASE_URL}/api/complaints/assigned/${encodeURIComponent(userPhone)}`);

    if (!response.ok) {
      throw new Error('Failed to load assigned complaints');
    }

    const data = await response.json();
    assignedComplaints = data.complaints || [];

    updateStats();
    renderComplaints();
  } catch (error) {
    console.error('Error loading complaints:', error);
    setMessage('Failed to load complaints. Please try again.', 'error');
  } finally {
    if (refreshBtn) refreshBtn.disabled = false;
  }
};

// Open status modal
const openStatusModal = (complaint) => {
  currentComplaint = complaint;
  const modal = document.getElementById('status-modal');
  const statusSelect = document.querySelector('[data-role="status-select"]');
  const proofGroup = document.getElementById('proof-upload-group');

  if (statusSelect) {
    statusSelect.value = complaint.status || '';
    // Show/hide proof upload based on current selection
    if (proofGroup) {
      proofGroup.style.display = statusSelect.value === 'Appeal to Resolve' ? 'block' : 'none';
    }
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
  currentComplaint = null;
  
  // Reset proof group
  const proofGroup = document.getElementById('proof-upload-group');
  if (proofGroup) proofGroup.style.display = 'none';
};

// Confirm status change
const confirmStatusChange = async () => {
  if (!currentComplaint) return;

  const statusSelect = document.querySelector('[data-role="status-select"]');
  const newStatus = statusSelect?.value;

  if (!newStatus) {
    alert('Please select a status');
    return;
  }

  // Check if proof image is required for Appeal to Resolve
  const proofInput = document.querySelector('[data-role="proof-image"]');
  if (newStatus === 'Appeal to Resolve' && (!proofInput || !proofInput.files[0])) {
    alert('Please upload a proof of work image for Appeal to Resolve');
    return;
  }

  const adminPhone = localStorage.getItem('userPhone');
  const confirmBtn = document.querySelector('[data-role="confirm-status"]');

  try {
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Updating...';

    // Use FormData to send both status and image
    const formData = new FormData();
    formData.append('status', newStatus);
    formData.append('adminPhone', adminPhone);
    
    if (newStatus === 'Appeal to Resolve' && proofInput?.files[0]) {
      formData.append('proofImage', proofInput.files[0]);
    }

    const response = await fetch(`${API_BASE_URL}/api/complaints/${currentComplaint.id}/status`, {
      method: 'PATCH',
      body: formData
    });

    const result = await response.json();

    if (response.ok && result.success) {
      alert(`✅ Status updated to ${newStatus}`);
      closeStatusModal();
      loadAssignedComplaints();
    } else {
      alert(`❌ ${result.message || result.error || 'Failed to update status'}`);
    }
  } catch (error) {
    console.error('Status update error:', error);
    alert('❌ Failed to update status. Please try again.');
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.textContent = 'Update Status';
  }
};

// Close dropdown when clicking outside
document.addEventListener('click', () => {
  document.querySelectorAll('.actions-menu.show').forEach(m => m.classList.remove('show'));
});

// Event listeners
document.addEventListener('DOMContentLoaded', async () => {
  const isAdmin = await checkAdminAccess();
  if (isAdmin) {
    await loadAssignedComplaints();
  }
});

// Refresh button
refreshBtn?.addEventListener('click', loadAssignedComplaints);

// Status filter
document.querySelector('[data-role="status-filter"]')?.addEventListener('change', renderComplaints);

// Status select change - show/hide proof upload
document.querySelector('[data-role="status-select"]')?.addEventListener('change', (e) => {
  const proofGroup = document.getElementById('proof-upload-group');
  if (proofGroup) {
    proofGroup.style.display = e.target.value === 'Appeal to Resolve' ? 'block' : 'none';
  }
});

// Modal close buttons
document.querySelectorAll('[data-role="close-modal"]').forEach(btn => {
  btn.addEventListener('click', closeStatusModal);
});

// Confirm status button
document.querySelector('[data-role="confirm-status"]')?.addEventListener('click', confirmStatusChange);

// Close modal on outside click
document.getElementById('status-modal')?.addEventListener('click', (e) => {
  if (e.target.id === 'status-modal') {
    closeStatusModal();
  }
});
