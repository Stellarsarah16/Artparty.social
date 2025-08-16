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
            // Don't reload dashboard if already initialized, just return
            return;
        }
        
        console.log('🔧 Admin Panel Manager initialized');
        this.setupEventListeners();
        
        // Only load dashboard if user is authenticated
        if (this.isUserAuthenticated()) {
            console.log('🔐 User authenticated, loading dashboard...');
            this.loadDashboard();
        } else {
            console.log('🔐 User not authenticated, showing login prompt...');
            this.renderLoginPrompt();
        }
        
        this.initialized = true;
    }
    
    setupEventListeners() {
        console.log('🔧 Setting up admin panel event listeners...');
        console.log('🔍 Available global objects:', {
            eventManager: !!window.eventManager,
            appState: !!window.appState,
            eventManagerType: typeof window.eventManager,
            appStateType: typeof window.appState
        });
        
        // FIXED: Use EventManager for tab navigation instead of direct DOM listeners
        if (window.eventManager && typeof window.eventManager.on === 'function') {
            console.log('🔧 Setting up EventManager-based tab navigation...');
            
            // Listen for tab click events
            window.eventManager.on('adminTabClick', (tabName) => {
                console.log('🔧 Admin tab clicked via EventManager:', tabName);
                this.showView(tabName);
            });
            
            // Set up tab click handlers that emit events
            this.setupTabClickHandlers();
            
        } else {
            console.warn('⚠️ EventManager not available, falling back to direct DOM listeners');
            // Fallback to direct DOM listeners if EventManager not available
            this.setupDirectTabListeners();
        }
        
        // Action buttons
        document.getElementById('cleanup-locks-btn')?.addEventListener('click', () => this.cleanupExpiredLocks());
        document.getElementById('refresh-data-btn')?.addEventListener('click', () => this.refreshCurrentView());
        
        // Listen for authentication changes
        try {
            if (window.eventManager && typeof window.eventManager.on === 'function') {
                console.log('🔧 Setting up event manager listeners...');
                window.eventManager.on('userLogin', () => {
                    console.log('🔐 User logged in, refreshing admin panel...');
                    this.refreshAfterLogin();
                });
                
                window.eventManager.on('userLogout', () => {
                    console.log('🔐 User logged out, showing login prompt...');
                    this.renderLoginPrompt();
                });
                console.log('✅ Event manager listeners set up successfully');
            } else if (window.appState && window.appState.subscribe) {
                // Fallback to appState subscription system
                console.log('🔧 Setting up appState subscription listeners...');
                window.appState.subscribe('currentUser', (newUser, oldUser) => {
                    if (newUser && !oldUser) {
                        console.log('🔐 User logged in, refreshing admin panel...');
                        this.refreshAfterLogin();
                    } else if (!newUser && oldUser) {
                        console.log('🔐 User logged out, showing login prompt...');
                        this.renderLoginPrompt();
                    }
                });
                console.log('✅ AppState subscription listeners set up successfully');
            } else {
                console.warn('⚠️ No event system available for authentication changes');
            }
        } catch (error) {
            console.error('❌ Error setting up authentication event listeners:', error);
        }
    }
    
    /**
     * Set up tab click handlers that emit events to EventManager
     */
    setupTabClickHandlers() {
        console.log('🔧 Setting up tab click handlers with EventManager...');
        
        // Set up each tab to emit events instead of direct calls
        const tabs = [
            { id: 'admin-dashboard-tab', name: 'dashboard' },
            { id: 'admin-users-tab', name: 'users' },
            { id: 'admin-locks-tab', name: 'locks' },
            { id: 'admin-canvases-tab', name: 'canvases' },
            { id: 'admin-reports-tab', name: 'reports' }
        ];
        
        tabs.forEach(tab => {
            const element = document.getElementById(tab.id);
            if (element) {
                element.addEventListener('click', () => {
                    console.log(`🔧 Tab ${tab.name} clicked, emitting adminTabClick event`);
                    window.eventManager.emit('adminTabClick', tab.name);
                });
                console.log(`✅ Set up EventManager handler for ${tab.name} tab`);
            } else {
                console.warn(`⚠️ Tab element not found: ${tab.id}`);
            }
        });
    }
    
    /**
     * Fallback method for direct DOM listeners if EventManager not available
     */
    setupDirectTabListeners() {
        console.log('🔧 Setting up fallback direct DOM listeners...');
        
        // Navigation tabs
        document.getElementById('admin-dashboard-tab')?.addEventListener('click', () => this.showView('dashboard'));
        document.getElementById('admin-users-tab')?.addEventListener('click', () => this.showView('users'));
        document.getElementById('admin-locks-tab')?.addEventListener('click', () => this.showView('locks'));
        document.getElementById('admin-canvases-tab')?.addEventListener('click', () => this.showView('canvases'));
        document.getElementById('admin-reports-tab')?.addEventListener('click', () => this.showView('reports'));
    }
    
    async showView(viewName) {
        this.currentView = viewName;
        
        // Initialize if not already done
        if (!this.initialized) {
            console.log('🔧 Admin panel not initialized, initializing now...');
            this.init();
        }
        
        // Hide all views
        document.querySelectorAll('.admin-view').forEach(view => view.style.display = 'none');
        
        // Show selected view
        const targetView = document.getElementById(`admin-${viewName}-view`);
        if (targetView) {
            targetView.style.display = 'block';
            
            // Only load data if we're not already on this view or if it's the first time
            if (this.currentView !== viewName || !this.initialized) {
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
                    case 'canvases':
                        await this.loadCanvases();
                        break;
                    case 'reports':
                        await this.loadReports();
                        break;
                }
            }
        }
        
        // Update active tab
        document.querySelectorAll('.admin-tab').forEach(tab => tab.classList.remove('active'));
        document.getElementById(`admin-${viewName}-tab`)?.classList.add('active');
    }
    
    async loadDashboard() {
        // Prevent multiple simultaneous dashboard loads
        if (this._dashboardLoading) {
            console.log('⏳ Dashboard already loading, skipping duplicate request...');
            return;
        }
        
        this._dashboardLoading = true;
        
        try {
            console.log('🔄 Loading dashboard...');
            console.log('🔍 Auth token available:', this.getAuthToken() ? 'Yes' : 'No');
            console.log('🔍 Auth token value:', this.getAuthToken() ? 'Present' : 'Missing');
            
            // Add timeout to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                console.log('⏰ Dashboard request timeout reached, aborting...');
                controller.abort();
            }, 5000); // 5 second timeout for faster testing
            
            console.log('📡 Making fetch request to /api/v1/admin/reports/system-overview...');
            
            const response = await fetch('/api/v1/admin/reports/system-overview', {
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            console.log('📡 Dashboard response received, status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('📊 Dashboard data loaded:', data);
                this.renderDashboard(data);
            } else {
                console.error('❌ Dashboard response not ok:', response.status, response.statusText);
                const errorText = await response.text();
                console.error('❌ Error details:', errorText);
                throw new Error(`Failed to load dashboard data: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            console.error('❌ Error loading dashboard:', error);
            console.error('❌ Error name:', error.name);
            console.error('❌ Error message:', error.message);
            if (error.name === 'AbortError') {
                console.log('⏰ Request was aborted due to timeout');
                this.showError('Dashboard request timed out. Please try again.');
                // Show a basic dashboard view instead of hanging
                this.renderBasicDashboard();
            } else {
                this.showError('Failed to load dashboard data');
                // Show a basic dashboard view instead of hanging
                this.renderBasicDashboard();
            }
        } finally {
            this._dashboardLoading = false;
        }
    }
    
    async loadUsers() {
        // Prevent multiple simultaneous loads
        if (this._usersLoading) {
            console.log('⏳ Users already loading, skipping duplicate request...');
            return;
        }
        
        if (!this.isUserAuthenticated()) {
            console.log('❌ User not authenticated, cannot load users');
            this.showError('Please log in to access admin features');
            return;
        }
        
        this._usersLoading = true;
        
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
        } finally {
            this._usersLoading = false;
        }
    }
    
    async loadLocks() {
        if (!this.isUserAuthenticated()) {
            console.log('❌ User not authenticated, cannot load locks');
            this.showError('Please log in to access admin features');
            return;
        }
        
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

    async loadCanvases() {
        if (!this.isUserAuthenticated()) {
            console.log('❌ User not authenticated, cannot load canvases');
            this.showError('Please log in to access admin features');
            return;
        }
        
        try {
            console.log('🔄 Loading canvases...');
            console.log('�� Auth token:', this.getAuthToken() ? 'Present' : 'Missing');
            
            const response = await fetch('/api/v1/admin/canvases', {
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });
            
            console.log('📡 Canvas response status:', response.status);
            console.log('📡 Canvas response headers:', response.headers);
            
            if (response.ok) {
                const canvases = await response.json();
                console.log('🎨 Loaded canvases from admin API:', canvases);
                this.renderCanvases(canvases);
            } else {
                console.error('❌ Failed to load canvases:', response.status, response.statusText);
                const errorText = await response.text();
                console.error('❌ Error details:', errorText);
                console.error('❌ Response URL:', response.url);
            }
        } catch (error) {
            console.error('❌ Error loading canvases:', error);
            console.error('❌ Error name:', error.name);
            console.error('❌ Error message:', error.message);
            console.error('❌ Error stack:', error.stack);
            this.showError('Failed to load canvases');
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
    
    renderBasicDashboard() {
        const dashboard = document.getElementById('admin-dashboard-view');
        if (!dashboard) return;
        
        console.log('🔄 Rendering basic dashboard due to API failure...');
        
        dashboard.innerHTML = `
            <div class="admin-stats-grid">
                <div class="stat-card">
                    <h3>⚠️ Dashboard Unavailable</h3>
                    <div class="stat-number">--</div>
                    <div class="stat-detail">API request failed or timed out</div>
                </div>
                <div class="stat-card">
                    <h3>🔄 Quick Actions</h3>
                    <div class="stat-number">--</div>
                    <div class="stat-detail">Use tabs above to access features</div>
                </div>
            </div>
            <div class="admin-actions">
                <button onclick="adminPanelManager.loadUsers()" class="btn btn-primary">Load Users</button>
                <button onclick="adminPanelManager.loadCanvases()" class="btn btn-primary">Load Canvases</button>
                <button onclick="adminPanelManager.loadLocks()" class="btn btn-primary">Load Locks</button>
                <button onclick="adminPanelManager.loadDashboard()" class="btn btn-warning">Retry Dashboard</button>
            </div>
        `;
        
        console.log('✅ Basic dashboard rendered');
    }
    
    renderLoginPrompt() {
        const dashboard = document.getElementById('admin-dashboard-view');
        if (!dashboard) return;
        
        console.log('🔐 Rendering login prompt...');
        
        dashboard.innerHTML = `
            <div class="admin-stats-grid">
                <div class="stat-card">
                    <h3>🔐 Authentication Required</h3>
                    <div class="stat-number">--</div>
                    <div class="stat-detail">Please log in to access admin features</div>
                </div>
                <div class="stat-card">
                    <h3>🔄 Quick Actions</h3>
                    <div class="stat-number">--</div>
                    <div class="stat-detail">Use tabs above to access features</div>
                </div>
            </div>
            <div class="admin-actions">
                <button onclick="adminPanelManager.checkAuthentication()" class="btn btn-primary">Check Authentication</button>
                <button onclick="adminPanelManager.loadUsers()" class="btn btn-secondary">Try Load Users</button>
                <button onclick="adminPanelManager.loadCanvases()" class="btn btn-secondary">Try Load Canvases</button>
            </div>
        `;
        
        console.log('✅ Login prompt rendered');
    }
    
    renderUsers(users) {
        const usersView = document.getElementById('admin-users-view');
        if (!usersView) return;
        
        usersView.innerHTML = `
            <div class="admin-header">
                <h2>User Management</h2>
                <div class="admin-actions">
                    <button class="btn btn-primary" onclick="adminPanelManager.createUser()">Create User</button>
                    <button class="btn btn-warning" onclick="adminPanelManager.cleanupInactiveUsers()" title="Remove all inactive users">
                        🗑️ Cleanup Inactive Users
                    </button>
                </div>
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
                                    <button class="btn btn-sm btn-secondary" onclick="adminPanelManager.editUser(${user.id})">Edit</button>
                                    <button class="btn btn-sm btn-warning" onclick="adminPanelManager.toggleUserStatus(${user.id})">
                                        ${user.is_active ? 'Deactivate' : 'Activate'}
                                    </button>
                                    <button class="btn btn-sm btn-danger" onclick="adminPanelManager.deleteUser(${user.id})">Delete</button>
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
                    <button class="btn btn-warning" onclick="adminPanelManager.cleanupExpiredLocks()">Cleanup Expired</button>
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
                                    <button class="btn btn-sm btn-danger" onclick="adminPanelManager.forceReleaseLock(${lock.tile_id})">
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
                    <button class="btn btn-primary" onclick="adminPanelManager.exportReport()">Export Report</button>
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

    renderCanvases(canvases) {
        console.log(' Rendering canvases:', canvases);
        
        // Add cleanup button above the table
        const canvasesView = document.getElementById('admin-canvases-view');
        if (canvasesView) {
            // Check if cleanup button already exists
            if (!canvasesView.querySelector('.cleanup-inactive-canvases-btn')) {
                const header = canvasesView.querySelector('.admin-header') || canvasesView.querySelector('h2');
                if (header) {
                    const cleanupBtn = document.createElement('button');
                    cleanupBtn.className = 'btn btn-warning cleanup-inactive-canvases-btn';
                    cleanupBtn.innerHTML = '🗑️ Cleanup Inactive Canvases';
                    cleanupBtn.title = 'Remove all inactive canvases';
                    cleanupBtn.onclick = () => adminPanelManager.cleanupInactiveCanvases();
                    
                    if (header.tagName === 'H2') {
                        header.parentNode.insertBefore(cleanupBtn, header.nextSibling);
                    } else {
                        header.appendChild(cleanupBtn);
                    }
                }
            }
        }
        
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
                    <button class="btn-admin btn-view" onclick="adminPanelManager.viewCanvasDetails(${canvas.id})" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-admin btn-edit" onclick="adminPanelManager.editCanvas(${canvas.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-admin btn-toggle" onclick="adminPanelManager.toggleCanvasStatus(${canvas.id})" title="Toggle Status">
                        <i class="fas fa-toggle-on"></i>
                    </button>
                    <button class="btn-admin btn-delete" onclick="adminPanelManager.deleteCanvas(${canvas.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        
        console.log('✅ Canvas table updated with', canvases.length, 'canvases');
    }
    
    // Action Methods
    
    async cleanupExpiredLocks() {
        if (!this.isUserAuthenticated()) {
            console.log('❌ User not authenticated, cannot cleanup locks');
            this.showError('Please log in to access admin features');
            return;
        }
        
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

    async toggleCanvasStatus(canvasId) {
        try {
            const response = await fetch(`/api/v1/admin/canvases/${canvasId}/toggle-status`, {
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
                throw new Error('Failed to toggle canvas status');
            }
        } catch (error) {
            console.error('❌ Error toggling canvas status:', error);
            this.showError('Failed to toggle canvas status');
        }
    }

    async deleteCanvas(canvasId) {
        if (!confirm(`Are you sure you want to delete canvas ${canvasId}? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/v1/admin/canvases/${canvasId}`, {
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
                throw new Error('Failed to delete canvas');
            }
        } catch (error) {
            console.error('❌ Error deleting canvas:', error);
            this.showError('Failed to delete canvas');
        }
    }

    viewCanvasDetails(canvasId) {
        alert(`View canvas details for canvas ID: ${canvasId}`);
    }

    editCanvas(canvasId) {
        alert(`Edit canvas ${canvasId} feature coming soon!`);
    }
    
    exportReport() {
        // Implement report export
        alert('Report export feature coming soon!');
    }

    isUserAuthenticated() {
        const token = this.getAuthToken();
        return !!token && token !== 'null' && token !== 'undefined';
    }
    
    getAuthToken() {
        // Debug logging to see what authentication sources are available
        console.log('🔍 Debugging getAuthToken:');
        console.log('  - CONFIG_UTILS available:', !!window.CONFIG_UTILS);
        console.log('  - CONFIG_UTILS.getAuthToken available:', !!(window.CONFIG_UTILS && window.CONFIG_UTILS.getAuthToken));
        console.log('  - appState available:', !!window.appState);
        console.log('  - appState.get available:', !!(window.appState && window.appState.get));
        
        // Use the standard authentication method that the rest of the app uses
        if (window.CONFIG_UTILS && window.CONFIG_UTILS.getAuthToken) {
            const token = window.CONFIG_UTILS.getAuthToken();
            console.log('  - CONFIG_UTILS.getAuthToken() result:', token ? 'Present' : 'Missing');
            return token;
        }
        
        // Fallback to appState if CONFIG_UTILS is not available
        if (window.appState && window.appState.get) {
            const token = window.appState.get('authToken');
            console.log('  - appState.get("authToken") result:', token ? 'Present' : 'Missing');
            return token;
        }
        
        // Final fallback to localStorage if neither is available
        const localStorageToken = localStorage.getItem('token') || 
                                localStorage.getItem('authToken') || 
                                localStorage.getItem('access_token') ||
                                sessionStorage.getItem('token') ||
                                null;
        console.log('  - localStorage fallback result:', localStorageToken ? 'Present' : 'Missing');
        return localStorageToken;
    }

    showError(message) {
        console.error('❌ Admin Panel Error:', message);
        // Optional: Add user-friendly error display
        // this.showToast(message, 'error');
    }
    
    checkAuthentication() {
        console.log('🔍 Checking authentication status...');
        if (this.isUserAuthenticated()) {
            console.log('✅ User is now authenticated, loading dashboard...');
            this.loadDashboard();
        } else {
            console.log('❌ User still not authenticated');
            this.showError('Please log in to access admin features');
        }
    }
    
    refreshAfterLogin() {
        console.log('🔄 Refreshing admin panel after login...');
        if (this.isUserAuthenticated()) {
            // If we're on the dashboard view, reload it
            if (this.currentView === 'dashboard') {
                this.loadDashboard();
            }
            // Otherwise, just refresh the current view
            else {
                this.refreshCurrentView();
            }
        }
    }

    // Add missing methods that the admin panel needs
    refreshCurrentView() {
        this.showView(this.currentView);
    }

    showSuccess(message) {
        // Simple success display for now
        console.log('✅ Success:', message);
        alert(message); // Replace with better UI later
    }

    createUser() {
        // Implement user creation modal
        alert('User creation feature coming soon!');
    }

    editUser(userId) {
        // Implement user editing modal
        alert(`Edit user ${userId} feature coming soon!`);
    }

    // Cleanup Methods
    
    async cleanupInactiveUsers() {
        if (!this.isUserAuthenticated()) {
            console.log('❌ User not authenticated, cannot cleanup users');
            this.showError('Please log in to access admin features');
            return;
        }
        
        if (!confirm('⚠️ WARNING: This will permanently delete ALL inactive users!\n\nThis action cannot be undone. Are you sure you want to continue?')) {
            return;
        }
        
        try {
            console.log('🧹 Starting cleanup of inactive users...');
            
            const response = await fetch('/api/v1/admin/users/cleanup-inactive', {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                this.showSuccess(`✅ Cleanup completed! ${result.deleted_count} inactive users removed.`);
                this.refreshCurrentView();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to cleanup inactive users');
            }
        } catch (error) {
            console.error('❌ Error cleaning up inactive users:', error);
            this.showError(`Failed to cleanup inactive users: ${error.message}`);
        }
    }

    async cleanupInactiveCanvases() {
        if (!this.isUserAuthenticated()) {
            console.log('❌ User not authenticated, cannot cleanup canvases');
            this.showError('Please log in to access admin features');
            return;
        }
        
        if (!confirm('⚠️ WARNING: This will permanently delete ALL inactive canvases!\n\nThis action cannot be undone. Are you sure you want to continue?')) {
            return;
        }
        
        try {
            console.log('🧹 Starting cleanup of inactive canvases...');
            
            const response = await fetch('/api/v1/admin/canvases/cleanup-inactive', {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                this.showSuccess(`✅ Cleanup completed! ${result.deleted_count} inactive canvases removed.`);
                this.refreshCurrentView();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to cleanup inactive canvases');
            }
        } catch (error) {
            console.error('❌ Error cleaning up inactive canvases:', error);
            this.showError(`Failed to cleanup inactive canvases: ${error.message}`);
        }
    }
}

// Remove duplicate instance - use only adminPanelManager from managers system
// window.adminPanel = new AdminPanelManager();
