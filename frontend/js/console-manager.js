/**
 * Console Manager - Controls and minimizes console output
 * Helps prevent console spam while keeping important messages
 */

class ConsoleManager {
    constructor() {
        this.isInitialized = false;
        this.originalConsole = {};
        this.logCounts = new Map();
        this.importantPatterns = [
            'error', 'Error', 'ERROR',
            'warn', 'Warn', 'WARN', 
            'failed', 'Failed', 'FAILED',
            'exception', 'Exception', 'EXCEPTION',
            'critical', 'Critical', 'CRITICAL',
            'security', 'Security', 'SECURITY',
            'authentication', 'Authentication', 'AUTH',
            'connection', 'Connection', 'CONNECTION',
            'websocket', 'WebSocket', 'WEBSOCKET',
            'api', 'API', 'request', 'Request',
            'canvas', 'Canvas', 'CANVAS',
            'tile', 'Tile', 'TILE'
        ];
        
        this.spamPatterns = [
            'coordinate', 'Coordinate', 'COORDINATE',
            'mouse', 'Mouse', 'MOUSE',
            'hover', 'Hover', 'HOVER',
            'move', 'Move', 'MOVE',
            'position', 'Position', 'POSITION',
            'viewport', 'Viewport', 'VIEWPORT',
            'zoom', 'Zoom', 'ZOOM',
            'scroll', 'Scroll', 'SCROLL',
            'drag', 'Drag', 'DRAG',
            'click', 'Click', 'CLICK',
            'touch', 'Touch', 'TOUCH',
            'tap', 'Tap', 'TAP'
        ];
        
        this.maxLogsPerSecond = 10;
        this.maxLogsPerMinute = 100;
        this.resetInterval = 60000; // 1 minute
        this.lastReset = Date.now();
        this.logCount = 0;
        this.minuteLogCount = 0;
        
        this.init();
    }
    
    init() {
        if (this.isInitialized) return;
        
        // Store original console methods
        this.originalConsole = {
            log: console.log,
            warn: console.warn,
            error: console.error,
            info: console.info,
            debug: console.debug
        };
        
        // Override console methods
        this.overrideConsoleMethods();
        
        // Set up periodic reset
        setInterval(() => {
            this.resetCounters();
        }, this.resetInterval);
        
        this.isInitialized = true;
        this.originalConsole.log('🔧 Console Manager initialized - Logging optimized');
    }
    
    overrideConsoleMethods() {
        const self = this;
        
        console.log = function(...args) {
            if (self.shouldLog('log', args)) {
                self.originalConsole.log(...args);
            }
        };
        
        console.warn = function(...args) {
            if (self.shouldLog('warn', args)) {
                self.originalConsole.warn(...args);
            }
        };
        
        console.error = function(...args) {
            // Always log errors
            self.originalConsole.error(...args);
        };
        
        console.info = function(...args) {
            if (self.shouldLog('info', args)) {
                self.originalConsole.info(...args);
            }
        };
        
        console.debug = function(...args) {
            if (self.shouldLog('debug', args)) {
                self.originalConsole.debug(...args);
            }
        };
    }
    
    shouldLog(level, args) {
        const message = args.join(' ');
        
        // Always allow errors
        if (level === 'error') return true;
        
        // Check if message contains important patterns
        const isImportant = this.importantPatterns.some(pattern => 
            message.includes(pattern)
        );
        
        // Check if message contains spam patterns
        const isSpam = this.spamPatterns.some(pattern => 
            message.includes(pattern)
        );
        
        // Rate limiting
        const now = Date.now();
        if (now - this.lastReset > 1000) {
            this.logCount = 0;
            this.lastReset = now;
        }
        
        if (now - this.lastReset > this.resetInterval) {
            this.minuteLogCount = 0;
        }
        
        // Always allow important messages
        if (isImportant) {
            this.logCount++;
            this.minuteLogCount++;
            return true;
        }
        
        // Rate limit spam messages
        if (isSpam) {
            if (this.logCount >= this.maxLogsPerSecond) {
                return false;
            }
            if (this.minuteLogCount >= this.maxLogsPerMinute) {
                return false;
            }
        }
        
        // Allow other messages within limits
        if (this.logCount < this.maxLogsPerSecond && 
            this.minuteLogCount < this.maxLogsPerMinute) {
            this.logCount++;
            this.minuteLogCount++;
            return true;
        }
        
        return false;
    }
    
    resetCounters() {
        this.logCount = 0;
        this.minuteLogCount = 0;
        this.logCounts.clear();
    }
    
    // Method to temporarily enable all logging (for debugging)
    enableFullLogging() {
        console.log = this.originalConsole.log;
        console.warn = this.originalConsole.warn;
        console.error = this.originalConsole.error;
        console.info = this.originalConsole.info;
        console.debug = this.originalConsole.debug;
        this.originalConsole.log('🔧 Full logging enabled');
    }
    
    // Method to restore controlled logging
    restoreControlledLogging() {
        this.overrideConsoleMethods();
        this.originalConsole.log('🔧 Controlled logging restored');
    }
    
    // Method to get current stats
    getStats() {
        return {
            logCount: this.logCount,
            minuteLogCount: this.minuteLogCount,
            maxLogsPerSecond: this.maxLogsPerSecond,
            maxLogsPerMinute: this.maxLogsPerMinute
        };
    }
}

// Create global instance
window.ConsoleManager = new ConsoleManager();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConsoleManager;
}
