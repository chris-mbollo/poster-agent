export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { brandData, cardType } = await req.json();

    const gap = brandData?.results?.gap;
    const brand = brandData?.results?.brand;
    const validate = brandData?.results?.validate;
    const market = brandData?.market || 'Unknown Market';

    if (!gap || !brand) {
      return new Response(JSON.stringify({ error: 'Missing brand data' }), { status: 400 });
    }

    const brandName = brand.winner || 'BRAND';
    const tagline = brand.tagline || '';
    const product = gap.winnerProduct || 'Product';
    const subCommunity = gap.winnerSubCommunity || '';
    const gapScore = gap.gapScore || 9;
    const saturation = gap.brandSaturation || 'VERY LOW';
    const marketSize = gap.parentMarketSize || '$1B+';
    const whyGap = gap.whyThisGap || '';
    const trendScore = validate?.googleTrendsScore || validate?.confidence || 8;
    const window = validate?.windowOfOpportunity || '12-18 months';
    const primaryColor = (brand.colorPalette?.primary || '#1A1A2E').replace('#', '');
    const accentColor = (brand.colorPalette?.accent || '#E63946').replace('#', '');

    // Generate different card types
    let svgContent = '';

    if (cardType === 'gap_reveal') {
      // The "gap found" reveal card
      svgContent = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0D0D0D"/>
      <stop offset="100%" style="stop-color:#1A1A2E"/>
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>
  
  <!-- Left accent bar -->
  <rect x="0" y="0" width="8" height="630" fill="#${accentColor}"/>
  
  <!-- Top label -->
  <text x="48" y="80" font-family="Georgia, serif" font-size="14" fill="#6B7280" letter-spacing="4">BRAND GAP IDENTIFIED</text>
  
  <!-- Brand name -->
  <text x="48" y="200" font-family="Georgia, serif" font-size="96" font-weight="bold" fill="#FFFFFF">${escapeXml(brandName.toUpperCase())}</text>
  
  <!-- Tagline -->
  <text x="48" y="260" font-family="Georgia, serif" font-size="22" fill="#9CA3AF" font-style="italic">"${escapeXml(tagline)}"</text>
  
  <!-- Product line -->
  <text x="48" y="330" font-family="Arial, sans-serif" font-size="18" fill="#6B7280">${escapeXml(product)}  ·  ${escapeXml(subCommunity)}  ·  ${escapeXml(market)}</text>
  
  <!-- Divider -->
  <rect x="48" y="360" width="1104" height="1" fill="#374151"/>
  
  <!-- Stats row -->
  <text x="48" y="420" font-family="Georgia, serif" font-size="36" font-weight="bold" fill="#FFFFFF">${gapScore}/10</text>
  <text x="48" y="445" font-family="Arial, sans-serif" font-size="11" fill="#6B7280" letter-spacing="2">GAP SCORE</text>
  
  <text x="248" y="420" font-family="Georgia, serif" font-size="36" font-weight="bold" fill="#FFFFFF">${escapeXml(saturation)}</text>
  <text x="248" y="445" font-family="Arial, sans-serif" font-size="11" fill="#6B7280" letter-spacing="2">BRAND SATURATION</text>
  
  <text x="648" y="420" font-family="Georgia, serif" font-size="36" font-weight="bold" fill="#FFFFFF">${escapeXml(marketSize)}</text>
  <text x="648" y="445" font-family="Arial, sans-serif" font-size="11" fill="#6B7280" letter-spacing="2">MARKET SIZE</text>
  
  <text x="948" y="420" font-family="Georgia, serif" font-size="36" font-weight="bold" fill="#FFFFFF">${trendScore}/10</text>
  <text x="948" y="445" font-family="Arial, sans-serif" font-size="11" fill="#6B7280" letter-spacing="2">TREND SCORE</text>
  
  <!-- Why gap text -->
  <text x="48" y="520" font-family="Georgia, serif" font-size="15" fill="#9CA3AF" font-style="italic">${escapeXml(whyGap.slice(0, 100))}${whyGap.length > 100 ? '...' : ''}</text>
  
  <!-- Bottom branding -->
  <text x="48" y="600" font-family="Arial, sans-serif" font-size="12" fill="#374151">brandgapagent.com</text>
  <rect x="1100" y="575" width="60" height="30" rx="4" fill="#${accentColor}"/>
  <text x="1130" y="595" font-family="Arial, sans-serif" font-size="11" fill="#FFFFFF" text-anchor="middle">SPRINT</text>
</svg>`;

    } else if (cardType === 'benchmark') {
      // The $2.7M benchmark story card
      svgContent = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#0D0D0D"/>
  <rect x="0" y="0" width="8" height="630" fill="#${accentColor}"/>
  
  <text x="48" y="80" font-family="Arial, sans-serif" font-size="13" fill="#6B7280" letter-spacing="4">THE BENCHMARK</text>
  
  <text x="48" y="220" font-family="Georgia, serif" font-size="88" font-weight="bold" fill="#FFFFFF">$2.71M</text>
  <text x="48" y="275" font-family="Georgia, serif" font-size="28" fill="#9CA3AF">in 30 days. One product. One gap.</text>
  
  <rect x="48" y="310" width="1104" height="1" fill="#374151"/>
  
  <text x="48" y="380" font-family="Georgia, serif" font-size="20" fill="#9CA3AF">Nike owns "sports socks."</text>
  <text x="48" y="415" font-family="Georgia, serif" font-size="20" fill="#FFFFFF">Nobody owned "Pilates socks."</text>
  
  <text x="48" y="480" font-family="Georgia, serif" font-size="16" fill="#6B7280">Same market. Same spend. Zero brand competition.</text>
  <text x="48" y="510" font-family="Georgia, serif" font-size="16" fill="#6B7280">The Brand Sprint finds that gap in 8 minutes.</text>
  
  <text x="48" y="580" font-family="Arial, sans-serif" font-size="13" fill="#6B7280">Current gap: ${escapeXml(product)} · ${escapeXml(subCommunity)}</text>
  <rect x="1050" y="555" width="110" height="36" rx="4" fill="#${accentColor}"/>
  <text x="1105" y="578" font-family="Arial, sans-serif" font-size="12" fill="#FFFFFF" text-anchor="middle">BRAND SPRINT</text>
</svg>`;

    } else if (cardType === 'output_reveal') {
      // What the agent outputs card
      const outputs = ['Validated brand gap', 'Brand name + identity', 'Shopify website brief', '2 viral TikTok scripts', 'Supplier pack + outreach', 'PPT deck'];
      const outputsSvg = outputs.map((o, i) => `
        <rect x="48" y="${390 + (i * 34)}" width="10" height="10" rx="2" fill="#${accentColor}"/>
        <text x="70" y="${401 + (i * 34)}" font-family="Arial, sans-serif" font-size="15" fill="#D1D5DB">${escapeXml(o)}</text>
      `).join('');

      svgContent = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#0D0D0D"/>
  <rect x="0" y="0" width="8" height="630" fill="#${accentColor}"/>
  
  <text x="48" y="80" font-family="Arial, sans-serif" font-size="13" fill="#6B7280" letter-spacing="4">WHAT YOU GET IN 8 MINUTES</text>
  
  <text x="48" y="200" font-family="Georgia, serif" font-size="64" font-weight="bold" fill="#FFFFFF">The Brand</text>
  <text x="48" y="275" font-family="Georgia, serif" font-size="64" font-weight="bold" fill="#FFFFFF">Sprint</text>
  
  <rect x="48" y="310" width="1104" height="1" fill="#374151"/>
  <text x="48" y="360" font-family="Arial, sans-serif" font-size="14" fill="#6B7280">For: ${escapeXml(product)} · ${escapeXml(subCommunity)} · ${escapeXml(market)}</text>
  
  ${outputsSvg}
  
  <text x="700" y="420" font-family="Georgia, serif" font-size="72" font-weight="bold" fill="#1F2937">$2,997</text>
  <text x="700" y="460" font-family="Arial, sans-serif" font-size="14" fill="#6B7280">Agency equivalent: $15,000-$30,000</text>
  <text x="700" y="490" font-family="Arial, sans-serif" font-size="13" fill="#${accentColor}">Guarantee: find a gap or pay nothing</text>
</svg>`;

    } else {
      // Default engagement card
      svgContent = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#0D0D0D"/>
  <rect x="0" y="0" width="8" height="630" fill="#${accentColor}"/>
  
  <text x="48" y="80" font-family="Arial, sans-serif" font-size="13" fill="#6B7280" letter-spacing="4">BRAND GAP AGENT</text>
  
  <text x="48" y="220" font-family="Georgia, serif" font-size="72" font-weight="bold" fill="#FFFFFF">What market</text>
  <text x="48" y="300" font-family="Georgia, serif" font-size="72" font-weight="bold" fill="#9CA3AF">would you</text>
  <text x="48" y="380" font-family="Georgia, serif" font-size="72" font-weight="bold" fill="#FFFFFF">build in?</text>
  
  <rect x="48" y="430" width="1104" height="1" fill="#374151"/>
  
  <text x="48" y="490" font-family="Arial, sans-serif" font-size="16" fill="#9CA3AF">Drop it in the replies. I'll tell you if there's an unbranded gap worth building.</text>
  
  <text x="48" y="580" font-family="Arial, sans-serif" font-size="13" fill="#374151">brandgapagent.com · 8 minutes to a complete brand</text>
</svg>`;
    }

    return new Response(JSON.stringify({
      success: true,
      svg: svgContent,
      // Return as data URI for direct use in Twitter API
      dataUri: `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgContent)))}`
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
