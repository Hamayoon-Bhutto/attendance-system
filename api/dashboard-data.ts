import type { IncomingMessage, ServerResponse } from 'node:http';

type ApiRequest = IncomingMessage & { method?: string };
type ApiResponse = ServerResponse<IncomingMessage>;

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

  const query = async (table: string, select: string) => {
    const response = await fetch(`${supabaseUrl}/rest/v1/${table}?${select}`, {
      headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
    });
    if (!response.ok) throw new Error(`Supabase query failed (${response.status}).`);
    return response.json();
  };

  try {
    const [students, attendance] = await Promise.all([
      query('students', 'select=*&order=name.asc'),
      query('attendance', 'select=*,attendance_sessions!inner(id,session_key,session_date)&order=session_id.asc'),
    ]);
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ students, attendance }));
  } catch (error) {
    console.error('Failed to load dashboard data from Supabase:', error);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Could not load attendance data from Supabase.' }));
  }
}
