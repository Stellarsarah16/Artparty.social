#!/bin/bash

# StellarCollabApp Security Check Script
# This script checks if your deployment is secure

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_info() {
    echo -e "${NC}[i]${NC} $1"
}

# Function to check if Redis is exposed externally
check_redis_exposure() {
    echo
    print_info "Checking Redis exposure..."
    
    # Check if Redis port is exposed in docker-compose
    if grep -q "6379:6379" docker-compose.yml 2>/dev/null; then
        print_error "CRITICAL: Redis is exposed externally in docker-compose.yml"
        print_error "This is a major security vulnerability!"
        return 1
    else
        print_status "Redis is not exposed externally in development config"
    fi
    
    if grep -q "6379:6379" deployment/docker-compose.prod.yml 2>/dev/null; then
        print_error "CRITICAL: Redis is exposed externally in production config"
        print_error "This is a major security vulnerability!"
        return 1
    else
        print_status "Redis is not exposed externally in production config"
    fi
    
    return 0
}

# Function to check if Redis has authentication
check_redis_auth() {
    echo
    print_info "Checking Redis authentication..."
    
    # Check if Redis password is configured
    if grep -q "REDIS_PASSWORD" deployment/docker-compose.prod.yml 2>/dev/null; then
        print_status "Redis authentication is configured"
    else
        print_warning "Redis authentication might not be configured"
    fi
    
    # Check if environment file has Redis password
    if [ -f "deployment/.env" ]; then
        if grep -q "REDIS_PASSWORD=" deployment/.env; then
            print_status "Redis password is set in environment file"
        else
            print_warning "Redis password is not set in environment file"
        fi
    else
        print_warning "Environment file not found"
    fi
}

# Function to check external port exposure
check_external_ports() {
    echo
    print_info "Checking external port exposure..."
    
    # Check if we're running Docker containers
    if docker-compose ps &>/dev/null; then
        print_info "Docker containers are running. Checking port exposure..."
        
        # Check which ports are exposed
        EXPOSED_PORTS=$(docker-compose ps --format "table {{.Service}}\t{{.Ports}}" | grep -v "SERVICE" | grep -v "^$")
        
        if echo "$EXPOSED_PORTS" | grep -q "6379"; then
            print_error "CRITICAL: Redis port 6379 is exposed externally!"
            print_error "Someone could access your Redis instance from the internet!"
            return 1
        else
            print_status "Redis port is not exposed externally"
        fi
        
        # List all exposed ports
        print_info "Currently exposed ports:"
        echo "$EXPOSED_PORTS" | while read line; do
            echo "  $line"
        done
    else
        print_warning "Docker containers are not running, cannot check live ports"
    fi
}

# Function to check if running on localhost
check_environment() {
    echo
    print_info "Checking deployment environment..."
    
    # Check if we're in development or production
    if [ -f "deployment/.env" ]; then
        if grep -q "ENVIRONMENT=production" deployment/.env; then
            print_status "Production environment detected"
            ENV_TYPE="production"
        else
            print_warning "Development environment or environment not set"
            ENV_TYPE="development"
        fi
    else
        print_warning "No environment file found, assuming development"
        ENV_TYPE="development"
    fi
    
    return 0
}

# Function to provide recommendations
provide_recommendations() {
    echo
    print_info "Security Recommendations:"
    echo
    
    if [ "$ENV_TYPE" = "production" ]; then
        echo "✓ Use strong passwords for all services"
        echo "✓ Enable HTTPS/SSL certificates"
        echo "✓ Keep Docker images updated"
        echo "✓ Monitor logs regularly"
        echo "✓ Backup database regularly"
        echo "✓ Use firewall rules to restrict access"
        echo "✓ Consider using Docker secrets for sensitive data"
    else
        echo "✓ Don't expose Redis or database ports externally"
        echo "✓ Use different passwords for development and production"
        echo "✓ Don't commit .env files to version control"
        echo "✓ Test security configurations before deploying"
    fi
}

# Function to test network connectivity
test_network_security() {
    echo
    print_info "Testing network security..."
    
    # Test if Redis is accessible from outside Docker network
    if command -v redis-cli &> /dev/null; then
        if timeout 5 redis-cli -h localhost -p 6379 ping &>/dev/null; then
            print_error "CRITICAL: Redis is accessible from localhost without authentication!"
            print_error "This means it might be accessible from the internet!"
            return 1
        else
            print_status "Redis is not accessible from localhost (good)"
        fi
    else
        print_warning "redis-cli not installed, cannot test Redis connectivity"
    fi
}

# Main security check function
main() {
    echo
    print_info "🔒 StellarCollabApp Security Check"
    print_info "================================="
    
    ISSUES_FOUND=0
    
    # Run all checks
    check_environment
    
    if ! check_redis_exposure; then
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
    
    check_redis_auth
    
    if ! check_external_ports; then
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
    
    if ! test_network_security; then
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
    
    provide_recommendations
    
    echo
    if [ $ISSUES_FOUND -eq 0 ]; then
        print_status "🎉 No critical security issues found!"
        print_status "Your deployment appears to be secure."
    else
        print_error "⚠️  Found $ISSUES_FOUND critical security issue(s)!"
        print_error "Please fix these issues immediately."
        echo
        print_info "To fix Redis exposure issues:"
        echo "1. Remove port mappings from docker-compose.yml"
        echo "2. Add Redis authentication"
        echo "3. Restart your containers"
        echo "4. Run this script again to verify"
    fi
}

# Run main function
main "$@" 