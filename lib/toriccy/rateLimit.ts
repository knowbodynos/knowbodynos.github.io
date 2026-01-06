// lib/toriccy/rateLimit.ts
import 'server-only'

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

export function rateLimitOrThrow(key: string, opts: { windowMs: number; max: number }): void {
  const now = Date.now()
  const windowMs = Math.max(1000, opts.windowMs)
  const max = Math.max(1, opts.max)

  const b = buckets.get(key)
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return
  }

  if (b.count >= max) {
    const retryAfterSec = Math.max(1, Math.ceil((b.resetAt - now) / 1000))
    const err = Object.assign(new Error('Rate limit exceeded'), {
      status: 429,
      retryAfterSec,
    })
    throw err
  }

  b.count += 1
  buckets.set(key, b)
}
