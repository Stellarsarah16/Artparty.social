/**
 * Debug HTTP Requests - Helps identify sources of HTTP requests
 * This script should be loaded before all other scripts
 */

(function() {
    'use strict';
    
    console.log('🔍 HTTP Request Debugger: Initializing');
    
    // Track all fetch calls
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        const url = args[0];
        const options = args[1] || {};
        
        console.log('🔍 FETCH CALL:', {
            url: url,
            method: options.method || 'GET',
            timestamp: new Date().toISOString(),
            stack: new Error().stack
        });
        
        if (typeof url === 'string' && url.startsWith('http://')) {
            console.error('🔍 HTTP REQUEST DETECTED:', {
                url: url,
                method: options.method || 'GET',
                stack: new Error().stack
            });
        }
        
        return originalFetch.apply(this, args);
    };
    
    // Track all XMLHttpRequest calls
    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
        console.log('🔍 XHR CALL:', {
            url: url,
            method: method,
            timestamp: new Date().toISOString(),
            stack: new Error().stack
        });
        
        if (typeof url === 'string' && url.startsWith('http://')) {
            console.error('🔍 HTTP XHR REQUEST DETECTED:', {
                url: url,
                method: method,
                stack: new Error().stack
            });
        }
        
        return originalXHROpen.apply(this, [method, url, ...args]);
    };
    
    // Monitor network requests
    if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.name && entry.name.startsWith('http://')) {
                    console.error('🔍 NETWORK HTTP REQUEST DETECTED:', {
                        url: entry.name,
                        type: entry.entryType,
                        timestamp: new Date().toISOString()
                    });
                }
            }
        });
        
        try {
            observer.observe({ entryTypes: ['resource'] });
            console.log('🔍 HTTP Request Debugger: Performance monitoring enabled');
        } catch (e) {
            console.warn('🔍 HTTP Request Debugger: Performance monitoring not available');
        }
    }
    
    console.log('🔍 HTTP Request Debugger: Initialized');
})(); 