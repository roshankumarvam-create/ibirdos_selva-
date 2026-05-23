import { NextRequest } from 'next/server';

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

interface RateLimitOptions {
  interval: number; // in milliseconds
  uniqueTokenPerInterval: number;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store (for production, use Redis or similar)
const rateLimitStore: RateLimitStore = {};

export async function checkRateLimit(
  request: Request | NextRequest,
  options: RateLimitOptions
): Promise<void> {
  const { interval, uniqueTokenPerInterval } = options;

  // Get client identifier (IP address)
  const ip = getClientIP(request);
  const key = `rate-limit:${ip}`;

  const now = Date.now();
  const windowStart = Math.floor(now / interval) * interval;

  // Clean up expired entries
  Object.keys(rateLimitStore).forEach(k => {
    if (rateLimitStore[k].resetTime < now) {
      delete rateLimitStore[k];
    }
  });

  // Initialize or get current count
  if (!rateLimitStore[key] || rateLimitStore[key].resetTime < now) {
    rateLimitStore[key] = {
      count: 0,
      resetTime: windowStart + interval,
    };
  }

  // Check if limit exceeded
  if (rateLimitStore[key].count >= uniqueTokenPerInterval) {
    const resetTime = new Date(rateLimitStore[key].resetTime);
    const remainingTime = Math.ceil((resetTime.getTime() - now) / 1000);

    throw new RateLimitError(
      `Rate limit exceeded. Try again in ${remainingTime} seconds.`
    );
  }

  // Increment counter
  rateLimitStore[key].count++;
}

function getClientIP(request: Request | NextRequest): string {
  // Try to get IP from various headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const clientIP = request.headers.get('x-client-ip');

  // Use the first available IP
  const ip = forwarded?.split(',')[0]?.trim() ||
             realIP ||
             clientIP ||
             'unknown';

  return ip;
}