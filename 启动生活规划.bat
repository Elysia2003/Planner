@echo off
chcp 65001 >nul
title 生活规划工具
cd /d "%~dp0"

echo.
echo   正在启动生活规划工具...
echo   启动后会自动打开浏览器，如未自动打开请访问 http://127.0.0.1:4173
echo   关闭本窗口即停止运行。
echo.

start "" http://127.0.0.1:4173

call "C:\Users\user\.workbuddy\binaries\node\versions\22.22.2-6\npm.cmd" run preview -- --host 127.0.0.1 --port 4173

pause
