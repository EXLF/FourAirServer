#!/bin/bash

# FourAir Server 初次安全部署脚本
# 从GitHub全新部署但保护现有的生产数据

echo "🚀 FourAir Server 初次安全部署"
echo "================================"

# 检查当前目录是否有服务器文件
if [ -f "server.js" ] || [ -f "package.json" ]; then
    echo "⚠️  检测到当前目录已有服务器文件"
    echo "为了安全，将创建备份..."
    
    # 创建完整备份
    BACKUP_DIR="backup_before_deploy_$(date +%Y%m%d_%H%M%S)"
    echo "📁 创建备份目录: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
    
    # 备份所有现有文件
    echo "📦 备份现有文件..."
    cp -r * "$BACKUP_DIR/" 2>/dev/null || true
    cp -r .* "$BACKUP_DIR/" 2>/dev/null || true
    echo "✅ 备份完成"
fi

# 临时目录用于克隆新代码
TEMP_DIR="fourair_temp_$(date +%Y%m%d_%H%M%S)"
echo "📥 克隆最新代码到临时目录..."
git clone https://github.com/EXLF/FourAirServer.git "$TEMP_DIR"

if [ $? -ne 0 ]; then
    echo "❌ 克隆仓库失败"
    exit 1
fi

cd "$TEMP_DIR"

# 如果有备份，恢复重要的生产数据
if [ -n "$BACKUP_DIR" ]; then
    echo "🔄 恢复生产数据..."
    
    # 恢复数据库
    if [ -d "../$BACKUP_DIR/database" ]; then
        echo "📊 恢复数据库..."
        rm -rf database
        cp -r "../$BACKUP_DIR/database" .
        echo "✅ 数据库已恢复"
    fi
    
    # 恢复数据文件
    if [ -d "../$BACKUP_DIR/data" ]; then
        echo "📄 恢复数据文件..."
        rm -rf data
        cp -r "../$BACKUP_DIR/data" .
        echo "✅ 数据文件已恢复"
    fi
    
    # 恢复脚本数据
    if [ -d "../$BACKUP_DIR/available_scripts" ]; then
        echo "📜 恢复脚本数据..."
        rm -rf available_scripts
        cp -r "../$BACKUP_DIR/available_scripts" .
        echo "✅ 脚本数据已恢复"
    fi
    
    # 恢复环境配置
    if [ -f "../$BACKUP_DIR/.env" ]; then
        echo "⚙️  恢复环境配置..."
        cp "../$BACKUP_DIR/.env" .
        echo "✅ 环境配置已恢复"
    fi
    
    # 恢复node_modules（如果存在且较新）
    if [ -d "../$BACKUP_DIR/node_modules" ]; then
        echo "📦 检查现有依赖..."
        cp -r "../$BACKUP_DIR/node_modules" .
        echo "✅ 现有依赖已复制"
    fi
fi

# 安装依赖
echo "📦 安装/更新依赖..."
npm install

# 移动到父目录并替换文件
cd ..
echo "🔄 应用新代码..."

# 移除旧文件（除了备份）
find . -maxdepth 1 -not -name "backup_*" -not -name "fourair_temp_*" -not -name "." -not -name ".." -exec rm -rf {} + 2>/dev/null || true

# 移动新文件到当前目录
mv "$TEMP_DIR"/* .
mv "$TEMP_DIR"/.* . 2>/dev/null || true

# 清理临时目录
rm -rf "$TEMP_DIR"

# 初始化Git仓库
echo "🔧 设置Git仓库..."
git init
git remote add origin https://github.com/EXLF/FourAirServer.git
git branch -M main
git fetch origin
git reset --soft origin/main

# 检查PM2服务
echo "🔧 配置PM2服务..."
if command -v pm2 &> /dev/null; then
    # 停止可能运行的旧服务
    pm2 stop four-air-server 2>/dev/null || true
    pm2 stop fourair-server 2>/dev/null || true
    pm2 delete four-air-server 2>/dev/null || true
    pm2 delete fourair-server 2>/dev/null || true
    
    # 启动新服务
    pm2 start server.js --name four-air-server
    pm2 save
    echo "✅ PM2服务已配置"
else
    echo "⚠️  PM2未安装，请手动启动服务: npm start"
fi

echo ""
echo "🎉 初次部署完成！"
echo "================================"
if [ -n "$BACKUP_DIR" ]; then
    echo "📁 原始数据备份位置: $BACKUP_DIR"
fi
echo "🌐 GitHub仓库: https://github.com/EXLF/FourAirServer.git"
echo "📊 服务状态:"
pm2 list 2>/dev/null || echo "请运行 'npm start' 启动服务"
echo ""
echo "💡 下次更新请使用: ./deploy.sh" 