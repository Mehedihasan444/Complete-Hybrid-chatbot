/**
 * Health Check API Route
 * Endpoint for checking the health of the entire system.
 * Only exposes safe, non-sensitive service status information.
 */

import { NextRequest, NextResponse } from 'next/server';
import { pythonServerClient } from '@/lib/pythonServerClient';

export async function GET() {
  const startTime = Date.now();

  try {
    const pythonHealth = await pythonServerClient.checkHealth();
    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        nextjs: {
          status: 'healthy',
        },
        pythonServer: {
          ...pythonHealth,
          responseTime: responseTime,
        },
      },
      overallHealth: 'healthy',
      responseTime: responseTime,
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('Health check failed:', error);

    return NextResponse.json({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        nextjs: {
          status: 'healthy',
        },
        pythonServer: {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
          lastAttempt: new Date().toISOString(),
          responseTime: responseTime,
        },
      },
      overallHealth: 'degraded',
      responseTime: responseTime,
      fallbackMode: true,
      note: 'System running in fallback mode - Python server unavailable',
    }, { status: 503 });
  }
}
