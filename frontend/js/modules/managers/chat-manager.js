/**
 * Chat Manager
 * Handles chat operations and real-time messaging
 * Follows the Manager Pattern for StellarCollabApp
 */

export class ChatManager {
    constructor(dependencies) {
        // Store dependencies
        this.apiService = dependencies.apiService;
        this.eventManager = dependencies.eventManager;
        this.webSocketManager = dependencies.webSocketManager;
        
        // State management
        this.currentChatRoom = null;
        this.chatMessages = new Map(); // room_id -> messages array
        this.activeUsers = new Map(); // canvas_id -> user presence array
        this.typingUsers = new Set(); // Set of user IDs currently typing
        this.isInitialized = false;
        this.isLoading = false;
        
        // UI element references
        this.chatContainer = null;
        this.messagesList = null;
        this.messageInput = null;
        this.sendButton = null;
        this.activeUsersList = null;
        this.typingIndicator = null;
        
        // Typing debounce
        this.typingTimeout = null;
        this.isTyping = false;
        
        // Message pagination
        this.messageLimit = 50;
        this.messageOffset = 0;
        this.hasMoreMessages = true;
        
        console.log('🗨️ ChatManager initialized');
    }

    // ========================================================================
    // LIFECYCLE MANAGEMENT
    // ========================================================================

    async initialize() {
        // Initialize the chat manager
        if (this.isInitialized) {
            console.warn('🗨️ ChatManager already initialized');
            return;
        }

        try {
            console.log('🗨️ Initializing ChatManager...');
            
            // Get DOM elements
            this.setupDOMElements();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Set up WebSocket event handlers
            this.setupWebSocketHandlers();
            
            this.isInitialized = true;
            console.log('✅ ChatManager initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize ChatManager:', error);
            throw error;
        }
    }

    setupDOMElements() {
        // Set up DOM element references
        this.chatContainer = document.getElementById('chat-container');
        this.messagesList = document.getElementById('chat-messages-list');
        this.messageInput = document.getElementById('chat-message-input');
        this.sendButton = document.getElementById('chat-send-button');
        this.activeUsersList = document.getElementById('chat-active-users');
        this.typingIndicator = document.getElementById('chat-typing-indicator');
        
        // Validate critical elements exist
        if (!this.chatContainer) {
            console.warn('🗨️ Chat container not found - chat UI not available');
        }
        
        if (!this.messagesList || !this.messageInput) {
            console.warn('🗨️ Chat input elements not found - creating basic structure');
            this.createBasicChatStructure();
        }
    }

    createBasicChatStructure() {
        // Create basic chat DOM structure if not present
        if (!this.chatContainer) return;
        
        this.chatContainer.innerHTML = `
            <div class="chat-header">
                <h3>Canvas Chat</h3>
                <div id="chat-active-users" class="chat-active-users"></div>
            </div>
            <div class="chat-body">
                <div id="chat-messages-list" class="chat-messages"></div>
                <div id="chat-typing-indicator" class="chat-typing-indicator"></div>
            </div>
            <div class="chat-footer">
                <div class="chat-input-container">
                    <input type="text" id="chat-message-input" placeholder="Type a message... (tile 15,20 for mentions)" maxlength="2000">
                    <button id="chat-send-button" type="button">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        `;
        
        // Re-get elements after creation
        this.setupDOMElements();
    }

    setupEventListeners() {
        // Set up UI event listeners
        // Send message on button click
        if (this.sendButton) {
            this.sendButton.addEventListener('click', () => this.sendMessage());
        }
        
        // Send message on Enter key
        if (this.messageInput) {
            this.messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
            
            // Handle typing indicators
            this.messageInput.addEventListener('input', () => this.handleTypingStart());
            this.messageInput.addEventListener('blur', () => this.handleTypingStop());
        }
        
        // Auto-scroll to bottom when new messages arrive
        if (this.messagesList) {
            this.messagesList.addEventListener('scroll', () => this.handleScroll());
        }
        
        // Global event listeners
        this.eventManager.on('canvasChanged', (canvasData) => this.handleCanvasChange(canvasData));
        this.eventManager.on('userAuthenticated', () => this.handleUserAuthenticated());
        this.eventManager.on('userLoggedOut', () => this.handleUserLoggedOut());
    }

