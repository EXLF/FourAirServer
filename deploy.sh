#!/bin/bash

# FourAir Server 安全部署脚本
# 用于自动拉取最新代码并重启服务，同时保护生产数据

echo "开始安全部署 FourAir Server..."

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "错误: 请在服务端根目录运行此脚本"
    exit 1
fi

# 创建备份目录
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
echo "创建备份目录: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# 备份关键数据
echo "备份生产数据..."
if [ -d "database" ]; then
    cp -r database "$BACKUP_DIR/"
    echo "✓ 数据库已备份"
fi

if [ -d "data" ]; then
    cp -r data "$BACKUP_DIR/"
    echo "✓ 数据文件已备份"
fi

if [ -d "available_scripts" ]; then
    cp -r available_scripts "$BACKUP_DIR/"
    echo "✓ 脚本数据已备份"
fi

if [ -f ".env" ]; then
    cp .env "$BACKUP_DIR/"
    echo "✓ 环境配置已备份"
fi

# 暂存本地更改（如果有的话）
echo "暂存本地更改..."
git stash push -m "Deploy backup $(date)"

# 拉取最新代码（安全方式）
echo "拉取最新代码..."
git fetch origin

# 检查是否有冲突
if ! git merge-base --is-ancestor HEAD origin/main; then
    echo "检测到本地分支落后，正在合并..."
    if ! git merge origin/main; then
        echo "❌ 合并失败，请手动解决冲突"
        echo "可以运行以下命令恢复："
        echo "git merge --abort"
        echo "git stash pop"
        exit 1
    fi
fi

# 恢复生产数据（如果备份存在）
echo "恢复生产数据..."
if [ -d "$BACKUP_DIR/database" ]; then
    rm -rf database
    cp -r "$BACKUP_DIR/database" .
    echo "✓ 数据库已恢复"
fi

if [ -d "$BACKUP_DIR/data" ]; then
    rm -rf data
    cp -r "$BACKUP_DIR/data" .
    echo "✓ 数据文件已恢复"
fi

if [ -d "$BACKUP_DIR/available_scripts" ]; then
    rm -rf available_scripts
    cp -r "$BACKUP_DIR/available_scripts" .
    echo "✓ 脚本数据已恢复"
fi

if [ -f "$BACKUP_DIR/.env" ]; then
    cp "$BACKUP_DIR/.env" .
    echo "✓ 环境配置已恢复"
fi

# 安装/更新依赖
echo "更新依赖包..."
npm install

# 重启服务 (如果使用 PM2)
if command -v pm2 &> /dev/null; then
    echo "使用 PM2 重启服务..."
    
    # 检查服务名称
    if pm2 list | grep -q "four-air-server"; then
        SERVICE_NAME="four-air-server"
    elif pm2 list | grep -q "fourair-server"; then
        SERVICE_NAME="fourair-server"
    else
        SERVICE_NAME="fourair-server"
    fi
    
    pm2 restart "$SERVICE_NAME" || pm2 start server.js --name "$SERVICE_NAME"
    echo "✓ 服务已重启: $SERVICE_NAME"
else
    echo "PM2 未安装，请手动重启服务"
    echo "可以运行: npm start"
fi

echo ""
echo "🎉 安全部署完成！"
echo "📁 备份位置: $BACKUP_DIR"
echo "📊 PM2 状态:"
pm2 list 