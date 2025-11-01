// Auth system with built-in demo OTP (Firebase removed)
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

// Admin phone numbers
let adminPhones = ['+917058346137', '+919876543210'];

// Track selected role
roleOptions.forEach(radio => {
  radio.addEventListener('change', (e) => {
    selectedRole = e.target.value;
    console.log(`🔐 Role selected: ${selectedRole.toUpperCase()}`);
    
    // Visual feedback
    if (selectedRole === 'admin') {
      console.log('⚠️ ADMIN LOGIN: Make sure your phone number is in the admin list!');
    }
  });
});

const setStatus = (message, type = 'info') => {
  authStatus.textContent = message;
  authStatus.dataset.tone = type;
};

const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper: send a demo OTP and switch the flow to demo
const sendDemoCode = (fullPhoneNumber) => {
  console.log(`📞 Sending demo OTP for: ${fullPhoneNumber}`);
  console.log(`🎭 Login role: ${selectedRole.toUpperCase()}`);

  const code = '123456'; // Demo OTP
  sentCodes[fullPhoneNumber] = code;
  sessionStorage.setItem('sentCodes', JSON.stringify(sentCodes));

  setStatus('Demo OTP: 123456 (use this to login)', 'success');
  sendCodeBtn.disabled = true;
  sendCodeBtn.textContent = 'Code Sent!';

  phoneForm.hidden = true;
  verifyForm.hidden = false;
  currentPhoneNumber = fullPhoneNumber;

  console.log(`✅ Demo OTP ready: 123456`);
  console.log(`🔐 Role locked in: ${selectedRole}`);
};

const sendVerificationCode = async (fullPhoneNumber) => {
  // Demo flow only
  return sendDemoCode(fullPhoneNumber);
};

const verifyCode = async (code) => {
  const sentCode = sentCodes[currentPhoneNumber];

  if (!sentCode) {
    setStatus('No code sent. Please request a code first.', 'error');
    return;
  }

  if (code !== sentCode) {
    setStatus('Invalid code. Please try again.', 'error');
    return;
  }
  
  // Check admin authorization
  if (selectedRole === 'admin' && !adminPhones.includes(currentPhoneNumber)) {
    console.log('❌ Admin check failed:');
    console.log('   Current phone:', currentPhoneNumber);
    console.log('   Admin phones:', adminPhones);
    console.log('   Includes?', adminPhones.includes(currentPhoneNumber));
    setStatus('Access denied. Not authorized for admin access.', 'error');
    return;
  }
  
  console.log('✅ Admin check passed! Phone:', currentPhoneNumber);
  
  // Successful verification
  const userId = `user_${Date.now()}`;
  
  if (!mockUsers[currentPhoneNumber]) {
    mockUsers[currentPhoneNumber] = {
      id: userId,
      phone: currentPhoneNumber,
      role: selectedRole,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      profile: {
        name: '',
        address: '',
        profilePhoto: null
      }
    };
  } else {
    mockUsers[currentPhoneNumber].lastLogin = new Date().toISOString();
    mockUsers[currentPhoneNumber].role = selectedRole;
  }
  
  localStorage.setItem('mockUsers', JSON.stringify(mockUsers));
  localStorage.setItem('userPhone', currentPhoneNumber);
  localStorage.setItem('userId', userId);
  localStorage.setItem('userRole', selectedRole);
  
  console.log('✅ Login successful!');
  console.log('   Phone:', currentPhoneNumber);
  console.log('   Role:', selectedRole);
  
  delete sentCodes[currentPhoneNumber];
  sessionStorage.setItem('sentCodes', JSON.stringify(sentCodes));
  
  setStatus('✅ Login successful! Redirecting...', 'success');
  
  setTimeout(() => {
    if (selectedRole === 'admin') {
      window.location.href = './admin.html';
    } else {
      window.location.href = './dashboard.html';
    }
  }, 1000);
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
  setStatus('Enter your number to resend OTP', 'info');
  sendCodeBtn.disabled = false;
  sendCodeBtn.textContent = 'Send Verification Code';
  verifyCodeBtn.disabled = false;
  verifyCodeBtn.textContent = 'Verify & Login';
  resendCodeBtn.textContent = 'Resend Code';
  verificationCode.value = '';
});

// Check if already logged in
document.addEventListener('DOMContentLoaded', () => {
  const userPhone = localStorage.getItem('userPhone');
  const userRole = localStorage.getItem('userRole');
  
  if (userPhone && userRole) {
    if (userRole === 'admin') {
      window.location.href = './admin.html';
    } else {
      window.location.href = './dashboard.html';
    }
  }
});