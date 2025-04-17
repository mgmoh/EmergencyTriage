#!/bin/bash
set -e

# Configuration
AWS_REGION=${AWS_REGION:-"us-east-1"}
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)
ECR_REPOSITORY="ertriage-app"
IMAGE_TAG=${IMAGE_TAG:-"latest"}
STACK_NAME="ertriage-stack"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check for AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed. Please install it first.${NC}"
    exit 1
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

# Prepare CloudFormation template
echo -e "${YELLOW}Replacing AWS_ACCOUNT_ID in CloudFormation template...${NC}"
IMAGE_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}:${IMAGE_TAG}"

# Deploy CloudFormation stack
echo -e "${YELLOW}Deploying CloudFormation stack...${NC}"
aws cloudformation deploy \
    --template-file cloudformation.yaml \
    --stack-name ${STACK_NAME} \
    --parameter-overrides \
        ImageURI=${IMAGE_URI} \
        SessionSecret=${SESSION_SECRET:-"change-me-in-production"} \
        DatabaseURL=${DATABASE_URL} \
        VpcId=${VPC_ID} \
        SubnetIds=${SUBNET_IDS} \
    --capabilities CAPABILITY_IAM \
    --region ${AWS_REGION}

# Get the load balancer URL
echo -e "${YELLOW}Getting service URL...${NC}"
SERVICE_URL=$(aws cloudformation describe-stacks --stack-name ${STACK_NAME} --query "Stacks[0].Outputs[?OutputKey=='ServiceURL'].OutputValue" --output text --region ${AWS_REGION})

echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${GREEN}Your application is available at: ${SERVICE_URL}${NC}"
echo -e "${YELLOW}NOTE: It may take a few minutes for the service to be fully available.${NC}"