/**
 * Emergency fix for login/register buttons
 * This file provides a fallback if the main modules fail to load
 */

console.log('🔧 Loading emergency auth button fix...');

// Wait for DOM to be ready
function initAuthButtons() {
    console.log('🔧 Initializing auth buttons...');
    
    // Check if elements exist
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const loginModal = document.getElementById('login-modal');
    const registerModal = document.getElementById('register-modal');
    
    console.log('Elements found:', {
        loginBtn: !!loginBtn,
        registerBtn: !!registerBtn,
        loginModal: !!loginModal,
        registerModal: !!registerModal
    });
    
    // Show modal function
    function showModal(modalName) {
        console.log(`Showing modal: ${modalName}`);
        const modal = document.getElementById(modalName + '-modal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('active');
            document.body.classList.add('modal-open');
            
            // Focus first input
            const firstInput = modal.querySelector('input');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
            
            console.log(`Modal ${modalName} opened successfully`);
        } else {
            console.error(`Modal ${modalName} not found`);
        }
    }
    
    // Hide modal function
    function hideModal(modalName) {
        console.log(`Hiding modal: ${modalName}`);
        const modal = document.getElementById(modalName + '-modal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
            document.body.classList.remove('modal-open');
            console.log(`Modal ${modalName} closed successfully`);
        } else {
            console.error(`Modal ${modalName} not found`);
        }
    }
    
    // Show toast function
    function showToast(message, type = 'info') {
        console.log(`Toast: ${message} (${type})`);
        
        const toast = document.getElementById('toast');
        if (toast) {
            const toastContent = toast.querySelector('.toast-content');
            const toastIcon = toast.querySelector('.toast-icon');
            const toastMessage = toast.querySelector('.toast-message');
            
            // Set message
            if (toastMessage) {
                toastMessage.textContent = message;
            }
            
            // Set icon based on type
            if (toastIcon) {
                toastIcon.className = 'toast-icon';
                if (type === 'success') {
                    toastIcon.className += ' fas fa-check-circle';
                } else if (type === 'error') {
                    toastIcon.className += ' fas fa-exclamation-triangle';
                } else {
                    toastIcon.className += ' fas fa-info-circle';
                }
            }
            
            // Show toast
            toast.className = `toast show ${type}`;
            
            // Hide after 3 seconds
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        } else {
            // Fallback to alert if toast not found
            alert(message);
        }
    }
    
    // Simple config for API calls
    const API_BASE_URL = window.location.origin.replace(':80', ':8000');
    
    // Handle login
    async function handleLogin(e) {
        e.preventDefault();
        console.log('Handling login...');
        
        const form = e.target;
        const formData = new FormData(form);
        const username = formData.get('username');
        const password = formData.get('password');
        
        if (!username || !password) {
            showToast('Please fill in all fields', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Store token and user data
                localStorage.setItem('artparty_social_token', data.access_token);
                localStorage.setItem('artparty_social_user', JSON.stringify(data.user));
                
                // Update UI
                updateNavigation(true, data.user);
                hideModal('login');
                showToast(`Welcome back, ${data.user.first_name}!`, 'success');
                
                // Show canvas section
                showSection('canvas');
                
            } else {
                showToast(data.detail || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            showToast('Login failed. Please try again.', 'error');
        }
    }
    
    // Handle register
    async function handleRegister(e) {
        e.preventDefault();
        console.log('Handling register...');
        
        const form = e.target;
        const formData = new FormData(form);
        const username = formData.get('username');
        const email = formData.get('email');
        const firstName = formData.get('first_name');
        const lastName = formData.get('last_name');
        const password = formData.get('password');
        const confirmPassword = formData.get('confirm_password');
        
        if (!username || !email || !firstName || !lastName || !password || !confirmPassword) {
            showToast('Please fill in all fields', 'error');
            return;
        }
        
        if (password !== confirmPassword) {
            showToast('Passwords do not match', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    username, 
                    email, 
                    password, 
                    first_name: firstName,
                    last_name: lastName
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Store token and user data
                localStorage.setItem('artparty_social_token', data.access_token);
                localStorage.setItem('artparty_social_user', JSON.stringify(data.user));
                
                // Update UI
                updateNavigation(true, data.user);
                hideModal('register');
                showToast(`Welcome to StellarArtCollab, ${data.user.first_name}!`, 'success');
                
                // Show canvas section
                showSection('canvas');
                
            } else {
                showToast(data.detail || 'Registration failed', 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            showToast('Registration failed. Please try again.', 'error');
        }
    }
    
    // Update navigation
    function updateNavigation(isAuthenticated, user) {
        console.log('Updating navigation:', { isAuthenticated, user });
        
        const loginBtn = document.getElementById('login-btn');
        const registerBtn = document.getElementById('register-btn');
        const userInfo = document.getElementById('user-info');
        const username = document.getElementById('username');
        
        if (isAuthenticated && user) {
            // Show authenticated state
            if (loginBtn) loginBtn.style.display = 'none';
            if (registerBtn) registerBtn.style.display = 'none';
            if (userInfo) {
                userInfo.style.display = 'flex';
                userInfo.classList.remove('hidden');
            }
            if (username) username.textContent = user.username;
        } else {
            // Show unauthenticated state
            if (loginBtn) loginBtn.style.display = 'inline-block';
            if (registerBtn) registerBtn.style.display = 'inline-block';
            if (userInfo) {
                userInfo.style.display = 'none';
                userInfo.classList.add('hidden');
            }
        }
    }
    
    // Show section
    function showSection(sectionName) {
        console.log('Showing section:', sectionName);
        
        // Hide all sections
        const sections = document.querySelectorAll('section');
        sections.forEach(section => {
            section.classList.add('hidden');
        });
        
        // Show target section
        const targetSection = document.getElementById(sectionName + '-section');
        if (targetSection) {
            targetSection.classList.remove('hidden');
        }
    }
    
    // Set up event listeners
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            console.log('Login button clicked');
            showModal('login');
        });
        console.log('Login button listener added');
    }
    
    if (registerBtn) {
        registerBtn.addEventListener('click', () => {
            console.log('Register button clicked');
            showModal('register');
        });
        console.log('Register button listener added');
    }
    
    // Form submissions
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
        console.log('Login form listener added');
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
        console.log('Register form listener added');
    }
    
    // Modal close buttons
    const closeButtons = document.querySelectorAll('.close-btn');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) {
                const modalName = modal.id.replace('-modal', '');
                hideModal(modalName);
            }
        });
    });
    
    // Click outside modal to close
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            const modalName = e.target.id.replace('-modal', '');
            hideModal(modalName);
        }
    });
    
    // Escape key to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const activeModal = document.querySelector('.modal.active');
            if (activeModal) {
                const modalName = activeModal.id.replace('-modal', '');
                hideModal(modalName);
            }
        }
    });
    
    // Check for existing authentication
    const token = localStorage.getItem('artparty_social_token');
    const userData = localStorage.getItem('artparty_social_user');
    
    if (token && userData) {
        try {
            const user = JSON.parse(userData);
            updateNavigation(true, user);
            showSection('canvas');
        } catch (e) {
            console.error('Error parsing user data:', e);
            localStorage.removeItem('artparty_social_token');
            localStorage.removeItem('artparty_social_user');
        }
    }
    
    // Make functions available globally
    window.emergencyAuth = {
        showModal,
        hideModal,
        showToast,
        handleLogin,
        handleRegister,
        updateNavigation,
        showSection
    };
    
    console.log('✅ Emergency auth button fix loaded successfully');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuthButtons);
} else {
    initAuthButtons();
} 