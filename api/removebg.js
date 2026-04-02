// /api/removebg – Remove.bg APIプロキシ
// クライアントから画像base64+APIキーを受け取り、remove.bgにリレー
// CORS問題と大きなリクエストサイズに対応

export const config = {
  api: { bodyParser: { sizeLimit: '15mb' } },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    const { imageBase64, apiKey } = req.body || {};
    if (!imageBase64 || !apiKey) {
      return res.status(400).json({ error: 'imageBase64 と apiKey が必要です' });
    }

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_file_b64: imageBase64,
        size: 'auto',
        format: 'png',
      }),
    });

    if (!response.ok) {
      let errMsg = `HTTP ${response.status}`;
      try {
        const errData = await response.json();
        errMsg = errData.errors?.[0]?.title || errMsg;
      } catch (_) {}
      return res.status(response.status).json({ error: errMsg });
    }

    const resultBuffer = await response.arrayBuffer();
    const resultBase64 = Buffer.from(resultBuffer).toString('base64');

    res.json({ ok: true, imageBase64: resultBase64 });
  } catch (e) {
    console.error('[api/removebg] error:', e.message);
    res.status(500).json({ error: e.message });
  }
}
