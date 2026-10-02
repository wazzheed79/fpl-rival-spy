// Simple in-memory cache

const CACHE_TTL = 60 * 1000; // 1 minute

const memoryCache = new Map<string, { expiry: number; data: any }>();

export async function fetchWithCache(url: string) {
  const cached = memoryCache.get(url);

  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  const res = await fetch(url);
  const data = await res.json();

  memoryCache.set(url, {
    expiry: Date.now() + CACHE_TTL,
    data
  });

  return data;
}
