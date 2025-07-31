@echo off
echo ========================================
echo    ADB Device Manager - Starting...
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8 or higher from https://python.org
    pause
    exit /b 1
)

REM Check if ADB is installed
adb version >nul 2>&1
if errorlevel 1 (
    echo WARNING: ADB is not installed or not in PATH
    echo Please install Android SDK Platform Tools
    echo Download from: https://developer.android.com/studio/releases/platform-tools
    echo.
    echo The application will start but device detection will not work.
    echo.
    pause
)

REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment
        pause
        exit /b 1
    )
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo ERROR: Failed to activate virtual environment
    pause
    exit /b 1
)

REM Install/update dependencies
echo Installing dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

REM Start the Flask application
echo.
echo ========================================
echo    Starting ADB Device Manager...
echo ========================================
echo.
echo The application will be available at:
echo http://localhost:5000
echo.
echo Press Ctrl+C to stop the application
echo.

python src/main.py

REM Keep window open if there's an error
if errorlevel 1 (
    echo.
    echo ERROR: Application failed to start
    pause
)

