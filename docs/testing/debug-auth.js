// Debug authentication state
console.log('=== Authentication Debug ===');

// Check if CONFIG_UTILS exists
console.log('CONFIG_UTILS available:', typeof window.CONFIG_UTILS !== 'undefined');

// Get token and user data
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

// Check app state
import appState from './frontend/js/modules/app-state.js';
console.log('App state authenticated:', appState.get('isAuthenticated'));
console.log('App state user:', appState.get('currentUser'));

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
    }
});

// Force navigation update
console.log('\nForcing navigation update...');
import navigationManager from './frontend/js/modules/navigation.js';
navigationManager.updateNavigation();

// Check if user is really authenticated by calling the API
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
            
            // Force app state update
            appState.setAuthenticated(data);
            console.log('App state updated, checking navigation again...');
            navigationManager.updateNavigation();
        } else {
            console.log('❌ User is not authenticated with API');
        }
    })
    .catch(error => {
        console.error('API Error:', error);
    });
}

console.log('=== Debug Complete ==='); 