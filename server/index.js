import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getStorageMode, readState, writeState } from './storage.js';

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
const APP_PASSWORD = process.env.APP_PASSWORD || '';

app.use(cors({ origin: ['http://127.0.0.1:5173', 'http://localhost:5173'] }));
app.use(express.json({ limit: '2mb' }));

function requireAppAccess(req, res, next) {
  if (!APP_PASSWORD) {
    next();
    return;
  }

  if (req.get('x-app-password') === APP_PASSWORD) {
    next();
    return;
  }

  res.status(401).json({ error: 'App password required.' });
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
    requiresPassword: Boolean(APP_PASSWORD),
    storage: getStorageMode(),
  });
});

app.get('/api/data', requireAppAccess, async (_req, res) => {
  try {
    res.json(await readState());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/data', requireAppAccess, async (req, res) => {
  try {
    res.json(await writeState(req.body));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/analyze', requireAppAccess, upload.single('file'), async (req, res) => {
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

app.post('/api/ai/report', requireAppAccess, async (req, res) => {
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
