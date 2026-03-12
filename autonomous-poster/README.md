# Brand Gap Poster Agent

Fully autonomous posting system for X (Twitter) and Reddit. Reads from the Brand Gap Agent's Redis KV, generates high-converting posts using Claude, posts on a schedule. One START/STOP switch.

---

## SETUP — 5 steps

### 1. Create new Vercel project
Go to vercel.com → Add New Project → Import this repo (push it to GitHub first).

### 2. Add environment variables in Vercel
Copy ALL of these from your Brand Gap Agent Vercel project:
```
KV_REST_API_URL
KV_REST_API_TOKEN
ANTHROPIC_API_KEY
```

Add these new ones (X API keys you already set up):
```
TWITTER_API_KEY
TWITTER_API_SECRET
TWITTER_ACCESS_TOKEN
TWITTER_ACCESS_TOKEN_SECRET
```

Add a random secret for cron security:
```
CRON_SECRET=any-random-string-you-choose
```

For Reddit (optional — poster works without it, just skips Reddit):
```
REDDIT_CLIENT_ID
REDDIT_CLIENT_SECRET
REDDIT_USERNAME
REDDIT_PASSWORD
```

### 3. Deploy
Push to GitHub → Vercel auto-deploys.

### 4. Set up Reddit app (if using Reddit)
Go to reddit.com/prefs/apps → Create App → choose "script" → set redirect to http://localhost:8080
Copy the client ID (under the app name) and client secret.

### 5. Hit START
Open your Poster Agent URL → click START → it runs forever.

---

## HOW IT WORKS

**Data source:** Reads the latest Brand Gap Agent run from your shared Redis KV. If no run exists, automation stops and shows an error.

**Post schedule (EST):**
- X: 9am, 12pm, 5pm, 8pm (4 posts/day)
- Reddit: 8am, 7pm (2 posts/day)

**Post rotation (X):**
1. Gap Reveal — the specific gap found
2. $2.71M Benchmark — the origin story
3. Engagement — "drop your market in replies"
4. Insight — brand gap concept, no pitch
5. Social Proof — multiple sprints done
6. Window Urgency — countdown to saturation
7. Gap Reveal (repeat cycle)

**Post rotation (Reddit):**
1. Value Post — genuine insight, no direct pitch
2. Question Post — share the method, invite discussion

**Manual trigger:** Dashboard → Manual tab → fire any post type instantly.

**START/STOP:** One toggle. Stops automatically if no Brand Gap data found.

---

## ENV VARS SUMMARY

| Variable | Where to get it |
|----------|----------------|
| KV_REST_API_URL | Brand Gap Agent Vercel settings |
| KV_REST_API_TOKEN | Brand Gap Agent Vercel settings |
| ANTHROPIC_API_KEY | Brand Gap Agent Vercel settings |
| TWITTER_API_KEY | developer.twitter.com |
| TWITTER_API_SECRET | developer.twitter.com |
| TWITTER_ACCESS_TOKEN | developer.twitter.com |
| TWITTER_ACCESS_TOKEN_SECRET | developer.twitter.com |
| CRON_SECRET | Make one up — any random string |
| REDDIT_CLIENT_ID | reddit.com/prefs/apps (optional) |
| REDDIT_CLIENT_SECRET | reddit.com/prefs/apps (optional) |
| REDDIT_USERNAME | Your Reddit username (optional) |
| REDDIT_PASSWORD | Your Reddit password (optional) |
