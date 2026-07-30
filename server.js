import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

if (!API_KEY || API_KEY === 'ここにAPIキー') {
  console.error('❌ GEMINI_API_KEY が未設定です。.env を作って API キーを入れてください。');
  process.exit(1);
}

const app = express();
app.set('trust proxy', 1); // Render のプロキシ越しでも本当のクライアントIPを見る
app.use(express.json({ limit: '1mb' }));

// ── 悪用対策：連打・同時大量アクセスでGemini枠を食い潰されないための上限 ──
const RATE_LIMIT = 10;             // 1つのIPにつき1分あたり10回まで
const RATE_WINDOW_MS = 60_000;
const MAX_CONCURRENT = 3;          // Gemini呼び出しはサーバー全体で同時3件まで
const MAX_CONTENT_LENGTH = 4000;   // 入力テキストの上限文字数
const UPSTREAM_TIMEOUT_MS = 30_000; // Geminiが返ってこないとき30秒で打ち切る

const hits = new Map(); // IP → 直近リクエストの時刻リスト
let inFlight = 0;

function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

// 古いIPの記録を定期的に掃除（メモリが増え続けないように）
setInterval(() => {
  const now = Date.now();
  for (const [ip, list] of hits) {
    const alive = list.filter((t) => now - t < RATE_WINDOW_MS);
    if (alive.length) hits.set(ip, alive);
    else hits.delete(ip);
  }
}, RATE_WINDOW_MS).unref();

// ── API: Gemini をサーバー側で代理で叩く（キーはブラウザに出さない）──
app.post('/api/generate', async (req, res) => {
  if (rateLimited(req.ip)) {
    return res.status(429).json({ error: 'リクエストが多すぎます。1分ほど待ってから試してください' });
  }
  const content = req.body?.content;
  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'content がありません' });
  }
  if (content.length > MAX_CONTENT_LENGTH) {
    return res.status(413).json({ error: `入力が長すぎます（${MAX_CONTENT_LENGTH}文字まで）` });
  }
  if (inFlight >= MAX_CONCURRENT) {
    return res.status(429).json({ error: '混み合っています。少し待ってから試してください' });
  }
  inFlight++;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: content }] }] }),
      signal: controller.signal,
    });
    if (!r.ok) {
      const errBody = await r.json().catch(() => ({}));
      return res.status(r.status).json({ error: errBody?.error?.message || r.statusText });
    }
    const data = await r.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    res.json({ text });
  } catch (e) {
    if (e.name === 'AbortError') {
      return res.status(504).json({ error: '生成がタイムアウトしました。もう一度試してください' });
    }
    res.status(500).json({ error: e.message || 'サーバーエラー' });
  } finally {
    clearTimeout(timer);
    inFlight--;
  }
});

// ── ビルド済みフロント（dist）を配信。古いJSのキャッシュを防ぐ ──
app.use(express.static(join(__dirname, 'dist'), {
  setHeaders: (res) => res.setHeader('Cache-Control', 'no-store'),
}));

// SPA フォールバック（どのパスでも index.html を返す）
app.get('*', (_req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ 起動しました → http://localhost:${PORT}`);
});
