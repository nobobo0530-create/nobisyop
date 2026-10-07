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
// pageSize=200 が実測で最速（150だと往復が増えて遅く、無制限だとtimeoutする）
async function sbFetchPaged(path, pageSize = 200) {
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

// ★ 古い書き込みガード用の補助関数
// 時刻を数値化（updatedAt → createdAt の順・不正値は0）
function tsOf(x) {
  const v = x && (x.updatedAt || x.createdAt);
  const t = v ? Date.parse(v) : NaN;
  return Number.isNaN(t) ? 0 : t;
}

// 保存済み行の updatedAt/createdAt だけを軽量に取得（写真base64は取らない）
// ids は分割して問い合わせる（URLが長くなりすぎないように）
async function fetchStoredStamps(table, ids) {
  const map = new Map();
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100).map(id => `"${id}"`).join(',');
    const rows = await sbFetch(`${table}?select=id,updatedAt:data->>updatedAt,createdAt:data->>createdAt&id=in.(${chunk})`);
    for (const r of (Array.isArray(rows) ? rows : [])) map.set(r.id, { updatedAt: r.updatedAt, createdAt: r.createdAt });
  }
  return map;
}

// 保存済みの墓標（削除済みID → 削除時刻）を取得
async function fetchStoredTombstones() {
  const rows = await sbFetch('app_settings?select=d:data->_deletedIds&id=eq.default');
  const d = Array.isArray(rows) && rows[0] ? rows[0].d : null;
  return (d && typeof d === 'object' && !Array.isArray(d)) ? d : {};
}

// 墓標を和集合にする（同じIDは新しい時刻を採用）
function mergeTombstones(a, b) {
  const out = { ...(a || {}) };
  for (const [id, t] of Object.entries(b || {})) {
    const cur = out[id];
    if (!cur || (Date.parse(t) || 0) > (Date.parse(cur) || 0)) out[id] = t;
  }
  return out;
}

// ★ まとめ買いの表紙 settings.bundleCovers（bundleGroup → 表紙）
// settings は丸ごと上書き保存なので、端末が bundleCovers を持たない/古い状態で送ると表紙が消える。
// 墓標と同様に、保存済みと送信分をキーごとにマージする（クライアントの mergeBundleCovers/pickCover と同じ規則）
async function fetchStoredBundleCovers() {
  const rows = await sbFetch('app_settings?select=b:data->bundleCovers&id=eq.default');
  const b = Array.isArray(rows) && rows[0] ? rows[0].b : null;
  return (b && typeof b === 'object' && !Array.isArray(b)) ? b : {};
}
const COVER_RANK = { manual: 3, splitOrigin: 2, firstMember: 1 };
function pickCover(a, b) {
  if (!a) return b;
  if (!b) return a;
  const ra = COVER_RANK[a.source] || 0, rb = COVER_RANK[b.source] || 0;
  let w = a, l = b;
  if (ra !== rb) { if (rb > ra) { w = b; l = a; } }
  else {
    const ta = Date.parse(a.setAt) || 0, tb = Date.parse(b.setAt) || 0;
    if (a.source === 'manual' ? tb > ta : tb < ta) { w = b; l = a; }
  }
  if (!w.thumbDataUrl && l.thumbDataUrl && l.photoId === w.photoId) return { ...w, thumbDataUrl: l.thumbDataUrl };
  return w;
}
function mergeBundleCovers(a, b) {
  const out = {};
  for (const k of new Set([...Object.keys(a || {}), ...Object.keys(b || {})])) {
    const v = pickCover((a || {})[k], (b || {})[k]);
    if (v) out[k] = v;
  }
  return out;
}

// ★ 古い端末の状態でクラウドの新しいデータを上書きしないためのガード
// - 保存済みより古い（updatedAt/createdAt が小さい）行は書かない
// - 墓標（削除済み）にあるIDは書かない
// 戻り値: { rows: 書いてよい行, skipped: 破棄したID }
// ガード自体が失敗したら全件書く（保存をブロックしない）
async function guardRows(table, rows, tombstones, skipped) {
  if (!rows?.length) return rows;
  try {
    const stored = await fetchStoredStamps(table, rows.map(r => r.id));
    return rows.filter(r => {
      if (tombstones && Object.prototype.hasOwnProperty.call(tombstones, r.id)) { skipped.push(r.id); return false; }
      const st = stored.get(r.id);
      if (st && tsOf(r.data) < tsOf(st)) { skipped.push(r.id); return false; }
      return true;
    });
  } catch(e) {
    console.warn(`[api/data] ${table} の古い書き込みガードに失敗（全件保存します）:`, e.message);
    return rows;
  }
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

      const skipped = [];

      // ★ 古い書き込みガード（墓標 + updatedAt 比較）
      // 取得に失敗したら従来どおり全件書く
      let tombstones = null;
      if (invUpsert?.length || salesUpsert?.length || settings !== undefined) {
        try { tombstones = await fetchStoredTombstones(); }
        catch(e) { console.warn('[api/data] 墓標の取得に失敗（ガードなしで続行）:', e.message); }
      }
      const guardedInv   = await guardRows('inventory', invUpsert, tombstones, skipped);
      const guardedSales = await guardRows('sales', salesUpsert, tombstones, skipped);

      // ★ 写真base64の消失防止
      // light モードで受け取ったデータをそのまま書き戻すと、保存済みの
      // thumbDataUrl / medDataUrl（写真の3重バックアップの1つ）が消えてしまう。
      // base64が欠けている写真は、保存済みの値をサーバー側で埋め直す。
      const invRows = await preservePhotoData(guardedInv);
      const salesRows = guardedSales;

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
      if (salesRows?.length)
        ops.push(sbFetch('sales', {
          method: 'POST',
          headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(salesRows),
        }));
      if (salesDelete?.length) {
        const ids = salesDelete.map(id => `"${id}"`).join(',');
        ops.push(sbFetch(`sales?id=in.(${ids})`, { method: 'DELETE' }));
      }
      if (settings !== undefined) {
        // ★ 墓標(_deletedIds)は保存済みと送信分の和集合にする（クライアントが消せないように）
        // 墓標を取得できなかった場合は従来どおりそのまま書く
        let settingsData = settings;
        if (tombstones && settings && typeof settings === 'object') {
          const merged = mergeTombstones(tombstones, settings._deletedIds);
          if (Object.keys(merged).length) settingsData = { ...settings, _deletedIds: merged };
        }
        // ★ 表紙(bundleCovers)も保存済みとキーごとにマージ（取得に失敗したら送信分のまま）
        if (settingsData && typeof settingsData === 'object') {
          try {
            const storedCovers = await fetchStoredBundleCovers();
            const mc = mergeBundleCovers(storedCovers, settingsData.bundleCovers);
            if (Object.keys(mc).length) settingsData = { ...settingsData, bundleCovers: mc };
          } catch(e) { console.warn('[api/data] bundleCovers の取得に失敗（マージなしで続行）:', e.message); }
        }
        ops.push(sbFetch('app_settings', {
          method: 'POST',
          headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify([{ id: 'default', data: settingsData }]),
        }));
      }
      // ★ レシートを保存（list 全体を上書き保存）
      if (receipts !== undefined)
        ops.push(sbFetch('app_settings', {
          method: 'POST',
          headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify([{ id: 'receipts', data: { list: receipts } }]),
        }));

      await Promise.all(ops);
      if (skipped.length) console.warn(`[api/data] 古い/削除済みの書き込みを ${skipped.length} 件スキップ:`, skipped.slice(0, 20).join(','));
      res.json({ ok: true, skipped });

    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch(e) {
    console.error('[api/data] error:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
}
