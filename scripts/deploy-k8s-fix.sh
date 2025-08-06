#!/bin/bash

# DeciGenie LLM Kubernetes Deployment Fix Script
# This script applies fixes for document upload issues in Kubernetes

echo "🚀 Applying Kubernetes fixes for DeciGenie LLM..."

# Apply the updated document ingestion deployment
echo "📄 Applying updated document ingestion deployment..."
kubectl apply -f k8s/document-ingestion-deployment.yaml

# Apply the updated frontend deployment
echo "🌐 Applying updated frontend deployment..."
kubectl apply -f k8s/clean-frontend-deployment.yaml

# Apply the ingress configuration
echo "🔗 Applying ingress configuration..."
kubectl apply -f k8s/ingress.yaml

# Wait for deployments to be ready
echo "⏳ Waiting for deployments to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/document-ingestion -n decigenie
kubectl wait --for=condition=available --timeout=300s deployment/frontend -n decigenie

# Check the status
echo "📊 Checking deployment status..."
kubectl get pods -n decigenie
kubectl get services -n decigenie

echo "✅ Kubernetes fixes applied successfully!"
echo ""
echo "🔍 To check the logs:"
echo "kubectl logs -f deployment/document-ingestion -n decigenie"
echo "kubectl logs -f deployment/frontend -n decigenie"
echo ""
echo "🌐 Your application should now be accessible at your Kubernetes ingress URL" 