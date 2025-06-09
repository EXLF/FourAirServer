#!/bin/bash

# FourAir Server 增量更新脚本
# 只拉取有变动的代码，高效更新服务

echo "🚀 开始增量更新 FourAir Server..."

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 请在服务端根目录运行此脚本"
    exit 1
fi

# 检查是否是 Git 仓库
if [ ! -d ".git" ]; then
    echo "❌ 错误: 当前目录不是 Git 仓库"
    echo "请使用 first-deploy.sh 进行初次部署"
    exit 1
fi

# 显示当前状态
echo "📍 当前分支和提交:"
git branch --show-current
git log --oneline -1

# 检查本地是否有未提交的更改
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  检测到本地有未提交的更改"
    echo "未提交的文件:"
    git status --porcelain
    
    # 创建快速备份
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_DIR="backup_before_update_$TIMESTAMP"
    echo "创建备份: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
    
    # 备份保护重要数据
    [ -d "database" ] && cp -r database "$BACKUP_DIR/"
    [ -d "data" ] && cp -r data "$BACKUP_DIR/"
    [ -d "available_scripts" ] && cp -r available_scripts "$BACKUP_DIR/"
    [ -f ".env" ] && cp .env "$BACKUP_DIR/"
    
    echo "🔒 暂存本地更改..."
    git stash push -m "Auto stash before update $TIMESTAMP"
fi

# 获取远程更新信息
echo "🔍 检查远程更新..."
git fetch origin

# 检查是否有新的提交
CURRENT_COMMIT=$(git rev-parse HEAD)
REMOTE_COMMIT=$(git rev-parse origin/main)

if [ "$CURRENT_COMMIT" = "$REMOTE_COMMIT" ]; then
    echo "✅ 代码已是最新版本，无需更新"
    echo "当前提交: $(git log --oneline -1)"
    exit 0
fi

# 显示将要更新的内容
echo "📋 发现新的更新:"
echo "本地提交: $(git log --oneline -1 $CURRENT_COMMIT)"
echo "远程提交: $(git log --oneline -1 $REMOTE_COMMIT)"
echo ""
echo "📝 更新内容:"
git log --oneline $CURRENT_COMMIT..$REMOTE_COMMIT

# 显示文件变化
echo ""
echo "📁 变更的文件:"
git diff --name-status $CURRENT_COMMIT $REMOTE_COMMIT

# 询问是否继续
read -p "是否继续更新? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "取消更新"
    exit 0
fi

# 执行合并更新
echo "⬇️  拉取最新代码..."
if git merge origin/main; then
    echo "✅ 代码更新成功"
else
    echo "❌ 合并失败，可能存在冲突"
    echo "请手动解决冲突后运行:"
    echo "git add ."
    echo "git commit"
    echo "或者运行 git merge --abort 取消合并"
    exit 1
fi

# 恢复保护的数据（如果有备份）
if [ -d "$BACKUP_DIR" ]; then
    echo "🔄 恢复保护数据..."
    [ -d "$BACKUP_DIR/database" ] && { rm -rf database; cp -r "$BACKUP_DIR/database" .; echo "✓ 数据库已恢复"; }
    [ -d "$BACKUP_DIR/data" ] && { rm -rf data; cp -r "$BACKUP_DIR/data" .; echo "✓ 数据文件已恢复"; }
    [ -d "$BACKUP_DIR/available_scripts" ] && { rm -rf available_scripts; cp -r "$BACKUP_DIR/available_scripts" .; echo "✓ 脚本数据已恢复"; }
    [ -f "$BACKUP_DIR/.env" ] && { cp "$BACKUP_DIR/.env" .; echo "✓ 环境配置已恢复"; }
fi

# 检查是否需要更新依赖
if git diff --name-only $CURRENT_COMMIT HEAD | grep -q "package.*\.json"; then
    echo "📦 检测到依赖变化，更新依赖包..."
    npm install
    npm install sqlite3
else
    echo "📦 依赖无变化，跳过 npm install"
fi

# 重启服务
if command -v pm2 &> /dev/null; then
    echo "🔄 重启 PM2 服务..."
    
    # 智能检测服务名称
    if pm2 list | grep -q "four-air-server"; then
        SERVICE_NAME="four-air-server"
    elif pm2 list | grep -q "fourair-server"; then
        SERVICE_NAME="fourair-server"
    else
        # 尝试从 package.json 获取服务名
        SERVICE_NAME=$(node -p "require('./package.json').name" 2>/dev/null || echo "fourair-server")
    fi
    
    if pm2 restart "$SERVICE_NAME" 2>/dev/null; then
        echo "✅ 服务已重启: $SERVICE_NAME"
    else
        echo "⚠️  重启失败，尝试启动新服务..."
        pm2 start server.js --name "$SERVICE_NAME"
    fi
    
    echo "📊 PM2 服务状态:"
    pm2 list
else
    echo "⚠️  PM2 未安装，请手动重启服务: npm start"
fi

# 显示更新后的状态
echo ""
echo "🎉 增量更新完成！"
echo "📍 更新后版本: $(git log --oneline -1)"
echo "📁 备份位置: ${BACKUP_DIR:-无需备份}"

# 清理旧备份（保留最近5个）
echo "🧹 清理旧备份..."
ls -t backup_before_update_* 2>/dev/null | tail -n +6 | xargs rm -rf 2>/dev/null || true
echo "✅ 清理完成" 