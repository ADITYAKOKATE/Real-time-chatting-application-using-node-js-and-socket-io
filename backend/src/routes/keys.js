const express = require('express');
const { verifyToken } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// PUT /api/keys/public — upload user's ECDH public key
router.put('/public', verifyToken, async (req, res) => {
  try {
    const { publicKey } = req.body;
    if (!publicKey) return res.status(400).json({ message: 'Public key required' });
    await User.findByIdAndUpdate(req.user._id, { publicKey });
    res.json({ message: 'Public key updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/keys/:userId — get another user's public key
router.get('/:userId', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('publicKey username');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ userId: user._id, username: user.username, publicKey: user.publicKey });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/keys/backup — store encrypted private key backup
router.post('/backup', verifyToken, async (req, res) => {
  try {
    const { privateKeyBackup } = req.body;
    if (!privateKeyBackup) return res.status(400).json({ message: 'Backup required' });
    await User.findByIdAndUpdate(req.user._id, { privateKeyBackup });
    res.json({ message: 'Key backup stored' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/keys/backup/me — retrieve encrypted private key backup
router.get('/backup/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('privateKeyBackup');
    res.json({ privateKeyBackup: user.privateKeyBackup });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
