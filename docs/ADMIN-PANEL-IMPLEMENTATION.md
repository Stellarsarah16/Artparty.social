# 🎛️ Admin Panel Implementation Reference

## Overview
The admin panel is a comprehensive management interface for administrators and superusers to manage users, canvases, tile locks, and system reports. It's implemented as a manager class within the managers system architecture.

## 🏗️ Architecture

### Class Structure
- **File**: `frontend/js/modules/admin/admin-panel.js`
- **Class**: `AdminPanelManager`
- **Instance**: `window.adminPanelManager` (created by managers system)
- **Pattern**: Singleton manager class with event-driven UI updates

### Manager Integration
- **Created by**: `frontend/js/modules/managers/index.js` → `createManagers()`
- **Global access**: `window.adminPanelManager`
- **Initialization**: Automatic during app startup via managers system
- **Dependencies**: None (self-contained)

## 🔐 Authentication

### Token Sources (Priority Order)
1. **Primary**: `window.CONFIG_UTILS.getAuthToken()` - Standard app authentication
2. **Fallback**: `window.appState.get('authToken')` - App state management
3. **Final**: `localStorage`/`sessionStorage` - Browser storage fallbacks

### Implementation
```javascript
getAuthToken() {
    // Debug logging for troubleshooting
    console.log('🔍 Debugging getAuthToken:');
    
    // Use standard app authentication
    if (window.CONFIG_UTILS && window.CONFIG_UTILS.getAuthToken) {
        return window.CONFIG_UTILS.getAuthToken();
    }
    
    // Fallback to appState
    if (window.appState && window.appState.get) {
        return window.appState.get('authToken');
    }
    
    // Final fallback to localStorage
    return localStorage.getItem('token') || 
           localStorage.getItem('authToken') || 
           localStorage.getItem('access_token') ||
           sessionStorage.getItem('token') ||
           null;
}
```

## 🎯 Available Views

### 1. Dashboard (`admin-dashboard-view`)
- **Purpose**: System overview with statistics
- **Data Source**: `/api/v1/admin/reports/system-overview`
- **Features**: User counts, canvas stats, tile counts, lock status, system health

### 2. Users (`admin-users-view`)
- **Purpose**: User management and administration
- **Data Source**: `/api/v1/admin/users`
- **Features**: View users, toggle status, edit, delete
- **Actions**: Create, Edit, Activate/Deactivate, Delete

### 3. Tile Locks (`admin-locks-view`)
- **Purpose**: Manage active tile locks
- **Data Source**: `/api/v1/admin/locks`
- **Features**: View locks, force release, cleanup expired
- **Actions**: Cleanup Expired, Force Release

### 4. Canvases (`admin-canvases-view`)
- **Purpose**: Canvas management and monitoring
- **Data Source**: `/api/v1/admin/canvases`
- **Features**: View canvas details, tile sizes, grid layouts, status
- **Actions**: View Details, Edit, Toggle Status, Delete

### 5. Reports (`admin-reports-view`)
- **Purpose**: System reports and analytics
- **Data Source**: `/api/v1/admin/reports/system-overview`
- **Features**: User statistics, lock statistics, system health
- **Actions**: Export Report

## 🎨 UI Components

### Tab Navigation
```html
<button id="admin-dashboard-tab" class="admin-tab">Dashboard</button>
<button id="admin-users-tab" class="admin-tab">Users</button>
<button id="admin-locks-tab" class="admin-tab">Tile Locks</button>
<button id="admin-canvases-tab" class="admin-tab">Canvases</button>
<button id="admin-reports-tab" class="admin-tab">Reports</button>
```

### View Containers
```html
<div id="admin-dashboard-view" class="admin-view" style="display: none;"></div>
<div id="admin-users-view" class="admin-view" style="display: none;"></div>
<div id="admin-locks-view" class="admin-view" style="display: none;"></div>
<div id="admin-canvases-view" class="admin-view" style="display: none;"></div>
<div id="admin-reports-view" class="admin-view" style="display: none;"></div>
```

### Canvas Table Structure
```html
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
        <!-- Dynamically populated -->
    </tbody>
</table>
```

## 🔧 Key Methods

### Core Methods
- `init()` - Initialize admin panel and setup event listeners
- `showView(viewName)` - Switch between different admin views
- `setupEventListeners()` - Bind click handlers to tabs and buttons

### Data Loading Methods
- `loadDashboard()` - Load system overview data
- `loadUsers()` - Load user management data
- `loadLocks()` - Load tile lock data
- `loadCanvases()` - Load canvas management data
- `loadReports()` - Load system reports data

### Rendering Methods
- `renderDashboard(data)` - Render dashboard statistics
- `renderUsers(users)` - Render user management table
- `renderLocks(locks)` - Render tile lock table
- `renderCanvases(canvases)` - Render canvas management table
- `renderReports(data)` - Render system reports

### Action Methods
- `cleanupExpiredLocks()` - Clean up expired tile locks
- `forceReleaseLock(tileId)` - Force release a specific tile lock
- `toggleUserStatus(userId)` - Toggle user active/inactive status
- `deleteUser(userId)` - Delete a user account
- `toggleCanvasStatus(canvasId)` - Toggle canvas active/inactive status
- `deleteCanvas(canvasId)` - Delete a canvas

## 🚨 Error Handling

### Authentication Errors
- **401 Unauthorized**: Token missing or invalid
- **Debug logging**: Comprehensive token source debugging
- **Fallback chains**: Multiple authentication methods

