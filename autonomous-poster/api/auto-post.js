import crypto from 'crypto';

export const config = { runtime: 'edge' };

// ── TWITTER OAUTH ─────────────────────────────────────────────────────────────
function oauthSign(method, url, params, consumerSecret, tokenSecret) {
  const sortedParams = Object.keys(params).sort().map(k =>
    `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`
  ).join('&');
  const baseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  return crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');
}

function buildAuthHeader(params) {
  const header = Object.keys(params).sort().map(k =>
    `${encodeURIComponent(k)}="${encodeURIComponent(params[k])}"`
  ).join(', ');
  return `OAuth ${header}`;
}

async function postToTwitter(text) {
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
    throw new Error('Twitter API credentials not configured');
  }

  const url = 'https://api.twitter.com/2/tweets';
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString('hex');

  const oauthParams = {
    oauth_consumer_key: apiKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: accessToken,
    oauth_version: '1.0',
  };

  const signature = oauthSign('POST', url, oauthParams, apiSecret, accessTokenSecret);
  const authHeader = buildAuthHeader({ ...oauthParams, oauth_signature: signature });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.detail || data?.title || JSON.stringify(data));
  return data;
}

async function postToReddit(title, body, subreddit) {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  const username = process.env.REDDIT_USERNAME;
  const password = process.env.REDDIT_PASSWORD;

  if (!clientId || !clientSecret || !username || !password) {
    throw new Error('Reddit credentials not configured — skipping Reddit post');
  }

  // Get Reddit access token
  const tokenRes = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'BrandGapPoster/1.0'
    },
    body: `grant_type=password&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error('Reddit auth failed');

  // Submit post
  const submitRes = await fetch('https://oauth.reddit.com/api/submit', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokenData.access_token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'BrandGapPoster/1.0'
    },
    body: new URLSearchParams({
      sr: subreddit,
      kind: 'self',
      title,
      text: body,
      nsfw: 'false',
      spoiler: 'false'
    })
  });

  const submitData = await submitRes.json();
  if (submitData.json?.errors?.length > 0) throw new Error(submitData.json.errors[0][1]);
  return submitData;
}

// ── CLAUDE POST GENERATOR ─────────────────────────────────────────────────────
async function generatePost(platform, postType, brandData) {
  const gap = brandData?.results?.gap;
  const brand = brandData?.results?.brand;
  const validate = brandData?.results?.validate;
  const avatar = brandData?.results?.avatar;
  const mine = brandData?.results?.mine;
  const market = brandData?.market || 'Unknown Market';

  // ── X PROMPT ────────────────────────────────────────────────────────────────
  const xSystemPrompt = `You are a high-converting X/Twitter content writer for Chris Mbollo (@SeyiMbollo), a solo AI agent developer based in Hong Kong who builds and sells practical AI agents to individual consumers.

Chris builds AI agents that save time, automate personal workflows, solve daily frustrations, or generate income. He promotes these on X using authentic #buildinpublic energy — grounded, excited, never hype-heavy or salesy. He never uses emojis. Every post ends with "@SeyiMbollo — Chris Mbollo".

Return ONLY the post text. No labels, no quotes, no explanation.`;

  const xUserPrompt = `You are writing an X post for Chris about the Brand Gap Agent — an AI agent he built that finds unbranded product gaps in any market, builds a complete brand identity, and delivers everything a founder needs to launch in under 10 minutes. No agency. No research. No guessing.

The benchmark: one person used this exact method (Pilates socks in fitness) and made $2.71M in 30 days.

REAL DATA FROM THE LATEST RUN — use these exact numbers and names, do not invent anything:
- Market: ${market}
- Product gap found: ${gap?.winnerProduct}
- Sub-community: ${gap?.winnerSubCommunity}
- Brand name generated: ${brand?.winner}
- Tagline: "${brand?.tagline}"
- Gap score: ${gap?.gapScore}/10
- Brand saturation: ${gap?.brandSaturation}
- Market size: ${gap?.parentMarketSize}
- Trend status: ${validate?.trendStatus}
- Window of opportunity: ${validate?.windowOfOpportunity}
- Gross margin potential: ${validate?.grossMarginPotential}
- Suggested retail price: ${validate?.suggestedRetailPrice}
- Real community quote: "${mine?.keyQuotes?.[0] || ''}"
- Tribe: ${avatar?.tribeLabel} — "${avatar?.tribalEssence}"

POST TYPE: ${postType}

${postType === 'gap_reveal' ? `Show the gap the agent just found. Lead with the product and market. Make the reader feel they just saw something obvious they missed. Use the real gap score, saturation level, and window. No pitch. Let the data do the talking.` : ''}
${postType === 'benchmark' ? `Tell the $2.71M story. Pilates socks. Same market, same spend, zero brand ownership. Connect it to what the agent just found in ${market}. Build desire without selling.` : ''}
${postType === 'engagement' ? `Ask the reader to drop a market in the replies. Say you will tell them if there is an unbranded gap worth building. Conversational. No pitch. Make it feel like a genuine offer from a founder.` : ''}
${postType === 'insight' ? `Teach the brand gap concept. Most founders look for products — the real move is finding tribes with no brand. Use ${gap?.winnerSubCommunity} as a subtle example. No direct sell.` : ''}
${postType === 'social_proof' ? `You have run Brand Sprints across multiple markets. Reference ${market} as one example. Grounded, not boastful. Authentic solo builder tone.` : ''}
${postType === 'window' ? `The gap window closes. ${validate?.windowOfOpportunity} is all there is before saturation. Make it feel like a countdown. Reference ${market} and ${gap?.winnerProduct}.` : ''}

