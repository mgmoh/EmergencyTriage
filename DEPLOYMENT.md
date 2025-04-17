# ER Triage Application Deployment Guide

This document provides instructions for deploying the ER Triage application using Docker containers on different platforms.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Local Deployment with Docker Compose](#local-deployment-with-docker-compose)
3. [AWS ECS Deployment](#aws-ecs-deployment)
4. [AWS EKS Deployment](#aws-eks-deployment)
5. [Customizing Deployments](#customizing-deployments)
6. [Monitoring and Maintenance](#monitoring-and-maintenance)

## Prerequisites

Before deploying the application, ensure you have the following tools installed:

- Docker and Docker Compose
- AWS CLI (for AWS deployments)
- kubectl (for Kubernetes deployments)
- A PostgreSQL database (can be deployed alongside the application using Docker Compose)

## Local Deployment with Docker Compose

### Step 1: Configure Environment Variables

Create a `.env` file in the project root directory based on the `.env.example` template:

```
# Application settings
NODE_ENV=production
PORT=5000
SESSION_SECRET=your-strong-secret-key-here

# PostgreSQL database settings
PGUSER=postgres
PGPASSWORD=postgres
PGDATABASE=ertriage
PGHOST=postgres
PGPORT=5432
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/ertriage
```

### Step 2: Build and Start the Application

Run the following command to build and start the application with Docker Compose:

```bash
make deploy-local
```

Alternatively, you can use Docker Compose directly:

```bash
docker-compose up -d
```

### Step 3: Access the Application

Once the containers are running, you can access the application at:
http://localhost:5000

## AWS ECS Deployment

### Step 1: Configure AWS CLI

Ensure the AWS CLI is configured with appropriate credentials:

```bash
aws configure
```

### Step 2: Set Required Environment Variables

```bash
export DATABASE_URL=postgresql://username:password@your-postgres-endpoint:5432/ertriage
export SESSION_SECRET=your-strong-secret-key-here
export VPC_ID=vpc-xxxxxxxxxxxxxxxxx
export SUBNET_IDS=subnet-xxxxxxxxxxxxxxxxx,subnet-yyyyyyyyyyyyyyyyy
```

### Step 3: Deploy to ECS

Run the deployment script:

```bash
make deploy-ecs
```

The script will:
1. Create an ECR repository if it doesn't exist
2. Build and push the Docker image to ECR
3. Deploy the CloudFormation stack with all necessary resources
4. Display the URL of the deployed application

## AWS EKS Deployment

### Step 1: Configure AWS CLI and kubectl

Ensure both AWS CLI and kubectl are configured properly:

```bash
aws configure
aws eks update-kubeconfig --name your-cluster-name --region your-region
```

### Step 2: Set Required Environment Variables

```bash
export DATABASE_URL=postgresql://username:password@your-postgres-endpoint:5432/ertriage
export SESSION_SECRET=your-strong-secret-key-here
```

### Step 3: Deploy to EKS

Run the deployment script:

```bash
make deploy-eks
```

The script will:
1. Create an ECR repository if it doesn't exist
2. Build and push the Docker image to ECR
3. Apply Kubernetes manifests for deployment, service, ingress, etc.
4. Display the ingress URL when available

## Customizing Deployments

### Docker Customization

To customize the Docker build, modify the `Dockerfile` in the project root directory.

### ECS Customization

To customize the ECS deployment:
1. Edit `aws/cloudformation.yaml` to modify infrastructure resources
2. Edit `aws/task-definition.json` to modify container settings
3. Edit `aws/service-definition.json` to modify service settings

### Kubernetes Customization

To customize the Kubernetes deployment:
1. Edit files in the `k8s/` directory to modify Kubernetes resources
2. Apply changes with `kubectl apply -f k8s/`

## Monitoring and Maintenance

### Health Checks

The application exposes a health check endpoint at `/api/health` which returns a 200 OK response when the application is healthy.

### Scaling

For Kubernetes deployments, the Horizontal Pod Autoscaler (HPA) will automatically scale the application based on CPU and memory usage.

For ECS deployments, the service can be manually scaled by modifying the `desiredCount` parameter in the CloudFormation stack.

### Logs

- **Docker Compose**: View logs with `docker-compose logs -f`
- **ECS**: View logs in the CloudWatch console
- **Kubernetes**: View logs with `kubectl logs -f deployment/ertriage-app -n ertriage`

### Database Management

The application connects to a PostgreSQL database using the `DATABASE_URL` environment variable. Ensure your database is properly backed up and maintained.

### Security Considerations

1. Store sensitive environment variables (like `SESSION_SECRET` and `DATABASE_URL`) in a secure location.
2. For production deployments, consider using AWS Secrets Manager or Kubernetes Secrets for managing sensitive data.
3. Enable HTTPS for all production deployments.
4. Regularly update dependencies and Docker base images to address security vulnerabilities.