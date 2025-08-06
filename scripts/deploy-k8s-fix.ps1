# DeciGenie LLM Kubernetes Deployment Fix Script
# This script applies fixes for document upload issues in Kubernetes

Write-Host "🚀 Applying Kubernetes fixes for DeciGenie LLM..." -ForegroundColor Green

# Apply the updated document ingestion deployment
Write-Host "📄 Applying updated document ingestion deployment..." -ForegroundColor Yellow
kubectl apply -f k8s/document-ingestion-deployment.yaml

# Apply the updated frontend deployment
Write-Host "🌐 Applying updated frontend deployment..." -ForegroundColor Yellow
kubectl apply -f k8s/clean-frontend-deployment.yaml

# Apply the ingress configuration
Write-Host "🔗 Applying ingress configuration..." -ForegroundColor Yellow
kubectl apply -f k8s/ingress.yaml

# Wait for deployments to be ready
Write-Host "⏳ Waiting for deployments to be ready..." -ForegroundColor Yellow
kubectl wait --for=condition=available --timeout=300s deployment/document-ingestion -n decigenie
kubectl wait --for=condition=available --timeout=300s deployment/frontend -n decigenie

# Check the status
Write-Host "📊 Checking deployment status..." -ForegroundColor Yellow
kubectl get pods -n decigenie
kubectl get services -n decigenie

Write-Host "✅ Kubernetes fixes applied successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "🔍 To check the logs:" -ForegroundColor Cyan
Write-Host "kubectl logs -f deployment/document-ingestion -n decigenie" -ForegroundColor White
Write-Host "kubectl logs -f deployment/frontend -n decigenie" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Your application should now be accessible at your Kubernetes ingress URL" -ForegroundColor Cyan 