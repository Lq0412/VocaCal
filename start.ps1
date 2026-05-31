$ErrorActionPreference = 'SilentlyContinue'
$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  VocaCal 快速启动脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Android 设备
Write-Host "[1/4] 检查 Android 设备..." -ForegroundColor Yellow
$devices = adb devices 2>$null | Select-String -Pattern "emulator|device$" -SimpleMatch
if (-not $devices) {
    Write-Host "    [!] 未检测到 Android 设备/模拟器，请先启动" -ForegroundColor Red
    Read-Host "按回车退出"
    exit 1
}
Write-Host "    设备就绪" -ForegroundColor Green

# 杀掉残留的旧进程（避免端口冲突）
Write-Host "[2/4] 清理旧进程..." -ForegroundColor Yellow
$backendProc = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($backendProc) { Stop-Process -Id $backendProc -Force 2>$null; Write-Host "    已清理 8000 端口旧进程" }
$metroProc = Get-NetTCPConnection -LocalPort 8081 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($metroProc) { Stop-Process -Id $metroProc -Force 2>$null; Write-Host "    已清理 8081 端口旧进程" }

# 启动后端
Write-Host "[3/4] 启动后端 FastAPI (port 8000)..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "cd /d $ROOT\server && uvicorn main:app --reload --host 0.0.0.0 --port 8000" -WindowStyle Normal
Start-Sleep -Seconds 2

# 启动 Metro
Write-Host "[4/4] 启动 Metro Bundler (port 8081) + 安装 App..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "cd /d $ROOT\app && npx react-native start --port 8081" -WindowStyle Normal
Start-Sleep -Seconds 5

# 安装 App（不启动新的 Metro）
Set-Location $ROOT\app
npx react-native run-android --port 8081

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  启动完成!" -ForegroundColor Green
Write-Host "  后端:   http://localhost:8000" -ForegroundColor White
Write-Host "  Metro:  http://localhost:8081" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Green
Read-Host "按回车退出"
