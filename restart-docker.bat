@echo off
echo 🔄 Restarting Docker containers...

REM Stop all services
echo ⏹️  Stopping services...
docker-compose down

REM Wait a moment
timeout /t 2 /nobreak >nul

REM Start all services
echo ▶️  Starting services...
docker-compose up -d

REM Wait for services to be ready
echo ⏳ Waiting for services to be ready...
timeout /t 5 /nobreak >nul

REM Check status
echo 📊 Container status:
docker-compose ps

echo ✅ Docker containers restarted!
echo 🌐 Backend: http://localhost:8000
echo 🎨 Frontend: http://localhost:3000
echo 📊 Database: localhost:5432

pause
