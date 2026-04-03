const express = require('express');
const mongoose = require('mongoose');
const Message = require('../models/Message');
const Channel = require('../models/Channel');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/channels/:id/messages — cursor pagination
router.get('/:channelId/messages', verifyToken, async (req, res) => {
  try {
    const { channelId } = req.params;
    const { before, limit = 50, search } = req.query;

    const channel = await Channel.findById(channelId);
    if (!channel) return res.status(404).json({ message: 'Channel not found' });
    const isMember = channel.members.some((m) => m.toString() === req.user._id.toString());
    if (!isMember && channel.isPrivate) return res.status(403).json({ message: 'Access denied' });

    const query = { channelId, deletedAt: null };

    if (search) {
      query.$text = { $search: search };
    } else if (before) {
      query._id = { $lt: new mongoose.Types.ObjectId(before) };
    }

    const messages = await Message.find(query)
      .populate('senderId', 'username avatar')
      .populate('replyTo', 'content senderId')
      .sort({ _id: -1 })
      .limit(Number(limit));

    // Return in chronological order
    messages.reverse();

    const hasMore = messages.length === Number(limit);

    res.json({
      messages,
      hasMore,
      nextCursor: messages.length > 0 ? messages[0]._id : null,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/channels/:channelId/messages — create message (REST fallback; primary via socket)
router.post('/:channelId/messages', verifyToken, async (req, res) => {
  try {
    const { content, type, replyTo, isEncrypted, ciphertext, iv } = req.body;
    const message = await Message.create({
      channelId: req.params.channelId,
      senderId: req.user._id,
      content: isEncrypted ? '' : content,
      type: type || 'text',
      replyTo: replyTo || null,
      isEncrypted: !!isEncrypted,
      ciphertext: isEncrypted ? ciphertext : null,
      iv: isEncrypted ? iv : null,
    });

    await message.populate('senderId', 'username avatar');
    res.status(201).json({ message });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PATCH /api/messages/:id — edit message
router.patch('/:id', verifyToken, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found' });
    if (message.senderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    message.editHistory.push({ content: message.content, editedAt: new Date() });
    message.content = req.body.content;
    message.editedAt = new Date();
    await message.save();

    await message.populate('senderId', 'username avatar');
    res.json({ message });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/messages/:id — soft delete
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found' });
    if (message.senderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    message.content = 'This message was deleted';
    message.deletedAt = new Date();
    message.file = undefined;
    await message.save();

    res.json({ message });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/messages/:id/react — add/remove reaction
router.post('/:id/react', verifyToken, async (req, res) => {
  try {
    const { emoji } = req.body;
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    const userId = req.user._id.toString();
    const existing = message.reactions.find((r) => r.emoji === emoji);

    if (existing) {
      const idx = existing.users.findIndex((u) => u.toString() === userId);
      if (idx > -1) {
        existing.users.splice(idx, 1); // toggle off
        if (existing.users.length === 0) {
          message.reactions = message.reactions.filter((r) => r.emoji !== emoji);
        }
      } else {
        existing.users.push(req.user._id);
      }
    } else {
      message.reactions.push({ emoji, users: [req.user._id] });
    }

    await message.save();
    res.json({ reactions: message.reactions });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/messages/:id/thread — get thread replies
router.get('/:id/thread', verifyToken, async (req, res) => {
  try {
    const replies = await Message.find({ replyTo: req.params.id, deletedAt: null })
      .populate('senderId', 'username avatar')
      .sort({ createdAt: 1 });
    res.json({ replies });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
