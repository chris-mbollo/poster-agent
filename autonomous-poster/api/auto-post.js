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
  const content = brandData?.results?.content;
  const market = brandData?.market || 'Unknown Market';

  const context = `
BRAND GAP DATA (use these real numbers and names):
- Market: ${market}
- Product: ${gap?.winnerProduct}
- Sub-community: ${gap?.winnerSubCommunity}
- Brand name: ${brand?.winner}
- Tagline: "${brand?.tagline}"
- Gap score: ${gap?.gapScore}/10
- Brand saturation: ${gap?.brandSaturation}
- Market size: ${gap?.parentMarketSize}
- Trend status: ${validate?.trendStatus}
- Window of opportunity: ${validate?.windowOfOpportunity}
- Tribe: ${avatar?.tribeLabel} — "${avatar?.tribalEssence}"
- Pain point: ${avatar?.painPoint}
- Why this gap: ${gap?.whyThisGap}
- Suggested retail price: ${validate?.suggestedRetailPrice}
- Gross margin: ${validate?.grossMarginPotential}
- Key quote from community: "${brandData?.results?.mine?.keyQuotes?.[0]}"
- Viral hook: ${content?.viralScripts?.[0]?.hook_0_3s}
`;

  const postFormulas = {
    x: {
      benchmark: `Write a punchy X (Twitter) post under 280 characters about how a single unbranded product gap became $2.71M in 30 days. Reference the Pilates socks example. End with a hook about the Brand Sprint finding gaps in 8 minutes. Sound like a founder, not a marketer. No hashtags. No emojis unless one is truly impactful.`,

      gap_reveal: `Write a punchy X post under 280 characters revealing that you found a brand gap in the ${market} market. Mention ${gap?.winnerSubCommunity} and ${gap?.winnerProduct}. Reference the gap score (${gap?.gapScore}/10) and saturation (${gap?.brandSaturation}). Don't pitch — let the data speak. Make the reader feel like they just missed something obvious.`,

      engagement: `Write an engagement X post under 280 characters asking people to drop a market in the replies. Say you'll tell them if there's an unbranded gap worth building. Keep it conversational and direct. No hashtags.`,

      social_proof: `Write an X post under 280 characters showing social proof. Mention you've done Brand Sprints across multiple markets. Reference the ${market} gap as one example. Keep it punchy. End with DM CTA.`,

      insight: `Write an insight X post under 280 characters about the brand gap concept — why most founders look for products when they should look for tribes without brands. Use ${gap?.winnerSubCommunity} as a subtle example. No direct pitch.`,

      window: `Write an urgent X post under 280 characters about the window of opportunity for unbranded gaps. Reference that ${validate?.windowOfOpportunity} is all you have before saturation. Make it feel like a countdown. Mention the ${market} market.`,
    },
    reddit: {
      value_post: `Write a Reddit post for r/entrepreneur that provides genuine value about finding unbranded product gaps. Use the "Pilates socks" framework — find where people spend money but no brand owns the space. Include the ${market} example of ${gap?.winnerProduct} in ${gap?.winnerSubCommunity} as a real case study. DO NOT pitch or sell. Ask a question at the end to invite discussion. Return JSON: {"title": "...", "body": "...", "subreddit": "entrepreneur"}`,

      question_post: `Write a Reddit post for r/ecommerce asking about product validation processes. Share that you've been testing a method using Reddit discussions, YouTube transcripts, and Google Trends triangulation together to find gaps. Use the ${market} example. Ask what others' validation processes look like. Sound like a real founder sharing learnings. Return JSON: {"title": "...", "body": "...", "subreddit": "ecommerce"}`,
    }
  };

  const systemPrompt = platform === 'reddit'
    ? `You are a founder who has built a brand research system. Share genuine insights about finding unbranded product gaps. Never pitch directly on Reddit — provide value first. Return ONLY raw JSON with no markdown or backticks.`
    : `You are a founder posting on X (Twitter). Write posts that feel human, direct, and specific. Use real data when available. Sound like a founder who found something real, not a marketer selling something. Return ONLY the post text with no quotes around it.`;

  const userPrompt = `${context}\n\n${postFormulas[platform]?.[postType] || postFormulas[platform]?.benchmark || ''}`;

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
    const { platform, postType, brandData } = await req.json();

    if (!brandData) {
      return new Response(JSON.stringify({ error: 'No brand data provided' }), { status: 400 });
    }

    // Generate the post content
    const generated = await generatePost(platform, postType, brandData);

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