CONSTRAINTS:
- Hard max 280 characters
- No emojis. Ever.
- No corporate language. No "revolutionary", "game-changing", "cutting-edge"
- Authentic solo builder tone. Use "I" language
- Occasional hashtags only if natural: #AIagents #buildinpublic — never forced
- End every post with: @SeyiMbollo — Chris Mbollo

Return ONLY the post text. Nothing else.`;

  // ── REDDIT PROMPT ────────────────────────────────────────────────────────────
  const redditSystemPrompt = `You are writing Reddit posts for Chris Mbollo, a solo AI agent developer. Chris shares genuine insights about finding unbranded product gaps. Never pitch or sell on Reddit — provide real value only. Return ONLY raw JSON with no markdown or backticks. Format: {"title": "...", "body": "...", "subreddit": "..."}`;

  const redditUserPrompt = `Write a Reddit post for Chris about finding unbranded product gaps using real data.

REAL DATA FROM THE LATEST RUN:
- Market: ${market}
- Product gap: ${gap?.winnerProduct}
- Sub-community: ${gap?.winnerSubCommunity}
- Gap score: ${gap?.gapScore}/10
- Saturation: ${gap?.brandSaturation}
- Market size: ${gap?.parentMarketSize}
- Window: ${validate?.windowOfOpportunity}

${postType === 'value_post' ? `Write a value post for r/entrepreneur. Use the "Pilates socks" framework — find where people spend money but no brand owns the space. Use the ${market} example of ${gap?.winnerProduct} in ${gap?.winnerSubCommunity} as a real case study. DO NOT pitch or sell. Teach the method genuinely. Ask a question at the end to invite discussion.` : ''}
${postType === 'question_post' ? `Write a post for r/ecommerce sharing a product validation method using Reddit discussions, YouTube transcripts, and Google Trends together to find unbranded gaps. Use the ${market} example. Ask what others validation processes look like. Sound like a real founder sharing learnings, not promoting a tool.` : ''}

Return ONLY raw JSON: {"title": "...", "body": "...", "subreddit": "..."}`;

  const systemPrompt = platform === 'reddit' ? redditSystemPrompt : xSystemPrompt;
  const userPrompt = platform === 'reddit' ? redditUserPrompt : xUserPrompt;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  const data = await res.json();
  const raw = data.content?.[0]?.text?.trim() || '';

  if (platform === 'reddit') {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Reddit post generation failed — no JSON');
    return JSON.parse(jsonMatch[0]);
  }

  return { text: raw.slice(0, 280) };
}

// ── KV HELPERS ────────────────────────────────────────────────────────────────
async function kvGet(key) {
  const res = await fetch(`${process.env.KV_REST_API_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` }
  });
  const data = await res.json();
  return data.result ? JSON.parse(data.result) : null;
}

async function kvSet(key, value) {
  await fetch(`${process.env.KV_REST_API_URL}/set/${key}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(value)
  });
}

// ── POST ROTATION ─────────────────────────────────────────────────────────────
const X_POST_TYPES = ['gap_reveal', 'benchmark', 'engagement', 'insight', 'social_proof', 'window', 'gap_reveal', 'benchmark'];
const REDDIT_POST_TYPES = ['value_post', 'question_post'];

// ── MAIN HANDLER ─────────────────────────────────────────────────────────────
export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { platform, postType, brandData, generateOnly } = await req.json();

    if (!brandData) {
      return new Response(JSON.stringify({ error: 'No brand data provided' }), { status: 400 });
    }

    // Generate the post content
    const generated = await generatePost(platform, postType, brandData);

    // If generateOnly — return without posting
    if (generateOnly) {
      return new Response(JSON.stringify({ success: true, generated }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Post it
    let result = {};
    if (platform === 'x') {
      const text = generated.text;
      if (!text || text.length === 0) throw new Error('Generated post is empty');
      result = await postToTwitter(text);
      result.postedText = text;
      result.platform = 'x';
    } else if (platform === 'reddit') {
      result = await postToReddit(generated.title, generated.body, generated.subreddit);
      result.postedTitle = generated.title;
      result.platform = 'reddit';
    }

    // Log to history
    const log = await kvGet('poster:log') || [];
    log.unshift({
      id: Date.now().toString(),
      platform,
      postType,
      content: generated,
      postedAt: new Date().toISOString(),
      tweetId: result.data?.id,
      market: brandData.market,
      product: brandData.results?.gap?.winnerProduct,
    });
    await kvSet('poster:log', JSON.stringify(log.slice(0, 100)));

    return new Response(JSON.stringify({ success: true, result, generated }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
