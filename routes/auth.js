const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, PasswordResetToken } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const EmailService = require('../services/emailService');

const router = express.Router();

// 用户注册
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // 验证输入
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: '请填写所有必需字段'
            });
        }

        // 检查用户是否已存在
        const existingUser = await User.findOne({
            where: {
                [require('sequelize').Op.or]: [
                    { username },
                    { email }
                ]
            }
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: '用户名或邮箱已被使用'
            });
        }

        // 加密密码
        const hashedPassword = await bcrypt.hash(password, 12);

        // 创建用户
        const user = await User.create({
            username,
            email,
            password: hashedPassword
        });

        // 生成JWT token
        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '24h' }
        );

        res.status(201).json({
            success: true,
            message: '注册成功',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {
        console.error('注册错误:', error);
        res.status(500).json({
            success: false,
            message: '注册失败，请稍后重试'
        });
    }
});

// 用户登录
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: '请输入用户名和密码'
            });
        }

        // 查找用户
        const user = await User.findOne({
            where: {
                [require('sequelize').Op.or]: [
                    { username },
                    { email: username }
                ]
            }
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: '用户名或密码错误'
            });
        }

        // 验证密码
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: '用户名或密码错误'
            });
        }

        // 生成JWT token
        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: '登录成功',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                vipLevel: user.vipLevel
            }
        });

    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({
            success: false,
            message: '登录失败，请稍后重试'
        });
    }
});

// 获取用户信息
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: ['id', 'username', 'email', 'avatar', 'vipLevel', 'createdAt']
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }

        res.json({
            success: true,
            user
        });

    } catch (error) {
        console.error('获取用户信息错误:', error);
        res.status(500).json({
            success: false,
            message: '获取用户信息失败'
        });
    }
});

// 更新用户资料
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { username, avatar } = req.body;
        const user = await User.findByPk(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }

        // 如果更新用户名，检查是否已被使用
        if (username && username !== user.username) {
            const existingUser = await User.findOne({
                where: { username, id: { [require('sequelize').Op.ne]: user.id } }
            });

            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: '用户名已被使用'
                });
            }
        }

        await user.update({
            username: username || user.username,
            avatar: avatar || user.avatar
        });

        res.json({
            success: true,
            message: '资料更新成功',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                vipLevel: user.vipLevel
            }
        });

    } catch (error) {
        console.error('更新资料错误:', error);
        res.status(500).json({
            success: false,
            message: '更新资料失败'
        });
    }
});

// 修改密码
router.put('/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: '请填写当前密码和新密码'
            });
        }

        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }

        // 验证当前密码
        const isValidPassword = await bcrypt.compare(currentPassword, user.password);
        if (!isValidPassword) {
            return res.status(400).json({
                success: false,
                message: '当前密码错误'
            });
        }

        // 加密新密码
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        await user.update({ password: hashedPassword });

        res.json({
            success: true,
            message: '密码修改成功'
        });

    } catch (error) {
        console.error('修改密码错误:', error);
        res.status(500).json({
            success: false,
            message: '修改密码失败'
        });
    }
});

// 请求密码重置
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        // 验证输入
        if (!email) {
            return res.status(400).json({
                success: false,
                message: '请输入邮箱地址'
            });
        }

        // 邮箱格式验证
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: '请输入有效的邮箱地址'
            });
        }

        // 查找用户
        const user = await User.findOne({ where: { email } });
        if (!user) {
            // 为了安全起见，即使用户不存在也返回成功消息
            return res.json({
                success: true,
                message: '如果该邮箱已注册，您将收到密码重置邮件'
            });
        }

        // 检查最近的重置请求（防止频繁请求）
        const recentToken = await PasswordResetToken.findOne({
            where: {
                userId: user.id,
                createdAt: {
                    [require('sequelize').Op.gte]: new Date(Date.now() - 5 * 60 * 1000) // 5分钟内
                }
            }
        });

        if (recentToken) {
            return res.status(429).json({
                success: false,
                message: '请求过于频繁，请5分钟后再试'
            });
        }

        // 生成重置令牌
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30分钟后过期

        // 保存重置令牌
        await PasswordResetToken.create({
            userId: user.id,
            token,
            expiresAt,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        // 生成重置链接 - 支持域名配置，提高安全性
        const baseUrl = process.env.RESET_PASSWORD_BASE_URL || process.env.DOMAIN_URL || 'http://106.75.5.215:3001';
        const resetLink = `${baseUrl}/reset-password.html?token=${token}`;

        // 发送邮件
        await EmailService.sendPasswordResetEmail(email, resetLink, user.username);

        console.log(`[Auth] 密码重置邮件已发送给用户: ${user.username} (${email})`);

        res.json({
            success: true,
            message: '密码重置邮件已发送，请检查您的邮箱'
        });

    } catch (error) {
        console.error('[Auth] 忘记密码请求失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误，请稍后重试'
        });
    }
});

// 验证重置令牌
router.post('/verify-reset-token', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: '缺少重置令牌'
            });
        }

        // 查找令牌
        const resetToken = await PasswordResetToken.findOne({
            where: { token },
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'username', 'email']
            }]
        });

        if (!resetToken) {
            return res.status(400).json({
                success: false,
                message: '无效的重置链接'
            });
        }

        // 检查是否已过期
        if (new Date() > resetToken.expiresAt) {
            return res.status(400).json({
                success: false,
                message: '重置链接已过期，请重新申请'
            });
        }

        // 检查是否已使用
        if (resetToken.usedAt) {
            return res.status(400).json({
                success: false,
                message: '该重置链接已被使用'
            });
        }

        res.json({
            success: true,
            message: '令牌验证成功',
            data: {
                email: resetToken.user.email,
                username: resetToken.user.username
            }
        });

    } catch (error) {
        console.error('[Auth] 验证重置令牌失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
});

// 执行密码重置
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword, confirmPassword } = req.body;

        // 验证输入
        if (!token || !newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: '请填写所有必需字段'
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: '两次输入的密码不一致'
            });
        }

        // 密码强度验证
        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: '密码长度至少8位'
            });
        }

        // 查找令牌
        const resetToken = await PasswordResetToken.findOne({
            where: { token },
            include: [{
                model: User,
                as: 'user'
            }]
        });

        if (!resetToken) {
            return res.status(400).json({
                success: false,
                message: '无效的重置链接'
            });
        }

        // 检查是否已过期
        if (new Date() > resetToken.expiresAt) {
            return res.status(400).json({
                success: false,
                message: '重置链接已过期，请重新申请'
            });
        }

        // 检查是否已使用
        if (resetToken.usedAt) {
            return res.status(400).json({
                success: false,
                message: '该重置链接已被使用'
            });
        }

        // 加密新密码
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // 更新用户密码
        await resetToken.user.update({
            password: hashedPassword
        });

        // 标记令牌为已使用
        await resetToken.update({
            usedAt: new Date()
        });

        // 清理该用户的其他未使用的重置令牌
        await PasswordResetToken.destroy({
            where: {
                userId: resetToken.userId,
                usedAt: null,
                id: { [require('sequelize').Op.ne]: resetToken.id }
            }
        });

        console.log(`[Auth] 用户 ${resetToken.user.username} 成功重置密码`);

        res.json({
            success: true,
            message: '密码重置成功，请使用新密码登录'
        });

    } catch (error) {
        console.error('[Auth] 密码重置失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误，请稍后重试'
        });
    }
});

module.exports = router; 