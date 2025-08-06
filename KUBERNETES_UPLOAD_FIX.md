# Kubernetes Upload Fix Guide

## Problem
The file upload functionality works correctly in the local Docker environment but fails with "Network Error" when deployed to Kubernetes.

## Root Cause
The frontend code was hardcoded to use nginx proxy routes (`/document-api/api/documents/upload`) which work in the local Docker setup but not in Kubernetes where services communicate directly.

## Solution

### 1. Updated Frontend Code
The frontend now uses environment variables to determine the correct API endpoints:

- **Local Development**: Uses proxy routes (`/document-api`, `/api`)
- **Kubernetes**: Uses direct service URLs from environment variables

### 2. Environment Variables
The Kubernetes deployment sets these environment variables:
- `REACT_APP_API_URL`: `http://llm-query-service:8000`
- `REACT_APP_DOCUMENT_SERVICE_URL`: `http://document-ingestion:8001`

### 3. Production Dockerfile
Created `frontend/Dockerfile.prod` that serves the React app directly without nginx for Kubernetes deployment.

### 4. CORS Configuration
Updated CORS settings in the document ingestion service to allow requests from Kubernetes services.

## Deployment Steps

### Option 1: Using the Script (Recommended)
```bash
# For Linux/Mac
chmod +x scripts/build-and-deploy-k8s.sh
./scripts/build-and-deploy-k8s.sh

# For Windows PowerShell
.\scripts\build-and-deploy-k8s.ps1
```

### Option 2: Manual Deployment
```bash
# 1. Build and push frontend image
cd frontend
docker build -f Dockerfile.prod -t gcr.io/decigenie-llm/decigenie-frontend:latest .
docker push gcr.io/decigenie-llm/decigenie-frontend:latest
cd ..

# 2. Build and push document ingestion service
cd document-ingestion
docker build -t gcr.io/decigenie-llm/decigenie-document-service:latest .
docker push gcr.io/decigenie-llm/decigenie-document-service:latest
cd ..

# 3. Build and push LLM query service
cd llm-query-service
docker build -t gcr.io/decigenie-llm/decigenie-llm-query-service:latest .
docker push gcr.io/decigenie-llm/decigenie-llm-query-service:latest
cd ..

# 4. Deploy to Kubernetes
kubectl apply -f k8s/
```

## Verification

### 1. Check Pod Status
```bash
kubectl get pods -n decigenie
```

### 2. Check Service Logs
```bash
# Frontend logs
kubectl logs -f deployment/frontend -n decigenie

# Document ingestion logs
kubectl logs -f deployment/document-ingestion -n decigenie

# LLM query service logs
kubectl logs -f deployment/llm-query-service -n decigenie
```

### 3. Test Upload Functionality
1. Access your Kubernetes application URL
2. Navigate to the upload page
3. Try uploading a PDF file
4. Check that the upload completes successfully

## Troubleshooting

### If uploads still fail:

1. **Check CORS Configuration**
   - Verify the document ingestion service allows your domain
   - Update the CORS origin in `document-ingestion/src/index.js`

2. **Check Network Connectivity**
   ```bash
   # Test service connectivity
   kubectl exec -it deployment/frontend -n decigenie -- wget -O- http://document-ingestion:8001/health
   ```

3. **Check Environment Variables**
   ```bash
   kubectl exec -it deployment/frontend -n decigenie -- env | grep REACT_APP
   ```

4. **Check Ingress Configuration**
   ```bash
   kubectl get ingress -n decigenie
   kubectl describe ingress decigenie-ingress -n decigenie
   ```

## Files Modified

1. `frontend/src/pages/DocumentUpload.js` - Updated API endpoint logic
2. `frontend/src/pages/QueryInterface.js` - Updated API endpoint logic
3. `frontend/Dockerfile.prod` - New production Dockerfile
4. `document-ingestion/src/index.js` - Updated CORS configuration
5. `test-upload.html` - Updated for both environments
6. `scripts/build-and-deploy-k8s.sh` - Deployment script
7. `scripts/build-and-deploy-k8s.ps1` - PowerShell deployment script

## Notes

- The local Docker environment continues to work as before
- The Kubernetes environment now uses direct service communication
- Environment variables determine the correct API endpoints for each environment
- CORS is configured to allow both local and Kubernetes environments 