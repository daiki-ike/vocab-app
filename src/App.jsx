import React, { useState } from "react";

// ─── API (Gemini対応版) ───────────────────────────────
async function callGemini(content) {
  // Canvas環境で動作させるため、APIキーは空文字列に設定します。
  // ※Vercel等へデプロイする際は、環境変数を使用するように（例: import.meta.env.VITE_GEMINI_API_KEY）書き換えてください。
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";

  // Canvas環境でサポートされているモデルのエンドポイントを使用します。
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: content }] }]
    }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(`API通信エラー (${res.status}): ${errBody?.error?.message || res.statusText}`);
  }
  const data = await res.json();
  const raw = data.candidates[0].content.parts[0].text;
  
  // MarkdownのJSONブロック記法を取り除いてパース
  return JSON.parse(raw.replace(/```json\n?|```/g, "").trim());
}

function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 0.82;
  window.speechSynthesis.speak(u);
}

// ─── CSS ──────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400;1,700&family=DM+Sans:wght@400;500;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:#F1F5F9;}
  .root{min-height:100vh;background:#F1F5F9;color:#1E293B;font-family:'DM Sans',sans-serif;max-width:460px;margin:0 auto;padding-bottom:48px;}
  .header{padding:22px 20px 14px;border-bottom:1px solid #CBD5E1;background:#FFFFFF;}
  .logo{font-family:'Playfair Display',serif;font-size:26px;font-weight:700;color:#B45309;letter-spacing:-0.5px;}
  .logo-sub{font-size:11px;color:#64748B;letter-spacing:1px;margin-top:2px;}
  .tabs{display:flex;border-bottom:1px solid #CBD5E1;padding:0 20px;background:#FFFFFF;}
  .tab-btn{flex:1;padding:11px 4px;background:none;border:none;border-bottom:2px solid transparent;color:#64748B;font-size:13px;font-family:'DM Sans',sans-serif;font-weight:500;cursor:pointer;margin-bottom:-1px;transition:all .2s;}
  .tab-btn.active{color:#D97706;border-bottom-color:#D97706;font-weight:700;}
  .content{padding:20px;}
  .section-label{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#64748B;}
  .desc{font-size:12px;color:#64748B;}
  .input-row{display:flex;gap:8px;}
  .text-input{flex:1;background:#FFFFFF;border:1px solid #CBD5E1;border-radius:10px;color:#1E293B;padding:11px 14px;font-size:14px;font-family:'DM Sans',sans-serif;outline:none;transition:border-color .2s;}
  .text-input:focus{border-color:#D97706;}
  .text-area{width:100%;background:#FFFFFF;border:1px solid #CBD5E1;border-radius:10px;color:#1E293B;padding:11px 14px;font-size:14px;font-family:'DM Sans',sans-serif;outline:none;resize:vertical;transition:border-color .2s;line-height:1.5;}
  .text-area:focus{border-color:#D97706;}
  .gen-btn{background:#D97706;color:#FFFFFF;border:none;border-radius:10px;padding:11px 18px;font-size:14px;font-family:'DM Sans',sans-serif;font-weight:700;cursor:pointer;transition:all .15s;white-space:nowrap;}
  .gen-btn:hover{background:#B45309;}
  .gen-btn:disabled{opacity:.35;cursor:not-allowed;}
  .gen-btn.full{width:100%;margin-top:4px;}
  .chips{display:flex;flex-wrap:wrap;gap:6px;}
  .chip{background:#FFFFFF;border:1px solid #CBD5E1;border-radius:20px;color:#475569;padding:5px 12px;font-size:12px;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all .2s;}
  .chip:hover{border-color:#D97706;color:#D97706;}
  .view-toggle{display:flex;gap:6px;}
  .toggle-btn{padding:6px 16px;background:#FFFFFF;border:1px solid #CBD5E1;border-radius:20px;color:#475569;font-size:12px;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all .2s;}
  .toggle-btn.active{background:#FEF3C7;border-color:#D97706;color:#D97706;}
  .card-list{display:flex;flex-direction:column;gap:10px;}
  .vocab-card{background:#FFFFFF;border:1px solid #E2E8F0;border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:6px;}
  .card-top{display:flex;align-items:center;justify-content:space-between;gap:8px;}
  .card-en{font-family:'Playfair Display',serif;font-size:20px;font-style:italic;color:#1E293B;}
  .card-ja{font-size:13px;color:#D97706;font-weight:500;}
  .card-ex-row{display:flex;align-items:center;gap:8px;margin-top:2px;}
  .card-ex{font-size:13px;color:#475569;font-style:italic;flex:1;}
  .card-ex-ja{font-size:12px;color:#64748B;}
  .speak-btn{background:#F1F5F9;border:none;border-radius:8px;color:#D97706;padding:5px 11px;font-size:12px;cursor:pointer;transition:background .2s;white-space:nowrap;flex-shrink:0;}
  .speak-btn:hover{background:#E2E8F0;}
  .save-btn{background:none;border:1px solid #CBD5E1;border-radius:8px;color:#64748B;padding:4px 10px;font-size:11px;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all .2s;align-self:flex-end;margin-top:2px;}
  .save-btn:hover{border-color:#D97706;color:#D97706;}
  .flash-wrap{display:flex;flex-direction:column;align-items:center;gap:16px;}
  .flashcard{width:100%;min-height:210px;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:28px 24px;transition:transform .1s,border-color .2s;user-select:none;}
  .flashcard:hover{border-color:#CBD5E1;}
  .flashcard:active{transform:scale(.97);}
  .flash-inner{display:flex;flex-direction:column;align-items:center;gap:12px;width:100%;text-align:center;}
  .flash-count{font-size:11px;color:#94A3B8;letter-spacing:1px;}
  .flash-en{font-family:'Playfair Display',serif;font-size:30px;font-style:italic;color:#1E293B;line-height:1.2;}
  .flash-hint{font-size:11px;color:#94A3B8;margin-top:4px;}
  .flash-ja{font-family:'Playfair Display',serif;font-size:22px;color:#D97706;font-weight:700;}
  .flash-ex{font-size:14px;color:#475569;font-style:italic;}
  .flash-ex-ja{font-size:12px;color:#64748B;}
  .flash-ctrl{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;flex-wrap:wrap;}
  .nav-btn{background:#FFFFFF;border:1px solid #CBD5E1;border-radius:10px;color:#475569;padding:9px 18px;font-size:18px;cursor:pointer;transition:all .2s;line-height:1;}
  .nav-btn:hover:not(:disabled){border-color:#D97706;color:#D97706;}
  .nav-btn:disabled{opacity:.25;cursor:not-allowed;}
  .review-results{display:flex;flex-direction:column;gap:10px;}
  .result-card{background:#FFFFFF;border:1px solid #E2E8F0;border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:8px;}
  .result-card.natural{border-color:#CBD5E1;}
  .result-badge{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#94A3B8;}
  .result-en{font-family:'Playfair Display',serif;font-size:19px;font-style:italic;color:#1E293B;line-height:1.4;}
  .result-ja{font-size:13px;color:#475569;}
  .result-actions{display:flex;gap:8px;margin-top:2px;}
  .tip{background:#FFFBEB;border:1px solid #E2E8F0;border-left:3px solid #D97706;border-radius:10px;padding:12px 14px;font-size:13px;color:#475569;line-height:1.5;}
  .error{color:#DC2626;font-size:13px;background:rgba(239,68,68,.08);border-radius:8px;padding:10px 14px;}
  .empty{text-align:center;padding:60px 20px;display:flex;flex-direction:column;gap:10px;color:#94A3B8;font-size:14px;}
  .empty-icon{font-size:36px;margin-bottom:4px;}
  .empty-sub{font-size:12px;}
  .saved-header{display:flex;align-items:center;justify-content:space-between;}
  .saved-count{font-size:12px;color:#D97706;}
  .tab-content{display:flex;flex-direction:column;gap:14px;}
`;

// ─── Main App ──────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("prep");
  const [saved, setSaved] = useState([]);

  const addToSaved = (item) => {
    setSaved((prev) =>
      prev.some((s) => s.en === item.en) ? prev : [...prev, item]
    );
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="root">
        <header className="header">
          <div className="logo">VOCAB+</div>
          <div className="logo-sub">FOR GEMINI LIVE</div>
        </header>
        <nav className="tabs">
          {[
            { id: "prep", label: "事前準備" },
            { id: "review", label: "振り返り" },
            { id: "saved", label: `保存 ${saved.length > 0 ? `(${saved.length})` : ""}` },
          ].map((t) => (
            <button
              key={t.id}
              className={`tab-btn ${tab === t.id ? "active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="content">
          {tab === "prep" && <PrepTab onSave={addToSaved} />}
          {tab === "review" && <ReviewTab onSave={addToSaved} />}
          {tab === "saved" && <SavedTab items={saved} />}
        </div>
      </div>
    </>
  );
}

// ─── Prep Tab ─────────────────────────────────────────
function PrepTab({ onSave }) {
  const [topic, setTopic] = useState("");
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const [flashIdx, setFlashIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const suggestions = ["週末の出来事", "仕事の近況", "趣味・AI活用", "サッカー", "旅行の話", "最近読んだ本"];

  const generate = async () => {
    if (!topic.trim() || loading) return;
    setLoading(true);
    setError("");
    setCards([]);
    try {
      const result = await callGemini(
        `英会話のトピック「${topic}」で使える単語・フレーズを8個選んでください。
JSONのみ返してください（コードブロック・説明文不要）:
{"cards":[{"en":"phrase or word","ja":"日本語の意味","example":"Short natural example sentence.","example_ja":"例文の日本語訳"}]}`
      );
      setCards(result.cards || []);
      setFlashIdx(0);
      setFlipped(false);
      setViewMode("list");
    } catch (err) {
      setError(err.message || "生成に失敗しました。もう一度試してください。");
    }
    setLoading(false);
  };

  const goFlash = (dir) => {
    setFlashIdx((i) =>
      dir === "next" ? Math.min(cards.length - 1, i + 1) : Math.max(0, i - 1)
    );
    setFlipped(false);
  };

  return (
    <div className="tab-content">
      <div className="section-label">今日のトピック</div>
      <div className="input-row">
        <input
          className="text-input"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && generate()}
          placeholder="例：週末の出来事、仕事の近況..."
        />
        <button className="gen-btn" onClick={generate} disabled={loading || !topic.trim()}>
          {loading ? "生成中..." : "生成"}
        </button>
      </div>
      <div className="chips">
        {suggestions.map((s) => (
          <button key={s} className="chip" onClick={() => setTopic(s)}>{s}</button>
        ))}
      </div>

      {error && <div className="error">{error}</div>}

      {cards.length > 0 && (
        <>
          <div className="view-toggle">
            <button className={`toggle-btn ${viewMode === "list" ? "active" : ""}`} onClick={() => setViewMode("list")}>
              一覧
            </button>
            <button
              className={`toggle-btn ${viewMode === "flash" ? "active" : ""}`}
              onClick={() => { setViewMode("flash"); setFlashIdx(0); setFlipped(false); }}
            >
              カード
            </button>
          </div>

          {viewMode === "list" ? (
            <div className="card-list">
              {cards.map((c, i) => (
                <div key={i} className="vocab-card">
                  <div className="card-top">
                    <span className="card-en">{c.en}</span>
                    <button className="speak-btn" onClick={() => speak(c.en)}>▶ 発音</button>
                  </div>
                  <div className="card-ja">{c.ja}</div>
                  <div className="card-ex-row">
                    <span className="card-ex">{c.example}</span>
                    <button className="speak-btn" onClick={() => speak(c.example)}>▶</button>
                  </div>
                  <div className="card-ex-ja">{c.example_ja}</div>
                  <button className="save-btn" onClick={() => onSave(c)}>+ 保存</button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flash-wrap">
              <div className="flashcard" onClick={() => setFlipped((f) => !f)}>
                <div className="flash-inner">
                  <div className="flash-count">{flashIdx + 1} / {cards.length}</div>
                  {!flipped ? (
                    <>
                      <div className="flash-en">{cards[flashIdx].en}</div>
                      <div className="flash-hint">タップして訳を確認</div>
                    </>
                  ) : (
                    <>
                      <div className="flash-ja">{cards[flashIdx].ja}</div>
                      <div className="flash-ex">{cards[flashIdx].example}</div>
                      <div className="flash-ex-ja">{cards[flashIdx].example_ja}</div>
                    </>
                  )}
                </div>
              </div>
              <div className="flash-ctrl">
                <button className="nav-btn" onClick={() => goFlash("prev")} disabled={flashIdx === 0}>◀</button>
                <button className="speak-btn" style={{ padding: "9px 20px", fontSize: "13px" }} onClick={() => speak(cards[flashIdx].en)}>▶ 発音</button>
                <button className="nav-btn" onClick={() => goFlash("next")} disabled={flashIdx === cards.length - 1}>▶</button>
              </div>
              <button className="save-btn" onClick={() => onSave(cards[flashIdx])}>+ このフレーズを保存</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Review Tab ───────────────────────────────────────
function ReviewTab({ onSave }) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const r = await callGemini(
        `「${input}」を英語で表現してください。
JSONのみ返してください（コードブロック・説明文不要）:
{"simple":"シンプルで通じる英語","simple_ja":"その日本語訳","natural":"ネイティブらしい自然な英語","natural_ja":"その日本語訳","tip":"ポイント・覚え方（日本語、1〜2文）"}`
      );
      setResult(r);
    } catch (err) {
      setError(err.message || "生成に失敗しました。");
    }
    setLoading(false);
  };

  return (
    <div className="tab-content">
      <div className="section-label">言えなかったこと</div>
      <div className="desc">Gemini Liveで詰まった表現を日本語で入力してください。</div>
      <textarea
        className="text-area"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="例：竹のアシストは精度が高かったけど、フォワードが決められなくて残念だった"
        rows={3}
      />
      <button className="gen-btn full" onClick={generate} disabled={loading || !input.trim()}>
        {loading ? "変換中..." : "英語に変換"}
      </button>

      {error && <div className="error">{error}</div>}

      {result && (
        <div className="review-results">
          <div className="result-card simple">
            <div className="result-badge">シンプル版</div>
            <div className="result-en">{result.simple}</div>
            <div className="result-ja">{result.simple_ja}</div>
            <div className="result-actions">
              <button className="speak-btn" onClick={() => speak(result.simple)}>▶ 発音</button>
              <button className="save-btn" onClick={() => onSave({ en: result.simple, ja: result.simple_ja, example: result.simple, example_ja: result.simple_ja })}>
                + 保存
              </button>
            </div>
          </div>

          <div className="result-card natural">
            <div className="result-badge">ネイティブ版</div>
            <div className="result-en">{result.natural}</div>
            <div className="result-ja">{result.natural_ja}</div>
            <div className="result-actions">
              <button className="speak-btn" onClick={() => speak(result.natural)}>▶ 発音</button>
              <button className="save-btn" onClick={() => onSave({ en: result.natural, ja: result.natural_ja, example: result.natural, example_ja: result.natural_ja })}>
                + 保存
              </button>
            </div>
          </div>

          {result.tip && (
            <div className="tip">💡 {result.tip}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Saved Tab ────────────────────────────────────────
function SavedTab({ items }) {
  if (items.length === 0) {
    return (
      <div className="tab-content">
        <div className="empty">
          <div className="empty-icon">📚</div>
          <div>保存したフレーズはまだありません</div>
          <div className="empty-sub">事前準備・振り返りで「+ 保存」を押すと追加されます</div>
        </div>
      </div>
    );
  }
  return (
    <div className="tab-content">
      <div className="saved-header">
        <div className="section-label">保存済みフレーズ</div>
        <div className="saved-count">{items.length}件</div>
      </div>
      <div className="card-list">
        {items.map((item, i) => (
          <div key={i} className="vocab-card">
            <div className="card-top">
              <span className="card-en">{item.en}</span>
              <button className="speak-btn" onClick={() => speak(item.en)}>▶ 発音</button>
            </div>
            <div className="card-ja">{item.ja}</div>
            {item.example && item.example !== item.en && (
              <div className="card-ex-ja">{item.example_ja}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}