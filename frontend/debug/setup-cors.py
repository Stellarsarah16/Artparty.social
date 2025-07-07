#!/usr/bin/env python3
"""
CORS Configuration Setup Script for StellarCollabApp
This script helps you set up proper CORS configuration for your deployment environment.
"""

import os
import sys
import json
import shutil
from pathlib import Path


def print_banner():
    """Print the setup banner"""
    print("""
🌐 StellarCollabApp CORS Configuration Setup
===========================================

This script will help you set up proper CORS configuration for your deployment.
    """)


def get_user_input(prompt, default=None, choices=None):
    """Get user input with validation"""
    while True:
        if default:
            user_input = input(f"{prompt} (default: {default}): ").strip()
            if not user_input:
                return default
        else:
            user_input = input(f"{prompt}: ").strip()
        
        if choices and user_input not in choices:
            print(f"Invalid choice. Please choose from: {', '.join(choices)}")
            continue
        
        return user_input


def setup_environment():
    """Set up the environment configuration"""
    print("\n📋 Environment Configuration")
    print("=" * 40)
    
    # Get environment type
    environment = get_user_input(
        "Which environment are you setting up?",
        choices=["development", "staging", "production"]
    )
    
    # Get domain information
    if environment == "development":
        domains = [
            "http://localhost:3000",
            "http://localhost:8000",
            "http://localhost:8080",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:8000",
            "http://127.0.0.1:8080"
        ]
        
        print(f"\n✅ Using default development domains:")
        for domain in domains:
            print(f"  - {domain}")
            
    else:
        print(f"\n🔧 Configure {environment} domains:")
        domains = []
        
        while True:
            domain = get_user_input(
                "Enter a domain (or press Enter to finish)",
                default=""
            )
            
            if not domain:
                break
                
            if not domain.startswith(("http://", "https://")):
                domain = "https://" + domain
                
            domains.append(domain)
            print(f"  ✅ Added: {domain}")
        
        if not domains:
            print("⚠️  No domains specified. Using default example domains.")
            domains = [f"https://example.com"]
    
    return environment, domains


def create_env_file(environment, domains):
    """Create the .env file"""
    print(f"\n📝 Creating .env file for {environment}...")
    
    template_path = Path(f"deployment/env.{environment}.template")
    env_path = Path("backend/.env")
    
    if not template_path.exists():
        print(f"❌ Template file not found: {template_path}")
        return False
    
    # Read template
    with open(template_path, 'r') as f:
        content = f.read()
    
    # Replace CORS_ORIGINS placeholder
    cors_origins_json = json.dumps(domains)
    content = content.replace(
        f'CORS_ORIGINS=["https://staging.stellarcollab.com","https://staging-app.stellarcollab.com","http://localhost:3000"]',
        f'CORS_ORIGINS={cors_origins_json}'
    )
    content = content.replace(
        f'CORS_ORIGINS=["https://stellarcollab.com","https://www.stellarcollab.com","https://app.stellarcollab.com"]',
        f'CORS_ORIGINS={cors_origins_json}'
    )
    content = content.replace(
        f'CORS_ORIGINS=["http://localhost:3000","http://localhost:8080","http://localhost:8000","http://localhost","http://127.0.0.1:3000","http://127.0.0.1:8080","http://127.0.0.1:8000","http://127.0.0.1","http://localhost:3001","http://localhost:5000","http://localhost:5173","http://localhost:4200"]',
        f'CORS_ORIGINS={cors_origins_json}'
    )
    
    # Write to .env file
    with open(env_path, 'w') as f:
        f.write(content)
    
    print(f"✅ Created: {env_path}")
    return True


def test_configuration():
    """Test the configuration"""
    print("\n🧪 Testing Configuration")
    print("=" * 40)
    
    try:
        # Test backend import
        sys.path.insert(0, 'backend')
        from app.main import app
        from app.core.config import settings
        
        print("✅ Backend configuration loaded successfully")
        print(f"📊 Environment: {settings.ENVIRONMENT}")
        print(f"🌐 CORS Origins: {settings.BACKEND_CORS_ORIGINS}")
        
        return True
        
    except Exception as e:
        print(f"❌ Configuration test failed: {e}")
        return False


def show_next_steps(environment):
    """Show next steps"""
    print(f"\n🎯 Next Steps for {environment.title()}")
    print("=" * 40)
    
    if environment == "development":
        print("""
1. Start the backend server:
   cd backend
   python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

2. Open your frontend at: http://localhost:3000

3. Test CORS configuration:
   - Open cors-test-utility.html in your browser
   - Run the basic test suite
        """)
    
    elif environment == "staging":
        print("""
1. Deploy using Docker:
   docker-compose -f docker-compose.staging.yml up -d

2. Update your DNS records to point to your server

3. Test CORS configuration:
   - Open cors-test-utility.html in your browser
   - Test against your staging domain
        """)
    
    else:  # production
        print("""
1. Review security settings in backend/.env:
   - Update SECRET_KEY with a secure random string
   - Set strong database passwords
   - Configure HTTPS settings

2. Deploy using Docker:
   docker-compose -f docker-compose.prod.yml up -d

3. Set up SSL/TLS certificates (Let's Encrypt recommended)

4. Configure nginx reverse proxy (see CORS-DEPLOYMENT-GUIDE.md)

5. Test CORS configuration:
   - Open cors-test-utility.html in your browser
   - Run production tests
        """)


def main():
    """Main setup function"""
    print_banner()
    
    # Check if we're in the right directory
    if not Path("backend/app/main.py").exists():
        print("❌ Please run this script from the StellarCollabApp root directory")
        sys.exit(1)
    
    try:
        # Setup environment
        environment, domains = setup_environment()
        
        # Create .env file
        if not create_env_file(environment, domains):
            print("❌ Failed to create .env file")
            sys.exit(1)
        
        # Test configuration
        if not test_configuration():
            print("⚠️  Configuration test failed, but .env file was created")
            print("   You may need to install dependencies or check the configuration")
        
        # Show next steps
        show_next_steps(environment)
        
        print("\n🎉 CORS configuration setup complete!")
        print("\n📖 For detailed deployment instructions, see: CORS-DEPLOYMENT-GUIDE.md")
        
    except KeyboardInterrupt:
        print("\n\n❌ Setup cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Setup failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main() 