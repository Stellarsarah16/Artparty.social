@echo off
setlocal enabledelayedexpansion

REM =============================================================================
REM Pre-Deployment Security & Safety Check Script (Windows)
REM =============================================================================

echo 🚀 Starting Pre-Deployment Safety Check...
echo ===============================================

REM Error tracking
set ERRORS=0
set WARNINGS=0

REM =============================================================================
REM Check 1: Environment Files Security
REM =============================================================================

echo.
echo 1. Checking Environment Files Security...

REM Check if any .env files are tracked in git
git ls-files | findstr /R "\.env$" > nul
if !errorlevel! equ 0 (
    echo ❌ ERROR: Found .env files tracked in git
    git ls-files | findstr /R "\.env$"
    echo ℹ️  Run: git rm --cached ^<filename^> to remove them
    set /a ERRORS+=1
) else (
    echo ✅ No .env files are tracked in git
)

REM Check if production .env exists
if exist "deployment\production\.env" (
    echo ✅ Production .env file exists
) else (
    echo ⚠️  WARNING: Production .env file not found - you may need to create it on the server
    set /a WARNINGS+=1
)

REM Check if .env.template files exist
if exist "deployment\production\env.prod.template" (
    echo ✅ Production environment template exists
) else (
    echo ❌ ERROR: Production environment template missing
    set /a ERRORS+=1
)

REM =============================================================================
REM Check 2: Git Status & Uncommitted Changes
REM =============================================================================

echo.
echo 2. Checking Git Status...

REM Check for uncommitted changes
git status --porcelain | findstr /R "." > nul
if !errorlevel! equ 0 (
    echo ⚠️  WARNING: You have uncommitted changes:
    git status --short
    echo ℹ️  Consider committing changes before deployment
    set /a WARNINGS+=1
) else (
    echo ✅ Working directory is clean
)

REM Check current branch
for /f "tokens=*" %%i in ('git rev-parse --abbrev-ref HEAD') do set CURRENT_BRANCH=%%i
if not "!CURRENT_BRANCH!"=="main" (
    echo ⚠️  WARNING: You are not on the main branch (currently on: !CURRENT_BRANCH!)
    set /a WARNINGS+=1
) else (
    echo ✅ On main branch
)

REM =============================================================================
REM Check 3: Docker & Build Validation
REM =============================================================================

echo.
echo 3. Checking Docker Setup...

REM Check if Docker is running
docker info > nul 2>&1
if !errorlevel! neq 0 (
    echo ❌ ERROR: Docker is not running or accessible
    set /a ERRORS+=1
) else (
    echo ✅ Docker is running
)

REM Check Docker Compose files
if exist "deployment\production\docker-compose.prod.yml" (
    echo ✅ Production docker-compose file exists
    
    REM Validate Docker Compose syntax
    docker-compose -f deployment\production\docker-compose.prod.yml config > nul 2>&1
    if !errorlevel! equ 0 (
        echo ✅ Docker Compose file syntax is valid
    ) else (
        echo ❌ ERROR: Docker Compose file has syntax errors
        set /a ERRORS+=1
    )
) else (
    echo ❌ ERROR: Production docker-compose file not found
    set /a ERRORS+=1
)

REM =============================================================================
REM Check 4: Security Scan (Basic)
REM =============================================================================

echo.
echo 4. Security Scan...

REM Basic check for hardcoded secrets (simplified for Windows)
findstr /R /C:"password.*=" /C:"secret.*=" /C:"key.*=" *.py *.js *.json > nul 2>&1
if !errorlevel! equ 0 (
    echo ⚠️  WARNING: Found potential hardcoded secrets
    echo ℹ️  Review files to ensure no real secrets are hardcoded
    set /a WARNINGS+=1
) else (
    echo ✅ No obvious hardcoded secrets found
)

REM =============================================================================
REM Check 5: Production Deployment Folder
REM =============================================================================

echo.
echo 5. Checking Production Deployment Folder...

REM Check required production files
set REQUIRED_FILES=deployment\production\docker-compose.prod.yml deployment\production\env.prod.template deployment\production\nginx.prod.conf

for %%f in (%REQUIRED_FILES%) do (
    if exist "%%f" (
        echo ✅ Required file exists: %%f
    ) else (
        echo ❌ ERROR: Required file missing: %%f
        set /a ERRORS+=1
    )
)

REM =============================================================================
REM Check 6: Frontend Build Check
REM =============================================================================

echo.
echo 6. Checking Frontend Build...

if exist "frontend\package.json" (
    echo ✅ Frontend package.json exists
    
    REM Check if node_modules exists
    if exist "frontend\node_modules" (
        echo ✅ Frontend dependencies installed
    ) else (
        echo ⚠️  WARNING: Frontend dependencies not installed
        echo ℹ️  Run: cd frontend && npm install
        set /a WARNINGS+=1
    )
) else (
    echo ℹ️  No frontend package.json found
)

REM =============================================================================
REM Final Summary
REM =============================================================================

echo.
echo ===============================================
echo 🔍 Pre-Deployment Check Complete
echo ===============================================

if !ERRORS! equ 0 (
    if !WARNINGS! equ 0 (
        echo ✅ All checks passed! Ready for deployment.
    ) else (
        echo ⚠️  !WARNINGS! warnings found. Review before deployment.
    )
) else (
    echo ❌ !ERRORS! errors found. Fix before deployment.
    echo ⚠️  !WARNINGS! warnings found.
)

echo.
echo Next steps:
echo 1. Fix any errors above
echo 2. Review warnings
echo 3. Run deployment process
echo 4. Monitor logs after deployment

REM Exit with error code if there are critical errors
if !ERRORS! gtr 0 (
    exit /b 1
) else (
    exit /b 0
) 