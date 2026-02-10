@echo off
echo [1/3] Building Web assets (Vite)...
call npm run build
if %errorlevel% neq 0 (
    echo Error during npm run build
    pause
    exit /b %errorlevel%
)

echo [2/3] Syncing to Android platform...
call npx cap sync android
if %errorlevel% neq 0 (
    echo Error during cap sync
    pause
    exit /b %errorlevel%
)

echo [3/3] Opening Android Studio...
call npx cap open android
if %errorlevel% neq 0 (
    echo Error opening Android Studio.
    pause
    exit /b %errorlevel%
)

echo Done!
pause
