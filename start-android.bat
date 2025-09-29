@echo off
echo Starting Android Emulator for ButterUp...

REM Set Android SDK path
set ANDROID_HOME=%USERPROFILE%\AppData\Local\Android\Sdk
set PATH=%PATH%;%ANDROID_HOME%\emulator;%ANDROID_HOME%\platform-tools

REM Check if emulator exists
if not exist "%ANDROID_HOME%\emulator\emulator.exe" (
    echo Android emulator not found!
    echo Please make sure Android Studio is installed.
    pause
    exit /b 1
)

REM List available AVDs
echo.
echo Checking for available Android Virtual Devices...
"%ANDROID_HOME%\emulator\emulator.exe" -list-avds

REM Start the first available AVD
echo.
echo Starting Android emulator...
echo This may take a few minutes...
"%ANDROID_HOME%\emulator\emulator.exe" -list-avds | findstr /v "List of devices" | findstr /v "emulator" > temp_avds.txt

for /f %%i in (temp_avds.txt) do (
    echo Starting: %%i
    start "" "%ANDROID_HOME%\emulator\emulator.exe" -avd %%i
    goto :found
)

:found
del temp_avds.txt 2>nul

echo.
echo Emulator is starting! You can minimize this window.
echo.
echo Once the emulator is fully loaded, you can run your ButterUp app:
echo cd ButterUpMobile
echo npm run android
echo.
pause
