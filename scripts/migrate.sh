#!/bin/bash
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL is not set"
  exit 1
fi

echo "Generating migrations..."
cd apps/api
npx drizzle-kit generate

echo "Running migrations..."
npx drizzle-kit migrate

echo "Migrations complete."
