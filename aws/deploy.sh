#!/bin/bash
set -e

# Configuration
AWS_REGION=${AWS_REGION:-"us-east-1"}
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)
ECR_REPOSITORY="ertriage-app"
IMAGE_TAG=${IMAGE_TAG:-"latest"}
STACK_NAME="ertriage-app"
VPC_ID=${VPC_ID:-""}
SUBNET_IDS=${SUBNET_IDS:-""}

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

# Check for required environment variables
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL environment variable is not set.${NC}"
    exit 1
fi

if [ -z "$SESSION_SECRET" ]; then
    echo -e "${YELLOW}Warning: SESSION_SECRET environment variable is not set, using default value.${NC}"
    SESSION_SECRET="change-me-in-production"
fi

if [ -z "$VPC_ID" ]; then
    echo -e "${RED}Error: VPC_ID environment variable is not set or provided.${NC}"
    exit 1
fi

if [ -z "$SUBNET_IDS" ]; then
    echo -e "${RED}Error: SUBNET_IDS environment variable is not set or provided.${NC}"
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
echo -e "${YELLOW}Preparing CloudFormation template...${NC}"

# Update task definition with secret ARNs
DB_URL_SECRET_ARN=$(aws secretsmanager create-secret --name ertriage-db-url --secret-string "${DATABASE_URL}" --region ${AWS_REGION} --query ARN --output text 2>/dev/null || 
                   aws secretsmanager update-secret --secret-id ertriage-db-url --secret-string "${DATABASE_URL}" --region ${AWS_REGION} --query ARN --output text)

SESSION_SECRET_ARN=$(aws secretsmanager create-secret --name ertriage-session-secret --secret-string "${SESSION_SECRET}" --region ${AWS_REGION} --query ARN --output text 2>/dev/null || 
                    aws secretsmanager update-secret --secret-id ertriage-session-secret --secret-string "${SESSION_SECRET}" --region ${AWS_REGION} --query ARN --output text)

# Copy template files to temporary versions for substitution
cp task-definition.json task-definition-deploy.json
cp cloudformation.yaml cloudformation-deploy.yaml

# Replace placeholders in task definition
sed -i "s|\${AWS_ACCOUNT_ID}|${AWS_ACCOUNT_ID}|g" task-definition-deploy.json
sed -i "s|\${AWS_REGION}|${AWS_REGION}|g" task-definition-deploy.json
sed -i "s|\${ECR_REPOSITORY}|${ECR_REPOSITORY}|g" task-definition-deploy.json
sed -i "s|\${IMAGE_TAG}|${IMAGE_TAG}|g" task-definition-deploy.json
sed -i "s|\${DB_URL_SECRET_ARN}|${DB_URL_SECRET_ARN}|g" task-definition-deploy.json
sed -i "s|\${SESSION_SECRET_ARN}|${SESSION_SECRET_ARN}|g" task-definition-deploy.json

# Deploy CloudFormation stack
echo -e "${YELLOW}Deploying CloudFormation stack...${NC}"
aws cloudformation deploy \
  --template-file cloudformation-deploy.yaml \
  --stack-name ${STACK_NAME} \
  --parameter-overrides \
      VpcId=${VPC_ID} \
      SubnetIds=${SUBNET_IDS} \
      ContainerImage=${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}:${IMAGE_TAG} \
      DbUrlSecretArn=${DB_URL_SECRET_ARN} \
      SessionSecretArn=${SESSION_SECRET_ARN} \
  --capabilities CAPABILITY_IAM \
  --region ${AWS_REGION}

# Get the service URL
echo -e "${YELLOW}Getting service URL...${NC}"
ALB_URL=$(aws cloudformation describe-stacks --stack-name ${STACK_NAME} --region ${AWS_REGION} --query "Stacks[0].Outputs[?OutputKey=='ServiceURL'].OutputValue" --output text)

echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${GREEN}Your application is available at: ${ALB_URL}${NC}"
echo -e "${YELLOW}NOTE: It may take a few minutes for the service to be fully available.${NC}"

# Clean up temporary files
rm task-definition-deploy.json cloudformation-deploy.yaml