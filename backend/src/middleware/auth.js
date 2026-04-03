const jwt = require('jsonwebtoken');
const User = require('../models/User');

// REST middleware
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-passwordHash -privateKeyBackup');
    if (!user) return res.status(401).json({ message: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Socket.io middleware
const verifySocketToken = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication error: no token'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-passwordHash -privateKeyBackup');
    if (!user) return next(new Error('Authentication error: user not found'));
    socket.user = user;
    socket.userId = user._id.toString();
    next();
  } catch (err) {
    next(new Error('Authentication error: invalid token'));
  }
};

module.exports = { verifyToken, verifySocketToken };
