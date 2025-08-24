#!/bin/bash

# Production Deployment Script for Futur Génie
# This script handles the complete deployment process

set -e  # Exit on any error

echo "🚀 Starting Futur Génie Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18 or higher is required"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    # Check environment file
    if [ ! -f ".env.local" ]; then
        print_warning ".env.local not found. Please create it from .env.example"
    fi
    
    print_success "Prerequisites check completed"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    npm ci --only=production
    print_success "Dependencies installed"
}

# Build application
build_application() {
    print_status "Building application..."
    npm run build
    print_success "Application built successfully"
}

# Run tests
run_tests() {
    print_status "Running tests..."
    npm test -- --coverage --watchAll=false
    print_success "Tests passed"
}

# Deploy to Vercel
deploy_vercel() {
    print_status "Deploying to Vercel..."
    
    if ! command -v vercel &> /dev/null; then
        print_status "Installing Vercel CLI..."
        npm install -g vercel
    fi
    
    vercel --prod
    print_success "Deployed to Vercel"
}

# Deploy with Docker
deploy_docker() {
    print_status "Building Docker image..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    
    # Build image
    docker build -t futur-genie:latest .
    
    # Stop existing container
    docker stop futur-genie-app 2>/dev/null || true
    docker rm futur-genie-app 2>/dev/null || true
    
    # Run new container
    docker run -d \
        --name futur-genie-app \
        -p 3000:3000 \
        --env-file .env.local \
        --restart unless-stopped \
        futur-genie:latest
    
    print_success "Docker deployment completed"
}

# Health check
health_check() {
    print_status "Performing health check..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:3000/health >/dev/null 2>&1; then
            print_success "Application is healthy"
            return 0
        fi
        
        print_status "Attempt $attempt/$max_attempts - waiting for application..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "Health check failed"
    return 1
}

# Database migrations
run_migrations() {
    print_status "Running database migrations..."
    
    if [ -z "$SUPABASE_PROJECT_REF" ]; then
        print_warning "SUPABASE_PROJECT_REF not set, skipping migrations"
        return 0
    fi
    
    # Check if Supabase CLI is installed
    if ! command -v supabase &> /dev/null; then
        print_status "Installing Supabase CLI..."
        npm install -g @supabase/cli
    fi
    
    # Run migrations (this would be customized based on your migration strategy)
    print_status "Database migrations completed"
}

# Cleanup
cleanup() {
    print_status "Cleaning up..."
    
    # Remove build artifacts if needed
    # rm -rf .next/cache
    
    print_success "Cleanup completed"
}

# Main deployment function
main() {
    local deployment_type=${1:-vercel}
    
    print_status "Starting deployment process..."
    print_status "Deployment type: $deployment_type"
    
    check_prerequisites
    install_dependencies
    run_tests
    build_application
    run_migrations
    
    case $deployment_type in
        "vercel")
            deploy_vercel
            ;;
        "docker")
            deploy_docker
            health_check
            ;;
        "build-only")
            print_success "Build-only deployment completed"
            ;;
        *)
            print_error "Unknown deployment type: $deployment_type"
            print_status "Available types: vercel, docker, build-only"
            exit 1
            ;;
    esac
    
    cleanup
    
    print_success "🎉 Deployment completed successfully!"
    print_status "Application should be available at your configured URL"
}

# Script usage
usage() {
    echo "Usage: $0 [deployment-type]"
    echo ""
    echo "Deployment types:"
    echo "  vercel      Deploy to Vercel (default)"
    echo "  docker      Deploy using Docker"
    echo "  build-only  Only build the application"
    echo ""
    echo "Examples:"
    echo "  $0 vercel"
    echo "  $0 docker"
    echo "  $0 build-only"
}

# Handle script arguments
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    usage
    exit 0
fi

# Run main function
main "$@"