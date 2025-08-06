#!/bin/bash

# Build and Deploy to Kubernetes
set -e

echo "🚀 Building and deploying to Kubernetes..."

# Set your GCR project ID
PROJECT_ID="decigenie-llm"
REGION="us-central1"

# Build and push frontend image
echo "📦 Building frontend image..."
cd frontend
docker build -f Dockerfile.prod -t gcr.io/$PROJECT_ID/decigenie-frontend:latest .
docker push gcr.io/$PROJECT_ID/decigenie-frontend:latest
cd ..

# Build and push document ingestion service
echo "📦 Building document ingestion service..."
cd document-ingestion
docker build -t gcr.io/$PROJECT_ID/decigenie-document-service:latest .
docker push gcr.io/$PROJECT_ID/decigenie-document-service:latest
cd ..

# Build and push LLM query service
echo "📦 Building LLM query service..."
cd llm-query-service
docker build -t gcr.io/$PROJECT_ID/decigenie-llm-query-service:latest .
docker push gcr.io/$PROJECT_ID/decigenie-llm-query-service:latest
cd ..

# Deploy to Kubernetes
echo "🚀 Deploying to Kubernetes..."
kubectl apply -f k8s/

echo "✅ Deployment complete!"
echo "🔍 Check deployment status with: kubectl get pods -n decigenie" 