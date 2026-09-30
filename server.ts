import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { DUPLICATE_STUDENT_ERROR, GUARDIAN_PHONE_ERROR, isValidGuardianPhone } from './src/lib/studentValidation';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: '10mb' }));

// Supabase credentials stay on the server; the browser only calls this endpoint.
app.get('/api/dashboard-data', async (_req, res) => {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(503).json({ error: 'Supabase server configuration is missing.' });
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
    return res.json({ students, attendance });
  } catch (error) {
    console.error('Failed to load dashboard data from Supabase:', error);
    return res.status(502).json({ error: 'Could not load attendance data from Supabase.' });
  }
});

const saveStudentHandler: express.RequestHandler = async (req, res) => {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(503).json({ error: 'Supabase server configuration is missing.' });
  }
  const { fullName, guardianName, guardianPhone, batchId, beltLevel, monthlyFee, admissionDate, photoUrl, status } = req.body ?? {};
  const editingId = req.method === 'PUT' && typeof req.body?.id === 'string' ? req.body.id : null;
  if (req.method === 'PUT' && !editingId) return res.status(400).json({ error: 'A student ID is required to update a profile.' });
  const name = typeof fullName === 'string' ? fullName.trim() : '';
  const groupId = typeof batchId === 'string' ? batchId.replace(/^Group\s+/i, '').trim() : '';
  if (!name || !groupId || !guardianPhone || !admissionDate || !['White', 'Yellow', 'Green', 'Blue', 'Red', 'Black'].includes(beltLevel) || !['active', 'suspended', 'left'].includes(status) || !Number.isFinite(Number(monthlyFee)) || Number(monthlyFee) < 0) {
    return res.status(400).json({ error: 'Please provide a valid name, group, guardian phone, belt, admission date, fee, and status.' });
  }
  const phone = String(guardianPhone).trim();
  if (!isValidGuardianPhone(phone)) {
    return res.status(400).json({ error: GUARDIAN_PHONE_ERROR });
  }
  const phoneDigits = phone.replace(/\D/g, '');
  const headers = { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' };
  try {
    const duplicateResponse = await fetch(`${supabaseUrl}/rest/v1/students?select=id,name,guardian_phone,is_deleted&name=ilike.${encodeURIComponent(name)}&limit=1000`, { headers });
    if (!duplicateResponse.ok && duplicateResponse.status !== 400) throw new Error(`Could not check for duplicate students (${duplicateResponse.status}).`);
    const existingStudents = duplicateResponse.ok ? await duplicateResponse.json() as Array<{ id?: string; name?: string; guardian_phone?: string; is_deleted?: boolean }> : [];
    if (existingStudents.some((student) => student.id !== editingId && !student.is_deleted && student.name?.trim().toLocaleLowerCase() === name.toLocaleLowerCase() && student.guardian_phone?.replace(/\D/g, '') === phoneDigits)) {
      return res.status(409).json({ error: DUPLICATE_STUDENT_ERROR });
    }
    if (editingId) {
      const updateResponse = await fetch(`${supabaseUrl}/rest/v1/students?id=eq.${encodeURIComponent(editingId)}&select=*`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify({ name, group_id: groupId, guardian_name: String(guardianName ?? '').trim(), guardian_phone: phone, belt_level: beltLevel, admission_date: admissionDate, monthly_fee: Number(monthlyFee), status, photo_url: photoUrl || null, updated_at: new Date().toISOString() }),
      });
      if (!updateResponse.ok) {
        const detail = await updateResponse.text();
        if (updateResponse.status === 409 || /23505|already exists/i.test(detail)) return res.status(409).json({ error: DUPLICATE_STUDENT_ERROR });
        console.error('Supabase student update failed:', updateResponse.status, detail);
        return res.status(502).json({ error: `Supabase could not update this student (${updateResponse.status}).` });
      }
      const [student] = await updateResponse.json() as Array<Record<string, unknown>>;
      if (!student) return res.status(404).json({ error: 'Student not found.' });
      return res.json({ student });
    }
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const rosterResponse = await fetch(`${supabaseUrl}/rest/v1/students?select=roll_no&group_id=eq.${encodeURIComponent(groupId)}`, { headers });
      if (!rosterResponse.ok) throw new Error(`Could not check the roster (${rosterResponse.status}).`);
      const roster = await rosterResponse.json() as Array<{ roll_no: string }>;
      const rollNo = String(roster.reduce((max, row) => Math.max(max, Number(row.roll_no) || 0), 0) + 1);
      const insertResponse = await fetch(`${supabaseUrl}/rest/v1/students`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify({ group_id: groupId, roll_no: rollNo, name, guardian_name: String(guardianName ?? '').trim(), guardian_phone: phone, belt_level: beltLevel, admission_date: admissionDate, monthly_fee: Number(monthlyFee), status, photo_url: photoUrl || null, source_imported: false, updated_at: new Date().toISOString() }),
      });
      let savedResponse = insertResponse;
      let insertDetail = '';
      if (!insertResponse.ok) insertDetail = await insertResponse.text();
      if (!insertResponse.ok && insertResponse.status === 400 && /column .* does not exist|schema cache/i.test(insertDetail)) {
        savedResponse = await fetch(`${supabaseUrl}/rest/v1/students`, {
          method: 'POST',
          headers: { ...headers, Prefer: 'return=representation' },
          body: JSON.stringify({ group_id: groupId, roll_no: rollNo, name, review_needed: false, source_note: `@attendpro-profile:${JSON.stringify({ guardianName: guardianName ?? '', guardianPhone: String(guardianPhone).trim(), beltLevel, admissionDate, monthlyFee: Number(monthlyFee), status, photoUrl: photoUrl || null })}` }),
        });
        if (!savedResponse.ok) insertDetail = await savedResponse.text();
      }
      if (savedResponse.ok) {
        const [student] = await savedResponse.json() as Array<Record<string, unknown>>;
        return res.status(201).json({ student });
      }
      if (savedResponse.status === 409 && attempt < 4) continue;
      if (savedResponse.status === 409 || /23505|already exists/i.test(insertDetail)) return res.status(409).json({ error: DUPLICATE_STUDENT_ERROR });
      console.error('Supabase student insert failed:', savedResponse.status, insertDetail);
      return res.status(502).json({ error: `Supabase could not save this student (${savedResponse.status}).` });
    }
    return res.status(409).json({ error: 'Could not allocate a unique roll number. Please retry.' });
  } catch (error) {
    console.error('Failed to save student to Supabase:', error);
    return res.status(500).json({ error: 'Could not save the student to Supabase.' });
  }
};

