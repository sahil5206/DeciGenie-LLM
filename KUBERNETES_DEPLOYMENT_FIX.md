# Kubernetes Deployment Fix for Document Upload Issues

## Problem Summary
The document upload functionality was working correctly on localhost but failing on the Kubernetes deployment due to several configuration issues.

## Issues Identified and Fixed

### 1. **Database Configuration**
- **Problem**: The document ingestion service was missing the `DATABASE_URL` environment variable in Kubernetes
- **Fix**: Added proper database configuration with secret reference

### 2. **Health Check Paths**
- **Problem**: Kubernetes health checks were using incorrect paths (`/health/live`, `/health/ready`)
- **Fix**: Updated to use the correct health check path (`/health`)

### 3. **Volume Mounts**
- **Problem**: Missing persistent volume for document uploads
- **Fix**: Added persistent volume claim and proper volume mounts

### 4. **API Endpoint Configuration**
- **Problem**: Frontend was trying to call internal Kubernetes service names from browser
- **Fix**: Updated frontend to use relative paths that work with ingress routing

### 5. **CORS Configuration**
- **Problem**: CORS was restricted to specific origins in production
- **Fix**: Updated CORS to allow all origins in production environment

## Files Modified

### 1. `k8s/document-ingestion-deployment.yaml`
- Added `DATABASE_URL` environment variable
- Fixed health check paths
- Added persistent volume mounts
- Added persistent volume claim

### 2. `k8s/clean-frontend-deployment.yaml`
- Updated `REACT_APP_DOCUMENT_SERVICE_URL` to use `/document-api`

### 3. `document-ingestion/src/index.js`
- Updated CORS configuration for production

## Deployment Steps

### 1. Rebuild the Document Ingestion Service
```bash
# Build the updated image
docker build -t gcr.io/decigenie-llm/decigenie-document-service:latest ./document-ingestion

# Push to Google Container Registry
docker push gcr.io/decigenie-llm/decigenie-document-service:latest
```

### 2. Rebuild the Frontend Service
```bash
# Build the updated image
docker build -t gcr.io/decigenie-llm/decigenie-frontend:latest ./frontend

# Push to Google Container Registry
docker push gcr.io/decigenie-llm/decigenie-frontend:latest
```

### 3. Apply Kubernetes Configuration
```bash
# Apply the fixes
kubectl apply -f k8s/document-ingestion-deployment.yaml
kubectl apply -f k8s/clean-frontend-deployment.yaml
kubectl apply -f k8s/ingress.yaml

# Wait for deployments to be ready
kubectl wait --for=condition=available --timeout=300s deployment/document-ingestion -n decigenie
kubectl wait --for=condition=available --timeout=300s deployment/frontend -n decigenie
```

### 4. Verify Deployment
```bash
# Check pod status
kubectl get pods -n decigenie

# Check services
kubectl get services -n decigenie

# Check ingress
kubectl get ingress -n decigenie
```

## Testing the Fix

### 1. Check Service Logs
```bash
# Document ingestion service logs
kubectl logs -f deployment/document-ingestion -n decigenie

# Frontend logs
kubectl logs -f deployment/frontend -n decigenie
```

### 2. Test Health Endpoints
```bash
# Test document service health
curl https://your-domain.com/document-api/health

# Test frontend
curl https://your-domain.com/
```

### 3. Test Document Upload
1. Navigate to your Kubernetes application URL
2. Go to the Upload Documents page
3. Try uploading a test document (PDF, DOCX, or TXT)
4. Verify the upload completes successfully

## Troubleshooting

### If uploads still fail:

1. **Check Database Connection**
   ```bash
   kubectl logs deployment/document-ingestion -n decigenie | grep "Database"
   ```

2. **Check CORS Issues**
   - Open browser developer tools
   - Look for CORS errors in the console
   - Check network tab for failed requests

3. **Check Ingress Configuration**
   ```bash
   kubectl describe ingress decigenie-ingress -n decigenie
   ```

4. **Check Persistent Volume**
   ```bash
   kubectl get pvc -n decigenie
   kubectl describe pvc uploads-pvc -n decigenie
   ```

## Expected Behavior After Fix

- ✅ Document uploads should work from the Kubernetes deployment
- ✅ Files should be stored in persistent volume
- ✅ Database records should be created properly
- ✅ No CORS errors in browser console
- ✅ Health checks should pass

## Rollback Instructions

If issues persist, you can rollback to the previous configuration:

```bash
# Rollback deployments
kubectl rollout undo deployment/document-ingestion -n decigenie
kubectl rollout undo deployment/frontend -n decigenie

# Or apply the original files if you have backups
kubectl apply -f k8s/original-document-ingestion-deployment.yaml
kubectl apply -f k8s/original-frontend-deployment.yaml
``` 