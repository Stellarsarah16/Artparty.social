/**
 * End-to-End Tests for Complete User Journey
 * Tests the entire application flow from registration to canvas interaction
 */

const puppeteer = require('puppeteer');
const path = require('path');

describe('Complete User Journey E2E Tests', () => {
    let browser;
    let page;
    
    const BASE_URL = 'http://localhost:3000';
    const API_BASE_URL = 'http://localhost:8000';
    
    beforeAll(async () => {
        browser = await puppeteer.launch({
            headless: process.env.CI === 'true',
            slowMo: process.env.CI === 'true' ? 0 : 50,
            devtools: false
        });
    });
    
    afterAll(async () => {
        if (browser) {
            await browser.close();
        }
    });
    
    beforeEach(async () => {
        page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });
        
        // Mock API responses for E2E testing
        await page.setRequestInterception(true);
        
        page.on('request', request => {
            const url = request.url();
            
            // Mock authentication API
            if (url.includes('/api/v1/auth/register')) {
                request.respond({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        access_token: 'test_token_123',
                        user: {
                            id: 1,
                            username: 'testuser',
                            email: 'test@example.com'
                        }
                    })
                });
            } else if (url.includes('/api/v1/auth/login')) {
                request.respond({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        access_token: 'test_token_456',
                        user: {
                            id: 1,
                            username: 'testuser',
                            email: 'test@example.com'
                        }
                    })
                });
            } else if (url.includes('/api/v1/canvas')) {
                if (request.method() === 'GET') {
                    request.respond({
                        status: 200,
                        contentType: 'application/json',
                        body: JSON.stringify([
                            { id: 1, name: 'Canvas 1', width: 100, height: 100 },
                            { id: 2, name: 'Canvas 2', width: 200, height: 200 }
                        ])
                    });
                } else if (request.method() === 'POST') {
                    request.respond({
                        status: 201,
                        contentType: 'application/json',
                        body: JSON.stringify({
                            id: 3,
                            name: 'New Canvas',
                            width: 100,
                            height: 100,
                            public: true,
                            created_at: '2023-01-01T00:00:00Z'
                        })
                    });
                }
            } else if (url.includes('/api/v1/tiles')) {
                request.respond({
                    status: 201,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        id: 123,
                        canvas_id: 1,
                        x: 5,
                        y: 10,
                        color: '#FF0000',
                        created_at: '2023-01-01T00:00:00Z'
                    })
                });
            } else {
                request.continue();
            }
        });
    });
    
    afterEach(async () => {
        if (page) {
            await page.close();
        }
    });
    
    describe('User Registration and Authentication Flow', () => {
        test('should complete user registration successfully', async () => {
            await page.goto(`${BASE_URL}/index.html`);
            
            // Wait for page to load
            await page.waitForSelector('#auth-section');
            
            // Click register tab
            await page.click('[data-tab="register"]');
            
            // Fill registration form
            await page.type('#register-username', 'testuser');
            await page.type('#register-email', 'test@example.com');
            await page.type('#register-password', 'password123');
            await page.type('#register-password-confirm', 'password123');
            
            // Submit registration
            await page.click('#register-btn');
            
            // Wait for successful registration
            await page.waitForSelector('#canvas-section', { visible: true });
            
            // Verify user is redirected to canvas section
            const canvasSection = await page.$('#canvas-section');
            expect(canvasSection).toBeTruthy();
            
            // Verify success toast appears
            await page.waitForSelector('.toast.success', { visible: true });
            const toastText = await page.$eval('.toast.success', el => el.textContent);
            expect(toastText).toContain('Registration successful');
        });
        
        test('should complete user login successfully', async () => {
            await page.goto(`${BASE_URL}/index.html`);
            
            // Wait for page to load
            await page.waitForSelector('#auth-section');
            
            // Fill login form (login is default tab)
            await page.type('#login-username', 'testuser');
            await page.type('#login-password', 'password123');
            
            // Submit login
            await page.click('#login-btn');
            
            // Wait for successful login
            await page.waitForSelector('#canvas-section', { visible: true });
            
            // Verify user is redirected to canvas section
            const canvasSection = await page.$('#canvas-section');
            expect(canvasSection).toBeTruthy();
            
            // Verify user information is displayed
            await page.waitForSelector('#user-info');
            const userInfo = await page.$eval('#user-info', el => el.textContent);
            expect(userInfo).toContain('testuser');
        });
        
        test('should handle login failure gracefully', async () => {
            // Override mock for this test
            await page.setRequestInterception(true);
            page.on('request', request => {
                const url = request.url();
                if (url.includes('/api/v1/auth/login')) {
                    request.respond({
                        status: 401,
                        contentType: 'application/json',
                        body: JSON.stringify({
                            detail: 'Invalid credentials'
                        })
                    });
                } else {
                    request.continue();
                }
            });
            
            await page.goto(`${BASE_URL}/index.html`);
            
            // Fill login form with wrong credentials
            await page.type('#login-username', 'wronguser');
            await page.type('#login-password', 'wrongpassword');
            
            // Submit login
            await page.click('#login-btn');
            
            // Verify error toast appears
            await page.waitForSelector('.toast.error', { visible: true });
            const toastText = await page.$eval('.toast.error', el => el.textContent);
            expect(toastText).toContain('Invalid credentials');
            
            // Verify user stays on auth section
            const authSection = await page.$('#auth-section');
            expect(authSection).toBeTruthy();
        });
    });
    
    describe('Canvas Management Flow', () => {
        beforeEach(async () => {
            // Login first for canvas tests
            await page.goto(`${BASE_URL}/index.html`);
            await page.waitForSelector('#auth-section');
            await page.type('#login-username', 'testuser');
            await page.type('#login-password', 'password123');
            await page.click('#login-btn');
            await page.waitForSelector('#canvas-section', { visible: true });
        });
        
        test('should display available canvases', async () => {
            // Wait for canvases to load
            await page.waitForSelector('.canvas-list .canvas-item');
            
            // Verify canvases are displayed
            const canvasItems = await page.$$('.canvas-list .canvas-item');
            expect(canvasItems.length).toBeGreaterThan(0);
            
            // Verify canvas names are displayed
            const firstCanvasName = await page.$eval('.canvas-item:first-child .canvas-name', el => el.textContent);
            expect(firstCanvasName).toContain('Canvas');
        });
        
        test('should create new canvas successfully', async () => {
            // Click create canvas button
            await page.click('#create-canvas-btn');
            
            // Wait for modal to appear
            await page.waitForSelector('#create-canvas-modal', { visible: true });
            
            // Fill canvas creation form
            await page.type('#canvas-name', 'My New Canvas');
            await page.type('#canvas-width', '150');
            await page.type('#canvas-height', '150');
            await page.click('#canvas-public');
            
            // Submit form
            await page.click('#create-canvas-submit');
            
            // Wait for success message
            await page.waitForSelector('.toast.success', { visible: true });
            const toastText = await page.$eval('.toast.success', el => el.textContent);
            expect(toastText).toContain('Canvas created successfully');
            
            // Verify modal closes
            await page.waitForSelector('#create-canvas-modal', { hidden: true });
        });
        
        test('should open canvas for editing', async () => {
            // Wait for canvases to load
            await page.waitForSelector('.canvas-list .canvas-item');
            
            // Click on first canvas
            await page.click('.canvas-item:first-child .open-canvas-btn');
            
            // Wait for canvas editor to appear
            await page.waitForSelector('#canvas-editor', { visible: true });
            
            // Verify canvas element is present
            const canvas = await page.$('#canvas-element');
            expect(canvas).toBeTruthy();
            
            // Verify tools are available
            const tools = await page.$('.tool-panel');
            expect(tools).toBeTruthy();
        });
    });
    
    describe('Canvas Editing Flow', () => {
        beforeEach(async () => {
            // Login and open canvas for editing
            await page.goto(`${BASE_URL}/index.html`);
            await page.waitForSelector('#auth-section');
            await page.type('#login-username', 'testuser');
            await page.type('#login-password', 'password123');
            await page.click('#login-btn');
            await page.waitForSelector('#canvas-section', { visible: true });
            await page.waitForSelector('.canvas-list .canvas-item');
            await page.click('.canvas-item:first-child .open-canvas-btn');
            await page.waitForSelector('#canvas-editor', { visible: true });
        });
        
        test('should change drawing tool', async () => {
            // Click on different tools
            await page.click('[data-tool="paint"]');
            
            // Verify tool is selected
            const paintTool = await page.$('[data-tool="paint"].active');
            expect(paintTool).toBeTruthy();
            
            // Switch to erase tool
            await page.click('[data-tool="erase"]');
            
            // Verify tool is selected
            const eraseTool = await page.$('[data-tool="erase"].active');
            expect(eraseTool).toBeTruthy();
        });
        
        test('should change drawing color', async () => {
            // Click color picker
            await page.click('#color-picker');
            
            // Set color value
            await page.evaluate(() => {
                document.getElementById('color-picker').value = '#FF0000';
                document.getElementById('color-picker').dispatchEvent(new Event('change'));
            });
            
            // Verify color changed
            const colorValue = await page.$eval('#color-picker', el => el.value);
            expect(colorValue).toBe('#ff0000'); // Note: browsers normalize to lowercase
        });
        
        test('should draw on canvas', async () => {
            // Get canvas element
            const canvas = await page.$('#canvas-element');
            
            // Simulate mouse click on canvas
            await canvas.click({ offset: { x: 50, y: 50 } });
            
            // Wait for tile save request
            await page.waitForResponse(response => 
                response.url().includes('/api/v1/tiles') && response.status() === 201
            );
            
            // Verify success toast appears
            await page.waitForSelector('.toast.success', { visible: true });
            const toastText = await page.$eval('.toast.success', el => el.textContent);
            expect(toastText).toContain('Tile saved successfully');
        });
        
        test('should save canvas changes', async () => {
            // Make a change to the canvas
            const canvas = await page.$('#canvas-element');
            await canvas.click({ offset: { x: 25, y: 25 } });
            
            // Wait for auto-save or click save button if available
            await page.waitForResponse(response => 
                response.url().includes('/api/v1/tiles') && response.status() === 201
            );
            
            // Verify changes are saved
            await page.waitForSelector('.toast.success', { visible: true });
        });
    });
    
    describe('User Session Management', () => {
        test('should logout successfully', async () => {
            // Login first
            await page.goto(`${BASE_URL}/index.html`);
            await page.waitForSelector('#auth-section');
            await page.type('#login-username', 'testuser');
            await page.type('#login-password', 'password123');
            await page.click('#login-btn');
            await page.waitForSelector('#canvas-section', { visible: true });
            
            // Click logout button
            await page.click('#logout-btn');
            
            // Verify redirect to auth section
            await page.waitForSelector('#auth-section', { visible: true });
            
            // Verify logout toast
            await page.waitForSelector('.toast.info', { visible: true });
            const toastText = await page.$eval('.toast.info', el => el.textContent);
            expect(toastText).toContain('Logged out successfully');
        });
        
        test('should persist authentication across page refresh', async () => {
            // Login first
            await page.goto(`${BASE_URL}/index.html`);
            await page.waitForSelector('#auth-section');
            await page.type('#login-username', 'testuser');
            await page.type('#login-password', 'password123');
            await page.click('#login-btn');
            await page.waitForSelector('#canvas-section', { visible: true });
            
            // Refresh page
            await page.reload();
            
            // Verify user is still logged in
            await page.waitForSelector('#canvas-section', { visible: true });
            const userInfo = await page.$('#user-info');
            expect(userInfo).toBeTruthy();
        });
    });
    
    describe('Error Handling and Edge Cases', () => {
        test('should handle network errors gracefully', async () => {
            // Override mock to simulate network error
            await page.setRequestInterception(true);
            page.on('request', request => {
                const url = request.url();
                if (url.includes('/api/v1/auth/login')) {
                    request.abort();
                } else {
                    request.continue();
                }
            });
            
            await page.goto(`${BASE_URL}/index.html`);
            
            // Try to login
            await page.type('#login-username', 'testuser');
            await page.type('#login-password', 'password123');
            await page.click('#login-btn');
            
            // Verify network error is handled
            await page.waitForSelector('.toast.error', { visible: true });
            const toastText = await page.$eval('.toast.error', el => el.textContent);
            expect(toastText).toContain('Network error');
        });
        
        test('should handle invalid form data', async () => {
            await page.goto(`${BASE_URL}/index.html`);
            
            // Try to submit empty login form
            await page.click('#login-btn');
            
            // Verify validation errors are shown
            const errorElements = await page.$$('.field-error');
            expect(errorElements.length).toBeGreaterThan(0);
        });
    });
    
    describe('Responsive Design', () => {
        test('should work on mobile viewport', async () => {
            // Set mobile viewport
            await page.setViewport({ width: 375, height: 667 });
            
            await page.goto(`${BASE_URL}/index.html`);
            
            // Verify page loads correctly
            await page.waitForSelector('#auth-section');
            
            // Test basic functionality
            await page.type('#login-username', 'testuser');
            await page.type('#login-password', 'password123');
            await page.click('#login-btn');
            
            // Verify login works on mobile
            await page.waitForSelector('#canvas-section', { visible: true });
        });
    });
    
    describe('Performance', () => {
        test('should load page within acceptable time', async () => {
            const startTime = Date.now();
            
            await page.goto(`${BASE_URL}/index.html`);
            await page.waitForSelector('#auth-section');
            
            const loadTime = Date.now() - startTime;
            expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
        });
        
        test('should handle canvas interactions smoothly', async () => {
            // Login and open canvas
            await page.goto(`${BASE_URL}/index.html`);
            await page.waitForSelector('#auth-section');
            await page.type('#login-username', 'testuser');
            await page.type('#login-password', 'password123');
            await page.click('#login-btn');
            await page.waitForSelector('#canvas-section', { visible: true });
            await page.waitForSelector('.canvas-list .canvas-item');
            await page.click('.canvas-item:first-child .open-canvas-btn');
            await page.waitForSelector('#canvas-editor', { visible: true });
            
            // Perform multiple canvas clicks rapidly
            const canvas = await page.$('#canvas-element');
            const startTime = Date.now();
            
            for (let i = 0; i < 10; i++) {
                await canvas.click({ offset: { x: 10 + i * 5, y: 10 + i * 5 } });
            }
            
            const interactionTime = Date.now() - startTime;
            expect(interactionTime).toBeLessThan(2000); // Should handle interactions smoothly
        });
    });
}); 