    setupWebSocketHandlers() {
        // Set up WebSocket message handlers
        this.eventManager.on('websocketMessage', (data) => {
            const { type } = data;
            
            switch (type) {
                case 'canvas_chat_message':
                    this.handleIncomingChatMessage(data);
                    break;
                case 'user_typing':
                    this.handleUserTyping(data);
                    break;
                case 'user_presence_update':
                    this.handleUserPresenceUpdate(data);
                    break;
                case 'tile_highlight':
                    this.handleTileHighlight(data);
                    break;
                case 'user_joined':
                case 'user_left':
                    this.handleUserJoinLeave(data);
                    break;
                default:
                    // Not a chat-related message
                    break;
            }
        });
    }

    cleanup() {
        // Clean up resources and event listeners
        console.log('🗨️ Cleaning up ChatManager...');
        
        // Clear state
        this.currentChatRoom = null;
        this.chatMessages.clear();
        this.activeUsers.clear();
        this.typingUsers.clear();
        
        // Clear typing timeout
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
            this.typingTimeout = null;
        }
        
        // Remove event listeners
        this.eventManager.off('canvasChanged', this.handleCanvasChange);
        this.eventManager.off('userAuthenticated', this.handleUserAuthenticated);
        this.eventManager.off('userLoggedOut', this.handleUserLoggedOut);
        this.eventManager.off('websocketMessage', this.handleWebSocketMessage);
        
