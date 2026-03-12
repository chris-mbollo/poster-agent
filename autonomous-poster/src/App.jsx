import { useState, useEffect, useRef } from "react";

const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; background: #0D0D0D; color: #F9FAFB; font-family: 'Geist', -apple-system, sans-serif; -webkit-font-smoothing: antialiased; }
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap');
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  button { cursor: pointer; font-family: inherit; border: none; background: none; }
`;

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600&family=Geist+Mono:wght@300;400&display=swap');`;

const X_POST_TYPES = [
  { id: 'gap_reveal', label: 'Gap Reveal', desc: 'Shows the specific gap found' },
  { id: 'benchmark', label: '$2.71M Benchmark', desc: 'The origin story hook' },
  { id: 'engagement', label: 'Engagement', desc: '"Drop your market in replies"' },
  { id: 'insight', label: 'Insight', desc: 'Brand gap concept — no pitch' },
  { id: 'social_proof', label: 'Social Proof', desc: 'Multiple sprints done' },
  { id: 'window', label: 'Window Urgency', desc: 'Countdown to saturation' },
];

const REDDIT_POST_TYPES = [
  { id: 'value_post', label: 'Value Post', desc: 'Genuine insight, no pitch' },
  { id: 'question_post', label: 'Question Post', desc: 'Share method, ask community' },
];

const POSTING_TIMES = {
  x: ['9am EST', '12pm EST', '5pm EST', '8pm EST'],
  reddit: ['8am EST', '7pm EST'],
};

function Spin({ size = 14, color = '#9CA3AF' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" fill="none" stroke={color} strokeWidth="2.5" strokeDasharray="40" strokeDashoffset="15" strokeLinecap="round" />
    </svg>
  );
}

function PlatformBadge({ platform }) {
  const isX = platform === 'x';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 99, fontSize: 11,
      fontFamily: 'monospace', fontWeight: 500,
      color: isX ? '#1DA1F2' : '#FF4500',
      background: isX ? '#1DA1F215' : '#FF450015',
      border: `1px solid ${isX ? '#1DA1F230' : '#FF450030'}`,
    }}>
      {isX ? '𝕏' : 'r/'} {isX ? 'X' : 'Reddit'}
    </span>
  );
}

