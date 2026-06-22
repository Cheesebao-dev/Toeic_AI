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
  checkStorageConnection,
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
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const AI_PROVIDER = (process.env.AI_PROVIDER || (OPENAI_API_KEY ? 'openai-compatible' : 'gemini')).toLowerCase();
const JWT_SECRET = process.env.JWT_SECRET || process.env.APP_PASSWORD || 'local-dev-secret-change-me';
const AUTH_COOKIE = 'toeic_auth';
const LOCAL_FRONTEND_ORIGINS = ['http://127.0.0.1:5173', 'http://localhost:5173'];
const CONFIGURED_FRONTEND_ORIGINS = (process.env.FRONTEND_ORIGINS || process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const ALLOWED_FRONTEND_ORIGINS = new Set([...LOCAL_FRONTEND_ORIGINS, ...CONFIGURED_FRONTEND_ORIGINS]);
const IS_RENDER = Boolean(process.env.RENDER || process.env.RENDER_SERVICE_ID || process.env.RENDER_SERVICE_NAME);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || ALLOWED_FRONTEND_ORIGINS.has(origin) || CONFIGURED_FRONTEND_ORIGINS.length === 0) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function cookieOptions() {
  const crossSiteCookie = process.env.NODE_ENV === 'production' || IS_RENDER || CONFIGURED_FRONTEND_ORIGINS.length > 0;
  return {
    httpOnly: true,
    sameSite: crossSiteCookie ? 'none' : 'lax',
    secure: crossSiteCookie,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

function createAuthToken(user) {
  return jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '30d' });
}

function setAuthCookie(res, user) {
  const token = createAuthToken(user);
  res.cookie(AUTH_COOKIE, token, cookieOptions());
  return token;
}

function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE, { ...cookieOptions(), maxAge: 0 });
}

async function requireAuth(req, res, next) {
  const bearerToken = String(req.get('authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1];
  const cookieToken = req.cookies?.[AUTH_COOKIE];
  const tokens = [bearerToken, cookieToken].filter(Boolean);

  if (!tokens.length) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  for (const token of tokens) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      const user = await findUserById(payload.sub);
      if (user) {
        req.user = user;
        next();
        return;
      }
    } catch {
      // Try the next available auth source. A stale cookie must not block a valid bearer token.
    }
  }

  clearAuthCookie(res);
  res.status(401).json({ error: 'Invalid session.' });
}

function extractGeminiText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts || [];
  return parts.map((part) => part.text || '').join('\n').trim();
}

function extractOpenAiText(payload) {
  if (typeof payload?.output_text === 'string') return payload.output_text.trim();
  const output = Array.isArray(payload?.output) ? payload.output : [];
  const text = output
    .flatMap((item) => (Array.isArray(item?.content) ? item.content : []))
    .map((part) => part?.text || part?.content || '')
    .join('\n')
    .trim();
  if (text) return text;
  return String(payload?.choices?.[0]?.message?.content || '').trim();
}

function geminiPartToOpenAiContent(part) {
  if (part?.text) {
    return { type: 'text', text: part.text };
  }
  if (part?.inline_data?.data) {
    return {
      type: 'image_url',
      image_url: {
        url: `data:${part.inline_data.mime_type || 'application/octet-stream'};base64,${part.inline_data.data}`,
      },
    };
  }
  return null;
}

function escapeControlCharactersInJsonStrings(value) {
  let output = '';
  let inString = false;
  let escaped = false;

  for (const char of String(value || '')) {
    const code = char.charCodeAt(0);

    if (!inString) {
      if (char === '"') inString = true;
      output += char;
      continue;
    }

    if (escaped) {
      output += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      output += char;
      escaped = true;
      continue;
    }

    if (char === '"') {
      output += char;
      inString = false;
      continue;
    }

    if (char === '\n') {
      output += '\\n';
    } else if (char === '\r') {
      output += '\\r';
    } else if (char === '\t') {
      output += '\\t';
    } else if (code < 0x20) {
      output += `\\u${code.toString(16).padStart(4, '0')}`;
    } else {
      output += char;
    }
  }

  return output;
}

