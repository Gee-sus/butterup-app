Write-Host "ButterUp Mobile Quick Start"
Write-Host "=========================="

try {
  $nodeVersion = (node -v)
  Write-Host "Node.js found: $nodeVersion"
} catch {
  Write-Host "Node.js not found. Please install Node 20 LTS."
  exit 1
}

function Resolve-Adb {
  $cmd = Get-Command adb -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }

  $candidates = @()
  if ($env:ANDROID_SDK_ROOT) { $candidates += (Join-Path $env:ANDROID_SDK_ROOT 'platform-tools\adb.exe') }
  if ($env:ANDROID_HOME)     { $candidates += (Join-Path $env:ANDROID_HOME     'platform-tools\adb.exe') }
  $candidates += (Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe')
  $candidates += 'C:\Android\platform-tools\adb.exe'
  $candidates += 'C:\Program Files (x86)\Android\android-sdk\platform-tools\adb.exe'

  foreach ($p in $candidates) { if (Test-Path $p) { return $p } }
  throw 'ADB not found. Install Android SDK Platform-Tools or add adb to PATH.'
}

function Ensure-AdbReverse {
  $ADB = Resolve-Adb
  Write-Host "Using ADB at: $ADB"
  & $ADB start-server | Out-Null
  & $ADB reverse tcp:8081 tcp:8081 | Out-Null
  & $ADB reverse tcp:8082 tcp:8082 | Out-Null
  & $ADB reverse tcp:19000 tcp:19000 | Out-Null
  & $ADB reverse tcp:8000 tcp:8000 | Out-Null   # <-- Django backend
}

Write-Host ""
Write-Host "Choose testing method:"
Write-Host "1. Expo Go (use your phone)"
Write-Host "2. Android Emulator (recommended)"
Write-Host "3. Web Browser"
$choice = Read-Host "Enter choice (1-3)"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$appDir = Join-Path $repoRoot "ButterUpMobile"
Set-Location $appDir

switch ($choice) {
  "1" {
    Ensure-AdbReverse
    npm run android:local
  }
  "2" {
    Write-Host "Starting Android emulator..."
    Ensure-AdbReverse
    npm run android:local
  }
  "3" {
    npm run web:clear
  }
  Default {
    Write-Host "Invalid choice. Exiting."
    exit 1
  }
}