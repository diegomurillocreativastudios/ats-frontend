#!/bin/bash
# run-e2e-full.sh
# Linux/macOS equivalent of the E2E lifecycle script.
# This script ensures a clean database, starts the backend and frontend,
# runs Playwright E2E tests, and cleans up everything.

set -e # Exit on error

# Establish Absolute Paths
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
FRONTEND_ROOT="$( cd "$SCRIPT_DIR/../../" && pwd )"
ENGINE_ROOT="$( cd "$FRONTEND_ROOT/../engine/engine" && pwd )"
INFRA_PROJECT="$( cd "$FRONTEND_ROOT/../engine/MatchEngine.Infrastructure" && pwd )"

echo "--- 1. Cleaning Database (MatchEngine_E2E) ---"
cd "$ENGINE_ROOT"

# Set environment for EF Core
export ASPNETCORE_ENVIRONMENT="Testing"

echo "Dropping database..."
dotnet ef database drop --force --context AppDbContext --project "$INFRA_PROJECT" --startup-project "."
echo "Updating database..."
dotnet ef database update --context AppDbContext --project "$INFRA_PROJECT" --startup-project "."
echo "Database reset complete."

echo "--- 2. Starting Backend (API) ---"
dotnet run --environment Testing &
BACKEND_PID=$!

echo "--- 3. Starting Frontend (Next.js) ---"
cd "$FRONTEND_ROOT"
npm run dev &
FRONTEND_PID=$!

# Function to cleanup on exit
cleanup() {
    echo "--- 6. Cleaning up processes ---"
    kill $BACKEND_PID || true
    kill $FRONTEND_PID || true
    echo "Shutdown complete."
}
trap cleanup EXIT

echo "--- 4. Waiting for services to be ready... ---"
WAIT_COUNT=0
BACKEND_READY=0
FRONTEND_READY=0

while [ $WAIT_COUNT -lt 60 ] && ([ $BACKEND_READY -eq 0 ] || [ $FRONTEND_READY -eq 0 ]); do
    if [ $BACKEND_READY -eq 0 ]; then
        if curl -s http://localhost:5207 > /dev/null; then
            BACKEND_READY=1
            echo "Backend is ready!"
        fi
    fi
    
    if [ $FRONTEND_READY -eq 0 ]; then
        if curl -s http://localhost:3000 > /dev/null; then
            FRONTEND_READY=1
            echo "Frontend is ready!"
        fi
    fi
    
    if [ $BACKEND_READY -eq 0 ] || [ $FRONTEND_READY -eq 0 ]; then
        sleep 2
        WAIT_COUNT=$((WAIT_COUNT + 2))
    fi
done

if [ $BACKEND_READY -eq 0 ] || [ $FRONTEND_READY -eq 0 ]; then
    echo "Error: Services did not start in time."
    exit 1
fi

echo "--- 5. Running Playwright E2E Tests ---"
npx playwright test
