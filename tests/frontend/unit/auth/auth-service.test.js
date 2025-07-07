/**
 * Unit Tests for AuthService
 * Testing authentication functionality, API calls, and error handling
 */

// Mock dependencies
const mockEventManager = {
    emit: jest.fn()
};

const mockUiUtils = {
    showLoading: jest.fn(),
    hideLoading: jest.fn(),
    showToast: jest.fn()
};

const mockConfigUtils = {
    getApiUrl: jest.fn(),
    setAuthToken: jest.fn(),
    setUserData: jest.fn(),
    removeAuthToken: jest.fn(),
    removeUserData: jest.fn(),
    getAuthToken: jest.fn(),
    getUserData: jest.fn(),
    getAuthHeaders: jest.fn(),
    isAuthenticated: jest.fn()
};

// Mock global fetch
global.fetch = jest.fn();

// Mock global CONFIG_UTILS and API_CONFIG
global.CONFIG_UTILS = mockConfigUtils;
global.API_CONFIG = {
    ENDPOINTS: {
        LOGIN: '/auth/login',
        REGISTER: '/auth/register',
        LOGOUT: '/auth/logout',
        ME: '/auth/me'
    }
};

// Import the AuthService (would need to be adapted for actual module loading)
import { AuthService } from '../../../../frontend/js/services/auth.js';

