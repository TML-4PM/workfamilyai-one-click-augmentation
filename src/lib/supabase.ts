// Server-only Supabase client — never exposes service key to browser
// All API routes use SUPABASE_SERVICE_ROLE_KEY (no NEXT_PUBLIC_ prefix)
// Page components use NEXT_PUBLIC_ vars for client-side reads only

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const ANON_KEY      = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

async function sbFetch(sql: string, key: string): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({ query: sql }),
    cache: 'no-store',
  });
}

/** Server-side SELECT — uses service role key */
export async function supabaseQuery<T>(sql: string): Promise<T[]> {
  const res = await sbFetch(sql, SERVICE_KEY);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase error: ${res.status} — ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return (data.rows ?? []) as T[];
}

/** Server-side INSERT/UPDATE — uses service role key */
export async function supabaseInsert(sql: string): Promise<{ rows: unknown[]; success?: boolean }> {
  const res = await sbFetch(sql, SERVICE_KEY);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase insert error: ${res.status} — ${body.slice(0, 200)}`);
  }
  return res.json();
}

/** Client-side read (anon) — only for use in client components */
export async function supabasePublicQuery<T>(sql: string): Promise<T[]> {
  const res = await sbFetch(sql, ANON_KEY);
  if (!res.ok) throw new Error(`Supabase public error: ${res.status}`);
  const data = await res.json();
  return (data.rows ?? []) as T[];
}
