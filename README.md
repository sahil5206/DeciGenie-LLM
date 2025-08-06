# DeciGenie LLM

A full-stack microservices-based system that uses Google Gemini API to process natural language queries and extract relevant answers from large unstructured documents such as insurance policy PDFs, contracts, and emails.

## 🏗️ Architecture

The system consists of 4 microservices:

- **Frontend Service**: React-based responsive UI
- **LLM Query Service**: Node.js/Express service for Gemini API communication
- **Document Ingestion Service**: Handles document parsing and chunking
- **Database Service**: PostgreSQL with Docker for data persistence

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+
- Google Cloud Platform account
- Google Gemini API key

### Local Development
```bash
# Clone the repository
git clone <repository-url>
cd DeciGenie-LLM

# Set up environment variables
cp .env.example .env
# Edit .env with your Gemini API key

# Start all services
docker-compose up -d

# Access the application
open http://localhost:3000
```

### Production Deployment
```bash
# Deploy to GKE
terraform init
terraform plan
terraform apply
```

## 📁 Project Structure

```
DeciGenie-LLM/
├── frontend/                 # React frontend service
├── llm-query-service/        # LLM query processing service
├── document-ingestion/       # Document parsing service
├── database/                 # PostgreSQL database
├── infrastructure/           # Terraform and Ansible configs
├── k8s/                     # Kubernetes manifests
├── .github/                  # GitHub Actions CI/CD
└── docker-compose.yml        # Local development setup
```

## 🔧 Tech Stack

- **Frontend**: React, TailwindCSS, Vite
- **Backend**: Node.js, Express
- **Database**: PostgreSQL (Docker)
- **LLM**: Google Gemini API
- **Infrastructure**: Terraform, Ansible
- **CI/CD**: GitHub Actions
- **Deployment**: Docker, Kubernetes (GKE)

## 📝 License

MIT License 