### API Errors
- **Response validation**: Check `response.ok` before processing
- **Error logging**: Detailed error information in console
- **User feedback**: Error messages via `showError()`

### DOM Errors
- **Element validation**: Check if DOM elements exist before use
- **Graceful degradation**: Continue operation when possible
- **Debug logging**: Element availability information

## 🔍 Debugging Features

### Authentication Debugging
```javascript
// Shows all available authentication sources and their status
console.log('🔍 Debugging getAuthToken:');
console.log('  - CONFIG_UTILS available:', !!window.CONFIG_UTILS);
console.log('  - CONFIG_UTILS.getAuthToken available:', !!window.CONFIG_UTILS?.getAuthToken);
console.log('  - appState available:', !!window.appState);
console.log('  - appState.get available:', !!window.appState?.get);
```

### API Response Debugging
```javascript
// Detailed API response information
console.log('📡 Canvas response status:', response.status);
console.log('📡 Canvas response headers:', response.headers);
console.log('🎨 Loaded canvases from admin API:', canvases);
```

## 📊 Data Structures

### Canvas Object
```javascript
{
    id: 1,
    name: "Canvas Name",
    description: "Canvas description",
    width: 1024,
    height: 1024,
    tile_size: 64,  // Key field for tile size issues
    palette_type: "classic",
    collaboration_mode: "free",
    is_active: true,
    max_tiles_per_user: 10,
    created_at: "2025-01-16T12:00:00Z"
}
```

### User Object
```javascript
{
    id: 1,
    username: "username",
    email: "user@example.com",
    is_active: true,
    is_admin: false,
    is_superuser: false,
    created_at: "2025-01-16T12:00:00Z"
}
```

### Tile Lock Object
```javascript
{
    tile_id: 101,
    user_id: 1,
    locked_at: "2025-01-16T12:00:00Z",
    expires_at: "2025-01-16T13:00:00Z",
    is_active: true
}
```

## 🚀 Common Use Cases

### 1. Troubleshooting Tile Size Issues
- **Use Case**: Canvas shows wrong grid dimensions
- **Solution**: Check `admin-canvases-view` for actual `tile_size` vs expected
- **Data**: Compare `tile_size` field with calculated grid dimensions

### 2. User Management
- **Use Case**: Deactivate problematic user
- **Solution**: Use Users tab → Toggle Status button
- **API**: `POST /api/v1/admin/users/{userId}/toggle-status`

### 3. Lock Management
- **Use Case**: Force release stuck tile lock
- **Solution**: Use Tile Locks tab → Force Release button
- **API**: `DELETE /api/v1/admin/locks/{tileId}`

### 4. System Monitoring
- **Use Case**: Check system health and performance
- **Solution**: Use Dashboard tab for overview
- **Data**: User counts, canvas stats, lock status

## ⚠️ Common Issues & Solutions

### Issue: Admin Panel Not Working
**Symptoms**: All tabs fail with authentication errors
**Causes**: 
- Duplicate admin panel instances
- Wrong authentication method
- Missing initialization
**Solutions**:
1. Ensure only `window.adminPanelManager` exists
2. Use `window.CONFIG_UTILS.getAuthToken()`
3. Check managers system initialization

### Issue: Canvases Tab Not Loading
**Symptoms**: Canvases tab shows loading but never completes
**Causes**:
- Missing `canvases-tbody` element
- Authentication token issues
- API endpoint problems
**Solutions**:
1. Verify HTML structure has `id="canvases-tbody"`
2. Check authentication token via debug logs
3. Verify `/api/v1/admin/canvases` endpoint

### Issue: Button Actions Not Working
**Symptoms**: Clicking action buttons does nothing
**Causes**:
- Wrong instance reference (`adminPanel` vs `adminPanelManager`)
- Missing method implementations
- JavaScript errors
**Solutions**:
1. Use `adminPanelManager.methodName()` consistently
2. Implement missing methods
3. Check browser console for errors

## 🔄 Future Enhancements

### Planned Features
- **User Creation Modal**: Full user creation interface
- **User Editing Modal**: Comprehensive user editing
- **Canvas Editing**: Canvas property modification
- **Report Export**: Data export functionality
- **Real-time Updates**: WebSocket integration for live data

### Technical Improvements
- **Better Error UI**: Replace alerts with toast notifications
- **Loading States**: Visual feedback during operations
- **Confirmation Dialogs**: Better UX for destructive actions
- **Pagination**: Handle large datasets efficiently
- **Search/Filter**: Advanced data filtering capabilities

## 📝 Maintenance Notes

### Code Organization
- **Single Responsibility**: Each method handles one specific task
- **Error Handling**: Comprehensive error catching and logging
- **Debug Logging**: Extensive console logging for troubleshooting
- **Fallback Chains**: Multiple authentication and data sources

### Testing Considerations
- **Authentication**: Test with valid/invalid tokens
- **API Responses**: Test with various response formats
- **DOM Elements**: Test with missing HTML elements
- **Error Conditions**: Test error handling paths

### Performance Notes
- **Lazy Loading**: Data loaded only when viewing specific tabs
- **Event Delegation**: Efficient event listener management
- **DOM Updates**: Minimal DOM manipulation during renders
- **Memory Management**: Proper cleanup of event listeners

---

*This document should be updated whenever the admin panel implementation changes to maintain accurate reference information for future development and troubleshooting.*
