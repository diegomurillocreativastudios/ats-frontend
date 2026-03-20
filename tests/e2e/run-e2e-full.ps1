# run-e2e-full.ps1
# This script ensures a clean database, starts the backend and frontend,
# runs Playwright E2E tests, and cleans up everything.

$ErrorActionPreference = "Stop"

# Establish Absolute Paths
$ScriptDir = $PSScriptRoot
$FrontendRoot = Join-Path $ScriptDir "../../"
# Normalize to absolute path
$FrontendRoot = (Resolve-Path $FrontendRoot).Path
$EngineRoot = Join-Path $FrontendRoot "../engine/engine"
$EngineRoot = (Resolve-Path $EngineRoot).Path
$InfraProject = Join-Path $FrontendRoot "../engine/MatchEngine.Infrastructure"
$InfraProject = (Resolve-Path $InfraProject).Path

Write-Host "--- 1. Cleaning Database (MatchEngine_E2E) ---" -ForegroundColor Cyan
Set-Location $EngineRoot

# Set environment for EF Core
$env:ASPNETCORE_ENVIRONMENT = "Testing"

Write-Host "Dropping database..."
dotnet ef database drop --force --context AppDbContext --project $InfraProject --startup-project "."
Write-Host "Updating database..."
dotnet ef database update --context AppDbContext --project $InfraProject --startup-project "."
Write-Host "Database reset complete." -ForegroundColor Green

Write-Host "--- 2. Starting Backend (API) ---" -ForegroundColor Cyan
# Start dotnet in the background
$BackendProc = Start-Process dotnet -ArgumentList "run --environment Testing" -PassThru -NoNewWindow

Write-Host "--- 3. Starting Frontend (Next.js) ---" -ForegroundColor Cyan
Set-Location $FrontendRoot
# On Windows, npm is a .cmd/.ps1 file, so we must run it via cmd
$FrontendProc = Start-Process cmd -ArgumentList "/c npm run dev" -PassThru -NoNewWindow

Write-Host "--- 4. Waiting for services to be ready... ---" -ForegroundColor Cyan
$WaitCount = 0
$BackendReady = $false
$FrontendReady = $false

while ($WaitCount -lt 60 -and (-not $BackendReady -or -not $FrontendReady)) {
    if (-not $BackendReady) {
        try {
            # Check backend port 5207
            $connection = Test-NetConnection -ComputerName localhost -Port 5207 -InformationLevel Quiet
            if ($connection) { 
                $BackendReady = $true 
                Write-Host "Backend is ready!" -ForegroundColor Green
            }
        }
        catch { }
    }
    
    if (-not $FrontendReady) {
        try {
            # Check frontend port 3000
            $Response = Invoke-WebRequest -Uri "http://localhost:3000" -Method Head -ErrorAction SilentlyContinue
            if ($Response.StatusCode -eq 200) { 
                $FrontendReady = $true 
                Write-Host "Frontend is ready!" -ForegroundColor Green
            }
        }
        catch { }
    }
    
    if (-not $BackendReady -or -not $FrontendReady) {
        Start-Sleep -Seconds 2
        $WaitCount += 2
    }
}

if (-not $BackendReady -or -not $FrontendReady) {
    Write-Host "Error: Services did not start in time." -ForegroundColor Red
    # Cleanup will happen in the finally block
    throw "Timeout waiting for services"
}

Write-Host "--- 5. Running Playwright E2E Tests ---" -ForegroundColor Cyan
try {
    # Run playwright tests
    npx playwright test
}
finally {
    Write-Host "--- 6. Cleaning up processes ---" -ForegroundColor Yellow
    if ($BackendProc) { Stop-Process -Id $BackendProc.Id -Force -ErrorAction SilentlyContinue }
    if ($FrontendProc) { Stop-Process -Id $FrontendProc.Id -Force -ErrorAction SilentlyContinue }
    Write-Host "Shutdown complete." -ForegroundColor Green
}
