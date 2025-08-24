/**
 * Canvas Performance Manager
 * Monitors and optimizes canvas performance
 */
export class CanvasPerformanceManager {
    constructor() {
        this.metrics = {
            fps: 0,
            renderTime: 0,
            frameCount: 0,
            lastFpsUpdate: Date.now(),
            performanceIssues: []
        };
        
        this.thresholds = {
            maxRenderTime: 16, // 60fps target
            maxMemoryUsage: 100 * 1024 * 1024, // 100MB
            maxPerformanceIssues: 10
        };
        
        this.cleanupInterval = null;
    }
    
    /**
     * Initialize the performance manager
     */
    async init() {
        this.metrics = {
            fps: 60,
            renderTime: 0,
            frameCount: 0,
            lastUpdate: Date.now(),
            performanceIssues: []
        };
        
        this.thresholds = {
            maxRenderTime: 16.67, // 60 FPS target
            minFps: 30,
            maxMemoryUsage: 100 * 1024 * 1024 // 100MB
        };
        
        this.cleanupInterval = setInterval(() => {
            this.cleanupOldData();
        }, 30000); // Clean up every 30 seconds
        
        console.log('✅ Canvas Performance Manager initialized');
    }
    
    /**
     * Record render performance
     */
    recordRender(renderTime) {
        this.metrics.renderTime = renderTime;
        this.metrics.frameCount++;
        
        // Check for performance issues
        if (renderTime > this.thresholds.maxRenderTime) {
            console.warn(`⚠️ Render time ${renderTime.toFixed(2)}ms exceeds threshold ${this.thresholds.maxRenderTime}ms`);
            this.recordPerformanceIssue('slow_render', renderTime);
        }
        
        // Update FPS calculation
        const now = Date.now();
        if (now - this.metrics.lastUpdate >= 1000) {
            this.metrics.fps = this.metrics.frameCount;
            this.metrics.frameCount = 0;
            this.metrics.lastUpdate = now;
        }
    }
    
    /**
     * Record viewport change
     */
    recordViewportChange() {
        this.metrics.viewportChanges = (this.metrics.viewportChanges || 0) + 1;
    }
    
    /**
     * Record canvas open
     */
    recordCanvasOpen(canvasData) {
        this.metrics.canvasOpens = (this.metrics.canvasOpens || 0) + 1;
        this.metrics.lastCanvasOpen = Date.now();
        
        // Estimate memory usage
        const estimatedMemory = this.estimateCanvasMemory(canvasData);
        this.metrics.estimatedMemory = estimatedMemory;
        
        // Check memory threshold
        if (estimatedMemory > this.thresholds.maxMemoryUsage) {
            console.warn(`⚠️ Estimated memory usage ${(estimatedMemory / 1024 / 1024).toFixed(2)}MB exceeds threshold ${(this.thresholds.maxMemoryUsage / 1024 / 1024).toFixed(2)}MB`);
            this.recordPerformanceIssue('high_memory_usage', estimatedMemory);
        }
    }
    
    /**
     * Record performance issue
     */
    recordPerformanceIssue(type, details) {
        const issue = {
            type,
            details,
            timestamp: Date.now()
        };
        
        this.metrics.performanceIssues.push(issue);
        
        // Keep only recent issues (last 100)
        if (this.metrics.performanceIssues.length > 100) {
            this.metrics.performanceIssues = this.metrics.performanceIssues.slice(-100);
        }
    }
    
    /**
     * Estimate canvas memory usage
     */
    estimateCanvasMemory(canvasData) {
        if (!canvasData) {
            console.warn(`⚠️ No canvas data provided for memory estimation`);
            return 0;
        }
        
        // Estimate based on canvas dimensions and tile size
        const tileSize = canvasData.tile_size || 32;
        const gridSize = 1024 / tileSize;
        const totalTiles = gridSize * gridSize;
        
        // Estimate memory per tile (RGBA data + metadata)
        const bytesPerTile = (tileSize * tileSize * 4) + 100; // 4 bytes per pixel + metadata
        const estimatedMemory = totalTiles * bytesPerTile;
        
        return estimatedMemory;
    }
    
    /**
     * Get current metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }
    
    /**
     * Get performance recommendations
     */
    getRecommendations() {
        const recommendations = [];
        
        // Check render time
        if (this.metrics.renderTime > this.thresholds.maxRenderTime) {
            recommendations.push('Reduce canvas complexity or optimize rendering');
        }
        
        // Check FPS
        if (this.metrics.fps < this.thresholds.minFps) {
            recommendations.push('Optimize rendering pipeline for better performance');
        }
        
        // Check memory usage
        if (this.metrics.estimatedMemory > this.thresholds.maxMemoryUsage) {
            recommendations.push('Consider reducing canvas size or tile resolution');
        }
        
        return recommendations;
    }
    
    /**
     * Cleanup old performance data
     */
    cleanupOldData() {
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        const oldIssues = this.metrics.performanceIssues.filter(
            issue => issue.timestamp < oneHourAgo
        );
        
        if (oldIssues.length > 0) {
            this.metrics.performanceIssues = this.metrics.performanceIssues.filter(
                issue => issue.timestamp >= oneHourAgo
            );
        }
    }
    
    /**
     * Cleanup resources
     */
    cleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }
}
