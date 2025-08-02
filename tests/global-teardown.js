/**
 * Global Teardown for Jest
 * Runs once after all test suites complete
 */

export default async () => {
    console.log('🧹 Global test teardown starting...');
    
    // Clean up any global test resources
    // This is where you might clean up test databases, files, etc.
    
    console.log('✅ Global test teardown completed');
}; 