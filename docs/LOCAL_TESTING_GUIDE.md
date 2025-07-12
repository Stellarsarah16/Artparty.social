# Local Testing Guide for Artparty.Social

## Prerequisites

1. **Docker Desktop** installed on your Windows machine
2. **Git** installed 
3. **Text editor** (VSCode recommended)

## Option 1: Quick Local Test (Frontend Only)

### Step 1: Serve Frontend Locally

Open PowerShell in your project directory and run:

```powershell
# Navigate to frontend directory
cd frontend

# Start a simple Python HTTP server
python -m http.server 8080

# If Python isn't available, use Node.js:
# npx http-server -p 8080

# Or if you have PHP:
# php -S localhost:8080
```

### Step 2: Access the App

Open your browser and go to: `http://localhost:8080`

**What you'll see:**
- ✅ Frontend loads properly
- ✅ Login/Register buttons work
- ❌ API calls will fail (no backend)
- ❌ Authentication won't work

**Best for:** Testing UI, button interactions, modal behavior

## Option 2: Full Local Stack (Frontend + Backend)

### Step 1: Set Up Local Environment

```powershell
# Create local environment file
cp deployment/local/env.local.template .env.local

# Edit .env.local with your preferred settings
notepad .env.local
```

### Step 2: Start Local Development Stack

```powershell
# Start the local development stack
docker-compose -f deployment/local/docker-compose.local.yml up -d

# Check if everything is running
docker-compose -f deployment/local/docker-compose.local.yml ps
```

### Step 3: Access the Full App

- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:8000`
- **Database**: `localhost:5432` (PostgreSQL)

## Option 3: Test Against Production Backend

### Step 1: Modify Frontend Config

Edit `frontend/js/config.js`:

```javascript
// Force development mode to point to production
const getBaseUrls = () => {
    return {
        API_BASE_URL: 'http://YOUR_PRODUCTION_IP',  // Replace with your server IP
        WS_BASE_URL: 'ws://YOUR_PRODUCTION_IP'
    };
};
```

### Step 2: Serve Frontend Locally

```powershell
cd frontend
python -m http.server 8080
```

### Step 3: Test

Go to `http://localhost:8080` - you'll have local frontend with production backend!

## 🐛 Debugging Tips

### Check Button Responsiveness

1. Open browser developer tools (F12)
2. Click Login/Register buttons
3. Check Console tab for logs:
   ```
   🔧 Setting up event listeners...
   Login button clicked
   Showing modal: login
   ```

### Check Network Requests

1. Open Network tab in dev tools
2. Try to login/register
3. Look for API requests to `/api/v1/auth/login` or `/api/v1/auth/register`

### Common Issues & Solutions

**Buttons not responsive:**
- Check console for JavaScript errors
- Verify `CONFIG_UTILS` is loaded
- Check if DOM elements exist

**API calls failing:**
- Verify backend is running
- Check CORS settings
- Verify API URLs in config

**Modal not opening:**
- Check CSS for modal display
- Verify modal HTML elements exist
- Check console for errors

## 🚀 Testing Workflow

### 1. Quick UI Test
```powershell
cd frontend
python -m http.server 8080
# Test at http://localhost:8080
```

### 2. Full Integration Test
```powershell
docker-compose -f deployment/local/docker-compose.local.yml up -d
# Test at http://localhost:3000
```

### 3. Production Test
```powershell
# SSH to production server
ssh root@YOUR_SERVER_IP
cd /opt/artparty-social/deployment/production
git pull origin main
docker-compose -f docker-compose.prod.yml up -d --build frontend
```

## 📋 Testing Checklist

Before deploying to production, verify:

- [ ] ✅ Welcome page loads
- [ ] ✅ Login button opens modal
- [ ] ✅ Register button opens modal
- [ ] ✅ Forms submit without errors
- [ ] ✅ Console shows proper logging
- [ ] ✅ No JavaScript errors
- [ ] ✅ Network requests succeed
- [ ] ✅ Authentication flow works
- [ ] ✅ Navigation updates correctly

## 🔄 Deploy to Production

Once everything works locally:

```bash
# On production server
cd /opt/artparty-social/deployment/production
git pull origin main
docker-compose -f docker-compose.prod.yml up -d --build frontend
docker-compose -f docker-compose.prod.yml ps
```

## 🆘 Quick Debug Commands

```powershell
# Check if containers are running
docker ps

# View frontend logs
docker-compose -f docker-compose.prod.yml logs -f frontend

# View backend logs
docker-compose -f docker-compose.prod.yml logs -f backend

# Restart specific service
docker-compose -f docker-compose.prod.yml restart frontend

# Force rebuild
docker-compose -f docker-compose.prod.yml up -d --build --force-recreate frontend
```

This guide should help you test changes locally before deploying to production! 🎯 