export default function App() {
  const [settings, setSettings] = useState({ active: false, platforms: ['x'] });
  const [log, setLog] = useState([]);
  const [brandData, setBrandData] = useState(null);
  const [brandError, setBrandError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [triggering, setTriggering] = useState(null);
  const [redditGenerated, setRedditGenerated] = useState(null);
  const [generatingReddit, setGeneratingReddit] = useState(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      // Load settings + log
      const settingsRes = await fetch('/api/settings');
      const settingsData = await settingsRes.json();
      setSettings(settingsData.settings || { active: false, platforms: ['x'] });
      setLog(settingsData.log || []);

      // Load brand data
      const brandRes = await fetch('/api/brand-data');
      if (brandRes.ok) {
        const bd = await brandRes.json();
        setBrandData(bd.run);
        setBrandError(null);
      } else {
        const err = await brandRes.json();
        setBrandError(err.message || 'No brand data found');
        setBrandData(null);
      }
    } catch (e) {
      setBrandError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function toggleAutomation() {
    setToggling(true);
    try {
      const newActive = !settings.active;
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: newActive }),
      });
      const data = await res.json();
      setSettings(data.settings);
    } finally {
      setToggling(false);
    }
  }

  async function togglePlatform(platform) {
    const current = settings.platforms || ['x'];
    const updated = current.includes(platform)
      ? current.filter(p => p !== platform)
      : [...current, platform];
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platforms: updated }),
    });
    const data = await res.json();
    setSettings(data.settings);
  }

  async function triggerPost(platform, postType) {
    const key = `${platform}:${postType}`;
    setTriggering(key);
    try {
      const res = await fetch('/api/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, postType }),
      });
      const data = await res.json();
      if (data.success) {
        await loadData();
      } else {
        alert('Post failed: ' + (data.error || 'Unknown error'));
      }
    } finally {
      setTriggering(null);
    }
  }

  async function generateRedditPost(postType) {
    setGeneratingReddit(postType);
    setRedditGenerated(null);
    try {
      const res = await fetch('/api/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'reddit', postType, generateOnly: true }),
      });
      const data = await res.json();
      if (data.success) {
        setRedditGenerated({ postType, ...data.generated });
      } else {
        alert('Generation failed: ' + (data.error || 'Unknown error'));
      }
    } finally {
      setGeneratingReddit(null);
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const gap = brandData?.results?.gap;
  const brand = brandData?.results?.brand;
  const totalPosts = log.length;
  const xPosts = log.filter(l => l.platform === 'x').length;
  const redditPosts = log.filter(l => l.platform === 'reddit').length;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <Spin size={24} color="#6B7280" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D' }}>
      <style>{FONTS + CSS}</style>

      {/* NAV */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100, height: 52,
        borderBottom: '1px solid #1F2937',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', background: 'rgba(13,13,13,0.95)',
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 24, height: 24, background: '#111827', border: '1px solid #374151', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>◎</span>
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#F9FAFB' }}>Poster Agent</span>
          <span style={{ fontSize: 12, color: '#374151', marginLeft: 4 }}>autonomous</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {['dashboard', 'log', 'manual'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
              background: activeTab === tab ? '#1F2937' : 'transparent',
              color: activeTab === tab ? '#F9FAFB' : '#6B7280',
              textTransform: 'capitalize',
            }}>{tab}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 24px' }}>

        {/* BRAND DATA STATUS */}
        {brandError ? (
          <div style={{
            padding: '16px 20px', background: '#1A0A00', border: '1px solid #92400E',
            borderRadius: 10, marginBottom: 28, display: 'flex', gap: 12, alignItems: 'flex-start'
          }}>
            <span style={{ color: '#F59E0B', fontSize: 18 }}>⚠</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#F59E0B', marginBottom: 4 }}>No Brand Gap data found</div>
              <div style={{ fontSize: 12, color: '#92400E' }}>{brandError}</div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Run the Brand Gap Agent first — the poster needs real gap data to post from.</div>
            </div>
          </div>
        ) : gap ? (
          <div style={{
            padding: '14px 18px', background: '#0A1628', border: '1px solid #1E3A5F',
            borderRadius: 10, marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16A34A', display: 'block', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#6B7280', fontFamily: 'monospace' }}>DATA SOURCE</span>
              <span style={{ fontSize: 13, color: '#93C5FD' }}>{gap.winnerProduct}</span>
              <span style={{ color: '#374151' }}>·</span>
              <span style={{ fontSize: 13, color: '#9CA3AF' }}>{gap.winnerSubCommunity}</span>
              <span style={{ color: '#374151' }}>·</span>
              <span style={{ fontSize: 13, color: '#9CA3AF' }}>{brandData.market}</span>
            </div>
            <span style={{ fontSize: 11, color: '#374151', fontFamily: 'monospace' }}>{brand?.winner}</span>
          </div>
        ) : null}

        {/* ── DASHBOARD TAB ── */}
        {activeTab === 'dashboard' && (
          <div style={{ animation: 'fadeUp 0.3s ease forwards' }}>

            {/* BIG START/STOP */}
            <div style={{
              background: '#111827', border: `1px solid ${settings.active ? '#166534' : '#1F2937'}`,
              borderRadius: 16, padding: '40px', marginBottom: 24, textAlign: 'center',
              transition: 'all 0.3s',
            }}>
              <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#6B7280', letterSpacing: '0.1em', marginBottom: 20 }}>
                AUTOMATION STATUS
              </div>
              <div style={{
                fontSize: 64, fontFamily: "'Instrument Serif', Georgia, serif",
                color: settings.active ? '#16A34A' : '#374151',
                marginBottom: 8, lineHeight: 1, transition: 'color 0.3s',
              }}>
                {settings.active ? 'LIVE' : 'PAUSED'}
              </div>
              {settings.active && (
                <div style={{ fontSize: 12, color: '#16A34A', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16A34A', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                  Posting automatically · {totalPosts} posts sent
                </div>
              )}
              {!settings.active && (
                <div style={{ fontSize: 12, color: '#374151', marginBottom: 24 }}>
                  No posts being sent · Click START to activate
                </div>
              )}
              <button
                onClick={toggleAutomation}
                disabled={toggling || !!brandError}
                style={{
                  padding: '14px 48px', borderRadius: 10, fontSize: 15, fontWeight: 600,
                  background: settings.active ? '#1F2937' : '#16A34A',
                  color: settings.active ? '#9CA3AF' : '#FFFFFF',
                  border: `1px solid ${settings.active ? '#374151' : '#16A34A'}`,
                  transition: 'all 0.2s', opacity: (toggling || !!brandError) ? 0.5 : 1,
                  cursor: (toggling || !!brandError) ? 'not-allowed' : 'pointer',
                }}
              >
                {toggling ? <Spin size={16} color="#6B7280" /> : settings.active ? '⏸ STOP' : '▶ START'}
              </button>
            </div>

            {/* PLATFORM TOGGLES */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              {[
                { id: 'x', name: '𝕏 Twitter / X', times: POSTING_TIMES.x, color: '#1DA1F2', posts: xPosts },
                { id: 'reddit', name: 'Reddit', times: POSTING_TIMES.reddit, color: '#FF4500', posts: redditPosts },
              ].map(p => {
                const on = (settings.platforms || ['x']).includes(p.id);
                return (
                  <div key={p.id} style={{
                    background: '#111827', border: `1px solid ${on ? p.color + '40' : '#1F2937'}`,
                    borderRadius: 12, padding: '20px 22px', transition: 'all 0.2s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: on ? p.color : '#6B7280' }}>{p.name}</span>
                      <button onClick={() => togglePlatform(p.id)} style={{
                        width: 40, height: 22, borderRadius: 11, background: on ? p.color : '#374151',
                        position: 'relative', transition: 'all 0.2s',
                      }}>
                        <span style={{
                          position: 'absolute', top: 3, left: on ? 20 : 3,
                          width: 16, height: 16, borderRadius: '50%', background: '#FFFFFF',
                          transition: 'left 0.2s',
                        }} />
                      </button>
                    </div>
                    <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#4B5563', marginBottom: 6 }}>POSTING TIMES (EST)</div>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>{p.times.join(' · ')}</div>
                    <div style={{ fontSize: 12, color: '#374151', marginTop: 8 }}>{p.posts} posts sent</div>
                  </div>
                );
              })}
            </div>

            {/* STATS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                ['Total Posts', totalPosts],
                ['X Posts', xPosts],
                ['Reddit Posts', redditPosts],
              ].map(([label, val]) => (
                <div key={label} style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 10, padding: '16px 18px', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontFamily: "'Instrument Serif', Georgia, serif", color: '#F9FAFB', marginBottom: 4 }}>{val}</div>
                  <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#6B7280', letterSpacing: '0.06em' }}>{label.toUpperCase()}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── LOG TAB ── */}
        {activeTab === 'log' && (
          <div style={{ animation: 'fadeUp 0.3s ease forwards' }}>
            <div style={{ fontSize: 20, fontFamily: "'Instrument Serif', Georgia, serif", color: '#F9FAFB', marginBottom: 20 }}>Post History</div>
            {log.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#374151', fontSize: 14 }}>
                No posts yet. Start automation or trigger a manual post.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {log.map((entry, i) => (
                  <div key={entry.id || i} style={{
                    background: '#111827', border: '1px solid #1F2937', borderRadius: 10,
                    padding: '16px 18px', animation: 'fadeUp 0.3s ease forwards',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <PlatformBadge platform={entry.platform} />
                      <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#374151' }}>{entry.postType}</span>
                      <span style={{ flex: 1 }} />
                      <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#374151' }}>
                        {new Date(entry.postedAt).toLocaleDateString()} {new Date(entry.postedAt).toLocaleTimeString()}
                      </span>
                    </div>
                    {entry.platform === 'x' && entry.content?.text && (
                      <div style={{ fontSize: 13, color: '#9CA3AF', lineHeight: 1.7, padding: '10px 12px', background: '#0D0D0D', borderRadius: 8 }}>
                        {entry.content.text}
                      </div>
                    )}
                    {entry.platform === 'reddit' && entry.content?.title && (
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#D1D5DB', marginBottom: 4 }}>{entry.content.title}</div>
                        <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.6 }}>{(entry.content.body || '').slice(0, 200)}{(entry.content.body || '').length > 200 ? '…' : ''}</div>
                      </div>
                    )}
                    <div style={{ marginTop: 8, fontSize: 11, fontFamily: 'monospace', color: '#374151' }}>
                      {entry.market} · {entry.product}
                      {entry.tweetId && <span> · <a href={`https://twitter.com/i/web/status/${entry.tweetId}`} target="_blank" rel="noreferrer" style={{ color: '#1DA1F2' }}>view tweet</a></span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── MANUAL TAB ── */}
        {activeTab === 'manual' && (
          <div style={{ animation: 'fadeUp 0.3s ease forwards' }}>
            <div style={{ fontSize: 20, fontFamily: "'Instrument Serif', Georgia, serif", color: '#F9FAFB', marginBottom: 8 }}>Manual Trigger</div>
            <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 28 }}>Fire any post type right now — uses the same embedded formula as the automation.</div>

            {brandError && (
              <div style={{ padding: '14px 18px', background: '#1A0A00', border: '1px solid #92400E', borderRadius: 10, marginBottom: 24, fontSize: 13, color: '#F59E0B' }}>
                ⚠ No brand data — run the Brand Gap Agent first before triggering posts.
              </div>
            )}

            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#6B7280', letterSpacing: '0.08em', marginBottom: 14 }}>𝕏 TWITTER / X</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {X_POST_TYPES.map(pt => {
                  const key = `x:${pt.id}`;
                  const isLoading = triggering === key;
                  return (
                    <div key={pt.id} style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#F9FAFB', marginBottom: 2 }}>{pt.label}</div>
                        <div style={{ fontSize: 11, color: '#6B7280' }}>{pt.desc}</div>
                      </div>
                      <button
                        onClick={() => !brandError && triggerPost('x', pt.id)}
                        disabled={!!brandError || !!triggering}
                        style={{
                          padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                          background: brandError ? '#1F2937' : '#1DA1F2', color: '#FFFFFF',
                          opacity: (brandError || triggering) ? 0.5 : 1,
                          cursor: (brandError || triggering) ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
                        }}
                      >
                        {isLoading ? <Spin size={12} color="#fff" /> : 'Post Now'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#6B7280', letterSpacing: '0.08em' }}>REDDIT</div>
                <span style={{ fontSize: 11, color: '#374151', background: '#1F2937', padding: '2px 8px', borderRadius: 99 }}>manual copy-paste</span>
              </div>
              <div style={{ fontSize: 12, color: '#4B5563', marginBottom: 14 }}>Generate the post → copy it → paste into Reddit yourself.</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                {REDDIT_POST_TYPES.map(pt => {
                  const isLoading = generatingReddit === pt.id;
                  const isActive = redditGenerated?.postType === pt.id;
                  return (
                    <div key={pt.id} style={{
                      background: '#111827', border: `1px solid ${isActive ? '#FF450040' : '#1F2937'}`,
                      borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      transition: 'border-color 0.2s',
                    }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#F9FAFB', marginBottom: 2 }}>{pt.label}</div>
                        <div style={{ fontSize: 11, color: '#6B7280' }}>{pt.desc}</div>
                      </div>
                      <button
                        onClick={() => !brandError && generateRedditPost(pt.id)}
                        disabled={!!brandError || !!generatingReddit}
                        style={{
                          padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                          background: brandError ? '#1F2937' : '#FF450020',
                          color: brandError ? '#6B7280' : '#FF4500',
                          border: '1px solid #FF450030',
                          opacity: (brandError || generatingReddit) ? 0.5 : 1,
                          cursor: (brandError || generatingReddit) ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
                        }}
                      >
                        {isLoading ? <Spin size={12} color="#FF4500" /> : 'Generate'}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Generated Reddit post — copy-paste area */}
              {redditGenerated && (
                <div style={{ background: '#111827', border: '1px solid #FF450030', borderRadius: 12, padding: '20px', animation: 'fadeUp 0.3s ease forwards' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#FF4500', letterSpacing: '0.08em' }}>READY TO POST</div>
                    <a
                      href="https://www.reddit.com/r/entrepreneur/submit"
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: 12, color: '#FF4500', textDecoration: 'none' }}
                    >
                      Open Reddit ↗
                    </a>
                  </div>

                  {/* Title */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: '#4B5563', fontFamily: 'monospace', marginBottom: 6 }}>TITLE</div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#F9FAFB', lineHeight: 1.5, padding: '10px 12px', background: '#0D0D0D', borderRadius: 8 }}>
                      {redditGenerated.title}
                    </div>
                  </div>

                  {/* Body */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: '#4B5563', fontFamily: 'monospace', marginBottom: 6 }}>BODY</div>
                    <div style={{ fontSize: 13, color: '#9CA3AF', lineHeight: 1.8, padding: '12px', background: '#0D0D0D', borderRadius: 8, whiteSpace: 'pre-wrap', maxHeight: 240, overflowY: 'auto' }}>
                      {redditGenerated.body}
                    </div>
                  </div>

                  {/* Subreddit + copy button */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 12, color: '#4B5563' }}>
                      Post to: <span style={{ color: '#FF4500' }}>r/{redditGenerated.subreddit}</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(`${redditGenerated.title}\n\n${redditGenerated.body}`)}
                      style={{
                        padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                        background: copied ? '#166534' : '#FF4500', color: '#FFFFFF',
                        transition: 'background 0.2s',
                      }}
                    >
                      {copied ? '✓ Copied' : 'Copy All'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
