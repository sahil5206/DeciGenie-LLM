# GitHub Secrets Setup Guide

To fix the GitHub Actions CI/CD pipeline errors, you need to set up the following secrets in your GitHub repository:

## Required Secrets

### 1. GCP_SA_KEY
- **Description**: Google Cloud Service Account JSON key
- **How to get it**:
  1. Go to Google Cloud Console
  2. Navigate to IAM & Admin > Service Accounts
  3. Create a new service account or use existing one
  4. Create a new key (JSON format)
  5. Copy the entire JSON content

### 2. GCP_PROJECT_ID
- **Description**: Your Google Cloud Project ID
- **Example**: `decigenie-llm-123456`

### 3. GCP_ZONE
- **Description**: Google Cloud zone where your GKE cluster is located
- **Example**: `us-central1-a`

## How to Add Secrets

1. Go to your GitHub repository
2. Click on **Settings** tab
3. Click on **Secrets and variables** > **Actions**
4. Click **New repository secret**
5. Add each secret with the exact names above

## Testing the Pipeline

After adding the secrets:

1. Make a small change to any file
2. Commit and push to the `main` branch
3. Go to **Actions** tab to monitor the pipeline
4. Check for any remaining errors

## Common Issues and Solutions

### Issue: "GCP_SA_KEY not found"
- **Solution**: Make sure the secret name is exactly `GCP_SA_KEY`

### Issue: "Permission denied" in GKE
- **Solution**: Ensure your service account has the following roles:
  - `roles/container.admin`
  - `roles/storage.admin`
  - `roles/logging.logWriter`
  - `roles/monitoring.metricWriter`

### Issue: "Cluster not found"
- **Solution**: Verify your GKE cluster name and zone are correct

### Issue: "Tests failing"
- **Solution**: The pipeline now includes basic tests that should pass. If they fail, check the test output for specific errors.

## Pipeline Stages

1. **Test Stage**: Runs unit tests for all services
2. **Build Stage**: Builds and pushes Docker images to GCR
3. **Deploy Stage**: Deploys to GKE (only on main branch)

## Monitoring

- Check the **Actions** tab in your GitHub repository
- Each commit will trigger a new pipeline run
- Green checkmarks indicate success
- Red X marks indicate failure (click to see details) 