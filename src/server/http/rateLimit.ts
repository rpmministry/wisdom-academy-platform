import { prepare, withTransaction } from '../db';
import { rateLimitSalt } from '../config';
import { hashClientIp } from '../security/random';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/** Límite de tasa persistente, compartido entre procesos que usan la misma base. */
export function checkRateLimit(
  bucket: string,
  identifier: string,
  limit: number,
  windowSeconds: number
): RateLimitResult {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(nowSeconds / windowSeconds) * windowSeconds;
  const keyHash = hashClientIp(identifier || 'anonymous', rateLimitSalt());

  const count = withTransaction(() => {
    prepare(`
      INSERT INTO rate_limits (bucket, key_hash, window_start, count)
      VALUES (?, ?, ?, 1)
      ON CONFLICT(bucket, key_hash, window_start)
      DO UPDATE SET count = count + 1
    `).run(bucket, keyHash, windowStart);
    const row = prepare(
      'SELECT count FROM rate_limits WHERE bucket = ? AND key_hash = ? AND window_start = ?'
    ).get(bucket, keyHash, windowStart) as { count: number } | undefined;
    return Number(row?.count ?? 1);
  });

  if (Math.random() < 0.01) {
    prepare('DELETE FROM rate_limits WHERE window_start < ?').run(windowStart - 86400);
  }

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds: Math.max(1, windowStart + windowSeconds - nowSeconds),
  };
}

/** Reinicia el contador de una ventana tras un acceso legítimo. */
export function resetRateLimit(bucket: string, identifier: string, windowSeconds: number): void {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(nowSeconds / windowSeconds) * windowSeconds;
  const keyHash = hashClientIp(identifier || 'anonymous', rateLimitSalt());
  prepare('DELETE FROM rate_limits WHERE bucket = ? AND key_hash = ? AND window_start = ?').run(
    bucket,
    keyHash,
    windowStart
  );
}
