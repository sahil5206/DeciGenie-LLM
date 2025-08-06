terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 4.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

# Enable required APIs
resource "google_project_service" "required_apis" {
  for_each = toset([
    "container.googleapis.com",
    "compute.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "iam.googleapis.com",
    "containerregistry.googleapis.com",
    "sql-component.googleapis.com",
    "sqladmin.googleapis.com",
    "servicenetworking.googleapis.com"
  ])

  service = each.value
  disable_on_destroy = false
}

# Create VPC
resource "google_compute_network" "vpc" {
  name                    = "decigenie-vpc"
  auto_create_subnetworks = false
  depends_on              = [google_project_service.required_apis]
}

# Create subnet
resource "google_compute_subnetwork" "subnet" {
  name          = "decigenie-subnet"
  ip_cidr_range = "10.0.0.0/24"
  network       = google_compute_network.vpc.id
  region        = var.region
}

# Create GKE cluster
resource "google_container_cluster" "primary" {
  name     = "decigenie-cluster"
  location = var.zone

  remove_default_node_pool = true
  initial_node_count       = 1

  network    = google_compute_network.vpc.name
  subnetwork = google_compute_subnetwork.subnet.name

  ip_allocation_policy {
    cluster_ipv4_cidr_block  = "/16"
    services_ipv4_cidr_block = "/22"
  }

  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }

  depends_on = [google_project_service.required_apis]
}

# Create node pool
resource "google_container_node_pool" "primary_nodes" {
  name       = "decigenie-node-pool"
  location   = var.zone
  cluster    = google_container_cluster.primary.name
  node_count = var.node_count

  node_config {
    oauth_scopes = [
      "https://www.googleapis.com/auth/logging.write",
      "https://www.googleapis.com/auth/monitoring",
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    labels = {
      env = var.project_id
    }

    machine_type = var.machine_type
    disk_size_gb = 20

    metadata = {
      disable-legacy-endpoints = "true"
    }

    tags = ["gke-node", "${var.project_id}-gke"]
  }
}

# Create VPC peering for Cloud SQL
resource "google_compute_global_address" "private_ip_address" {
  name          = "decigenie-private-ip"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc.id
  depends_on    = [google_project_service.required_apis]
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_address.name]
  depends_on              = [google_project_service.required_apis]
}

# Create Cloud SQL instance
resource "google_sql_database_instance" "instance" {
  name             = "decigenie-db-instance"
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    tier = "db-f1-micro"
    
    backup_configuration {
      enabled    = true
      start_time = "02:00"
    }

    ip_configuration {
      ipv4_enabled    = true
      private_network = google_compute_network.vpc.id
    }
  }

  deletion_protection = false
  depends_on          = [google_service_networking_connection.private_vpc_connection]
}

# Create database
resource "google_sql_database" "database" {
  name     = "decigenie"
  instance = google_sql_database_instance.instance.name
}

# Create database user
resource "google_sql_user" "users" {
  name     = "decigenie_user"
  instance = google_sql_database_instance.instance.name
  password = var.db_password
}

# Create Cloud Storage bucket for uploads
resource "google_storage_bucket" "uploads_bucket" {
  name          = "${var.project_id}-decigenie-uploads"
  location      = var.region
  force_destroy = true

  uniform_bucket_level_access = true

  lifecycle_rule {
    condition {
      age = 365
    }
    action {
      type = "Delete"
    }
  }
}

# Create service account for GKE
resource "google_service_account" "gke_service_account" {
  account_id   = "decigenie-gke-sa"
  display_name = "DeciGenie GKE Service Account"
}

# Grant necessary roles to service account
resource "google_project_iam_member" "gke_service_account_roles" {
  for_each = toset([
    "roles/container.admin",
    "roles/storage.admin",
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter"
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.gke_service_account.email}"
}

# Outputs
output "kubernetes_cluster_name" {
  value       = google_container_cluster.primary.name
  description = "GKE Cluster Name"
}

output "kubernetes_cluster_host" {
  value       = google_container_cluster.primary.endpoint
  description = "GKE Cluster Host"
}

output "database_instance_name" {
  value       = google_sql_database_instance.instance.name
  description = "Cloud SQL Instance Name"
}

output "database_connection_name" {
  value       = google_sql_database_instance.instance.connection_name
  description = "Cloud SQL Connection Name"
}

output "storage_bucket_name" {
  value       = google_storage_bucket.uploads_bucket.name
  description = "Cloud Storage Bucket Name"
} 