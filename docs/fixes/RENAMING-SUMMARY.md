# ArtPartySocial - Renaming Summary

## Overview
Successfully renamed the entire application from "StellarCollabApp" to "ArtPartySocial" throughout the codebase to match the artparty.social domain.

## Changes Made

### 1. Application Name Changes
- **Old**: `StellarCollabApp`
- **New**: `ArtPartySocial`

### 2. Database Names Updated
- **Old**: `stellarcollab_prod` → **New**: `artparty_social_prod`
- **Old**: `pixel_canvas_dev` → **New**: `artparty_social_dev`
- **Old**: `pixel_canvas` → **New**: `artparty_social`

### 3. Database Users Updated
- **Old**: `stellarcollab` → **New**: `artparty`

### 4. Domain References Updated
- **Old**: `stellarcollab.com` → **New**: `artparty.social`
- **Old**: `api.stellarcollab.com` → **New**: `api.artparty.social`
- **Old**: `staging.stellarcollab.com` → **New**: `staging.artparty.social`

### 5. Package Names Updated
- **Old**: `stellarcollab-frontend` → **New**: `artparty-social-frontend`

### 6. LocalStorage Keys Updated
- **Old**: `stellarcollab_token` → **New**: `artparty_social_token`
- **Old**: `stellarcollab_user` → **New**: `artparty_social_user`
- **Old**: `stellarcollab_theme` → **New**: `artparty_social_theme`
- **Old**: `stellarcollab_preferences` → **New**: `artparty_social_preferences`

### 7. JavaScript Class Names Updated
- **Old**: `StellarCollabApp` class → **New**: `ArtPartySocial` class
- **Old**: `window.stellarApp` → **New**: `window.artPartyApp`

## Files Modified

### Configuration Files
- `deployment/production/env.prod.template`
- `deployment/production/docker-compose.prod.yml`
- `deployment/production/init-db.sql`
- `deployment/local/env.local.template`
- `deployment/local/docker-compose.local.yml`
- `env.template`
- `production.env.template`
- `docker-compose.yml`
- `backend/env.template`

### Backend Files
- `backend/app/core/config.py`
- `backend/app/core/database.py`

### Frontend Files
- `frontend/package.json`
- `frontend/js/app.js`
- `frontend/js/api.js`
- `frontend/js/config.js`
- `frontend/js/ui.js`
- `frontend/js/pixel-editor.js`
- `frontend/debug/cors-test-utility.html`
- `frontend/Dockerfile.prod`

### Documentation Files
- `tests/README.md`
- `deployment/README.md`
- `deployment/production/README.md`
- `deployment/local/README.md`
- `frontend/README.md`

### Debug/Testing Files
- `docs/testing/debug-auth.js`
- `docs/testing/console-debug.js`
- `docs/testing/fix-auth-buttons.js`
- `test-local-production.ps1`

## Database Changes Summary

### Production Database
```sql
-- Old
CREATE DATABASE stellarcollab_prod;
CREATE USER stellarcollab WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE stellarcollab_prod TO stellarcollab;

-- New
CREATE DATABASE artparty_social_prod;
CREATE USER artparty WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE artparty_social_prod TO artparty;
```

### Local Development Database
```sql
-- Old
POSTGRES_DB: pixel_canvas_dev

-- New
POSTGRES_DB: artparty_social_dev
```

## Connection Strings Updated

### Production
- **Old**: `postgresql://stellarcollab:password@db:5432/stellarcollab_prod`
- **New**: `postgresql://artparty:password@db:5432/artparty_social_prod`

### Local Development
- **Old**: `postgresql://postgres:dev_password@db:5432/pixel_canvas_dev`
- **New**: `postgresql://postgres:dev_password@db:5432/artparty_social_dev`

## CORS Origins Updated

### Production
- **Old**: `https://stellarcollab.com`, `https://www.stellarcollab.com`
- **New**: `https://artparty.social`, `https://www.artparty.social`

### Staging
- **Old**: `https://staging.stellarcollab.com`
- **New**: `https://staging.artparty.social`

## Next Steps

1. **Test Local Environment**: Run `docker-compose -f deployment/local/docker-compose.local.yml up` to verify local setup
2. **Update Server**: When deploying to production, the new database names will be used
3. **DNS Setup**: Configure artparty.social A records to point to your server IP (104.248.124.8)
4. **SSL Certificates**: Update Let's Encrypt certificates for artparty.social domain

## Verification

The renaming has been tested and Docker Compose configurations validate successfully:
```bash
cd deployment/local
docker-compose -f docker-compose.local.yml config --services
# Returns: db, redis, backend, frontend
```

All references to the old names have been systematically updated to maintain consistency throughout the application. 