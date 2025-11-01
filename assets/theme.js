// Theme Toggle Functionality
(function() {
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = themeToggle?.querySelector('.theme-icon');
  const html = document.documentElement;

  // Load saved theme or default to dark
  const savedTheme = localStorage.getItem('theme') || 'dark';
  
  // Apply theme on load
  function applyTheme(theme) {
    if (theme === 'light') {
      html.setAttribute('data-theme', 'light');
      if (themeIcon) themeIcon.textContent = '☀️';
    } else {
      html.removeAttribute('data-theme');
      if (themeIcon) themeIcon.textContent = '🌙';
    }
  }

  // Initialize theme
  applyTheme(savedTheme);

  // Toggle theme on click
  themeToggle?.addEventListener('click', () => {
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Add a small animation
    themeToggle.style.transform = 'rotate(360deg)';
    setTimeout(() => {
      themeToggle.style.transform = '';
    }, 300);
  });
})();
