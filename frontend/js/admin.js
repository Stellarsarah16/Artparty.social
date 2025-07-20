class AdminPanel {
    constructor() {
        this.currentTab = 'users';
        this.init();
    }
    
    async init() {
        this.setupTabs();
        await this.loadStats();
        await this.loadUsers();
        this.setupEventListeners();
    }
    
    setupTabs() {
        const tabs = document.querySelectorAll('.admin-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchTab(tab.dataset.tab);
            });
        });
    }
    
    switchTab(tabName) {
        // Update tab styling
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        this.currentTab = tabName;
        
        // Load content based on tab
        switch(tabName) {
            case 'users':
                this.loadUsers();
                break;
            case 'canvases':
                this.loadCanvases();
                break;
            case 'activity':
                this.loadActivity();
                break;
        }
    }
    
    async loadStats() {
        try {
            const response = await fetch(`${API_BASE}/api/v1/admin/stats`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const stats = await response.json();
                this.displayStats(stats);
            }
        } catch (error) {
            console.error('Failed to load admin stats:', error);
        }
    }
    
    displayStats(stats) {
        const statsContainer = document.getElementById('admin-stats');
        statsContainer.innerHTML = `
            <div class="stat-card">
                <div class="stat-number">${stats.total_users}</div>
                <div>Total Users</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.total_canvases}</div>
                <div>Total Canvases</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.total_tiles}</div>
                <div>Total Tiles</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.active_users_today}</div>
                <div>Active Today</div>
            </div>
        `;
    }
    
    async loadUsers() {
        try {
            const response = await fetch(`${API_BASE}/api/v1/admin/users`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const users = await response.json();
                this.displayUsers(users);
            }
        } catch (error) {
            console.error('Failed to load users:', error);
        }
    }
    
    displayUsers(users) {
        const tbody = document.getElementById('users-tbody');
        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>
                    ${user.is_superuser ? '<span class="badge badge-danger">Superuser</span>' : ''}
                    ${user.is_admin ? '<span class="badge badge-warning">Admin</span>' : ''}
                    ${!user.is_admin && !user.is_superuser ? '<span class="badge badge-secondary">User</span>' : ''}
                </td>
                <td>
                    <span class="badge ${user.is_active ? 'badge-success' : 'badge-danger'}">
                        ${user.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                <td class="admin-actions">
                    <button class="btn-admin btn-edit" onclick="adminPanel.editUser(${user.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-admin btn-toggle" onclick="adminPanel.toggleUserStatus(${user.id})">
                        <i class="fas fa-toggle-on"></i>
                    </button>
                    ${user.is_superuser ? '' : `
                        <button class="btn-admin btn-delete" onclick="adminPanel.deleteUser(${user.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    `}
                </td>
            </tr>
        `).join('');
    }
    
    async loadCanvases() {
        try {
            const response = await fetch(`${API_BASE}/api/v1/admin/canvases`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const canvases = await response.json();
                this.displayCanvases(canvases);
            }
        } catch (error) {
            console.error('Failed to load canvases:', error);
        }
    }
    
    displayCanvases(canvases) {
        const tbody = document.getElementById('canvases-tbody');
        tbody.innerHTML = canvases.map(canvas => `
            <tr>
                <td>${canvas.id}</td>
                <td>${canvas.name}</td>
                <td>${canvas.width}x${canvas.height}</td>
                <td>
                    <span class="badge ${canvas.is_active ? 'badge-success' : 'badge-danger'}">
                        ${canvas.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>${new Date(canvas.created_at).toLocaleDateString()}</td>
                <td class="admin-actions">
                    <button class="btn-admin btn-edit" onclick="adminPanel.editCanvas(${canvas.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-admin btn-toggle" onclick="adminPanel.toggleCanvasStatus(${canvas.id})">
                        <i class="fas fa-toggle-on"></i>
                    </button>
                    <button class="btn-admin btn-delete" onclick="adminPanel.deleteCanvas(${canvas.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }
    
    async loadActivity() {
        try {
            const response = await fetch(`${API_BASE}/api/v1/admin/activity`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.displayActivity(data.activity);
            }
        } catch (error) {
            console.error('Failed to load activity:', error);
        }
    }
    
    displayActivity(activity) {
        const container = document.getElementById('activity-list');
        container.innerHTML = activity.map(item => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas ${item.type === 'tile_created' ? 'fa-paint-brush' : 'fa-heart'}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-text">
                        ${item.type === 'tile_created' ? 'Tile created' : 'Tile liked'}
                    </div>
                    <div class="activity-time">
                        ${new Date(item.created_at).toLocaleString()}
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    async toggleUserStatus(userId) {
        if (!confirm('Are you sure you want to toggle this user\'s status?')) return;
        
        try {
            const response = await fetch(`${API_BASE}/api/v1/admin/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    is_active: false // This will be toggled by the backend
                })
            });
            
            if (response.ok) {
                await this.loadUsers();
            }
        } catch (error) {
            console.error('Failed to toggle user status:', error);
        }
    }
    
    async deleteUser(userId) {
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
        
        try {
            const response = await fetch(`${API_BASE}/api/v1/admin/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                await this.loadUsers();
            }
        } catch (error) {
            console.error('Failed to delete user:', error);
        }
    }
    
    async toggleCanvasStatus(canvasId) {
        if (!confirm('Are you sure you want to toggle this canvas\'s status?')) return;
        
        try {
            const response = await fetch(`${API_BASE}/api/v1/admin/canvases/${canvasId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    is_active: false // This will be toggled by the backend
                })
            });
            
            if (response.ok) {
                await this.loadCanvases();
            }
        } catch (error) {
            console.error('Failed to toggle canvas status:', error);
        }
    }
    
    async deleteCanvas(canvasId) {
        if (!confirm('Are you sure you want to delete this canvas? This action cannot be undone.')) return;
        
        try {
            const response = await fetch(`${API_BASE}/api/v1/admin/canvases/${canvasId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                await this.loadCanvases();
            }
        } catch (error) {
            console.error('Failed to delete canvas:', error);
        }
    }
}

// Initialize admin panel
const adminPanel = new AdminPanel(); 