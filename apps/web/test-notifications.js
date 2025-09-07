const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testNotifications() {
  try {
    console.log('🔍 Testing notification flow...\n');
    
    // Check recent notifications in database
    const notifications = await prisma.notification.findMany({
      where: {
        type: 'FOLLOW'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });
    
    console.log(`📊 Found ${notifications.length} follow notifications in database:`);
    notifications.forEach((notification, index) => {
      const payload = notification.payload;
      console.log(`${index + 1}. ${payload.followerName} → ${payload.channelName} (${payload.action}) - ${notification.createdAt}`);
    });
    
    // Check if there are any pending notifications in Redis
    const Redis = require('ioredis');
    const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    try {
      const pendingIds = await redis.smembers('notification:pending:list');
      console.log(`\n📋 Pending notifications in Redis: ${pendingIds.length}`);
      pendingIds.forEach(id => console.log(`  - ${id}`));
      
      if (pendingIds.length > 0) {
        console.log('\n🔍 Checking pending notification data...');
        for (const id of pendingIds) {
          const followData = await redis.get(`notification:follow:${id}`);
          if (followData) {
            const data = JSON.parse(followData);
            console.log(`  Follow ${id}: ${data.action} - ${data.followerName} → ${data.channelName}`);
          }
        }
      }
      
      redis.disconnect();
    } catch (redisError) {
      console.log('❌ Redis not available:', redisError.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testNotifications();
