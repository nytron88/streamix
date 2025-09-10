import { NextRequest, NextResponse } from 'next/server';
import { ViewTrackingService } from '@/lib/services/viewTrackingService';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: vodId } = params;
    
    if (!vodId) {
      return NextResponse.json(
        { success: false, error: 'VOD ID is required' },
        { status: 400 }
      );
    }

    // Get session ID from request headers or generate one
    const sessionId = request.headers.get('x-session-id') || 
                     request.headers.get('user-agent')?.slice(-8) || 
                     Math.random().toString(36).substring(2, 15);

    // Track the view
    const wasCounted = await ViewTrackingService.trackView(vodId, sessionId);
    
    if (!wasCounted) {
      return NextResponse.json(
        { 
          success: true, 
          message: 'View already counted in this session',
          counted: false 
        },
        { status: 200 }
      );
    }

    // Get updated view count (Redis only for immediate response)
    const viewCount = await ViewTrackingService.getViewCount(vodId);

    return NextResponse.json({
      success: true,
      message: 'View tracked successfully',
      counted: true,
      viewCount
    });
  } catch (error) {
    console.error('Error tracking view:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to track view' },
      { status: 500 }
    );
  }
}