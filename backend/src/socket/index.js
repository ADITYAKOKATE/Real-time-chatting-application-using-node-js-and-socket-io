const { createAdapter } = require('@socket.io/redis-adapter');
const { verifySocketToken } = require('../middleware/auth');
const { getPubClient, getSubClient } = require('../config/redis');
const chatHandler = require('./chatHandler');
const notifHandler = require('./notifHandler');

const initSocket = (io) => {
  // Attach Redis adapter for horizontal scaling
  try {
    const pubClient = getPubClient();
    const subClient = getSubClient();
    if (pubClient && subClient) {
      io.adapter(createAdapter(pubClient, subClient));
      console.log('✅ Socket.io Redis adapter attached');
    }
  } catch (err) {
    console.warn('⚠️  Running without Redis adapter (single server mode):', err.message);
  }

  // Namespaces
  const chatNS = io.of('/chat');
  const notifNS = io.of('/notifications');

  // JWT auth on both namespaces
  chatNS.use(verifySocketToken);
  notifNS.use(verifySocketToken);

  // Handlers
  chatNS.on('connection', (socket) => chatHandler(chatNS, socket));
  notifNS.on('connection', (socket) => notifHandler(notifNS, socket));

  return { chatNS, notifNS };
};

module.exports = initSocket;
