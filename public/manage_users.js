let currentPage = 1;
let currentFilters = {};
let currentUser = null;
let isEditing = false;

// DOM 元素
const loadingEl = document.getElementById('loading');
const tableWrapperEl = document.getElementById('table-wrapper');
const emptyStateEl = document.getElementById('empty-state');
const usersTableBodyEl = document.getElementById('users-table-body');
const paginationEl = document.getElementById('pagination');
const statsGridEl = document.getElementById('stats-grid');

// 筛选元素
const filterVipEl = document.getElementById('filter-vip');
const filterActiveEl = document.getElementById('filter-active');
const filterVerifiedEl = document.getElementById('filter-verified');
const searchInputEl = document.getElementById('search-input');
const searchBtnEl = document.getElementById('search-btn');
const refreshBtnEl = document.getElementById('refresh-btn');

// 模态框元素
const userModalEl = document.getElementById('user-modal');
const modalTitleEl = document.getElementById('modal-title');
const modalBodyEl = document.getElementById('modal-body');
const saveBtnEl = document.getElementById('save-btn');

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    loadStats();
    loadUsers();
    
    // 绑定事件
    searchBtnEl.addEventListener('click', handleSearch);
    refreshBtnEl.addEventListener('click', handleRefresh);
    searchInputEl.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
    
    // 筛选器变化时自动搜索
    [filterVipEl, filterActiveEl, filterVerifiedEl].forEach(el => {
        el.addEventListener('change', handleSearch);
    });
});

// 加载统计数据
async function loadStats() {
    try {
        const response = await fetch('/api/users/stats');
        if (!response.ok) {
            throw new Error('获取统计数据失败');
        }
        
        const stats = await response.json();
        renderStats(stats);
    } catch (error) {
        console.error('加载统计数据失败:', error);
        showToast('加载统计数据失败', 'error');
    }
}

// 渲染统计卡片
function renderStats(stats) {
    const statsHtml = `
        <div class="stat-card">
            <h3>${stats.totalUsers}</h3>
            <p>总用户数</p>
        </div>
        <div class="stat-card success">
            <h3>${stats.todayNewUsers}</h3>
            <p>今日新增</p>
        </div>
        <div class="stat-card info">
            <h3>${stats.monthlyNewUsers}</h3>
            <p>本月新增</p>
        </div>
        <div class="stat-card warning">
            <h3>${stats.activeUsers}</h3>
            <p>活跃用户 (7天)</p>
        </div>
        <div class="stat-card danger">
            <h3>${stats.vipUsers}</h3>
            <p>VIP用户</p>
        </div>
        <div class="stat-card">
            <h3>${stats.verifiedUsers}</h3>
            <p>已验证邮箱</p>
        </div>
    `;
    
    statsGridEl.innerHTML = statsHtml;
}

// 加载用户列表
async function loadUsers(page = 1) {
    showLoading();
    
    try {
        const params = new URLSearchParams({
            page: page,
            limit: 20,
            ...currentFilters
        });
        
        const response = await fetch(`/api/users?${params}`);
        if (!response.ok) {
            throw new Error('获取用户列表失败');
        }
        
        const data = await response.json();
        renderUsers(data.users);
        renderPagination(data.pagination);
        currentPage = page;
    } catch (error) {
        console.error('加载用户列表失败:', error);
        showToast('加载用户列表失败', 'error');
        showEmptyState();
    }
}

// 显示加载状态
function showLoading() {
    loadingEl.style.display = 'flex';
    tableWrapperEl.style.display = 'none';
    emptyStateEl.style.display = 'none';
}

// 显示空状态
function showEmptyState() {
    loadingEl.style.display = 'none';
    tableWrapperEl.style.display = 'none';
    emptyStateEl.style.display = 'block';
}

