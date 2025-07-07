/**
 * Test CONFIG_UTILS functions
 * Run this in the browser console to verify all functions work
 */

console.log('🧪 Testing CONFIG_UTILS functions...');

// Test function existence
function testFunctionExistence() {
    console.log('\n=== FUNCTION EXISTENCE TEST ===');
    
    const requiredFunctions = [
        'getApiUrl',
        'getFullApiUrl',
        'getWebSocketUrl',
        'formatError',
        'throttledLog',
        'debug',
        'safeLog',
        'preventConsoleSpam',
        'isAuthenticated',
        'getAuthToken',
        'setAuthToken',
        'removeAuthToken',
        'getUserData',
        'setUserData',
        'removeUserData',
        'getAuthHeaders',
        'getWsUrl',
        'debounce',
        'generateUuid'
    ];
    
    requiredFunctions.forEach(funcName => {
        const exists = typeof CONFIG_UTILS[funcName] === 'function';
        console.log(`${exists ? '✅' : '❌'} ${funcName}: ${exists ? 'EXISTS' : 'MISSING'}`);
    });
}

// Test authentication functions
function testAuthFunctions() {
    console.log('\n=== AUTHENTICATION FUNCTIONS TEST ===');
    
    try {
        // Test token functions
        console.log('Testing token functions...');
        CONFIG_UTILS.setAuthToken('test-token');
        const token = CONFIG_UTILS.getAuthToken();
        console.log(`✅ Token set/get: ${token === 'test-token' ? 'PASS' : 'FAIL'}`);
        
        // Test user data functions
        console.log('Testing user data functions...');
        const testUser = { id: 1, username: 'test', email: 'test@example.com' };
        CONFIG_UTILS.setUserData(testUser);
        const userData = CONFIG_UTILS.getUserData();
        console.log(`✅ User data set/get: ${userData && userData.username === 'test' ? 'PASS' : 'FAIL'}`);
        
        // Test authentication check
        console.log('Testing authentication check...');
        const isAuth = CONFIG_UTILS.isAuthenticated();
        console.log(`✅ Authentication check: ${isAuth ? 'PASS' : 'FAIL'}`);
        
        // Test auth headers
        console.log('Testing auth headers...');
        const headers = CONFIG_UTILS.getAuthHeaders();
        console.log(`✅ Auth headers: ${headers.Authorization ? 'PASS' : 'FAIL'}`);
        
        // Clean up
        CONFIG_UTILS.removeAuthToken();
        CONFIG_UTILS.removeUserData();
        console.log('✅ Cleanup: PASS');
        
    } catch (error) {
        console.error('❌ Auth functions test failed:', error);
    }
}

// Test utility functions
function testUtilityFunctions() {
    console.log('\n=== UTILITY FUNCTIONS TEST ===');
    
    try {
        // Test debounce
        console.log('Testing debounce...');
        let callCount = 0;
        const debouncedFn = CONFIG_UTILS.debounce(() => callCount++, 100);
        debouncedFn();
        debouncedFn();
        debouncedFn();
        setTimeout(() => {
            console.log(`✅ Debounce: ${callCount === 1 ? 'PASS' : 'FAIL'} (callCount: ${callCount})`);
        }, 200);
        
        // Test UUID generation
        console.log('Testing UUID generation...');
        const uuid = CONFIG_UTILS.generateUuid();
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        console.log(`✅ UUID generation: ${uuidPattern.test(uuid) ? 'PASS' : 'FAIL'} (${uuid})`);
        
        // Test API URL generation
        console.log('Testing API URL generation...');
        const apiUrl = CONFIG_UTILS.getApiUrl('/test');
        console.log(`✅ API URL: ${apiUrl.includes('/test') ? 'PASS' : 'FAIL'} (${apiUrl})`);
        
        // Test WebSocket URL
        console.log('Testing WebSocket URL...');
        const wsUrl = CONFIG_UTILS.getWsUrl('canvas123', 'token123');
        console.log(`✅ WebSocket URL: ${wsUrl.includes('canvas123') ? 'PASS' : 'FAIL'} (${wsUrl})`);
        
    } catch (error) {
        console.error('❌ Utility functions test failed:', error);
    }
}

// Test logging functions
function testLoggingFunctions() {
    console.log('\n=== LOGGING FUNCTIONS TEST ===');
    
    try {
        // Test safe log
        console.log('Testing safe log...');
        CONFIG_UTILS.safeLog('Test safe log message');
        console.log('✅ Safe log: PASS');
        
        // Test debug log
        console.log('Testing debug log...');
        CONFIG_UTILS.debug('Test debug message');
        console.log('✅ Debug log: PASS');
        
        // Test throttled log
        console.log('Testing throttled log...');
        CONFIG_UTILS.throttledLog('log', 'Test throttled message');
        console.log('✅ Throttled log: PASS');
        
    } catch (error) {
        console.error('❌ Logging functions test failed:', error);
    }
}

// Test configuration objects
function testConfigObjects() {
    console.log('\n=== CONFIGURATION OBJECTS TEST ===');
    
    const configs = [
        { name: 'APP_CONFIG', obj: window.APP_CONFIG },
        { name: 'API_CONFIG', obj: window.API_CONFIG },
        { name: 'WS_CONFIG', obj: window.WS_CONFIG },
        { name: 'CONFIG_UTILS', obj: window.CONFIG_UTILS }
    ];
    
    configs.forEach(config => {
        const exists = typeof config.obj === 'object' && config.obj !== null;
        console.log(`${exists ? '✅' : '❌'} ${config.name}: ${exists ? 'EXISTS' : 'MISSING'}`);
    });
}

// Run all tests
function runAllTests() {
    console.log('🧪 Running CONFIG_UTILS tests...');
    
    testFunctionExistence();
    testAuthFunctions();
    testUtilityFunctions();
    testLoggingFunctions();
    testConfigObjects();
    
    console.log('\n✅ All tests completed!');
}

// Make functions available globally
window.testConfigUtils = {
    testFunctionExistence,
    testAuthFunctions,
    testUtilityFunctions,
    testLoggingFunctions,
    testConfigObjects,
    runAllTests
};

// Auto-run on load
if (typeof CONFIG_UTILS !== 'undefined') {
    runAllTests();
} else {
    console.error('❌ CONFIG_UTILS not available - make sure config.js is loaded');
} 