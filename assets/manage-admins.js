// Backend API base URL
const API_BASE_URL = localStorage.getItem('apiBaseUrl') || `http://${window.location.hostname}:4000`;

let currentAdmins = [];
let currentUserPhone = '';
let allDepartments = [];

// Check admin access
const checkAdminAccess = async () => {
  const userPhone = localStorage.getItem('userPhone');
  const userRole = localStorage.getItem('userRole');
  
  if (!userPhone || userRole !== 'admin') {
    alert('Access denied. Admin privileges required.');
    window.location.href = './login.html';
    return false;
  }

  currentUserPhone = userPhone;

  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/check?phone=${encodeURIComponent(userPhone)}`);
    const data = await response.json();
    
    if (!response.ok || !data.isAdmin) {
      alert('Access Denied: You do not have admin privileges.');
      window.location.href = './index.html';
      return false;
    }
    
    // Check permission to manage admins
    if (data.canManageAdmins === false) {
      alert('Access Denied: You do not have permission to manage administrators.');
      window.location.href = './admin-portal.html';
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

// Show message
const showMessage = (text, type = 'info') => {
  const container = document.getElementById('message-container');
  const messageEl = document.createElement('div');
  messageEl.className = `message ${type}`;
  messageEl.textContent = text;
  container.innerHTML = '';
  container.appendChild(messageEl);
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    messageEl.remove();
  }, 5000);
};

// Load departments
const loadDepartments = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/departments`);
    if (!response.ok) return;
    const data = await response.json();
    allDepartments = data.departments || [];

    // Populate select
    const select = document.getElementById('admin-dept');
    if (select) {
      // Clear existing except placeholder
      select.querySelectorAll('option:not(:first-child)')?.forEach(o => o.remove());
      allDepartments.forEach(dept => {
        const opt = document.createElement('option');
        opt.value = dept.id;
        opt.textContent = dept.name;
        select.appendChild(opt);
      });
    }
  } catch (e) {
    console.error('Failed to load departments', e);
  }
};

// Load admins
const loadAdmins = async () => {
  const container = document.getElementById('admins-list-container');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/admins`);
    
    if (!response.ok) {
      throw new Error('Failed to load administrators');
    }
    
    const data = await response.json();
    currentAdmins = data.admins || [];
    
    renderAdminsTable();
  } catch (error) {
    console.error('Error loading admins:', error);
    container.innerHTML = '<p class="empty-state" style="color: #ef4444;">Failed to load administrators. Please try again.</p>';
  }
};

// Render admins table
const renderAdminsTable = () => {
  const container = document.getElementById('admins-list-container');
  
  if (currentAdmins.length === 0) {
    container.innerHTML = '<p class="empty-state">No administrators found.</p>';
    return;
  }
  
  let tableHTML = `
    <table class="admins-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Mobile Number</th>
          <th>Department</th>
          <th>Access Permissions</th>
          <th>Added On</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  currentAdmins.forEach(admin => {
    const isCurrentUser = admin.phone === currentUserPhone;
    const addedDate = admin.addedAt ? new Date(admin.addedAt).toLocaleDateString() : 'N/A';
    const deptName = admin.departmentName || (allDepartments.find(d => d.id === admin.departmentId)?.name) || '—';
    
    // Access permissions (default to yes for backward compatibility)
    const canAccessComplaints = admin.canAccessComplaints !== false;
    const canManageAdmins = admin.canManageAdmins !== false;
    
    tableHTML += `
      <tr>
        <td>
          ${admin.name || 'N/A'}
          ${isCurrentUser ? '<span class="admin-badge">YOU</span>' : ''}
        </td>
        <td>${admin.phone}</td>
        <td>${deptName}</td>
        <td>
          <span class="access-badge ${canAccessComplaints ? 'yes' : 'no'}">
            Complaints: ${canAccessComplaints ? 'Yes' : 'No'}
          </span>
          <span class="access-badge ${canManageAdmins ? 'yes' : 'no'}">
            Manage Admins: ${canManageAdmins ? 'Yes' : 'No'}
          </span>
        </td>
        <td>${addedDate}</td>
        <td class="action-buttons">
          <button 
            class="btn-edit" 
            onclick="openEditModal('${admin.phone}')"
            ${isCurrentUser ? 'disabled title="Cannot edit your own permissions"' : ''}
          >
            ✏️ Edit
          </button>
          <button 
            class="btn-remove" 
            onclick="removeAdmin('${admin.phone}')"
            ${isCurrentUser ? 'disabled title="Cannot remove yourself"' : ''}
          >
            🗑️ Remove
          </button>
        </td>
      </tr>
    `;
  });
  
  tableHTML += `
      </tbody>
    </table>
  `;
  
  container.innerHTML = tableHTML;
};

