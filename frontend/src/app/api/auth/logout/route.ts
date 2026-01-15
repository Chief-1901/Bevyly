import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookies, getRefreshToken } from '@/lib/auth/cookies';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

export async function POST(request: NextRequest) {
  try {
    const refreshToken = await getRefreshToken();

    // If we have a refresh token, revoke it on the backend
    if (refreshToken) {
      try {
        await fetch(`${BACKEND_URL}/api/v1/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        // Ignore backend errors during logout - still clear cookies
        console.warn('Failed to revoke refresh token on backend');
      }
    }

    // Clear cookies regardless
    await clearAuthCookies();

    return NextResponse.json({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  } catch (error) {
    console.error('Logout error:', error);
    // Still try to clear cookies
    await clearAuthCookies();
    
    return NextResponse.json({
      success: true,
      data: { message: 'Logged out' },
    });
  }
}

