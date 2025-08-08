/**
 * Smart Logger - Intelligent logging system that combines related messages
 * and reduces verbosity while maintaining debugging value
 */

class SmartLogger {
    constructor() {
        this.isInitialized = false;
        this.activeGroups = new Map();
        this.transactionLogs = new Map();
        this.settings = {
            enableGrouping: true,
            enableTransactions: true,
            enableSummaries: true,
            maxGroupSize: 10,
            transactionTimeout: 5000, // 5 seconds
            verboseMode: false // Set to true for detailed debugging
        };
        
        this.init();
    }
    
    init() {
        if (this.isInitialized) return;
        
        // Enhance console manager if it exists
        if (window.consoleManager) {
            this.consoleManager = window.consoleManager;
        }
        
        this.isInitialized = true;
        console.log('🧠 Smart Logger initialized');
    }
    
    /**
     * Start a transaction group for related operations
     */
    startTransaction(transactionId, title, context = {}) {
        const transaction = {
            id: transactionId,
            title: title,
            context: context,
            startTime: Date.now(),
            messages: [],
            status: 'active'
        };
        
        this.transactionLogs.set(transactionId, transaction);
        
        if (this.settings.enableGrouping && this.settings.verboseMode) {
            console.group(`🔄 ${title}`);
        }
        
        return transaction;
    }
    
    /**
     * Add a message to an active transaction
     */
    addToTransaction(transactionId, level, message, data = null) {
        const transaction = this.transactionLogs.get(transactionId);
        if (!transaction) {
            // Fallback to regular logging if transaction doesn't exist
            this.log(level, message, data);
            return;
        }
        
        const logEntry = {
            level: level,
            message: message,
            data: data,
            timestamp: Date.now()
        };
        
        transaction.messages.push(logEntry);
        
        // Only show individual messages in verbose mode
        if (this.settings.verboseMode) {
            this.log(level, message, data);
        }
    }
    
    /**
     * Complete a transaction and show summary
     */
    completeTransaction(transactionId, success = true, result = null) {
        const transaction = this.transactionLogs.get(transactionId);
        if (!transaction) return;
        
        transaction.status = success ? 'completed' : 'failed';
        transaction.endTime = Date.now();
        transaction.duration = transaction.endTime - transaction.startTime;
        transaction.result = result;
        
        // Show transaction summary
        this.showTransactionSummary(transaction);
        
        if (this.settings.enableGrouping && this.settings.verboseMode) {
            console.groupEnd();
        }
        
        // Clean up
        this.transactionLogs.delete(transactionId);
    }
    
    /**
     * Show a concise transaction summary
     */
    showTransactionSummary(transaction) {
        const { title, status, duration, messages, context, result } = transaction;
        const statusIcon = status === 'completed' ? '✅' : '❌';
        const errors = messages.filter(m => m.level === 'error').length;
        const warnings = messages.filter(m => m.level === 'warn').length;
        
        // Create summary message
        let summary = `${statusIcon} ${title} (${duration}ms)`;
        
        if (context && Object.keys(context).length > 0) {
            const contextStr = Object.entries(context)
                .map(([k, v]) => `${k}:${v}`)
                .join(', ');
            summary += ` [${contextStr}]`;
        }
        
        if (errors > 0 || warnings > 0) {
            summary += ` - ${errors} errors, ${warnings} warnings`;
        }
        
        // Log the summary
        if (status === 'completed') {
            console.log(summary);
        } else {
            console.error(summary);
        }
        
        // Show result if available
        if (result && this.settings.verboseMode) {
            console.log('📊 Result:', result);
        }
        
        // Show detailed messages only if there were issues or in verbose mode
        if ((errors > 0 || warnings > 0 || this.settings.verboseMode) && messages.length > 0) {
            console.group('📋 Details:');
            messages.forEach(msg => {
                const icon = this.getLogIcon(msg.level);
                console.log(`${icon} ${msg.message}`, msg.data || '');
            });
            console.groupEnd();
        }
    }
    
    /**
     * Create a grouped operation for related logs
     */
    groupedOperation(title, operation) {
        if (!this.settings.enableGrouping) {
            return operation();
        }
        
        console.group(`🔧 ${title}`);
        try {
            const result = operation();
            console.log(`✅ ${title} completed`);
            return result;
        } catch (error) {
            console.error(`❌ ${title} failed:`, error);
            throw error;
        } finally {
            console.groupEnd();
        }
    }
    
    /**
     * Smart logging with automatic categorization
     */
    log(level, message, data = null) {
        const icon = this.getLogIcon(level);
        
        if (data) {
            console[level](`${icon} ${message}`, data);
        } else {
            console[level](`${icon} ${message}`);
        }
    }
    
    /**
     * Get appropriate icon for log level
     */
    getLogIcon(level) {
        const icons = {
            log: '📝',
            info: 'ℹ️',
            warn: '⚠️',
            error: '❌',
            success: '✅',
            debug: '🐛',
            api: '📡',
            websocket: '🔌',
            auth: '🔐',
            canvas: '🎨',
            tile: '🧩',
            lock: '🔒'
        };
        return icons[level] || '📝';
    }
    
    /**
     * API operation wrapper
     */
    apiOperation(method, url, operation) {
        const transactionId = `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const title = `${method.toUpperCase()} ${url}`;
        
        this.startTransaction(transactionId, title, { type: 'api', method, url });
        
        return operation()
            .then(result => {
                this.completeTransaction(transactionId, true, result);
                return result;
            })
            .catch(error => {
                this.addToTransaction(transactionId, 'error', error.message, error);
                this.completeTransaction(transactionId, false, error);
                throw error;
            });
    }
    
    /**
     * Tile operation wrapper
     */
    tileOperation(action, tileId, operation) {
        const transactionId = `tile_${action}_${tileId}_${Date.now()}`;
        const title = `Tile ${action}`;
        
        this.startTransaction(transactionId, title, { type: 'tile', action, tileId });
        
        return operation()
            .then(result => {
                this.completeTransaction(transactionId, true, result);
                return result;
            })
            .catch(error => {
                this.addToTransaction(transactionId, 'error', error.message, error);
                this.completeTransaction(transactionId, false, error);
                throw error;
            });
    }
    
    /**
     * Canvas operation wrapper
     */
    canvasOperation(action, canvasId, operation) {
        const transactionId = `canvas_${action}_${canvasId}_${Date.now()}`;
        const title = `Canvas ${action}`;
        
        this.startTransaction(transactionId, title, { type: 'canvas', action, canvasId });
        
        return operation()
            .then(result => {
                this.completeTransaction(transactionId, true, result);
                return result;
            })
            .catch(error => {
                this.addToTransaction(transactionId, 'error', error.message, error);
                this.completeTransaction(transactionId, false, error);
                throw error;
            });
    }
    
    /**
     * Enable verbose mode for detailed debugging
     */
    enableVerboseMode() {
        this.settings.verboseMode = true;
        console.log('🔍 Smart Logger: Verbose mode enabled');
    }
    
    /**
     * Disable verbose mode for cleaner output
     */
    disableVerboseMode() {
        this.settings.verboseMode = false;
        console.log('🔇 Smart Logger: Verbose mode disabled');
    }
    
    /**
     * Toggle verbose mode
     */
    toggleVerboseMode() {
        this.settings.verboseMode = !this.settings.verboseMode;
        console.log(`🔄 Smart Logger: Verbose mode ${this.settings.verboseMode ? 'enabled' : 'disabled'}`);
    }
}

// Create global instance
window.smartLogger = new SmartLogger();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SmartLogger;
}

console.log('🧠 Smart Logger loaded successfully');
