#!/bin/bash

# DeciGenie LLM Setup Script
# This script sets up the local development environment

set -e

echo "🚀 Setting up DeciGenie LLM Development Environment"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p uploads
mkdir -p logs

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "⚠️  Please edit .env file with your configuration values"
    echo "   - Set your GEMINI_API_KEY"
    echo "   - Update database configuration if needed"
fi

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Install LLM query service dependencies
echo "📦 Installing LLM query service dependencies..."
cd llm-query-service
npm install
cd ..

# Install document ingestion service dependencies
echo "📦 Installing document ingestion service dependencies..."
cd document-ingestion
npm install
cd ..

# Build Docker images
echo "🐳 Building Docker images..."
docker-compose build

echo "✅ Setup completed successfully!"
echo ""
echo "🎯 Next steps:"
echo "1. Edit .env file with your configuration"
echo "2. Run 'docker-compose up -d' to start all services"
echo "3. Access the application at http://localhost:3000"
echo ""
echo "📚 For more information, see README.md" 