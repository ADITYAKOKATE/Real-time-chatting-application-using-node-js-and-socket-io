import { io } from 'socket.io-client';

const SERVER_URL = 'http://localhost:5000';

let chatSocket = null;
let notifSocket = null;

export const initSockets = (token) => {
  const opts = {
    auth: { token },
    transports: ['websocket'],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  };

  chatSocket = io(`${SERVER_URL}/chat`, opts);
  notifSocket = io(`${SERVER_URL}/notifications`, opts);

  chatSocket.on('connect', () => console.log('✅ Chat socket connected'));
  chatSocket.on('connect_error', (err) => console.error('Chat socket error:', err.message));

  notifSocket.on('connect', () => console.log('✅ Notif socket connected'));

  // Heartbeat every 25s
  const heartbeat = setInterval(() => {
    if (chatSocket?.connected) chatSocket.emit('heartbeat');
  }, 25000);

  chatSocket.on('disconnect', () => clearInterval(heartbeat));

  return { chatSocket, notifSocket };
};

export const disconnectSockets = () => {
  chatSocket?.disconnect();
  notifSocket?.disconnect();
  chatSocket = null;
  notifSocket = null;
};

export const getChatSocket = () => chatSocket;
export const getNotifSocket = () => notifSocket;
