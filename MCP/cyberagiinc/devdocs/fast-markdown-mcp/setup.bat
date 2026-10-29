@echo off
setlocal enabledelayedexpansion

echo [36mSetting up Fast Markdown MCP Server and DevDocs dependencies...[0m

:: Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [31mnpm is not installed. Please install Node.js and npm first.[0m
    exit /b 1
)

:: Check if python is installed
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [31mpython is not installed. Please install Python 3 first.[0m
    exit /b 1
)

:: Store the root directory path
set "ROOT_DIR=%~dp0.."
echo [36mProject root directory: %ROOT_DIR%[0m

:: Go to project root directory (DevDocs)
cd "%ROOT_DIR%"

:: Check if package.json exists
if not exist "package.json" (
    echo [31mError: package.json not found in %ROOT_DIR%[0m
    exit /b 1
)

:: Install npm dependencies
echo [36mInstalling npm dependencies...[0m
call npm install

:: Check if backend directory exists
if not exist "backend" (
    echo [31mError: backend directory not found in %ROOT_DIR%[0m
    exit /b 1
)

:: Install Python backend dependencies
echo [36mInstalling Python backend dependencies...[0m
if exist "backend\requirements.txt" (
    cd backend
    python -m pip install -r requirements.txt
    cd "%ROOT_DIR%"
) else (
    echo [31mError: requirements.txt not found in backend directory[0m
    exit /b 1
)

:: Create virtual environment for MCP server if it doesn't exist
cd "fast-markdown-mcp"
if not exist "venv" (
    echo [36mCreating virtual environment for MCP server...[0m
    python -m venv venv
)

:: Activate virtual environment and install MCP server dependencies
echo [36mInstalling MCP server dependencies...[0m
call venv\Scripts\activate.bat
python -m pip install -e .

:: Create markdown storage directory if it doesn't exist
set "STORAGE_DIR=%ROOT_DIR%\storage\markdown"
if not exist "%STORAGE_DIR%" (
    echo [36mCreating markdown storage directory...[0m
    mkdir "%STORAGE_DIR%"
)

:: Get the absolute path of the storage directory
set "STORAGE_PATH=%STORAGE_DIR%"

:: Create or update Claude Desktop config
set "CONFIG_DIR=%APPDATA%\Claude"
set "CONFIG_FILE=%CONFIG_DIR%\claude_desktop_config.json"

if not exist "%CONFIG_DIR%" mkdir "%CONFIG_DIR%"

:: Backup existing config
if exist "%CONFIG_FILE%" copy "%CONFIG_FILE%" "%CONFIG_FILE%.backup"

:: Get absolute path to the Python executable in the virtual environment
set "VENV_PYTHON=%cd%\venv\Scripts\python.exe"
set "PYTHONPATH=%cd%\src"

:: Create new config with our server
echo {> "%CONFIG_FILE%"
echo   "mcpServers": {>> "%CONFIG_FILE%"
echo     "fast-markdown": {>> "%CONFIG_FILE%"
echo       "command": "%VENV_PYTHON:\=\\%",>> "%CONFIG_FILE%"
echo       "args": [>> "%CONFIG_FILE%"
echo         "-m", "fast_markdown_mcp.server",>> "%CONFIG_FILE%"
echo         "%STORAGE_PATH:\=\\%">> "%CONFIG_FILE%"
echo       ],>> "%CONFIG_FILE%"
echo       "env": {>> "%CONFIG_FILE%"
echo         "PYTHONPATH": "%PYTHONPATH:\=\\%">> "%CONFIG_FILE%"
echo       }>> "%CONFIG_FILE%"
echo     }>> "%CONFIG_FILE%"
echo   }>> "%CONFIG_FILE%"
echo }>> "%CONFIG_FILE%"

cd "%ROOT_DIR%"

echo [32mSetup complete![0m
echo [36mInstalled:[0m
echo - npm dependencies
echo - Python backend dependencies
echo - MCP server dependencies
echo [36mConfigured:[0m
echo - Markdown storage directory: %STORAGE_PATH%
echo - Claude Desktop config: %CONFIG_FILE%
echo [36mNext steps:[0m
echo 1. Start all services with: [32mstart.bat[0m
echo 2. Restart Claude Desktop
echo [32mYour DevDocs environment is ready![0m
echo [36mThe start script will:[0m
echo - Start the Next.js frontend (http://localhost:3001)
echo - Start the FastAPI backend (http://localhost:24125)
echo - Start the MCP server
echo - Open the application in your default browser
echo - Log all output to the ./logs directory
echo [36mTo stop all services, press Ctrl+C[0m

endlocal
