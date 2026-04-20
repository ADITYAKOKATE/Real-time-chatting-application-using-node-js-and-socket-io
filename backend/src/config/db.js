const mongoose = require('mongoose');
const dns = require('dns');

const connectDB = async () => {
  try {
    // Fix for "querySrv ECONNREFUSED" error on some networks
    try {
      dns.setServers(['8.8.8.8', '8.8.4.4']);
    } catch (dnsErr) {
      console.warn('⚠️ Could not set custom DNS servers:', dnsErr.message);
    }

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;

