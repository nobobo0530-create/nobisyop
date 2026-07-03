// /api/ping – Supabase keep-alive
// Supabase無料プランは7日間アクセスがないとプロジェクトが自動停止するため、
// Vercel Cron（vercel.json の crons 設定）から毎日呼び出して軽いクエリを実行する。
// 認証不要（データを返さない・DBに触れるだけ）

const SB_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SB_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (!SB_URL || !SB_KEY) {
    res.status(500).json({ ok: false, error: 'Supabase env vars not set' });
    return;
  }

  try {
    // 最小限のクエリ（1行だけ・idカラムのみ）でDBを起こしておく
    const resp = await fetch(`${SB_URL}/rest/v1/app_settings?select=id&limit=1`, {
      headers: {
        'apikey': SB_KEY,
        'Authorization': `Bearer ${SB_KEY}`,
      },
    });
    res.status(200).json({ ok: resp.ok, status: resp.status, at: new Date().toISOString() });
  } catch (e) {
    console.error('[api/ping] error:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
}
