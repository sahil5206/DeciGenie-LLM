# Database Setup Guide for Kubernetes Deployment

## Overview
Your DeciGenie LLM application requires a PostgreSQL database with the `pgvector` extension for vector embeddings. This guide will help you set up the database for your Kubernetes deployment.

## Option 1: Google Cloud SQL (Recommended)

### 1. Create a Cloud SQL Instance
```bash
# Create a PostgreSQL instance with pgvector
gcloud sql instances create decigenie-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --storage-type=SSD \
  --storage-size=10GB \
  --backup-start-time=02:00 \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=03:00

# Create a database
gcloud sql databases create decigenie --instance=decigenie-db

# Create a user
gcloud sql users create decigenie-user \
  --instance=decigenie-db \
  --password=your-secure-password

# Enable the pgvector extension
gcloud sql connect decigenie-db --user=postgres
```

### 2. Enable pgvector Extension
Once connected to the database:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 3. Get the Connection String
```bash
# Get the connection info
gcloud sql instances describe decigenie-db --format="value(connectionName)"
```

Your connection string will be:
```
postgresql://decigenie-user:your-secure-password@/decigenie?host=/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME
```

## Option 2: External PostgreSQL Instance

If you have a PostgreSQL instance running elsewhere:

1. Ensure it has PostgreSQL 15+ with pgvector extension
2. Create a database and user
3. Run the initialization script from `database/init.sql`
4. Use the connection string: `postgresql://username:password@host:port/database`

## Option 3: Deploy PostgreSQL in Kubernetes

### 1. Create PostgreSQL Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: decigenie
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: pgvector/pgvector:pg15
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_DB
          value: decigenie
        - name: POSTGRES_USER
          value: postgres
        - name: POSTGRES_PASSWORD
          value: password
        volumeMounts:
        - name: postgres-data
          mountPath: /var/lib/postgresql/data
      volumes:
      - name: postgres-data
        persistentVolumeClaim:
          claimName: postgres-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: decigenie
spec:
  type: ClusterIP
  ports:
  - port: 5432
    targetPort: 5432
  selector:
    app: postgres
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
  namespace: decigenie
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
```

### 2. Apply the PostgreSQL deployment
```bash
kubectl apply -f postgres-deployment.yaml
```

### 3. Initialize the database
```bash
# Wait for PostgreSQL to be ready
kubectl wait --for=condition=available --timeout=300s deployment/postgres -n decigenie

# Copy the init script to the PostgreSQL pod
kubectl cp database/init.sql decigenie/postgres-xxx:/tmp/init.sql

# Execute the init script
kubectl exec -it deployment/postgres -n decigenie -- psql -U postgres -d decigenie -f /tmp/init.sql
```

## Update the Secrets

Once you have your database connection string, update the secrets:

### 1. Encode your database URL
```bash
# For Cloud SQL
echo -n "postgresql://decigenie-user:password@/decigenie?host=/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME" | base64

# For external PostgreSQL
echo -n "postgresql://username:password@host:port/database" | base64

# For Kubernetes PostgreSQL
echo -n "postgresql://postgres:password@postgres:5432/decigenie" | base64
```

### 2. Update the secrets file
Edit `k8s/decigenie-secrets.yaml` and replace the `DATABASE_URL` value with your encoded connection string.

### 3. Apply the secrets
```bash
kubectl apply -f k8s/decigenie-secrets.yaml
```

## Test the Database Connection

### 1. Check if the document ingestion service can connect
```bash
kubectl logs deployment/document-ingestion -n decigenie
```

You should see: "✅ Database connected successfully"

### 2. Test the health endpoint
```bash
# Get your ingress URL
kubectl get ingress -n decigenie

# Test the health endpoint
curl https://your-domain.com/document-api/health
```

## Troubleshooting

### Database Connection Issues
1. Check if the database is accessible from the Kubernetes cluster
2. Verify the connection string format
3. Ensure the pgvector extension is installed
4. Check firewall rules and network policies

### Common Errors
- **Connection timeout**: Database is not accessible from the cluster
- **Authentication failed**: Wrong username/password
- **Database does not exist**: Database needs to be created
- **Extension not found**: pgvector extension not installed

## Next Steps

Once the database is configured:

1. Apply the updated secrets: `kubectl apply -f k8s/decigenie-secrets.yaml`
2. Restart the document ingestion service: `kubectl rollout restart deployment/document-ingestion -n decigenie`
3. Test document uploads on your Kubernetes deployment
4. Monitor the logs for any issues: `kubectl logs -f deployment/document-ingestion -n decigenie` 