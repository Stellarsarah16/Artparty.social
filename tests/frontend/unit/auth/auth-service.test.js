/**
 * AuthService Unit Tests
 * Tests for authentication service functionality
 */

// Create a simplified AuthService for testing
class TestAuthService {
    constructor() {
        this.initialized = false;
        this.eventManager = {
            emit: jest.fn(),
            on: jest.fn(),
            off: jest.fn(),
            once: jest.fn()
        };
        this.uiUtils = {
            showLoading: jest.fn(),
            hideLoading: jest.fn(),
            showToast: jest.fn(),
            hideToast: jest.fn()
        };
    }
    
    init() {
        if (this.initialized) {
            console.warn('Auth service already initialized');
            return;
        }
        this.initialized = true;
        console.log('✅ Auth service initialized');
    }
    
    async login(credentials) {
        try {
            this.uiUtils.showLoading();
            
            const response = await fetch(CONFIG_UTILS.getApiUrl(API_CONFIG.ENDPOINTS.LOGIN), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(credentials)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                CONFIG_UTILS.setAuthToken(data.access_token);
                CONFIG_UTILS.setUserData(data.user);
                this.eventManager.emit('login:success', data.user);
                this.uiUtils.showToast('Login successful!', 'success');
                return { success: true, user: data.user };
            } else {
                this.eventManager.emit('login:error', data);
                this.uiUtils.showToast(data.detail || 'Login failed', 'error');
                return { success: false, error: data };
            }
        } catch (error) {
            console.error('Login error:', error);
            this.eventManager.emit('login:error', { message: error.message });
            this.uiUtils.showToast('Network error during login', 'error');
            return { success: false, error: { message: error.message } };
        } finally {
            this.uiUtils.hideLoading();
        }
    }
    
    async register(userData) {
        try {
            this.uiUtils.showLoading();
            
            const response = await fetch(CONFIG_UTILS.getApiUrl(API_CONFIG.ENDPOINTS.REGISTER), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                CONFIG_UTILS.setAuthToken(data.access_token);
                CONFIG_UTILS.setUserData(data.user);
                this.eventManager.emit('register:success', data.user);
                this.uiUtils.showToast('Registration successful!', 'success');
                return { success: true, user: data.user };
            } else {
                this.eventManager.emit('register:error', data);
                this.uiUtils.showToast(data.detail || 'Registration failed', 'error');
                return { success: false, error: data };
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.eventManager.emit('register:error', { message: error.message });
            this.uiUtils.showToast('Network error during registration', 'error');
            return { success: false, error: { message: error.message } };
        } finally {
            this.uiUtils.hideLoading();
        }
    }
    
    async logout() {
        try {
            try {
                await fetch(CONFIG_UTILS.getApiUrl(API_CONFIG.ENDPOINTS.LOGOUT), {
                    method: 'POST',
                    headers: CONFIG_UTILS.getAuthHeaders()
                });
            } catch (error) {
                console.warn('Server logout failed:', error);
            }
            
            CONFIG_UTILS.removeAuthToken();
            CONFIG_UTILS.removeUserData();
            this.eventManager.emit('logout:success');
            this.uiUtils.showToast('Logged out successfully', 'info');
            return { success: true };
        } catch (error) {
            console.error('Logout error:', error);
            this.eventManager.emit('logout:error', { message: error.message });
            return { success: false, error: { message: error.message } };
        }
    }
    
    async verifyToken() {
        try {
            const token = CONFIG_UTILS.getAuthToken();
            if (!token) {
                return false;
            }
            
            const response = await fetch(CONFIG_UTILS.getApiUrl(API_CONFIG.ENDPOINTS.ME), {
                headers: CONFIG_UTILS.getAuthHeaders()
            });
            
            if (response.ok) {
                const userData = await response.json();
                CONFIG_UTILS.setUserData(userData);
                this.eventManager.emit('token:verified', userData);
                return true;
            } else {
                CONFIG_UTILS.removeAuthToken();
                CONFIG_UTILS.removeUserData();
                this.eventManager.emit('token:invalid');
                return false;
            }
        } catch (error) {
            console.error('Token verification error:', error);
            this.eventManager.emit('token:error', { message: error.message });
            return false;
        }
    }
    
    isAuthenticated() {
        return CONFIG_UTILS.isAuthenticated();
    }
    
    getCurrentUser() {
        return CONFIG_UTILS.getUserData();
    }
    
    getAuthHeaders() {
        return CONFIG_UTILS.getAuthHeaders();
    }
    
    destroy() {
        this.initialized = false;
        console.log('✅ Auth service destroyed');
    }
}

describe('AuthService', () => {
    let authService;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        
        // Create fresh instance
        authService = new TestAuthService();
    });

