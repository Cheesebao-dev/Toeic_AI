import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Brain,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Cloud,
  Download,
  Edit3,
  Eye,
  EyeOff,
  FileText,
  Filter,
  LayoutDashboard,
  LogOut,
  Lock,
  Mail,
  Menu,
  NotebookTabs,
  Plus,
  Save,
  Search,
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
const EMPTY_STATE = { sessions: [], mistakes: [], reports: [] };

const PARTS = [
  { id: 'Part 1', skill: 'Listening' },
  { id: 'Part 2', skill: 'Listening' },
  { id: 'Part 3', skill: 'Listening' },
  { id: 'Part 4', skill: 'Listening' },
  { id: 'Part 5', skill: 'Reading' },
  { id: 'Part 6', skill: 'Reading' },
  { id: 'Part 7', skill: 'Reading' },
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
const PIE_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6', '#111827'];

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

function today() {
  return new Date().toISOString().slice(0, 10);
}

function createBlankPartScores() {
  return PARTS.reduce((acc, part) => {
    acc[part.id] = { correct: '', total: '' };
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

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
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
      acc.correct += numberValue(row.correct);
      acc.total += numberValue(row.total);
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
      if (calc.totalScore) acc.latestScore = calc.totalScore;
      PARTS.forEach((part) => {
        const row = session.partScores?.[part.id] || {};
        acc.parts[part.id].correct += numberValue(row.correct);
        acc.parts[part.id].total += numberValue(row.total);
      });
      return acc;
    },
    {
      totalQuestions: 0,
      totalCorrect: 0,
      totalWrong: 0,
      minutes: 0,
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

function AuthGate({ error, onSubmit }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [visualIndex, setVisualIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setVisualIndex((current) => (current + 1) % AUTH_VISUAL_SLIDES.length);
    }, 3000);

    return () => window.clearInterval(timer);
  }, []);

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
            <div className="auth-slide-track" style={{ transform: `translateX(-${visualIndex * 100}%)` }}>
              {AUTH_VISUAL_SLIDES.map((slide) => (
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
              <span className={index === visualIndex ? 'active' : ''} key={slide.id}></span>
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

function IconButton({ title, children, className = '', ...props }) {
  return (
    <button className={`icon-button ${className}`} title={title} aria-label={title} {...props}>
      {children}
    </button>
  );
}

function Sidebar({ activeTab, setActiveTab, collapsed, setCollapsed, onExport, onImportClick }) {
  const navItems = [
    ['overview', 'Tổng quan', LayoutDashboard],
    ['journal', 'Nhật ký', ClipboardList],
    ['mistakes', 'Sổ tay lỗi sai', NotebookTabs],
    ['ai', 'AI phân tích', Sparkles],
    ['reports', 'Báo cáo', FileText],
  ];

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="brand-row">
        <div className="brand-mark">T</div>
        {!collapsed && (
          <div>
            <strong>TOEIC Tracker</strong>
            <span>AI Study OS</span>
          </div>
        )}
        <IconButton title="Thu gọn" onClick={() => setCollapsed(!collapsed)}>
          <Menu size={19} />
        </IconButton>
      </div>

      <nav className="nav-list">
        {navItems.map(([id, label, Icon]) => (
          <button key={id} className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)} title={label}>
            <Icon size={19} />
            {!collapsed && <span>{label}</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar-tools">
        <button onClick={onExport} title="Xuất dữ liệu">
          <Download size={18} />
          {!collapsed && <span>Xuất JSON</span>}
        </button>
        <button onClick={onImportClick} title="Nhập dữ liệu">
          <Upload size={18} />
          {!collapsed && <span>Nhập JSON</span>}
        </button>
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
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" domain={[0, 990]} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                <Tooltip />
                <Line yAxisId="left" type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
                <Line yAxisId="right" type="monotone" dataKey="accuracy" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
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
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="part" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="accuracy" fill="#2563eb" radius={[6, 6, 0, 0]} />
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
          <pre className="markdown-box">{latestReport.markdown}</pre>
        </section>
      )}
    </div>
  );
}

function Journal({ sessions, setSessions }) {
  const [draft, setDraft] = useState(createBlankSession);
  const [editingId, setEditingId] = useState(null);

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
    const record = {
      ...draft,
      id: editingId || uid(),
      title: draft.title.trim() || 'Buổi luyện TOEIC',
      updatedAt: new Date().toISOString(),
      createdAt: editingId ? draft.createdAt : new Date().toISOString(),
    };
    setSessions((current) =>
      editingId ? current.map((item) => (item.id === editingId ? record : item)) : [record, ...current],
    );
    setEditingId(null);
    setDraft(createBlankSession());
  }

  function editSession(session) {
    setEditingId(session.id);
    setDraft({
      ...createBlankSession(),
      ...session,
      partScores: { ...createBlankPartScores(), ...(session.partScores || {}) },
    });
  }

  function deleteSession(id) {
    setSessions((current) => current.filter((item) => item.id !== id));
  }

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
        <form onSubmit={saveSession} className="stack-form">
          <div className="form-grid">
            <Field label="Ngày">
              <input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} />
            </Field>
            <Field label="Tên đề">
              <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="ETS 2024 Test 01" />
            </Field>
            <Field label="Loại buổi">
              <select value={draft.mode} onChange={(event) => setDraft({ ...draft, mode: event.target.value })}>
                <option>Full test</option>
                <option>Listening</option>
                <option>Reading</option>
                <option>Part riêng</option>
              </select>
            </Field>
            <Field label="Thời gian">
              <input type="number" min="0" value={draft.durationMinutes} onChange={(event) => setDraft({ ...draft, durationMinutes: event.target.value })} placeholder="120" />
            </Field>
          </div>

          <div className="part-score-grid">
            {PARTS.map((part) => (
              <div key={part.id} className="part-score-row">
                <strong>{part.id}</strong>
                <span>{part.skill}</span>
                <input
                  type="number"
                  min="0"
                  placeholder="Đúng"
                  value={draft.partScores[part.id]?.correct || ''}
                  onChange={(event) => updatePart(part.id, 'correct', event.target.value)}
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Tổng"
                  value={draft.partScores[part.id]?.total || ''}
                  onChange={(event) => updatePart(part.id, 'total', event.target.value)}
                />
              </div>
            ))}
          </div>

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
              return (
                <article className="record-card" key={session.id}>
                  <div className="record-main">
                    <div>
                      <strong>{session.title}</strong>
                      <span>{session.date} · {session.mode}</span>
                    </div>
                    <div className="record-score">{calc.totalScore || calc.accuracy}</div>
                  </div>
                  <div className="record-meta">
                    <span>{calc.totalCorrect}/{calc.totalQuestions} câu</span>
                    <span>{calc.accuracy}%</span>
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
          <select
            value={draft.part}
            onChange={(event) => {
              const part = PARTS.find((item) => item.id === event.target.value);
              setDraft({ ...draft, part: event.target.value, skill: part?.skill || selectedPart?.skill || 'Reading' });
            }}
          >
            {PARTS.map((part) => (
              <option key={part.id}>{part.id}</option>
            ))}
          </select>
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
          <select value={draft.userAnswer} onChange={(event) => setDraft({ ...draft, userAnswer: event.target.value })}>
            {ANSWERS.map((answer) => (
              <option key={answer}>{answer}</option>
            ))}
          </select>
        </Field>
        <Field label="Đáp án đúng">
          <select value={draft.correctAnswer} onChange={(event) => setDraft({ ...draft, correctAnswer: event.target.value })}>
            {ANSWERS.map((answer) => (
              <option key={answer}>{answer}</option>
            ))}
          </select>
        </Field>
        <Field label="Loại lỗi">
          <select value={draft.mistakeType} onChange={(event) => setDraft({ ...draft, mistakeType: event.target.value })}>
            {MISTAKE_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </Field>
        <Field label="Trạng thái">
          <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}>
            {STATUSES.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
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
          <select value={filters.part} onChange={(event) => setFilters({ ...filters, part: event.target.value })}>
            <option>Tất cả</option>
            {PARTS.map((part) => (
              <option key={part.id}>{part.id}</option>
            ))}
          </select>
          <select value={filters.type} onChange={(event) => setFilters({ ...filters, type: event.target.value })}>
            <option>Tất cả</option>
            {MISTAKE_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
          <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
            <option>Tất cả</option>
            {STATUSES.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
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
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        credentials: 'include',
        body: payload,
      });
      const data = await response.json();
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
              <select value={form.part} onChange={(event) => setForm({ ...form, part: event.target.value })}>
                {PARTS.map((part) => (
                  <option key={part.id}>{part.id}</option>
                ))}
              </select>
            </Field>
            <Field label="Bạn chọn">
              <select value={form.userAnswer} onChange={(event) => setForm({ ...form, userAnswer: event.target.value })}>
                {ANSWERS.map((answer) => (
                  <option key={answer}>{answer}</option>
                ))}
              </select>
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

  async function generateReport() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/ai/report', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stats, sessions, mistakes }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không tạo được báo cáo');
      setReports((current) => [{ id: uid(), markdown: data.markdown, createdAt: new Date().toLocaleString('vi-VN') }, ...current]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-grid">
      <section className="panel wide">
        <div className="panel-heading">
          <h2>Báo cáo AI</h2>
          <button className="primary-button" onClick={generateReport} disabled={loading}>
            <Sparkles size={18} />
            {loading ? 'Đang tạo...' : 'Tạo báo cáo'}
          </button>
        </div>
        {error && <div className="error-box"><AlertCircle size={18} />{error}</div>}
        {reports[0] ? <pre className="markdown-box">{reports[0].markdown}</pre> : <EmptyState title="Chưa có báo cáo" />}
      </section>

      <section className="panel wide">
        <div className="panel-heading">
          <h2>Lịch sử báo cáo</h2>
          <span>{reports.length} bản</span>
        </div>
        <div className="record-list compact">
          {reports.slice(1).map((report) => (
            <article className="record-card" key={report.id}>
              <div className="record-main">
                <strong>{report.createdAt}</strong>
                <IconButton title="Xóa" className="danger" onClick={() => setReports((current) => current.filter((item) => item.id !== report.id))}>
                  <Trash2 size={17} />
                </IconButton>
              </div>
              <pre className="markdown-box mini">{report.markdown}</pre>
            </article>
          ))}
        </div>
      </section>
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
        const response = await fetch('/api/data', {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const payload = await response.json().catch(() => ({}));
        if (response.status === 401) {
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
        const healthResponse = await fetch('/api/health');
        const health = await healthResponse.json();

        if (cancelled) return;

        setBackend((current) => ({
          ...current,
          checked: true,
          storage: health.storage || 'backend',
        }));

        const meResponse = await fetch('/api/auth/me', { credentials: 'include' });
        const mePayload = await meResponse.json().catch(() => ({}));

        if (cancelled) return;

        if (!meResponse.ok) {
          setAuth({ checked: true, user: null, error: '', loading: false });
          setBackend((current) => ({ ...current, checked: true, syncEnabled: false }));
          return;
        }

        setAuth({ checked: true, user: mePayload.user, error: '', loading: false });
        await fetchBackendData(mePayload.user, health.storage || 'backend');
      } catch (error) {
        if (!cancelled) {
          setBackend({
            checked: true,
            syncEnabled: false,
            saving: false,
            storage: 'local',
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
    const response = await fetch('/api/data', { credentials: 'include' });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401) {
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
    setBackend({
      checked: true,
      syncEnabled: true,
      saving: false,
      storage,
      error: '',
    });

    if (nextState === cachedState) {
      await fetch('/api/data', {
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

  const titleMap = {
    overview: 'Tổng quan',
    journal: 'Nhật ký',
    mistakes: 'Sổ tay lỗi sai',
    ai: 'AI phân tích',
    reports: 'Báo cáo',
  };

  async function handleAuthSubmit(mode, form) {
    setAuth((current) => ({ ...current, loading: true, error: '' }));
    try {
      const response = await fetch(`/api/auth/${mode === 'register' ? 'register' : 'login'}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Không đăng nhập được.');

      setAuth({ checked: true, user: payload.user, error: '', loading: false });
      await fetchBackendData(payload.user, backend.storage);
    } catch (error) {
      setAuth({ checked: true, user: null, error: error.message, loading: false });
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    setAuth({ checked: true, user: null, error: '', loading: false });
    setBackend((current) => ({ ...current, syncEnabled: false, saving: false }));
    setData({ ...EMPTY_STATE });
  }

  if (!auth.checked) {
    return (
      <main className="access-shell">
        <section className="access-panel">
          <div className="brand-mark">T</div>
          <h1>TOEIC Tracker</h1>
          <p>Đang kiểm tra phiên đăng nhập...</p>
        </section>
      </main>
    );
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
      />
      <input ref={importRef} className="hidden-input" type="file" accept="application/json" onChange={importData} />

      <main className="main-area">
        <header className="topbar">
          <div>
            <span>TOEIC 990 Workspace</span>
            <h1>{titleMap[activeTab]}</h1>
          </div>
          <div className="topbar-summary">
            <span className="user-pill">{auth.user.name || auth.user.email}</span>
            <span className={backend.syncEnabled ? 'sync-pill ok' : 'sync-pill'}>
              <Cloud size={15} />
              {backend.syncEnabled ? `BE: ${backend.storage}` : 'Local cache'}
            </span>
            {backend.saving && <span>Đang lưu...</span>}
            <span>{stats.totalQuestions} câu</span>
            <span>{stats.accuracy}% accuracy</span>
            <span>{stats.openMistakes} lỗi mở</span>
            <button className="topbar-logout" onClick={logout} title="Đăng xuất" aria-label="Đăng xuất">
              <LogOut size={16} />
              Đăng xuất
            </button>
          </div>
        </header>

        {backend.error && <div className="sync-warning">{backend.error}</div>}

        {activeTab === 'overview' && (
          <Overview
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
      </main>
    </div>
  );
}
