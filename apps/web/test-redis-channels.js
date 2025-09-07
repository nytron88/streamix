const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function testRedisChannels() {
  try {
    console.log('🔍 Testing Redis channels...\n');
    
    // Check if Redis is connected
    await redis.ping();
    console.log('✅ Redis connected');
    
    // Subscribe to notification channels
    const subscriber = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    subscriber.subscribe('notifications:all', (err, count) => {
      if (err) {
        console.error('❌ Subscription error:', err);
        return;
      }
      console.log(`📡 Subscribed to notifications:all (${count} channels)`);
    });
    
    subscriber.subscribe('user:notifications:user_32CpCT92EMW7UMgxz5V0duGItzF', (err, count) => {
      if (err) {
        console.error('❌ Subscription error:', err);
        return;
      }
      console.log(`📡 Subscribed to user notifications (${count} channels)`);
    });
    
    subscriber.on('message', (channel, message) => {
      console.log(`📨 Received on ${channel}:`, JSON.parse(message));
    });
    
    console.log('👂 Listening for notifications... (Press Ctrl+C to stop)');
    
    // Keep the script running
    process.on('SIGINT', () => {
      console.log('\n👋 Stopping...');
      subscriber.disconnect();
      redis.disconnect();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testRedisChannels();
