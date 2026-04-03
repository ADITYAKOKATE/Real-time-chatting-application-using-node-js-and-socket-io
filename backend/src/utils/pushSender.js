const User = require('../models/User');
const webpush = require('web-push');

const isQuietHour = (quietHours, currentHour) => {
  if (!quietHours?.enabled) return false;
  const { from, to } = quietHours;
  if (from <= to) return currentHour >= from && currentHour < to;
  return currentHour >= from || currentHour < to; // wraps midnight
};

const sendPushNotification = async (userId, payload) => {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;

  try {
    const user = await User.findById(userId).select('status pushSubscriptions');
    if (!user || user.pushSubscriptions.length === 0) return;
    if (user.status === 'ONLINE') return; // Skip if user is online

    const now = new Date().getHours();

    for (const sub of user.pushSubscriptions) {
      if (isQuietHour(sub.quietHours, now)) continue;

      const pushPayload = JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.avatar || '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        data: { deepLink: payload.deepLink, channelId: payload.channelId },
      });

      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, pushPayload);
      } catch (err) {
        // Remove invalid subscriptions (410 Gone)
        if (err.statusCode === 410) {
          await User.findByIdAndUpdate(userId, {
            $pull: { pushSubscriptions: { endpoint: sub.endpoint } },
          });
        }
      }
    }
  } catch (err) {
    console.error('Push notification error:', err.message);
  }
};

module.exports = { sendPushNotification };
