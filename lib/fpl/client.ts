const FPL_BASE = 'https://fantasy.premierleague.com/api';

export async function fetchFPL<T>(endpoint: string, revalidate = 60): Promise<T> {
  const res = await fetch(`${FPL_BASE}${endpoint}`, {
    headers: {
      'User-Agent': 'FPL-Rival-Spy/1.0 (NextJS Head-to-Head Engine)',
    },
    next: { revalidate },
  });

  if (!res.ok) {
    throw new Error(`FPL API request failed with status [${res.status}] for ${endpoint}`);
  }

  return res.json();
}
