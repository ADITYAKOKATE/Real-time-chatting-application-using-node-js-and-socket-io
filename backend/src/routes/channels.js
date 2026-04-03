const express = require('express');
const { body, validationResult } = require('express-validator');
const Channel = require('../models/Channel');
const Message = require('../models/Message');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/channels — list user's channels and all public channels
router.get('/', verifyToken, async (req, res) => {
  try {
    const channels = await Channel.find({
      $or: [
        { members: req.user._id },
        { isPrivate: false }
      ]
    })
      .populate('members', 'username avatar status lastSeen')
      .sort({ updatedAt: -1 });
    res.json({ channels });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/channels — create a channel
router.post(
  '/',
  verifyToken,
  [body('name').trim().isLength({ min: 1, max: 80 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { name, description, isPrivate, memberIds } = req.body;
      const members = [...new Set([req.user._id.toString(), ...(memberIds || [])])];

      const channel = await Channel.create({
        name,
        description: description || '',
        isPrivate: isPrivate || false,
        isDM: false,
        members,
        admins: [req.user._id],
        createdBy: req.user._id,
      });

      await channel.populate('members', 'username avatar status lastSeen');
      res.status(201).json({ channel });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
);

// POST /api/channels/dm — open or create a DM
router.post('/dm', verifyToken, async (req, res) => {
  try {
    const { recipientId } = req.body;
    const myId = req.user._id.toString();
    if (myId === recipientId) return res.status(400).json({ message: 'Cannot DM yourself' });

    const memberIds = [myId, recipientId].sort();

    let channel = await Channel.findOne({
      isDM: true,
      members: { $all: memberIds, $size: 2 },
    }).populate('members', 'username avatar status lastSeen publicKey');

    if (!channel) {
      channel = await Channel.create({
        name: 'DM',
        isDM: true,
        isPrivate: true,
        members: memberIds,
        admins: [],
        createdBy: myId,
      });
      await channel.populate('members', 'username avatar status lastSeen publicKey');
    }

    res.json({ channel });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/channels/:id — get channel details
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id).populate(
      'members',
      'username avatar status lastSeen publicKey'
    );
    if (!channel) return res.status(404).json({ message: 'Channel not found' });

    const isMember = channel.members.some((m) => m._id.toString() === req.user._id.toString());
    if (!isMember && channel.isPrivate) return res.status(403).json({ message: 'Access denied' });

    res.json({ channel });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/channels/:id/unread — unread message count
router.get('/:id/unread', verifyToken, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id);
    if (!channel) return res.status(404).json({ message: 'Channel not found' });

    const cursor = channel.readCursors?.find(
      (c) => c.userId.toString() === req.user._id.toString()
    );

    const query = { channelId: req.params.id, deletedAt: null };
    if (cursor?.lastReadMessageId) {
      query._id = { $gt: cursor.lastReadMessageId };
    }

    const unreadCount = await Message.countDocuments(query);
    res.json({ unreadCount });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/channels/:id/join
router.post('/:id/join', verifyToken, async (req, res) => {
  try {
    const channel = await Channel.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { members: req.user._id } },
      { new: true }
    ).populate('members', 'username avatar status lastSeen');
    res.json({ channel });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
