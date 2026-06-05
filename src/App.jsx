import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Bot,
  Brain,
  CalendarDays,
  ChevronDown,
  CheckCircle2,
  ClipboardList,
  Download,
  Edit3,
  Eye,
  EyeOff,
  FileText,
  Filter,
  History,
  LayoutDashboard,
  LogOut,
  Lock,
  Mail,
  Menu,
  MessageCircle,
  NotebookTabs,
  Plus,
  Save,
  Search,
  Send,
  Sparkles,
  Target,
  Trash2,
  Upload,
  UserRound,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const STORAGE_KEY = 'toeic-tracker-ai-state-v1';
const AUTH_TOKEN_KEY = 'toeic-tracker-ai-auth-token';
const EMPTY_STATE = { sessions: [], mistakes: [], reports: [] };

const PARTS = [
  { id: 'Part 1', skill: 'Listening', totalQuestions: 6 },
  { id: 'Part 2', skill: 'Listening', totalQuestions: 25 },
  { id: 'Part 3', skill: 'Listening', totalQuestions: 39 },
  { id: 'Part 4', skill: 'Listening', totalQuestions: 30 },
  { id: 'Part 5', skill: 'Reading', totalQuestions: 30 },
  { id: 'Part 6', skill: 'Reading', totalQuestions: 16 },
  { id: 'Part 7', skill: 'Reading', totalQuestions: 54 },
];

const MISTAKE_TYPES = [
  'Từ vựng',
  'Ngữ pháp',
  'Chọn sai loại từ',
  'Sai thì',
  'Sai giới từ',
  'Sai collocation',
  'Không hiểu ngữ cảnh',
  'Đọc thiếu thông tin',
  'Suy luận sai',
  'Bẫy đáp án',
  'Nghe nhầm âm',
  'Không bắt được keyword',
  'Thiếu thời gian',
  'Lỗi bất cẩn',
  'Khác',
];

const STATUSES = ['Chưa xử lý', 'Đang ôn lại', 'Đã hiểu', 'Đã khắc phục', 'Cần ôn lại sau'];
const ANSWERS = ['', 'A', 'B', 'C', 'D'];
const PIE_COLORS = ['#2f6df0', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#0ea5e9', '#475569'];
const PART_BAR_COLOR = '#2f6df0';
const SCORE_SELECT_PLACEHOLDER = 'Ch\u1ecdn';
const VOCAB_MODE = 'Vocab';
const VOCAB_GOAL_WORDS = 1000;
const SESSION_MODES = ['Full test', 'Listening', 'Reading', 'Part riêng', VOCAB_MODE];
const DEPLOYED_API_ORIGIN = 'https://toeic-ai-tracker.onrender.com';
const API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL
    || (typeof window !== 'undefined'
      && window.location.hostname !== 'localhost'
      && window.location.hostname !== '127.0.0.1'
      && window.location.origin !== DEPLOYED_API_ORIGIN
      ? DEPLOYED_API_ORIGIN
      : ''),
).replace(/\/+$/, '');

const AUTH_VISUAL_SLIDES = [
  {
    id: 'practice',
    kind: 'practice',
    nodes: { top: 'AI', middle: 'T', bottom: '990' },
    panelTitle: 'Practice',
    filters: ['Full test', 'Today'],
    rows: [
      { avatar: 'avatar-one', label: 'Full TOEIC test', detail: 'Listening + Reading' },
      { avatar: 'avatar-two', label: 'Part accuracy', detail: 'P5 34/40, P7 42/54' },
      { avatar: 'avatar-three', label: 'Study note', detail: 'Review vocabulary traps' },
    ],
    title: 'Connect every TOEIC practice.',
    description: 'Track tests, mistakes, AI feedback, and progress in one focused dashboard.',
  },
  {
    id: 'mistakes',
    kind: 'mistakes',
    nodes: { top: 'AI', middle: 'P5', bottom: 'Fix' },
    panelTitle: 'Mistakes',
    filters: ['Part 5', 'Review'],
    rows: [
      { avatar: 'avatar-one', label: 'Wrong answer', detail: 'Grammar and collocation' },
      { avatar: 'avatar-two', label: 'AI explanation', detail: 'Meaning, trap, correction' },
      { avatar: 'avatar-three', label: 'Review status', detail: 'Needs one more repeat' },
    ],
    title: 'Turn mistakes into review tasks.',
    description: 'Save explanations, translations, wrong-answer reasons, and next actions.',
  },
  {
    id: 'progress',
    kind: 'progress',
    nodes: { top: 'L/R', middle: 'T', bottom: '990' },
    panelTitle: 'Progress',
    filters: ['Score', 'Trend'],
    rows: [
      { avatar: 'avatar-one', label: 'Latest estimate', detail: '720 toward 990' },
      { avatar: 'avatar-two', label: 'Weakest part', detail: 'Part 7 detail reading' },
      { avatar: 'avatar-three', label: 'Accuracy trend', detail: '84% this week' },
    ],
    title: 'Follow progress toward 990.',
    description: 'Compare scores, accuracy, weak parts, and study minutes after each test.',
  },
];
const AUTH_LOOP_SLIDES = [...AUTH_VISUAL_SLIDES, { ...AUTH_VISUAL_SLIDES[0], id: 'practice-loop' }];
const AUTH_SLIDE_INTERVAL_MS = 5000;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function createBlankPartScores() {
  return PARTS.reduce((acc, part) => {
    acc[part.id] = { correct: '' };
    return acc;
  }, {});
}

function createBlankSession() {
  return {
    id: '',
    date: today(),
    title: '',
    mode: 'Full test',
    durationMinutes: '',
    vocabularyWords: '',
    focus: 'Bình thường',
    notes: '',
    reflection: '',
    partScores: createBlankPartScores(),
  };
}

function createBlankMistake() {
  return {
    id: '',
    createdAt: today(),
    sourceTitle: '',
    part: 'Part 5',
    skill: 'Reading',
    questionNumber: '',
    questionText: '',
    options: { A: '', B: '', C: '', D: '' },
    userAnswer: '',
    correctAnswer: '',
    explanation: '',
    wrongOptionAnalysis: '',
    vietnameseTranslation: '',
    mistakeType: 'Khác',
    improvementTip: '',
    status: 'Chưa xử lý',
    personalNote: '',
    aiConfidence: '',
  };
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function useTypewriterText(text, active, { step = 4, interval = 12, initialDelay = 120, onDone } = {}) {
  const target = String(text || '');
  const [displayText, setDisplayText] = useState(active ? '' : target);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (!active) {
      setDisplayText(target);
      return undefined;
    }

    let timeoutId;
    let index = 0;
    setDisplayText('');

    function finish() {
      timeoutId = window.setTimeout(() => onDoneRef.current?.(), 180);
    }

    function tick() {
      index = Math.min(target.length, index + step);
      setDisplayText(target.slice(0, index));

      if (index >= target.length) {
        finish();
        return;
      }

      timeoutId = window.setTimeout(tick, interval);
    }

    if (!target) {
      finish();
    } else {
      timeoutId = window.setTimeout(tick, initialDelay);
    }

    return () => window.clearTimeout(timeoutId);
  }, [target, active, step, interval, initialDelay]);

  return displayText;
}

function TypingText({ text, active = true, onDone }) {
  const displayText = useTypewriterText(text, active, { step: 3, interval: 12, initialDelay: 80, onDone });

  return (
    <>
      {displayText}
      {active && <i className="typewriter-caret" aria-hidden="true" />}
    </>
  );
}

function formatInlineMarkdown(text, keyPrefix) {
  const source = String(text || '');
  const parts = [];
  const boldPattern = /\*\*(.+?)\*\*/g;
  let cursor = 0;
  let matchIndex = 0;
  let match = boldPattern.exec(source);

  while (match) {
    if (match.index > cursor) {
      parts.push(source.slice(cursor, match.index));
    }
    parts.push(<strong key={`${keyPrefix}-strong-${matchIndex}`}>{match[1]}</strong>);
    cursor = match.index + match[0].length;
    matchIndex += 1;
    match = boldPattern.exec(source);
  }

  if (cursor < source.length) {
    parts.push(source.slice(cursor));
  }

  return parts.length ? parts : source;
}

function getReadableMarkdownText(markdown) {
  return String(markdown || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line
      .replace(/^#{1,6}\s+/, '')
      .replace(/^(\s*)[-*]\s+/, '$1- ')
      .replace(/^(\s*)\d+[.)]\s+/, '$1')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/^\s*>\s?/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function MarkdownReport({ markdown, compact = false, animated = false, onAnimationEnd }) {
  const visibleMarkdown = useTypewriterText(markdown, animated, {
    step: compact ? 6 : 5,
    interval: compact ? 8 : 10,
    initialDelay: 120,
    onDone: onAnimationEnd,
  });
  const lines = String(visibleMarkdown || '').replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let paragraph = [];

  function pushParagraph() {
    if (!paragraph.length) return;
    const text = paragraph.join(' ').trim();
    if (text) {
      blocks.push(<p key={`paragraph-${blocks.length}`}>{formatInlineMarkdown(text, `paragraph-${blocks.length}`)}</p>);
    }
    paragraph = [];
  }

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index].replace(/\s+$/, '');
    const trimmed = rawLine.trim();

    if (!trimmed) {
      pushParagraph();
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      pushParagraph();
      const HeadingTag = `h${Math.min(headingMatch[1].length + 2, 5)}`;
      blocks.push(
        <HeadingTag key={`heading-${blocks.length}`}>
          {formatInlineMarkdown(headingMatch[2], `heading-${blocks.length}`)}
        </HeadingTag>,
      );
      continue;
    }

    if (/^-{3,}$/.test(trimmed)) {
      pushParagraph();
      blocks.push(<hr key={`rule-${blocks.length}`} />);
      continue;
    }

    const unorderedMatch = rawLine.match(/^(\s*)[-*]\s+(.+)$/);
    const orderedMatch = rawLine.match(/^(\s*)\d+[.)]\s+(.+)$/);
    if (unorderedMatch || orderedMatch) {
      pushParagraph();
      const isOrdered = Boolean(orderedMatch);
      const ListTag = isOrdered ? 'ol' : 'ul';
      const listItems = [];

      for (let listIndex = index; listIndex < lines.length; listIndex += 1) {
        const itemLine = lines[listIndex].replace(/\s+$/, '');
        const itemMatch = isOrdered
          ? itemLine.match(/^(\s*)\d+[.)]\s+(.+)$/)
          : itemLine.match(/^(\s*)[-*]\s+(.+)$/);

        if (!itemMatch) break;

        listItems.push({
          indent: Math.min(Math.floor(itemMatch[1].length / 2), 3),
          text: itemMatch[2].trim(),
        });
        index = listIndex;
      }

      blocks.push(
        <ListTag key={`list-${blocks.length}`}>
          {listItems.map((item, itemIndex) => (
            <li
              key={`item-${itemIndex}`}
              className={item.indent ? 'markdown-list-nested' : undefined}
              style={item.indent ? { '--list-indent': item.indent } : undefined}
            >
              {formatInlineMarkdown(item.text, `list-${blocks.length}-${itemIndex}`)}
            </li>
          ))}
        </ListTag>,
      );
      continue;
    }

    paragraph.push(trimmed);
  }

  pushParagraph();

  return (
    <div className={`markdown-box ${compact ? 'mini' : ''}${animated ? ' is-writing' : ''}`} aria-live={animated ? 'polite' : undefined}>
      {blocks}
      {animated && <i className="typewriter-caret markdown-caret" aria-hidden="true" />}
    </div>
  );
}

