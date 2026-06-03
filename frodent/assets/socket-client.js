/**
 * Marketplace Socket Client
 * Connects frodent frontend to admin control center
 */
(function() {
  'use strict';

  const SOCKET_URL = 'https://epinhesabim.com'; // Production domain
  const STORAGE_KEY_VISITOR_ID = 'ls_visitor_id';
  const STORAGE_KEY_TICKET_ID = 'ls_ticket_id';
  const STORAGE_KEY_MESSAGES = 'ls_messages';

  let socket = null;
  let chatOpen = false;
  let chatAssigned = false;
  let chatMessages = [];
  let myTicketId = null;
  let myVisitorId = null;

  // ─── STORAGE HELPERS ───
  function generateVisitorId() {
    // Browser fingerprint: UA + language + timezone
    const ua = navigator.userAgent;
    const lang = navigator.language;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const fingerprint = btoa(ua + '|' + lang + '|' + tz).substring(0, 32);
    return 'vis_' + fingerprint + '_' + Date.now();
  }

  function getStoredVisitorId() {
    let id = localStorage.getItem(STORAGE_KEY_VISITOR_ID);
    if (!id) {
      id = generateVisitorId();
      localStorage.setItem(STORAGE_KEY_VISITOR_ID, id);
    }
    return id;
  }

  function getStoredTicketId() {
    return localStorage.getItem(STORAGE_KEY_TICKET_ID);
  }

  function saveTicketId(ticketId) {
    if (ticketId) {
      localStorage.setItem(STORAGE_KEY_TICKET_ID, ticketId);
    }
  }

  function clearStoredTicketId() {
    localStorage.removeItem(STORAGE_KEY_TICKET_ID);
  }

  function getStoredMessages() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_MESSAGES);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.warn('[Socket] Failed to parse stored messages:', e);
      return [];
    }
  }

  function saveMessages(messages) {
    try {
      localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages.slice(-100))); // Keep last 100
    } catch (e) {
      console.warn('[Socket] Failed to save messages to localStorage:', e);
    }
  }

  function clearStoredMessages() {
    localStorage.removeItem(STORAGE_KEY_MESSAGES);
  }

  // ─── 1. SOCKET CONNECTION ───
  function initSocket() {
    if (typeof io === 'undefined') {
      console.warn('[Socket] io not loaded');
      return;
    }
    if (socket && socket.connected) return;

    myVisitorId = getStoredVisitorId();
    myTicketId = getStoredTicketId(); // Load from storage

    if (myTicketId) {
      console.log('[Socket] Restored ticketId from storage:', myTicketId);
    }

    socket = io(SOCKET_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      query: { visitorId: myVisitorId }, // Send visitor ID to backend
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
      trackPage(window.location.pathname);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    // ─── SYSTEM EVENTS ───
    socket.on('system:state', (state) => {
      applySystemState(state);
    });

    socket.on('system:maintenance', ({ enabled }) => {
      showMaintenanceModal(enabled);
    });

    socket.on('popup:show', ({ message }) => {
      showPopup(message);
    });

    socket.on('popup:hide', () => {
      hidePopup();
    });

    socket.on('widget:toggle', ({ enabled }) => {
      const widget = document.getElementById('ls-widget-btn');
      if (widget) widget.style.display = enabled ? 'flex' : 'none';
    });

  // ─── SUPPORT CHAT ───
    socket.on('support:ticket-created', ({ ticketId }) => {
      myTicketId = ticketId;
      saveTicketId(ticketId);
      addSystemMessage('Destek talebiniz oluşturuldu: ' + ticketId);
      updateChatUI();
    });

    socket.on('support:assigned', ({ adminName }) => {
      chatAssigned = true;
      addSystemMessage(adminName + ' size bağlandı.');
      updateChatUI();
    });

    socket.on('support:disabled', () => {
      addSystemMessage('Canlı destek şu anda kapalı.');
      updateChatUI();
    });

    socket.on('support:history', (data) => {
      const list = Array.isArray(data) ? data : (data.messages || []);
      chatMessages = list.map(m => ({
        id: m._id || m.id || Date.now().toString(),
        sender: m.sender,
        text: m.text,
        timestamp: m.createdAt || m.timestamp,
      }));
      saveMessages(chatMessages); // Save to localStorage
      renderMessages();
    });

    socket.on('support:message', (msg) => {
      chatMessages.push(msg);
      saveMessages(chatMessages); // Save new message
      renderMessages();
      scrollToBottom();
      if (!chatOpen) showUnreadBadge();
    });

    socket.on('support:ended', () => {
      chatAssigned = false;
      clearStoredTicketId(); // Clear ticket on close
      myTicketId = null;
      addSystemMessage('Destek görüşmesi sona erdi. Yeni mesaj yazarak yeniden başlatabilirsiniz.');
      updateChatUI();
    });

    socket.on('support:admin-disconnected', () => {
      addSystemMessage('Destek temsilcisi ayrıldı.');
      updateChatUI();
    });
  }

  // ─── 2. VISITOR TRACKING ───
  function trackPage(page) {
    if (!socket || !socket.connected) return;
    socket.emit('visitor:page', { page: page || '/' });
  }

  // Track SPA-like navigation
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function(...args) {
    originalPushState.apply(this, args);
    trackPage(window.location.pathname);
  };

  history.replaceState = function(...args) {
    originalReplaceState.apply(this, args);
    trackPage(window.location.pathname);
  };

  window.addEventListener('popstate', () => {
    trackPage(window.location.pathname);
  });

  // ─── 3. WIDGET UI ───
  function createWidget() {
    if (document.getElementById('ls-widget-container')) return;

    const container = document.createElement('div');
    container.id = 'ls-widget-container';
    container.innerHTML = `
      <style>
        #ls-widget-btn {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, #06b6d4, #0891b2);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 20px rgba(6,182,212,0.4);
          cursor: pointer;
          z-index: 9999;
          transition: transform 0.2s;
          border: none;
        }
        #ls-widget-btn:hover { transform: scale(1.05); }
        #ls-widget-btn .badge {
          position: absolute;
          top: -2px;
          right: -2px;
          background: #ef4444;
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 10px;
          display: none;
        }
        #ls-chat-panel {
          position: fixed;
          bottom: 90px;
          right: 24px;
          width: 360px;
          max-height: 500px;
          background: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 16px;
          display: none;
          flex-direction: column;
          z-index: 9999;
          overflow: hidden;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        }
        #ls-chat-header {
          padding: 14px 16px;
          background: linear-gradient(135deg, #06b6d4, #0891b2);
          color: #fff;
          font-weight: 600;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        #ls-chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-height: 280px;
          max-height: 340px;
        }
        .ls-msg {
          max-width: 80%;
          padding: 10px 14px;
          border-radius: 14px;
          font-size: 13px;
          line-height: 1.4;
          word-break: break-word;
        }
        .ls-msg.admin {
          background: #1e293b;
          color: #e2e8f0;
          align-self: flex-start;
          border-bottom-left-radius: 4px;
        }
        .ls-msg.visitor {
          background: linear-gradient(135deg, #06b6d4, #0891b2);
          color: #fff;
          align-self: flex-end;
          border-bottom-right-radius: 4px;
        }
        .ls-msg.system {
          align-self: center;
          color: #94a3b8;
          font-size: 11px;
          padding: 4px 8px;
        }
        .ls-msg-time {
          font-size: 10px;
          opacity: 0.7;
          margin-top: 4px;
        }
        #ls-chat-input-area {
          padding: 12px;
          border-top: 1px solid #1e293b;
          display: flex;
          gap: 8px;
        }
        #ls-chat-input {
          flex: 1;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 10px;
          padding: 10px 12px;
          color: #e2e8f0;
          font-size: 13px;
          outline: none;
        }
        #ls-chat-input:focus { border-color: #06b6d4; }
        #ls-chat-send {
          background: linear-gradient(135deg, #06b6d4, #0891b2);
          color: #fff;
          border: none;
          border-radius: 10px;
          padding: 0 16px;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
        }
        #ls-chat-send:disabled { opacity: 0.5; cursor: not-allowed; }
        .ls-close-btn {
          background: none;
          border: none;
          color: #fff;
          font-size: 18px;
          cursor: pointer;
          line-height: 1;
        }
        .ls-join-btn {
          margin: 8px 12px 12px;
          padding: 10px;
          background: linear-gradient(135deg, #06b6d4, #0891b2);
          color: #fff;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
        }
        /* Maintenance Modal */
        #ls-maint-modal {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.85);
          display: none;
          align-items: center;
          justify-content: center;
          z-index: 10000;
        }
        #ls-maint-modal.active { display: flex; }
        #ls-maint-box {
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 20px;
          padding: 40px;
          text-align: center;
          max-width: 400px;
        }
        #ls-maint-box h2 { color: #f59e0b; margin-bottom: 12px; }
        #ls-maint-box p { color: #94a3b8; font-size: 14px; }
        /* Popup Modal */
        #ls-popup-modal {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          display: none;
          align-items: center;
          justify-content: center;
          z-index: 10001;
        }
        #ls-popup-modal.active { display: flex; }
        #ls-popup-box {
          background: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 16px;
          padding: 28px;
          max-width: 420px;
          width: 90%;
          position: relative;
        }
        #ls-popup-box h3 { color: #06b6d4; margin-bottom: 8px; }
        #ls-popup-box p { color: #cbd5e1; font-size: 14px; line-height: 1.6; }
        #ls-popup-close {
          position: absolute;
          top: 12px;
          right: 14px;
          background: none;
          border: none;
          color: #94a3b8;
          font-size: 20px;
          cursor: pointer;
        }
        @media (max-width: 480px) {
          #ls-chat-panel { width: calc(100% - 32px); right: 16px; bottom: 80px; }
        }
      </style>

      <button id="ls-widget-btn" title="Canlı Destek">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        <span class="badge" id="ls-unread-badge">0</span>
      </button>

      <div id="ls-chat-panel">
        <div id="ls-chat-header">
          <span>Canlı Destek</span>
          <button class="ls-close-btn" id="ls-chat-close">&times;</button>
        </div>
        <div id="ls-chat-messages"></div>
        <div id="ls-chat-input-area">
          <input type="text" id="ls-chat-input" placeholder="Mesajınız..." />
          <button id="ls-chat-send">Gönder</button>
        </div>
      </div>

      <div id="ls-maint-modal"><div id="ls-maint-box">
        <h2>Bakım Modu Aktif</h2>
        <p>Sistem şu anda bakım modunda. Lütfen daha sonra tekrar deneyiniz.</p>
      </div></div>

      <div id="ls-popup-modal"><div id="ls-popup-box">
        <button id="ls-popup-close">&times;</button>
        <h3>Duyuru</h3>
        <p id="ls-popup-text"></p>
      </div></div>
    `;
    document.body.appendChild(container);

    // Events
    document.getElementById('ls-widget-btn').addEventListener('click', toggleChat);
    document.getElementById('ls-chat-close').addEventListener('click', toggleChat);
    document.getElementById('ls-chat-send').addEventListener('click', sendMessage);
    document.getElementById('ls-chat-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
    document.getElementById('ls-popup-close').addEventListener('click', hidePopup);
  }

  function toggleChat() {
    const panel = document.getElementById('ls-chat-panel');
    chatOpen = !chatOpen;
    panel.style.display = chatOpen ? 'flex' : 'none';
    if (chatOpen) {
      clearUnreadBadge();

      // Load messages from localStorage if available
      if (chatMessages.length === 0) {
        const stored = getStoredMessages();
        if (stored.length > 0) {
          chatMessages = stored;
          renderMessages();
        }
      }

      scrollToBottom();

      // Load full history from server
      if (socket && myTicketId) {
        socket.emit('support:load-my-history');
      }

      if (chatMessages.length === 0 && !myTicketId) {
        addSystemMessage('Merhaba! Size nasıl yardımcı olabilirim? Mesaj yazarak destek talebi oluşturabilirsiniz.');
      }
    }
  }

  function sendMessage() {
    const input = document.getElementById('ls-chat-input');
    const text = input.value.trim();
    if (!text || !socket) return;
    
    // Add message immediately to chat
    const msg = {
      id: Date.now().toString(),
      sender: 'visitor',
      text: text,
      timestamp: new Date().toISOString()
    };
    chatMessages.push(msg);
    renderMessages();
    scrollToBottom();
    
    socket.emit('support:visitor-message', { text });
    input.value = '';
  }

  function addSystemMessage(text) {
    chatMessages.push({ id: Date.now().toString(), sender: 'system', text, timestamp: new Date().toISOString() });
    renderMessages();
  }

  function renderMessages() {
    const box = document.getElementById('ls-chat-messages');
    if (!box) return;
    box.innerHTML = chatMessages.map(m => {
      if (m.sender === 'system') {
        return `<div class="ls-msg system">${escapeHtml(m.text)}</div>`;
      }
      const cls = m.sender === 'admin' ? 'admin' : 'visitor';
      const time = new Date(m.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      return `<div class="ls-msg ${cls}"><div>${escapeHtml(m.text)}</div><div class="ls-msg-time">${time}</div></div>`;
    }).join('');
  }

  function scrollToBottom() {
    const box = document.getElementById('ls-chat-messages');
    if (box) box.scrollTop = box.scrollHeight;
  }

  function showUnreadBadge() {
    const badge = document.getElementById('ls-unread-badge');
    if (!badge || chatOpen) return;
    let count = parseInt(badge.textContent || '0') + 1;
    badge.textContent = count;
    badge.style.display = 'inline-block';
  }

  function clearUnreadBadge() {
    const badge = document.getElementById('ls-unread-badge');
    if (badge) { badge.textContent = '0'; badge.style.display = 'none'; }
  }

  function updateChatUI() {
    // Already handled by renderMessages
    renderMessages();
    scrollToBottom();
  }

  // ─── 4. SYSTEM STATE ───
  function applySystemState(state) {
    if (state.maintenanceMode) showMaintenanceModal(true);
    else showMaintenanceModal(false);

    const widgetBtn = document.getElementById('ls-widget-btn');
    if (widgetBtn) widgetBtn.style.display = state.widgetEnabled !== false ? 'flex' : 'none';
  }

  function showMaintenanceModal(show) {
    const modal = document.getElementById('ls-maint-modal');
    if (!modal) return;
    if (show) modal.classList.add('active');
    else modal.classList.remove('active');
  }

  function showPopup(message) {
    const modal = document.getElementById('ls-popup-modal');
    const text = document.getElementById('ls-popup-text');
    if (!modal || !text) return;
    text.textContent = message || '';
    modal.classList.add('active');
  }

  function hidePopup() {
    const modal = document.getElementById('ls-popup-modal');
    if (modal) modal.classList.remove('active');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function(m) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m];
    });
  }

  // ─── 5. INIT ───
  function init() {
    // Load stored data
    myVisitorId = getStoredVisitorId();
    myTicketId = getStoredTicketId();
    const stored = getStoredMessages();
    if (stored.length > 0) {
      chatMessages = stored;
    }

    initSocket();
    createWidget();
    // If already loaded after DOM ready
    if (document.readyState === 'complete') {
      trackPage(window.location.pathname);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
