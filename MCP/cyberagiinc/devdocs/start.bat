@echo off
setlocal enabledelayedexpansion

:: Colors for output (Windows doesn't support ANSI colors in cmd by default, but we'll keep them for PowerShell compatibility)
set "GREEN=[32m"
set "BLUE=[36m"
set "RED=[31m"
set "NC=[0m"

:: Store the root directory path
set "ROOT_DIR=%cd%"
echo %BLUE%Project root directory: %ROOT_DIR%%NC%

:: Function to check if a port is in use
call :check_port 3001
if %ERRORLEVEL% equ 0 (
    echo Port 3001 in use, killing process...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do (
        taskkill /F /PID %%a >nul 2>&1
    )
)

call :check_port 24125
if %ERRORLEVEL% equ 0 (
    echo Port 24125 in use, killing process...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :24125 ^| findstr LISTENING') do (
        taskkill /F /PID %%a >nul 2>&1
    )
)

:: Create a log directory
if not exist "logs" mkdir logs

:: Install Python backend dependencies
echo %BLUE%Installing Python backend dependencies...%NC%
if exist "backend\requirements.txt" (
    cd "backend"
    if not exist "venv" (
        python -m venv venv
    )
    call venv\Scripts\activate.bat
    python -m pip install -r requirements.txt
    cd "%ROOT_DIR%"
) else (
    echo %RED%Error: requirements.txt not found in backend directory%NC%
    exit /b 1
)

:: Start Next.js frontend on port 3001
echo %BLUE%Starting Next.js frontend...%NC%
start /B cmd /c "set PORT=3001 && npm run dev > logs\frontend.log 2>&1"
set FRONTEND_PID=!ERRORLEVEL!

:: Start FastAPI backend
echo %BLUE%Starting FastAPI backend...%NC%
cd backend
call venv\Scripts\activate.bat
start /B cmd /c "uvicorn app.main:app --host 0.0.0.0 --port 24125 --reload > ..\logs\backend.log 2>&1"
set BACKEND_PID=!ERRORLEVEL!
cd "%ROOT_DIR%"

:: Activate MCP server's virtual environment and start it
echo %BLUE%Starting MCP server...%NC%
cd fast-markdown-mcp
call venv\Scripts\activate.bat
set "PYTHONPATH=%ROOT_DIR%\fast-markdown-mcp\src"
start /B cmd /c "python -m fast_markdown_mcp.server %ROOT_DIR%\storage\markdown > ..\logs\mcp.log 2>&1"
set MCP_PID=!ERRORLEVEL!
cd "%ROOT_DIR%"

:: Wait for services to be ready
echo %BLUE%Waiting for services to start...%NC%
:: Wait for frontend
call :wait_for_service 3001 "Frontend"
set FRONTEND_READY=%ERRORLEVEL%

:: Wait for backend
call :wait_for_service 24125 "Backend"
set BACKEND_READY=%ERRORLEVEL%

if %FRONTEND_READY% equ 0 if %BACKEND_READY% equ 0 (
    echo %GREEN%All services are running!%NC%
    echo %BLUE%Frontend:%NC% http://localhost:3001
    echo %BLUE%Backend:%NC% http://localhost:24125
    echo %BLUE%Logs:%NC% .\logs\
    echo %BLUE%Press Ctrl+C to stop all services%NC%

    :: Open the frontend in the default browser
    start "" http://localhost:3001

    :: Keep the script running
    echo %BLUE%Press any key to stop all services...%NC%
    pause > nul

    :: Cleanup when user presses a key
    echo %BLUE%Shutting down services...%NC%
    for /f "tokens=2" %%a in ('tasklist /fi "windowtitle eq npm run dev" /fo list ^| findstr "PID:"') do (
        taskkill /F /PID %%a >nul 2>&1
    )
    for /f "tokens=2" %%a in ('tasklist /fi "windowtitle eq uvicorn" /fo list ^| findstr "PID:"') do (
        taskkill /F /PID %%a >nul 2>&1
    )
    for /f "tokens=2" %%a in ('tasklist /fi "windowtitle eq python" /fo list ^| findstr "PID:"') do (
        taskkill /F /PID %%a >nul 2>&1
    )
    echo %GREEN%All services stopped%NC%
) else (
    echo %RED%Failed to start all services%NC%
    exit /b 1
)

goto :eof

:: Function to check if a port is in use
:check_port
netstat -ano | findstr :%1 | findstr LISTENING >nul
if %ERRORLEVEL% equ 0 (
    exit /b 0
) else (
    exit /b 1
)

:: Function to wait for a service to be ready
:wait_for_service
set port=%1
set service=%2
set max_attempts=30
set attempt=1

echo %BLUE%Waiting for %service% to start...%NC%
:wait_loop
call :check_port %port%
if %ERRORLEVEL% equ 0 (
    echo %GREEN%%service% is ready!%NC%
    exit /b 0
) else (
    if %attempt% geq %max_attempts% (
        echo %RED%%service% failed to start%NC%
        exit /b 1
    )
    timeout /t 1 /nobreak >nul
    set /a attempt+=1
    goto wait_loop
)