function tryParseJsonCandidate(candidate) {
  if (!candidate) return null;

  try {
    return JSON.parse(candidate);
  } catch {
    try {
      return JSON.parse(escapeControlCharactersInJsonStrings(candidate));
    } catch {
      return null;
    }
  }
}

function parseJsonText(text) {
  if (!text) return null;
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  const direct = tryParseJsonCandidate(trimmed);
  if (direct) return direct;

  const objectStart = trimmed.indexOf('{');
  const objectEnd = trimmed.lastIndexOf('}');
  const arrayStart = trimmed.indexOf('[');
  const arrayEnd = trimmed.lastIndexOf(']');
  const objectCandidate = objectStart >= 0 && objectEnd > objectStart ? trimmed.slice(objectStart, objectEnd + 1) : '';
  const arrayCandidate = arrayStart >= 0 && arrayEnd > arrayStart ? trimmed.slice(arrayStart, arrayEnd + 1) : '';

  return tryParseJsonCandidate(objectCandidate) || tryParseJsonCandidate(arrayCandidate);
}

async function callGemini({ parts, responseMimeType = 'application/json', temperature = 0.25 }) {
  if (!GEMINI_API_KEY) {
    const error = new Error('Chưa cấu hình GEMINI_API_KEY trên server.');
    error.status = 500;
    throw error;
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(
    GEMINI_API_KEY,
  )}`;

  const generationConfig = { temperature };
  if (responseMimeType) generationConfig.response_mime_type = responseMimeType;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const geminiMessage = payload?.error?.message || '';
    let message = geminiMessage || `Gemini request failed with ${response.status}`;
    if (response.status === 401 || response.status === 403) {
      message = 'GEMINI_API_KEY không hợp lệ hoặc chưa có quyền dùng model này.';
    } else if (response.status === 429) {
      message = 'Gemini đang hết quota hoặc bị giới hạn tốc độ. Vui lòng thử lại sau.';
    }
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return extractGeminiText(payload);
}

async function callOpenAiCompatible({ parts, responseMimeType = 'application/json', temperature = 0.25 }) {
  if (!OPENAI_API_KEY) {
    const error = new Error('Chưa cấu hình OPENAI_API_KEY trên server.');
    error.status = 500;
    throw error;
  }

  const content = parts.map(geminiPartToOpenAiContent).filter(Boolean);
  const wantsJson = responseMimeType === 'application/json';
  const body = {
    model: OPENAI_MODEL,
    messages: [{ role: 'user', content }],
    temperature,
  };
  if (wantsJson) {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const openAiMessage = payload?.error?.message || '';
    let message = openAiMessage || `OpenAI-compatible request failed with ${response.status}`;
    if (response.status === 401 || response.status === 403) {
      message = 'OPENAI_API_KEY hoặc OPENAI_BASE_URL không hợp lệ.';
    } else if (response.status === 429) {
      message = 'AI provider đang hết quota hoặc bị giới hạn tốc độ. Vui lòng thử lại sau.';
    }
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return extractOpenAiText(payload);
}

function callAiModel(options) {
  if (AI_PROVIDER === 'openai-compatible' || AI_PROVIDER === 'openai') {
    return callOpenAiCompatible(options);
  }
  return callGemini(options);
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

app.get('/api/health', async (_req, res) => {
  let storageHealth;
  try {
    storageHealth = await checkStorageConnection();
  } catch (error) {
    storageHealth = { ok: false, mode: getStorageMode(), error: error.message };
  }

  res.status(storageHealth.ok ? 200 : 503).json({
    ok: storageHealth.ok,
    provider: AI_PROVIDER,
    model: AI_PROVIDER === 'openai-compatible' || AI_PROVIDER === 'openai' ? OPENAI_MODEL : MODEL,
    hasGeminiKey: Boolean(GEMINI_API_KEY),
    hasOpenAiKey: Boolean(OPENAI_API_KEY),
    auth: 'email-password',
    storage: getStorageMode(),
    storageOk: storageHealth.ok,
    storageError: storageHealth.error || null,
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
    const token = setAuthCookie(res, user);
    res.status(201).json({ user: getPublicUser(user), token });
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

    const token = setAuthCookie(res, user);
    res.json({ user: getPublicUser(user), token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const token = setAuthCookie(res, req.user);
  res.json({ user: getPublicUser(req.user), token });
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

app.post('/api/ai/chat', requireAuth, async (req, res) => {
  try {
    const { message, history = [], context = {} } = req.body || {};
    const cleanMessage = String(message || '').trim();
    if (!cleanMessage) {
      res.status(400).json({ error: 'Vui lòng nhập câu hỏi.' });
      return;
    }
    if (cleanMessage.length > 1800) {
      res.status(400).json({ error: 'Câu hỏi quá dài. Hãy rút gọn nội dung cần hỏi.' });
      return;
    }

    const safeHistory = Array.isArray(history)
      ? history
          .slice(-8)
          .map((item) => ({
            role: item.role === 'assistant' ? 'assistant' : 'user',
            content: String(item.content || '').slice(0, 1000),
          }))
      : [];

    const prompt = `
Bạn là trợ lý ảo trong ứng dụng TOEIC Tracker AI cho người học Việt Nam.

Nhiệm vụ:
- Trả lời câu hỏi về TOEIC, cách luyện đề, cách sửa lỗi sai, cách dùng app.
- Ưu tiên lời khuyên ngắn gọn, thực tế, có bước hành động.
- Nếu câu hỏi cần phân tích một câu TOEIC cụ thể, hướng dẫn người dùng sang tab "AI phân tích" để lưu kết quả vào sổ lỗi.
- Nếu dữ liệu người dùng chưa đủ, nói rõ cần thêm nhật ký luyện đề hoặc lỗi sai.
- Không bịa điểm số, không nói bạn đã lưu dữ liệu nếu chưa có API lưu.
- Trả lời bằng tiếng Việt, tối đa 5 ý chính, không dùng markdown phức tạp.

Context học tập hiện tại:
${JSON.stringify(context, null, 2)}

Lịch sử chat gần nhất:
${JSON.stringify(safeHistory, null, 2)}

Câu hỏi mới:
${cleanMessage}
`;

    const reply = await callAiModel({
      parts: [{ text: prompt }],
      responseMimeType: null,
      temperature: 0.45,
    });

    res.json({ reply: reply || 'Mình chưa tạo được câu trả lời. Bạn thử hỏi lại ngắn gọn hơn nhé.' });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
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

    const text = await callAiModel({ parts });
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

Quan trọng: Phần trả lời cuối cùng chỉ được là nội dung Markdown thuần.

Stats:
${JSON.stringify(stats, null, 2)}

Recent sessions:
${JSON.stringify((sessions || []).slice(-12), null, 2)}

Open mistakes:
${JSON.stringify((mistakes || []).filter((item) => item.status !== 'Đã khắc phục').slice(-20), null, 2)}
`;
    const markdown = await callAiModel({ parts: [{ text: prompt }], responseMimeType: null, temperature: 0.35 });
    if (!markdown) {
      res.status(502).json({ error: 'AI response was empty.' });
      return;
    }
    res.json({ markdown });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: `Không tìm thấy API ${req.method} ${req.originalUrl}.` });
});

app.use((error, req, res, next) => {
  if (!req.path.startsWith('/api')) {
    next(error);
    return;
  }

  res.status(error.status || 500).json({ error: error.message || 'API backend gặp lỗi.' });
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
