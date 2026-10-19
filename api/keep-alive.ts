import type { IncomingMessage, ServerResponse } from 'node:http';

type ApiRequest = IncomingMessage & { method?: string };
type ApiResponse = ServerResponse<IncomingMessage>;

// Called daily by the Vercel cron in vercel.json. Supabase pauses free-tier
// projects after 7 days without database activity; this tiny read keeps it awake.
export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed.' }));
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Supabase environment variables are missing in Vercel.' }));
    return;
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/students?select=id&limit=1`, {
      headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
    });
    if (!response.ok) throw new Error(`Supabase query failed (${response.status}).`);
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ ok: true, checkedAt: new Date().toISOString() }));
  } catch (error) {
    console.error('Supabase keep-alive failed:', error);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Could not reach Supabase.' }));
  }
}