describe('AuthService', () => {
    let authService;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        
        // Create fresh instance
        authService = new AuthService();
        
        // Mock global dependencies
        authService.eventManager = mockEventManager;
        authService.uiUtils = mockUiUtils;
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
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const result = await authService.login(mockCredentials);

            expect(fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(mockCredentials)
                })
            );

            expect(mockConfigUtils.setAuthToken).toHaveBeenCalledWith('token123');
            expect(mockConfigUtils.setUserData).toHaveBeenCalledWith(mockResponse.user);
            expect(mockEventManager.emit).toHaveBeenCalledWith('login:success', mockResponse.user);
            expect(mockUiUtils.showToast).toHaveBeenCalledWith('Login successful!', 'success');
            expect(result).toEqual({ success: true, user: mockResponse.user });
        });

        test('should handle login failure', async () => {
            const mockError = { detail: 'Invalid credentials' };
            fetch.mockResolvedValueOnce({
                ok: false,
                json: async () => mockError
            });

            const result = await authService.login(mockCredentials);

            expect(mockEventManager.emit).toHaveBeenCalledWith('login:error', mockError);
            expect(mockUiUtils.showToast).toHaveBeenCalledWith('Invalid credentials', 'error');
            expect(result).toEqual({ success: false, error: mockError });
        });

        test('should handle network error', async () => {
            const networkError = new Error('Network error');
            fetch.mockRejectedValueOnce(networkError);

            const result = await authService.login(mockCredentials);

            expect(mockEventManager.emit).toHaveBeenCalledWith('login:error', { message: 'Network error' });
            expect(mockUiUtils.showToast).toHaveBeenCalledWith('Network error during login', 'error');
            expect(result).toEqual({ success: false, error: { message: 'Network error' } });
        });

        test('should show and hide loading', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            await authService.login(mockCredentials);

            expect(mockUiUtils.showLoading).toHaveBeenCalled();
            expect(mockUiUtils.hideLoading).toHaveBeenCalled();
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
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const result = await authService.register(mockUserData);

            expect(fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(mockUserData)
                })
            );

            expect(mockConfigUtils.setAuthToken).toHaveBeenCalledWith('token456');
            expect(mockConfigUtils.setUserData).toHaveBeenCalledWith(mockResponse.user);
            expect(mockEventManager.emit).toHaveBeenCalledWith('register:success', mockResponse.user);
            expect(result).toEqual({ success: true, user: mockResponse.user });
        });

        test('should handle registration failure', async () => {
            const mockError = { detail: 'Email already exists' };
            fetch.mockResolvedValueOnce({
                ok: false,
                json: async () => mockError
            });

            const result = await authService.register(mockUserData);

            expect(mockEventManager.emit).toHaveBeenCalledWith('register:error', mockError);
            expect(mockUiUtils.showToast).toHaveBeenCalledWith('Email already exists', 'error');
            expect(result).toEqual({ success: false, error: mockError });
        });
    });

    describe('Logout', () => {
        test('should logout successfully', async () => {
            fetch.mockResolvedValueOnce({ ok: true });

            const result = await authService.logout();

            expect(mockConfigUtils.removeAuthToken).toHaveBeenCalled();
            expect(mockConfigUtils.removeUserData).toHaveBeenCalled();
            expect(mockEventManager.emit).toHaveBeenCalledWith('logout:success');
            expect(mockUiUtils.showToast).toHaveBeenCalledWith('Logged out successfully', 'info');
            expect(result).toEqual({ success: true });
        });

        test('should handle server logout failure gracefully', async () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            fetch.mockRejectedValueOnce(new Error('Server error'));

            const result = await authService.logout();

            expect(consoleSpy).toHaveBeenCalledWith('Server logout failed:', expect.any(Error));
            expect(mockConfigUtils.removeAuthToken).toHaveBeenCalled();
            expect(mockConfigUtils.removeUserData).toHaveBeenCalled();
            expect(result).toEqual({ success: true });
            
            consoleSpy.mockRestore();
        });
    });

    describe('Token Verification', () => {
        test('should verify valid token', async () => {
            const mockUserData = { id: 1, username: 'testuser' };
            mockConfigUtils.getAuthToken.mockReturnValue('valid_token');
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockUserData
            });

            const result = await authService.verifyToken();

            expect(mockConfigUtils.setUserData).toHaveBeenCalledWith(mockUserData);
            expect(mockEventManager.emit).toHaveBeenCalledWith('token:verified', mockUserData);
            expect(result).toBe(true);
        });

        test('should handle missing token', async () => {
            mockConfigUtils.getAuthToken.mockReturnValue(null);

            const result = await authService.verifyToken();

            expect(result).toBe(false);
        });

        test('should handle invalid token', async () => {
            mockConfigUtils.getAuthToken.mockReturnValue('invalid_token');
            fetch.mockResolvedValueOnce({ ok: false });

            const result = await authService.verifyToken();

            expect(mockConfigUtils.removeAuthToken).toHaveBeenCalled();
            expect(mockConfigUtils.removeUserData).toHaveBeenCalled();
            expect(mockEventManager.emit).toHaveBeenCalledWith('token:invalid');
            expect(result).toBe(false);
        });
    });

    describe('Form Validation', () => {
        test('should validate login form correctly', () => {
            const validCredentials = { username: 'testuser', password: 'testpass' };
            const result = authService.validateLoginForm(validCredentials);

            expect(result.isValid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        test('should detect missing username', () => {
            const invalidCredentials = { username: '', password: 'testpass' };
            const result = authService.validateLoginForm(invalidCredentials);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Username is required');
        });

        test('should detect missing password', () => {
            const invalidCredentials = { username: 'testuser', password: '' };
            const result = authService.validateLoginForm(invalidCredentials);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Password is required');
        });

        test('should validate registration form correctly', () => {
            const validUserData = { 
                username: 'testuser', 
                email: 'test@example.com', 
                password: 'password123',
                password_confirm: 'password123'
            };
            const result = authService.validateRegistrationForm(validUserData);

            expect(result.isValid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        test('should detect password mismatch', () => {
            const invalidUserData = { 
                username: 'testuser', 
                email: 'test@example.com', 
                password: 'password123',
                password_confirm: 'different_password'
            };
            const result = authService.validateRegistrationForm(invalidUserData);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Passwords do not match');
        });

        test('should detect invalid email format', () => {
            const invalidUserData = { 
                username: 'testuser', 
                email: 'invalid-email', 
                password: 'password123',
                password_confirm: 'password123'
            };
            const result = authService.validateRegistrationForm(invalidUserData);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Invalid email format');
        });
    });

    describe('Authentication Status', () => {
        test('should check authentication status', () => {
            mockConfigUtils.isAuthenticated.mockReturnValue(true);
            
            const result = authService.isAuthenticated();
            
            expect(result).toBe(true);
        });

        test('should get current user', () => {
            const mockUser = { id: 1, username: 'testuser' };
            mockConfigUtils.getUserData.mockReturnValue(mockUser);
            
            const result = authService.getCurrentUser();
            
            expect(result).toEqual(mockUser);
        });

        test('should get auth headers', () => {
            const mockHeaders = { 'Authorization': 'Bearer token123' };
            mockConfigUtils.getAuthHeaders.mockReturnValue(mockHeaders);
            
            const result = authService.getAuthHeaders();
            
            expect(result).toEqual(mockHeaders);
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
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ access_token: 'token123', user: { id: 1 } })
            });

            await authService.handleLoginForm(mockEvent);

            expect(mockEvent.preventDefault).toHaveBeenCalled();
            expect(fetch).toHaveBeenCalled();
        });
    });

    describe('Cleanup', () => {
        test('should destroy service properly', () => {
            authService.init();
            authService.destroy();
            
            expect(authService.initialized).toBe(false);
        });
    });
}); 