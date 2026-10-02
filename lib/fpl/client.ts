const FPL_BASE = 'https://fantasy.premierleague.com/api';

export async function fetchFPL<T>(endpoint: string, revalidate = 60, timeoutMs = 8000): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${FPL_BASE}${endpoint}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 (FPL-Rival-Spy)',
        'Accept': 'application/json',
      },
      signal: controller.signal,
      next: { revalidate },
    });

    if (!res.ok) {
      throw new Error(`FPL API request failed with status [${res.status}] for ${endpoint}`);
    }

    return (await res.json()) as T;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error(`FPL API request timed out after ${timeoutMs}ms for ${endpoint}`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

