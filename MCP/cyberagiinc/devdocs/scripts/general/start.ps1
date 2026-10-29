# PowerShell script for starting DevDocs services on Windows

# Colors for output
$GREEN = "`e[32m"
$BLUE = "`e[36m"
$RED = "`e[31m"
$NC = "`e[0m" # No Color

# Store the root directory path
$ROOT_DIR = Get-Location
Write-Host "${BLUE}Project root directory: ${ROOT_DIR}${NC}"

# Function to check if a port is in use
function Test-PortInUse {
    param($port)
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    return $null -ne $connections
}

# Function to wait for a service to be ready
function Wait-ForService {
    param($port, $service)
    $maxAttempts = 30
    $attempt = 1

    Write-Host "${BLUE}Waiting for $service to start...${NC}"
    while (-not (Test-PortInUse -port $port) -and $attempt -le $maxAttempts) {
        Start-Sleep -Seconds 1
        $attempt++
    }

    if ($attempt -le $maxAttempts) {
        Write-Host "${GREEN}$service is ready!${NC}"
        return $true
    } else {
        Write-Host "${RED}$service failed to start${NC}"
        return $false
    }
}

# Kill any existing processes on our ports
if (Test-PortInUse -port 3001) {
    Write-Host "Port 3001 in use, killing process..."
    $process = Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess
    Stop-Process -Id $process.Id -Force
}

if (Test-PortInUse -port 24125) {
    Write-Host "Port 24125 in use, killing process..."
    $process = Get-Process -Id (Get-NetTCPConnection -LocalPort 24125).OwningProcess
    Stop-Process -Id $process.Id -Force
}

# Create a log directory
if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
}

# Install Python backend dependencies
Write-Host "${BLUE}Installing Python backend dependencies...${NC}"
if (Test-Path "backend\requirements.txt") {
    Set-Location "backend"
    if (-not (Test-Path "venv")) {
        python -m venv venv
    }
    & .\venv\Scripts\Activate.ps1
    python -m pip install -r requirements.txt
    Set-Location $ROOT_DIR
} else {
    Write-Host "${RED}Error: requirements.txt not found in backend directory${NC}"
    exit 1
}

# Start Next.js frontend on port 3001
Write-Host "${BLUE}Starting Next.js frontend...${NC}"
$env:PORT = 3001
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $using:ROOT_DIR
    npm run dev *> logs\frontend.log
}

# Start FastAPI backend
Write-Host "${BLUE}Starting FastAPI backend...${NC}"
$backendJob = Start-Job -ScriptBlock {
    Set-Location "$using:ROOT_DIR\backend"
    & .\venv\Scripts\Activate.ps1
    uvicorn app.main:app --host 0.0.0.0 --port 24125 --reload *> ..\logs\backend.log
}

# Activate MCP server's virtual environment and start it
Write-Host "${BLUE}Starting MCP server...${NC}"
$mcpJob = Start-Job -ScriptBlock {
    Set-Location "$using:ROOT_DIR\fast-markdown-mcp"
    & .\venv\Scripts\Activate.ps1
    $env:PYTHONPATH = "$using:ROOT_DIR\fast-markdown-mcp\src"
    python -m fast_markdown_mcp.server "$using:ROOT_DIR\storage\markdown" *> ..\logs\mcp.log
}

# Wait for services to be ready
$frontendReady = Wait-ForService -port 3001 -service "Frontend"
$backendReady = Wait-ForService -port 24125 -service "Backend"

if ($frontendReady -and $backendReady) {
    Write-Host "${GREEN}All services are running!${NC}"
    Write-Host "${BLUE}Frontend:${NC} http://localhost:3001"
    Write-Host "${BLUE}Backend:${NC} http://localhost:24125"
    Write-Host "${BLUE}Logs:${NC} ./logs/"
    Write-Host "${BLUE}Press Ctrl+C to stop all services${NC}"

    # Open the frontend in the default browser
    Start-Process "http://localhost:3001"

    try {
        # Keep the script running until Ctrl+C is pressed
        while ($true) {
            Start-Sleep -Seconds 1
            
            # Check if any job has failed
            $jobs = @($frontendJob, $backendJob, $mcpJob)
            foreach ($job in $jobs) {
                if ($job.State -eq "Failed" -or $job.State -eq "Completed") {
                    Write-Host "${RED}One or more services have stopped unexpectedly${NC}"
                    throw "Service stopped"
                }
            }
        }
    } catch {
        # Cleanup when Ctrl+C is pressed or a service fails
        Write-Host "`n${BLUE}Shutting down services...${NC}"
        Stop-Job -Job $frontendJob, $backendJob, $mcpJob
        Remove-Job -Job $frontendJob, $backendJob, $mcpJob
        Write-Host "${GREEN}All services stopped${NC}"
    }
} else {
    Write-Host "${RED}Failed to start all services${NC}"
    Stop-Job -Job $frontendJob, $backendJob, $mcpJob
    Remove-Job -Job $frontendJob, $backendJob, $mcpJob
    exit 1
}
