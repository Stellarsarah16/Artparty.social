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
            return;
        }
        
        console.log('🔧 Admin Panel Manager initialization started...');
        
        try {
            this.setupEventListeners();
            
            // Defer authentication check to allow for proper initialization
            setTimeout(() => {
                this.checkAuthenticationAndLoad();
            }, 200);
            
            this.initialized = true;
            console.log('✅ Admin Panel Manager initialization completed');
            
        } catch (error) {
            console.error('❌ Admin Panel Manager initialization failed:', error);
            this.initialized = false;
            throw error; // Re-throw to let the caller know initialization failed
        }
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
        
        // FIXED: Don't attach action button listeners here - they're attached after rendering
        // Action buttons are handled by individual render methods
        
        // Listen for authentication changes
        try {
            if (window.eventManager && typeof window.eventManager.on === 'function') {
                console.log('🔧 Setting up event manager listeners...');
                window.eventManager.on('userLogin', (userData) => {
                    console.log('🔐 User logged in, refreshing admin panel...', userData);
                    this.refreshAfterLogin();
                });
                
                window.eventManager.on('userLogout', () => {
                    console.log('🔐 User logged out, showing login prompt...');
                    this.renderLoginPrompt();
                });
                
                // Listen for authentication state changes
                window.eventManager.on('authStateChanged', (userData) => {
                    console.log('🔐 Auth state changed, checking admin panel...', userData);
                    this.checkAuthenticationAndLoad();
                });
                
                // Listen for admin panel ready event
                window.eventManager.on('adminPanelReady', (userData) => {
                    console.log('🔧 Admin panel ready event received:', userData);
                    this.refreshAfterLogin();
                });
                
                // Listen for admin panel init failed event
                window.eventManager.on('adminPanelInitFailed', (data) => {
                    console.log('❌ Admin panel init failed event received:', data);
                    this.renderInitFailedMessage(data);
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
                    } else if (newUser && oldUser) {
                        console.log('🔐 User data updated, checking admin panel...');
                        this.checkAuthenticationAndLoad();
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
        console.log('🔧 showView called with:', viewName);
        
        // Store the previous view before updating
        const previousView = this.currentView;
        
        // Initialize if not already done
        if (!this.initialized) {
            console.log('🔧 Admin panel not initialized, initializing now...');
            this.init();
            
            // FIXED: Wait for initialization to complete before proceeding
            let attempts = 0;
            while (!this.initialized && attempts < 50) {
                await new Promise(resolve => setTimeout(resolve, 10));
                attempts++;
            }
            
            if (!this.initialized) {
                console.error('❌ Admin panel failed to initialize');
                return;
            }
        }
        
        // Hide all views
        document.querySelectorAll('.admin-view').forEach(view => view.style.display = 'none');
        
        // Show selected view
        const targetView = document.getElementById(`admin-${viewName}-view`);
        if (targetView) {
            console.log('🔧 Target view found:', targetView.id);
            targetView.style.display = 'block';
            
            // FIXED: Check if we're switching to a different view or if it's the first time
            if (previousView !== viewName || !this.initialized) {
                console.log('🔧 Loading data for view:', viewName);
                
                // Load data for the view
                switch (viewName) {
                    case 'dashboard':
                        console.log('🔧 Case: dashboard');
                        await this.loadDashboard();
                        break;
                    case 'users':
                        console.log('🔧 Case: users');
                        await this.loadUsers();
                        break;
                    case 'locks':
                        console.log('🔧 Case: locks');
                        await this.loadLocks();
                        break;
                    case 'canvases':
                        console.log('🔧 Case: canvases - calling loadCanvases()');
                        await this.loadCanvases();
                        break;
                    case 'reports':
                        console.log('🔧 Case: reports');
                        await this.loadReports();
                        break;
                }
            } else {
                console.log('🔧 Skipping data load - already on this view and initialized');
            }
            
            // Update current view AFTER loading data
            this.currentView = viewName;
        } else {
            console.error('❌ Target view not found:', `admin-${viewName}-view`);
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
            
            // FIXED: Use buildAdminApiUrl instead of hardcoded URL
            const apiUrl = this.buildAdminApiUrl('reports/system-overview');
            console.log('📡 Making fetch request to:', apiUrl);
            
            const response = await fetch(apiUrl, {
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
            console.log('🔄 Loading users from admin API...');
            console.log('🔍 Auth token:', this.getAuthToken() ? 'Present' : 'Missing');
            
            // FIXED: Use correct API endpoint with base URL
            const apiUrl = this.buildAdminApiUrl('users');
            console.log('🔧 Making request to:', apiUrl);
            
            const response = await fetch(apiUrl, {
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });
            
            console.log('📡 Users response status:', response.status);
            console.log('📡 Users response headers:', response.headers);
            
            if (response.ok) {
                const users = await response.json();
                console.log('👥 Loaded users from admin API:', users);
                this.renderUsers(users);
            } else {
                console.error('❌ Failed to load users:', response.status, response.statusText);
                const errorText = await response.text();
                console.error('❌ Error details:', errorText);
                throw new Error(`Failed to load users: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            console.error('❌ Error loading users:', error);
            console.error('❌ Error name:', error.name);
            console.error('❌ Error message:', error.message);
            this.showError(`Failed to load users: ${error.message}`);
            
            // Show a basic users view instead of hanging
            this.renderBasicUsers();
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
            console.log('🔄 Loading locks from admin API...');
            console.log('🔍 Auth token:', this.getAuthToken() ? 'Present' : 'Missing');
            
            // FIXED: Use correct API endpoint with base URL
            const apiUrl = this.buildAdminApiUrl('locks');
            console.log('🔧 API URL:', apiUrl);
            
            const response = await fetch(apiUrl, {
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });
            
            console.log('📡 Locks response status:', response.status);
            console.log('📡 Locks response headers:', response.headers);
            
            if (response.ok) {
                const locks = await response.json();
                console.log('🔒 Loaded locks from admin API:', locks);
                this.renderLocks(locks);
            } else {
                console.error('❌ Failed to load locks:', response.status, response.statusText);
                const errorText = await response.text();
                console.error('❌ Error details:', errorText);
                throw new Error(`Failed to load locks: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            console.error('❌ Error loading locks:', error);
            console.error('❌ Error name:', error.name);
            console.error('❌ Error message:', error.message);
            this.showError(`Failed to load locks: ${error.message}`);
            
            // Show a basic locks view instead of hanging
            this.renderBasicLocks();
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
        console.log('🔧 loadCanvases() method called!');
        
        if (!this.isUserAuthenticated()) {
            console.log('❌ User not authenticated, cannot load canvases');
            this.showError('Please log in to access admin features');
            return;
        }
        
        try {
            console.log('🔄 Loading canvases from admin API...');
            console.log('🔍 Auth token:', this.getAuthToken() ? 'Present' : 'Missing');
            
            // FIXED: Use correct API endpoint with base URL
            const apiUrl = this.buildAdminApiUrl('canvases');
            console.log('🔧 API URL:', apiUrl);
            
            const response = await fetch(apiUrl, {
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });
            
            console.log('📡 Canvases response status:', response.status);
            console.log('📡 Canvases response headers:', response.headers);
            
            if (response.ok) {
                const canvases = await response.json();
                console.log('🎨 Loaded canvases from admin API:', canvases);
                this.renderCanvases(canvases);
            } else {
                console.error('❌ Failed to load canvases:', response.status, response.statusText);
                const errorText = await response.text();
                console.error('❌ Error details:', errorText);
                throw new Error(`Failed to load canvases: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            console.error('❌ Error loading canvases:', error);
            console.error('❌ Error name:', error.name);
            console.error('❌ Error message:', error.message);
            this.showError(`Failed to load canvases: ${error.message}`);
            
            // Show a basic canvases view instead of hanging
            this.renderBasicCanvases();
        }
    }
    
         renderDashboard(data) {
         const dashboard = document.getElementById('admin-dashboard-view');
         if (!dashboard) return;
         
         dashboard.innerHTML = `
             <div class="admin-header">
                 <h2>Admin Dashboard</h2>
                 <div class="admin-actions">
                     <button class="btn btn-secondary" onclick="adminPanelManager.goBackToMainApp()">
                         <i class="fas fa-arrow-left"></i> Back to App
                     </button>
                     <button id="refresh-data-btn" class="btn btn-primary">Refresh Data</button>
                 </div>
             </div>
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
             </div>
        `;
        
        // FIXED: Attach event listeners to the newly rendered buttons
        this.attachDashboardEventListeners();
    }

    /**
     * Attach event listeners specifically to dashboard buttons
     */
    attachDashboardEventListeners() {
        console.log('🔧 Attaching dashboard event listeners...');
        
        // Refresh data button
        const refreshBtn = document.getElementById('refresh-data-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                console.log('🔄 Refresh button clicked, reloading dashboard...');
                this.loadDashboard();
            });
            console.log('✅ Refresh button listener attached');
        }
        
        // Cleanup locks button
        const cleanupBtn = document.getElementById('cleanup-locks-btn');
        if (cleanupBtn) {
            cleanupBtn.addEventListener('click', () => {
                console.log('🧹 Cleanup button clicked...');
                this.cleanupExpiredLocks();
            });
            console.log('✅ Cleanup button listener attached');
        }
        
        console.log('✅ Dashboard event listeners attached');
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
                <button class="btn btn-primary" onclick="adminPanelManager.loadUsers()">Load Users</button>
                <button class="btn btn-primary" onclick="adminPanelManager.loadCanvases()">Load Canvases</button>
                <button class="btn btn-primary" onclick="adminPanelManager.loadLocks()">Load Locks</button>
                <button class="btn btn-warning" onclick="adminPanelManager.loadDashboard()">Retry Dashboard</button>
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
                     <button class="btn btn-secondary" onclick="adminPanelManager.goBackToMainApp()">
                         <i class="fas fa-arrow-left"></i> Back to App
                     </button>
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
        
        // FIXED: Attach event listeners to user action buttons
        this.attachUserEventListeners();
    }

    /**
     * Attach event listeners to user action buttons
     */
    attachUserEventListeners() {
        console.log('🔧 Attaching user event listeners...');
        
        // Add any specific user view event listeners here if needed
        // Most user actions use onclick handlers, so this is mainly for future extensibility
        
        console.log('✅ User event listeners attached');
    }

         renderLocks(locks) {
         const locksView = document.getElementById('admin-locks-view');
         if (!locksView) return;
         
         locksView.innerHTML = `
             <div class="admin-header">
                 <h2>Tile Lock Management</h2>
                 <div class="admin-actions">
                     <button class="btn btn-secondary" onclick="adminPanelManager.goBackToMainApp()">
                         <i class="fas fa-arrow-left"></i> Back to App
                     </button>
                     <button class="btn btn-warning" onclick="adminPanelManager.cleanupExpiredLocks()">Cleanup Expired</button>
                 </div>
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
        
        // FIXED: Attach event listeners to lock action buttons
        this.attachLockEventListeners();
    }

    /**
     * Attach event listeners to lock action buttons
     */
    attachLockEventListeners() {
        console.log('🔧 Attaching lock event listeners...');
        
        // Add any specific lock view event listeners here if needed
        // Most lock actions use onclick handlers, so this is mainly for future extensibility
        
        console.log('✅ Lock event listeners attached');
    }

         renderReports(data) {
         const reportsView = document.getElementById('admin-reports-view');
         if (!reportsView) return;
         
         reportsView.innerHTML = `
             <div class="admin-header">
                 <h2>System Reports</h2>
                 <div class="admin-actions">
                     <button class="btn btn-secondary" onclick="adminPanelManager.goBackToMainApp()">
                         <i class="fas fa-arrow-left"></i> Back to App
                     </button>
                     <button class="btn btn-primary" onclick="adminPanelManager.exportReport()">Export Report</button>
                 </div>
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
        console.log('🎨 Rendering canvases:', canvases);
        
        const canvasesView = document.getElementById('admin-canvases-view');
        if (!canvasesView) {
            console.error('❌ Canvases view not found');
            return;
        }
        
                 // FIXED: Always render the header with cleanup button
         canvasesView.innerHTML = `
             <div class="admin-header">
                 <h2>Canvas Management</h2>
                 <div class="admin-actions">
                     <button class="btn btn-secondary" onclick="adminPanelManager.goBackToMainApp()">
                         <i class="fas fa-arrow-left"></i> Back to App
                     </button>
                     <button class="btn btn-warning cleanup-inactive-canvases-btn" onclick="adminPanelManager.cleanupInactiveCanvases()">
                         🗑️ Cleanup Inactive Canvases
                     </button>
                 </div>
             </div>
            <div class="admin-table-container">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Dimensions</th>
                            <th>Tile Size</th>
                            <th>Settings</th>
                            <th>Status</th>
                            <th>Max Tiles</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="canvases-tbody">
                        ${Array.isArray(canvases) ? canvases.map(canvas => `
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
                        `).join('') : '<tr><td colspan="9">No canvases found</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
        
        // FIXED: Attach event listeners to canvas action buttons
        this.attachCanvasEventListeners();
        
        console.log('✅ Canvas table updated with', Array.isArray(canvases) ? canvases.length : 0, 'canvases');
    }

    /**
     * Attach event listeners to canvas action buttons
     */
    attachCanvasEventListeners() {
        console.log('🔧 Attaching canvas event listeners...');
        
        // Add any specific canvas view event listeners here if needed
        // Most canvas actions use onclick handlers, so this is mainly for future extensibility
        
        console.log('✅ Canvas event listeners attached');
    }
    
    // Action Methods
    
         async cleanupExpiredLocks() {
         if (!this.isUserAuthenticated()) {
             console.log('❌ User not authenticated, cannot cleanup locks');
             this.showError('Please log in to access admin features');
             return;
         }
         
         try {
             // FIXED: Use buildAdminApiUrl instead of hardcoded URL
             const apiUrl = this.buildAdminApiUrl('locks/cleanup');
             console.log('🧹 Making cleanup request to:', apiUrl);
             
             const response = await fetch(apiUrl, {
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
             // FIXED: Use buildAdminApiUrl instead of hardcoded URL
             const apiUrl = this.buildAdminApiUrl(`locks/${tileId}`);
             console.log('🔓 Making force release request to:', apiUrl);
             
             const response = await fetch(apiUrl, {
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
             // FIXED: Use buildAdminApiUrl instead of hardcoded URL
             const apiUrl = this.buildAdminApiUrl(`users/${userId}/toggle-status`);
             console.log('🔄 Making toggle status request to:', apiUrl);
             
             const response = await fetch(apiUrl, {
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
             // FIXED: Use buildAdminApiUrl instead of hardcoded URL
             const apiUrl = this.buildAdminApiUrl(`users/${userId}`);
             console.log('🗑️ Making delete user request to:', apiUrl);
             
             const response = await fetch(apiUrl, {
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
             // FIXED: Use buildAdminApiUrl instead of hardcoded URL
             const apiUrl = this.buildAdminApiUrl(`canvases/${canvasId}/toggle-status`);
             console.log('🔄 Making toggle canvas status request to:', apiUrl);
             
             const response = await fetch(apiUrl, {
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
             // FIXED: Use buildAdminApiUrl instead of hardcoded URL
             const apiUrl = this.buildAdminApiUrl(`canvases/${canvasId}`);
             console.log('🗑️ Making delete canvas request to:', apiUrl);
             
             const response = await fetch(apiUrl, {
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
        const userData = this.getUserData();
        
        // More robust authentication check
        if (!token || !userData) {
            console.log('❌ No token or user data found');
            return false;
        }
        
        // Check if user has admin privileges
        if (!userData.is_admin && !userData.is_superuser) {
            console.log('❌ User does not have admin privileges');
            return false;
        }
        
        console.log('✅ User authenticated and has admin privileges');
        return true;
    }
    
    getUserData() {
        // Try multiple sources for user data
        if (window.CONFIG_UTILS && window.CONFIG_UTILS.getUserData) {
            return window.CONFIG_UTILS.getUserData();
        }
        
        if (window.appState && window.appState.get) {
            return window.appState.get('currentUser');
        }
        
        // Fallback to localStorage
        try {
            const userData = localStorage.getItem('userData') || 
                            localStorage.getItem('user') ||
                            sessionStorage.getItem('userData') ||
                            sessionStorage.getItem('user');
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('Error parsing user data:', error);
            return null;
        }
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
            
                         // FIXED: Use buildAdminApiUrl instead of hardcoded URL
             const apiUrl = this.buildAdminApiUrl('users/cleanup-inactive');
             console.log('🧹 Making cleanup inactive users request to:', apiUrl);
             
             const response = await fetch(apiUrl, {
                 method: 'DELETE',
                 headers: {
                     'Authorization': `Bearer ${this.getAuthToken()}`
                 }
             });
            
            console.log('📡 Cleanup response status:', response.status);
            
            if (response.ok) {
                const result = await response.json();
                this.showSuccess(`✅ Cleanup completed! ${result.deleted_count} inactive users removed.`);
                this.refreshCurrentView();
            } else {
                // FIXED: Better error handling for different status codes
                let errorMessage = 'Unknown error';
                
                try {
                    const errorData = await response.json();
                    console.log('📡 Error response data:', errorData);
                    
                    if (response.status === 404) {
                        errorMessage = 'Cleanup endpoint not found. Please contact an administrator.';
                    } else if (response.status === 422) {
                        // Handle validation errors more gracefully
                        if (errorData.detail) {
                            if (Array.isArray(errorData.detail)) {
                                // If detail is an array of validation errors
                                const errorMessages = errorData.detail.map(err => err.msg).join(', ');
                                errorMessage = `Validation errors: ${errorMessages}`;
                            } else if (typeof errorData.detail === 'object') {
                                errorMessage = `Validation error: ${JSON.stringify(errorData.detail)}`;
                            } else {
                                errorMessage = `Validation error: ${errorData.detail}`;
                            }
                        } else if (errorData.message) {
                            errorMessage = errorData.message;
                        } else {
                            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                        }
                    } else {
                        errorMessage = errorData.detail || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
                    }
                } catch (parseError) {
                    console.error('❌ Failed to parse error response:', parseError);
                    errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                }
                
                throw new Error(errorMessage);
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
            
                         // FIXED: Use buildAdminApiUrl instead of hardcoded URL
             const apiUrl = this.buildAdminApiUrl('canvases/cleanup-inactive');
             console.log('🧹 Making cleanup inactive canvases request to:', apiUrl);
             
             const response = await fetch(apiUrl, {
                 method: 'DELETE',
                 headers: {
                     'Authorization': `Bearer ${this.getAuthToken()}`
                 }
             });
            
            console.log('📡 Cleanup response status:', response.status);
            
            if (response.ok) {
                const result = await response.json();
                this.showSuccess(`✅ Cleanup completed! ${result.deleted_count} inactive canvases removed.`);
                this.refreshCurrentView();
            } else {
                // FIXED: Better error handling for different status codes
                let errorMessage = 'Unknown error';
                
                try {
                    const errorData = await response.json();
                    console.log('📡 Error response data:', errorData);
                    
                    if (response.status === 404) {
                        errorMessage = 'Cleanup endpoint not found. Please contact an administrator.';
                    } else if (response.status === 422) {
                        // Handle validation errors more gracefully
                        if (errorData.detail) {
                            if (Array.isArray(errorData.detail)) {
                                // If detail is an array of validation errors
                                const errorMessages = errorData.detail.map(err => err.msg).join(', ');
                                errorMessage = `Validation errors: ${errorMessages}`;
                            } else if (typeof errorData.detail === 'object') {
                                errorMessage = `Validation error: ${JSON.stringify(errorData.detail)}`;
                            } else {
                                errorMessage = `Validation error: ${errorData.detail}`;
                            }
                        } else if (errorData.message) {
                            errorMessage = errorData.message;
                        } else {
                            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                        }
                    } else {
                        errorMessage = errorData.detail || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
                    }
                } catch (parseError) {
                    console.error('❌ Failed to parse error response:', parseError);
                    errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                }
                
                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error('❌ Error cleaning up inactive canvases:', error);
            this.showError(`Failed to cleanup inactive canvases: ${error.message}`);
        }
    }
    
    /**
     * Render basic users view when API fails
     */
    renderBasicUsers() {
        const usersView = document.getElementById('admin-users-view');
        if (!usersView) return;
        
        console.log('🔄 Rendering basic users view due to API failure...');
        
        usersView.innerHTML = `
            <div class="admin-header">
                <h2>⚠️ Users Unavailable</h2>
                <div class="admin-actions">
                    <button class="btn btn-primary" onclick="adminPanelManager.loadUsers()">Retry Load Users</button>
                </div>
            </div>
            <div class="admin-error-message">
                <p>❌ Failed to load users from API. Please check your connection and try again.</p>
                <p><strong>Error:</strong> API request failed or timed out</p>
            </div>
        `;
        
        console.log('✅ Basic users view rendered');
    }
    
    /**
     * Render basic locks view when API fails
     */
    renderBasicLocks() {
        const locksView = document.getElementById('admin-locks-view');
        if (!locksView) return;
        
        console.log('🔄 Rendering basic locks view due to API failure...');
        
        locksView.innerHTML = `
            <div class="admin-header">
                <h2>⚠️ Tile Locks Unavailable</h2>
                <div class="admin-actions">
                    <button class="btn btn-primary" onclick="adminPanelManager.loadLocks()">Retry Load Locks</button>
                </div>
            </div>
            <div class="admin-error-message">
                <p>❌ Failed to load tile locks from API. Please check your connection and try again.</p>
                <p><strong>Error:</strong> API request failed or timed out</p>
            </div>
        `;
        
        console.log('✅ Basic locks view rendered');
    }
    
    /**
     * Render basic canvases view when API fails
     */
    renderBasicCanvases() {
        const canvasesView = document.getElementById('admin-canvases-view');
        if (!canvasesView) return;
        
        console.log('🔄 Rendering basic canvases view due to API failure...');
        
        canvasesView.innerHTML = `
            <div class="admin-header">
                <h2>⚠️ Canvases Unavailable</h2>
                <div class="admin-actions">
                    <button class="btn btn-primary" onclick="adminPanelManager.loadCanvases()">Retry Load Canvases</button>
                </div>
            </div>
            <div class="admin-error-message">
                <p>❌ Failed to load canvases from API. Please check your connection and try again.</p>
                <p><strong>Error:</strong> API request failed or timed out</p>
            </div>
        `;
        
        console.log('✅ Basic canvases view rendered');
    }

    /**
     * Test admin API connectivity
     */
    async testAdminApiConnectivity() {
        console.log('🧪 Testing admin API connectivity...');
        
        const endpoints = ['users', 'locks', 'canvases'];
        
        for (const endpoint of endpoints) {
            try {
                const apiUrl = this.buildAdminApiUrl(endpoint);
                console.log(`🧪 Testing ${endpoint} endpoint: ${apiUrl}`);
                
                const response = await fetch(apiUrl, {
                    method: 'HEAD', // Just check if endpoint exists
                    headers: {
                        'Authorization': `Bearer ${this.getAuthToken()}`
                    }
                });
                
                console.log(`🧪 ${endpoint} endpoint status: ${response.status}`);
                
                if (response.status === 401) {
                    console.log(`🧪 ${endpoint} endpoint: Authentication required (expected)`);
                } else if (response.status === 404) {
                    console.log(`🧪 ${endpoint} endpoint: Not found (endpoint doesn't exist)`);
                } else if (response.status === 200 || response.status === 403) {
                    console.log(`🧪 ${endpoint} endpoint: Accessible (status: ${response.status})`);
                } else {
                    console.log(`🧪 ${endpoint} endpoint: Unexpected status: ${response.status}`);
                }
                
            } catch (error) {
                console.error(`🧪 ${endpoint} endpoint error:`, error);
            }
        }
    }

    /**
     * Get the correct API base URL for admin endpoints
     */
    getApiBaseUrl() {
        // Check for API_BASE in various locations
        if (window.API_BASE) {
            console.log('🔧 Found API_BASE:', window.API_BASE);
            return window.API_BASE;
        }
        
        if (window.CONFIG_UTILS && window.CONFIG_UTILS.API_BASE) {
            console.log('🔧 Found CONFIG_UTILS.API_BASE:', window.CONFIG_UTILS.API_BASE);
            return window.CONFIG_UTILS.API_BASE;
        }
        
        // FIXED: Check for API_CONFIG.BASE_URL (the correct location)
        if (window.API_CONFIG && window.API_CONFIG.BASE_URL) {
            console.log('🔧 Found API_CONFIG.BASE_URL:', window.API_CONFIG.BASE_URL);
            return window.API_CONFIG.BASE_URL;
        }
        
        // FIXED: Use CONFIG_UTILS.getApiUrl for proper URL construction
        if (window.CONFIG_UTILS && window.CONFIG_UTILS.getApiUrl) {
            console.log('🔧 Using CONFIG_UTILS.getApiUrl for base URL construction');
            // Extract base URL from a test call
            const testUrl = window.CONFIG_UTILS.getApiUrl('/api/v1/test');
            const baseUrl = testUrl.replace('/api/v1/test', '');
            console.log('🔧 Extracted base URL from CONFIG_UTILS:', baseUrl);
            return baseUrl;
        }
        
        // Default to relative URLs
        console.log('🔧 No API_BASE found, using relative URLs');
        return '';
    }
    
    /**
     * Build admin API URL with correct base
     */
    buildAdminApiUrl(endpoint) {
        const baseUrl = this.getApiBaseUrl();
        const fullUrl = baseUrl ? `${baseUrl}/api/v1/admin/${endpoint}` : `/api/v1/admin/${endpoint}`;
        console.log(`🔧 Built admin API URL: ${fullUrl}`);
        return fullUrl;
    }

    /**
     * Render initialization failed message with retry options
     */
    renderInitFailedMessage(data) {
        const adminSection = document.getElementById('admin-section');
        if (!adminSection) return;
        
        const errorHtml = `
            <div class="admin-error-container">
                <div class="admin-error-message">
                    <h3>⚠️ Admin Panel Initialization Failed</h3>
                    <p>Failed to initialize admin panel after ${data.attempts} attempts.</p>
                    <p><strong>Error:</strong> ${data.error}</p>
                    <div class="admin-error-actions">
                        <button class="btn btn-primary" onclick="forceRetryAdminPanelInit()">
                            <i class="fas fa-redo"></i> Retry Initialization
                        </button>
                        <button class="btn btn-secondary" onclick="debugAdminStatus()">
                            <i class="fas fa-bug"></i> Debug Status
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        adminSection.innerHTML = errorHtml;
    }

         /**
      * Go back to the main application
      */
     goBackToMainApp() {
         console.log('🔙 Going back to main app (canvas list)...');
         
         // Preferred: use NavigationManager to switch sections
         try {
             if (window.navigationManager && typeof window.navigationManager.showSection === 'function') {
                 window.navigationManager.showSection('canvas');
                 if (window.eventManager) {
                     window.eventManager.emit('adminPanelClosed');
                 }
                 console.log('✅ Switched via NavigationManager.showSection("canvas")');
                 return;
             }
         } catch (err) {
             console.warn('⚠️ NavigationManager route failed, falling back:', err);
         }
         
         // Fallback 1: emit navigate event
         if (window.eventManager) {
             window.eventManager.emit('navigateToSection', 'canvas');
             window.eventManager.emit('adminPanelClosed');
             console.log('✅ Emitted navigateToSection("canvas")');
             return;
         }
         
         // Fallback 2: direct DOM toggling
         const adminSection = document.getElementById('admin-section');
         if (adminSection) {
             adminSection.classList.add('hidden');
         }
         const canvasSection = document.getElementById('canvas-section');
         if (canvasSection) {
             canvasSection.classList.remove('hidden');
         }
         console.log('✅ Fallback DOM toggle to canvas-section applied');
     }
     
     /**
      * Check authentication and load appropriate view
      */
     checkAuthenticationAndLoad() {
         console.log('🔍 Checking authentication and loading appropriate view...');
         
         if (this.isUserAuthenticated()) {
             console.log('✅ User is authenticated, loading dashboard...');
             this.showView('dashboard');
         } else {
             console.log('❌ User not authenticated, showing login prompt...');
             this.renderLoginPrompt();
         }
     }

    /**
     * Add missing methods that the admin panel needs
     */
}

// Remove duplicate instance - use only adminPanelManager from managers system
// window.adminPanel = new AdminPanelManager();
