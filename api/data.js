// /api/data – サーバーサイドSupabaseプロキシ
// クライアントはSupabaseに直接アクセスしない構造にすることで
// iOS Safari の CORS / Load failed 問題を完全に解消する

const SB_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SB_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
// ★ 同期トークン認証: Vercel環境変数 SYNC_TOKEN を設定すると有効になる
// 未設定の間は従来どおり動作する（後方互換・デプロイ直後にアプリが壊れない）
const SYNC_TOKEN = process.env.SYNC_TOKEN || '';

async function sbFetch(path, options = {}) {
  const url = `${SB_URL}/rest/v1/${path}`;
  const resp = await fetch(url, {
    ...options,
    headers: {
      'apikey': SB_KEY,
      'Authorization': `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`[${resp.status}] ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

// ★ 分割取得
// 在庫869点を一度にSELECTすると写真base64で30MBになり、Supabase側が
// statement timeout (57014) で落ちて「同期失敗」になる。
// 200件ずつに割って取得すれば1クエリが軽くなり落ちない。
// ★ 逐次で回すこと。並列に投げるとSupabase側が競合して statement timeout (57014) になる
async function sbFetchPaged(path, pageSize = 150) {
  const sep = path.includes('?') ? '&' : '?';
  const all = [];
  for (let offset = 0; offset <= 100000; offset += pageSize) {
    const page = await sbFetch(`${path}${sep}limit=${pageSize}&offset=${offset}`);
    if (!Array.isArray(page) || page.length === 0) break;
    all.push(...page);
    if (page.length < pageSize) break;
  }
  return all;
}

// base64が欠けた写真を、Supabaseに保存済みの値で補う
async function preservePhotoData(rows) {
  if (!rows?.length) return rows;
  const needIds = rows
    .filter(r => (r?.data?.photos || []).some(p => p && !p.thumbDataUrl && !p.medDataUrl))
    .map(r => r.id);
  if (!needIds.length) return rows;

  let saved = new Map();
  try {
    const ids = needIds.map(id => `"${id}"`).join(',');
    const prev = await sbFetch(`inventory?select=id,data&id=in.(${ids})`);
    saved = new Map((Array.isArray(prev) ? prev : []).map(r => [
      r.id,
      new Map((r.data?.photos || []).map(p => [p.id, p])),
    ]));
  } catch(e) {
    // 取得できなければ補完をあきらめる（保存自体は続行する）
    console.warn('[api/data] 写真base64の補完に失敗:', e.message);
    return rows;
  }

  return rows.map(r => {
    const old = saved.get(r.id);
    if (!old || !Array.isArray(r.data?.photos)) return r;
    return {
      ...r,
      data: {
        ...r.data,
        photos: r.data.photos.map(p => {
          if (!p || p.thumbDataUrl || p.medDataUrl) return p;
          const o = old.get(p.id);
          if (!o) return p;
          return {
            ...p,
            ...(o.thumbDataUrl ? { thumbDataUrl: o.thumbDataUrl } : {}),
            ...(o.medDataUrl   ? { medDataUrl:   o.medDataUrl   } : {}),
          };
        }),
      },
    };
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Sync-Token');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // ★ 認証チェック（SYNC_TOKEN 設定時のみ）
  if (SYNC_TOKEN && req.headers['x-sync-token'] !== SYNC_TOKEN) {
    res.status(401).json({ ok: false, error: '認証エラー: 設定タブで同期トークンを入力してください' });
    return;
  }

  if (!SB_URL || !SB_KEY) {
    res.status(500).json({ ok: false, error: 'Supabase env vars not set on server' });
    return;
  }

  try {
    // ── GET: 全データ取得 ──────────────────────────────────────
    if (req.method === 'GET') {
      const [inv, sales] = await Promise.all([
        sbFetchPaged('inventory?select=id,data,created_at&order=created_at.asc'),
        sbFetchPaged('sales?select=id,data,created_at&order=created_at.asc'),
      ]);
      const cfg = await sbFetch('app_settings?select=data&id=eq.default', {
        headers: { 'Accept': 'application/vnd.pgrst.object+json' },
      }).catch(() => null);
      // ★ レシートも同じ app_settings テーブル内の別行 (id=receipts) で管理
      const rcp = await sbFetch('app_settings?select=data&id=eq.receipts', {
        headers: { 'Accept': 'application/vnd.pgrst.object+json' },
      }).catch(() => null);

      // ★ light=1: 写真のbase64（thumbDataUrl / medDataUrl）を落として返す
      // 在庫869点で全部返すと30MB・23秒かかり、iPhoneの回線では途中で切れて「同期失敗」になる。
      // サムネイルは端末のIndexedDBにあるので通常起動には不要。
      // 写真復元が必要なときだけクライアントが light なしで取り直す。
      const light = req.query?.light === '1';
      const lighten = (item) => (light && Array.isArray(item.photos))
        ? { ...item, photos: item.photos.map(p => ({ id: p.id, thumbId: p.thumbId })) }
        : item;

      res.json({
        ok: true,
        light,
        inventory: (Array.isArray(inv)   ? inv   : []).map(r => lighten({ ...r.data, id: r.id })),
        sales:     (Array.isArray(sales) ? sales : []).map(r => ({ ...r.data, id: r.id })),
        settings:  cfg?.data || null,
        receipts:  (rcp?.data && Array.isArray(rcp.data.list)) ? rcp.data.list : [],
      });

    // ── POST: 差分保存（upsert / delete）──────────────────────
    } else if (req.method === 'POST') {
      const { invUpsert, invDelete, salesUpsert, salesDelete, settings, receipts } = req.body || {};
      const ops = [];

      // ★ 写真base64の消失防止
      // light モードで受け取ったデータをそのまま書き戻すと、保存済みの
      // thumbDataUrl / medDataUrl（写真の3重バックアップの1つ）が消えてしまう。
      // base64が欠けている写真は、保存済みの値をサーバー側で埋め直す。
      const invRows = await preservePhotoData(invUpsert);

      if (invRows?.length)
        ops.push(sbFetch('inventory', {
          method: 'POST',
          headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(invRows),
        }));
      if (invDelete?.length) {
        const ids = invDelete.map(id => `"${id}"`).join(',');
        ops.push(sbFetch(`inventory?id=in.(${ids})`, { method: 'DELETE' }));
      }
      if (salesUpsert?.length)
        ops.push(sbFetch('sales', {
          method: 'POST',
          headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(salesUpsert),
        }));
      if (salesDelete?.length) {
        const ids = salesDelete.map(id => `"${id}"`).join(',');
        ops.push(sbFetch(`sales?id=in.(${ids})`, { method: 'DELETE' }));
      }
      if (settings !== undefined)
        ops.push(sbFetch('app_settings', {
          method: 'POST',
          headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify([{ id: 'default', data: settings }]),
        }));
      // ★ レシートを保存（list 全体を上書き保存）
      if (receipts !== undefined)
        ops.push(sbFetch('app_settings', {
          method: 'POST',
          headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify([{ id: 'receipts', data: { list: receipts } }]),
        }));

      await Promise.all(ops);
      res.json({ ok: true });

    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch(e) {
    console.error('[api/data] error:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
}
