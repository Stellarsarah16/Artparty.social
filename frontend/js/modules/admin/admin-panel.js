/**
 * Admin Panel Manager
 * Provides CRUD operations for users and tile locks
 */
export class AdminPanelManager {
    constructor() {
        this.currentView = 'dashboard';
        this.initialized = false;
    }
    
    init() {
        if (this.initialized) {
            console.log('🔧 Admin Panel already initialized, refreshing data...');
            this.loadDashboard();
            return;
        }
        
        console.log('🔧 Admin Panel Manager initialized');
        this.setupEventListeners();
        this.loadDashboard();
        this.initialized = true;
    }
    
    setupEventListeners() {
        // Navigation tabs
        document.getElementById('admin-dashboard-tab')?.addEventListener('click', () => this.showView('dashboard'));
        document.getElementById('admin-users-tab')?.addEventListener('click', () => this.showView('users'));
        document.getElementById('admin-locks-tab')?.addEventListener('click', () => this.showView('locks'));
        document.getElementById('admin-reports-tab')?.addEventListener('click', () => this.showView('reports'));
        
        // Action buttons
        document.getElementById('cleanup-locks-btn')?.addEventListener('click', () => this.cleanupExpiredLocks());
        document.getElementById('refresh-data-btn')?.addEventListener('click', () => this.refreshCurrentView());
    }
    
    async showView(viewName) {
        this.currentView = viewName;
        
        // Hide all views
        document.querySelectorAll('.admin-view').forEach(view => view.style.display = 'none');
        
        // Show selected view
        const targetView = document.getElementById(`admin-${viewName}-view`);
        if (targetView) {
            targetView.style.display = 'block';
            
            // Load data for the view
            switch (viewName) {
                case 'dashboard':
                    await this.loadDashboard();
                    break;
                case 'users':
                    await this.loadUsers();
                    break;
                case 'locks':
                    await this.loadLocks();
                    break;
                case 'reports':
                    await this.loadReports();
                    break;
            }
        }
        
        // Update active tab
        document.querySelectorAll('.admin-tab').forEach(tab => tab.classList.remove('active'));
        document.getElementById(`admin-${viewName}-tab`)?.classList.add('active');
    }
    
