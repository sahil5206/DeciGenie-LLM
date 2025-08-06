# DeciGenie LLM Deployment Guide

This guide covers deploying the DeciGenie LLM system to Google Cloud Platform using Kubernetes.

## Prerequisites

- Google Cloud Platform account
- Google Cloud CLI (gcloud) installed and configured
- Terraform installed (v1.0+)
- kubectl installed
- Docker installed
- GitHub repository with the DeciGenie LLM code

## 1. Google Cloud Setup

### 1.1 Create a new project or use existing one

```bash
# Create new project
gcloud projects create YOUR_PROJECT_ID --name="DeciGenie LLM"

# Set the project
gcloud config set project YOUR_PROJECT_ID

# Enable billing
gcloud billing projects link YOUR_PROJECT_ID --billing-account=YOUR_BILLING_ACCOUNT_ID
```

### 1.2 Enable required APIs

```bash
gcloud services enable container.googleapis.com
gcloud services enable compute.googleapis.com
gcloud services enable cloudresourcemanager.googleapis.com
gcloud services enable iam.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable sql-component.googleapis.com
gcloud services enable sqladmin.googleapis.com
```

### 1.3 Create service account for CI/CD

```bash
# Create service account
gcloud iam service-accounts create decigenie-cicd \
    --display-name="DeciGenie CI/CD Service Account"

# Grant necessary roles
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:decigenie-cicd@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/container.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:decigenie-cicd@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:decigenie-cicd@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/iam.serviceAccountUser"

# Create and download key
gcloud iam service-accounts keys create ~/decigenie-cicd-key.json \
    --iam-account=decigenie-cicd@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

## 2. Infrastructure Setup with Terraform

### 2.1 Configure Terraform

```bash
cd infrastructure/terraform

# Copy and edit variables
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:
```hcl
project_id   = "YOUR_PROJECT_ID"
region       = "us-central1"
zone         = "us-central1-a"
node_count   = 2
machine_type = "e2-medium"
db_password  = "YOUR_SECURE_DB_PASSWORD"
environment  = "production"
```

### 2.2 Deploy infrastructure

```bash
# Initialize Terraform
terraform init

# Plan deployment
terraform plan

# Apply deployment
terraform apply
```

### 2.3 Get cluster credentials

```bash
gcloud container clusters get-credentials decigenie-cluster \
    --zone us-central1-a \
    --project YOUR_PROJECT_ID
```

## 3. Configure Secrets

### 3.1 Get Google Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key

### 3.2 Create Kubernetes secrets

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Create secrets (replace with your actual values)
kubectl create secret generic decigenie-secrets \
    --namespace=decigenie \
    --from-literal=GEMINI_API_KEY="YOUR_GEMINI_API_KEY" \
    --from-literal=DATABASE_URL="postgresql://decigenie_user:YOUR_DB_PASSWORD@YOUR_DB_HOST:5432/decigenie" \
    --from-literal=POSTGRES_PASSWORD="YOUR_DB_PASSWORD"
```

## 4. GitHub Actions Setup

### 4.1 Add repository secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add the following secrets:
- `GCP_PROJECT_ID`: Your GCP project ID
- `GCP_SA_KEY`: Content of the service account key file (`~/decigenie-cicd-key.json`)
- `GCP_ZONE`: Your GCP zone (e.g., `us-central1-a`)

### 4.2 Update Kubernetes manifests

Update the image references in Kubernetes manifests:

```bash
# Replace PROJECT_ID with your actual project ID
sed -i 's/PROJECT_ID/YOUR_PROJECT_ID/g' k8s/*.yaml
```

## 5. Deploy Application

### 5.1 Manual deployment (for testing)

```bash
# Apply all Kubernetes manifests
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n decigenie
kubectl get services -n decigenie
kubectl get ingress -n decigenie
```

### 5.2 Automated deployment via CI/CD

1. Push your code to the `main` branch
2. GitHub Actions will automatically:
   - Run tests
   - Build Docker images
   - Push to Google Container Registry
   - Deploy to GKE

## 6. Configure Domain and SSL

### 6.1 Reserve static IP

```bash
gcloud compute addresses create decigenie-ip \
    --global \
    --ip-version=IPV4
```

### 6.2 Update ingress configuration

Edit `k8s/ingress.yaml`:
```yaml
spec:
  rules:
  - host: your-domain.com  # Replace with your domain
```

### 6.3 Configure DNS

Point your domain to the reserved IP address:
```bash
gcloud compute addresses describe decigenie-ip --global
```

### 6.4 Apply updated ingress

```bash
kubectl apply -f k8s/ingress.yaml
```

## 7. Monitoring and Logging

### 7.1 Enable Cloud Monitoring

```bash
gcloud services enable monitoring.googleapis.com
gcloud services enable logging.googleapis.com
```

### 7.2 View logs

```bash
# View application logs
kubectl logs -f deployment/frontend -n decigenie
kubectl logs -f deployment/llm-query-service -n decigenie
kubectl logs -f deployment/document-ingestion -n decigenie
```

### 7.3 Monitor resources

```bash
# Check resource usage
kubectl top pods -n decigenie
kubectl top nodes
```

## 8. Scaling and Maintenance

### 8.1 Scale deployments

```bash
# Scale services
kubectl scale deployment frontend --replicas=3 -n decigenie
kubectl scale deployment llm-query-service --replicas=3 -n decigenie
kubectl scale deployment document-ingestion --replicas=3 -n decigenie
```

### 8.2 Update application

```bash
# Update to new image
kubectl set image deployment/frontend frontend=gcr.io/YOUR_PROJECT_ID/decigenie-frontend:NEW_TAG -n decigenie
```

### 8.3 Backup database

```bash
# Create backup
gcloud sql backups create --instance=decigenie-db-instance
```

## 9. Troubleshooting

### 9.1 Common issues

**Pods not starting:**
```bash
kubectl describe pod <pod-name> -n decigenie
kubectl logs <pod-name> -n decigenie
```

**Database connection issues:**
```bash
# Check database status
gcloud sql instances describe decigenie-db-instance
```

**Ingress not working:**
```bash
kubectl describe ingress decigenie-ingress -n decigenie
```

### 9.2 Health checks

```bash
# Check service health
curl http://localhost:8000/health
curl http://localhost:8001/health
```

## 10. Cost Optimization

### 10.1 Right-size resources

- Use appropriate machine types for your workload
- Enable autoscaling for GKE node pools
- Use preemptible instances for non-critical workloads

### 10.2 Monitor costs

```bash
# View cost breakdown
gcloud billing budgets list
```

## 11. Security Considerations

### 11.1 Network security

- Use private GKE clusters
- Configure network policies
- Enable VPC-native clusters

### 11.2 Access control

- Use IAM roles with minimal permissions
- Enable audit logging
- Regularly rotate service account keys

### 11.3 Data protection

- Encrypt data at rest and in transit
- Use Cloud KMS for sensitive data
- Implement proper backup strategies

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review application logs
3. Check Google Cloud Console for infrastructure issues
4. Create an issue in the GitHub repository 