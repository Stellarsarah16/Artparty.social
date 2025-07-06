/**
 * Real-time Form Validation for StellarArtCollab
 * Provides immediate feedback as users type
 */

class FormValidator {
    constructor() {
        this.validators = {
            username: this.validateUsername.bind(this),
            email: this.validateEmail.bind(this),
            first_name: this.validateFirstName.bind(this),
            last_name: this.validateLastName.bind(this),
            password: this.validatePassword.bind(this),
            confirm_password: this.validateConfirmPassword.bind(this)
        };
        
        this.debounceTimers = {};
        this.passwordValue = '';
        
        this.initializeValidation();
    }
    
    initializeValidation() {
        // Add event listeners for real-time validation
        document.addEventListener('DOMContentLoaded', () => {
            this.setupFormValidation('register-form');
        });
    }
    
    setupFormValidation(formId) {
        const form = document.getElementById(formId);
        if (!form) return;
        
        // Add validation to each field
        Object.keys(this.validators).forEach(fieldName => {
            const field = form.querySelector(`#register-${fieldName.replace('_', '-')}`);
            if (field) {
                this.setupFieldValidation(field, fieldName);
            }
        });
    }
    
    setupFieldValidation(field, fieldName) {
        // Real-time validation on input
        field.addEventListener('input', (e) => {
            this.debounceValidation(field, fieldName, e.target.value);
        });
        
        // Validation on blur
        field.addEventListener('blur', (e) => {
            this.validateField(field, fieldName, e.target.value);
        });
        
        // Clear errors on focus
        field.addEventListener('focus', () => {
            this.clearFieldError(field);
        });
        
        // Special handling for password field
        if (fieldName === 'password') {
            this.setupPasswordStrengthIndicator(field);
        }
    }
    
    debounceValidation(field, fieldName, value) {
        // Clear existing timer
        if (this.debounceTimers[fieldName]) {
            clearTimeout(this.debounceTimers[fieldName]);
        }
        
        // Set new timer
        this.debounceTimers[fieldName] = setTimeout(() => {
            this.validateField(field, fieldName, value);
        }, 300);
    }
    
    validateField(field, fieldName, value) {
        const validator = this.validators[fieldName];
        if (!validator) return;
        
        const result = validator(value);
        this.displayValidationResult(field, result);
        
        return result;
    }
    
    displayValidationResult(field, result) {
        this.clearFieldError(field);
        
        field.classList.remove('error', 'success', 'validating');
        
        if (result.isValid) {
            field.classList.add('success');
        } else if (result.message) {
            field.classList.add('error');
            this.showFieldError(field, result.message);
        }
    }
    
    // Validation methods
    validateUsername(value) {
        if (!value || !value.trim()) {
            return { isValid: false, message: 'Username is required' };
        }
        
        value = value.trim();
        
        if (value.length < 3) {
            return { isValid: false, message: 'Username must be at least 3 characters long' };
        }
        
        if (value.length > 50) {
            return { isValid: false, message: 'Username must be less than 50 characters' };
        }
        
        if (!/^[a-zA-Z0-9_]+$/.test(value)) {
            return { isValid: false, message: 'Username can only contain letters, numbers, and underscores' };
        }
        
        if (value.startsWith('_') || value.endsWith('_')) {
            return { isValid: false, message: 'Username cannot start or end with underscore' };
        }
        
        return { isValid: true };
    }
    
    validateEmail(value) {
        if (!value || !value.trim()) {
            return { isValid: false, message: 'Email is required' };
        }
        
        value = value.trim();
        
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            return { isValid: false, message: 'Please enter a valid email address' };
        }
        
        if (value.length > 100) {
            return { isValid: false, message: 'Email address is too long' };
        }
        
