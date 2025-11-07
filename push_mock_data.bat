@echo off
echo ========================================
echo Push Mock ECG Data to Firebase
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    pause
    exit /b 1
)

REM Check if required packages are installed
python -c "import numpy, requests" >nul 2>&1
if errorlevel 1 (
    echo Installing required packages...
    pip install numpy requests
    echo.
)

echo Running mock data generator...
python generate_mock_ecg.py

pause

