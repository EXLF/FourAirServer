@echo off
REM FourAir Server Windows 安全部署脚本
REM 用于自动拉取最新代码并重启服务，同时保护生产数据

echo 开始安全部署 FourAir Server...

REM 检查是否在正确的目录
if not exist package.json (
    echo 错误: 请在服务端根目录运行此脚本
    pause
    exit /b 1
)

REM 创建备份目录
for /f "tokens=1-4 delims=/ " %%a in ('date /t') do set mydate=%%c%%a%%b
for /f "tokens=1-2 delims=: " %%a in ('time /t') do set mytime=%%a%%b
set BACKUP_DIR=backups\%mydate%_%mytime%
echo 创建备份目录: %BACKUP_DIR%
if not exist backups mkdir backups
mkdir "%BACKUP_DIR%"

REM 备份关键数据
echo 备份生产数据...
if exist database (
    xcopy database "%BACKUP_DIR%\database\" /E /I /Q
    echo ✓ 数据库已备份
)

if exist data (
    xcopy data "%BACKUP_DIR%\data\" /E /I /Q
    echo ✓ 数据文件已备份
)

if exist available_scripts (
    xcopy available_scripts "%BACKUP_DIR%\available_scripts\" /E /I /Q
    echo ✓ 脚本数据已备份
)

if exist .env (
    copy .env "%BACKUP_DIR%\"
    echo ✓ 环境配置已备份
)

REM 暂存本地更改
echo 暂存本地更改...
git stash push -m "Deploy backup %date% %time%"

REM 拉取最新代码（安全方式）
echo 拉取最新代码...
git fetch origin

REM 合并代码
echo 检测并合并代码...
git merge origin/main
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 合并失败，请手动解决冲突
    echo 可以运行以下命令恢复：
    echo git merge --abort
    echo git stash pop
    pause
    exit /b 1
)

REM 恢复生产数据
echo 恢复生产数据...
if exist "%BACKUP_DIR%\database" (
    if exist database rmdir /s /q database
    xcopy "%BACKUP_DIR%\database" database\ /E /I /Q
    echo ✓ 数据库已恢复
)

if exist "%BACKUP_DIR%\data" (
    if exist data rmdir /s /q data
    xcopy "%BACKUP_DIR%\data" data\ /E /I /Q
    echo ✓ 数据文件已恢复
)

if exist "%BACKUP_DIR%\available_scripts" (
    if exist available_scripts rmdir /s /q available_scripts
    xcopy "%BACKUP_DIR%\available_scripts" available_scripts\ /E /I /Q
    echo ✓ 脚本数据已恢复
)

if exist "%BACKUP_DIR%\.env" (
    copy "%BACKUP_DIR%\.env" .
    echo ✓ 环境配置已恢复
)

REM 安装/更新依赖
echo 更新依赖包...
npm install

REM 检查 PM2 是否安装
where pm2 >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo 使用 PM2 重启服务...
    
    REM 检查服务名称
    pm2 list | findstr "four-air-server" >nul
    if %ERRORLEVEL% EQU 0 (
        set SERVICE_NAME=four-air-server
    ) else (
        set SERVICE_NAME=fourair-server
    )
    
    pm2 restart %SERVICE_NAME% || pm2 start server.js --name %SERVICE_NAME%
    echo ✓ 服务已重启: %SERVICE_NAME%
) else (
    echo PM2 未安装，请手动重启服务
    echo 可以运行: npm start
)

echo.
echo 🎉 安全部署完成！
echo 📁 备份位置: %BACKUP_DIR%
echo 📊 PM2 状态:
pm2 list
pause 