        return { isValid: true };
    }
    
    validateFirstName(value) {
        if (!value || !value.trim()) {
            return { isValid: false, message: 'First name is required' };
        }
        
        value = value.trim();
        
        if (value.length > 50) {
            return { isValid: false, message: 'First name must be less than 50 characters' };
        }
        
        if (!/^[a-zA-Z\s\-']+$/.test(value)) {
            return { isValid: false, message: 'First name can only contain letters, spaces, hyphens, and apostrophes' };
        }
        
        return { isValid: true };
    }
    
    validateLastName(value) {
        if (!value || !value.trim()) {
            return { isValid: false, message: 'Last name is required' };
        }
        
        value = value.trim();
        
        if (value.length > 50) {
            return { isValid: false, message: 'Last name must be less than 50 characters' };
        }
        
        if (!/^[a-zA-Z\s\-']+$/.test(value)) {
            return { isValid: false, message: 'Last name can only contain letters, spaces, hyphens, and apostrophes' };
        }
        
        return { isValid: true };
    }
    
    validatePassword(value) {
        this.passwordValue = value; // Store for confirm password validation
        
        if (!value) {
            return { isValid: false, message: 'Password is required' };
        }
        
        if (value.length < 8) {
            return { isValid: false, message: 'Password must be at least 8 characters long' };
        }
        
        if (value.length > 128) {
            return { isValid: false, message: 'Password is too long (maximum 128 characters)' };
        }
        
        if (!/[a-z]/.test(value)) {
            return { isValid: false, message: 'Password must contain at least one lowercase letter' };
        }
        
        if (!/[A-Z0-9]/.test(value)) {
            return { isValid: false, message: 'Password must contain at least one uppercase letter or number' };
        }
        
        const weakPasswords = ['password', '12345678', 'qwerty123', 'abc12345'];
        if (weakPasswords.includes(value.toLowerCase())) {
            return { isValid: false, message: 'Password is too common, please choose a stronger password' };
        }
        
        return { isValid: true };
    }
    
    validateConfirmPassword(value) {
        if (!value) {
            return { isValid: false, message: 'Please confirm your password' };
        }
        
        if (value !== this.passwordValue) {
            return { isValid: false, message: 'Passwords do not match' };
        }
        
        return { isValid: true };
    }
    
    setupPasswordStrengthIndicator(passwordField) {
        // Create password strength indicator
        const strengthIndicator = document.createElement('div');
        strengthIndicator.className = 'password-strength';
        strengthIndicator.style.display = 'none';
        
        // Create password requirements
        const requirements = document.createElement('div');
        requirements.className = 'password-requirements';
        requirements.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 8px;">Password Requirements:</div>
            <ul>
                <li data-requirement="length">At least 8 characters</li>
                <li data-requirement="lowercase">One lowercase letter</li>
                <li data-requirement="uppercase">One uppercase letter or number</li>
                <li data-requirement="strength">Not a common password</li>
            </ul>
        `;
        requirements.style.display = 'none';
        
        // Insert after password field
        passwordField.parentNode.insertBefore(strengthIndicator, passwordField.nextSibling);
        passwordField.parentNode.insertBefore(requirements, strengthIndicator.nextSibling);
        
        // Update on password input
        passwordField.addEventListener('input', (e) => {
            this.updatePasswordStrength(e.target.value, strengthIndicator, requirements);
        });
        
        passwordField.addEventListener('focus', () => {
            requirements.style.display = 'block';
        });
        
        passwordField.addEventListener('blur', () => {
            if (!passwordField.value) {
                requirements.style.display = 'none';
                strengthIndicator.style.display = 'none';
            }
        });
    }
    
    updatePasswordStrength(password, strengthIndicator, requirements) {
        if (!password) {
            strengthIndicator.style.display = 'none';
            return;
        }
        
        strengthIndicator.style.display = 'block';
        
        const checks = {
            length: password.length >= 8,
            lowercase: /[a-z]/.test(password),
            uppercase: /[A-Z0-9]/.test(password),
            strength: !['password', '12345678', 'qwerty123', 'abc12345'].includes(password.toLowerCase())
        };
        
        // Update requirement indicators
        Object.keys(checks).forEach(requirement => {
            const li = requirements.querySelector(`[data-requirement="${requirement}"]`);
            if (li) {
                li.classList.toggle('valid', checks[requirement]);
            }
        });
        
        // Calculate strength
        const validChecks = Object.values(checks).filter(Boolean).length;
        let strength, message;
        
        if (validChecks <= 2) {
            strength = 'weak';
            message = 'Weak password';
        } else if (validChecks === 3) {
            strength = 'medium';
            message = 'Medium strength password';
        } else {
            strength = 'strong';
            message = 'Strong password';
        }
        
        strengthIndicator.className = `password-strength ${strength}`;
        strengthIndicator.textContent = message;
    }
    
    // Helper methods
    showFieldError(field, message) {
        this.clearFieldError(field);
        
        field.classList.add('error');
        
        const errorElement = document.createElement('div');
        errorElement.className = 'field-error';
        errorElement.textContent = message;
        
        field.parentNode.insertBefore(errorElement, field.nextSibling);
    }
    
    clearFieldError(field) {
        field.classList.remove('error', 'success');
        const errorElement = field.parentNode.querySelector('.field-error');
        if (errorElement) {
            errorElement.remove();
        }
    }
    
    // Public method to validate entire form
    validateForm(formId) {
        const form = document.getElementById(formId);
        if (!form) return false;
        
        let isFormValid = true;
        const errors = [];
        
        Object.keys(this.validators).forEach(fieldName => {
            const field = form.querySelector(`#register-${fieldName.replace('_', '-')}`);
            if (field) {
                const result = this.validateField(field, fieldName, field.value);
                if (!result.isValid) {
                    isFormValid = false;
                    errors.push({ field: fieldName, message: result.message });
                }
            }
        });
        
        return { isValid: isFormValid, errors };
    }
}

// Initialize form validator
const formValidator = new FormValidator();

// Export for use in main.js
window.FormValidator = FormValidator; 