    async loadDashboard() {
        try {
            const response = await fetch('/api/v1/admin/reports/system-overview', {
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.renderDashboard(data);
            } else {
                throw new Error('Failed to load dashboard data');
            }
        } catch (error) {
            console.error('❌ Error loading dashboard:', error);
            this.showError('Failed to load dashboard data');
        }
    }
    
    async loadUsers() {
        try {
            const response = await fetch('/api/v1/admin/users', {
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });
            
            if (response.ok) {
                const users = await response.json();
                this.renderUsers(users);
            } else {
                throw new Error('Failed to load users');
            }
        } catch (error) {
            console.error('❌ Error loading users:', error);
            this.showError('Failed to load users');
        }
    }
    
    async loadLocks() {
        try {
            const response = await fetch('/api/v1/admin/locks', {
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });
            
            if (response.ok) {
                const locks = await response.json();
                this.renderLocks(locks);
            } else {
                throw new Error('Failed to load locks');
            }
        } catch (error) {
            console.error('❌ Error loading locks:', error);
            this.showError('Failed to load locks');
        }
    }
    
    async loadReports() {
        try {
            const response = await fetch('/api/v1/admin/reports/system-overview', {
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.renderReports(data);
            } else {
                throw new Error('Failed to load reports');
            }
        } catch (error) {
            console.error('❌ Error loading reports:', error);
            this.showError('Failed to load reports');
        }
    }
    
    renderDashboard(data) {
        const dashboard = document.getElementById('admin-dashboard-view');
        if (!dashboard) return;
        
        dashboard.innerHTML = `
            <div class="admin-stats-grid">
                <div class="stat-card">
                    <h3>Users</h3>
                    <div class="stat-number">${data.users.total}</div>
                    <div class="stat-detail">${data.users.active_today} active today, ${data.users.new_this_week} new this week</div>
                </div>
                <div class="stat-card">
                    <h3>Canvases</h3>
                    <div class="stat-number">${data.canvases.total}</div>
                    <div class="stat-detail">${data.canvases.new_this_week} new this week</div>
                </div>
                <div class="stat-card">
                    <h3>Tiles</h3>
                    <div class="stat-number">${data.tiles.total}</div>
                    <div class="stat-detail">Total tiles created</div>
                </div>
                <div class="stat-card">
                    <h3>Tile Locks</h3>
                    <div class="stat-number">${data.locks.active_locks}</div>
                    <div class="stat-detail">${data.locks.expired_locks} expired</div>
                </div>
                <div class="stat-card">
                    <h3>System Health</h3>
                    <div class="stat-status ${data.system_health.status === 'healthy' ? 'healthy' : 'warning'}">
                        ${data.system_health.status}
                    </div>
                    <div class="stat-detail">${data.system_health.recommendations.join(', ')}</div>
                </div>
            </div>
            <div class="admin-actions">
                <button id="cleanup-locks-btn" class="btn btn-warning">Cleanup Expired Locks</button>
                <button id="refresh-data-btn" class="btn btn-primary">Refresh Data</button>
            </div>
        `;
        
        // Re-attach event listeners
        this.setupEventListeners();
    }
    
    renderUsers(users) {
        const usersView = document.getElementById('admin-users-view');
        if (!usersView) return;
        
        usersView.innerHTML = `
            <div class="admin-header">
                <h2>User Management</h2>
                <button class="btn btn-primary" onclick="adminPanel.createUser()">Create User</button>
            </div>
            <div class="admin-table-container">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Status</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map(user => `
                            <tr>
                                <td>${user.id}</td>
                                <td>${user.username}</td>
                                <td>${user.email || 'N/A'}</td>
                                <td>
                                    <span class="status-badge ${user.is_active ? 'active' : 'inactive'}">
                                        ${user.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                                <td>
                                    <button class="btn btn-sm btn-secondary" onclick="adminPanel.editUser(${user.id})">Edit</button>
                                    <button class="btn btn-sm btn-warning" onclick="adminPanel.toggleUserStatus(${user.id})">
                                        ${user.is_active ? 'Deactivate' : 'Activate'}
                                    </button>
                                    <button class="btn btn-sm btn-danger" onclick="adminPanel.deleteUser(${user.id})">Delete</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    renderLocks(locks) {
        const locksView = document.getElementById('admin-locks-view');
        if (!locksView) return;
        
        locksView.innerHTML = `
            <div class="admin-header">
                <h2>Tile Lock Management</h2>
                <button class="btn btn-warning" onclick="adminPanel.cleanupExpiredLocks()">Cleanup Expired</button>
            </div>
            <div class="admin-table-container">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Tile ID</th>
                            <th>User ID</th>
                            <th>Locked At</th>
                            <th>Expires At</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${locks.map(lock => `
                            <tr>
                                <td>${lock.tile_id}</td>
                                <td>${lock.user_id}</td>
                                <td>${new Date(lock.locked_at).toLocaleString()}</td>
                                <td>${new Date(lock.expires_at).toLocaleString()}</td>
                                <td>
                                    <span class="status-badge ${lock.is_active ? 'active' : 'inactive'}">
                                        ${lock.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td>
                                    <button class="btn btn-sm btn-danger" onclick="adminPanel.forceReleaseLock(${lock.tile_id})">
                                        Force Release
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    renderReports(data) {
        const reportsView = document.getElementById('admin-reports-view');
        if (!reportsView) return;
        
        reportsView.innerHTML = `
            <div class="admin-header">
                <h2>System Reports</h2>
                <button class="btn btn-primary" onclick="adminPanel.exportReport()">Export Report</button>
            </div>
            <div class="report-sections">
                <div class="report-section">
                    <h3>User Statistics</h3>
                    <div class="report-grid">
                        <div class="report-item">
                            <label>Total Users:</label>
                            <span>${data.users.total}</span>
                        </div>
                        <div class="report-item">
                            <label>Active Users:</label>
                            <span>${data.users.active}</span>
                        </div>
                        <div class="report-item">
                            <label>Inactive Users:</label>
                            <span>${data.users.inactive}</span>
                        </div>
                    </div>
                </div>
                <div class="report-section">
                    <h3>Lock Statistics</h3>
                    <div class="report-grid">
                        <div class="report-item">
                            <label>Total Locks:</label>
                            <span>${data.locks.total_locks}</span>
                        </div>
                        <div class="report-item">
                            <label>Active Locks:</label>
                            <span>${data.locks.active_locks}</span>
                        </div>
                        <div class="report-item">
                            <label>Expired Locks:</label>
                            <span>${data.locks.expired_locks}</span>
                        </div>
                    </div>
                </div>
                <div class="report-section">
                    <h3>System Health</h3>
                    <div class="health-status ${data.system_health.status}">
                        <span class="status-indicator"></span>
                        <span class="status-text">${data.system_health.status}</span>
                    </div>
                    <div class="recommendations">
                        <h4>Recommendations:</h4>
                        <ul>
                            ${data.system_health.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Action Methods
    
    async cleanupExpiredLocks() {
        try {
            const response = await fetch('/api/v1/admin/locks/cleanup', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                this.showSuccess(result.message);
                this.refreshCurrentView();
            } else {
                throw new Error('Failed to cleanup locks');
            }
        } catch (error) {
            console.error('❌ Error cleaning up locks:', error);
            this.showError('Failed to cleanup expired locks');
        }
    }
    
    async forceReleaseLock(tileId) {
        if (!confirm(`Are you sure you want to force release the lock on tile ${tileId}?`)) {
            return;
        }
        
        try {
            const response = await fetch(`/api/v1/admin/locks/${tileId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                this.showSuccess(result.message);
                this.refreshCurrentView();
            } else {
                throw new Error('Failed to release lock');
            }
        } catch (error) {
            console.error('❌ Error releasing lock:', error);
            this.showError('Failed to force release lock');
        }
    }
    
    async toggleUserStatus(userId) {
        try {
            const response = await fetch(`/api/v1/admin/users/${userId}/toggle-status`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                this.showSuccess(result.message);
                this.refreshCurrentView();
            } else {
                throw new Error('Failed to toggle user status');
            }
        } catch (error) {
            console.error('❌ Error toggling user status:', error);
            this.showError('Failed to toggle user status');
        }
    }
    
    async deleteUser(userId) {
        if (!confirm(`Are you sure you want to delete user ${userId}? This action cannot be undone.`)) {
            return;
        }
        
        try {
            const response = await fetch(`/api/v1/admin/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                this.showSuccess(result.message);
                this.refreshCurrentView();
            } else {
                throw new Error('Failed to delete user');
            }
        } catch (error) {
            console.error('❌ Error deleting user:', error);
            this.showError('Failed to delete user');
        }
    }
    
    // Utility Methods
    
    refreshCurrentView() {
        this.showView(this.currentView);
    }
    
    getAuthToken() {
        // Use the same method as the main app
        return window.CONFIG_UTILS ? window.CONFIG_UTILS.getAuthToken() : localStorage.getItem('artparty_social_token') || '';
    }
    
    showSuccess(message) {
        window.UIManager?.showToast(message, 'success') || alert(message);
    }
    
    showError(message) {
        window.UIManager?.showToast(message, 'error') || alert(message);
    }
    
    createUser() {
        // Implement user creation modal
        alert('User creation feature coming soon!');
    }
    
    editUser(userId) {
        // Implement user editing modal
        alert(`Edit user ${userId} feature coming soon!`);
    }
    
    exportReport() {
        // Implement report export
        alert('Report export feature coming soon!');
    }
}

// Create global instance
window.adminPanel = new AdminPanelManager();
