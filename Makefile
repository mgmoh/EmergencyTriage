.PHONY: build run deploy-local deploy-ecs deploy-eks help

# Application name
APP_NAME = ertriage-app

# Default AWS region
AWS_REGION ?= us-east-1

help:
	@echo "ER Triage Application Deployment Helper"
	@echo ""
	@echo "Usage:"
	@echo "  make build           - Build Docker image"
	@echo "  make run             - Run application locally with Docker Compose"
	@echo "  make deploy-local    - Deploy application locally with Docker Compose"
	@echo "  make deploy-ecs      - Deploy application to AWS ECS"
	@echo "  make deploy-eks      - Deploy application to AWS EKS"
	@echo ""
	@echo "Environment Variables:"
	@echo "  AWS_REGION           - AWS region (default: us-east-1)"
	@echo "  DATABASE_URL         - PostgreSQL connection string"
	@echo "  SESSION_SECRET       - Secret for session encryption"
	@echo ""

# Build Docker image
build:
	@echo "Building Docker image..."
	docker build -t $(APP_NAME):latest .

# Run local development environment
run:
	@echo "Starting application with Docker Compose..."
	docker-compose up

# Deploy locally with Docker Compose
deploy-local:
	@echo "Deploying application locally with Docker Compose..."
	docker-compose up -d

# Deploy to AWS ECS
deploy-ecs:
	@echo "Deploying application to AWS ECS..."
	@if [ -z "$(DATABASE_URL)" ]; then \
		echo "Error: DATABASE_URL environment variable is not set."; \
		exit 1; \
	fi
	cd aws && ./deploy.sh

# Deploy to AWS EKS
deploy-eks:
	@echo "Deploying application to AWS EKS..."
	@if [ -z "$(DATABASE_URL)" ]; then \
		echo "Error: DATABASE_URL environment variable is not set."; \
		exit 1; \
	fi
	cd k8s && ./deploy-k8s.sh