const notifHandler = (notifNS, socket) => {
  const userId = socket.userId;
  console.log(`🔔 [Notif] ${socket.user.username} connected`);

  // Join a personal room keyed by userId for targeted notifications
  socket.join(`user:${userId}`);

  socket.on('disconnect', () => {
    console.log(`🔔 [Notif] ${socket.user.username} disconnected`);
  });
};

module.exports = notifHandler;
