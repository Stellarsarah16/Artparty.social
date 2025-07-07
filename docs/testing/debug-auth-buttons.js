/**
 * Debug script for authentication buttons
 * Run this in the browser console to diagnose login/register button issues
 */

console.log('🔍 Starting authentication button debug...');

// Check if elements exist
function checkElements() {
    console.log('\n=== ELEMENT CHECK ===');
    
    const elements = [
        'login-btn',
        'register-btn',
        'login-form',
        'register-form',
        'login-modal',
        'register-modal'
    ];
    
    elements.forEach(id => {
        const element = document.getElementById(id);
        const found = element !== null;
        
        if (found) {
            const styles = window.getComputedStyle(element);
            console.log(`✅ ${id}: FOUND`);
            console.log(`   Display: ${styles.display}`);
            console.log(`   Visibility: ${styles.visibility}`);
            console.log(`   Pointer Events: ${styles.pointerEvents}`);
            console.log(`   Position: ${styles.position}`);
            console.log(`   Z-Index: ${styles.zIndex}`);
            console.log(`   Opacity: ${styles.opacity}`);
            
            // Check for event listeners
            const listenerCount = getEventListeners ? getEventListeners(element) : 'N/A (DevTools required)';
            console.log(`   Event Listeners: ${typeof listenerCount === 'object' ? Object.keys(listenerCount).length : listenerCount}`);
            
        } else {
            console.log(`❌ ${id}: NOT FOUND`);
        }
    });
}

// Check for JavaScript errors
function checkErrors() {
    console.log('\n=== ERROR CHECK ===');
    
    // Override console.error to catch errors
    const originalConsoleError = console.error;
    let errorCount = 0;
    
    console.error = function(...args) {
        errorCount++;
        console.log(`❌ Error ${errorCount}:`, ...args);
        originalConsoleError.apply(console, args);
    };
    
    console.log('Error tracking enabled. Check for errors above.');
}

// Test event listeners manually
function testEventListeners() {
    console.log('\n=== EVENT LISTENER TEST ===');
    
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    
    if (loginBtn) {
        console.log('🔧 Adding test listener to login button...');
        loginBtn.addEventListener('click', function() {
            console.log('✅ Login button clicked!');
            alert('Login button works!');
        });
        console.log('Test listener added to login button');
    } else {
        console.log('❌ Login button not found');
    }
    
    if (registerBtn) {
        console.log('🔧 Adding test listener to register button...');
        registerBtn.addEventListener('click', function() {
            console.log('✅ Register button clicked!');
            alert('Register button works!');
        });
        console.log('Test listener added to register button');
    } else {
        console.log('❌ Register button not found');
    }
}

// Check for conflicting scripts
function checkScripts() {
    console.log('\n=== SCRIPT CHECK ===');
    
    const scripts = document.querySelectorAll('script');
    console.log(`Found ${scripts.length} script tags:`);
    
    scripts.forEach((script, index) => {
        const src = script.src;
        const type = script.type || 'text/javascript';
        console.log(`${index + 1}. ${src || '[inline]'} (${type})`);
    });
}

// Check global variables
function checkGlobals() {
    console.log('\n=== GLOBAL VARIABLE CHECK ===');
    
    const globals = [
        'appState',
        'authManager',
        'navigationManager',
        'CONFIG_UTILS',
        'API_CONFIG',
        'showModal',
        'hideModal',
        'showToast'
    ];
    
    globals.forEach(name => {
        const exists = typeof window[name] !== 'undefined';
        console.log(`${exists ? '✅' : '❌'} ${name}: ${exists ? typeof window[name] : 'undefined'}`);
    });
}

// Check for module loading issues
function checkModules() {
    console.log('\n=== MODULE CHECK ===');
    
    // Check if ES6 modules are supported
    if (typeof Symbol !== 'undefined' && Symbol.toStringTag) {
        console.log('✅ ES6 modules supported');
    } else {
        console.log('❌ ES6 modules may not be supported');
    }
    
    // Check if modules loaded
    if (typeof window.StellarArtCollabApp !== 'undefined') {
        console.log('✅ StellarArtCollabApp found');
    } else {
        console.log('❌ StellarArtCollabApp not found');
    }
}

// Simulate button clicks
function simulateClick(elementId) {
    console.log(`\n🖱️ Simulating click on ${elementId}...`);
    
    const element = document.getElementById(elementId);
    if (element) {
        console.log('Element found, triggering click...');
        element.click();
        console.log('Click triggered');
    } else {
        console.log(`❌ Element ${elementId} not found`);
    }
}

// Run all checks
function runAllChecks() {
    console.log('🔍 Running all debug checks...');
    
    checkElements();
    checkErrors();
    checkScripts();
    checkGlobals();
    checkModules();
    
    console.log('\n=== MANUAL TESTS ===');
    console.log('Run these commands to test manually:');
    console.log('testEventListeners() - Add test event listeners');
    console.log('simulateClick("login-btn") - Simulate login button click');
    console.log('simulateClick("register-btn") - Simulate register button click');
    
    console.log('\n✅ Debug complete');
}

// Make functions available globally
window.checkElements = checkElements;
window.checkErrors = checkErrors;
window.testEventListeners = testEventListeners;
window.checkScripts = checkScripts;
window.checkGlobals = checkGlobals;
window.checkModules = checkModules;
window.simulateClick = simulateClick;
window.runAllChecks = runAllChecks;

// Auto-run on load
runAllChecks(); 