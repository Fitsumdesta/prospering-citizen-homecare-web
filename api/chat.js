const https = require('https');

module.exports = async function (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method Not Allowed' }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' }); return; }

  const body = req.body;
  const payload = JSON.stringify({
    model: 'claude-sonnet-4-6',
    max_tokens: Math.min(body.max_tokens || 1000, 1000),
    system: body.system || '',
    messages: body.messages || [],
  });

  return new Promise((resolve) => {
    const apiReq = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (apiRes) => {
      let data = '';
      apiRes.on('data', c => data += c);
      apiRes.on('end', () => {
        res.status(apiRes.statusCode).json(JSON.parse(data));
        resolve();
      });
    });
    apiReq.on('error', (err) => { res.status(502).json({ error: err.message }); resolve(); });
    apiReq.write(payload);
    apiReq.end();
  });
};
