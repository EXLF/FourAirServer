const express = require('express');
const router = express.Router();
const db = require('../models');
const { Op } = require('sequelize');
const sequelize = db.sequelize;

// GET /api/users/stats - 获取用户统计数据
router.get('/stats', async (req, res) => {
  try {
    // 获取总用户数
    const totalUsers = await db.User.count();
    
    // 获取今日新增用户数
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayNewUsers = await db.User.count({
      where: {
        createdAt: {
          [Op.gte]: today
        }
      }
    });
    
    // 获取本月新增用户数
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlyNewUsers = await db.User.count({
      where: {
        createdAt: {
          [Op.gte]: firstDayOfMonth
        }
      }
    });
    
    // 获取活跃用户数（7天内登录）
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const activeUsers = await db.User.count({
      where: {
        lastLoginAt: {
          [Op.gte]: sevenDaysAgo
        }
      }
    });
    
    // 获取VIP用户数
    const vipUsers = await db.User.count({
      where: {
        vipLevel: {
          [Op.gt]: 0
        }
      }
    });
    
    // 获取邮箱验证用户数
    const verifiedUsers = await db.User.count({
      where: {
        isEmailVerified: true
      }
    });

    res.json({
      totalUsers,
      todayNewUsers,
      monthlyNewUsers,
      activeUsers,
      vipUsers,
      verifiedUsers
    });
  } catch (error) {
    console.error('获取用户统计失败:', error);
    res.status(500).json({ error: '获取用户统计失败' });
  }
});

// GET /api/users - 获取用户列表
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      vipLevel = '',
      isActive = '',
      isEmailVerified = '',
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // 构建查询条件
    const whereConditions = {};
    
    if (search) {
      whereConditions[Op.or] = [
        { username: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { nickname: { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (vipLevel !== '') {
      whereConditions.vipLevel = parseInt(vipLevel);
    }
    
    if (isActive !== '') {
      whereConditions.isActive = isActive === 'true';
    }
    
    if (isEmailVerified !== '') {
      whereConditions.isEmailVerified = isEmailVerified === 'true';
    }

    // 执行查询
    const { count, rows: users } = await db.User.findAndCountAll({
      where: whereConditions,
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: offset,
      attributes: {
        exclude: ['password'] // 不返回密码字段
      },
      include: [
        {
          model: db.User,
          as: 'referrer',
          attributes: ['id', 'username'],
          required: false
        }
      ]
    });

    // 计算总页数
    const totalPages = Math.ceil(count / parseInt(limit));

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages
      }
    });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

// GET /api/users/:id - 获取单个用户详情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await db.User.findByPk(id, {
      attributes: {
        exclude: ['password']
      },
      include: [
        {
          model: db.User,
          as: 'referrer',
          attributes: ['id', 'username', 'email'],
          required: false
        },
        {
          model: db.User,
          as: 'referrals',
          attributes: ['id', 'username', 'email', 'createdAt'],
          required: false
        }
      ]
    });
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    res.json({ user });
  } catch (error) {
    console.error('获取用户详情失败:', error);
    res.status(500).json({ error: '获取用户详情失败' });
  }
});

// PUT /api/users/:id - 更新用户信息
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { vipLevel, vipExpireAt, isActive, isEmailVerified, points } = req.body;
    
    const user = await db.User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    const updateData = {};
    if (vipLevel !== undefined) updateData.vipLevel = parseInt(vipLevel);
    if (vipExpireAt !== undefined) updateData.vipExpireAt = vipExpireAt ? new Date(vipExpireAt) : null;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isEmailVerified !== undefined) updateData.isEmailVerified = isEmailVerified;
    if (points !== undefined) updateData.points = parseInt(points);
    
    await user.update(updateData);
    
    res.json({ 
      message: '用户信息更新成功',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        vipLevel: user.vipLevel,
        vipExpireAt: user.vipExpireAt,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
        points: user.points
      }
    });
  } catch (error) {
    console.error('更新用户信息失败:', error);
    res.status(500).json({ error: '更新用户信息失败' });
  }
});

// GET /api/users/chart/registration - 获取用户注册趋势数据
router.get('/chart/registration', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysCount = parseInt(days);
    
    // 获取指定天数内的注册数据
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysCount);
    startDate.setHours(0, 0, 0, 0);
    
    const registrationData = await db.User.findAll({
      where: {
        createdAt: {
          [Op.gte]: startDate
        }
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
      order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']]
    });
    
    res.json({ registrationData });
  } catch (error) {
    console.error('获取用户注册趋势失败:', error);
    res.status(500).json({ error: '获取用户注册趋势失败' });
  }
});

module.exports = router; 