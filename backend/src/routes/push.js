const express = require('express');
const webpush = require('web-push');
const { verifyToken } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// Set VAPID details if keys are configured
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:admin@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// GET /api/push/vapid-public-key — return public VAPID key to client
router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
});

// POST /api/push/subscribe — save device push subscription
router.post('/subscribe', verifyToken, async (req, res) => {
  try {
    const { endpoint, keys, deviceLabel } = req.body;
    const user = await User.findById(req.user._id);

    // Avoid duplicate subscriptions
    const already = user.pushSubscriptions.find((s) => s.endpoint === endpoint);
    if (already) return res.json({ message: 'Already subscribed' });

    user.pushSubscriptions.push({ endpoint, keys, deviceLabel: deviceLabel || 'Browser' });
    await user.save();

    res.status(201).json({ message: 'Subscribed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/push/subscribe — unsubscribe a device
router.delete('/subscribe', verifyToken, async (req, res) => {
  try {
    const { endpoint } = req.body;
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { pushSubscriptions: { endpoint } },
    });
    res.json({ message: 'Unsubscribed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PATCH /api/push/settings — update quiet hours
router.patch('/settings', verifyToken, async (req, res) => {
  try {
    const { endpoint, quietHours } = req.body;
    await User.updateOne(
      { _id: req.user._id, 'pushSubscriptions.endpoint': endpoint },
      { $set: { 'pushSubscriptions.$.quietHours': quietHours } }
    );
    res.json({ message: 'Settings updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
