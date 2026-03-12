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

// Best posting times (UTC)
// X: 9am, 12pm, 5pm, 8pm (EST = UTC+5 → 14, 17, 22, 01)
// Reddit: 8am, 7pm EST = 13, 00 UTC
const X_SCHEDULE_HOURS_UTC = [14, 17, 22, 1];
const REDDIT_SCHEDULE_HOURS_UTC = [13, 0];

const X_POST_ROTATION = ['gap_reveal', 'benchmark', 'engagement', 'insight', 'social_proof', 'window', 'gap_reveal', 'benchmark'];
const REDDIT_POST_ROTATION = ['value_post', 'question_post', 'value_post'];

export default async function handler(req) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const base = `https://${process.env.VERCEL_URL}`;
  const now = new Date();
  const currentHour = now.getUTCHours();

  try {
    // Check if automation is ON
    const settings = await kvGet('poster:settings');
    if (!settings?.active) {
      return new Response(JSON.stringify({ message: 'Automation is OFF — nothing posted' }), { status: 200 });
    }

    // Fetch brand data
    const brandDataRes = await fetch(`${base}/api/brand-data`);
    if (!brandDataRes.ok) {
      const err = await brandDataRes.json();
      // Stop automation if no brand data
      if (err.error === 'NO_DATA') {
        await kvSet('poster:settings', JSON.stringify({ ...settings, active: false, stoppedReason: 'No Brand Gap data found' }));
        return new Response(JSON.stringify({ message: 'STOPPED — No brand data. Run the Brand Gap Agent first.' }), { status: 200 });
      }
      return new Response(JSON.stringify({ error: err.error }), { status: 500 });
    }
    const { run: brandData } = await brandDataRes.json();

    const results = [];

    // Post to X if this is an X posting hour
    if (X_SCHEDULE_HOURS_UTC.includes(currentHour) && settings.platforms?.includes('x')) {
      const xLog = await kvGet('poster:log') || [];
      const xPosts = xLog.filter(l => l.platform === 'x');
      const xRotationIndex = xPosts.length % X_POST_ROTATION.length;
      const postType = X_POST_ROTATION[xRotationIndex];

      const postRes = await fetch(`${base}/api/auto-post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'x', postType, brandData })
      });
      const postData = await postRes.json();
      results.push({ platform: 'x', postType, success: postData.success, error: postData.error });
    }

    // Post to Reddit if this is a Reddit posting hour
    if (REDDIT_SCHEDULE_HOURS_UTC.includes(currentHour) && settings.platforms?.includes('reddit')) {
      const log = await kvGet('poster:log') || [];
      const redditPosts = log.filter(l => l.platform === 'reddit');
      const rotationIndex = redditPosts.length % REDDIT_POST_ROTATION.length;
      const postType = REDDIT_POST_ROTATION[rotationIndex];

      const postRes = await fetch(`${base}/api/auto-post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'reddit', postType, brandData })
      });
      const postData = await postRes.json();
      results.push({ platform: 'reddit', postType, success: postData.success, error: postData.error });
    }

    if (results.length === 0) {
      return new Response(JSON.stringify({ message: `Hour ${currentHour} UTC — no posts scheduled for this time` }), { status: 200 });
    }

    return new Response(JSON.stringify({ success: true, results }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
