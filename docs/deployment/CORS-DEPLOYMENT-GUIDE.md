# CORS Deployment Guide - Artparty.social

## 🎯 Overview

This guide provides step-by-step instructions for implementing proper CORS (Cross-Origin Resource Sharing) configuration across different deployment environments.

## 📋 Quick Start Checklist

- [ ] Update backend CORS configuration
- [ ] Configure environment variables
- [ ] Test CORS configuration
- [ ] Update frontend API URLs
- [ ] Deploy with proper security settings

## 🔧 Implementation Steps

### 1. Backend CORS Configuration

#### ✅ Updated Files:
- `backend/app/main.py` - Fixed CORS middleware
- `backend/app/core/config.py` - Enhanced CORS origins

#### What was changed:
```python
# OLD (Insecure)
allow_origins=["*"]

# NEW (Secure)
allow_origins=settings.BACKEND_CORS_ORIGINS
```

### 2. Environment Configuration

#### Development Environment
Use: `deployment/env.development.template`
```env
ENVIRONMENT=development
CORS_ORIGINS=["http://localhost:3000","http://localhost:8080","http://localhost:8000"]
```

#### Staging Environment
Use: `deployment/env.staging.template`
```env
ENVIRONMENT=staging
CORS_ORIGINS=["https://staging.stellarcollab.com","https://staging-app.stellarcollab.com"]
```

#### Production Environment
Use: `deployment/env.production.template`
```env
ENVIRONMENT=production
CORS_ORIGINS=["https://stellarcollab.com","https://www.stellarcollab.com"]
```

### 3. Frontend Configuration

#### ✅ Updated Files:
- `frontend/js/config.js` - Enhanced environment detection

#### Features Added:
- Automatic environment detection
- Fallback URL support
- CORS testing utilities
- Production-ready URL handling

## 🏗️ Deployment Architecture Options

### Option 1: Same-Origin with Nginx Proxy (Recommended)

