import type { IncomingMessage, ServerResponse } from 'node:http';
import { DUPLICATE_STUDENT_ERROR, GUARDIAN_PHONE_ERROR, isValidGuardianPhone } from '../src/lib/studentValidation.js';

type ApiRequest = IncomingMessage & { method?: string; body?: unknown };
type ApiResponse = ServerResponse<IncomingMessage>;

const allowedBelts = new Set(['White', 'Yellow', 'Green', 'Blue', 'Red', 'Black']);
const allowedStatuses = new Set(['active', 'suspended', 'left']);

function send(res: ApiResponse, status: number, body: Record<string, unknown>): void {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function readBody(req: ApiRequest): Promise<Record<string, unknown>> {
  if (req.body && typeof req.body === 'object') return req.body as Record<string, unknown>;
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== 'POST' && req.method !== 'PUT') {
    res.setHeader('Allow', 'POST, PUT');
    send(res, 405, { error: 'Method not allowed.' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    send(res, 503, { error: 'Supabase server configuration is missing.' });
    return;
  }

  try {
    const body = await readBody(req);
    const editingId = req.method === 'PUT' && typeof body.id === 'string' ? body.id : null;
    if (req.method === 'PUT' && !editingId) {
      send(res, 400, { error: 'A student ID is required to update a profile.' });
      return;
    }
    const name = typeof body.fullName === 'string' ? body.fullName.trim() : '';
    const groupId = typeof body.batchId === 'string' ? body.batchId.replace(/^Group\s+/i, '').trim() : '';
    const belt = typeof body.beltLevel === 'string' ? body.beltLevel : '';
    const phone = typeof body.guardianPhone === 'string' ? body.guardianPhone.trim() : '';
    const admissionDate = typeof body.admissionDate === 'string' ? body.admissionDate : '';
    const monthlyFee = Number(body.monthlyFee);
    const status = typeof body.status === 'string' ? body.status : 'active';

    if (!name || !groupId || !phone || !admissionDate || !allowedBelts.has(belt) || !allowedStatuses.has(status) || !Number.isFinite(monthlyFee) || monthlyFee < 0) {
      send(res, 400, { error: 'Please provide a valid name, group, guardian phone, belt, admission date, fee, and status.' });
      return;
    }
    if (!isValidGuardianPhone(phone)) {
      send(res, 400, { error: GUARDIAN_PHONE_ERROR });
      return;
    }
    const phoneDigits = phone.replace(/\D/g, '');

    const headers = {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    };

    const duplicateResponse = await fetch(
      `${supabaseUrl}/rest/v1/students?select=id,name,guardian_phone,is_deleted&name=ilike.${encodeURIComponent(name)}&limit=1000`,
      { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } },
    );
    if (!duplicateResponse.ok && duplicateResponse.status !== 400) throw new Error(`Could not check for duplicate students (${duplicateResponse.status}).`);
    const existingStudents = duplicateResponse.ok ? await duplicateResponse.json() as Array<{ id?: string; name?: string; guardian_phone?: string; is_deleted?: boolean }> : [];
    if (existingStudents.some((student) => student.id !== editingId && !student.is_deleted
      && student.name?.trim().toLocaleLowerCase() === name.toLocaleLowerCase()
      && student.guardian_phone?.replace(/\D/g, '') === phoneDigits)) {
      send(res, 409, { error: DUPLICATE_STUDENT_ERROR });
      return;
    }

    if (editingId) {
      const updateResponse = await fetch(`${supabaseUrl}/rest/v1/students?id=eq.${encodeURIComponent(editingId)}&select=*`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify({
          name,
          group_id: groupId,
          guardian_name: typeof body.guardianName === 'string' ? body.guardianName.trim() : '',
          guardian_phone: phone,
          belt_level: belt,
          admission_date: admissionDate,
          monthly_fee: monthlyFee,
          status,
          photo_url: typeof body.photoUrl === 'string' ? body.photoUrl : null,
          updated_at: new Date().toISOString(),
        }),
      });
      if (!updateResponse.ok) {
        const detail = await updateResponse.text();
        if (updateResponse.status === 409 || /23505|already exists/i.test(detail)) {
          send(res, 409, { error: DUPLICATE_STUDENT_ERROR });
          return;
        }
        console.error('Supabase student update failed:', updateResponse.status, detail);
        send(res, 502, { error: `Supabase could not update this student (${updateResponse.status}).` });
        return;
      }
      const [student] = await updateResponse.json() as Array<Record<string, unknown>>;
      if (!student) {
        send(res, 404, { error: 'Student not found.' });
        return;
      }
      send(res, 200, { student });
      return;
    }

    // Roll numbers are allocated from the current group's roster. Retry a conflict
    // so two registrations submitted at the same time do not lose either student.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const rosterResponse = await fetch(
        `${supabaseUrl}/rest/v1/students?select=roll_no&group_id=eq.${encodeURIComponent(groupId)}`,
        { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } },
      );
      if (!rosterResponse.ok) throw new Error(`Could not check the ${groupId} roster (${rosterResponse.status}).`);
      const roster = await rosterResponse.json() as Array<{ roll_no: string }>;
      const nextRoll = String(roster.reduce((max, row) => Math.max(max, Number(row.roll_no) || 0), 0) + 1);
      const insertResponse = await fetch(`${supabaseUrl}/rest/v1/students`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify({
          group_id: groupId,
          roll_no: nextRoll,
          name,
          guardian_name: typeof body.guardianName === 'string' ? body.guardianName.trim() : '',
          guardian_phone: phone,
          belt_level: belt,
          admission_date: admissionDate,
          monthly_fee: monthlyFee,
          status,
          photo_url: typeof body.photoUrl === 'string' ? body.photoUrl : null,
          source_imported: false,
          updated_at: new Date().toISOString(),
        }),
      });
      let savedResponse = insertResponse;
      let insertDetail = '';
      if (!insertResponse.ok) insertDetail = await insertResponse.text();
      if (!insertResponse.ok && insertResponse.status === 400 && /column .* does not exist|schema cache/i.test(insertDetail)) {
        // Older imports have only the source roster columns. Keep new profiles
        // durable there until the optional profile migration is applied.
        savedResponse = await fetch(`${supabaseUrl}/rest/v1/students`, {
          method: 'POST',
          headers: { ...headers, Prefer: 'return=representation' },
          body: JSON.stringify({
            group_id: groupId,
            roll_no: nextRoll,
            name,
            review_needed: false,
            source_note: `@attendpro-profile:${JSON.stringify({ guardianName: body.guardianName ?? '', guardianPhone: phone, beltLevel: belt, admissionDate, monthlyFee, status, photoUrl: body.photoUrl ?? null })}`,
          }),
        });
        if (!savedResponse.ok) insertDetail = await savedResponse.text();
      }
      if (savedResponse.ok) {
        const [student] = await savedResponse.json() as Array<Record<string, unknown>>;
        send(res, 201, { student });
        return;
      }
      if (savedResponse.status === 409 && attempt < 4) continue;
      if (savedResponse.status === 409 || /23505|already exists/i.test(insertDetail)) {
        send(res, 409, { error: DUPLICATE_STUDENT_ERROR });
        return;
      }
      if (savedResponse.status === 400 && /column .* does not exist|schema cache/i.test(insertDetail)) {
        send(res, 503, { error: 'The Supabase student profile migration has not been applied yet. Apply supabase/migrations/202609290001_student_profiles.sql in the Supabase SQL Editor, then retry.' });
        return;
      }
      console.error('Supabase student insert failed:', savedResponse.status, insertDetail);
      send(res, 502, { error: `Supabase could not save this student (${savedResponse.status}).` });
      return;
    }
    send(res, 409, { error: 'Could not allocate a unique roll number. Please retry.' });
  } catch (error) {
    console.error('Failed to save student to Supabase:', error);
    send(res, 500, { error: 'Could not save the student to Supabase.' });
  }
}
