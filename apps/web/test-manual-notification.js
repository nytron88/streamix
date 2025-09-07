const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function testManualNotification() {
  try {
    console.log('🧪 Testing manual notification...\n');
    
    // Create a test notification
    const testNotification = {
      id: 'test-' + Date.now(),
      type: 'FOLLOW',
      userId: 'user_32CpCT92EMW7UMgxz5V0duGItzF',
      channelId: 'cmf4hb3tz000ol50ako946gzr',
      data: {
        id: 'test-follow-' + Date.now(),
        followerId: 'user_32AGWtBVyiiJ65zdgEXNRq93jwv',
        channelId: 'cmf4hb3tz000ol50ako946gzr',
        action: 'FOLLOWED',
        createdAt: new Date().toISOString(),
        followerName: 'Test User',
        channelName: 'Test Channel',
        followerChannelId: 'cmf36p88g0001kz0ay3u5rwwy',
        followerChannelSlug: 'testuser',
        followerChannelName: 'Test User Channel'
      },
      createdAt: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
    };
    
    // Publish to the same channels the worker uses
    const channels = [
      'user:notifications:user_32CpCT92EMW7UMgxz5V0duGItzF',
      'channel:notifications:cmf4hb3tz000ol50ako946gzr',
      'notifications:all'
    ];
    
    console.log('📤 Publishing test notification to channels:');
    channels.forEach(channel => console.log(`  - ${channel}`));
    
    const publishPromises = channels.map(channel => 
      redis.publish(channel, JSON.stringify(testNotification))
    );
    
    const results = await Promise.all(publishPromises);
    console.log('📊 Publish results:', results);
    
    console.log('✅ Test notification published! Check your WebSocket client.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    redis.disconnect();
  }
}

testManualNotification();
