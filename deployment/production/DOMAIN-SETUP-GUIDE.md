# GoDaddy Domain Setup Guide

## Step 1: Configure Your Domain in GoDaddy

### DNS Settings (In GoDaddy Control Panel):
1. Login to your GoDaddy account
2. Go to "My Products" → "DNS"
3. Click "Manage" for your domain
4. Add/Update these DNS records:

```
Type: A
Name: @
Value: YOUR_DIGITAL_OCEAN_SERVER_IP
TTL: 1 Hour

Type: A  
Name: www
Value: YOUR_DIGITAL_OCEAN_SERVER_IP
TTL: 1 Hour

Type: CNAME (optional)
Name: app
Value: yourdomain.com
TTL: 1 Hour
```

**Replace `YOUR_DIGITAL_OCEAN_SERVER_IP` with your actual server IP (e.g., 104.248.124.8)**

## Step 2: Update Production Configuration Files

### 2.1 Update Environment Variables (env.prod.template)

```bash
# Copy the template
cp env.prod.template .env

# Edit the .env file and update:
CORS_ORIGINS=["https://yourdomain.com","https://www.yourdomain.com"]
```

**Replace `yourdomain.com` with your actual domain**

### 2.2 Update Nginx Configuration (nginx.prod.conf)

Find these lines and replace with your domain:

```nginx
# Line ~62: HTTP redirect server
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;  # ← UPDATE THIS
    return 301 https://$host$request_uri;
}

# Line ~68: HTTPS server  
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;  # ← UPDATE THIS
    # ... rest of config
}
```

## Step 3: SSL Certificate Setup

### Option A: Let's Encrypt (Recommended - FREE)
```bash
# On your Digital Ocean server
sudo apt update
sudo apt install certbot

# Stop nginx temporarily
sudo systemctl stop nginx

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Copy certificates to your deployment directory
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ssl/key.pem
sudo chmod 644 ssl/cert.pem
sudo chmod 600 ssl/key.pem
```

### Option B: Manual SSL Upload (if you have certificates)
```bash
# Create ssl directory
mkdir -p ssl

# Copy your certificates
cp your-certificate.pem ssl/cert.pem
cp your-private-key.pem ssl/key.pem
```

## Step 4: Example Complete Configuration

### Example for domain: `myapp.com`

**env.prod.template:**
```env
CORS_ORIGINS=["https://myapp.com","https://www.myapp.com"]
```

**nginx.prod.conf:**
```nginx
# HTTP redirect
server {
    listen 80;
    server_name myapp.com www.myapp.com;
    return 301 https://$host$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name myapp.com www.myapp.com;
    # ... rest of config
}
```

## Step 5: Deployment Commands

```bash
# After updating all config files
docker-compose -f docker-compose.prod.yml up -d

# Check if everything is running
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

## Step 6: Verify Everything Works

1. **Check DNS**: `nslookup yourdomain.com`
2. **Check HTTP redirect**: `curl -I http://yourdomain.com`
3. **Check HTTPS**: `curl -I https://yourdomain.com`
4. **Check SSL**: `openssl s_client -connect yourdomain.com:443 -servername yourdomain.com`

## Troubleshooting

### Common Issues:
1. **DNS not propagating**: Can take 24-48 hours
2. **SSL certificate errors**: Check certificate paths and permissions
3. **CORS errors**: Ensure your domain is in CORS_ORIGINS
4. **Port 80/443 blocked**: Check firewall settings

### Debug Commands:
```bash
# Check nginx config
docker-compose -f docker-compose.prod.yml exec frontend nginx -t

# Check logs
docker-compose -f docker-compose.prod.yml logs frontend
docker-compose -f docker-compose.prod.yml logs backend

# Test from inside container
docker-compose -f docker-compose.prod.yml exec frontend curl -I http://backend:8000/health
```

## Security Checklist

- [ ] Updated all passwords in .env
- [ ] Set strong SECRET_KEY (64+ characters)
- [ ] Updated CORS_ORIGINS with your domain
- [ ] SSL certificate is valid and not expired
- [ ] Firewall allows ports 80 and 443
- [ ] DNS records point to correct IP

---

**Once you provide your domain name, I can create the exact configuration files for you!** 