app.post('/api/students', saveStudentHandler);
app.put('/api/students', saveStudentHandler);

// Lazy initialization of Gemini client
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not set in environment variables');
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// 1. Health check & Observability
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '2.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    geminiConfigured: !!process.env.GEMINI_API_KEY,
  });
});

// 2. Gemini AI Analysis Endpoint
app.post('/api/gemini/analyze', async (req, res) => {
  try {
    const { type, payload } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(503).json({
        error: 'Gemini API key is not configured in the server environment.',
        geminiConfigured: false,
      });
    }

    const ai = getAIClient();

    let systemInstruction =
      'You are an expert martial arts academy master coach and academy management advisor for Sunrise Taekwondo Centre. Provide encouraging, professional, precise, and actionable guidance.';
    let prompt = '';

    if (type === 'retention_risk') {
      prompt = `Analyze the following Taekwondo students with warning or suspension-level absences and provide:
1. A concise risk assessment.
2. 3 actionable retention interventions for the academy coach (e.g. phone call check-in, flexible makeup class).
3. Draft a warm, respectful WhatsApp message template in English and Arabic for the parent explaining the importance of consistent training.

Students Data:
${JSON.stringify(payload, null, 2)}`;
    } else if (type === 'star_citation') {
      prompt = `Draft an inspiring, formal Taekwondo Belt Award & "Star of the Month" Commendation Certificate Citation for the following top performing student:
Student Details:
${JSON.stringify(payload, null, 2)}

Include words praising their perseverance (Indomitable Spirit - Baekjulboolgool), attendance dedication, and martial etiquette. Keep it dignified and under 150 words.`;
    } else if (type === 'parent_notice') {
      prompt = `Draft a polite, professional absence follow-up message to the guardian of student ${payload.studentName} who has been absent for ${payload.absenceStreak} consecutive sessions. Include academy contact information and encouragement for their child to return to training this week.`;
    } else {
      // General Attendance & Academy Performance Insights
      prompt = `Review the current month attendance overview and stats for Sunrise Taekwondo:
${JSON.stringify(payload, null, 2)}

Provide:
1. Executive Summary of Academy Attendance Health (2 sentences).
2. Key Highlights (Best performing batch, attendance trend).
3. 2 Practical coaching recommendations to boost engagement and reduce dropouts next month.`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const text = response.text || 'Analysis generated successfully.';
    return res.json({ success: true, analysis: text });
  } catch (error: any) {
    console.error('Error in /api/gemini/analyze:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate Gemini AI insights',
    });
  }
});

// Setup Vite middleware or Static serving
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sunrise Taekwondo Server running on http://0.0.0.0:${PORT}`);
  });
}

start();
