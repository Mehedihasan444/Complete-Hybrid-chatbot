/**
 * In-memory IP-based rate limiter.
 * Used as a lightweight guard on auth and chat endpoints until a
 * proper distributed rate-limiter (Redis) is introduced.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 20; // per window per IP

const buckets = new Map<string, RateLimitEntry>();

function now(): number {
  return Date.now();
}

export function rateLimit(ip: string, options?: { maxRequests?: number; windowMs?: number }): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const maxRequests = options?.maxRequests ?? MAX_REQUESTS;
  const windowMs = options?.windowMs ?? WINDOW_MS;
  const entry = buckets.get(ip);

  const current = now();
  if (!entry || current > entry.resetAt) {
    buckets.set(ip, { count: 1, resetAt: current + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetAt: current + windowMs };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): boolean {
  return typeof email === 'string' && EMAIL_REGEX.test(email.trim());
}

// Minimum acceptable password length (was 6, far too weak for a medical app)
export const MIN_PASSWORD_LENGTH = 10;

export function validatePassword(password: string): { valid: boolean; reason?: string } {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return { valid: false, reason: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` };
  }
  return { valid: true };
}
