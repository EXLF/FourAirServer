# FourAir Server 安全配置指南

## 域名配置（推荐）

为了提高安全性，强烈建议使用域名替代直接暴露服务器IP地址。

### 1. 购买域名方案

购买域名并配置DNS A记录指向服务器IP：

```bash
# 在 .env 文件中配置：
DOMAIN_URL=https://api.fourair.com
# 或
RESET_PASSWORD_BASE_URL=https://reset.fourair.com
```

**优势：**
- 完全隐藏真实IP
- 支持HTTPS加密
- 专业形象
- 灵活切换服务器

### 2. 免费二级域名方案

使用免费的动态DNS服务：

#### No-IP (推荐)
1. 注册 https://www.noip.com/
2. 创建免费域名：`yourname.ddns.net`
3. 配置环境变量：
```bash
DOMAIN_URL=https://fourair.ddns.net
```

#### DuckDNS
1. 注册 https://www.duckdns.org/
2. 创建域名：`yourname.duckdns.org`
3. 配置环境变量：
```bash
DOMAIN_URL=https://fourair.duckdns.org
```

### 3. CDN代理方案

#### Cloudflare (推荐)
1. 注册 Cloudflare 账号
2. 添加域名或使用 Cloudflare Workers
3. 配置代理规则隐藏源服务器IP

#### 阿里云CDN
1. 购买CDN服务
2. 配置源站为服务器IP
3. 使用CDN域名访问

### 4. 反向代理方案

在服务器上配置Nginx反向代理：

```nginx
# /etc/nginx/sites-available/fourair
server {
    listen 80;
    server_name api.fourair.com;
    
    # 重定向到HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.fourair.com;
    
    # SSL配置
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # 安全头部
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 环境变量配置

创建 `.env` 文件并配置：

```bash
# 域名配置（选择其一）
DOMAIN_URL=https://api.fourair.com
# 或者重置密码专用域名
RESET_PASSWORD_BASE_URL=https://reset.fourair.com

# 其他安全配置
JWT_SECRET=your_super_secret_key_here
EMAIL_USER=your_email@qq.com
EMAIL_PASS=your_auth_code
```

## 其他安全建议

### 1. 使用HTTPS
- 购买SSL证书或使用Let's Encrypt免费证书
- 强制所有HTTP请求重定向到HTTPS

### 2. 防火墙配置
```bash
# 只开放必要端口
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw deny 3001   # 隐藏应用端口
```

### 3. IP白名单
对敏感操作启用IP白名单限制。

### 4. 速率限制
对重置密码等敏感接口添加速率限制。

### 5. 监控和日志
- 启用访问日志监控
- 设置异常访问告警

## 快速实施步骤

1. **立即可做：**
   ```bash
   # 注册免费二级域名（5分钟）
   # 修改环境变量配置
   DOMAIN_URL=https://yourname.ddns.net
   ```

2. **中期规划：**
   - 购买正式域名
   - 配置CDN加速

3. **长期优化：**
   - 完整的HTTPS部署
   - 安全监控体系 