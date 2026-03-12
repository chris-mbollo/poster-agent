export const config = { runtime: 'edge' };

export default async function handler(req) {
  try {
    const KV_URL = process.env.KV_REST_API_URL;
    const KV_TOKEN = process.env.KV_REST_API_TOKEN;

    if (!KV_URL || !KV_TOKEN) {
      return new Response(JSON.stringify({ error: 'KV not configured' }), { status: 500 });
    }

    // Get history list from Brand Gap Agent (same Redis, same key format)
    const listRes = await fetch(`${KV_URL}/get/brandgap:history`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` }
    });
    const listData = await listRes.json();

    if (!listData.result) {
      return new Response(JSON.stringify({ error: 'NO_DATA', message: 'No Brand Gap runs found. Run the Brand Gap Agent first.' }), { status: 404 });
    }

    const history = JSON.parse(listData.result);
    if (!history || history.length === 0) {
      return new Response(JSON.stringify({ error: 'NO_DATA', message: 'No Brand Gap runs found. Run the Brand Gap Agent first.' }), { status: 404 });
    }

    // Get the most recent run
    const latest = history[0];

    // Fetch the full run data
    const runRes = await fetch(`${KV_URL}/get/brandgap:run:${latest.id}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` }
    });
    const runData = await runRes.json();

    if (!runData.result) {
      // Try alternative key format
      const altRes = await fetch(`${KV_URL}/get/${latest.id}`, {
        headers: { Authorization: `Bearer ${KV_TOKEN}` }
      });
      const altData = await altRes.json();
      if (!altData.result) {
        return new Response(JSON.stringify({ error: 'NO_DATA', message: 'Run data not found in Redis.' }), { status: 404 });
      }
      const parsed = JSON.parse(altData.result);
      return new Response(JSON.stringify({ success: true, run: parsed, runId: latest.id }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const run = JSON.parse(runData.result);
    return new Response(JSON.stringify({ success: true, run, runId: latest.id }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