// Add admin
const addAdmin = async (name, phone) => {
  const addBtn = document.getElementById('add-btn');
  
  try {
    addBtn.disabled = true;
    addBtn.textContent = 'Adding...';
    
    // Get access permissions
    const canAccessComplaints = document.getElementById('access-complaints')?.value === 'yes';
    const canManageAdmins = document.getElementById('access-manage-admins')?.value === 'yes';
    
    const response = await fetch(`${API_BASE_URL}/api/admins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name: name.trim(), 
        phone: phone.trim(),
        addedBy: currentUserPhone,
        departmentId: document.getElementById('admin-dept')?.value || null,
        canAccessComplaints,
        canManageAdmins
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      showMessage(`✅ ${result.message || 'Administrator added successfully!'}`, 'success');
      document.getElementById('add-admin-form').reset();
      await loadAdmins();
    } else {
      showMessage(`❌ ${result.error || 'Failed to add administrator'}`, 'error');
    }
  } catch (error) {
    console.error('Error adding admin:', error);
    showMessage('❌ Failed to add administrator. Please try again.', 'error');
  } finally {
    addBtn.disabled = false;
    addBtn.textContent = '+ Add Admin';
  }
};

// Remove admin
window.removeAdmin = async (phone) => {
  if (phone === currentUserPhone) {
    showMessage('❌ You cannot remove yourself from the admin list.', 'error');
    return;
  }
  
  const adminToRemove = currentAdmins.find(a => a.phone === phone);
  const confirmMsg = `Are you sure you want to remove ${adminToRemove?.name || phone} from administrators?`;
  
  if (!confirm(confirmMsg)) {
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/admins/${encodeURIComponent(phone)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ removedBy: currentUserPhone })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      showMessage(`✅ ${result.message || 'Administrator removed successfully!'}`, 'success');
      await loadAdmins();
    } else {
      showMessage(`❌ ${result.error || 'Failed to remove administrator'}`, 'error');
    }
  } catch (error) {
    console.error('Error removing admin:', error);
    showMessage('❌ Failed to remove administrator. Please try again.', 'error');
  }
};

// Open edit modal
window.openEditModal = (phone) => {
  if (phone === currentUserPhone) {
    showMessage('❌ You cannot edit your own permissions.', 'error');
    return;
  }
  
  const admin = currentAdmins.find(a => a.phone === phone);
  if (!admin) {
    showMessage('❌ Admin not found.', 'error');
    return;
  }
  
  // Populate modal fields
  document.getElementById('edit-admin-phone').value = admin.phone;
  document.getElementById('edit-admin-name').textContent = admin.name || admin.phone;
  document.getElementById('edit-access-complaints').value = admin.canAccessComplaints !== false ? 'yes' : 'no';
  document.getElementById('edit-access-manage-admins').value = admin.canManageAdmins !== false ? 'yes' : 'no';
  
  // Show modal
  document.getElementById('edit-modal').classList.add('show');
};

// Close edit modal
window.closeEditModal = () => {
  document.getElementById('edit-modal').classList.remove('show');
};

// Save admin permissions
window.saveAdminPermissions = async () => {
  const phone = document.getElementById('edit-admin-phone').value;
  const canAccessComplaints = document.getElementById('edit-access-complaints').value === 'yes';
  const canManageAdmins = document.getElementById('edit-access-manage-admins').value === 'yes';
  
  const saveBtn = document.getElementById('save-permissions-btn');
  
  try {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    
    const response = await fetch(`${API_BASE_URL}/api/admins/${encodeURIComponent(phone)}/permissions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        canAccessComplaints,
        canManageAdmins,
        updatedBy: currentUserPhone
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      showMessage(`✅ ${result.message || 'Permissions updated successfully!'}`, 'success');
      closeEditModal();
      await loadAdmins();
    } else {
      showMessage(`❌ ${result.error || 'Failed to update permissions'}`, 'error');
    }
  } catch (error) {
    console.error('Error updating permissions:', error);
    showMessage('❌ Failed to update permissions. Please try again.', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Changes';
  }
};

// Form submit handler
document.getElementById('add-admin-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const name = formData.get('name');
  const phone = formData.get('phone');
  
  if (!name || !phone) {
    showMessage('❌ Please fill in all fields', 'error');
    return;
  }
  
  await addAdmin(name, phone);
});

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  const isAdmin = await checkAdminAccess();
  if (isAdmin) {
    await loadDepartments();
    await loadAdmins();
  }
});
