#!/bin/sh

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL environment variable is not set"
  exit 1
fi

# Run database migrations
echo "Running database migrations..."
npm run db:migrate

# Check if migration was successful
if [ $? -eq 0 ]; then
  echo "Database migrations completed successfully"
else
  echo "Error: Database migrations failed"
  exit 1
fi 