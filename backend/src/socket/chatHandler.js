const Message = require('../models/Message');
const Channel = require('../models/Channel');
const User = require('../models/User');
const { getRedis } = require('../config/redis');
const { sendPushNotification } = require('../utils/pushSender');
const { extractLinkPreviews } = require('../utils/preview');

const SERVER_ID = process.env.SERVER_ID || 'server-1';
const PRESENCE_TTL = 35; // seconds

// Helper: set presence in Redis
const setPresence = async (redis, userId, status) => {
  if (!redis) return;
  try {
    await redis.hSet(`presence:${userId}`, { status, serverId: SERVER_ID, updatedAt: Date.now().toString() });
    await redis.expire(`presence:${userId}`, PRESENCE_TTL);
  } catch (e) { /* Redis optional */ }
};

const chatHandler = async (chatNS, socket) => {
  const userId = socket.userId;
  const redis = getRedis();

  console.log(`🔌 [Chat] ${socket.user.username} connected (${socket.id})`);

  // Register user socket in Redis
  try {
    if (redis) await redis.hSet(`users:${userId}`, { socketId: socket.id, serverId: SERVER_ID });
  } catch (e) {}

  // ─── PRESENCE ────────────────────────────────────────────────
  await setPresence(redis, userId, 'ONLINE');
  await User.findByIdAndUpdate(userId, { status: 'ONLINE' });
  chatNS.emit('presence:update', { userId, status: 'ONLINE' });

  // Heartbeat (client sends every 25s to extend TTL)
  socket.on('heartbeat', async () => {
    await setPresence(redis, userId, 'ONLINE');
  });

  // ─── JOIN CHANNEL ─────────────────────────────────────────────
  socket.on('channel:join', async ({ channelId }) => {
    try {
      const channel = await Channel.findById(channelId);
      if (!channel) return socket.emit('error', { message: 'Channel not found' });
      const isMember = channel.members.some((m) => m.toString() === userId);
      if (!isMember && channel.isPrivate) return socket.emit('error', { message: 'Access denied' });
      socket.join(channelId);
      socket.emit('channel:joined', { channelId });
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  socket.on('channel:leave', ({ channelId }) => {
    socket.leave(channelId);
  });

  // ─── TYPING ───────────────────────────────────────────────────
  socket.on('typing:start', ({ channelId }) => {
    socket.to(channelId).emit('typing:start', { userId, username: socket.user.username, channelId });
  });

  socket.on('typing:stop', ({ channelId }) => {
    socket.to(channelId).emit('typing:stop', { userId, channelId });
  });

  // ─── SEND MESSAGE ─────────────────────────────────────────────
  socket.on('message:send', async (data) => {
    try {
      const { channelId, content, type, replyTo, file, isEncrypted, ciphertext, iv } = data;

      const channel = await Channel.findById(channelId);
      if (!channel) return socket.emit('error', { message: 'Channel not found' });

      // Extract link previews for text messages
      let linkPreviews = [];
      if (type === 'text' && content && !isEncrypted) {
        try {
          linkPreviews = await extractLinkPreviews(content);
        } catch (e) { /* non-fatal */ }
      }

      const message = await Message.create({
        channelId,
        senderId: userId,
        content: isEncrypted ? '' : (content || ''),
        type: type || 'text',
        replyTo: replyTo || null,
        file: file || undefined,
        isEncrypted: !!isEncrypted,
        ciphertext: isEncrypted ? ciphertext : null,
        iv: isEncrypted ? iv : null,
        linkPreviews,
      });

      await message.populate('senderId', 'username avatar');

      // Update channel's lastMessage
      await Channel.findByIdAndUpdate(channelId, {
        lastMessage: {
          content: isEncrypted ? '🔒 Encrypted message' : (content || (file ? `📎 ${file.name}` : '')),
          senderId: userId,
          sentAt: new Date(),
        },
      });

      // Update thread parent reply count
      if (replyTo) {
        await Message.findByIdAndUpdate(replyTo, {
          $inc: { 'thread.replyCount': 1 },
          $set: { 'thread.lastReplyAt': new Date() },
          $addToSet: { 'thread.participants': userId },
        });
      }

      // Broadcast to channel room
      chatNS.to(channelId).emit('message:new', { message });

      // Detect @mentions and send push notifications
      if (content) {
        const mentionRegex = /@(\w+)/g;
        let match;
        while ((match = mentionRegex.exec(content)) !== null) {
          const mentionedUsername = match[1];
          const mentionedUser = await User.findOne({ username: mentionedUsername });
          if (mentionedUser && mentionedUser._id.toString() !== userId) {
            await sendPushNotification(mentionedUser._id, {
              title: `@${socket.user.username} mentioned you`,
              body: content.substring(0, 100),
              avatar: socket.user.avatar || '',
              deepLink: `/channel/${channelId}`,
              channelId,
            });
          }
        }
      }
    } catch (err) {
      console.error('Error in message:send:', err);
      socket.emit('error', { message: err.message });
    }
  });

  // ─── READ RECEIPT ─────────────────────────────────────────────
  socket.on('message:read', async ({ messageId, channelId }) => {
    try {
      await Message.findByIdAndUpdate(messageId, {
        $addToSet: { readBy: { userId, readAt: new Date() } },
      });

      // Update channel read cursor
      await Channel.updateOne(
        { _id: channelId, 'readCursors.userId': userId },
        { $set: { 'readCursors.$.lastReadMessageId': messageId, 'readCursors.$.lastReadAt': new Date() } }
      );
      // Upsert if cursor doesn't exist
      await Channel.updateOne(
        { _id: channelId, 'readCursors.userId': { $ne: userId } },
        { $push: { readCursors: { userId, lastReadMessageId: messageId, lastReadAt: new Date() } } }
      );

      socket.to(channelId).emit('message:readReceipt', { messageId, userId });
    } catch (err) { /* non-fatal */ }
  });

  // ─── REACTION ─────────────────────────────────────────────────
  socket.on('message:react', async ({ messageId, channelId, emoji }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return;

      const existing = message.reactions.find((r) => r.emoji === emoji);
      if (existing) {
        const idx = existing.users.findIndex((u) => u.toString() === userId);
        if (idx > -1) {
          existing.users.splice(idx, 1);
          if (existing.users.length === 0) {
            message.reactions = message.reactions.filter((r) => r.emoji !== emoji);
          }
        } else {
          existing.users.push(userId);
        }
      } else {
        message.reactions.push({ emoji, users: [userId] });
      }

      await message.save();
      chatNS.to(channelId).emit('message:reaction', { messageId, reactions: message.reactions });
    } catch (err) { /* non-fatal */ }
  });

  // ─── EDIT MESSAGE ─────────────────────────────────────────────
  socket.on('message:edit', async ({ messageId, channelId, content }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message || message.senderId.toString() !== userId) return;
      message.editHistory.push({ content: message.content, editedAt: new Date() });
      message.content = content;
      message.editedAt = new Date();
      await message.save();
      await message.populate('senderId', 'username avatar');
      chatNS.to(channelId).emit('message:edited', { message });
    } catch (err) { /* non-fatal */ }
  });

  // ─── DELETE MESSAGE ───────────────────────────────────────────
  socket.on('message:delete', async ({ messageId, channelId }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message || message.senderId.toString() !== userId) return;
      message.content = 'This message was deleted';
      message.deletedAt = new Date();
      message.file = undefined;
      await message.save();
      chatNS.to(channelId).emit('message:deleted', { messageId, channelId });
    } catch (err) { /* non-fatal */ }
  });

  // ─── DISCONNECT ───────────────────────────────────────────────
  socket.on('disconnect', async () => {
    console.log(`🔌 [Chat] ${socket.user.username} disconnected`);

    // Grace period: wait 5s before marking offline (handles reconnects)
    setTimeout(async () => {
      try {
        // Check if user has any other active sockets in this namespace
        const sockets = await chatNS.fetchSockets();
        const stillOnline = sockets.some((s) => s.userId === userId && s.id !== socket.id);

        if (!stillOnline) {
          await setPresence(redis, userId, 'OFFLINE');
          const updatedUser = await User.findByIdAndUpdate(
            userId,
            { status: 'OFFLINE', lastSeen: new Date() },
            { new: true }
          );
          chatNS.emit('presence:update', {
            userId,
            status: 'OFFLINE',
            lastSeen: updatedUser.lastSeen,
          });
        }
      } catch (e) { /* non-fatal */ }
    }, 5000);
  });
};

module.exports = chatHandler;
