const https = require('https');

module.exports = async function (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method Not Allowed' }); return; }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'RESEND_API_KEY not configured' }); return; }

  const { to, toName, subject, body, fromName } = req.body;
  if (!to || !body) { res.status(400).json({ error: 'Missing required fields: to, body' }); return; }

  const html = `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"></head>
  <body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px;margin:0;">
    <div style="max-width:560px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
      <div style="background:#0D2B1F;padding:24px 32px;display:flex;align-items:center;gap:12px;">
        <div>
          <div style="color:#C9A84C;font-size:18px;font-weight:700;letter-spacing:0.5px;">PC Homecare</div>
          <div style="color:rgba(255,255,255,0.7);font-size:12px;margin-top:2px;">Prospering Citizen Home Care Services</div>
        </div>
      </div>
      <div style="padding:32px;">
        <p style="color:#555;font-size:15px;margin:0 0 8px;">Hi ${toName || 'there'},</p>
        <p style="color:#555;font-size:15px;margin:0 0 24px;">You have a new message from your agency manager:</p>
        <div style="background:#f8f9fa;border-left:4px solid #0D2B1F;border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:24px;">
          <p style="color:#333;font-size:15px;line-height:1.7;margin:0;white-space:pre-wrap;">${body}</p>
        </div>
        <p style="color:#888;font-size:13px;margin:0 0 4px;">— ${fromName || 'PC Homecare Management'}</p>
        <p style="color:#aaa;font-size:12px;margin:0;">703-414-9213 · fitsum@pchomecareservices.com</p>
      </div>
      <div style="background:#f8f9fa;padding:16px 32px;border-top:1px solid #eee;">
        <p style="color:#aaa;font-size:11px;margin:0;text-align:center;">
          PC Homecare · Fairfax County, Virginia ·
          <a href="https://pchomecareservices.com" style="color:#C9A84C;">pchomecareservices.com</a>
        </p>
      </div>
    </div>
  </body>
  </html>`;

  const payload = JSON.stringify({
    from: 'PC Homecare <noreply@pchomecareservices.com>',
    to: [to],
    subject: subject || 'New message from PC Homecare',
    html,
    text: body,
  });

  return new Promise((resolve) => {
    const apiReq = https.request({
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (apiRes) => {
      let data = '';
      apiRes.on('data', c => data += c);
      apiRes.on('end', () => {
        const parsed = JSON.parse(data);
        if (apiRes.statusCode >= 400) {
          res.status(apiRes.statusCode).json({ error: parsed.message || 'Email send failed' });
        } else {
          res.status(200).json({ success: true, id: parsed.id });
        }
        resolve();
      });
    });
    apiReq.on('error', err => { res.status(502).json({ error: err.message }); resolve(); });
    apiReq.write(payload);
    apiReq.end();
  });
};
