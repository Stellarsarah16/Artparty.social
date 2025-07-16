/**
 * HTTPS Enforcer - Must load before all other scripts
 * This script immediately overrides fetch and XMLHttpRequest to force HTTPS
 */

(function() {
    'use strict';
    
    // Only run on production domain
    if (window.location.hostname !== 'artparty.social') {
        return;
    }
    
    console.log('🔒 HTTPS ENFORCER: Initializing for production domain');
    
    // Override fetch immediately
    if (window.fetch) {
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
            const url = args[0];
            
            // Convert HTTP to HTTPS
            if (typeof url === 'string' && url.startsWith('http://artparty.social')) {
                const httpsUrl = url.replace('http://', 'https://');
                console.warn('🔒 HTTPS ENFORCER: Converting fetch HTTP to HTTPS:', url, '→', httpsUrl);
                args[0] = httpsUrl;
            }
            
            return originalFetch.apply(this, args);
        };
        console.log('✅ HTTPS ENFORCER: Fetch override installed');
    }
    
    // Override XMLHttpRequest immediately
    if (window.XMLHttpRequest) {
        const originalXHROpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url, ...args) {
            // Convert HTTP to HTTPS
            if (typeof url === 'string' && url.startsWith('http://artparty.social')) {
                const httpsUrl = url.replace('http://', 'https://');
                console.warn('🔒 HTTPS ENFORCER: Converting XHR HTTP to HTTPS:', url, '→', httpsUrl);
                url = httpsUrl;
            }
            
            return originalXHROpen.apply(this, [method, url, ...args]);
        };
        console.log('✅ HTTPS ENFORCER: XMLHttpRequest override installed');
    }
    
    // Monitor for any remaining HTTP requests
    const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
            if (entry.name && entry.name.startsWith('http://artparty.social')) {
                console.error('🔒 HTTPS ENFORCER: Detected HTTP request that was not intercepted:', entry.name);
            }
        }
    });
    
    try {
        observer.observe({ entryTypes: ['resource'] });
        console.log('✅ HTTPS ENFORCER: Performance monitoring installed');
    } catch (e) {
        console.warn('⚠️ HTTPS ENFORCER: Performance monitoring not available');
    }
    
    console.log('🔒 HTTPS ENFORCER: Initialization complete');
})(); 