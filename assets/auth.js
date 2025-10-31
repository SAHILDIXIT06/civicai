// Simplified auth system with role-based access
let mockUsers = JSON.parse(localStorage.getItem('mockUsers') || '{}');
let sentCodes = JSON.parse(sessionStorage.getItem('sentCodes') || '{}');

const phoneForm = document.getElementById('phone-form');
const verifyForm = document.getElementById('verify-form');
const countryCode = document.getElementById('country-code');
const phoneNumber = document.getElementById('phone-number');
const verificationCode = document.getElementById('verification-code');
const sendCodeBtn = document.getElementById('send-code-btn');
const verifyCodeBtn = document.getElementById('verify-code-btn');
const resendCodeBtn = document.getElementById('resend-code-btn');
const authStatus = document.getElementById('auth-status');
const roleOptions = document.querySelectorAll('input[name="role"]');

let currentPhoneNumber = '';
let selectedRole = 'citizen'; // default role

const API_BASE_URL = "http://localhost:4000";

// Admin phone numbers (will be fetched from backend)
let adminPhones = [];

// Fetch admin phones from backend
const fetchAdminPhones = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin-phones`);
    if (response.ok) {
      const data = await response.json();
      adminPhones = data.adminPhones || [];
    }
  } catch (error) {
    console.error('Failed to fetch admin phones:', error);
    // Fallback to hardcoded list
    adminPhones = ['+917058346137', '+919876543210'];
  }
};

// Track selected role
roleOptions.forEach(radio => {
  radio.addEventListener('change', (e) => {
    selectedRole = e.target.value;
  });
});

const setStatus = (message, type = 'info') => {
  authStatus.textContent = message;
  authStatus.dataset.tone = type;
};

const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendVerificationCode = async (fullPhoneNumber) => {
  try {
    setStatus('Sending verification code...', 'info');
    sendCodeBtn.disabled = true;
    
    // Generate a 6-digit code
    const code = generateCode();
    
    // Store the code temporarily
    sentCodes[fullPhoneNumber] = {
      code: code,
      timestamp: Date.now(),
      attempts: 0,
      role: selectedRole
    };
    sessionStorage.setItem('sentCodes', JSON.stringify(sentCodes));
    
    // Simulate sending delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    phoneForm.hidden = true;
    verifyForm.hidden = false;
    
    // Show the code in status for demo purposes
    setStatus(`Code sent! Demo code: ${code}`, 'success');
    
    currentPhoneNumber = fullPhoneNumber;
    
  } catch (error) {
    console.error('Error sending code:', error);
    setStatus(`Error: ${error.message}`, 'error');
    sendCodeBtn.disabled = false;
  }
};

const verifyCode = async (code) => {
  try {
    setStatus('Verifying code...', 'info');
    verifyCodeBtn.disabled = true;
    
    const sentCode = sentCodes[currentPhoneNumber];
    
    if (!sentCode) {
      throw new Error('No code found. Please request a new code.');
    }
    
    // Check if code is expired (5 minutes)
    if (Date.now() - sentCode.timestamp > 5 * 60 * 1000) {
      throw new Error('Code expired. Please request a new code.');
    }
    
    // Check attempts
    if (sentCode.attempts >= 3) {
      throw new Error('Too many attempts. Please request a new code.');
    }
    
    if (code !== sentCode.code) {
      sentCode.attempts++;
      sessionStorage.setItem('sentCodes', JSON.stringify(sentCodes));
      throw new Error('Invalid code. Please try again.');
    }
    
    // Check if admin role is selected
    const requestedRole = sentCode.role;
    
    if (requestedRole === 'admin') {
      // Verify if phone number is in admin list
      if (!adminPhones.includes(currentPhoneNumber)) {
        throw new Error('Access denied. You are not authorized for admin access.');
      }
    }
    
    // Successful verification
    const userId = `user_${Date.now()}`;
    const authToken = btoa(`${userId}:${currentPhoneNumber}:${Date.now()}`);
    
    // Store or update user
    if (!mockUsers[currentPhoneNumber]) {
      mockUsers[currentPhoneNumber] = {
        id: userId,
        phone: currentPhoneNumber,
        role: requestedRole,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        profile: {
          name: '',
          address: '',
          profilePhoto: null
        }
      };
    } else {
      // Update existing user
      mockUsers[currentPhoneNumber].lastLogin = new Date().toISOString();
      mockUsers[currentPhoneNumber].role = requestedRole;
    }
    
    localStorage.setItem('mockUsers', JSON.stringify(mockUsers));
    
    // Store session
    localStorage.setItem('authToken', authToken);
    localStorage.setItem('userPhone', currentPhoneNumber);
    localStorage.setItem('userId', userId);
    localStorage.setItem('userRole', requestedRole);
    
    // Clean up
    delete sentCodes[currentPhoneNumber];
    sessionStorage.setItem('sentCodes', JSON.stringify(sentCodes));
    
    setStatus('Login successful! Redirecting...', 'success');
    
    // Redirect based on role
    setTimeout(() => {
      if (requestedRole === 'admin') {
        window.location.href = './admin.html';
      } else {
        window.location.href = './dashboard.html';
      }
    }, 1500);
    
  } catch (error) {
    console.error('Error verifying code:', error);
    setStatus(error.message, 'error');
    verifyCodeBtn.disabled = false;
  }
};

phoneForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const phone = phoneNumber.value.trim();
  const country = countryCode.value;
  
  if (phone.length < 10) {
    setStatus('Please enter a valid mobile number', 'error');
    return;
  }
  
  const fullPhoneNumber = `${country}${phone}`;
  sendVerificationCode(fullPhoneNumber);
});

verifyForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const code = verificationCode.value.trim();
  
  if (code.length !== 6) {
    setStatus('Please enter the 6-digit verification code', 'error');
    return;
  }
  
  verifyCode(code);
});

resendCodeBtn.addEventListener('click', () => {
  phoneForm.hidden = false;
  verifyForm.hidden = true;
  setStatus('Enter your number to resend code', 'info');
  sendCodeBtn.disabled = false;
  verifyCodeBtn.disabled = false;
});

// Check if already logged in
document.addEventListener('DOMContentLoaded', async () => {
  await fetchAdminPhones();
  
  const authToken = localStorage.getItem('authToken');
  const userRole = localStorage.getItem('userRole');
  
  if (authToken) {
    if (userRole === 'admin') {
      window.location.href = './admin.html';
    } else {
      window.location.href = './dashboard.html';
    }
  }
});