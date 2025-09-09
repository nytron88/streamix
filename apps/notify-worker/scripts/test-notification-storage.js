#!/usr/bin/env node

/**
 * Test script to verify notification storage is working correctly
 * Run this in your production environment to debug notification details
 */

const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function testNotificationStorage() {
  console.log('🔍 Testing notification storage...\n');

  // Check environment variables
  console.log('Environment Variables:');
  console.log(`- DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Missing'}`);
  console.log(`- REDIS_URL: ${process.env.REDIS_URL ? '✅ Set' : '❌ Missing'}`);
  console.log(`- CLOUDFRONT_DOMAIN: ${process.env.CLOUDFRONT_DOMAIN || '❌ Missing'}`);
  console.log('');

  if (!process.env.CLOUDFRONT_DOMAIN) {
    console.log('⚠️  CLOUDFRONT_DOMAIN is not set! This will cause notification details to be missing.');
    console.log('   Set it to your CloudFront domain (e.g., d1234567890.cloudfront.net)');
    return;
  }

  try {
    // Get the latest follow notification
    const latestNotification = await prisma.notification.findFirst({
      where: { type: 'FOLLOW' },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestNotification) {
      console.log('❌ No follow notifications found in database');
      return;
    }

    console.log('📋 Latest Follow Notification:');
    console.log(`- ID: ${latestNotification.id}`);
    console.log(`- Type: ${latestNotification.type}`);
    console.log(`- Created: ${latestNotification.createdAt}`);
    console.log('');

    const payload = latestNotification.payload;
    console.log('📄 Notification Payload:');
    console.log(`- Follower Name: ${payload.followerName || '❌ Missing'}`);
    console.log(`- Follower Channel Name: ${payload.followerChannelName || '❌ Missing'}`);
    console.log(`- Follower Channel Avatar: ${payload.followerChannelAvatarUrl || '❌ Missing'}`);
    console.log(`- Channel Name: ${payload.channelName || '❌ Missing'}`);
    console.log(`- Channel Slug: ${payload.channelSlug || '❌ Missing'}`);
    console.log(`- Channel Avatar: ${payload.channelAvatarUrl || '❌ Missing'}`);
    console.log('');

    // Check if avatar URLs are using the correct domain
    const expectedDomain = process.env.CLOUDFRONT_DOMAIN;
    const hasCorrectDomain = payload.followerChannelAvatarUrl?.includes(expectedDomain) || 
                           payload.channelAvatarUrl?.includes(expectedDomain);

    if (hasCorrectDomain) {
      console.log('✅ Avatar URLs are using the correct CloudFront domain');
    } else {
      console.log('❌ Avatar URLs are not using the correct CloudFront domain');
      console.log(`   Expected: ${expectedDomain}`);
      console.log(`   Found: ${payload.followerChannelAvatarUrl || payload.channelAvatarUrl || 'None'}`);
    }

    // Check if names are properly populated
    const hasProperNames = payload.followerName && 
                          payload.followerName !== 'Anonymous' && 
                          payload.followerChannelName;

    if (hasProperNames) {
      console.log('✅ Notification names are properly populated');
    } else {
      console.log('❌ Notification names are missing or incomplete');
    }

  } catch (error) {
    console.error('❌ Error testing notification storage:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testNotificationStorage();
