# FourAir Server

FourAir应用的后端服务器，提供用户认证、数据管理和API服务。

## 功能特性

- 用户认证系统（注册、登录、忘记密码）
- 安全的JWT令牌管理
- 密码重置功能
- 用户反馈系统
- 邮件服务集成
- SQLite数据库管理

## 技术栈

- **Node.js** - 运行时环境
- **Express.js** - Web框架
- **Sequelize** - ORM数据库管理
- **SQLite** - 数据库
- **JWT** - 身份验证
- **BCrypt** - 密码加密
- **Nodemailer** - 邮件服务

## 安装和运行

### 环境要求

- Node.js >= 14.0.0
- npm >= 6.0.0

### 安装依赖

```bash
npm install
```

### 配置环境

在运行之前，请确保配置正确的环境变量：

- 数据库配置
- 邮件服务配置
- JWT密钥

### 启动服务器

开发模式：
```bash
npm run dev
```

生产模式：
```bash
npm start
```

服务器将在 `http://localhost:3000` 启动。

## API接口

### 认证相关
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/forgot-password` - 忘记密码
- `POST /api/auth/reset-password` - 重置密码

### 用户管理
- `GET /api/users/profile` - 获取用户资料
- `PUT /api/users/profile` - 更新用户资料

### 反馈系统
- `POST /api/feedback` - 提交反馈
- `GET /api/feedback` - 获取反馈列表

## 数据库模型

- **User** - 用户信息
- **PasswordResetToken** - 密码重置令牌
- **Feedback** - 用户反馈
- **Tutorial** - 教程数据

## 部署

1. 克隆仓库：
```bash
git clone https://github.com/EXLF/FourAirServer.git
cd FourAirServer
```

2. 安装依赖：
```bash
npm install
```

3. 配置环境变量

4. 启动服务：
```bash
npm start
```

## 贡献

欢迎提交Issue和Pull Request来改进项目。

## 许可证

MIT License 