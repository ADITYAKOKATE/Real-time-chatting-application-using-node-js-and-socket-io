const { createClient } = require('redis');

let pubClient = null;
let subClient = null;
let redisAvailable = false;

const connectRedis = async () => {
  try {
    const testClient = createClient({
      url: process.env.REDIS_URL,
      socket: { connectTimeout: 3000, reconnectStrategy: false },
    });

    // Use a promise race to enforce a hard timeout
    await Promise.race([
      testClient.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000)),
    ]);

    await testClient.quit();

    // Now create the real persistent clients
    pubClient = createClient({ url: process.env.REDIS_URL, socket: { reconnectStrategy: false } });
    subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);
    redisAvailable = true;
    console.log('✅ Redis connected');
  } catch (error) {
    console.warn('⚠️  Redis unavailable — running in single-server mode (no horizontal scaling)');
    pubClient = null;
    subClient = null;
    redisAvailable = false;
  }
};

const getRedis = () => pubClient;
const isRedisAvailable = () => redisAvailable;

module.exports = {
  connectRedis,
  getRedis,
  isRedisAvailable,
  getPubClient: () => pubClient,
  getSubClient: () => subClient,
};
