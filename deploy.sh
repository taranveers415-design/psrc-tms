#!/bin/bash

# PSRC TMS Deployment Script
# Run this on your server after installing Docker and Docker Compose

echo "🚀 PSRC TMS Deployment Starting..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker first."
    echo "   Ubuntu: curl -fsSL https://get.docker.com | sh"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose not found. Please install Docker Compose."
    echo "   Ubuntu: sudo apt install docker-compose"
    exit 1
fi

# Create environment file if not exists
if [ ! -f backend/.env ]; then
    echo "📝 Creating environment file..."
    cp backend/.env.example backend/.env
    echo "⚠️  Please edit backend/.env with your actual credentials before starting!"
fi

# Build and start services
echo "🏗️  Building and starting services..."
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Wait for database
echo "⏳ Waiting for database to be ready..."
sleep 10

# Check health
echo "🔍 Checking service health..."
curl -f http://localhost/api/health || echo "⚠️  API health check failed"

echo ""
echo "✅ PSRC TMS Deployment Complete!"
echo ""
echo "📊 Access your application:"
echo "   • Frontend: http://localhost"
echo "   • API: http://localhost/api"
echo "   • API Health: http://localhost/api/health"
echo ""
echo "🔧 Default Login Credentials:"
echo "   • Email: admin@psrc.in"
echo "   • Password: password"
echo ""
echo "📝 Next Steps:"
echo "   1. Change default password immediately"
echo "   2. Update backend/.env with production values"
echo "   3. Configure SSL certificates for HTTPS"
echo "   4. Set up automated backups for PostgreSQL"
echo ""
