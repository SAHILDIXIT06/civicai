// Check authentication
const checkAuth = () => {
  const userPhone = localStorage.getItem('userPhone');
  const userId = localStorage.getItem('userId');
  const userRole = localStorage.getItem('userRole');
  
  if (!userPhone || !userId) {
    window.location.href = './login.html';
    return false;
  }
  
  return { userPhone, userId, userRole };
};

const auth = checkAuth();
if (!auth) {
  throw new Error('Authentication required');
}

// DOM elements
const profileForm = document.getElementById('profile-form');
const photoInput = document.getElementById('photo-input');
const profilePhoto = document.getElementById('profile-photo');
const userNameInput = document.getElementById('user-name');
const userPhoneInput = document.getElementById('user-phone');
const userAddressInput = document.getElementById('user-address');
const saveBtn = document.getElementById('save-profile-btn');
const cancelBtn = document.getElementById('cancel-btn');
const profileStatus = document.getElementById('profile-status');
const logoutBtn = document.getElementById('logout-btn');

let hasChanges = false;
let currentProfileData = {};

const setStatus = (message, type = 'info') => {
  if (!profileStatus) return;
  profileStatus.hidden = false;
  profileStatus.textContent = message;
  profileStatus.className = `profile-status ${type}`;
};

const trackChanges = () => {
  hasChanges = true;
  if (saveBtn) {
    saveBtn.disabled = false;
  }
};

const resetChanges = () => {
  hasChanges = false;
  if (saveBtn) {
    saveBtn.disabled = true;
  }
};

// Load user profile
const loadProfile = () => {
  const mockUsers = JSON.parse(localStorage.getItem('mockUsers') || '{}');
  const user = mockUsers[auth.userPhone];
  
  if (!user) {
    mockUsers[auth.userPhone] = {
      id: auth.userId,
      phone: auth.userPhone,
      role: localStorage.getItem('userRole') || 'citizen',
      createdAt: new Date().toISOString(),
      profile: {
        name: '',
        address: '',
        profilePhoto: null
      }
    };
    localStorage.setItem('mockUsers', JSON.stringify(mockUsers));
    currentProfileData = mockUsers[auth.userPhone].profile;
  } else {
    currentProfileData = user.profile || {
      name: '',
      address: '',
      profilePhoto: null
    };
  }
  
  if (userNameInput) userNameInput.value = currentProfileData.name || '';
  if (userPhoneInput) userPhoneInput.value = auth.userPhone;
  if (userAddressInput) userAddressInput.value = currentProfileData.address || '';
  
  if (profilePhoto) {
    if (currentProfileData.profilePhoto) {
      profilePhoto.src = currentProfileData.profilePhoto;
    } else {
      const initials = (currentProfileData.name || auth.userPhone.slice(-4))
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      
      const canvas = document.createElement('canvas');
      canvas.width = 120;
      canvas.height = 120;
      const ctx = canvas.getContext('2d');
      
      const gradient = ctx.createLinearGradient(0, 0, 120, 120);
      gradient.addColorStop(0, '#3B82F6');
      gradient.addColorStop(1, '#1E40AF');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 120, 120);
      
      ctx.fillStyle = 'white';
      ctx.font = 'bold 40px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(initials, 60, 60);
      
      profilePhoto.src = canvas.toDataURL();
    }
  }
  
  resetChanges();
};

if (photoInput && profilePhoto) {
  photoInput.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      setStatus('File size must be less than 5MB', 'error');
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      setStatus('Please select a valid image file', 'error');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      profilePhoto.src = dataUrl;
      currentProfileData.profilePhoto = dataUrl;
      trackChanges();
      setStatus('Photo updated (remember to save changes)', 'info');
    };
    reader.readAsDataURL(file);
  });
}

if (userNameInput) {
  userNameInput.addEventListener('input', () => {
    trackChanges();
    if (profileStatus) profileStatus.hidden = true;
  });
}

if (userAddressInput) {
  userAddressInput.addEventListener('input', () => {
    trackChanges();
    if (profileStatus) profileStatus.hidden = true;
  });
}

if (profileForm) {
  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!hasChanges) {
      setStatus('No changes to save', 'info');
      return;
    }
    
    try {
      saveBtn.disabled = true;
      setStatus('Saving profile...', 'info');
      
      const updatedProfile = {
        name: userNameInput?.value?.trim() || '',
        address: userAddressInput?.value?.trim() || '',
        profilePhoto: currentProfileData.profilePhoto
      };
      
      const mockUsers = JSON.parse(localStorage.getItem('mockUsers') || '{}');
      if (mockUsers[auth.userPhone]) {
        mockUsers[auth.userPhone].profile = updatedProfile;
        localStorage.setItem('mockUsers', JSON.stringify(mockUsers));
        
        currentProfileData = updatedProfile;
        setStatus('Profile saved successfully!', 'success');
        resetChanges();
        
        setTimeout(() => {
          if (profileStatus) profileStatus.hidden = true;
        }, 3000);
      } else {
        throw new Error('User profile not found');
      }
      
    } catch (error) {
      console.error('Error saving profile:', error);
      setStatus('Failed to save profile. Please try again.', 'error');
      saveBtn.disabled = false;
    }
  });
}

if (cancelBtn) {
  cancelBtn.addEventListener('click', () => {
    if (hasChanges) {
      const confirmDiscard = confirm('Are you sure you want to discard your changes?');
      if (!confirmDiscard) return;
    }
    
    loadProfile();
    if (profileStatus) profileStatus.hidden = true;
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    if (hasChanges) {
      const confirmLogout = confirm('You have unsaved changes. Are you sure you want to logout?');
      if (!confirmLogout) return;
    }
    
    localStorage.removeItem('userPhone');
    localStorage.removeItem('userId');
    localStorage.removeItem('userRole');
    window.location.href = './login.html';
  });
}

window.addEventListener('beforeunload', (e) => {
  if (hasChanges) {
    e.preventDefault();
    e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
  }
});

document.addEventListener('DOMContentLoaded', () => {
  loadProfile();
});