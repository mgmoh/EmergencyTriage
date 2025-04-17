#!/bin/bash
set -e

# Configuration
AWS_REGION=${AWS_REGION:-"us-east-1"}
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)
ECR_REPOSITORY="ertriage-app"
IMAGE_TAG=${IMAGE_TAG:-"latest"}
K8S_NAMESPACE="ertriage"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check for required tools
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed. Please install it first.${NC}"
    exit 1
fi

if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}Error: kubectl is not installed. Please install it first.${NC}"
    exit 1
fi

# Check for required environment variables
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL environment variable is not set.${NC}"
    exit 1
fi

if [ -z "$SESSION_SECRET" ]; then
    echo -e "${YELLOW}Warning: SESSION_SECRET environment variable is not set, using default value.${NC}"
    SESSION_SECRET="change-me-in-production"
fi

# Create ECR repository if it doesn't exist
echo -e "${YELLOW}Checking if ECR repository exists...${NC}"
if ! aws ecr describe-repositories --repository-names ${ECR_REPOSITORY} --region ${AWS_REGION} &> /dev/null; then
    echo -e "${YELLOW}Creating ECR repository...${NC}"
    aws ecr create-repository --repository-name ${ECR_REPOSITORY} --region ${AWS_REGION}
fi

# Login to ECR
echo -e "${YELLOW}Logging in to Amazon ECR...${NC}"
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Build Docker image
echo -e "${YELLOW}Building Docker image...${NC}"
docker build -t ${ECR_REPOSITORY}:${IMAGE_TAG} ..

# Tag the image for ECR
echo -e "${YELLOW}Tagging Docker image...${NC}"
docker tag ${ECR_REPOSITORY}:${IMAGE_TAG} ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}:${IMAGE_TAG}

# Push the image to ECR
echo -e "${YELLOW}Pushing image to Amazon ECR...${NC}"
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}:${IMAGE_TAG}

# Prepare Kubernetes manifests
echo -e "${YELLOW}Preparing Kubernetes manifests...${NC}"

# Replace AWS_ACCOUNT_ID and AWS_REGION in deployment.yaml
sed -i "s/\${AWS_ACCOUNT_ID}/$AWS_ACCOUNT_ID/g" deployment.yaml
sed -i "s/\${AWS_REGION}/$AWS_REGION/g" deployment.yaml

# Replace values in secrets.yaml
DATABASE_URL_B64=$(echo -n "$DATABASE_URL" | base64)
SESSION_SECRET_B64=$(echo -n "$SESSION_SECRET" | base64)
sed -i "s/cG9zdGdyZXNxbDovL3VzZXJuYW1lOnBhc3N3b3JkQGhvc3Q6NTQzMi9lcnRyaWFnZQ==/$DATABASE_URL_B64/g" secrets.yaml
sed -i "s/Y2hhbmdlLW1lLWluLXByb2R1Y3Rpb24=/$SESSION_SECRET_B64/g" secrets.yaml

# Create namespace if it doesn't exist
echo -e "${YELLOW}Creating Kubernetes namespace if it doesn't exist...${NC}"
kubectl apply -f namespace.yaml

# Apply Kubernetes manifests
echo -e "${YELLOW}Applying Kubernetes manifests...${NC}"
kubectl apply -f secrets.yaml
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl apply -f ingress.yaml

# Wait for deployment
echo -e "${YELLOW}Waiting for deployment to rollout...${NC}"
kubectl rollout status deployment/ertriage-app -n ${K8S_NAMESPACE}

# Get the external endpoint
echo -e "${YELLOW}Getting service endpoint...${NC}"
# Note: This assumes an ALB ingress controller is set up
# It might take a while for the ingress to be provisioned
echo -e "${YELLOW}Waiting for ingress to be provisioned (this may take several minutes)...${NC}"
sleep 30

# Try to get address for up to 5 minutes
for i in {1..30}
do
  ADDRESS=$(kubectl get ingress ertriage-app -n ${K8S_NAMESPACE} -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "")
  if [ -n "$ADDRESS" ]; then
    break
  fi
  echo -e "${YELLOW}Waiting for ingress address to be available... ($i/30)${NC}"
  sleep 10
done

if [ -n "$ADDRESS" ]; then
  echo -e "${GREEN}Deployment completed successfully!${NC}"
  echo -e "${GREEN}Your application is available at: http://${ADDRESS}${NC}"
  echo -e "${YELLOW}NOTE: It may take a few more minutes for DNS to propagate.${NC}"
else
  echo -e "${YELLOW}Could not get the ingress address yet. Check status with:${NC}"
  echo -e "kubectl get ingress ertriage-app -n ${K8S_NAMESPACE}"
fi