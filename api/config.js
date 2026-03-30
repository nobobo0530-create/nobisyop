// Vercel Serverless Function
// Supabase の URL と公開キーをフロントエンドに渡す
// 環境変数名のゆらぎ（NEXT_PUBLIC_ prefix あり・なし）を両方サポート
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    '';

  const supabaseKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_KEY ||
    '';

  // デバッグ用：どの変数から取得できたかをログに残す（値は出さない）
  console.log('[config] url_source:',
    process.env.SUPABASE_URL ? 'SUPABASE_URL' :
    process.env.NEXT_PUBLIC_SUPABASE_URL ? 'NEXT_PUBLIC_SUPABASE_URL' : 'none');
  console.log('[config] key_source:',
    process.env.SUPABASE_ANON_KEY ? 'SUPABASE_ANON_KEY' :
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'NEXT_PUBLIC_SUPABASE_ANON_KEY' :
    process.env.SUPABASE_KEY ? 'SUPABASE_KEY' :
    process.env.NEXT_PUBLIC_SUPABASE_KEY ? 'NEXT_PUBLIC_SUPABASE_KEY' : 'none');
  console.log('[config] url_length:', supabaseUrl.length, '  key_length:', supabaseKey.length);

  res.json({ supabaseUrl, supabaseKey });
}
