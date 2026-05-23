import { NextResponse } from 'next/server';
// import { emailService } from '../../lib/email-service';
import { checkRateLimit, RateLimitError } from '../../lib/rate-limit';

export async function GET(request: Request) {
  try {
    // Rate limit email tests to prevent spam
    await checkRateLimit(request, {
      interval: 60 * 1000, // 1 minute
      uniqueTokenPerInterval: 2, // 2 tests per minute
    });

    const { searchParams } = new URL(request.url);
    const testType = searchParams.get('type') || 'alert';

    if (testType === 'alert') {
      // TODO: Implement actual email sending
      console.log('📧 System Alert Email would be sent:', {
        subject: 'Email Service Test Successful',
        message: 'This is a test alert from your iBirdOS email system. If you received this, your SMTP configuration is working correctly!',
        to: 'silambarasan@ibirdos.com'
      });

      return NextResponse.json({
        success: true,
        message: 'System Alert test email logged (email service not yet implemented)!',
        sentTo: 'silambarasan@ibirdos.com'
      });
    }

    return NextResponse.json({
      error: 'Invalid test type. Use: ?type=alert'
    }, { status: 400 });

  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }

    const err = error as Error;
    console.error('Email test failed:', err);
    return NextResponse.json({
      success: false,
      error: err.message,
      details: err.stack
    }, { status: 500 });
  }
}