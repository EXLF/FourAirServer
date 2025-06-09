# FourAir Server 安装和部署指南

## 快速安装

### 1. 克隆仓库

```bash
git clone https://github.com/EXLF/FourAirServer.git
cd FourAirServer
```

### 2. 安装依赖

```bash
npm install
```

### 3. 启动服务

开发模式：
```bash
npm run dev
```

生产模式：
```bash
npm start
```

## 安全部署选项

### 初次部署（保护现有数据）

如果服务器上已经有运行的FourAir服务和生产数据，使用初次部署脚本：

```bash
# 在服务器上的现有目录中运行
chmod +x first-deploy.sh
./first-deploy.sh
```

**初次部署脚本特点：**
- ✅ 自动备份现有的数据库、脚本数据和配置文件
- ✅ 从GitHub克隆最新代码
- ✅ 恢复生产数据到新代码中
- ✅ 自动配置Git仓库连接
- ✅ 重新配置PM2服务

### 日常更新部署

后续的代码更新使用常规部署脚本：

#### Linux/macOS 系统

```bash
chmod +x deploy.sh
./deploy.sh
```

#### Windows 系统

```batch
deploy.bat
```

**更新部署脚本特点：**
- ✅ 每次部署前自动备份数据
- ✅ 使用安全的Git合并策略（不会强制覆盖）
- ✅ 自动恢复生产数据（数据库、脚本数据、配置文件）
- ✅ 智能识别PM2服务名称

## 使用 PM2 进行生产部署

### 安装 PM2

```bash
npm install -g pm2
```

### 启动服务

```bash
pm2 start server.js --name fourair-server
```

### 设置开机启动

```bash
pm2 startup
pm2 save
```

### PM2 常用命令

- 查看状态：`pm2 status`
- 重启服务：`pm2 restart fourair-server`
- 停止服务：`pm2 stop fourair-server`
- 查看日志：`pm2 logs fourair-server`
- 监控：`pm2 monit`

## 配置环境变量

创建 `.env` 文件（可选）：

```env
# 数据库配置
DB_PATH=./database/fourair.db

# JWT 配置
JWT_SECRET=your-secret-key

# 邮件配置
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_USER=your-email@qq.com
SMTP_PASS=your-app-password
```

## 数据库初始化

服务器启动时会自动创建和同步数据库表，无需手动操作。

## 端口配置

默认端口：3000

如需修改端口，在 `server.js` 中修改：
```javascript
const PORT = process.env.PORT || 3000;
```

## 防火墙配置

确保服务器防火墙允许访问配置的端口：

```bash
# Ubuntu/Debian
sudo ufw allow 3000

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

## Nginx 反向代理配置（可选）

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 日志管理

服务器日志将输出到控制台。使用 PM2 时，日志会自动管理：

```bash
# 查看日志
pm2 logs fourair-server

# 清空日志
pm2 flush fourair-server
```

## 备份和恢复

### 备份数据库

```bash
cp database/fourair.db database/fourair_backup_$(date +%Y%m%d_%H%M%S).db
```

### 恢复数据库

```bash
cp database/fourair_backup_YYYYMMDD_HHMMSS.db database/fourair.db
```

## 故障排除

### 常见问题

1. **端口被占用**
   ```bash
   # 查找占用端口的进程
   netstat -tulpn | grep :3000
   
   # 杀死进程
   kill -9 <PID>
   ```

2. **数据库权限问题**
   ```bash
   # 确保数据库目录有写权限
   chmod 755 database/
   chmod 644 database/fourair.db
   ```

3. **依赖安装失败**
   ```bash
   # 清除缓存重新安装
   rm -rf node_modules package-lock.json
   npm install
   ```

## 监控和维护

### 定期更新

建议设置定时任务自动拉取最新代码：

```bash
# 编辑 crontab
crontab -e

# 添加定时任务（每天凌晨2点更新）
0 2 * * * cd /path/to/FourAirServer && ./deploy.sh >> deploy.log 2>&1
```

### 健康检查

可以创建简单的健康检查脚本：

```bash
#!/bin/bash
curl -f http://localhost:3000/api/health || pm2 restart fourair-server
```

## 安全建议

1. 定期更新依赖包：`npm audit fix`
2. 使用强密码和复杂的 JWT 密钥
3. 启用 HTTPS（使用 Let's Encrypt）
4. 配置适当的防火墙规则
5. 定期备份数据库
6. 监控服务器资源使用情况 