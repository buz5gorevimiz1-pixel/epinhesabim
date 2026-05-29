const { Server } = require('socket.io');

const SupportTicket = require('../models/SupportTicket');
const SupportMessage = require('../models/SupportMessage');

// In-memory stores
const visitors = new Map();      // socketId -> visitor info
const adminSockets = new Map();  // socketId -> admin info
const activeChats = new Map();   // visitorSocketId -> { adminSocketId, ticketId }
const visitorTicketMap = new Map(); // visitorSocketId -> ticketId

// Admin controls
const systemState = {
  maintenanceMode: false,
  liveSupportEnabled: true,
  popupEnabled: false,
  popupMessage: '',
  widgetEnabled: true,
};

let io = null;

function getDeviceInfo(userAgent) {
  const ua = userAgent || '';
  let device = 'Desktop';
  if (/Mobile|Android|iPhone|iPad/i.test(ua)) device = 'Mobile';
  else if (/Tablet|iPad/i.test(ua)) device = 'Tablet';

  let browser = 'Unknown';
  if (/Chrome/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Edge/i.test(ua)) browser = 'Edge';
  else if (/Opera|OPR/i.test(ua)) browser = 'Opera';

  return { device, browser };
}

/* ─── DB HELPERS ─── */
async function createTicket(visitor) {
  const ticket = new SupportTicket({
    visitorSocketId: visitor.id,
    visitorIp: visitor.ip,
    visitorBrowser: visitor.browser,
    visitorDevice: visitor.device,
    visitorPage: visitor.page,
    subject: 'Canlı Destek',
    status: 'waiting',
    unreadByAdmin: true,
  });
  await ticket.save();
  return ticket;
}

async function addMessage(ticketId, sender, text, senderName) {
  const msg = await SupportMessage.create({ ticketId, sender, text, senderName });
  await SupportTicket.updateOne(
    { ticketId },
    {
      $inc: { messageCount: 1 },
      $set: { lastMessagePreview: text.substring(0, 80) },
    }
  );
  return msg;
}

async function getTicketMessages(ticketId) {
  return SupportMessage.find({ ticketId }).sort({ createdAt: 1 }).lean();
}

async function broadcastTicketList() {
  const tickets = await SupportTicket.find().sort({ updatedAt: -1 }).lean();
  for (const [socketId] of adminSockets) {
    io.to(socketId).emit('support:tickets', tickets);
  }
}

async function broadcastTicketUpdate(ticketId) {
  const ticket = await SupportTicket.findOne({ ticketId }).lean();
  if (!ticket) return;
  for (const [socketId] of adminSockets) {
    io.to(socketId).emit('support:ticket-update', ticket);
  }
}