**Benefits:**
- No CORS issues
- Better security
- Simplified configuration

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    # Frontend
    location / {
        root /var/www/frontend;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # WebSocket
    location /ws/ {
        proxy_pass http://backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Option 2: Separate Domain CORS

**Configuration:**
```env
# Production
CORS_ORIGINS=["https://app.stellarcollab.com","https://www.stellarcollab.com"]

# Frontend URLs
API_BASE_URL=https://api.stellarcollab.com
WS_BASE_URL=wss://api.stellarcollab.com
```

## 🔒 Security Best Practices

### 1. CORS Origins
- ✅ Use specific domains instead of `["*"]`
- ✅ Environment-based configuration
- ✅ Support for multiple domains

### 2. HTTP Methods
- ✅ Restrict to needed methods only
- ✅ Support OPTIONS for preflight requests

### 3. Headers
- ✅ Allow necessary headers
- ✅ Restrict sensitive headers

### 4. Credentials
- ✅ Use `allow_credentials=True` only when needed
- ✅ Never combine with `allow_origins=["*"]`

## 🧪 Testing Your Configuration

### 1. Use the CORS Test Utility
Open `cors-test-utility.html` in your browser to test:
- Basic connectivity
- CORS headers
- Preflight requests
- Different HTTP methods

### 2. Manual Testing
```bash
# Test CORS headers
curl -H "Origin: https://yourdomain.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     https://api.yourdomain.com/api/v1/cors-test
```

### 3. Browser DevTools
1. Open Network tab
2. Make requests to your API
3. Check for CORS errors in console
4. Verify CORS headers in response

## 🚀 Environment-Specific Deployment

### Development

1. **Copy environment template:**
```bash
cp deployment/env.development.template backend/.env
```

2. **Start services:**
```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

3. **Test:**
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`

### Staging

1. **Copy environment template:**
```bash
cp deployment/env.staging.template backend/.env
```

2. **Update domains:**
```env
CORS_ORIGINS=["https://staging.yourdomain.com"]
```

3. **Deploy with Docker:**
```bash
docker-compose -f docker-compose.staging.yml up -d
```

### Production

1. **Copy environment template:**
```bash
cp deployment/env.production.template backend/.env
```

2. **Update domains:**
```env
CORS_ORIGINS=["https://yourdomain.com","https://www.yourdomain.com"]
```

3. **Deploy with Docker:**
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 🔍 Troubleshooting

### Common CORS Errors

#### 1. "Access to fetch at '...' from origin '...' has been blocked by CORS policy"
**Solution:** Add your frontend domain to `CORS_ORIGINS`

#### 2. "Request header field authorization is not allowed by Access-Control-Allow-Headers"
**Solution:** Ensure `Authorization` header is in `allow_headers`

#### 3. "Method POST is not allowed by Access-Control-Allow-Methods"
**Solution:** Add `POST` to `allow_methods`

### Debug Endpoints

#### Check CORS Configuration:
```
GET /cors-debug
```

#### Test CORS:
```
GET /api/v1/cors-test
```

### Environment Detection Issues

#### Check frontend environment:
```javascript
console.log(window.CONFIG_UTILS.getEnvironmentInfo());
```

## 📊 Monitoring and Logging

### Backend Logs
The backend now logs CORS configuration on startup:
```
INFO:     CORS origins configured: ['https://yourdomain.com']
INFO:     Environment: production
INFO:     Debug mode: False
```

### Frontend Logs
The frontend logs environment detection:
```
🔧 Environment: {isDevelopment: false, isStaging: false, isProduction: true}
🔧 API Base URL: https://api.yourdomain.com
🟢 Production mode - Restricted CORS origins
```

## 🛠️ Advanced Configuration

### Custom CORS Headers
```python
# In config.py
CUSTOM_CORS_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
    "x-api-key"
]
```

### Rate Limiting with CORS
```python
# Different limits per environment
RATE_LIMIT_PER_MINUTE = 60 if ENVIRONMENT == "production" else 120
```

### WebSocket CORS
```python
# WebSocket origins
WS_CORS_ORIGINS = BACKEND_CORS_ORIGINS
```

## 📈 Performance Optimizations

### 1. Preflight Caching
```python
# Add to CORS middleware
allow_preflight_cache=True
max_age=86400  # 24 hours
```

### 2. Compression
```python
# Add compression middleware
from fastapi.middleware.gzip import GZipMiddleware
app.add_middleware(GZipMiddleware, minimum_size=1000)
```

### 3. CDN Configuration
```nginx
# Add CORS headers at CDN level
add_header 'Access-Control-Allow-Origin' '$http_origin' always;
add_header 'Access-Control-Allow-Credentials' 'true' always;
```

## 🔄 Migration Guide

### From Current Setup to New Configuration

1. **Backup current configuration:**
```bash
cp backend/app/main.py backend/app/main.py.backup
cp backend/app/core/config.py backend/app/core/config.py.backup
```

2. **Apply new configuration:**
   - Use the updated files provided
   - Copy appropriate environment template
   - Update domain names

3. **Test thoroughly:**
   - Use CORS test utility
   - Test all endpoints
   - Verify WebSocket connections

4. **Deploy gradually:**
   - Test in staging first
   - Monitor logs for errors
   - Rollback if issues occur

## 🎯 Final Checklist

### Before Deployment:
- [ ] Updated backend CORS configuration
- [ ] Copied and configured environment file
- [ ] Updated frontend API URLs
- [ ] Tested with CORS utility
- [ ] Verified all endpoints work
- [ ] Checked WebSocket connections
- [ ] Tested authentication flows
- [ ] Configured monitoring/logging

### After Deployment:
- [ ] Monitor application logs
- [ ] Check for CORS errors
- [ ] Verify all functionality works
- [ ] Test from different devices/networks
- [ ] Monitor performance metrics
- [ ] Set up alerts for CORS failures

## 📞 Support

If you encounter issues:

1. **Check logs:** Backend startup logs show CORS configuration
2. **Use debug endpoints:** `/cors-debug` and `/api/v1/cors-test`
3. **Test with utility:** Use `cors-test-utility.html`
4. **Check environment:** Verify environment variables are set correctly

## 🔗 Related Files

- `backend/app/main.py` - Main CORS configuration
- `backend/app/core/config.py` - CORS origins logic
- `frontend/js/config.js` - Frontend API configuration
- `deployment/env.*.template` - Environment templates
- `cors-test-utility.html` - CORS testing tool

---

**Note:** This guide implements production-ready CORS configuration. The previous `allow_origins=["*"]` was a security risk and has been replaced with environment-specific, secure configurations. 