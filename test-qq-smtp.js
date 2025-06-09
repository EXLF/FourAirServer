const nodemailer = require('nodemailer');

// QQ邮箱SMTP测试配置
const testConfig = {
    host: 'smtp.qq.com',
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
        user: '2760869618@qq.com',  // 你的QQ邮箱
        pass: 'copwqslajxundhag'  // QQ邮箱授权码
    },
    tls: {
        rejectUnauthorized: false
    }
};

async function testQQSMTP() {
    console.log('🧪 测试QQ邮箱SMTP连接...');
    console.log('配置信息:', {
        host: testConfig.host,
        port: testConfig.port,
        secure: testConfig.secure,
        user: testConfig.auth.user
    });
    
    try {
        // 创建传输器
        const transporter = nodemailer.createTransport(testConfig);
        
        // 测试连接
        console.log('\n📡 正在测试SMTP连接...');
        await transporter.verify();
        console.log('✅ QQ邮箱SMTP连接成功！');
        
        // 发送测试邮件
        console.log('\n📧 发送测试邮件...');
        const result = await transporter.sendMail({
            from: '"FourAir 测试" <2760869618@qq.com>',
            to: '2760869618@qq.com', // 发送给自己进行测试
            subject: 'QQ邮箱SMTP测试',
            html: `
                <h2>🎉 QQ邮箱SMTP配置成功！</h2>
                <p>这是一封来自FourAir的测试邮件。</p>
                <p>发送时间: ${new Date().toLocaleString('zh-CN')}</p>
                <p>如果您收到这封邮件，说明QQ邮箱SMTP服务已经正常工作了！</p>
            `
        });
        
        console.log('✅ 测试邮件发送成功！');
        console.log('📧 邮件ID:', result.messageId);
        console.log('\n🎊 QQ邮箱配置完全正常，忘记密码功能可以正常使用了！');
        
    } catch (error) {
        console.error('❌ QQ邮箱SMTP测试失败:', error.message);
        
        if (error.responseCode === 535) {
            console.log('\n💡 解决方案:');
            console.log('1. 确认已在QQ邮箱设置中开启POP3/SMTP服务');
            console.log('2. 确认使用的是16位授权码，不是QQ密码');
            console.log('3. 检查授权码是否正确复制（注意空格）');
            console.log('4. 重新生成授权码并替换配置中的密码');
        } else if (error.code === 'ECONNECTION') {
            console.log('\n💡 网络连接问题:');
            console.log('1. 检查网络连接是否正常');
            console.log('2. 确认防火墙没有阻止465端口');
            console.log('3. 尝试使用VPN或其他网络环境');
        }
    }
}

// 运行测试
testQQSMTP().catch(console.error); 