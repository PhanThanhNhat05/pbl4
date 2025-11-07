@echo off
echo ========================================
echo Push Good Mock ECG Data to Firebase
echo ========================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed
    pause
    exit /b 1
)

REM Check packages
python -c "import numpy, requests" >nul 2>&1
if errorlevel 1 (
    echo Installing numpy and requests...
    pip install numpy requests
    echo.
)

echo Running script...
python push_good_mock_data.py

echo.
pause

