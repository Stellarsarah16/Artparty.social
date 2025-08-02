/**
 * Global Setup for Jest
 * Runs once before all test suites
 */

export default async () => {
    console.log('🚀 Global test setup starting...');
    
    // Set up any global test environment variables
    process.env.NODE_ENV = 'test';
    process.env.JEST_WORKER_ID = '1';
    
    // Create test directories if they don't exist
    const fs = await import('fs');
    const path = await import('path');
    
    const testDirs = [
        'tests/coverage',
        'tests/results'
    ];
    
    testDirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`📁 Created test directory: ${dir}`);
        }
    });
    
    console.log('✅ Global test setup completed');
}; 