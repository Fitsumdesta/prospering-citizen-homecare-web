const https = require('https');

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = 'xwhejuvgqfwbwpakxktx.supabase.co';

  if (!serviceKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server config missing' }) };
  }

  let body;
  try { body = JSON.parse(event.body); } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { full_name, email, phone } = body;
  if (!full_name) return { statusCode: 400, body: JSON.stringify({ error: 'full_name is required' }) };

  // Simple readable temp password
  const tempPassword = 'PCHome2026!';
  const caregiverEmail = email && email.trim() !== ''
    ? email.trim()
    : full_name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '') + '@pchomecareservices.com';

  // Step 1: Create auth user
  const createUser = await supabaseRequest(supabaseUrl, serviceKey, 'POST', '/auth/v1/admin/users', {
    email: caregiverEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name },
  });

  if (createUser.error) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: createUser.error.message || 'Failed to create user' }),
    };
  }

  const userId = createUser.data.id;

  // Step 2: Wait for trigger to create the profile row, then UPSERT
  await delay(800);

  await supabaseRequest(supabaseUrl, serviceKey, 'POST', '/rest/v1/profiles', {
    id: userId,
    full_name,
    role: 'caregiver',
    phone: phone || null,
  }, { 'Prefer': 'resolution=merge-duplicates,return=minimal' });

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({
      success: true,
      email: caregiverEmail,
      temp_password: tempPassword,
      id: userId,
    }),
  };
};

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function supabaseRequest(host, serviceKey, method, path, payload, extraHeaders = {}) {
  return new Promise((resolve) => {
    const data = JSON.stringify(payload);
    const req = https.request({
      hostname: host,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Length': Buffer.byteLength(data),
        ...extraHeaders,
      },
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve({ data: JSON.parse(body), error: res.statusCode >= 400 ? JSON.parse(body) : null }); }
        catch { resolve({ data: body, error: null }); }
      });
    });
    req.on('error', err => resolve({ data: null, error: { message: err.message } }));
    req.write(data);
    req.end();
  });
}
