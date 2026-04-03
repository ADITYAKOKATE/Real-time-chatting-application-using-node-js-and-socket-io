require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const connectDB = require('./src/config/db');
const { connectRedis } = require('./src/config/redis');
const initSocket = require('./src/socket');

// Routes
const authRoutes = require('./src/routes/auth');
const channelRoutes = require('./src/routes/channels');
const messageRoutes = require('./src/routes/messages');
const fileRoutes = require('./src/routes/files');
const pushRoutes = require('./src/routes/push');
const keyRoutes = require('./src/routes/keys');

const app = express();
const server = http.createServer(app);

// Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/channels', messageRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/keys', keyRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// 404 handler
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// Start everything
const PORT = process.env.PORT || 5000;

const start = async () => {
  // Connect MongoDB (required)
  await connectDB();

  // Connect Redis (optional — graceful degradation)
  try {
    await connectRedis();
  } catch (err) {
    console.warn('⚠️  Starting without Redis (single-server mode)');
  }

  // Initialize Socket.io with Redis adapter
  initSocket(io);

  server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
};

start();
