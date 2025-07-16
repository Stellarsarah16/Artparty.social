# Disk Space Recovery Guide for Production Server

## Critical Issue: No Space Left on Device

Your production server is running out of disk space, which is preventing Docker builds from completing. This guide provides step-by-step instructions to recover disk space.

## Immediate Actions Required

### 1. Check Current Disk Usage
```bash
# Check disk space
df -h

# Check inode usage
df -i

# Check largest directories
sudo du -h / | sort -rh | head -20
```

### 2. Emergency Docker Cleanup
```bash
# Stop all containers
docker stop $(docker ps -aq)

# Remove all containers
docker rm $(docker ps -aq)

# Remove all images
docker rmi $(docker images -aq)

# Remove all volumes
docker volume rm $(docker volume ls -q)

# Remove all networks
docker network rm $(docker network ls -q)

# Clean up everything
docker system prune -a --volumes -f
```

### 3. System Cleanup
```bash
# Clear package cache
sudo apt-get clean
sudo apt-get autoremove -y

# Clear log files (keep last 3 days only)
sudo journalctl --vacuum-time=3d

# Clear temporary files
sudo rm -rf /tmp/*
sudo rm -rf /var/tmp/*

# Clear old log files
sudo find /var/log -name "*.log" -size +10M -delete
sudo find /var/log -name "*.gz" -delete
```

### 4. Application-Specific Cleanup
```bash
# Check your application directory size
du -sh /opt/ArtpartySocial/*

# Clean up old backups if they exist
sudo find /opt/ArtpartySocial -name "*.backup.*" -mtime +7 -delete

# Clean up old logs
sudo find /opt/ArtpartySocial -name "*.log" -size +5M -delete
```

### 5. Database Cleanup (if needed)
```bash
# Connect to PostgreSQL and clean up old data
docker exec -it $(docker ps -q -f name=db) psql -U artparty -d artparty_social_prod

# In PostgreSQL, check table sizes:
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Using the New Deployment Script

After cleaning up disk space, use the new deployment script:

```bash
# Make the script executable
chmod +x deploy-with-space-check.sh

# Run the deployment with space checks
./deploy-with-space-check.sh
```

## Prevention Measures

### 1. Regular Cleanup Script
Create a cron job to run regular cleanup:

```bash
# Add to crontab (crontab -e)
0 2 * * * /opt/ArtpartySocial/deployment/production/cleanup-disk.sh
```

### 2. Monitor Disk Usage
```bash
# Check disk usage daily
df -h | grep -E '^/dev/'

# Monitor Docker disk usage
docker system df
```

### 3. Log Rotation
Ensure proper log rotation is configured:

```bash
# Check logrotate configuration
sudo cat /etc/logrotate.conf

# Add application-specific log rotation if needed
sudo nano /etc/logrotate.d/artparty
```

## Emergency Recovery Commands

If the server becomes unresponsive due to disk space:

```bash
# Emergency cleanup (run as root)
cd /opt/ArtpartySocial/deployment/production

# Stop all services
docker-compose -f docker-compose.prod.yml down

# Clean up Docker completely
docker system prune -a --volumes -f

# Clear system caches
sync && echo 3 > /proc/sys/vm/drop_caches

# Restart services
docker-compose -f docker-compose.prod.yml up -d
```

## Disk Space Requirements

- **Minimum required**: 2GB free space
- **Recommended**: 5GB free space
- **For comfortable operation**: 10GB free space

## Monitoring Commands

```bash
# Quick disk check
df -h

# Docker disk usage
docker system df

# Largest files in current directory
find . -type f -size +10M -exec ls -lh {} \;

# Directory sizes
du -sh */
```

## Contact Information

If you continue to experience disk space issues after following this guide, consider:

1. **Upgrading your server** to a larger disk
2. **Implementing log aggregation** to external services
3. **Setting up automated backups** to external storage
4. **Monitoring disk usage** with automated alerts

## Next Steps

1. Run the emergency cleanup commands above
2. Use the new deployment script: `./deploy-with-space-check.sh`
3. Set up regular monitoring and cleanup
4. Consider upgrading server resources if needed 