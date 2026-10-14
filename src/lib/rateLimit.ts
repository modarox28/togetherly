import "server-only";

// Límite de uso sencillo en memoria: N peticiones por ventana de tiempo y por clave (IP).
// En Vercel cada instancia lleva su propia cuenta, así que es un freno básico contra abuso,
// no un contador exacto. Si algún día hace falta precisión, cambiar por Upstash/Redis.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 5000) pruneExpired(now);
    return false;
  }
  bucket.count += 1;
  return bucket.count > limit;
}

function pruneExpired(now: number) {
  for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
}

/** IP de quien hace la petición (Vercel la pone en x-forwarded-for). */
export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "desconocida";
}