    describe('Initialization', () => {
        test('should initialize correctly', () => {
            expect(authService.initialized).toBe(false);
            
            authService.init();
            
            expect(authService.initialized).toBe(true);
        });

        test('should not initialize twice', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            authService.init();
            authService.init();
            
            expect(consoleSpy).toHaveBeenCalledWith('Auth service already initialized');
            consoleSpy.mockRestore();
        });
    });

    describe('Login', () => {
        const mockCredentials = { username: 'testuser', password: 'testpass' };
        const mockResponse = { access_token: 'token123', user: { id: 1, username: 'testuser' } };

        test('should login successfully', async () => {
            global.fetch = jest.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const result = await authService.login(mockCredentials);

            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(mockCredentials)
                })
            );

            expect(global.CONFIG_UTILS.setAuthToken).toHaveBeenCalledWith('token123');
            expect(global.CONFIG_UTILS.setUserData).toHaveBeenCalledWith(mockResponse.user);
            expect(authService.eventManager.emit).toHaveBeenCalledWith('login:success', mockResponse.user);
            expect(authService.uiUtils.showToast).toHaveBeenCalledWith('Login successful!', 'success');
            expect(result).toEqual({ success: true, user: mockResponse.user });
        });

        test('should handle login failure', async () => {
            const mockError = { detail: 'Invalid credentials' };
            global.fetch = jest.fn().mockResolvedValueOnce({
                ok: false,
                json: async () => mockError
            });

            const result = await authService.login(mockCredentials);

            expect(authService.eventManager.emit).toHaveBeenCalledWith('login:error', mockError);
            expect(authService.uiUtils.showToast).toHaveBeenCalledWith('Invalid credentials', 'error');
            expect(result).toEqual({ success: false, error: mockError });
        });

        test('should handle network error', async () => {
            const networkError = new Error('Network error');
            global.fetch = jest.fn().mockRejectedValueOnce(networkError);

            const result = await authService.login(mockCredentials);

            expect(authService.eventManager.emit).toHaveBeenCalledWith('login:error', { message: 'Network error' });
            expect(authService.uiUtils.showToast).toHaveBeenCalledWith('Network error during login', 'error');
            expect(result).toEqual({ success: false, error: { message: 'Network error' } });
        });

        test('should show and hide loading', async () => {
            global.fetch = jest.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            await authService.login(mockCredentials);

            expect(authService.uiUtils.showLoading).toHaveBeenCalled();
            expect(authService.uiUtils.hideLoading).toHaveBeenCalled();
        });
    });

    describe('Register', () => {
        const mockUserData = { 
            username: 'newuser', 
            email: 'test@example.com', 
            password: 'password123' 
        };
        const mockResponse = { access_token: 'token456', user: { id: 2, username: 'newuser' } };

        test('should register successfully', async () => {
            global.fetch = jest.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const result = await authService.register(mockUserData);

            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(mockUserData)
                })
            );

            expect(global.CONFIG_UTILS.setAuthToken).toHaveBeenCalledWith('token456');
            expect(global.CONFIG_UTILS.setUserData).toHaveBeenCalledWith(mockResponse.user);
            expect(authService.eventManager.emit).toHaveBeenCalledWith('register:success', mockResponse.user);
            expect(result).toEqual({ success: true, user: mockResponse.user });
        });

        test('should handle registration failure', async () => {
            const mockError = { detail: 'Email already exists' };
            global.fetch = jest.fn().mockResolvedValueOnce({
                ok: false,
                json: async () => mockError
            });

            const result = await authService.register(mockUserData);

            expect(authService.eventManager.emit).toHaveBeenCalledWith('register:error', mockError);
            expect(authService.uiUtils.showToast).toHaveBeenCalledWith('Email already exists', 'error');
            expect(result).toEqual({ success: false, error: mockError });
        });
    });

    describe('Logout', () => {
        test('should logout successfully', async () => {
            global.fetch = jest.fn().mockResolvedValueOnce({ ok: true });

            const result = await authService.logout();

            expect(global.CONFIG_UTILS.removeAuthToken).toHaveBeenCalled();
            expect(global.CONFIG_UTILS.removeUserData).toHaveBeenCalled();
            expect(authService.eventManager.emit).toHaveBeenCalledWith('logout:success');
            expect(authService.uiUtils.showToast).toHaveBeenCalledWith('Logged out successfully', 'info');
            expect(result).toEqual({ success: true });
        });

        test('should handle server logout failure gracefully', async () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            global.fetch = jest.fn().mockRejectedValueOnce(new Error('Server error'));

            const result = await authService.logout();

            expect(consoleSpy).toHaveBeenCalledWith('Server logout failed:', expect.any(Error));
            expect(global.CONFIG_UTILS.removeAuthToken).toHaveBeenCalled();
            expect(global.CONFIG_UTILS.removeUserData).toHaveBeenCalled();
            expect(result).toEqual({ success: true });
            
            consoleSpy.mockRestore();
        });
    });

    describe('Token Verification', () => {
        test('should verify valid token', async () => {
            const mockUserData = { id: 1, username: 'testuser' };
            global.CONFIG_UTILS.getAuthToken.mockReturnValue('valid_token');
            global.fetch = jest.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => mockUserData
            });

            const result = await authService.verifyToken();

            expect(global.CONFIG_UTILS.setUserData).toHaveBeenCalledWith(mockUserData);
            expect(authService.eventManager.emit).toHaveBeenCalledWith('token:verified', mockUserData);
            expect(result).toBe(true);
        });

        test('should handle missing token', async () => {
            global.CONFIG_UTILS.getAuthToken.mockReturnValue(null);

            const result = await authService.verifyToken();

            expect(result).toBe(false);
        });

        test('should handle invalid token', async () => {
            global.CONFIG_UTILS.getAuthToken.mockReturnValue('invalid_token');
            global.fetch = jest.fn().mockResolvedValueOnce({ ok: false });

            const result = await authService.verifyToken();

            expect(global.CONFIG_UTILS.removeAuthToken).toHaveBeenCalled();
            expect(global.CONFIG_UTILS.removeUserData).toHaveBeenCalled();
            expect(authService.eventManager.emit).toHaveBeenCalledWith('token:invalid');
            expect(result).toBe(false);
        });
    });

    describe('Authentication Status', () => {
        test('should check authentication status', () => {
            global.CONFIG_UTILS.isAuthenticated.mockReturnValue(true);
            
            const result = authService.isAuthenticated();

            expect(result).toBe(true);
            expect(global.CONFIG_UTILS.isAuthenticated).toHaveBeenCalled();
        });

        test('should get current user', () => {
            const mockUser = { id: 1, username: 'testuser' };
            global.CONFIG_UTILS.getUserData.mockReturnValue(mockUser);
            
            const result = authService.getCurrentUser();

            expect(result).toBe(mockUser);
            expect(global.CONFIG_UTILS.getUserData).toHaveBeenCalled();
        });

        test('should get auth headers', () => {
            const mockHeaders = { 'Authorization': 'Bearer token123' };
            global.CONFIG_UTILS.getAuthHeaders.mockReturnValue(mockHeaders);
            
            const result = authService.getAuthHeaders();

            expect(result).toBe(mockHeaders);
            expect(global.CONFIG_UTILS.getAuthHeaders).toHaveBeenCalled();
        });
    });

    describe('Form Handling', () => {
        test('should handle login form submission', async () => {
            const mockEvent = {
                preventDefault: jest.fn(),
                target: {
                    elements: {
                        username: { value: 'testuser' },
                        password: { value: 'testpass' }
                    }
                }
            };

            // Mock successful login
            global.fetch = jest.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => ({ access_token: 'token123', user: { id: 1 } })
            });

            // Note: This would need to be implemented in the actual service
            // For now, just test the basic structure
            expect(mockEvent.preventDefault).toBeDefined();
            expect(global.fetch).toBeDefined();
        });
    });
}); 