function cleanReportLine(line) {
  return String(line || '')
    .replace(/^#{1,6}\s+/, '')
    .replace(/^\s*[-*]\s+/, '')
    .replace(/^\s*\d+[.)]\s+/, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/[`_]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getReportTitle(markdown) {
  const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');
  const heading = lines.find((line) => /^#{1,6}\s+\S/.test(line.trim()));
  const firstLine = heading || lines.find((line) => cleanReportLine(line));
  const title = cleanReportLine(firstLine);

  return title || 'Báo cáo học tập';
}

function getReportSummary(markdown) {
  const title = getReportTitle(markdown);
  const summary = String(markdown || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => ({ raw: line.trim(), text: cleanReportLine(line) }))
    .filter((line) => line.text && line.text !== title && !/^#{1,6}\s+/.test(line.raw) && !/^-{3,}$/.test(line.raw))
    .map((line) => line.text)
    .slice(0, 3)
    .join(' ');

  return summary || 'Chưa có nội dung tóm tắt.';
}

function getLocalDateKey(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return '';
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60000);

  return local.toISOString().slice(0, 10);
}

function getReportDateKey(report) {
  if (report?.createdDate) return report.createdDate;
  if (report?.createdAtIso) return getLocalDateKey(report.createdAtIso);

  const createdAt = String(report?.createdAt || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(createdAt)) return createdAt;

  const vietnameseDate = createdAt.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (vietnameseDate) {
    const [, day, month, year] = vietnameseDate;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return getLocalDateKey(createdAt);
}

function isReportToday(report) {
  return getReportDateKey(report) === getLocalDateKey();
}

function formatReportTimestamp(date) {
  return date.toLocaleString('vi-VN');
}

function getReportDayLabel(report) {
  if (isReportToday(report)) return 'Hôm nay';

  const dateKey = getReportDateKey(report);
  if (!dateKey) return 'Không rõ ngày';

  const [year, month, day] = dateKey.split('-');
  return `${day}/${month}/${year}`;
}

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function vocabularyWordValue(session) {
  return clamp(numberValue(session?.vocabularyWords ?? session?.vocabWords), 0, VOCAB_GOAL_WORDS);
}

function hasInputValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function isPartAttempted(row) {
  return hasInputValue(row?.correct) || numberValue(row?.total) > 0;
}

function fixedPartTotal(row, part) {
  return isPartAttempted(row) ? part.totalQuestions : 0;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function estimateToeicSectionScore(correct, total) {
  if (!total || !correct) return 5;
  const ratio = clamp(correct / total, 0, 1);
  const table = [
    [0, 5],
    [0.1, 60],
    [0.2, 115],
    [0.3, 170],
    [0.4, 225],
    [0.5, 280],
    [0.6, 335],
    [0.7, 390],
    [0.8, 435],
    [0.9, 475],
    [1, 495],
  ];
  for (let i = 1; i < table.length; i += 1) {
    const [ratioEnd, scoreEnd] = table[i];
    const [ratioStart, scoreStart] = table[i - 1];
    if (ratio <= ratioEnd) {
      const progress = (ratio - ratioStart) / (ratioEnd - ratioStart);
      return Math.round((scoreStart + progress * (scoreEnd - scoreStart)) / 5) * 5;
    }
  }
  return 495;
}

function sumPartScores(partScores, skill) {
  return PARTS.filter((part) => part.skill === skill).reduce(
    (acc, part) => {
      const row = partScores?.[part.id] || {};
      const total = fixedPartTotal(row, part);
      acc.correct += clamp(numberValue(row.correct), 0, total);
      acc.total += total;
      return acc;
    },
    { correct: 0, total: 0 },
  );
}

function calculateSession(session) {
  const listening = sumPartScores(session.partScores, 'Listening');
  const reading = sumPartScores(session.partScores, 'Reading');
  const totalCorrect = listening.correct + reading.correct;
  const totalQuestions = listening.total + reading.total;
  const listeningScore = listening.total ? estimateToeicSectionScore(listening.correct, listening.total) : 0;
  const readingScore = reading.total ? estimateToeicSectionScore(reading.correct, reading.total) : 0;
  return {
    listening,
    reading,
    totalCorrect,
    totalQuestions,
    wrong: Math.max(0, totalQuestions - totalCorrect),
    accuracy: totalQuestions ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
    listeningScore,
    readingScore,
    totalScore: listeningScore + readingScore,
  };
}

function calculateStats(sessions, mistakes) {
  const totals = sessions.reduce(
    (acc, session) => {
      const calc = calculateSession(session);
      acc.totalQuestions += calc.totalQuestions;
      acc.totalCorrect += calc.totalCorrect;
      acc.totalWrong += calc.wrong;
      acc.minutes += numberValue(session.durationMinutes);
      acc.vocabularyWords += vocabularyWordValue(session);
      if (session.mode === VOCAB_MODE && vocabularyWordValue(session)) acc.vocabSessions += 1;
      if (calc.totalScore) acc.latestScore = calc.totalScore;
      PARTS.forEach((part) => {
        const row = session.partScores?.[part.id] || {};
        const total = fixedPartTotal(row, part);
        acc.parts[part.id].correct += clamp(numberValue(row.correct), 0, total);
        acc.parts[part.id].total += total;
      });
      return acc;
    },
    {
      totalQuestions: 0,
      totalCorrect: 0,
      totalWrong: 0,
      minutes: 0,
      vocabularyWords: 0,
      vocabSessions: 0,
      latestScore: 0,
      parts: PARTS.reduce((acc, part) => {
        acc[part.id] = { correct: 0, total: 0 };
        return acc;
      }, {}),
    },
  );

  const partAccuracy = PARTS.map((part) => {
    const row = totals.parts[part.id];
    return {
      part: part.id.replace('Part ', 'P'),
      fullPart: part.id,
      skill: part.skill,
      accuracy: row.total ? Math.round((row.correct / row.total) * 100) : 0,
      total: row.total,
    };
  });
  const practicedParts = partAccuracy.filter((part) => part.total > 0);
  const weakestPart = practicedParts.length
    ? practicedParts.reduce((weakest, part) => (part.accuracy < weakest.accuracy ? part : weakest)).fullPart
    : 'Chưa có dữ liệu';

  const mistakeTypeCounts = mistakes.reduce((acc, mistake) => {
    const key = mistake.mistakeType || 'Khác';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const topMistakeType =
    Object.entries(mistakeTypeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Chưa có dữ liệu';
  const openMistakes = mistakes.filter((item) => item.status !== 'Đã khắc phục').length;
  const fixedMistakes = mistakes.filter((item) => item.status === 'Đã khắc phục').length;
  const latestScore =
    [...sessions]
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
      .map((session) => calculateSession(session).totalScore)
      .find((score) => score > 0) || 0;

  return {
    sessions: sessions.length,
    totalQuestions: totals.totalQuestions,
    totalCorrect: totals.totalCorrect,
    totalWrong: totals.totalWrong,
    minutes: totals.minutes,
    vocabularyWords: totals.vocabularyWords,
    vocabSessions: totals.vocabSessions,
    vocabularyGoal: VOCAB_GOAL_WORDS,
    vocabularyProgress: Math.min(100, Math.round((totals.vocabularyWords / VOCAB_GOAL_WORDS) * 100)),
    accuracy: totals.totalQuestions ? Math.round((totals.totalCorrect / totals.totalQuestions) * 100) : 0,
    latestScore,
    partAccuracy,
    weakestPart,
    topMistakeType,
    openMistakes,
    fixedMistakes,
    mistakeTypeCounts,
  };
}

function stateKey(userId) {
  return userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY;
}

function loadState(userId) {
  try {
    const raw = localStorage.getItem(stateKey(userId));
    if (!raw) return { ...EMPTY_STATE };
    const parsed = JSON.parse(raw);
    return {
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      mistakes: Array.isArray(parsed.mistakes) ? parsed.mistakes : [],
      reports: Array.isArray(parsed.reports) ? parsed.reports : [],
    };
  } catch {
    return { ...EMPTY_STATE };
  }
}

function saveLocalState(userId, state) {
  if (!userId) return;
  localStorage.setItem(stateKey(userId), JSON.stringify(state));
}

function getStoredAuthToken() {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

function storeAuthToken(token) {
  if (!token) return;
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch {
    // Auth still works through cookies when localStorage is unavailable.
  }
}

function clearStoredAuthToken() {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // Ignore storage cleanup failures.
  }
}

function apiUrl(path, baseUrl = API_BASE_URL) {
  return `${baseUrl}${path}`;
}

async function apiFetch(path, options) {
  const authToken = getStoredAuthToken();
  const headers = new Headers(options?.headers || {});
  if (authToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }
  const requestOptions = { ...options, headers };
  const response = await fetch(apiUrl(path), requestOptions);
  const contentType = response.headers.get('content-type') || '';
  const shouldRetryDeployedApi =
    API_BASE_URL !== DEPLOYED_API_ORIGIN
    && (response.status === 404 || contentType.toLowerCase().includes('text/html'));

  if (shouldRetryDeployedApi) {
    return fetch(apiUrl(path, DEPLOYED_API_ORIGIN), requestOptions);
  }

  return response;
}

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    const isHtml = /<!doctype html|<html[\s>]/i.test(text);
    const statusText = response.status ? `HTTP ${response.status}` : 'không rõ trạng thái';
    const error = new Error(
      isHtml
        ? `API backend đang trả HTML thay vì JSON (${statusText}). Có thể app đang gọi nhầm static host hoặc backend deploy chưa hoàn tất.`
        : `API backend trả phản hồi không phải JSON (${statusText}).`,
    );
    error.responseText = text;
    throw error;
  }
}

async function refreshAuthSession() {
  const response = await apiFetch('/api/auth/me', { credentials: 'include' });
  const payload = await readJsonResponse(response).catch(() => ({}));
  if (!response.ok || !payload.user) return null;

  storeAuthToken(payload.token);
  return payload.user;
}
function isStateEmpty(state) {
  return !state.sessions?.length && !state.mistakes?.length && !state.reports?.length;
}

function StatCard({ icon: Icon, label, value, detail, tone = 'blue' }) {
  return (
    <section className={`stat-card tone-${tone}`}>
      <div className="stat-icon">
        <Icon size={20} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </section>
  );
}

function EmptyState({ title, action }) {
  return (
    <div className="empty-state">
      <FileText size={28} />
      <strong>{title}</strong>
      {action}
    </div>
  );
}

function PracticeAuthVisual({ slide }) {
  return (
    <div className="connect-illustration">
      <div className="connect-orb"></div>
      <svg className="connector-path" viewBox="0 0 430 360" focusable="false">
        <path d="M106 94 H166 V302 H106 M74 200 H270" />
      </svg>
      <div className="connector-node node-ai">
        <span className="node-ai-mark">{slide.nodes.top}</span>
      </div>
      <div className="connector-node node-toeic">
        <span className="node-app-mark">{slide.nodes.middle}</span>
      </div>
      <div className="connector-node node-score">
        <span className="node-score-mark">{slide.nodes.bottom}</span>
      </div>
      <div className="dashboard-card">
        <div className="dash-top">
          <div>
            <span></span>
            <span></span>
            <span></span>
          </div>
          <strong>{slide.panelTitle}</strong>
        </div>
        <div className="dash-filter-row">
          {slide.filters.map((filter) => (
            <span key={filter}>{filter}</span>
          ))}
        </div>
        {slide.rows.map((row) => (
          <div className="dash-row" key={row.label}>
            <strong className={row.avatar}></strong>
            <div>
              <span>{row.label}</span>
              <small>{row.detail}</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MistakeAuthVisual() {
  return (
    <div className="mistake-illustration">
      <div className="mistake-ai-node">AI</div>
      <section className="mistake-question-card">
        <div className="mini-window-row">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <strong>Part 5 - Question 128</strong>
        <p>The report was prepared _____ the deadline.</p>
        <div className="answer-choice-row">
          <span className="wrong">A. despite</span>
          <span className="correct">B. before</span>
        </div>
      </section>
      <section className="mistake-feedback-card">
        <span>AI explanation</span>
        <strong>Preposition of time</strong>
        <p>Use "before" with a deadline. Save this as a repeat review item.</p>
        <div className="review-status-row">
          <i></i>
          <small>Needs review</small>
        </div>
      </section>
      <div className="mistake-tag tag-reading">P5</div>
      <div className="mistake-tag tag-fix">Fix</div>
    </div>
  );
}

function ProgressAuthVisual() {
  return (
    <div className="progress-illustration">
      <section className="score-summary-card">
        <span>Estimated score</span>
        <strong>720</strong>
        <small>Target 990</small>
      </section>
      <section className="progress-chart-card">
        <div className="chart-heading">
          <strong>Weekly trend</strong>
          <span>+45 pts</span>
        </div>
        <div className="bar-chart-mini">
          <i style={{ height: '42%' }}></i>
          <i style={{ height: '58%' }}></i>
          <i style={{ height: '49%' }}></i>
          <i style={{ height: '72%' }}></i>
          <i style={{ height: '84%' }}></i>
        </div>
      </section>
      <div className="skill-pill listening">Listening 82%</div>
      <div className="skill-pill reading">Reading 76%</div>
      <div className="skill-pill weak">Weak: Part 7</div>
    </div>
  );
}

function AuthVisualArtwork({ slide }) {
  if (slide.kind === 'mistakes') return <MistakeAuthVisual />;
  if (slide.kind === 'progress') return <ProgressAuthVisual />;
  return <PracticeAuthVisual slide={slide} />;
}

function AuthLoadingScreen() {
  return (
    <main className="access-shell access-loading-shell" aria-busy="true">
      <section className="auth-loading-card" role="status" aria-live="polite">
        <div className="auth-loading-brand">
          <span className="brand-mark" aria-hidden="true">
            <svg className="brand-symbol" viewBox="0 0 64 64" focusable="false">
              <g transform="translate(-2 0)">
                <circle cx="18" cy="24" r="8" />
                <path d="M28 14h14v38l-7-3-7 3V14Z" />
                <path d="M46 14h13v20L46 14Z" />
              </g>
            </svg>
          </span>
          <h1>{'\u0110ang m\u1edf kh\u00f4ng gian h\u1ecdc'}</h1>
        </div>

        <div className="study-truck-scene" aria-hidden="true">
          <div className="study-truck-lamp">
            <i></i>
            <span></span>
          </div>
          <div className="study-truck">
            <div className="study-truck-body">
              <strong>TOEIC</strong>
              <span></span>
            </div>
            <div className="study-truck-cabin">
              <span></span>
              <i></i>
            </div>
            <div className="study-truck-tires">
              <b></b>
              <b></b>
            </div>
          </div>
          <div className="study-road"></div>
        </div>

        <p>{'\u0110ang ki\u1ec3m tra phi\u00ean \u0111\u0103ng nh\u1eadp'}</p>
        <div className="auth-loading-dots" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </section>
    </main>
  );
}

function AuthGate({ error, onSubmit }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [visualIndex, setVisualIndex] = useState(0);
  const [isVisualResetting, setIsVisualResetting] = useState(false);
  const activeVisualIndex = visualIndex === AUTH_VISUAL_SLIDES.length ? 0 : visualIndex;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setVisualIndex((current) => Math.min(current + 1, AUTH_VISUAL_SLIDES.length));
    }, AUTH_SLIDE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, []);

  function handleVisualTransitionEnd() {
    if (visualIndex !== AUTH_VISUAL_SLIDES.length) return;

    setIsVisualResetting(true);
    setVisualIndex(0);
    window.setTimeout(() => setIsVisualResetting(false), 40);
  }

  function submit(event) {
    event.preventDefault();
    onSubmit(mode, form);
  }

  return (
    <main className="access-shell">
      <div className="auth-stage auth-stage-split">
        <section className="access-panel">
          <div className="auth-card-body">
            <div className="split-brand-row">
              <svg className="toeic-logo" viewBox="0 0 330 120" role="img" aria-label="TOEIC">
                <text className="toeic-logo-text" x="0" y="86">TOEIC</text>
                <circle className="toeic-reg-circle" cx="304" cy="87" r="8" />
                <text className="toeic-reg-text" x="304" y="91" textAnchor="middle">R</text>
              </svg>
            </div>

            <div className="auth-heading">
              <h1>{mode === 'login' ? 'Log in to your Account' : 'Create your Account'}</h1>
            </div>

            <form onSubmit={submit} className="auth-form">
              {mode === 'register' && (
                <label className="auth-input-row">
                  <UserRound size={20} />
                  <input
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    autoFocus
                    placeholder="Full name"
                    autoComplete="name"
                  />
                </label>
              )}
              <label className="auth-input-row">
                <Mail size={20} />
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  autoFocus={mode === 'login'}
                  placeholder="Email"
                  autoComplete="email"
                />
              </label>
              <label className="auth-input-row">
                <Lock size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  placeholder="Password"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </label>

              <div className="auth-meta-row">
                <label>
                  <input type="checkbox" defaultChecked />
                  <span>Remember me</span>
                </label>
                <button type="button">Forgot Password?</button>
              </div>

              {error && <div className="error-box"><AlertCircle size={18} />{error}</div>}
              <button className="auth-submit" type="submit">
                {mode === 'login' ? 'Log in' : 'Create account'}
              </button>

              <div className="auth-switch-row">
                <span>{mode === 'login' ? "Don't have an account?" : 'Already have an account?'}</span>
                <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
                  {mode === 'login' ? 'Create an account' : 'Log in'}
                </button>
              </div>
            </form>
          </div>
        </section>

        <section className="auth-visual split-visual" aria-hidden="true">
          <div className="auth-slide-viewport">
            <div
              className={`auth-slide-track ${isVisualResetting ? 'resetting' : ''}`}
              onTransitionEnd={handleVisualTransitionEnd}
              style={{ transform: `translateX(-${visualIndex * 100}%)` }}
            >
              {AUTH_LOOP_SLIDES.map((slide) => (
                <article className={`auth-visual-slide ${slide.kind}`} key={slide.id}>
                  <AuthVisualArtwork slide={slide} />
                  <div className="visual-copy">
                    <h2>{slide.title}</h2>
                    <p>{slide.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
          <div className="visual-dots">
            {AUTH_VISUAL_SLIDES.map((slide, index) => (
              <span className={index === activeVisualIndex ? 'active' : ''} key={slide.id}></span>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function SelectMenu({ value, options, onChange, placeholder = 'Chọn', className = '' }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const normalizedOptions = options.map((option) =>
    typeof option === 'string'
      ? { value: option, label: option || placeholder }
      : { ...option, label: option.label || option.value || placeholder },
  );
  const selectedOption = normalizedOptions.find((option) => String(option.value) === String(value ?? ''));
  const selectedLabel = selectedOption?.label || placeholder;

  useEffect(() => {
    if (!open) return undefined;

    function closeOnOutsideClick(event) {
      if (!menuRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function closeOnEscape(event) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  function chooseOption(nextValue) {
    onChange(nextValue);
    setOpen(false);
  }

  return (
    <div className={`select-menu ${open ? 'open' : ''} ${className}`} ref={menuRef}>
      <button
        type="button"
        className="select-menu-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selectedLabel}</span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="select-menu-list" role="listbox">
          {normalizedOptions.map((option) => {
            const isSelected = String(option.value) === String(value ?? '');
            return (
              <button
                key={String(option.value)}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`select-menu-option ${isSelected ? 'selected' : ''}`}
                onClick={() => chooseOption(option.value)}
              >
                <span>
                  <strong>{option.label}</strong>
                  {option.detail && <small>{option.detail}</small>}
                </span>
                {isSelected && <CheckCircle2 className="select-menu-check" size={15} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function IconButton({ title, children, className = '', ...props }) {
  return (
    <button className={`icon-button ${className}`} title={title} aria-label={title} {...props}>
      {children}
    </button>
  );
}

function Sidebar({ activeTab, setActiveTab, collapsed, setCollapsed, onExport, onImportClick, onLogout, user }) {
  const navItems = [
    { id: 'overview', label: 'Tổng quan', detail: 'Dashboard', icon: LayoutDashboard },
    { id: 'journal', label: 'Nhật ký', detail: 'Buổi luyện đề', icon: ClipboardList },
    { id: 'mistakes', label: 'Sổ lỗi sai', detail: 'Review câu sai', icon: NotebookTabs },
    { id: 'ai', label: 'AI phân tích', detail: 'Gemini feedback', icon: Sparkles },
    { id: 'reports', label: 'Báo cáo', detail: 'Tiến độ học', icon: FileText },
    { id: 'reportHistory', label: 'Lịch sử báo cáo', detail: 'Đọc lại báo cáo', icon: History },
  ];
  const displayName = user?.name || user?.email || 'TOEIC user';
  const accountLabel = user?.email || 'Tài khoản cá nhân';
  const avatarLetter = displayName.trim().charAt(0).toUpperCase() || 'T';

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-head">
        <button className="sidebar-brand" type="button" onClick={() => setActiveTab('overview')} title="TOEIC Tracker">
          <span className="brand-mark" aria-hidden="true">
            <svg className="brand-symbol" viewBox="0 0 64 64" focusable="false">
              <g transform="translate(-2 0)">
                <circle cx="18" cy="24" r="8" />
                <path d="M28 14h14v38l-7-3-7 3V14Z" />
                <path d="M46 14h13v20L46 14Z" />
              </g>
            </svg>
          </span>
          <span className="sidebar-brand-copy" aria-hidden={collapsed}>
            <strong>TOEIC Tracker</strong>
            <span>AI Study OS</span>
          </span>
        </button>
        <IconButton
          className="sidebar-toggle"
          title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
          onClick={(event) => {
            setCollapsed(!collapsed);
            event.currentTarget.blur();
          }}
        >
          <Menu size={19} />
        </IconButton>
      </div>

      <div className="sidebar-scroll">
        <div className="sidebar-section">
          <span className="sidebar-section-title" aria-hidden={collapsed}>Main menu</span>
          <nav className="nav-list" aria-label="Điều hướng chính">
            {navItems.map(({ id, label, detail, icon: Icon }) => (
              <button
                key={id}
                className={activeTab === id ? 'active' : ''}
                onClick={() => setActiveTab(id)}
                title={label}
                aria-current={activeTab === id ? 'page' : undefined}
              >
                <span className="sidebar-icon-frame">
                  <Icon size={19} />
                </span>
                <span className="sidebar-link-copy" aria-hidden={collapsed}>
                  <span>{label}</span>
                  <small>{detail}</small>
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="sidebar-footer">
        <span className="sidebar-section-title" aria-hidden={collapsed}>Data</span>
        <div className="sidebar-tools">
          <button onClick={onExport} title="Xuất dữ liệu">
            <span className="sidebar-icon-frame">
              <Download size={18} />
            </span>
            <span className="sidebar-tool-label" aria-hidden={collapsed}>Xuất JSON</span>
          </button>
          <button onClick={onImportClick} title="Nhập dữ liệu">
            <span className="sidebar-icon-frame">
              <Upload size={18} />
            </span>
            <span className="sidebar-tool-label" aria-hidden={collapsed}>Nhập JSON</span>
          </button>
          <button className="danger" onClick={onLogout} title="Đăng xuất">
            <span className="sidebar-icon-frame">
              <LogOut size={18} />
            </span>
            <span className="sidebar-tool-label" aria-hidden={collapsed}>Đăng xuất</span>
          </button>
        </div>

        <div className="sidebar-profile" title={accountLabel}>
          <span className="sidebar-avatar">{avatarLetter}</span>
          <span className="sidebar-profile-copy" aria-hidden={collapsed}>
            <strong>{displayName}</strong>
            <small>{accountLabel}</small>
          </span>
        </div>
      </div>
    </aside>
  );
}

function Overview({ sessions, mistakes, reports, stats, setActiveTab }) {
  const scoreHistory = sessions
    .map((session) => {
      const calc = calculateSession(session);
      return {
        date: session.date?.slice(5) || '',
        score: calc.totalScore || null,
        accuracy: calc.accuracy,
      };
    })
    .filter((item) => item.score || item.accuracy);

  const mistakePie = Object.entries(stats.mistakeTypeCounts).map(([name, value]) => ({ name, value }));
  const latestReport = reports[0];

  return (
    <div className="page-grid">
      <section className="hero-panel">
        <div className="score-block">
          <span>Mục tiêu</span>
          <strong>990</strong>
          <small>Điểm hiện tại: {stats.latestScore || 'Chưa có'}</small>
        </div>
        <div className="hero-copy">
          <h1>Tổng quan luyện đề</h1>
          <div className="hero-actions">
            <button className="primary-button" onClick={() => setActiveTab('journal')}>
              <Plus size={18} />
              Thêm nhật ký
            </button>
            <button className="ghost-button" onClick={() => setActiveTab('ai')}>
              <Sparkles size={18} />
              Phân tích câu sai
            </button>
          </div>
        </div>
      </section>

      <div className="stats-grid">
        <StatCard icon={Target} label="Điểm ước tính" value={stats.latestScore || 0} detail="TOEIC estimate" />
        <StatCard icon={CalendarDays} label="Buổi học" value={stats.sessions} detail={`${stats.minutes} phút`} tone="green" />
        <StatCard icon={BarChart3} label="Accuracy" value={`${stats.accuracy}%`} detail={`${stats.totalCorrect}/${stats.totalQuestions} câu`} tone="amber" />
        <StatCard icon={AlertCircle} label="Lỗi chưa sửa" value={stats.openMistakes} detail={`Top lỗi: ${stats.topMistakeType}`} tone="red" />
      </div>

      <section className="panel wide">
        <div className="panel-heading">
          <h2>Tiến độ</h2>
          <span>Score và accuracy</span>
        </div>
        {scoreHistory.length ? (
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={scoreHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0dce7" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" domain={[0, 990]} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                <Tooltip />
                <Line yAxisId="left" type="monotone" dataKey="score" stroke="#2f6df0" strokeWidth={3} dot={{ r: 4 }} />
                <Line yAxisId="right" type="monotone" dataKey="accuracy" stroke="#22a783" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState title="Chưa có lịch sử luyện đề" />
        )}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Accuracy theo Part</h2>
          <span>Part yếu: {stats.weakestPart}</span>
        </div>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.partAccuracy}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0dce7" />
              <XAxis dataKey="part" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="accuracy" fill={PART_BAR_COLOR} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Loại lỗi</h2>
          <span>{stats.fixedMistakes} lỗi đã khắc phục</span>
        </div>
        {mistakePie.length ? (
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={mistakePie} dataKey="value" nameKey="name" outerRadius={88} label>
                  {mistakePie.map((entry, index) => (
                    <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState title="Chưa có lỗi sai" />
        )}
      </section>

      {latestReport && (
        <section className="panel wide">
          <div className="panel-heading">
            <h2>Báo cáo mới nhất</h2>
            <span>{latestReport.createdAt}</span>
          </div>
          <MarkdownReport markdown={latestReport.markdown} />
        </section>
      )}
    </div>
  );
}

function OverviewV2({ sessions, mistakes, reports, stats, setActiveTab }) {
  const sessionsByDate = [...sessions].sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
  const recentSessions = [...sessionsByDate].reverse().slice(0, 4);
  const scoreHistory = sessionsByDate
    .map((session) => {
      const calc = calculateSession(session);
      return {
        date: session.date?.slice(5) || '',
        score: calc.totalScore || null,
        accuracy: calc.accuracy,
      };
    })
    .filter((item) => item.score || item.accuracy);
  const mistakePie = Object.entries(stats.mistakeTypeCounts).map(([name, value]) => ({ name, value }));
  const latestReport = reports[0];
  const previousScore = scoreHistory.length > 1 ? scoreHistory[scoreHistory.length - 2].score || 0 : 0;
  const scoreDelta = stats.latestScore && previousScore ? stats.latestScore - previousScore : 0;
  const reviewData = [
    { name: 'Cần xử lý', value: stats.openMistakes, color: '#2f6df0' },
    { name: 'Đã khắc phục', value: stats.fixedMistakes, color: '#22a783' },
  ];
  const reviewTotal = reviewData.reduce((sum, item) => sum + item.value, 0);
  const openMistakePercent = reviewTotal ? Math.round((stats.openMistakes / reviewTotal) * 100) : 0;
  const focusParts = [...stats.partAccuracy]
    .filter((part) => part.total > 0)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 4);

  return (
    <div className="overview-v2">
      <section className="overview-command">
        <div>
          <span className="overview-eyebrow">Dashboard</span>
          <h1>Tổng quan luyện đề</h1>
          <p>Theo dõi điểm, độ chính xác, lỗi sai và nhịp học TOEIC trong một màn hình.</p>
        </div>
        <div className="overview-command-actions">
          <button className="ghost-button" onClick={() => setActiveTab('ai')}>
            <Sparkles size={18} />
            Phân tích AI
          </button>
          <button className="primary-button" onClick={() => setActiveTab('journal')}>
            <Plus size={18} />
            Thêm nhật ký
          </button>
        </div>
      </section>

      <section className="overview-kpi-grid">
        <article className="overview-kpi-card primary">
          <button className="overview-kpi-arrow" type="button" aria-label="Mở nhật ký" onClick={() => setActiveTab('journal')}>
            <Plus size={18} />
          </button>
          <span>Điểm ước tính</span>
          <strong>{stats.latestScore || 0}</strong>
          <small>
            {scoreDelta
              ? `${scoreDelta > 0 ? '+' : ''}${scoreDelta} so với lần trước`
              : 'Mục tiêu 990 TOEIC'}
          </small>
        </article>

        <article className="overview-kpi-card">
          <button className="overview-kpi-arrow" type="button" aria-label="Mở nhật ký" onClick={() => setActiveTab('journal')}>
            <CalendarDays size={17} />
          </button>
          <span>Buổi luyện</span>
          <strong>{stats.sessions}</strong>
          <small>{stats.minutes} phút đã ghi nhận</small>
        </article>

        <article className="overview-kpi-card">
          <button className="overview-kpi-arrow" type="button" aria-label="Mở nhật ký vocab" onClick={() => setActiveTab('journal')}>
            <Brain size={17} />
          </button>
          <span>Vocab</span>
          <strong>{stats.vocabularyWords}</strong>
          <small>{stats.vocabularyProgress}% mục tiêu {stats.vocabularyGoal} từ</small>
        </article>

        <article className="overview-kpi-card">
          <button className="overview-kpi-arrow" type="button" aria-label="Xem tiến độ" onClick={() => setActiveTab('overview')}>
            <BarChart3 size={17} />
          </button>
          <span>Accuracy</span>
          <strong>{stats.accuracy}%</strong>
          <small>{stats.totalCorrect}/{stats.totalQuestions} câu đúng</small>
        </article>

        <article className="overview-kpi-card margin-card">
          <button className="overview-kpi-arrow" type="button" aria-label="Mở sổ lỗi sai" onClick={() => setActiveTab('mistakes')}>
            <AlertCircle size={17} />
          </button>
          <span>Lỗi đang mở</span>
          <strong>{stats.openMistakes}</strong>
          <small>Top lỗi: {stats.topMistakeType}</small>
        </article>
      </section>

      <section className="overview-report-grid">
        <article className="overview-chart-card score-report-card">
          <div className="overview-card-heading">
            <div>
              <h2>Practice Report Area</h2>
              <span>Accuracy theo từng Part TOEIC</span>
            </div>
            <button className="overview-chip-button" type="button">Monthly</button>
          </div>
          {stats.partAccuracy.some((part) => part.total > 0) ? (
            <div className="overview-line-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.partAccuracy}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0dce7" />
                  <XAxis dataKey="part" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="accuracy" fill={PART_BAR_COLOR} radius={[10, 10, 4, 4]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="Chưa có lịch sử luyện đề" />
          )}
        </article>

        <article className="overview-chart-card activity-card">
          <div className="overview-card-heading">
            <div>
              <h2>Review Activity</h2>
              <span>Trạng thái lỗi sai</span>
            </div>
            <button className="overview-chip-button" type="button">Review</button>
          </div>
          <div className="activity-layout">
            <div className="activity-donut">
              <div
                className={`activity-ring ${reviewTotal ? '' : 'empty'}`}
                style={{ '--activity-open': `${openMistakePercent}%` }}
              >
                <div className="activity-center">
                  <strong>{reviewTotal}</strong>
                  <span>Tổng lỗi</span>
                </div>
              </div>
            </div>
            <div className="activity-legend">
              <div>
                <strong>{stats.openMistakes}</strong>
                <span><i className="legend-pink"></i>Cần xử lý</span>
              </div>
              <div>
                <strong>{stats.fixedMistakes}</strong>
                <span><i className="legend-green"></i>Đã khắc phục</span>
              </div>
              <div>
                <strong>{stats.weakestPart}</strong>
                <span><i className="legend-blue"></i>Part yếu</span>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="overview-lower-grid">
        <article className="overview-chart-card">
          <div className="overview-card-heading">
            <div>
              <h2>Buổi luyện gần đây</h2>
              <span>Nhật ký mới nhất</span>
            </div>
            <button className="overview-chip-button" type="button" onClick={() => setActiveTab('journal')}>Xem tất cả</button>
          </div>
          <div className="overview-table">
            {recentSessions.length ? (
              recentSessions.map((session) => {
                const calc = calculateSession(session);
                const vocabWords = vocabularyWordValue(session);
                const isVocabSession = session.mode === VOCAB_MODE;
                return (
                  <article className="overview-table-row" key={session.id}>
                    <div className="session-avatar">{session.title?.slice(0, 1).toUpperCase() || 'T'}</div>
                    <div>
                      <strong>{session.title || 'Buổi luyện TOEIC'}</strong>
                      <span>{session.date} - {session.mode}</span>
                    </div>
                    <span className="session-pill">{isVocabSession ? 'Vocab' : `${calc.accuracy}%`}</span>
                    <strong className="session-score">{isVocabSession ? `${vocabWords} từ` : calc.totalScore || '-'}</strong>
                  </article>
                );
              })
            ) : (
              <EmptyState title="Chưa có buổi luyện" />
            )}
          </div>
        </article>

        <article className="overview-chart-card">
          <div className="overview-card-heading">
            <div>
              <h2>Part cần tập trung</h2>
              <span>Ưu tiên theo accuracy thấp</span>
            </div>
            <button className="overview-chip-button" type="button" onClick={() => setActiveTab('mistakes')}>Sổ lỗi</button>
          </div>
          <div className="part-focus-list">
            {(focusParts.length ? focusParts : stats.partAccuracy.slice(0, 4)).map((part) => (
              <div className="part-focus-row" key={part.fullPart}>
                <div>
                  <strong>{part.fullPart}</strong>
                  <span>{part.skill}</span>
                </div>
                <div className="part-focus-meter" style={{ '--part-value': `${part.accuracy}%` }}>
                  <span></span>
                </div>
                <strong>{part.accuracy}%</strong>
              </div>
            ))}
          </div>
          {mistakePie.length ? (
            <div className="mistake-type-strip">
              {mistakePie.slice(0, 4).map((item, index) => (
                <span key={item.name} style={{ '--strip-color': PIE_COLORS[index % PIE_COLORS.length] }}>
                  {item.name} · {item.value}
                </span>
              ))}
            </div>
          ) : (
            <p className="overview-note-line">Chưa có lỗi sai được lưu.</p>
          )}
        </article>
      </section>

      {latestReport && (
        <section className="overview-chart-card overview-report-note">
          <div className="overview-card-heading">
            <div>
              <h2>Báo cáo mới nhất</h2>
              <span>{latestReport.createdAt}</span>
            </div>
            <button className="overview-chip-button" type="button" onClick={() => setActiveTab('reports')}>Báo cáo</button>
          </div>
          <MarkdownReport markdown={latestReport.markdown} compact />
        </section>
      )}
    </div>
  );
}

function Journal({ sessions, setSessions }) {
  const [draft, setDraft] = useState(createBlankSession);
  const [editingId, setEditingId] = useState(null);
  const [openPartId, setOpenPartId] = useState(null);
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const journalFormRef = useRef(null);

  useEffect(() => {
    if (!openPartId && !modeMenuOpen) return undefined;

    function closeOnOutsideClick(event) {
      if (!journalFormRef.current?.contains(event.target)) {
        setOpenPartId(null);
        setModeMenuOpen(false);
      }
    }

    function closeOnEscape(event) {
      if (event.key === 'Escape') {
        setOpenPartId(null);
        setModeMenuOpen(false);
      }
    }

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [openPartId, modeMenuOpen]);

  function updatePart(partId, key, value) {
    setDraft((current) => ({
      ...current,
      partScores: {
        ...current.partScores,
        [partId]: { ...current.partScores[partId], [key]: value },
      },
    }));
  }

  function saveSession(event) {
    event.preventDefault();
    const isVocabSession = draft.mode === VOCAB_MODE;
    const vocabularyWords = isVocabSession ? clamp(numberValue(draft.vocabularyWords), 0, VOCAB_GOAL_WORDS) : 0;
    const record = {
      ...draft,
      id: editingId || uid(),
      title: draft.title.trim() || (isVocabSession ? 'Buổi học vocab' : 'Buổi luyện TOEIC'),
      vocabularyWords: isVocabSession ? String(vocabularyWords) : '',
      partScores: isVocabSession ? createBlankPartScores() : draft.partScores,
      updatedAt: new Date().toISOString(),
      createdAt: editingId ? draft.createdAt : new Date().toISOString(),
    };
    setSessions((current) =>
      editingId ? current.map((item) => (item.id === editingId ? record : item)) : [record, ...current],
    );
    setEditingId(null);
    setDraft(createBlankSession());
    setOpenPartId(null);
    setModeMenuOpen(false);
  }

  function editSession(session) {
    setEditingId(session.id);
    setDraft({
      ...createBlankSession(),
      ...session,
      partScores: { ...createBlankPartScores(), ...(session.partScores || {}) },
    });
    setOpenPartId(null);
    setModeMenuOpen(false);
  }

  function deleteSession(id) {
    setSessions((current) => current.filter((item) => item.id !== id));
  }

  const isVocabDraft = draft.mode === VOCAB_MODE;
  const draftVocabularyWords = vocabularyWordValue(draft);
  const draftVocabularyProgress = Math.min(100, Math.round((draftVocabularyWords / VOCAB_GOAL_WORDS) * 100));

  return (
    <div className="two-column">
      <section className="panel form-panel">
        <div className="panel-heading">
          <h2>{editingId ? 'Sửa nhật ký' : 'Nhật ký học'}</h2>
          {editingId && (
            <button className="text-button" onClick={() => { setEditingId(null); setDraft(createBlankSession()); }}>
              Hủy sửa
            </button>
          )}
        </div>
        <form onSubmit={saveSession} className="stack-form" ref={journalFormRef}>
          <div className="form-grid">
            <Field label="Ngày">
              <input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} />
            </Field>
            <Field label="Tên đề">
              <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="ETS 2024 Test 01" />
            </Field>
            <Field label="Loại buổi">
              <div className={`session-mode-picker${modeMenuOpen ? ' open' : ''}`}>
                <button
                  type="button"
                  className="session-mode-trigger"
                  aria-haspopup="listbox"
                  aria-expanded={modeMenuOpen}
                  aria-controls="session-mode-menu"
                  onClick={() => {
                    setModeMenuOpen((current) => !current);
                    setOpenPartId(null);
                  }}
                >
                  <span>{draft.mode}</span>
                  <ChevronDown size={16} />
                </button>
                {modeMenuOpen && (
                  <div className="session-mode-menu" id="session-mode-menu" role="listbox">
                    {SESSION_MODES.map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        role="option"
                        aria-selected={draft.mode === mode}
                        className={`session-mode-option${draft.mode === mode ? ' selected' : ''}`}
                        onClick={() => {
                          setDraft({ ...draft, mode, vocabularyWords: mode === VOCAB_MODE ? draft.vocabularyWords : '' });
                          setModeMenuOpen(false);
                        }}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Field>
            <Field label="Thời gian">
              <input type="number" min="0" value={draft.durationMinutes} onChange={(event) => setDraft({ ...draft, durationMinutes: event.target.value })} placeholder="120" />
            </Field>
          </div>

          {isVocabDraft ? (
            <div className="vocab-session-box">
              <Field label="Số từ đã học">
                <input
                  type="number"
                  min="1"
                  max={VOCAB_GOAL_WORDS}
                  value={draft.vocabularyWords || ''}
                  onChange={(event) => setDraft({ ...draft, vocabularyWords: event.target.value })}
                  placeholder="100"
                  required
                />
              </Field>
              <div className="vocab-progress-preview">
                <div>
                  <strong>{draftVocabularyWords}</strong>
                  <span>/{VOCAB_GOAL_WORDS} từ</span>
                </div>
                <div className="vocab-progress-bar" style={{ '--vocab-progress': `${draftVocabularyProgress}%` }}>
                  <span></span>
                </div>
              </div>
            </div>
          ) : (
            <div className="part-score-grid">
              <div className="part-score-header" aria-hidden="true">
                <span>Part</span>
                <span>Kỹ năng</span>
                <span>Tổng câu</span>
                <span>Số câu đúng</span>
              </div>
              {PARTS.map((part) => {
                const selectedCorrect = draft.partScores[part.id]?.correct ?? '';
                const hasSelectedCorrect = hasInputValue(selectedCorrect);
                const isOpen = openPartId === part.id;
                const menuId = `correct-menu-${part.id.replace(/\s+/g, '-').toLowerCase()}`;
                return (
                  <div key={part.id} className={`part-score-row${isOpen ? ' is-menu-open' : ''}`}>
                    <div className="part-score-part">
                      <strong>{part.id}</strong>
                    </div>
                    <div className="part-score-skill-cell">
                      <span className={`part-score-skill ${part.skill.toLowerCase()}`}>{part.skill}</span>
                    </div>
                    <span className="part-score-total">{part.totalQuestions} câu</span>
                    <div className={`part-score-picker${isOpen ? ' open' : ''}`}>
                      <button
                        type="button"
                        className="part-score-trigger"
                        aria-label={`Chọn số câu đúng ${part.id}`}
                        aria-haspopup="listbox"
                        aria-expanded={isOpen}
                        aria-controls={menuId}
                        onClick={() => {
                          setOpenPartId(isOpen ? null : part.id);
                          setModeMenuOpen(false);
                        }}
                      >
                        <span className={hasSelectedCorrect ? 'part-score-value' : 'part-score-placeholder'}>
                          {hasSelectedCorrect ? String(selectedCorrect) : SCORE_SELECT_PLACEHOLDER}
                        </span>
                        <ChevronDown size={16} />
                      </button>
                      {isOpen && (
                        <div className="part-score-menu" id={menuId} role="listbox">
                          <button
                            type="button"
                            role="option"
                            aria-selected={!hasSelectedCorrect}
                            className={`part-score-option${!hasSelectedCorrect ? ' selected' : ''}`}
                            onClick={() => {
                              updatePart(part.id, 'correct', '');
                              setOpenPartId(null);
                            }}
                          >
                            {SCORE_SELECT_PLACEHOLDER}
                          </button>
                          {Array.from({ length: part.totalQuestions + 1 }, (_, count) => {
                            const isSelected = String(selectedCorrect) === String(count);
                            return (
                              <button
                                key={count}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                className={`part-score-option${isSelected ? ' selected' : ''}`}
                                onClick={() => {
                                  updatePart(part.id, 'correct', String(count));
                                  setOpenPartId(null);
                                }}
                              >
                                {count}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Field label="Ghi chú">
            <textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} rows={3} />
          </Field>
          <Field label="Kinh nghiệm">
            <textarea value={draft.reflection} onChange={(event) => setDraft({ ...draft, reflection: event.target.value })} rows={3} />
          </Field>
          <button className="primary-button" type="submit">
            <Save size={18} />
            Lưu nhật ký
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Lịch sử</h2>
          <span>{sessions.length} buổi</span>
        </div>
        <div className="record-list">
          {sessions.length ? (
            sessions.map((session) => {
              const calc = calculateSession(session);
              const vocabWords = vocabularyWordValue(session);
              const isVocabSession = session.mode === VOCAB_MODE;
              return (
                <article className="record-card" key={session.id}>
                  <div className="record-main">
                    <div>
                      <strong>{session.title}</strong>
                      <span>{session.date} · {session.mode}</span>
                    </div>
                    <div className="record-score">{isVocabSession ? vocabWords : calc.totalScore || calc.accuracy}</div>
                  </div>
                  <div className="record-meta">
                    {isVocabSession ? (
                      <>
                        <span>{vocabWords}/{VOCAB_GOAL_WORDS} từ</span>
                        <span>{Math.min(100, Math.round((vocabWords / VOCAB_GOAL_WORDS) * 100))}% mục tiêu</span>
                      </>
                    ) : (
                      <>
                        <span>{calc.totalCorrect}/{calc.totalQuestions} câu</span>
                        <span>{calc.accuracy}%</span>
                      </>
                    )}
                    <span>{numberValue(session.durationMinutes)} phút</span>
                  </div>
                  {session.reflection && <p>{session.reflection}</p>}
                  <div className="card-actions">
                    <IconButton title="Sửa" onClick={() => editSession(session)}>
                      <Edit3 size={17} />
                    </IconButton>
                    <IconButton title="Xóa" className="danger" onClick={() => deleteSession(session.id)}>
                      <Trash2 size={17} />
                    </IconButton>
                  </div>
                </article>
              );
            })
          ) : (
            <EmptyState title="Chưa có nhật ký" />
          )}
        </div>
      </section>
    </div>
  );
}

function MistakeForm({ draft, setDraft, onSave, editingId, onCancel }) {
  const selectedPart = PARTS.find((part) => part.id === draft.part);

  function updateOption(key, value) {
    setDraft((current) => ({ ...current, options: { ...current.options, [key]: value } }));
  }

  return (
    <form onSubmit={onSave} className="stack-form">
      <div className="form-grid">
        <Field label="Ngày">
          <input type="date" value={draft.createdAt} onChange={(event) => setDraft({ ...draft, createdAt: event.target.value })} />
        </Field>
        <Field label="Nguồn đề">
          <input value={draft.sourceTitle} onChange={(event) => setDraft({ ...draft, sourceTitle: event.target.value })} placeholder="ETS Test 01" />
        </Field>
        <Field label="Part">
          <SelectMenu
            value={draft.part}
            options={PARTS.map((part) => ({ value: part.id, label: part.id, detail: part.skill }))}
            onChange={(nextPart) => {
              const part = PARTS.find((item) => item.id === nextPart);
              setDraft({ ...draft, part: nextPart, skill: part?.skill || selectedPart?.skill || 'Reading' });
            }}
          />
        </Field>
        <Field label="Câu số">
          <input value={draft.questionNumber} onChange={(event) => setDraft({ ...draft, questionNumber: event.target.value })} placeholder="101" />
        </Field>
      </div>

      <Field label="Câu hỏi">
        <textarea value={draft.questionText} onChange={(event) => setDraft({ ...draft, questionText: event.target.value })} rows={4} />
      </Field>

      <div className="option-grid">
        {['A', 'B', 'C', 'D'].map((key) => (
          <Field key={key} label={`Đáp án ${key}`}>
            <input value={draft.options?.[key] || ''} onChange={(event) => updateOption(key, event.target.value)} />
          </Field>
        ))}
      </div>

      <div className="form-grid">
        <Field label="Bạn chọn">
          <SelectMenu
            value={draft.userAnswer}
            options={ANSWERS.map((answer) => ({ value: answer, label: answer || 'Chưa chọn' }))}
            placeholder="Chọn đáp án"
            onChange={(answer) => setDraft({ ...draft, userAnswer: answer })}
          />
        </Field>
        <Field label="Đáp án đúng">
          <SelectMenu
            value={draft.correctAnswer}
            options={ANSWERS.map((answer) => ({ value: answer, label: answer || 'Chưa chọn' }))}
            placeholder="Chọn đáp án"
            onChange={(answer) => setDraft({ ...draft, correctAnswer: answer })}
          />
        </Field>
        <Field label="Loại lỗi">
          <SelectMenu
            value={draft.mistakeType}
            options={MISTAKE_TYPES}
            onChange={(mistakeType) => setDraft({ ...draft, mistakeType })}
          />
        </Field>
        <Field label="Trạng thái">
          <SelectMenu
            value={draft.status}
            options={STATUSES}
            onChange={(status) => setDraft({ ...draft, status })}
          />
        </Field>
      </div>

      <Field label="Giải thích">
        <textarea value={draft.explanation} onChange={(event) => setDraft({ ...draft, explanation: event.target.value })} rows={4} />
      </Field>
      <Field label="Bản dịch">
        <textarea value={draft.vietnameseTranslation} onChange={(event) => setDraft({ ...draft, vietnameseTranslation: event.target.value })} rows={2} />
      </Field>
      <Field label="Ghi chú cá nhân">
        <textarea value={draft.personalNote} onChange={(event) => setDraft({ ...draft, personalNote: event.target.value })} rows={3} />
      </Field>

      <div className="form-actions">
        <button className="primary-button" type="submit">
          <Save size={18} />
          {editingId ? 'Cập nhật' : 'Lưu lỗi sai'}
        </button>
        {editingId && (
          <button type="button" className="ghost-button" onClick={onCancel}>
            <X size={18} />
            Hủy
          </button>
        )}
      </div>
    </form>
  );
}

function Mistakes({ mistakes, setMistakes, initialDraft }) {
  const [draft, setDraft] = useState(initialDraft || createBlankMistake());
  const [editingId, setEditingId] = useState(null);
  const [filters, setFilters] = useState({ query: '', part: 'Tất cả', status: 'Tất cả', type: 'Tất cả' });

  useEffect(() => {
    if (initialDraft) {
      setDraft(initialDraft);
      setEditingId(null);
    }
  }, [initialDraft]);

  function reset() {
    setDraft(createBlankMistake());
    setEditingId(null);
  }

  function saveMistake(event) {
    event.preventDefault();
    const selectedPart = PARTS.find((part) => part.id === draft.part);
    const record = {
      ...draft,
      id: editingId || uid(),
      skill: selectedPart?.skill || draft.skill,
      questionText: draft.questionText.trim(),
      updatedAt: new Date().toISOString(),
      createdAt: draft.createdAt || today(),
    };
    setMistakes((current) =>
      editingId ? current.map((item) => (item.id === editingId ? record : item)) : [record, ...current],
    );
    reset();
  }

  const filtered = mistakes.filter((mistake) => {
    const query = filters.query.trim().toLowerCase();
    const textMatch =
      !query ||
      [mistake.questionText, mistake.sourceTitle, mistake.explanation, mistake.personalNote]
        .join(' ')
        .toLowerCase()
        .includes(query);
    return (
      textMatch &&
      (filters.part === 'Tất cả' || mistake.part === filters.part) &&
      (filters.status === 'Tất cả' || mistake.status === filters.status) &&
      (filters.type === 'Tất cả' || mistake.mistakeType === filters.type)
    );
  });

  return (
    <div className="two-column">
      <section className="panel form-panel">
        <div className="panel-heading">
          <h2>{editingId ? 'Sửa lỗi sai' : 'Thêm lỗi sai'}</h2>
          <span>{draft.skill}</span>
        </div>
        <MistakeForm
          draft={draft}
          setDraft={setDraft}
          onSave={saveMistake}
          editingId={editingId}
          onCancel={reset}
        />
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Sổ tay</h2>
          <span>{filtered.length}/{mistakes.length} lỗi</span>
        </div>
        <div className="filter-row">
          <div className="search-field">
            <Search size={17} />
            <input value={filters.query} onChange={(event) => setFilters({ ...filters, query: event.target.value })} placeholder="Tìm lỗi" />
          </div>
          <SelectMenu
            className="filter-select"
            value={filters.part}
            options={[{ value: 'Tất cả', label: 'Part', detail: 'Tất cả' }, ...PARTS.map((part) => ({ value: part.id, label: part.id, detail: part.skill }))]}
            onChange={(part) => setFilters({ ...filters, part })}
          />
          <SelectMenu
            className="filter-select"
            value={filters.type}
            options={[{ value: 'Tất cả', label: 'Loại lỗi', detail: 'Tất cả' }, ...MISTAKE_TYPES]}
            onChange={(type) => setFilters({ ...filters, type })}
          />
          <SelectMenu
            className="filter-select"
            value={filters.status}
            options={[{ value: 'Tất cả', label: 'Trạng thái', detail: 'Tất cả' }, ...STATUSES]}
            onChange={(status) => setFilters({ ...filters, status })}
          />
        </div>

        <div className="record-list">
          {filtered.length ? (
            filtered.map((mistake) => (
              <article className="record-card mistake-card" key={mistake.id}>
                <div className="record-main">
                  <div>
                    <strong>{mistake.questionNumber ? `Câu ${mistake.questionNumber}` : mistake.part}</strong>
                    <span>{mistake.createdAt} · {mistake.part} · {mistake.mistakeType}</span>
                  </div>
                  <span className={`status-pill ${mistake.status === 'Đã khắc phục' ? 'done' : ''}`}>{mistake.status}</span>
                </div>
                <p className="question-preview">{mistake.questionText || 'Chưa có nội dung câu hỏi'}</p>
                <div className="answer-row">
                  <span>Bạn chọn: {mistake.userAnswer || '-'}</span>
                  <span>Đúng: {mistake.correctAnswer || '-'}</span>
                </div>
                {mistake.explanation && <p>{mistake.explanation}</p>}
                <div className="card-actions">
                  <IconButton
                    title="Đã khắc phục"
                    onClick={() =>
                      setMistakes((current) =>
                        current.map((item) =>
                          item.id === mistake.id ? { ...item, status: 'Đã khắc phục', updatedAt: new Date().toISOString() } : item,
                        ),
                      )
                    }
                  >
                    <CheckCircle2 size={17} />
                  </IconButton>
                  <IconButton
                    title="Sửa"
                    onClick={() => {
                      setEditingId(mistake.id);
                      setDraft({ ...createBlankMistake(), ...mistake });
                    }}
                  >
                    <Edit3 size={17} />
                  </IconButton>
                  <IconButton title="Xóa" className="danger" onClick={() => setMistakes((current) => current.filter((item) => item.id !== mistake.id))}>
                    <Trash2 size={17} />
                  </IconButton>
                </div>
              </article>
            ))
          ) : (
            <EmptyState title="Không có lỗi phù hợp" />
          )}
        </div>
      </section>
    </div>
  );
}

function AIAnalyzer({ onSaveMistake }) {
  const [form, setForm] = useState({ part: 'Part 5', userAnswer: '', questionText: '' });
  const [file, setFile] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function analyze(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setResults([]);
    try {
      const payload = new FormData();
      payload.append('part', form.part);
      payload.append('userAnswer', form.userAnswer);
      payload.append('questionText', form.questionText);
      if (file) payload.append('file', file);
      const response = await apiFetch('/api/ai/analyze', {
        method: 'POST',
        credentials: 'include',
        body: payload,
      });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || 'Không phân tích được');
      setResults(data.questions || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handlePaste(event) {
    const pastedFile = [...event.clipboardData.files].find((item) => item.type.startsWith('image/'));
    if (pastedFile) setFile(pastedFile);
  }

  function saveResult(result) {
    const partMeta = PARTS.find((item) => item.id === form.part);
    onSaveMistake({
      ...createBlankMistake(),
      id: uid(),
      createdAt: today(),
      part: form.part,
      skill: partMeta?.skill || 'Reading',
      questionNumber: result.question_number || '',
      questionText: result.question_text || '',
      options: { A: '', B: '', C: '', D: '', ...(result.options || {}) },
      userAnswer: result.user_answer || form.userAnswer,
      correctAnswer: result.correct_answer || '',
      explanation: result.explanation || '',
      wrongOptionAnalysis: result.wrong_option_analysis ? JSON.stringify(result.wrong_option_analysis, null, 2) : '',
      vietnameseTranslation: result.vietnamese_translation || '',
      mistakeType: MISTAKE_TYPES.includes(result.mistake_type) ? result.mistake_type : 'Khác',
      improvementTip: result.improvement_tip || '',
      status: result.is_correct ? 'Đã hiểu' : 'Chưa xử lý',
      aiConfidence: result.confidence_score ?? '',
    });
  }

  return (
    <div className="two-column ai-layout">
      <section className="panel form-panel">
        <div className="panel-heading">
          <h2>AI phân tích</h2>
          <span>Gemini 2.5 Flash</span>
        </div>
        <form onSubmit={analyze} className="stack-form">
        <div className="form-grid">
          <Field label="Part">
              <SelectMenu
                value={form.part}
                options={PARTS.map((part) => ({ value: part.id, label: part.id, detail: part.skill }))}
                onChange={(part) => setForm({ ...form, part })}
              />
            </Field>
            <Field label="Bạn chọn">
              <SelectMenu
                value={form.userAnswer}
                options={ANSWERS.map((answer) => ({ value: answer, label: answer || 'Chưa chọn' }))}
                placeholder="Chọn đáp án"
                onChange={(userAnswer) => setForm({ ...form, userAnswer })}
              />
            </Field>
          </div>
          <Field label="Câu hỏi">
            <textarea
              value={form.questionText}
              onChange={(event) => setForm({ ...form, questionText: event.target.value })}
              rows={8}
              placeholder="Dán câu hỏi TOEIC tại đây"
            />
          </Field>
          <div className="drop-zone" onPaste={handlePaste} tabIndex={0}>
            <Upload size={22} />
            <input
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
            <span>{file ? file.name : 'Ảnh, PDF, Word hoặc Ctrl+V ảnh'}</span>
          </div>
          {file && (
            <button type="button" className="text-button" onClick={() => setFile(null)}>
              Bỏ file
            </button>
          )}
          {error && <div className="error-box"><AlertCircle size={18} />{error}</div>}
          <button className="primary-button" type="submit" disabled={loading || (!form.questionText.trim() && !file)}>
            <Brain size={18} />
            {loading ? 'Đang phân tích...' : 'Bắt đầu giải'}
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Kết quả</h2>
          <span>{results.length} câu</span>
        </div>
        <div className="record-list">
          {results.length ? (
            results.map((result, index) => (
              <article className="analysis-card" key={`${result.question_number}-${index}`}>
                <div className="analysis-head">
                  <div>
                    <span>Câu {result.question_number || index + 1}</span>
                    <strong>Đáp án đúng: {result.correct_answer || '-'}</strong>
                  </div>
                  <span className={`status-pill ${result.is_correct ? 'done' : ''}`}>
                    {result.is_correct ? 'Đúng' : 'Cần ôn'}
                  </span>
                </div>
                <p className="question-preview">{result.question_text}</p>
                <div className="answer-row">
                  <span>Bạn chọn: {result.user_answer || form.userAnswer || '-'}</span>
                  <span>Lỗi: {result.mistake_type || 'Khác'}</span>
                </div>
                <p>{result.explanation}</p>
                {result.vietnamese_translation && <p className="translation">{result.vietnamese_translation}</p>}
                {result.improvement_tip && <p className="tip-box">{result.improvement_tip}</p>}
                <button className="secondary-button" onClick={() => saveResult(result)}>
                  <Save size={17} />
                  Lưu vào sổ tay
                </button>
              </article>
            ))
          ) : (
            <EmptyState title="Chưa có kết quả AI" />
          )}
        </div>
      </section>
    </div>
  );
}

function Reports({ stats, sessions, mistakes, reports, setReports }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [writingReportId, setWritingReportId] = useState(null);
  const isWritingReport = Boolean(writingReportId);
  const todaysReport = reports.find(isReportToday);

  async function generateReport() {
    setLoading(true);
    setError('');
    setWritingReportId(null);
    try {
      const response = await apiFetch('/api/ai/report', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stats, sessions, mistakes }),
      });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || 'Không tạo được báo cáo');
      const now = new Date();
      const nextReport = {
        id: uid(),
        markdown: data.markdown,
        createdAt: formatReportTimestamp(now),
        createdAtIso: now.toISOString(),
        createdDate: getLocalDateKey(now),
      };
      setReports((current) => [nextReport, ...current]);
      setWritingReportId(nextReport.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-grid">
      <section className="panel wide today-report-panel">
        <div className="panel-heading">
          <div>
            <h2>Báo cáo hôm nay</h2>
            <span>{getLocalDateKey().split('-').reverse().join('/')}</span>
          </div>
          <button className="primary-button" onClick={generateReport} disabled={loading || isWritingReport}>
            <Sparkles size={18} />
            {loading ? 'Đang tạo...' : isWritingReport ? 'Đang viết...' : 'Tạo báo cáo'}
          </button>
        </div>
        {error && <div className="error-box"><AlertCircle size={18} />{error}</div>}
        {todaysReport ? (
          <MarkdownReport
            markdown={todaysReport.markdown}
            animated={todaysReport.id === writingReportId}
            onAnimationEnd={() => setWritingReportId((current) => (current === todaysReport.id ? null : current))}
          />
        ) : (
          <EmptyState title="Chưa có báo cáo hôm nay" />
        )}
      </section>
    </div>
  );
}

function ReportHistory({ reports, setReports }) {
  const [selectedId, setSelectedId] = useState('');
  const selectedReport = reports.find((report) => report.id === selectedId) || reports[0];
  const todayCount = reports.filter(isReportToday).length;

  useEffect(() => {
    if (!reports.length) {
      setSelectedId('');
      return;
    }

    if (!selectedId || !reports.some((report) => report.id === selectedId)) {
      setSelectedId(reports[0].id);
    }
  }, [reports, selectedId]);

  function deleteReport(reportId) {
    setReports((current) => current.filter((report) => report.id !== reportId));
  }

  if (!reports.length) {
    return (
      <div className="page-grid">
        <section className="panel wide report-history-panel">
          <div className="panel-heading">
            <h2>Lịch sử báo cáo</h2>
            <span>0 bản</span>
          </div>
          <EmptyState title="Chưa có lịch sử báo cáo" />
        </section>
      </div>
    );
  }

  return (
    <div className="report-history-page">
      <section className="panel report-history-index-panel">
        <div className="panel-heading">
          <h2>Lịch sử báo cáo</h2>
          <span>{reports.length} bản · {todayCount} hôm nay</span>
        </div>
        <div className="report-history-index-list">
          {reports.map((report) => (
            <button
              className={`report-history-item ${selectedReport?.id === report.id ? 'is-active' : ''}`}
              key={report.id}
              type="button"
              onClick={() => setSelectedId(report.id)}
              aria-pressed={selectedReport?.id === report.id}
            >
              <span className="report-history-item-meta">
                <span>{getReportDayLabel(report)}</span>
                <small>{report.createdAt || getReportDayLabel(report)}</small>
              </span>
              <strong>{getReportTitle(report.markdown)}</strong>
              <small>{getReportSummary(report.markdown)}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="panel report-history-reader">
        {selectedReport ? (
          <>
            <div className="panel-heading report-history-reader-head">
              <div>
                <h2>{getReportTitle(selectedReport.markdown)}</h2>
                <span>{selectedReport.createdAt || getReportDayLabel(selectedReport)}</span>
              </div>
              <IconButton title="Xóa" className="danger" onClick={() => deleteReport(selectedReport.id)}>
                <Trash2 size={17} />
              </IconButton>
            </div>
            <MarkdownReport markdown={selectedReport.markdown} />
          </>
        ) : (
          <EmptyState title="Chọn một báo cáo để đọc" />
        )}
      </section>
    </div>
  );
}

function AssistantWidget({ stats, sessions, mistakes, activeTab, hasGeminiKey = true, onAuthExpired }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState(() => [
    {
      id: uid(),
      role: 'assistant',
      content: 'Chào bạn, mình là trợ lý TOEIC AI. Bạn có thể hỏi về cách luyện đề, sửa lỗi sai, kế hoạch học, hoặc cách dùng app.',
    },
  ]);
  const listRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  async function sendMessage(overrideText) {
    const text = String(overrideText || input).trim();
    if (!text || loading) return;

    const userMessage = { id: uid(), role: 'user', content: text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const context = {
        activeTab,
        stats,
        recentSessions: sessions.slice(0, 5).map((session) => ({
          date: session.date,
          title: session.title,
          mode: session.mode,
          durationMinutes: session.durationMinutes,
          focus: session.focus,
        })),
        openMistakes: mistakes
          .filter((item) => item.status !== 'Đã khắc phục')
          .slice(0, 8)
          .map((mistake) => ({
            part: mistake.part,
            type: mistake.mistakeType,
            status: mistake.status,
            note: mistake.personalNote,
          })),
      };

      const chatRequest = {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: nextMessages.slice(-8),
          context,
        }),
      };
      let response = await apiFetch('/api/ai/chat', chatRequest);
      let payload = await readJsonResponse(response).catch((error) => ({ error: error.message }));
      if (response.status === 401 && await refreshAuthSession()) {
        response = await apiFetch('/api/ai/chat', chatRequest);
        payload = await readJsonResponse(response).catch((error) => ({ error: error.message }));
      }
      if (response.status === 401) {
        clearStoredAuthToken();
        onAuthExpired?.();
        throw new Error('Bạn cần đăng nhập lại để dùng trợ lý AI.');
      }
      if (!response.ok) throw new Error(payload.error || `Không gửi được câu hỏi. HTTP ${response.status}`);
      const assistantMessageId = uid();
      setMessages((current) => [
        ...current,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: payload.reply || 'Mình chưa có câu trả lời phù hợp. Bạn thử hỏi lại ngắn hơn nhé.',
          animated: true,
        },
      ]);
    } catch (error) {
      const assistantMessageId = uid();
      setMessages((current) => [
        ...current,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: `Mình đang gặp lỗi: ${error.message}`,
          animated: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function submit(event) {
    event.preventDefault();
    sendMessage();
  }

  return (
    <div className={`assistant-widget ${open ? 'open' : ''}`}>
      {open && (
        <section className="assistant-panel" aria-label="Trợ lý ảo TOEIC">
          <div className="assistant-panel-head">
            <div className="assistant-mark">
              <Bot size={24} />
            </div>
            <div>
              <strong>Ask TOEIC AI anything</strong>
              <span>Trợ lý học tập cá nhân</span>
            </div>
            <button type="button" className="assistant-close" onClick={() => setOpen(false)} aria-label="Đóng trợ lý">
              <X size={18} />
            </button>
          </div>

          <div className="assistant-messages" ref={listRef}>
            {messages.map((message) => {
              const shouldAnimate = message.role === 'assistant' && message.animated;

              return (
                <article className={`assistant-message ${message.role}`} key={message.id}>
                  {message.role === 'assistant' ? (
                    shouldAnimate ? (
                      <div className="assistant-bubble">
                        <TypingText
                          text={getReadableMarkdownText(message.content)}
                          onDone={() => {
                            setMessages((current) => current.map((item) => (item.id === message.id ? { ...item, animated: false } : item)));
                          }}
                        />
                      </div>
                    ) : (
                      <div className="assistant-bubble assistant-markdown-bubble">
                        <MarkdownReport markdown={message.content} compact />
                      </div>
                    )
                  ) : (
                    <div className="assistant-bubble">{message.content}</div>
                  )}
                </article>
              );
            })}
            {loading && (
              <article className="assistant-message assistant typing">
                <span>Đang suy nghĩ...</span>
              </article>
            )}
          </div>

          <form className="assistant-input-row" onSubmit={submit}>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Message"
              aria-label="Nhập câu hỏi cho trợ lý AI"
            />
            <button type="submit" disabled={loading || !input.trim()} aria-label="Gửi câu hỏi">
              <Send size={18} />
            </button>
          </form>
        </section>
      )}

      <button type="button" className="assistant-fab" onClick={() => setOpen((current) => !current)} aria-label="Mở trợ lý ảo">
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState({ ...EMPTY_STATE });
  const [activeTab, setActiveTab] = useState('overview');
  const [collapsed, setCollapsed] = useState(false);
  const [aiDraft, setAiDraft] = useState(null);
  const [auth, setAuth] = useState({ checked: false, user: null, error: '', loading: false });
  const [backend, setBackend] = useState({
    checked: false,
    syncEnabled: false,
    saving: false,
    storage: 'local',
    hasGeminiKey: false,
    error: '',
  });
  const importRef = useRef(null);

  useEffect(() => {
    if (!auth.user) return undefined;

    if (!backend.syncEnabled) return undefined;
    saveLocalState(auth.user.id, data);

    const timer = window.setTimeout(async () => {
      setBackend((current) => ({ ...current, saving: true, error: '' }));
      try {
        const response = await apiFetch('/api/data', {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const payload = await readJsonResponse(response).catch((error) => ({ error: error.message }));
        if (response.status === 401) {
          clearStoredAuthToken();
          setAuth({ checked: true, user: null, error: 'Phiên đăng nhập đã hết hạn.', loading: false });
          setBackend((current) => ({ ...current, syncEnabled: false, saving: false }));
          return;
        }
        if (!response.ok) throw new Error(payload.error || 'Không lưu được dữ liệu backend.');
        setBackend((current) => ({ ...current, saving: false, error: '' }));
      } catch (error) {
        setBackend((current) => ({ ...current, saving: false, error: error.message }));
      }
    }, 650);

    return () => window.clearTimeout(timer);
  }, [data, backend.syncEnabled, auth.user]);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const healthResponse = await apiFetch('/api/health');
        const health = await readJsonResponse(healthResponse);

        if (cancelled) return;

        setBackend((current) => ({
          ...current,
          checked: true,
          storage: health.storage || 'backend',
          hasGeminiKey: Boolean(health.hasGeminiKey),
        }));

        const meResponse = await apiFetch('/api/auth/me', { credentials: 'include' });
        const mePayload = await readJsonResponse(meResponse).catch((error) => ({ error: error.message }));

        if (cancelled) return;

        if (!meResponse.ok) {
          if (meResponse.status === 401) clearStoredAuthToken();
          setAuth({ checked: true, user: null, error: '', loading: false });
          setBackend((current) => ({ ...current, checked: true, syncEnabled: false }));
          return;
        }

        storeAuthToken(mePayload.token);
        setAuth({ checked: true, user: mePayload.user, error: '', loading: false });
        await fetchBackendData(mePayload.user, health.storage || 'backend');
      } catch (error) {
        if (!cancelled) {
          setBackend({
            checked: true,
            syncEnabled: false,
            saving: false,
            storage: 'local',
            hasGeminiKey: false,
            error: `Backend chưa sẵn sàng: ${error.message}`,
          });
        }
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  async function fetchBackendData(user, storage = backend.storage) {
    const response = await apiFetch('/api/data', { credentials: 'include' });
    const payload = await readJsonResponse(response).catch((error) => ({ error: error.message }));
    if (response.status === 401) {
      clearStoredAuthToken();
      setAuth({ checked: true, user: null, error: 'Vui lòng đăng nhập lại.', loading: false });
      setBackend((current) => ({ ...current, syncEnabled: false, saving: false }));
      return;
    }
    if (!response.ok) throw new Error(payload.error || 'Không tải được dữ liệu backend.');

    const remoteState = {
      sessions: Array.isArray(payload.sessions) ? payload.sessions : [],
      mistakes: Array.isArray(payload.mistakes) ? payload.mistakes : [],
      reports: Array.isArray(payload.reports) ? payload.reports : [],
    };
    const userCachedState = loadState(user.id);
    const legacyCachedState = loadState();
    const cachedState = !isStateEmpty(userCachedState) ? userCachedState : legacyCachedState;
    const nextState = isStateEmpty(remoteState) && !isStateEmpty(cachedState) ? cachedState : remoteState;

    setData(nextState);
    saveLocalState(user.id, nextState);
    setBackend((current) => ({
      ...current,
      checked: true,
      syncEnabled: true,
      saving: false,
      storage,
      error: '',
    }));

    if (nextState === cachedState) {
      await apiFetch('/api/data', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextState),
      });
    }
  }

  const stats = useMemo(() => calculateStats(data.sessions, data.mistakes), [data.sessions, data.mistakes]);

  function setSessions(updater) {
    setData((current) => ({ ...current, sessions: typeof updater === 'function' ? updater(current.sessions) : updater }));
  }

  function setMistakes(updater) {
    setData((current) => ({ ...current, mistakes: typeof updater === 'function' ? updater(current.mistakes) : updater }));
  }

  function setReports(updater) {
    setData((current) => ({ ...current, reports: typeof updater === 'function' ? updater(current.reports) : updater }));
  }

  function saveAIMistake(record) {
    setMistakes((current) => [record, ...current]);
    setAiDraft(null);
    setActiveTab('mistakes');
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `toeic-tracker-${today()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importData(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      setData({
        sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
        mistakes: Array.isArray(parsed.mistakes) ? parsed.mistakes : [],
        reports: Array.isArray(parsed.reports) ? parsed.reports : [],
      });
    } catch {
      window.alert('File JSON không hợp lệ.');
    } finally {
      event.target.value = '';
    }
  }

  async function handleAuthSubmit(mode, form) {
    setAuth((current) => ({ ...current, loading: true, error: '' }));
    try {
      const response = await apiFetch(`/api/auth/${mode === 'register' ? 'register' : 'login'}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = await readJsonResponse(response).catch((error) => ({ error: error.message }));
      if (!response.ok) throw new Error(payload.error || 'Không đăng nhập được.');

      storeAuthToken(payload.token);
      setAuth({ checked: true, user: payload.user, error: '', loading: false });
      await fetchBackendData(payload.user, backend.storage);
    } catch (error) {
      setAuth({ checked: true, user: null, error: error.message, loading: false });
    }
  }

  async function logout() {
    await apiFetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    clearStoredAuthToken();
    setAuth({ checked: true, user: null, error: '', loading: false });
    setBackend((current) => ({ ...current, syncEnabled: false, saving: false }));
    setData({ ...EMPTY_STATE });
  }

  if (!auth.checked) {
    return <AuthLoadingScreen />;
  }

  if (!auth.user) {
    return <AuthGate error={auth.error} onSubmit={handleAuthSubmit} />;
  }

  return (
    <div className="app-shell">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        onExport={exportData}
        onImportClick={() => importRef.current?.click()}
        onLogout={logout}
        user={auth.user}
      />
      <input ref={importRef} className="hidden-input" type="file" accept="application/json" onChange={importData} />

      <main className="main-area">
        {backend.error && <div className="sync-warning">{backend.error}</div>}

        {activeTab === 'overview' && (
          <OverviewV2
            sessions={data.sessions}
            mistakes={data.mistakes}
            reports={data.reports}
            stats={stats}
            setActiveTab={setActiveTab}
          />
        )}
        {activeTab === 'journal' && <Journal sessions={data.sessions} setSessions={setSessions} />}
        {activeTab === 'mistakes' && <Mistakes mistakes={data.mistakes} setMistakes={setMistakes} initialDraft={aiDraft} />}
        {activeTab === 'ai' && <AIAnalyzer onSaveMistake={saveAIMistake} />}
        {activeTab === 'reports' && (
          <Reports
            stats={stats}
            sessions={data.sessions}
            mistakes={data.mistakes}
            reports={data.reports}
            setReports={setReports}
          />
        )}
        {activeTab === 'reportHistory' && (
          <ReportHistory
            reports={data.reports}
            setReports={setReports}
          />
        )}
      </main>
      <AssistantWidget
        stats={stats}
        sessions={data.sessions}
        mistakes={data.mistakes}
        activeTab={activeTab}
        hasGeminiKey={backend.hasGeminiKey}
        onAuthExpired={() => {
          setAuth({ checked: true, user: null, error: 'Bạn cần đăng nhập lại để dùng trợ lý AI.', loading: false });
          setBackend((current) => ({ ...current, syncEnabled: false, saving: false }));
        }}
      />
    </div>
  );
}
