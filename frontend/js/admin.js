class AdminPanel {
    constructor() {
        this.currentTab = 'users';
        this.init();
    }
    
    async init() {
        this.setupTabs();
        await this.loadStats();
        await this.loadUsers();
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
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        this.currentTab = tabName;
        
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
            console.log('🔄 Loading canvases...');
            const response = await fetch(`${API_BASE}/api/v1/admin/canvases`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            console.log('📡 Canvas response status:', response.status);
            
            if (response.ok) {
                const canvases = await response.json();
                console.log(' Loaded canvases:', canvases);
                this.displayCanvases(canvases);
            } else {
                console.error('❌ Failed to load canvases:', response.status, response.statusText);
                const errorText = await response.text();
                console.error('❌ Error details:', errorText);
            }
        } catch (error) {
            console.error('❌ Error loading canvases:', error);
        }
    }
    
    displayCanvases(canvases) {
        console.log('🎨 Displaying canvases:', canvases);
        const tbody = document.getElementById('canvases-tbody');
        
        if (!tbody) {
            console.error('❌ Canvases table body not found!');
            return;
        }
        
        if (!Array.isArray(canvases)) {
            console.error('❌ Canvases data is not an array:', canvases);
            return;
        }
        
        tbody.innerHTML = canvases.map(canvas => `
            <tr>
                <td>${canvas.id}</td>
                <td>${canvas.name || 'Unnamed'}</td>
                <td>${canvas.width || 0}×${canvas.height || 0}</td>
                <td>
                    <span class="badge badge-info">${canvas.tile_size || 64}×${canvas.tile_size || 64}</span>
                    <br><small>Grid: ${Math.floor((canvas.width || 1024)/(canvas.tile_size || 64))}×${Math.floor((canvas.height || 1024)/(canvas.tile_size || 64))}</small>
                </td>
                <td>
                    <span class="badge badge-secondary">${canvas.palette_type || 'classic'}</span>
                    <br><small>${canvas.collaboration_mode || 'free'}</small>
                </td>
                <td>
                    <span class="badge ${canvas.is_active ? 'badge-success' : 'badge-danger'}">
                        ${canvas.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>${canvas.max_tiles_per_user || 10}</td>
                <td>${canvas.created_at ? new Date(canvas.created_at).toLocaleDateString() : 'Unknown'}</td>
                <td class="admin-actions">
                    <button class="btn-admin btn-view" onclick="adminPanel.viewCanvasDetails(${canvas.id})" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-admin btn-edit" onclick="adminPanel.editCanvas(${canvas.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-admin btn-toggle" onclick="adminPanel.toggleCanvasStatus(${canvas.id})" title="Toggle Status">
                        <i class="fas fa-toggle-on"></i>
                    </button>
                    <button class="btn-admin btn-delete" onclick="adminPanel.deleteCanvas(${canvas.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        
        console.log('✅ Canvas table updated with', canvases.length, 'canvases');
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

    async viewCanvasDetails(canvasId) {
        try {
            const response = await fetch(`${API_BASE}/api/v1/admin/canvases/${canvasId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const canvas = await response.json();
                this.showCanvasDetailsModal(canvas);
            }
        } catch (error) {
            console.error('Failed to load canvas details:', error);
        }
    }

    showCanvasDetailsModal(canvas) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content admin-modal">
                <div class="modal-header">
                    <h2>Canvas Details: ${canvas.name}</h2>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="canvas-details-grid">
                        <div class="detail-section">
                            <h3>📐 Dimensions & Layout</h3>
                            <div class="detail-item">
                                <strong>Canvas Size:</strong> ${canvas.width} × ${canvas.height} pixels
                            </div>
                            <div class="detail-item">
                                <strong>Tile Size:</strong> ${canvas.tile_size} × ${canvas.tile_size} pixels
                            </div>
                            <div class="detail-item">
                                <strong>Grid Layout:</strong> ${Math.floor(canvas.width/canvas.tile_size)} × ${Math.floor(canvas.height/canvas.tile_size)} tiles
                            </div>
                            <div class="detail-item">
                                <strong>Total Tile Positions:</strong> ${Math.floor(canvas.width/canvas.tile_size) * Math.floor(canvas.height/canvas.tile_size)}
                            </div>
                        </div>
                        
                        <div class="detail-section">
                            <h3>🎨 Appearance & Settings</h3>
                            <div class="detail-item">
                                <strong>Color Palette:</strong> <span class="badge badge-secondary">${canvas.palette_type}</span>
                            </div>
                            <div class="detail-item">
                                <strong>Collaboration Mode:</strong> <span class="badge badge-info">${canvas.collaboration_mode}</span>
                            </div>
                            <div class="detail-item">
                                <strong>Max Tiles Per User:</strong> ${canvas.max_tiles_per_user}
                            </div>
                            <div class="detail-item">
                                <strong>Auto-save Interval:</strong> ${canvas.auto_save_interval}s
                            </div>
                        </div>
                        
                        <div class="detail-section">
                            <h3>📊 Statistics</h3>
                            <div class="detail-item">
                                <strong>Status:</strong> 
                                <span class="badge ${canvas.is_active ? 'badge-success' : 'badge-danger'}">
                                    ${canvas.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <div class="detail-item">
                                <strong>Public:</strong> 
                                <span class="badge ${canvas.is_public ? 'badge-success' : 'badge-warning'}">
                                    ${canvas.is_public ? 'Yes' : 'No'}
                                </span>
                            </div>
                            <div class="detail-item">
                                <strong>Moderated:</strong> 
                                <span class="badge ${canvas.is_moderated ? 'badge-warning' : 'badge-secondary'}">
                                    ${canvas.is_moderated ? 'Yes' : 'No'}
                                </span>
                            </div>
                            <div class="detail-item">
                                <strong>Created:</strong> ${new Date(canvas.created_at).toLocaleString()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
}

// Initialize admin panel
const adminPanel = new AdminPanel(); 