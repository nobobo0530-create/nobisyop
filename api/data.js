// /api/data – サーバーサイドSupabaseプロキシ
// クライアントはSupabaseに直接アクセスしない構造にすることで
// iOS Safari の CORS / Load failed 問題を完全に解消する

const SB_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SB_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  if (!SB_URL || !SB_KEY) {
    res.status(500).json({ ok: false, error: 'Supabase env vars not set on server' });
    return;
  }

  try {
    // ── GET: 全データ取得 ──────────────────────────────────────
    if (req.method === 'GET') {
      const [inv, sales] = await Promise.all([
        sbFetch('inventory?select=id,data,created_at&order=created_at.asc'),
        sbFetch('sales?select=id,data,created_at&order=created_at.asc'),
      ]);
      const cfg = await sbFetch('app_settings?select=data&id=eq.default', {
        headers: { 'Accept': 'application/vnd.pgrst.object+json' },
      }).catch(() => null);

      res.json({
        ok: true,
        inventory: (Array.isArray(inv)   ? inv   : []).map(r => ({ ...r.data, id: r.id })),
        sales:     (Array.isArray(sales) ? sales : []).map(r => ({ ...r.data, id: r.id })),
        settings:  cfg?.data || null,
      });

    // ── POST: 差分保存（upsert / delete）──────────────────────
    } else if (req.method === 'POST') {
      const { invUpsert, invDelete, salesUpsert, salesDelete, settings } = req.body || {};
      const ops = [];

      if (invUpsert?.length)
        ops.push(sbFetch('inventory', {
          method: 'POST',
          headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(invUpsert),
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
