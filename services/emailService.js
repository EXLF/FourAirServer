const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        // 邮件配置 - 可通过环境变量或这里直接配置
        const emailUser = process.env.EMAIL_USER || '2760869618@qq.com';
        const emailPass = process.env.EMAIL_PASS || 'copwqslajxundhag'; // QQ邮箱授权码
        
        // 创建邮件传输器
        const emailConfig = this.getEmailConfig(emailUser);
        this.transporter = nodemailer.createTransport({
            ...emailConfig,
            auth: {
                user: emailUser,
                pass: emailPass
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        console.log('[EmailService] 邮件服务初始化完成');
        console.log(`[EmailService] 使用邮箱: ${emailUser}`);
        console.log(`[EmailService] SMTP服务器: ${emailConfig.host}:${emailConfig.port}`);
    }

    /**
     * 根据邮箱地址自动选择SMTP配置
     * @param {string} email - 邮箱地址
     */
    getEmailConfig(email) {
        const domain = email.split('@')[1].toLowerCase();
        
        const configs = {
            // QQ邮箱
            'qq.com': {
                host: 'smtp.qq.com',
                port: 465,
                secure: true
            },
            // Gmail
            'gmail.com': {
                host: 'smtp.gmail.com',
                port: 587,
                secure: false
            },
            // 163邮箱
            '163.com': {
                host: 'smtp.163.com',
                port: 587,
                secure: false
            },
            // 126邮箱
            '126.com': {
                host: 'smtp.126.com',
                port: 587,
                secure: false
            },
            // Outlook/Hotmail
            'outlook.com': {
                host: 'smtp-mail.outlook.com',
                port: 587,
                secure: false
            },
            'hotmail.com': {
                host: 'smtp-mail.outlook.com',
                port: 587,
                secure: false
            }
        };

        return configs[domain] || {
            // 默认使用Gmail配置
            host: 'smtp.gmail.com',
            port: 587,
            secure: false
        };
    }

    /**
     * 发送密码重置邮件
     * @param {string} email - 收件人邮箱
     * @param {string} resetLink - 重置链接
     * @param {string} username - 用户名
     */
    async sendPasswordResetEmail(email, resetLink, username = '用户') {
        try {
            const mailOptions = {
                from: '"FourAir 撸毛工具箱" <2760869618@qq.com>',
                to: email,
                subject: '重置您的FourAir账户密码',
                html: this.generatePasswordResetTemplate(resetLink, username)
            };

            console.log(`[EmailService] 准备发送密码重置邮件到: ${email}`);
            
            // 尝试发送邮件，如果失败则使用控制台模拟
            try {
                const result = await this.transporter.sendMail(mailOptions);
                console.log(`[EmailService] 邮件发送成功: ${result.messageId}`);
                
                return {
                    success: true,
                    messageId: result.messageId
                };
            } catch (smtpError) {
                console.warn('[EmailService] SMTP发送失败，使用控制台模拟模式');
                console.log('\n' + '='.repeat(80));
                console.log('📧 模拟邮件发送 (开发测试模式)');
                console.log('='.repeat(80));
                console.log(`收件人: ${email}`);
                console.log(`主题: ${mailOptions.subject}`);
                console.log(`重置链接: ${resetLink}`);
                console.log('');
                console.log('📝 邮件内容预览:');
                console.log(`亲爱的 ${username}，`);
                console.log('我们收到了您重置FourAir账户密码的请求。');
                console.log(`请点击以下链接重置密码：${resetLink}`);
                console.log('此链接将在30分钟后失效。');
                console.log('='.repeat(80));
                
                return {
                    success: true,
                    messageId: 'simulated-' + Date.now(),
                    simulated: true
                };
            }
        } catch (error) {
            console.error('[EmailService] 发送邮件失败:', error);
            throw new Error(`发送邮件失败: ${error.message}`);
        }
    }

    /**
     * 生成密码重置邮件模板
     * @param {string} resetLink - 重置链接
     * @param {string} username - 用户名
     */
    generatePasswordResetTemplate(resetLink, username) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>重置密码 - FourAir</title>
            <style>
                body {
                    font-family: 'Helvetica Neue', Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f5f5f5;
                }
                .email-container {
                    background: white;
                    border-radius: 10px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    overflow: hidden;
                }
                .header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    text-align: center;
                    padding: 30px 20px;
                }
                .header h1 {
                    margin: 0;
                    font-size: 24px;
                    font-weight: 600;
                }
                .content {
                    padding: 30px 20px;
                }
                .greeting {
                    font-size: 18px;
                    color: #333;
                    margin-bottom: 20px;
                }
                .message {
                    color: #666;
                    line-height: 1.8;
                    margin-bottom: 30px;
                }
                .reset-button {
                    display: inline-block;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white !important;
                    text-decoration: none;
                    padding: 15px 30px;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 16px;
                    text-align: center;
                    margin: 20px 0;
                    transition: transform 0.2s;
                }
                .reset-button:hover {
                    transform: translateY(-2px);
                }
                .link-info {
                    background: #f8f9fa;
                    padding: 15px;
                    border-radius: 8px;
                    margin: 20px 0;
                    font-size: 14px;
                    color: #666;
                }
                .security-notice {
                    background: #fff3cd;
                    border: 1px solid #ffeaa7;
                    padding: 15px;
                    border-radius: 8px;
                    margin: 20px 0;
                    color: #856404;
                }
                .footer {
                    text-align: center;
                    padding: 20px;
                    background: #f8f9fa;
                    color: #666;
                    font-size: 14px;
                }
                .logo {
                    font-size: 20px;
                    font-weight: bold;
                    margin-bottom: 10px;
                }
            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="header">
                    <div class="logo">🚀 FourAir</div>
                    <h1>密码重置请求</h1>
                </div>
                
                <div class="content">
                    <div class="greeting">
                        您好，${username}！
                    </div>
                    
                    <div class="message">
                        我们收到了您重置FourAir账户密码的请求。如果这是您本人的操作，请点击下方按钮重置您的密码：
                    </div>
                    
                    <div style="text-align: center;">
                        <a href="${resetLink}" class="reset-button">重置我的密码</a>
                    </div>
                    
                    <div class="link-info">
                        <strong>重要提醒：</strong><br>
                        • 此链接将在 <strong>30分钟</strong> 后失效<br>
                        • 每个重置链接只能使用一次<br>
                        • 如果按钮无法点击，请复制以下链接到浏览器中打开：<br>
                        <code style="word-break: break-all; color: #667eea;">${resetLink}</code>
                    </div>
                    
                    <div class="security-notice">
                        <strong>🔒 安全提醒：</strong><br>
                        如果您没有请求重置密码，请忽略此邮件。您的账户安全不会受到影响。
                        为了保护您的账户安全，请不要将此邮件转发给他人。
                    </div>
                </div>
                
                <div class="footer">
                    <p>此邮件由 FourAir 撸毛工具箱 自动发送，请勿直接回复。</p>
                    <p>如有疑问，请联系我们的客服团队。</p>
                    <p style="color: #999; font-size: 12px;">
                        © ${new Date().getFullYear()} FourAir. All rights reserved.
                    </p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * 验证邮件服务是否正常工作
     */
    async testConnection() {
        try {
            await this.transporter.verify();
            console.log('[EmailService] 邮件服务连接测试成功');
            return true;
        } catch (error) {
            console.error('[EmailService] 邮件服务连接测试失败:', error);
            return false;
        }
    }
}

module.exports = new EmailService(); 