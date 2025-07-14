#!/bin/bash

# =============================================================================
# Pre-Deployment Security & Safety Check Script
# =============================================================================

echo "🚀 Starting Pre-Deployment Safety Check..."
echo "==============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Error tracking
ERRORS=0
WARNINGS=0

# =============================================================================
# Helper Functions
# =============================================================================

error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
    ((ERRORS++))
}

warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
    ((WARNINGS++))
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# =============================================================================
# Check 1: Environment Files Security
# =============================================================================

echo -e "\n${BLUE}1. Checking Environment Files Security...${NC}"

# Check if any .env files are tracked in git
TRACKED_ENV_FILES=$(git ls-files | grep -E "\.env$|\.env\.")
if [ -n "$TRACKED_ENV_FILES" ]; then
    error "Found .env files tracked in git:"
    echo "$TRACKED_ENV_FILES"
    info "Run: git rm --cached <filename> to remove them"
else
    success "No .env files are tracked in git"
fi

# Check if production .env exists
if [ -f "deployment/production/.env" ]; then
    success "Production .env file exists"
else
    warning "Production .env file not found - you may need to create it on the server"
fi

# Check if .env.template files exist
if [ -f "deployment/production/env.prod.template" ]; then
    success "Production environment template exists"
else
    error "Production environment template missing"
fi

# =============================================================================
# Check 2: Git Status & Uncommitted Changes
# =============================================================================

echo -e "\n${BLUE}2. Checking Git Status...${NC}"

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    warning "You have uncommitted changes:"
    git status --short
    info "Consider committing changes before deployment"
else
    success "Working directory is clean"
fi

# Check current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
    warning "You are not on the main branch (currently on: $CURRENT_BRANCH)"
else
    success "On main branch"
fi

# =============================================================================
# Check 3: Docker & Build Validation
# =============================================================================

echo -e "\n${BLUE}3. Checking Docker Setup...${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    error "Docker is not running or accessible"
else
    success "Docker is running"
fi

# Check Docker Compose files
if [ -f "deployment/production/docker-compose.prod.yml" ]; then
    success "Production docker-compose file exists"
    
    # Validate Docker Compose syntax
    if docker-compose -f deployment/production/docker-compose.prod.yml config > /dev/null 2>&1; then
        success "Docker Compose file syntax is valid"
    else
        error "Docker Compose file has syntax errors"
    fi
else
    error "Production docker-compose file not found"
fi

# =============================================================================
# Check 4: Security Scan
# =============================================================================

echo -e "\n${BLUE}4. Security Scan...${NC}"

# Check for hardcoded secrets in code
HARDCODED_SECRETS=$(grep -r -i --include="*.py" --include="*.js" --include="*.ts" --include="*.json" \
    -E "(password|secret|key|token)\s*[=:]\s*['\"](?!.*\$\{|\$\(|%|template|example|your-|change-this)" . | \
    grep -v ".git" | grep -v "node_modules" | grep -v "venv" | head -5)

if [ -n "$HARDCODED_SECRETS" ]; then
    warning "Found potential hardcoded secrets:"
    echo "$HARDCODED_SECRETS"
    info "Review these files to ensure no real secrets are hardcoded"
else
    success "No obvious hardcoded secrets found"
fi

# Check for TODO/FIXME comments that might indicate incomplete security
TODO_SECURITY=$(grep -r -i --include="*.py" --include="*.js" --include="*.ts" \
    -E "(TODO|FIXME|XXX).*[sS]ecurity" . | grep -v ".git" | head -3)

if [ -n "$TODO_SECURITY" ]; then
    warning "Found security-related TODOs:"
    echo "$TODO_SECURITY"
fi

# =============================================================================
# Check 5: Database & Migration Status
# =============================================================================

echo -e "\n${BLUE}5. Checking Database Migrations...${NC}"

# Check for pending migrations (if using Alembic)
if [ -f "backend/alembic.ini" ]; then
    info "Alembic configuration found"
    if [ -d "backend/alembic/versions" ]; then
        MIGRATION_COUNT=$(find backend/alembic/versions -name "*.py" | wc -l)
        info "Found $MIGRATION_COUNT migration files"
    fi
else
    info "No Alembic configuration found"
fi

# =============================================================================
# Check 6: Production Deployment Folder
# =============================================================================

echo -e "\n${BLUE}6. Checking Production Deployment Folder...${NC}"

# Check required production files
REQUIRED_FILES=(
    "deployment/production/docker-compose.prod.yml"
    "deployment/production/env.prod.template"
    "deployment/production/nginx.prod.conf"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        success "Required file exists: $file"
    else
        error "Required file missing: $file"
    fi
done

# Check for backup files in production folder
BACKUP_FILES=$(find deployment/production -name "*.backup*" -o -name ".env.backup*" 2>/dev/null)
if [ -n "$BACKUP_FILES" ]; then
    info "Found backup files in production folder (this is normal):"
    echo "$BACKUP_FILES"
fi

# =============================================================================
# Check 7: Frontend Build Check
# =============================================================================

echo -e "\n${BLUE}7. Checking Frontend Build...${NC}"

if [ -f "frontend/package.json" ]; then
    success "Frontend package.json exists"
    
    # Check if node_modules exists
    if [ -d "frontend/node_modules" ]; then
        success "Frontend dependencies installed"
    else
        warning "Frontend dependencies not installed"
        info "Run: cd frontend && npm install"
    fi
else
    info "No frontend package.json found"
fi

# =============================================================================
# Check 8: SSL Certificate Check
# =============================================================================

echo -e "\n${BLUE}8. SSL Certificate Check...${NC}"

# Check if SSL setup script exists
if [ -f "deployment/production/setup-ssl.sh" ]; then
    success "SSL setup script exists"
else
    warning "SSL setup script not found"
fi

# =============================================================================
# Final Summary
# =============================================================================

echo -e "\n${BLUE}===============================================${NC}"
echo "🔍 Pre-Deployment Check Complete"
echo "==============================================="

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! Ready for deployment.${NC}"
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  $WARNINGS warnings found. Review before deployment.${NC}"
else
    echo -e "${RED}❌ $ERRORS errors found. Fix before deployment.${NC}"
    echo -e "${YELLOW}⚠️  $WARNINGS warnings found.${NC}"
fi

echo ""
echo "Next steps:"
echo "1. Fix any errors above"
echo "2. Review warnings"
echo "3. Run deployment/production/deploy.sh (if available)"
echo "4. Monitor logs after deployment"

# Exit with error code if there are critical errors
if [ $ERRORS -gt 0 ]; then
    exit 1
else
    exit 0
fi 