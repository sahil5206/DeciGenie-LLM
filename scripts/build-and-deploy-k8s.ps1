# Build and Deploy to Kubernetes
param(
    [string]$ProjectId = "decigenie-llm",
    [string]$Region = "us-central1"
)

Write-Host "🚀 Building and deploying to Kubernetes..." -ForegroundColor Green

# Build and push frontend image
Write-Host "📦 Building frontend image..." -ForegroundColor Yellow
Set-Location frontend
docker build -f Dockerfile.prod -t "gcr.io/$ProjectId/decigenie-frontend:latest" .
docker push "gcr.io/$ProjectId/decigenie-frontend:latest"
Set-Location ..

# Build and push document ingestion service
Write-Host "📦 Building document ingestion service..." -ForegroundColor Yellow
Set-Location document-ingestion
docker build -t "gcr.io/$ProjectId/decigenie-document-service:latest" .
docker push "gcr.io/$ProjectId/decigenie-document-service:latest"
Set-Location ..

# Build and push LLM query service
Write-Host "📦 Building LLM query service..." -ForegroundColor Yellow
Set-Location llm-query-service
docker build -t "gcr.io/$ProjectId/decigenie-llm-query-service:latest" .
docker push "gcr.io/$ProjectId/decigenie-llm-query-service:latest"
Set-Location ..

# Deploy to Kubernetes
Write-Host "🚀 Deploying to Kubernetes..." -ForegroundColor Yellow
kubectl apply -f k8s/

Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host "🔍 Check deployment status with: kubectl get pods -n decigenie" -ForegroundColor Cyan 