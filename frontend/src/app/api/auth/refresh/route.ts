import { NextRequest, NextResponse } from 'next/server';
import { setAuthCookies, getRefreshToken, clearAuthCookies } from '@/lib/auth/cookies';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

export async function POST(request: NextRequest) {
  try {
    const refreshToken = await getRefreshToken();

    if (!refreshToken) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NO_REFRESH_TOKEN',
            message: 'No refresh token available',
          },
        },
        { status: 401 }
      );
    }

    // Forward refresh request to backend
    const response = await fetch(`${BACKEND_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      // Clear invalid cookies
      await clearAuthCookies();
      
      return NextResponse.json(
        {
          success: false,
          error: data.error || {
            code: 'REFRESH_FAILED',
            message: 'Could not refresh session',
          },
        },
        { status: 401 }
      );
    }

    // Update access token cookie (refresh token stays the same)
    // The backend refresh only returns accessToken, not a new refreshToken
    const existingRefreshToken = await getRefreshToken();
    await setAuthCookies(data.data.accessToken, existingRefreshToken || '');

    return NextResponse.json({
      success: true,
      data: { accessToken: data.data.accessToken },
    });
  } catch (error) {
    console.error('Refresh error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      },
      { status: 500 }
    );
  }
}

