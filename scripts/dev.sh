#!/bin/bash
set -e

echo "Starting development environment..."
echo "Running migrations..."
cd apps/api
npx drizzle-kit migrate
cd ../..

echo "Starting dev servers..."
pnpm dev
