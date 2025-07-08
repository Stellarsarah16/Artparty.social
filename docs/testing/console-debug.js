// Debug authentication state - paste this into browser console
console.log('=== Authentication Debug ===');

// Check local storage
const token = localStorage.getItem('artparty_social_token');
const userData = localStorage.getItem('artparty_social_user');

console.log('Stored token:', token ? 'Present' : 'Missing');
console.log('Stored user data:', userData ? 'Present' : 'Missing');

if (userData) {
    try {
        const user = JSON.parse(userData);
        console.log('User data:', user);
    } catch (e) {
        console.error('Error parsing user data:', e);
    }
}

// Check navigation elements
const navigationElements = {
    loginBtn: document.getElementById('login-btn'),
    registerBtn: document.getElementById('register-btn'),
    userInfo: document.getElementById('user-info'),
    username: document.getElementById('username'),
    logoutBtn: document.getElementById('logout-btn'),
    profileBtn: document.getElementById('profile-btn')
};

console.log('Navigation elements found:');
Object.entries(navigationElements).forEach(([key, element]) => {
    console.log(`  ${key}:`, element ? 'Found' : 'Missing');
    if (element) {
        const styles = window.getComputedStyle(element);
        console.log(`    Display: ${styles.display}`);
        console.log(`    Visibility: ${styles.visibility}`);
        console.log(`    Hidden class: ${element.classList.contains('hidden')}`);
        console.log(`    Parent element:`, element.parentElement);
    }
});

// Test authentication API if token exists
if (token) {
    console.log('\nTesting API authentication...');
    fetch('http://localhost:8000/api/v1/auth/me', {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        console.log('API Response status:', response.status);
        return response.json();
    })
    .then(data => {
        console.log('API Response data:', data);
        if (data.username) {
            console.log('✅ User is authenticated with API');
            
            // Force show user info
            const userInfo = document.getElementById('user-info');
            if (userInfo) {
                userInfo.classList.remove('hidden');
                userInfo.style.display = 'flex';
                console.log('Forced user-info to show');
            }
            
            // Hide login/register buttons
            const loginBtn = document.getElementById('login-btn');
            const registerBtn = document.getElementById('register-btn');
            if (loginBtn) loginBtn.style.display = 'none';
            if (registerBtn) registerBtn.style.display = 'none';
            
            console.log('Navigation manually updated');
        } else {
            console.log('❌ User is not authenticated with API');
        }
    })
    .catch(error => {
        console.error('API Error:', error);
    });
} else {
    console.log('No token found - user is not authenticated');
}

console.log('=== Debug Complete ==='); 