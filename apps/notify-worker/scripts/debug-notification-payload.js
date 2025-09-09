#!/usr/bin/env node

/**
 * Debug script to check what's actually stored in notification payloads
 * Run this to see if the enrichment is working properly
 */

const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function debugNotificationPayloads() {
  console.log('🔍 Debugging notification payloads...\n');

  // Check environment variables
  console.log('Environment Variables:');
  console.log(`- DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Missing'}`);
  console.log(`- CLOUDFRONT_DOMAIN: ${process.env.CLOUDFRONT_DOMAIN || '❌ Missing'}`);
  console.log('');

  if (!process.env.CLOUDFRONT_DOMAIN) {
    console.log('⚠️  CLOUDFRONT_DOMAIN is not set! This will cause incomplete notification details.');
    console.log('   Set it to your CloudFront domain (e.g., d1234567890.cloudfront.net)');
  }

  try {
    // Get the latest follow notifications
    const followNotifications = await prisma.notification.findMany({
      where: { type: 'FOLLOW' },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    if (followNotifications.length === 0) {
      console.log('❌ No follow notifications found in database');
      return;
    }

    console.log(`📋 Found ${followNotifications.length} follow notifications:\n`);

    followNotifications.forEach((notification, index) => {
      console.log(`--- Notification ${index + 1} ---`);
      console.log(`ID: ${notification.id}`);
      console.log(`Type: ${notification.type}`);
      console.log(`Created: ${notification.createdAt}`);
      console.log(`User ID: ${notification.userId}`);
      console.log('');

      const payload = notification.payload;
      console.log('📄 Payload Details:');
      console.log(`- Follow ID: ${payload.followId || '❌ Missing'}`);
      console.log(`- Action: ${payload.action || '❌ Missing'}`);
      console.log(`- Follower ID: ${payload.followerId || '❌ Missing'}`);
      console.log(`- Channel ID: ${payload.channelId || '❌ Missing'}`);
      console.log('');

      console.log('👤 Follower Details:');
      console.log(`- Name: ${payload.followerName || '❌ Missing'}`);
      console.log(`- Email: ${payload.followerEmail || '❌ Missing'}`);
      console.log(`- Avatar URL: ${payload.followerAvatarUrl || '❌ Missing'}`);
      console.log('');

      console.log('📺 Follower Channel Details:');
      console.log(`- Channel ID: ${payload.followerChannelId || '❌ Missing'}`);
      console.log(`- Channel Slug: ${payload.followerChannelSlug || '❌ Missing'}`);
      console.log(`- Channel Name: ${payload.followerChannelName || '❌ Missing'}`);
      console.log(`- Channel Avatar: ${payload.followerChannelAvatarUrl || '❌ Missing'}`);
      console.log('');

      console.log('📺 Target Channel Details:');
      console.log(`- Channel Name: ${payload.channelName || '❌ Missing'}`);
      console.log(`- Channel Slug: ${payload.channelSlug || '❌ Missing'}`);
      console.log(`- Channel Avatar: ${payload.channelAvatarUrl || '❌ Missing'}`);
      console.log('');

      // Check if the issue is with missing data or wrong CDN domain
      const hasFollowerName = payload.followerName && payload.followerName !== 'Anonymous';
      const hasChannelName = payload.channelName && payload.channelName !== 'Someone';
      const hasCorrectCDN = payload.followerChannelAvatarUrl?.includes(process.env.CLOUDFRONT_DOMAIN || 'your-cdn-domain.com');

      console.log('🔍 Analysis:');
      console.log(`- Has Follower Name: ${hasFollowerName ? '✅' : '❌'}`);
      console.log(`- Has Channel Name: ${hasChannelName ? '✅' : '❌'}`);
      console.log(`- Has Correct CDN Domain: ${hasCorrectCDN ? '✅' : '❌'}`);
      console.log('');

      if (!hasFollowerName || !hasChannelName) {
        console.log('❌ ISSUE: Notification details are incomplete!');
        console.log('   This suggests the enrichment process failed or database queries returned no data.');
      } else if (!hasCorrectCDN) {
        console.log('⚠️  WARNING: CDN domain might be incorrect');
        console.log(`   Expected: ${process.env.CLOUDFRONT_DOMAIN || 'your-cdn-domain.com'}`);
        console.log(`   Found: ${payload.followerChannelAvatarUrl || 'None'}`);
      } else {
        console.log('✅ Notification details look good!');
      }

      console.log('='.repeat(50));
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error debugging notification payloads:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugNotificationPayloads();
