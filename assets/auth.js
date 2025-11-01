// Auth system with Firebase Phone OTP (fallback to demo OTP if Firebase not configured)
let mockUsers = JSON.parse(localStorage.getItem('mockUsers') || '{}');
let sentCodes = JSON.parse(sessionStorage.getItem('sentCodes') || '{}');

let useFirebase = false;
let firebaseAuth = null;
let confirmationResult = null; // from signInWithPhoneNumber

// Try to load Firebase from CDN and initialize using local config
try {
  const [{ initializeApp }, { getAuth, RecaptchaVerifier, signInWithPhoneNumber } , firebaseConfig] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js'),
    import('./firebase-config.js')
  ]);

  // Basic validation — if placeholders are unchanged, skip Firebase path
  const hasRealConfig = firebaseConfig &&
    firebaseConfig.default &&
    !String(firebaseConfig.default.apiKey || '').startsWith('YOUR_');

  if (hasRealConfig) {
    const app = initializeApp(firebaseConfig.default);
    firebaseAuth = getAuth(app);
    firebaseAuth.useDeviceLanguage();

    // Prepare invisible reCAPTCHA on the page
    // Container is in login.html with id 'recaptcha-container'
    // It will auto-render on first use.
    // We attach constructor to window to avoid tree-shaking by the CDN modules
    // and so that Firebase can reference it internally.
    // eslint-disable-next-line no-new
    new RecaptchaVerifier(firebaseAuth, 'recaptcha-container', { size: 'invisible' });

    // Expose helper for later imports (optional)
    window.__firebaseAuth = { getAuth, RecaptchaVerifier, signInWithPhoneNumber };
    useFirebase = true;
    console.log('✅ Firebase Phone Auth enabled');
  } else {
    console.warn('⚠️ Firebase config has placeholders; using demo OTP instead.');
  }
} catch (err) {
  console.warn('⚠️ Firebase not configured or failed to load. Falling back to demo OTP.', err);
}

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

const sendVerificationCode = async (fullPhoneNumber) => {
  if (useFirebase && firebaseAuth && window.__firebaseAuth) {
    try {
      const { signInWithPhoneNumber } = window.__firebaseAuth;

      setStatus('Sending OTP...', 'info');
      const appVerifier = window.recaptchaVerifier || null;
      confirmationResult = await signInWithPhoneNumber(firebaseAuth, fullPhoneNumber, appVerifier);

      setStatus('OTP sent. Please check your phone.', 'success');
      sendCodeBtn.disabled = true;
      sendCodeBtn.textContent = 'Code Sent!';
      phoneForm.hidden = true;
      verifyForm.hidden = false;
      currentPhoneNumber = fullPhoneNumber;
      return;
    } catch (error) {
      console.error('Firebase send OTP failed:', error);
      setStatus(error.message || 'Failed to send OTP. Try again.', 'error');
      return;
    }
  }

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

const verifyCode = async (code) => {
  if (useFirebase && confirmationResult) {
    try {
      const result = await confirmationResult.confirm(code);
      const user = result.user;
      currentPhoneNumber = user.phoneNumber || currentPhoneNumber;
    } catch (error) {
      console.error('Firebase verify OTP failed:', error);
      setStatus(error.message || 'Invalid code. Please try again.', 'error');
      return;
    }
  }

  const sentCode = sentCodes[currentPhoneNumber];
  
  if (!sentCode) {
    if (!useFirebase) {
      setStatus('No code sent. Please request a code first.', 'error');
      return;
    }
  }
  
  if (!useFirebase && code !== sentCode) {
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
  
  if (!useFirebase) {
    delete sentCodes[currentPhoneNumber];
    sessionStorage.setItem('sentCodes', JSON.stringify(sentCodes));
  }
  
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