// 渲染用户列表
function renderUsers(users) {
    if (!users || users.length === 0) {
        showEmptyState();
        return;
    }
    
    const html = users.map(user => `
        <tr>
            <td>${escapeHtml(user.username)}</td>
            <td>${escapeHtml(user.email)}</td>
            <td><span class="vip-badge vip-${user.vipLevel}">VIP ${user.vipLevel}</span></td>
            <td>${user.points}</td>
            <td>
                <span class="badge ${user.isActive ? 'badge-success' : 'badge-danger'}">
                    ${user.isActive ? '正常' : '已禁用'}
                </span>
            </td>
            <td>
                <span class="badge ${user.isEmailVerified ? 'badge-success' : 'badge-warning'}">
                    ${user.isEmailVerified ? '已验证' : '未验证'}
                </span>
            </td>
            <td>${formatDate(user.createdAt)}</td>
            <td>${user.lastLoginAt ? formatDate(user.lastLoginAt) : '从未登录'}</td>
            <td>
                <div class="actions">
                    <button class="btn btn-primary" onclick="viewUser('${user.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-warning" onclick="editUser('${user.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    usersTableBodyEl.innerHTML = html;
    loadingEl.style.display = 'none';
    tableWrapperEl.style.display = 'block';
    emptyStateEl.style.display = 'none';
}

// 渲染分页
function renderPagination(pagination) {
    if (!pagination || pagination.totalPages <= 1) {
        paginationEl.innerHTML = '';
        return;
    }
    
    const { page, totalPages } = pagination;
    let html = '';
    
    // 上一页按钮
    html += `
        <button class="page-btn" ${page <= 1 ? 'disabled' : ''} onclick="loadUsers(${page - 1})">
            <i class="fas fa-chevron-left"></i>
        </button>
    `;
    
    // 页码按钮
    for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) {
        html += `
            <button class="page-btn ${i === page ? 'active' : ''}" onclick="loadUsers(${i})">
                ${i}
            </button>
        `;
    }
    
    // 下一页按钮
    html += `
        <button class="page-btn" ${page >= totalPages ? 'disabled' : ''} onclick="loadUsers(${page + 1})">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    paginationEl.innerHTML = html;
}

// 处理搜索
function handleSearch() {
    currentFilters = {
        search: searchInputEl.value.trim(),
        vipLevel: filterVipEl.value,
        isActive: filterActiveEl.value,
        isEmailVerified: filterVerifiedEl.value
    };
    
    // 移除空值
    Object.keys(currentFilters).forEach(key => {
        if (currentFilters[key] === '') {
            delete currentFilters[key];
        }
    });
    
    loadUsers(1);
}

// 处理刷新
function handleRefresh() {
    // 清空筛选条件
    searchInputEl.value = '';
    filterVipEl.value = '';
    filterActiveEl.value = '';
    filterVerifiedEl.value = '';
    currentFilters = {};
    
    // 重新加载数据
    loadStats();
    loadUsers(1);
}

// 查看用户详情
async function viewUser(userId) {
    try {
        const response = await fetch(`/api/users/${userId}`);
        if (!response.ok) {
            throw new Error('获取用户详情失败');
        }
        
        const data = await response.json();
        currentUser = data.user;
        isEditing = false;
        
        showUserModal();
    } catch (error) {
        console.error('查看用户详情失败:', error);
        showToast('获取用户详情失败', 'error');
    }
}

// 编辑用户
async function editUser(userId) {
    try {
        const response = await fetch(`/api/users/${userId}`);
        if (!response.ok) {
            throw new Error('获取用户详情失败');
        }
        
        const data = await response.json();
        currentUser = data.user;
        isEditing = true;
        
        showUserModal();
    } catch (error) {
        console.error('获取用户详情失败:', error);
        showToast('获取用户详情失败', 'error');
    }
}

// 显示用户模态框
function showUserModal() {
    modalTitleEl.textContent = isEditing ? '编辑用户' : '用户详情';
    saveBtnEl.style.display = isEditing ? 'block' : 'none';
    
    const user = currentUser;
    const html = `
        <div class="form-group">
            <label>用户名</label>
            <input type="text" class="form-control" value="${escapeHtml(user.username)}" readonly>
        </div>
        
        <div class="form-group">
            <label>邮箱</label>
            <input type="email" class="form-control" value="${escapeHtml(user.email)}" readonly>
        </div>
        
        <div class="form-group">
            <label>昵称</label>
            <input type="text" class="form-control" value="${escapeHtml(user.nickname || '')}" readonly>
        </div>
        
        <div class="form-group">
            <label>VIP等级</label>
            ${isEditing ? `
                <select id="edit-vip-level" class="form-control">
                    ${[0,1,2,3,4,5].map(level => 
                        `<option value="${level}" ${user.vipLevel === level ? 'selected' : ''}>VIP ${level}</option>`
                    ).join('')}
                </select>
            ` : `
                <input type="text" class="form-control" value="VIP ${user.vipLevel}" readonly>
            `}
        </div>
        
        <div class="form-group">
            <label>VIP到期时间</label>
            ${isEditing ? `
                <input type="datetime-local" id="edit-vip-expire" class="form-control" 
                       value="${user.vipExpireAt ? new Date(user.vipExpireAt).toISOString().slice(0, 16) : ''}">
            ` : `
                <input type="text" class="form-control" 
                       value="${user.vipExpireAt ? formatDate(user.vipExpireAt) : '无限期'}" readonly>
            `}
        </div>
        
        <div class="form-group">
            <label>积分</label>
            ${isEditing ? `
                <input type="number" id="edit-points" class="form-control" value="${user.points}" min="0">
            ` : `
                <input type="text" class="form-control" value="${user.points}" readonly>
            `}
        </div>
        
        <div class="form-group">
            <label>账户状态</label>
            ${isEditing ? `
                <select id="edit-is-active" class="form-control">
                    <option value="true" ${user.isActive ? 'selected' : ''}>正常</option>
                    <option value="false" ${!user.isActive ? 'selected' : ''}>已禁用</option>
                </select>
            ` : `
                <input type="text" class="form-control" 
                       value="${user.isActive ? '正常' : '已禁用'}" readonly>
            `}
        </div>
        
        <div class="form-group">
            <label>邮箱验证状态</label>
            ${isEditing ? `
                <select id="edit-is-verified" class="form-control">
                    <option value="true" ${user.isEmailVerified ? 'selected' : ''}>已验证</option>
                    <option value="false" ${!user.isEmailVerified ? 'selected' : ''}>未验证</option>
                </select>
            ` : `
                <input type="text" class="form-control" 
                       value="${user.isEmailVerified ? '已验证' : '未验证'}" readonly>
            `}
        </div>
        
        <div class="form-group">
            <label>注册时间</label>
            <input type="text" class="form-control" value="${formatDate(user.createdAt)}" readonly>
        </div>
        
        <div class="form-group">
            <label>最后登录</label>
            <input type="text" class="form-control" 
                   value="${user.lastLoginAt ? formatDate(user.lastLoginAt) : '从未登录'}" readonly>
        </div>
        
        <div class="form-group">
            <label>推荐人</label>
            <input type="text" class="form-control" 
                   value="${user.referrer ? user.referrer.username : '无'}" readonly>
        </div>
        
        <div class="form-group">
            <label>推荐码</label>
            <input type="text" class="form-control" value="${user.referralCode || '无'}" readonly>
        </div>
        
        ${user.referrals && user.referrals.length > 0 ? `
            <div class="form-group">
                <label>推荐用户 (${user.referrals.length}人)</label>
                <div style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; border-radius: 4px;">
                    ${user.referrals.map(referral => 
                        `<div style="margin-bottom: 5px;">
                            <strong>${escapeHtml(referral.username)}</strong> - ${escapeHtml(referral.email)}
                            <small style="color: #666;">(${formatDate(referral.createdAt)})</small>
                        </div>`
                    ).join('')}
                </div>
            </div>
        ` : ''}
    `;
    
    modalBodyEl.innerHTML = html;
    userModalEl.style.display = 'flex';
}

// 关闭用户模态框
function closeUserModal() {
    userModalEl.style.display = 'none';
    currentUser = null;
    isEditing = false;
}

// 保存用户信息
async function saveUser() {
    if (!isEditing || !currentUser) return;
    
    try {
        const updateData = {
            vipLevel: parseInt(document.getElementById('edit-vip-level').value),
            vipExpireAt: document.getElementById('edit-vip-expire').value || null,
            points: parseInt(document.getElementById('edit-points').value),
            isActive: document.getElementById('edit-is-active').value === 'true',
            isEmailVerified: document.getElementById('edit-is-verified').value === 'true'
        };
        
        const response = await fetch(`/api/users/${currentUser.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        if (!response.ok) {
            throw new Error('更新用户信息失败');
        }
        
        showToast('用户信息更新成功', 'success');
        closeUserModal();
        loadUsers(currentPage);
        loadStats(); // 重新加载统计数据
    } catch (error) {
        console.error('保存用户信息失败:', error);
        showToast('保存用户信息失败', 'error');
    }
}

// 工具函数
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return '无';
    
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showToast(message, type = 'info') {
    // 移除现有的toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // 创建新的toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // 显示toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    // 3秒后隐藏
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// 点击模态框外部关闭
window.addEventListener('click', function(event) {
    if (event.target === userModalEl) {
        closeUserModal();
    }
}); 