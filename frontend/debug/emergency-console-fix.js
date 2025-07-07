// 🚨 EMERGENCY CONSOLE SPAM FIX 🚨
// Paste this into your browser console (F12) to immediately stop console spam

console.warn('🚨 EMERGENCY CONSOLE FIX ACTIVATED');

// Store original console methods
const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug
};

// Console throttling system
let logCount = 0;
let lastReset = Date.now();
const MAX_LOGS_PER_SECOND = 10;

function throttledLog(originalMethod, type, ...args) {
    const now = Date.now();
    
    // Reset counter every second
    if (now - lastReset > 1000) {
        logCount = 0;
        lastReset = now;
    }
    
    // Allow errors and warnings through
    if (type === 'error' || type === 'warn') {
        originalMethod.apply(console, args);
        return;
    }
    
    // Throttle other logs
    if (logCount < MAX_LOGS_PER_SECOND) {
        originalMethod.apply(console, args);
        logCount++;
    } else if (logCount === MAX_LOGS_PER_SECOND) {
        console.warn('⚠️ Console logging throttled to prevent browser freeze');
        logCount++;
    }
}

// Override console methods
console.log = (...args) => throttledLog(originalConsole.log, 'log', ...args);
console.info = (...args) => throttledLog(originalConsole.info, 'info', ...args);
console.debug = (...args) => throttledLog(originalConsole.debug, 'debug', ...args);

// Keep error and warn methods unthrottled
console.error = originalConsole.error;
console.warn = originalConsole.warn;

// Disable debug modes if they exist
if (typeof APP_CONFIG !== 'undefined') {
    APP_CONFIG.DEBUG_CANVAS = false;
    APP_CONFIG.DEBUG_WEBSOCKET = false;
    APP_CONFIG.DEBUG_API = false;
    console.warn('✅ Debug modes disabled');
}

// Function to restore original console
window.restoreConsole = () => {
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.info = originalConsole.info;
    console.debug = originalConsole.debug;
    console.log('✅ Console restored to original state');
};

console.warn('✅ Emergency console fix applied!');
console.warn('📝 Console output limited to 10 messages per second');
console.warn('🔧 To restore normal console: run restoreConsole()');
console.warn('💡 Refresh the page to apply permanent fixes'); 