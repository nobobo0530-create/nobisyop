// Vercel Serverless Function
// Supabase の URL と公開キーをフロントエンドに渡す
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    supabaseUrl: process.env.SUPABASE_URL  || '',
    supabaseKey: process.env.SUPABASE_ANON_KEY || '',
  });
}
