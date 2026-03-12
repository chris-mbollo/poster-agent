export const config = { runtime: 'edge' };

async function kvGet(key) {
  try {
    const res = await fetch(`${process.env.KV_REST_API_URL}/get/${key}`, {
      headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` }
    });
    const data = await res.json();
    return data.result ? JSON.parse(data.result) : null;
  } catch { return null; }
}

async function kvSet(key, value) {
  await fetch(`${process.env.KV_REST_API_URL}/set/${key}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(value)
  });
}

export default async function handler(req) {
  if (req.method === 'GET') {
    const settings = await kvGet('poster:settings') || { active: false, platforms: ['x'] };
    const log = await kvGet('poster:log') || [];
    return new Response(JSON.stringify({ settings, log }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  if (req.method === 'POST') {
    const body = await req.json();
    const current = await kvGet('poster:settings') || { active: false, platforms: ['x'] };
    const updated = { ...current, ...body, updatedAt: new Date().toISOString() };
    await kvSet('poster:settings', JSON.stringify(updated));
    return new Response(JSON.stringify({ success: true, settings: updated }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
}
