// /api/claude – Anthropic API プロキシ
// APIキーはサーバー側(Supabase app_settings id='secrets')にだけ保存し、ブラウザには渡さない

export const config = {
  api: { bodyParser: { sizeLimit: '4mb' } },
};

const SB_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SB_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const SYNC_TOKEN = process.env.SYNC_TOKEN || '';
const MAX_TOKENS_CAP = 4096;
const MAX_BODY_BYTES = 4 * 1024 * 1024;
const ALLOWED_HOSTS = ['nobisyop.vercel.app', 'localhost', '127.0.0.1'];

let _cachedKey = '';
async function loadKey(force) {
  if (_cachedKey && !force) return _cachedKey;
  const resp = await fetch(`${SB_URL}/rest/v1/app_settings?select=k:data->>anthropicApiKey&id=eq.secrets`, {
    headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Accept': 'application/json' },
  });
  if (!resp.ok) throw new Error(`secrets取得失敗 [${resp.status}]`);
  const rows = await resp.json();
  _cachedKey = (Array.isArray(rows) && rows[0] && typeof rows[0].k === 'string') ? rows[0].k.trim() : '';
  return _cachedKey;
}

function hostOf(u) { try { return new URL(u).hostname; } catch { return ''; } }

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const origin = req.headers.origin || '';
  const src = origin || req.headers.referer || '';
  const okOrigin = ALLOWED_HOSTS.includes(hostOf(src));
  if (okOrigin && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Sync-Token');
  }
  if (req.method === 'OPTIONS') { res.status(okOrigin ? 200 : 403).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: { message: 'Method not allowed' } }); return; }
  if (!okOrigin) { res.status(403).json({ error: { message: '許可されていないアクセス元です' } }); return; }
  if (SYNC_TOKEN && req.headers['x-sync-token'] !== SYNC_TOKEN) {
    res.status(401).json({ error: { message: '認証エラー' } }); return;
  }
  if (!SB_URL || !SB_KEY) { res.status(500).json({ error: { message: 'Supabase env vars not set on server' } }); return; }

  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    res.status(400).json({ error: { message: 'JSONボディが必要です' } }); return;
  }
  let raw;
  try { raw = JSON.stringify(body); } catch { res.status(400).json({ error: { message: 'JSONが不正です' } }); return; }
  if (Buffer.byteLength(raw) > MAX_BODY_BYTES) {
    res.status(413).json({ error: { message: '画像が大きすぎます（4MB超）。枚数を減らすか小さい画像にしてください' } }); return;
  }
  if (typeof body.model !== 'string' || !body.model.startsWith('claude-')) {
    res.status(400).json({ error: { message: 'model が不正です' } }); return;
  }
  const mt = Number(body.max_tokens);
  if (!Number.isFinite(mt) || mt < 1 || mt > MAX_TOKENS_CAP) {
    res.status(400).json({ error: { message: `max_tokens は 1〜${MAX_TOKENS_CAP} で指定してください` } }); return;
  }
  if (body.stream) { res.status(400).json({ error: { message: 'stream は未対応です' } }); return; }

  try {
    const call = async (key) => fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: raw,
    });
    let key = await loadKey(false);
    if (!key) { res.status(400).json({ error: { message: 'APIキーが未設定です（設定タブで入力してください）' } }); return; }
    let r = await call(key);
    if (r.status === 401) { // キー更新直後のキャッシュ落ちに備えて1回だけ再読込
      const k2 = await loadKey(true);
      if (k2 && k2 !== key) { key = k2; r = await call(key); }
    }
    const text = await r.text();
    res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
  } catch(e) {
    console.error('[api/claude] error:', e.message);
    res.status(502).json({ error: { message: 'Anthropic接続エラー: ' + e.message } });
  }
}
