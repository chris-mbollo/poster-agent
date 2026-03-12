export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { platform, postType, generateOnly } = await req.json();
    const base = `https://${process.env.VERCEL_URL}`;

    // Fetch latest brand data
    const brandDataRes = await fetch(`${base}/api/brand-data`);
    if (!brandDataRes.ok) {
      const err = await brandDataRes.json();
      return new Response(JSON.stringify({ error: err.error || 'No brand data', message: err.message }), { status: 400 });
    }
    const { run: brandData } = await brandDataRes.json();

    // If generateOnly — just generate and return, don't post
    if (generateOnly) {
      const postRes = await fetch(`${base}/api/auto-post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, postType, brandData, generateOnly: true })
      });
      const result = await postRes.json();
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Fire the post
    const postRes = await fetch(`${base}/api/auto-post`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform, postType, brandData })
    });
    const result = await postRes.json();
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
