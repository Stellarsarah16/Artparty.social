# 🎨 artparty.social - Quick Deploy Checklist

## ✅ COMPLETED (Ready to use)
- [x] **Docker Compose**: Production configuration ready
- [x] **Nginx**: Configured for artparty.social and www.artparty.social
- [x] **CORS**: Set to your domain
- [x] **Security**: Headers, rate limiting, SSL ready
- [x] **Database**: PostgreSQL with initialization script
- [x] **Redis**: Configured for production scaling

## 🔧 TODO (Before deployment)

### 1. GoDaddy DNS Settings
```
Type: A, Name: @, Value: 104.248.124.8
Type: A, Name: www, Value: 104.248.124.8
```

### 2. Create .env file with secure passwords (ON SERVER)
```bash
# On your Digital Ocean server:
cp env.prod.template .env
nano .env

# Generate secure passwords:
# DB_PASSWORD (32+ chars): openssl rand -base64 32
# REDIS_PASSWORD (32+ chars): openssl rand -base64 32  
# SECRET_KEY (64+ chars): openssl rand -base64 64
```

### 3. SSL Certificate (on server)
```bash
sudo certbot certonly --standalone -d artparty.social -d www.artparty.social
```

### 4. Deploy
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 🚀 Final URLs
- **Main**: https://artparty.social
- **API**: https://artparty.social/api/
- **Health**: https://artparty.social/health

## 📁 Files Ready for Production
- `docker-compose.prod.yml` ✅
- `nginx.prod.conf` ✅ (configured for artparty.social)
- `env.prod.template` ✅ (configured for artparty.social)
- `init-db.sql` ✅
- `ARTPARTY-SOCIAL-SETUP.md` ✅ (detailed guide)

**Everything is configured for artparty.social! 🎉** 

**On your Ubuntu server, run:**

```bash
# The issue is that I created the Dockerfile in the wrong place
# Let's check where Docker is looking for it
cd /opt/artparty-social/frontend

# Check the current broken Dockerfile
head -35 Dockerfile.prod
```

You'll see it's still broken. Let me create the Dockerfile in the correct location:

**Create the Dockerfile in the correct frontend directory:**

```bash
<code_block_to_apply_changes_from>
```

**After 10 seconds, test:**

```bash
# Check if it's working
curl -I http://localhost:80

# Check the logs
docker-compose -f docker-compose.prod.yml logs --tail=5 frontend
```

This should finally work because:
1. ✅ Dockerfile is in the correct `/opt/artparty-social/frontend` directory
2. ✅ Simple nginx config with no SSL
3. ✅ No complex Docker syntax that could break

Let me know what you see!