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
app.use(express.json({ limit: '1mb' }));

// ── API: Gemini をサーバー側で代理で叩く（キーはブラウザに出さない）──
app.post('/api/generate', async (req, res) => {
  const content = req.body?.content;
  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'content がありません' });
  }
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: content }] }] }),
    });
    if (!r.ok) {
      const errBody = await r.json().catch(() => ({}));
      return res.status(r.status).json({ error: errBody?.error?.message || r.statusText });
    }
    const data = await r.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    res.json({ text });
  } catch (e) {
    res.status(500).json({ error: e.message || 'サーバーエラー' });
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
