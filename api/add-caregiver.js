const https = require('https');

module.exports = async function (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method Not Allowed' }); return; }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = 'xwhejuvgqfwbwpakxktx.supabase.co';
  if (!serviceKey) { res.status(500).json({ error: 'Server config missing' }); return; }

  const { full_name, email, phone, address } = req.body;
  if (!full_name) { res.status(400).json({ error: 'Full name is required' }); return; }
  if (!email || !email.trim()) { res.status(400).json({ error: 'Email address is required so the caregiver can log in' }); return; }

  const caregiverEmail = email.trim().toLowerCase();
  const tempPassword = 'PCHome2026!';

  // Step 1: Create auth user
  const createUser = await supabaseRequest(supabaseUrl, serviceKey, 'POST', '/auth/v1/admin/users', {
    email: caregiverEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name },
  });

  if (createUser.error) {
    const msg = createUser.error.message || JSON.stringify(createUser.error);
    res.status(400).json({ error: msg });
    return;
  }

  const userId = createUser.data.id;

  // Step 2: Wait for trigger to create profile row
  await delay(1000);

  // Step 3: UPSERT profile with caregiver role
  const upsert = await supabaseRequest(supabaseUrl, serviceKey, 'POST', '/rest/v1/profiles', {
    id: userId,
    full_name,
    role: 'caregiver',
    phone: phone || null,
    address: address || null,
    email: caregiverEmail,
  }, { 'Prefer': 'resolution=merge-duplicates,return=minimal' });

  // Step 4: PATCH as fallback to guarantee role is set
  await supabaseRequest(supabaseUrl, serviceKey, 'PATCH',
    '/rest/v1/profiles?id=eq.' + userId,
    { role: 'caregiver', full_name, email: caregiverEmail },
    { 'Prefer': 'return=minimal' }
  );

  res.status(200).json({
    success: true,
    email: caregiverEmail,
    temp_password: tempPassword,
    id: userId,
  });
};

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function supabaseRequest(host, serviceKey, method, path, payload, extraHeaders = {}) {
  return new Promise((resolve) => {
    const data = JSON.stringify(payload);
    const apiReq = https.request({
      hostname: host, path, method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Length': Buffer.byteLength(data),
        ...extraHeaders,
      },
    }, (apiRes) => {
      let body = '';
      apiRes.on('data', c => body += c);
      apiRes.on('end', () => {
        try { resolve({ data: JSON.parse(body), error: apiRes.statusCode >= 400 ? JSON.parse(body) : null }); }
        catch { resolve({ data: body, error: null }); }
      });
    });
    apiReq.on('error', err => resolve({ data: null, error: { message: err.message } }));
    apiReq.write(data);
    apiReq.end();
  });
}