        this.isInitialized = false;
        console.log('✅ ChatManager cleaned up');
    }

    // ========================================================================
    // CHAT ROOM MANAGEMENT
    // ========================================================================

    async openCanvasChat(canvasId) {
        // Open chat for a specific canvas
        try {
            console.log(`🗨️ Opening chat for canvas ${canvasId}...`);
            this.isLoading = true;
            this.updateLoadingState(true, 'Loading chat room...');
            
            // Get or create canvas chat room
            const response = await this.apiService.getCanvasRoom(canvasId);
            
            if (response) {
                this.currentChatRoom = response;
                console.log(`✅ Chat room loaded for canvas ${canvasId}:`, this.currentChatRoom);
                
                // Load chat history
                await this.loadChatHistory(canvasId);
                
                // Load active users
                await this.loadActiveUsers(canvasId);
                
                // Show chat UI
                this.showChatUI();
                
                // Emit event
                this.eventManager.emit('chatRoomOpened', {
                    canvasId: canvasId,
                    roomId: this.currentChatRoom.id
                });
                
            } else {
                throw new Error(response.error || 'Failed to load chat room');
            }
            
        } catch (error) {
            console.error('❌ Failed to open canvas chat:', error);
            this.showError('Failed to load chat. Please try again.');
        } finally {
            this.isLoading = false;
            this.updateLoadingState(false);
        }
    }

    async loadChatHistory(canvasId, loadMore = false) {
        // Load chat message history for a canvas
        try {
            const offset = loadMore ? this.messageOffset : 0;
            
            console.log(`🗨️ Loading chat history for canvas ${canvasId} (offset: ${offset})...`);
            
            const response = await this.apiService.getCanvasMessages(canvasId, {
                limit: this.messageLimit,
                skip: offset
            });
            
            if (response) {
                // Extract data from ChatHistoryResponse
                const messages = response.messages || [];
                const totalCount = response.total_count || 0;
                const hasMore = response.has_more || false;
                
                if (!loadMore) {
                    // Replace messages for initial load
                    this.chatMessages.set(canvasId, messages);
                    this.messageOffset = messages.length;
                } else {
                    // Append for load more
                    const existingMessages = this.chatMessages.get(canvasId) || [];
                    this.chatMessages.set(canvasId, [...existingMessages, ...messages]);
                    this.messageOffset += messages.length;
                }
                
                this.hasMoreMessages = hasMore;
                
                // Render messages
                this.renderChatMessages(loadMore);
                
                console.log(`✅ Loaded ${messages.length} chat messages (total: ${totalCount})`);
                
            } else {
                throw new Error(response.error || 'Failed to load chat history');
            }
            
        } catch (error) {
            console.error('❌ Failed to load chat history:', error);
            this.showError('Failed to load chat history.');
        }
    }

    async loadActiveUsers(canvasId) {
        // Load active users for a canvas
        try {
            console.log(`🗨️ Loading active users for canvas ${canvasId}...`);
            
            const response = await this.apiService.getCanvasUsers(canvasId);
            
            if (response) {
                this.activeUsers.set(canvasId, Array.isArray(response) ? response : []);
                this.renderActiveUsers();
                
                const users = Array.isArray(response) ? response : [];
                console.log(`✅ Loaded ${users.length} active users`);
                
            } else {
                throw new Error(response.error || 'Failed to load active users');
            }
            
        } catch (error) {
            console.error('❌ Failed to load active users:', error);
        }
    }

    // ========================================================================
    // MESSAGE OPERATIONS
    // ========================================================================

    async sendMessage() {
        // Send a chat message
        if (!this.messageInput || !this.currentChatRoom) {
            return;
        }
        
        const messageText = this.messageInput.value.trim();
        if (!messageText) {
            return;
        }
        
        try {
            console.log('🗨️ Sending chat message:', messageText);
            
            // Clear input immediately for better UX
            this.messageInput.value = '';
            this.handleTypingStop();
            
            // Parse message for tile mentions
            const parsedMessage = this.parseMessageContent(messageText);
            
            // Send via WebSocket for real-time delivery
            if (this.webSocketManager && this.webSocketManager.isConnected(this.currentChatRoom.canvas_id)) {
                this.webSocketManager.send(this.currentChatRoom.canvas_id, {
                    type: 'canvas_chat',
                    text: messageText,
                    canvas_id: this.currentChatRoom.canvas_id
                });
            } else {
                // Fallback to HTTP API
                const response = await this.apiService.sendCanvasMessage(this.currentChatRoom.canvas_id, {
                    message_text: messageText,
                    message_type: parsedMessage.type,
                    tile_x: parsedMessage.mentioned_tile?.x,
                    tile_y: parsedMessage.mentioned_tile?.y
                });
                
                if (!response) {
                    throw new Error('Failed to send message');
                }
            }
            
            console.log('✅ Message sent successfully');
            
        } catch (error) {
            console.error('❌ Failed to send message:', error);
            this.showError('Failed to send message. Please try again.');
            
            // Restore message to input if sending failed
            this.messageInput.value = messageText;
        }
    }

    parseMessageContent(messageText) {
        // Parse message content for mentions and special formatting
        const result = {
            type: 'text',
            mentioned_tile: null,
            mentioned_users: []
        };
        
        // Parse tile mentions: "tile 15,20" or "tile:15,20"
        const tilePattern = /tile[:\s]+(\d+)[,\s]+(\d+)/gi;
        const tileMatch = tilePattern.exec(messageText);
        if (tileMatch) {
            result.type = 'tile_mention';
            result.mentioned_tile = {
                x: parseInt(tileMatch[1]),
                y: parseInt(tileMatch[2])
            };
        }
        
        // Parse user mentions: "@username"
        const userPattern = /@(\w+)/g;
        let userMatch;
        while ((userMatch = userPattern.exec(messageText)) !== null) {
            result.mentioned_users.push(userMatch[1]);
        }
        
        return result;
    }

    // ========================================================================
    // UI RENDERING
    // ========================================================================

    showChatUI() {
        // Show and initialize chat UI
        if (!this.chatContainer) {
            console.warn('🗨️ Chat container not available');
            return;
        }
        
        // Show chat container
        this.chatContainer.style.display = 'block';
        
        // Focus message input
        if (this.messageInput) {
            this.messageInput.focus();
        }
        
        // Scroll to bottom
        this.scrollToBottom();
        
        console.log('✅ Chat UI shown');
    }

    hideChatUI() {
        // Hide chat UI
        if (this.chatContainer) {
            this.chatContainer.style.display = 'none';
        }
        
        console.log('✅ Chat UI hidden');
    }

    renderChatMessages(append = false) {
        // Render chat messages in the UI
        if (!this.messagesList || !this.currentChatRoom) {
            return;
        }
        
        const messages = this.chatMessages.get(this.currentChatRoom.canvas_id) || [];
        
        if (!append) {
            this.messagesList.innerHTML = '';
        }
        
        // Create message elements
        const messageElements = messages.map(message => this.createMessageElement(message));
        
        if (append) {
            // Prepend for load more (older messages)
            messageElements.reverse().forEach(element => {
                this.messagesList.insertBefore(element, this.messagesList.firstChild);
            });
        } else {
            // Replace all messages
            messageElements.forEach(element => {
                this.messagesList.appendChild(element);
            });
            
            // Scroll to bottom for new messages
            this.scrollToBottom();
        }
        
        console.log(`✅ Rendered ${messages.length} chat messages`);
    }

    createMessageElement(message) {
        // Create a DOM element for a chat message
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message';
        messageElement.dataset.messageId = message.id;
        
        // Add special classes for message types
        if (message.message_type === 'tile_mention') {
            messageElement.classList.add('tile-mention-message');
        }
        
        if (message.mentioned_user) {
            messageElement.classList.add('user-mention-message');
        }
        
        // Format timestamp
        const timestamp = new Date(message.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Create message content
        let messageContent = this.formatMessageContent(message.message_text, message);
        
        messageElement.innerHTML = `
            <div class="message-header">
                <span class="message-sender">${message.sender_display_name || message.sender_username}</span>
                <span class="message-timestamp">${timestamp}</span>
                ${message.edited_at ? '<span class="message-edited">(edited)</span>' : ''}
            </div>
            <div class="message-content">${messageContent}</div>
            ${message.mentioned_tile ? `<div class="message-tile-mention">📍 Tile ${message.mentioned_tile.x},${message.mentioned_tile.y}</div>` : ''}
        `;
        
        return messageElement;
    }

    formatMessageContent(messageText, message) {
        // Format message content with mentions and special formatting
        let formatted = this.escapeHtml(messageText);
        
        // Format tile mentions
        formatted = formatted.replace(/tile[:\s]+(\d+)[,\s]+(\d+)/gi, (match, x, y) => {
            return `<span class="tile-mention" data-tile-x="${x}" data-tile-y="${y}" onclick="window.chatManager.highlightTile(${x}, ${y})">${match}</span>`;
        });
        
        // Format user mentions
        formatted = formatted.replace(/@(\w+)/g, (match, username) => {
            return `<span class="user-mention">${match}</span>`;
        });
        
        return formatted;
    }

    renderActiveUsers() {
        // Render list of active users
        if (!this.activeUsersList || !this.currentChatRoom) {
            return;
        }
        
        const users = this.activeUsers.get(this.currentChatRoom.canvas_id) || [];
        
        if (users.length === 0) {
            this.activeUsersList.innerHTML = '<div class="no-active-users">No other users online</div>';
            return;
        }
        
        const userElements = users.map(user => {
            const isEditing = user.is_editing_tile;
            const editingText = isEditing ? ` (editing ${user.current_tile_x},${user.current_tile_y})` : '';
            
            return `
                <div class="active-user ${isEditing ? 'editing-tile' : ''}" data-user-id="${user.user_id}">
                    <span class="user-status ${user.status}"></span>
                    <span class="user-name">${user.display_name || user.username}</span>
                    <span class="user-activity">${editingText}</span>
                </div>
            `;
        }).join('');
        
        this.activeUsersList.innerHTML = userElements;
        
        console.log(`✅ Rendered ${users.length} active users`);
    }

    renderTypingIndicator() {
        // Render typing indicator
        if (!this.typingIndicator) {
            return;
        }
        
        const typingUsernames = Array.from(this.typingUsers).map(userId => {
            const user = this.findActiveUser(userId);
            return user ? (user.display_name || user.username) : 'Someone';
        });
        
        if (typingUsernames.length === 0) {
            this.typingIndicator.style.display = 'none';
            return;
        }
        
        let typingText;
        if (typingUsernames.length === 1) {
            typingText = `${typingUsernames[0]} is typing...`;
        } else if (typingUsernames.length === 2) {
            typingText = `${typingUsernames[0]} and ${typingUsernames[1]} are typing...`;
        } else {
            typingText = `${typingUsernames.length} people are typing...`;
        }
        
        this.typingIndicator.innerHTML = `<div class="typing-text">${typingText}</div>`;
        this.typingIndicator.style.display = 'block';
    }

    // ========================================================================
    // EVENT HANDLERS
    // ========================================================================

    async handleCanvasChange(canvasData) {
        // Handle canvas change event
        console.log('🗨️ Canvas changed, updating chat:', canvasData);
        
        if (canvasData && canvasData.id) {
            await this.openCanvasChat(canvasData.id);
        } else {
            this.hideChatUI();
            this.currentChatRoom = null;
        }
    }

    handleUserAuthenticated() {
        // Handle user authentication
        console.log('🗨️ User authenticated, chat ready');
        // Chat will be opened when canvas is selected
    }

    handleUserLoggedOut() {
        // Handle user logout
        console.log('🗨️ User logged out, cleaning up chat');
        this.cleanup();
    }

    handleIncomingChatMessage(data) {
        // Handle incoming chat message from WebSocket
        console.log('🗨️ Received chat message:', data);
        
        if (!this.currentChatRoom || this.currentChatRoom.canvas_id !== data.canvas_id) {
            return;
        }
        
        // Add message to local cache
        const canvasMessages = this.chatMessages.get(this.currentChatRoom.canvas_id) || [];
        canvasMessages.push({
            id: data.message_id,
            sender_id: data.sender_id,
            sender_username: data.sender_username,
            sender_display_name: data.sender_display_name,
            message_text: data.message_text,
            message_type: data.message_type || 'text',
            mentioned_tile: data.mentioned_tile,
            mentioned_user: data.mentioned_user,
            created_at: data.created_at,
            updated_at: data.created_at,
            edited_at: null,
            is_deleted: false
        });
        
        this.chatMessages.set(this.currentChatRoom.canvas_id, canvasMessages);
        
        // Re-render messages
        this.renderChatMessages();
        
        // Show notification if message mentions current user
        if (data.mentioned_user && data.mentioned_user.includes(window.appState.get('currentUser')?.username)) {
            this.showMentionNotification(data);
        }
    }

    handleUserTyping(data) {
        // Handle user typing indicator
        if (data.is_typing) {
            this.typingUsers.add(data.user_id);
        } else {
            this.typingUsers.delete(data.user_id);
        }
        
        this.renderTypingIndicator();
    }

    handleUserPresenceUpdate(data) {
        // Handle user presence update
        console.log('🗨️ User presence update:', data);
        
        if (!this.currentChatRoom) {
            return;
        }
        
        // Update user in active users list
        const users = this.activeUsers.get(this.currentChatRoom.canvas_id) || [];
        const userIndex = users.findIndex(u => u.user_id === data.user_id);
        
        if (userIndex >= 0) {
            users[userIndex] = {
                ...users[userIndex],
                current_tile_x: data.tile_x,
                current_tile_y: data.tile_y,
                is_editing_tile: data.is_editing,
                status: data.status || 'online'
            };
        }
        
        this.activeUsers.set(this.currentChatRoom.canvas_id, users);
        this.renderActiveUsers();
        
        // Emit event for tile highlighting
        if (data.is_editing && data.tile_x !== undefined && data.tile_y !== undefined) {
            this.eventManager.emit('userEditingTile', {
                userId: data.user_id,
                username: data.username,
                tileX: data.tile_x,
                tileY: data.tile_y
            });
        }
    }

    handleUserJoinLeave(data) {
        // Handle user join/leave events
        console.log('🗨️ User join/leave:', data);
        
        if (!this.currentChatRoom) {
            return;
        }
        
        // Reload active users
        this.loadActiveUsers(this.currentChatRoom.canvas_id);
        
        // Show system message
        const systemMessage = {
            id: `system_${Date.now()}`,
            sender_username: 'System',
            message_text: data.type === 'user_joined' 
                ? `${data.username} joined the canvas`
                : `${data.username} left the canvas`,
            message_type: 'system',
            created_at: new Date().toISOString(),
            is_system: true
        };
        
        this.addSystemMessage(systemMessage);
    }

    handleTileHighlight(data) {
        // Handle tile highlight request
        console.log('🗨️ Tile highlight request:', data);
        
        // Emit event for canvas viewer to handle highlighting
        this.eventManager.emit('highlightTile', {
            tileX: data.tile_x,
            tileY: data.tile_y,
            highlightType: data.highlight_type,
            requesterUsername: data.requester_username,
            message: data.message,
            duration: data.duration || 3000
        });
    }

    // ========================================================================
    // TYPING INDICATORS
    // ========================================================================

    handleTypingStart() {
        // Handle when user starts typing
        if (!this.isTyping && this.webSocketManager && this.currentChatRoom && this.webSocketManager.isConnected(this.currentChatRoom.canvas_id)) {
            this.isTyping = true;
            this.webSocketManager.send(this.currentChatRoom.canvas_id, {
                type: 'user_presence',
                presence_type: 'typing',
                is_typing: true
            });
        }
        
        // Reset typing timeout
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }
        
        this.typingTimeout = setTimeout(() => {
            this.handleTypingStop();
        }, 3000); // Stop typing indicator after 3 seconds of inactivity
    }

    handleTypingStop() {
        // Handle when user stops typing
        if (this.isTyping && this.webSocketManager && this.currentChatRoom && this.webSocketManager.isConnected(this.currentChatRoom.canvas_id)) {
            this.isTyping = false;
            this.webSocketManager.send(this.currentChatRoom.canvas_id, {
                type: 'user_presence',
                presence_type: 'typing',
                is_typing: false
            });
        }
        
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
            this.typingTimeout = null;
        }
    }

    // ========================================================================
    // UTILITY METHODS
    // ========================================================================

    highlightTile(tileX, tileY) {
        // Highlight a specific tile (called from message tile mentions)
        console.log(`🗨️ Highlighting tile ${tileX},${tileY}`);
        
        // Send tile mention via WebSocket
        if (this.webSocketManager && this.currentChatRoom && this.webSocketManager.isConnected(this.currentChatRoom.canvas_id)) {
            this.webSocketManager.send(this.currentChatRoom.canvas_id, {
                type: 'tile_mention',
                tile_x: tileX,
                tile_y: tileY,
                highlight_type: 'click',
                message: `Clicked on tile ${tileX},${tileY} from chat`,
                duration: 2000
            });
        }
        
        // Emit event for canvas viewer
        this.eventManager.emit('highlightTile', {
            tileX: tileX,
            tileY: tileY,
            highlightType: 'chat_click',
            duration: 2000
        });
    }

    addSystemMessage(message) {
            // Add a system message to the chat
        if (!this.currentChatRoom) {
            return;
        }
        
        const canvasMessages = this.chatMessages.get(this.currentChatRoom.canvas_id) || [];
        canvasMessages.push(message);
        this.chatMessages.set(this.currentChatRoom.canvas_id, canvasMessages);
        
        // Re-render messages
        this.renderChatMessages();
    }

    findActiveUser(userId) {
        // Find active user by ID
        if (!this.currentChatRoom) {
            return null;
        }
        
        const users = this.activeUsers.get(this.currentChatRoom.canvas_id) || [];
        return users.find(user => user.user_id === userId);
    }

    scrollToBottom() {
        // Scroll chat messages to bottom
        if (this.messagesList) {
            requestAnimationFrame(() => {
                this.messagesList.scrollTop = this.messagesList.scrollHeight;
            });
        }
    }

    handleScroll() {
        // Handle scroll events for load more functionality
        if (!this.messagesList || this.isLoading || !this.hasMoreMessages) {
            return;
        }
        
        // Check if scrolled near top
        if (this.messagesList.scrollTop < 100) {
            console.log('🗨️ Loading more messages...');
            this.loadChatHistory(this.currentChatRoom.canvas_id, true);
        }
    }

    updateLoadingState(loading, message = '') {
        // Update loading state
        this.isLoading = loading;
        
        // Update UI loading indicator if available
        const loadingIndicator = document.getElementById('chat-loading');
        if (loadingIndicator) {
            loadingIndicator.style.display = loading ? 'block' : 'none';
            if (message) {
                loadingIndicator.textContent = message;
            }
        }
    }

    showError(message) {
        // Show error message to user
        console.error('🗨️ Chat error:', message);
        
        // Use global toast system if available
        if (window.UIManager) {
            window.UIManager.showToast(message, 'error');
        } else {
            alert(message);
        }
    }

    showMentionNotification(messageData) {
        // Show notification for user mentions
        if (window.UIManager) {
            window.UIManager.showToast(
                `${messageData.sender_username} mentioned you in chat`,
                'info'
            );
        }
    }

    escapeHtml(text) {
        // Escape HTML characters for safe display
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ========================================================================
    // PUBLIC API METHODS
    // ========================================================================

    getCurrentRoom() {
        // Get current chat room
        return this.currentChatRoom;
    }

    getMessages(canvasId) {
        // Get messages for a canvas
        return this.chatMessages.get(canvasId) || [];
    }

    getActiveUsers(canvasId) {
        // Get active users for a canvas
        return this.activeUsers.get(canvasId) || [];
    }

    isUserTyping(userId) {
        // Check if a user is currently typing
        return this.typingUsers.has(userId);
    }

    // ========================================================================
    // ERROR HANDLING
    // ========================================================================

    handleError(error, context = '') {
        // Handle and log errors
        console.error(`🗨️ ChatManager error ${context}:`, error);
        
        // Show user-friendly error message
        this.showError('Chat error occurred. Please refresh if issues persist.');
        
        // Emit error event
        this.eventManager.emit('chatError', {
            error: error.message || error,
            context: context,
            timestamp: new Date().toISOString()
        });
    }
}

// ========================================================================
// EXPORT AND GLOBAL REGISTRATION
// ========================================================================

// Export for module usage
export default ChatManager;

// Global registration for legacy compatibility
if (typeof window !== 'undefined') {
    window.ChatManager = ChatManager;
}
