# 🎨 artparty.social Production Setup Guide

## Step 1: GoDaddy DNS Configuration

### In your GoDaddy control panel:
1. Login to GoDaddy → "My Products" → "DNS"
2. Click "Manage" for **artparty.social**
3. Add these DNS records:

```
Type: A
Name: @
Value: 104.248.124.8  (your Digital Ocean server IP)
TTL: 1 Hour

Type: A
Name: www
Value: 104.248.124.8  (your Digital Ocean server IP)
TTL: 1 Hour
```

**✅ This will make both artparty.social and www.artparty.social point to your server**

## Step 2: Create Production Environment File

```bash
# In deployment/production/ directory
cp env.prod.template .env

# Edit .env and update these CRITICAL values:
```

**Required changes in .env:**
```env
# Database password (generate a strong 32+ character password)
DB_PASSWORD=your_secure_database_password_here_32_chars_minimum

# Redis password (generate a strong 32+ character password)
REDIS_PASSWORD=your_secure_redis_password_here_32_chars_minimum

# JWT signing key (generate a secure 64+ character string)
SECRET_KEY=your_super_secret_jwt_signing_key_64_characters_minimum_random_string

# CORS origins (already set correctly)
CORS_ORIGINS=["https://artparty.social","https://www.artparty.social"]
```

## Step 3: SSL Certificate Setup (Let's Encrypt - FREE)

**On your Digital Ocean server:**
```bash
# Install certbot
sudo apt update
sudo apt install certbot

# Stop any running nginx
sudo systemctl stop nginx
# OR stop your Docker containers if running
docker-compose down

# Get SSL certificates
sudo certbot certonly --standalone -d artparty.social -d www.artparty.social

# Create SSL directory in your deployment folder
mkdir -p ssl

# Copy certificates
sudo cp /etc/letsencrypt/live/artparty.social/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/artparty.social/privkey.pem ssl/key.pem

# Set proper permissions
sudo chmod 644 ssl/cert.pem
sudo chmod 600 ssl/key.pem
```

## Step 4: Deploy Your Application

```bash
# In deployment/production/ directory
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

## Step 5: Verify Everything Works

### Test your domain:
```bash
# Check DNS resolution
nslookup artparty.social

# Test HTTP redirect (should redirect to HTTPS)
curl -I http://artparty.social

# Test HTTPS (should return 200)
curl -I https://artparty.social

# Check SSL certificate
openssl s_client -connect artparty.social:443 -servername artparty.social
```

### Expected results:
- ✅ **HTTP**: Should redirect to HTTPS (301)
- ✅ **HTTPS**: Should return your app (200)
- ✅ **SSL**: Should show valid certificate

## Step 6: Security Checklist

- [ ] **DNS**: A records point to 104.248.124.8
- [ ] **SSL**: Let's Encrypt certificates installed
- [ ] **Passwords**: Strong DB_PASSWORD set
- [ ] **Passwords**: Strong REDIS_PASSWORD set  
- [ ] **JWT**: Strong SECRET_KEY set (64+ chars)
- [ ] **CORS**: Set to artparty.social domains
- [ ] **Firewall**: Ports 80 and 443 open

## Troubleshooting

### If DNS isn't working:
- Wait 24-48 hours for full propagation
- Check GoDaddy DNS settings
- Test with: `dig artparty.social`

### If SSL isn't working:
- Check certificate paths in ssl/ directory
- Verify certificate permissions
- Check nginx logs: `docker-compose -f docker-compose.prod.yml logs frontend`

### If CORS errors occur:
- Verify CORS_ORIGINS in .env file
- Check backend logs: `docker-compose -f docker-compose.prod.yml logs backend`

## 🚀 Production URLs

Once deployed, your app will be available at:
- **Main site**: https://artparty.social
- **With www**: https://www.artparty.social  
- **API**: https://artparty.social/api/
- **Health check**: https://artparty.social/health

---

**Ready to deploy? Make sure you've updated the passwords in your .env file!** 