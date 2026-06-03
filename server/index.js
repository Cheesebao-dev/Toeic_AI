import 'dotenv/config';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createUser,
  findUserByEmail,
  findUserById,
  getPublicUser,
  getStorageMode,
  readState,
  writeState,
} from './storage.js';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(__dirname, '..', 'dist');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

const PORT = Number(process.env.PORT || 8787);
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const JWT_SECRET = process.env.JWT_SECRET || process.env.APP_PASSWORD || 'local-dev-secret-change-me';
const AUTH_COOKIE = 'toeic_auth';

app.use(
  cors({
    origin: ['http://127.0.0.1:5173', 'http://localhost:5173'],
    credentials: true,
  }),
);
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

function setAuthCookie(res, user) {
  const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '30d' });
  res.cookie(AUTH_COOKIE, token, cookieOptions());
}

function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE, { ...cookieOptions(), maxAge: 0 });
}

async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[AUTH_COOKIE];
    if (!token) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const payload = jwt.verify(token, JWT_SECRET);
    const user = await findUserById(payload.sub);
    if (!user) {
      clearAuthCookie(res);
      res.status(401).json({ error: 'User not found.' });
      return;
    }

    req.user = user;
    next();
  } catch {
    clearAuthCookie(res);
    res.status(401).json({ error: 'Invalid session.' });
  }
}

function extractGeminiText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts || [];
  return parts.map((part) => part.text || '').join('\n').trim();
}

function parseJsonText(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!match) return null;
    return JSON.parse(match[0]);
  }
}

async function callGemini({ parts, responseMimeType = 'application/json', temperature = 0.25 }) {
  if (!GEMINI_API_KEY) {
    const error = new Error('Missing GEMINI_API_KEY in .env');
    error.status = 500;
    throw error;
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(
    GEMINI_API_KEY,
  )}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature,
        response_mime_type: responseMimeType,
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || `Gemini request failed with ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return extractGeminiText(payload);
}

const analysisPrompt = ({ part, userAnswer, questionText }) => `
Bạn là trợ lý luyện thi TOEIC cho người Việt. Hãy phân tích câu hỏi TOEIC bên dưới.

Yêu cầu bắt buộc:
- Nếu có nhiều câu, tách thành từng câu riêng.
- Trả về JSON hợp lệ, không markdown, không thêm chữ ngoài JSON.
- Nếu thiếu dữ liệu, vẫn trả JSON và đặt confidence_score thấp.
- Giải thích ngắn gọn, đúng trọng tâm, dễ học lại.
- mistake_type chỉ chọn một trong: Từ vựng, Ngữ pháp, Chọn sai loại từ, Sai thì, Sai giới từ, Sai collocation, Không hiểu ngữ cảnh, Đọc thiếu thông tin, Suy luận sai, Bẫy đáp án, Nghe nhầm âm, Không bắt được keyword, Thiếu thời gian, Lỗi bất cẩn, Khác.

Schema:
{
  "questions": [
    {
      "question_number": "101",
      "question_text": "...",
      "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
      "user_answer": "A",
      "correct_answer": "B",
      "is_correct": false,
      "explanation": "...",
      "wrong_option_analysis": { "A": "...", "C": "...", "D": "..." },
      "vietnamese_translation": "...",
      "mistake_type": "Ngữ pháp",
      "improvement_tip": "...",
      "confidence_score": 0.85
    }
  ]
}

Dữ liệu người học:
- Part TOEIC: ${part || 'Chưa rõ'}
- Đáp án người học chọn: ${userAnswer || 'Chưa nhập'}
- Câu hỏi nhập bằng text: ${questionText || 'Không có text, hãy đọc từ file/ảnh nếu được gửi kèm.'}
`;

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    model: MODEL,
    hasGeminiKey: Boolean(GEMINI_API_KEY),
    auth: 'email-password',
    storage: getStorageMode(),
  });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'Email không hợp lệ.' });
      return;
    }
    if (String(password || '').length < 6) {
      res.status(400).json({ error: 'Mật khẩu cần ít nhất 6 ký tự.' });
      return;
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      res.status(409).json({ error: 'Email này đã có tài khoản.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await createUser({
      id: randomUUID(),
      name,
      email,
      passwordHash,
    });
    setAuthCookie(res, user);
    res.status(201).json({ user: getPublicUser(user) });
  } catch (error) {
    if (error.code === '23505' || error.code === 'duplicate_email') {
      res.status(409).json({ error: 'Email này đã có tài khoản.' });
      return;
    }
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const user = await findUserByEmail(email);
    if (!user) {
      res.status(401).json({ error: 'Email hoặc mật khẩu không đúng.' });
      return;
    }

    const ok = await bcrypt.compare(String(password || ''), user.password_hash);
    if (!ok) {
      res.status(401).json({ error: 'Email hoặc mật khẩu không đúng.' });
      return;
    }

    setAuthCookie(res, user);
    res.json({ user: getPublicUser(user) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: getPublicUser(req.user) });
});

app.post('/api/auth/logout', (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

app.get('/api/data', requireAuth, async (req, res) => {
  try {
    res.json(await readState(req.user.id));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/data', requireAuth, async (req, res) => {
  try {
    res.json(await writeState(req.user.id, req.body));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/analyze', requireAuth, upload.single('file'), async (req, res) => {
  try {
    const { part, userAnswer, questionText } = req.body;
    const parts = [{ text: analysisPrompt({ part, userAnswer, questionText }) }];

    if (req.file) {
      parts.push({
        inline_data: {
          mime_type: req.file.mimetype || 'application/octet-stream',
          data: req.file.buffer.toString('base64'),
        },
      });
    }

    const text = await callGemini({ parts });
    const parsed = parseJsonText(text);
    if (!parsed?.questions) {
      res.status(502).json({ error: 'AI response was not valid analysis JSON.', raw: text });
      return;
    }
    res.json(parsed);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.post('/api/ai/report', requireAuth, async (req, res) => {
  try {
    const { stats, sessions, mistakes } = req.body;
    const prompt = `
Bạn là cố vấn học TOEIC. Hãy tạo báo cáo học tập bằng Markdown tiếng Việt.

Yêu cầu:
- Ngắn gọn, thực tế, có hành động cụ thể.
- Nhận xét tiến độ, part yếu, loại lỗi lặp lại, và kế hoạch 7 ngày.
- Không bịa dữ liệu ngoài JSON được cung cấp.
- Trả về JSON hợp lệ theo schema: { "markdown": "..." }

Stats:
${JSON.stringify(stats, null, 2)}

Recent sessions:
${JSON.stringify((sessions || []).slice(-12), null, 2)}

Open mistakes:
${JSON.stringify((mistakes || []).filter((item) => item.status !== 'Đã khắc phục').slice(-20), null, 2)}
`;
    const text = await callGemini({ parts: [{ text: prompt }], temperature: 0.35 });
    const parsed = parseJsonText(text);
    if (!parsed?.markdown) {
      res.status(502).json({ error: 'AI response was not valid report JSON.', raw: text });
      return;
    }
    res.json(parsed);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.use(express.static(distPath));

app.get(/.*/, (req, res, next) => {
  if (req.path.startsWith('/api')) {
    next();
    return;
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`TOEIC AI backend listening on http://127.0.0.1:${PORT}`);
});