function initSocketIO(server) {
  io = new Server(server, {
    cors: {
      origin: function (origin, callback) {
        const allowed = [
          'http://localhost:3000',
          'http://localhost:3001',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:3001',
        ];
        if (!origin || allowed.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('CORS not allowed'));
        }
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    const { userAgent, referer } = socket.handshake.headers;
    const ip = socket.handshake.address || socket.handshake.headers['x-forwarded-for'] || 'unknown';
    const { device, browser } = getDeviceInfo(userAgent);

    const isAdmin = socket.handshake.query?.type === 'admin';

    // ── ADMIN CONNECTION ──
    if (isAdmin) {
      adminSockets.set(socket.id, {
        socketId: socket.id,
        connectedAt: new Date(),
      });

      socket.emit('system:state', systemState);
      socket.emit('visitors:list', Array.from(visitors.values()));
      socket.emit('admin:online', adminSockets.size);

      // Send current ticket list
      SupportTicket.find().sort({ updatedAt: -1 }).lean().then(tickets => {
        socket.emit('support:tickets', tickets);
      });

      // Admin controls
      socket.on('admin:maintenance', ({ enabled }) => {
        systemState.maintenanceMode = enabled;
        io.emit('system:maintenance', { enabled });
        broadcastToAdmins('system:state', systemState);
      });

      socket.on('admin:popup', ({ enabled, message }) => {
        systemState.popupEnabled = enabled;
        systemState.popupMessage = message || '';
        if (enabled) io.emit('popup:show', { message: systemState.popupMessage });
        else io.emit('popup:hide');
        broadcastToAdmins('system:state', systemState);
      });

      socket.on('admin:widget', ({ enabled }) => {
        systemState.widgetEnabled = enabled;
        io.emit('widget:toggle', { enabled });
        broadcastToAdmins('system:state', systemState);
      });

      socket.on('admin:livesupport', ({ enabled }) => {
        systemState.liveSupportEnabled = enabled;
        broadcastToAdmins('system:state', systemState);
      });

      socket.on('admin:kick-visitor', ({ visitorId }) => {
        const visitor = visitors.get(visitorId);
        if (visitor) {
          io.to(visitorId).disconnectSockets(true);
          visitors.delete(visitorId);
          broadcastToAdmins('visitors:list', Array.from(visitors.values()));
        }
      });

      // ── Admin takes ticket ──
      socket.on('support:take', async ({ ticketId }) => {
        const ticket = await SupportTicket.findOneAndUpdate(
          { ticketId },
          { status: 'active', assignedTo: socket.adminId },
          { new: true }
        );
        if (!ticket) return;

        // Map visitor socket if online
        const visitorSocketId = ticket.visitorSocketId;
        if (visitorSocketId && visitors.has(visitorSocketId)) {
          activeChats.set(visitorSocketId, { adminSocketId: socket.id, ticketId });
          io.to(visitorSocketId).emit('support:assigned', { adminName: 'Destek Ekibi' });
        }

        await broadcastTicketList();
      });

      // ── Admin sends message ──
      socket.on('support:admin-message', async ({ ticketId, text }) => {
        const ticket = await SupportTicket.findOne({ ticketId });
        if (!ticket) return;

        await addMessage(ticketId, 'admin', text, 'Destek Ekibi');
        await SupportTicket.updateOne({ ticketId }, { $set: { unreadByVisitor: ticket.unreadByVisitor + 1 || 1 } });

        // Notify visitor if online
        const visitorSocketId = ticket.visitorSocketId;
        if (visitorSocketId && visitors.has(visitorSocketId)) {
          io.to(visitorSocketId).emit('support:message', {
            id: Date.now().toString(), sender: 'admin', text,
            timestamp: new Date().toISOString(),
          });
        }

        // Notify other admins
        const msgs = await getTicketMessages(ticketId);
        broadcastToAdmins('support:history', { ticketId, messages: msgs });
        await broadcastTicketUpdate(ticketId);
      });

      // ── Admin ends chat ──
      socket.on('support:end', async ({ ticketId }) => {
        await SupportTicket.updateOne({ ticketId }, { status: 'closed', closedAt: new Date() });
        const ticket = await SupportTicket.findOne({ ticketId });
        if (ticket && ticket.visitorSocketId) {
          activeChats.delete(ticket.visitorSocketId);
          io.to(ticket.visitorSocketId).emit('support:ended');
        }
        await broadcastTicketList();
      });

      // ── Admin reopens chat ──
      socket.on('support:reopen', async ({ ticketId }) => {
        await SupportTicket.updateOne(
          { ticketId },
          { status: 'waiting', reopenedAt: new Date(), closedAt: null }
        );
        await broadcastTicketList();
      });
      // ── Admin deletes ticket ──
socket.on('support:delete', async ({ ticketId }) => {
  try {
    await SupportMessage.deleteMany({ ticketId });
    await SupportTicket.findOneAndDelete({ ticketId });

    await broadcastTicketList();
  } catch (error) {
    console.error('Ticket silme hatası:', error);
  }
});
      // ── Admin requests history ──
      socket.on('support:load-history', async ({ ticketId }) => {
        const msgs = await getTicketMessages(ticketId);
        socket.emit('support:history', { ticketId, messages: msgs });
      });

      socket.on('disconnect', () => {
        adminSockets.delete(socket.id);
        for (const [vid, chat] of activeChats.entries()) {
          if (chat.adminSocketId === socket.id) {
            activeChats.delete(vid);
            io.to(vid).emit('support:admin-disconnected');
          }
        }
        broadcastToAdmins('admin:online', adminSockets.size);
      });

      return;
    }

    // ── VISITOR CONNECTION ──
    const visitor = {
      id: socket.id,
      ip: String(ip).split(',')[0]?.trim(),
      device,
      browser,
      page: referer || '/',
      referrer: referer || 'direct',
      connectedAt: Date.now(),
      lastActive: Date.now(),
    };
    visitors.set(socket.id, visitor);
    broadcastToAdmins('visitors:list', Array.from(visitors.values()));
    broadcastToAdmins('visitors:new', visitor);

    socket.on('visitor:page', ({ page }) => {
      const v = visitors.get(socket.id);
      if (v) { v.page = page; v.lastActive = Date.now(); }
      broadcastToAdmins('visitors:list', Array.from(visitors.values()));
    });

    // ── VISITOR MESSAGING (persistent) ──
    socket.on('support:visitor-message', async ({ text }) => {
      try {
        if (!systemState.liveSupportEnabled) {
          socket.emit('support:disabled');
          return;
        }
        if (!text || typeof text !== 'string') return;

        console.log('[SUPPORT] Visitor message from', socket.id, ':', text.substring(0, 50));

        let ticketId = visitorTicketMap.get(socket.id);
        let ticket;

        // Create ticket if not exists
        if (!ticketId) {
          console.log('[SUPPORT] Creating new ticket for visitor', socket.id);
          ticket = await createTicket(visitor);
          ticketId = ticket.ticketId;
          visitorTicketMap.set(socket.id, ticketId);
          console.log('[SUPPORT] Ticket created:', ticketId);
          await broadcastTicketList();
          socket.emit('support:ticket-created', { ticketId });
        } else {
          ticket = await SupportTicket.findOne({ ticketId });
        }

        if (!ticket) {
          console.error('[SUPPORT] Ticket not found after create/load:', ticketId);
          return;
        }

        // Save message
        await addMessage(ticketId, 'visitor', text, 'Ziyaretçi');
        console.log('[SUPPORT] Message saved to ticket', ticketId);

        await SupportTicket.updateOne(
          { ticketId },
          { $set: { status: ticket.status === 'closed' ? 'waiting' : ticket.status, unreadByAdmin: true } }
        );

        // Self echo
        socket.emit('support:message', {
          id: Date.now().toString(), sender: 'visitor', text,
          timestamp: new Date().toISOString(),
        });

        // If admin assigned and online, send realtime
        const chat = activeChats.get(socket.id);
        if (chat && chat.ticketId === ticketId) {
          io.to(chat.adminSocketId).emit('support:message', {
            id: Date.now().toString(), sender: 'visitor', text,
            timestamp: new Date().toISOString(), room: socket.id,
          });
        }

        await broadcastTicketUpdate(ticketId);
      } catch (err) {
        console.error('[SUPPORT] Error in visitor-message handler:', err);
        socket.emit('support:error', { message: 'Mesaj kaydedilemedi' });
      }
    });

    // Visitor loads their own history
    socket.on('support:load-my-history', async () => {
      const ticketId = visitorTicketMap.get(socket.id);
      if (!ticketId) return;
      const msgs = await getTicketMessages(ticketId);
      socket.emit('support:history', { ticketId, messages: msgs });
    });

    socket.on('disconnect', async () => {
      visitors.delete(socket.id);
      const ticketId = visitorTicketMap.get(socket.id);
      if (ticketId) {
        await SupportTicket.updateOne({ ticketId }, { $set: { status: 'waiting' } });
        visitorTicketMap.delete(socket.id);
      }
      activeChats.delete(socket.id);
      broadcastToAdmins('visitors:list', Array.from(visitors.values()));
      await broadcastTicketList();
    });
  });

  // Periodic visitor durations
  setInterval(() => {
    const now = Date.now();
    const list = Array.from(visitors.values()).map(v => ({
      ...v,
      onlineDuration: Math.floor((now - v.connectedAt) / 1000),
    }));
    broadcastToAdmins('visitors:list', list);
  }, 5000);

  return io;
}

function broadcastToAdmins(event, data) {
  if (!io) return;
  for (const [socketId] of adminSockets) {
    io.to(socketId).emit(event, data);
  }
}

function getIO() { return io; }

function getRealtimeMetrics() {
  return {
    onlineVisitors: visitors.size,
    supportQueue: 0,
    activeChats: activeChats.size,
    adminOnline: adminSockets.size,
  };
}

function broadcastDashboardStats(data) {
  if (!io) return;
  for (const [socketId] of adminSockets) {
    io.to(socketId).emit('dashboard:stats', data);
  }
}

function getVisitorList() {
  const now = Date.now();
  return Array.from(visitors.values()).map(v => ({
    ...v,
    onlineDuration: Math.floor((now - v.connectedAt) / 1000),
  }));
}

function getAdminSockets() {
  return Array.from(adminSockets.values());
}

module.exports = {
  initSocketIO, getIO, systemState,
  getRealtimeMetrics, broadcastDashboardStats,
  getVisitorList, getAdminSockets,
};
