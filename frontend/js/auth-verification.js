/**
 * Auth Verification Module
 * Handles email verification and password reset functionality
 * Integrates with existing UIManager, API system, and modal management
 */

class AuthVerificationManager {
    constructor() {
        this.isInitialized = false;
        this.init();
    }

    init() {
        if (this.isInitialized) return;
        
        // Wait for DOM to be ready and API to be available
        const initializeWhenReady = () => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.waitForAPIAndSetup());
            } else {
                this.waitForAPIAndSetup();
            }
        };
        
        initializeWhenReady();
        this.isInitialized = true;
    }

    async waitForAPIAndSetup() {
        // Wait for API to be available
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait
        
        while (!window.API && attempts < maxAttempts) {
            console.log(`⏳ Waiting for API... (attempt ${attempts + 1}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.API) {
            console.error('❌ API not available after waiting');
            return;
        }
        
        console.log('✅ API available, setting up auth verification event listeners');
        this.setupEventListeners();
    }

    setupEventListeners() {
        console.log('🔧 Setting up auth verification event listeners...');

        // Modal opener links
        this.setupModalOpeners();
        
        // Form submissions
        this.setupFormHandlers();
        
        // Modal transitions
        this.setupModalTransitions();
        
        // Resend buttons
        this.setupResendButtons();
        
        console.log('✅ Auth verification event listeners setup complete');
    }

    setupModalOpeners() {
        // Password reset link in login modal
        document.getElementById('open-password-reset')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showPasswordResetModal();
        });

        // Email verification links
        document.getElementById('open-email-verification')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showEmailVerificationModal();
        });

        document.getElementById('open-email-verification-from-register')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showEmailVerificationModal();
        });
    }

    setupFormHandlers() {
        // Email verification request
        document.getElementById('email-verification-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleEmailVerificationRequest();
        });

        // Email verification confirmation
        document.getElementById('email-confirmation-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleEmailVerificationConfirm();
        });

        // Password reset request
        document.getElementById('password-reset-request-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handlePasswordResetRequest();
        });

        // Password reset confirmation
        document.getElementById('password-reset-confirm-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handlePasswordResetConfirm();
        });
    }

    setupModalTransitions() {
        // Go to login after successful verification
        document.getElementById('go-to-login')?.addEventListener('click', () => {
            this.hideEmailVerificationModal();
            this.showLoginModal();
        });

        // Go to login after successful password reset
        document.getElementById('go-to-login-from-reset')?.addEventListener('click', () => {
            this.hidePasswordResetModal();
            this.showLoginModal();
        });
    }

    setupResendButtons() {
        // Resend verification email
        document.getElementById('resend-verification')?.addEventListener('click', () => {
            this.showVerificationRequestStep();
        });

        // Resend password reset email
        document.getElementById('resend-reset')?.addEventListener('click', () => {
            this.showResetRequestStep();
        });
    }

    // Modal Management Methods
    showEmailVerificationModal() {
        if (window.modalManager) {
            window.modalManager.showModal('email-verification');
        } else {
            console.error('❌ ModalManager not available');
        }
    }

    hideEmailVerificationModal() {
        if (window.modalManager) {
            window.modalManager.hideModal('email-verification');
        }
    }

    showPasswordResetModal() {
        if (window.modalManager) {
            window.modalManager.showModal('password-reset');
        } else {
            console.error('❌ ModalManager not available');
        }
    }

    hidePasswordResetModal() {
        if (window.modalManager) {
            window.modalManager.hideModal('password-reset');
        }
    }

    showLoginModal() {
        if (window.modalManager) {
            window.modalManager.showModal('login');
        }
    }

    // Step Management Methods
    showVerificationRequestStep() {
        document.getElementById('verification-request-step')?.classList.remove('hidden');
        document.getElementById('verification-confirm-step')?.classList.add('hidden');
        document.getElementById('verification-success-step')?.classList.add('hidden');
    }

    showVerificationConfirmStep() {
        document.getElementById('verification-request-step')?.classList.add('hidden');
        document.getElementById('verification-confirm-step')?.classList.remove('hidden');
        document.getElementById('verification-success-step')?.classList.add('hidden');
    }

    showVerificationSuccessStep() {
        document.getElementById('verification-request-step')?.classList.add('hidden');
        document.getElementById('verification-confirm-step')?.classList.add('hidden');
        document.getElementById('verification-success-step')?.classList.remove('hidden');
    }

    showResetRequestStep() {
        document.getElementById('reset-request-step')?.classList.remove('hidden');
        document.getElementById('reset-confirm-step')?.classList.add('hidden');
        document.getElementById('reset-success-step')?.classList.add('hidden');
    }

    showResetConfirmStep() {
        document.getElementById('reset-request-step')?.classList.add('hidden');
        document.getElementById('reset-confirm-step')?.classList.remove('hidden');
        document.getElementById('reset-success-step')?.classList.add('hidden');
    }

    showResetSuccessStep() {
        document.getElementById('reset-request-step')?.classList.add('hidden');
        document.getElementById('reset-confirm-step')?.classList.add('hidden');
        document.getElementById('reset-success-step')?.classList.remove('hidden');
    }

    // Form Handler Methods
    async handleEmailVerificationRequest() {
        const email = document.getElementById('verification-email')?.value;
        if (!email) {
            this.showToast('Please enter your email address', 'error');
            return;
        }

        const submitBtn = document.querySelector('#email-verification-form button[type="submit"]');
        const originalText = submitBtn?.textContent;
        
        try {
            // Show loading state
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            }

            // Make API call
            if (!window.API || !window.API.auth) {
                throw new Error('API not available');
            }
            
            const response = await window.API.auth.sendVerificationEmail(email);

            if (response.success) {
                this.showToast('Verification email sent successfully!', 'success');
                this.showVerificationConfirmStep();
            } else {
                this.showToast(response.message || 'Failed to send verification email', 'error');
            }

        } catch (error) {
            console.error('❌ Email verification request failed:', error);
            console.error('❌ Error details:', {
                message: error.message,
                stack: error.stack,
                apiAvailable: !!window.API,
                email: email
            });
            this.showToast('Failed to send verification email. Please try again.', 'error');
        } finally {
            // Restore button state
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    }

    async handleEmailVerificationConfirm() {
        const token = document.getElementById('verification-token')?.value;
        if (!token) {
            this.showToast('Please enter the verification code', 'error');
            return;
        }

        const submitBtn = document.querySelector('#email-confirmation-form button[type="submit"]');
        const originalText = submitBtn?.textContent;
        
        try {
            // Show loading state
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
            }

            // Make API call
            if (!window.API || !window.API.auth) {
                throw new Error('API not available');
            }
            
            const response = await window.API.auth.confirmEmailVerification(token);

            if (response.success) {
                this.showToast('Email verified successfully!', 'success');
                this.showVerificationSuccessStep();
            } else {
                this.showToast(response.message || 'Invalid or expired verification code', 'error');
            }

        } catch (error) {
            console.error('❌ Email verification confirmation failed:', error);
            this.showToast('Failed to verify email. Please check your code and try again.', 'error');
        } finally {
            // Restore button state
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    }

    async handlePasswordResetRequest() {
        const email = document.getElementById('reset-email')?.value;
        if (!email) {
            this.showToast('Please enter your email address', 'error');
            return;
        }

        const submitBtn = document.querySelector('#password-reset-request-form button[type="submit"]');
        const originalText = submitBtn?.textContent;
        
        try {
            // Show loading state
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            }

            // Make API call
            if (!window.API || !window.API.auth) {
                throw new Error('API not available');
            }
            
            const response = await window.API.auth.sendPasswordResetEmail(email);

            if (response.success) {
                this.showToast('Password reset email sent successfully!', 'success');
                this.showResetConfirmStep();
            } else {
                this.showToast(response.message || 'Failed to send password reset email', 'error');
            }

        } catch (error) {
            console.error('❌ Password reset request failed:', error);
            this.showToast('Failed to send password reset email. Please try again.', 'error');
        } finally {
            // Restore button state
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    }

    async handlePasswordResetConfirm() {
        const token = document.getElementById('reset-token')?.value;
        const newPassword = document.getElementById('new-password')?.value;
        
        if (!token || !newPassword) {
            this.showToast('Please enter both the reset code and new password', 'error');
            return;
        }

        if (newPassword.length < 6) {
            this.showToast('Password must be at least 6 characters long', 'error');
            return;
        }

        const submitBtn = document.querySelector('#password-reset-confirm-form button[type="submit"]');
        const originalText = submitBtn?.textContent;
        
        try {
            // Show loading state
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resetting...';
            }

            // Make API call
            if (!window.API || !window.API.auth) {
                throw new Error('API not available');
            }
            
            const response = await window.API.auth.confirmPasswordReset(token, newPassword);

            if (response.success) {
                this.showToast('Password reset successfully!', 'success');
                this.showResetSuccessStep();
            } else {
                this.showToast(response.message || 'Invalid or expired reset code', 'error');
            }

        } catch (error) {
            console.error('❌ Password reset confirmation failed:', error);
            this.showToast('Failed to reset password. Please check your code and try again.', 'error');
        } finally {
            // Restore button state
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    }

    // Utility Methods
    showToast(message, type = 'info') {
        if (window.UIManager) {
            window.UIManager.showToast(message, type);
        } else {
            // Fallback to alert if UIManager not available
            alert(message);
        }
    }

    // Public API
    static getInstance() {
        if (!AuthVerificationManager.instance) {
            AuthVerificationManager.instance = new AuthVerificationManager();
        }
        return AuthVerificationManager.instance;
    }
}

// Initialize the manager
const authVerificationManager = AuthVerificationManager.getInstance();

// Export for use in other modules
window.authVerificationManager = authVerificationManager;

console.log('✅ AuthVerificationManager initialized'); 