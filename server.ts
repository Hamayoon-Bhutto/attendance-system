import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

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
