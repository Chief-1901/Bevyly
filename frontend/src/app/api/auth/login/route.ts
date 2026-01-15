import { NextRequest, NextResponse } from 'next/server';
import { setAuthCookies } from '@/lib/auth/cookies';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Forward login request to backend
    const response = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return NextResponse.json(
        {
          success: false,
          error: data.error || {
            code: 'LOGIN_FAILED',
            message: 'Invalid email or password',
          },
        },
        { status: response.status }
      );
    }

    // Set HttpOnly cookies with tokens
    await setAuthCookies(data.data.tokens.accessToken, data.data.tokens.refreshToken);

    // Return user info (without tokens - they're in cookies now)
    return NextResponse.json({
      success: true,
      data: {
        user: data.data.user,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
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

