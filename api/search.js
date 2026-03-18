// Vercel Serverless Function: /api/search
// Proxies requests to the Rakuten API to avoid CORS issues.
// Rakuten's new endpoint requires Origin + Referer headers.
//
// Usage: GET /api/search?keyword=ソファ&hits=12&sort=-reviewCount

const APP_ID     = process.env.RAKUTEN_APP_ID     || '5263d0de-3e3f-4282-952c-5cf28e5c9bdb';
const ACCESS_KEY = process.env.RAKUTEN_ACCESS_KEY  || 'pk_NuJVZv4rSOjQYaWY8u6n6Qm9CUZ1EKEwCiZGuOcs5q';
const SITE_URL   = process.env.SITE_URL            || 'https://room-simulator-three.vercel.app';
const BASE_URL   = 'https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20220601';

module.exports = async function handler(req, res) {
  // CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // Debug: confirm env vars are loaded
  console.log('[/api/search] APP_ID:', APP_ID ? APP_ID.slice(0, 8) + '...' : 'MISSING');
  console.log('[/api/search] ACCESS_KEY:', ACCESS_KEY ? ACCESS_KEY.slice(0, 8) + '...' : 'MISSING');
  console.log('[/api/search] SITE_URL:', SITE_URL);

  const {
    keyword = 'ソファ',
    hits    = '12',
    sort    = '-reviewCount'
  } = req.query;

  const url = `${BASE_URL}?format=json`
    + `&keyword=${encodeURIComponent(keyword)}`
    + `&applicationId=${encodeURIComponent(APP_ID)}`
    + `&accessKey=${encodeURIComponent(ACCESS_KEY)}`
    + `&hits=${hits}`
    + `&sort=${encodeURIComponent(sort)}`
    + `&imageFlag=1`;

  console.log('[/api/search] Upstream URL:', url);

  try {
    const upstream = await fetch(url, {
      headers: {
        // Rakuten's new API requires these headers to validate the registered origin
        'Origin':  SITE_URL,
        'Referer': SITE_URL + '/',
        'User-Agent': 'Mozilla/5.0 (compatible; RoomSimulator/1.0)'
      }
    });

    const text = await upstream.text();
    console.log('[/api/search] Status:', upstream.status);

    if (!upstream.ok) {
      console.error('[/api/search] Error body:', text);
      // Debug: include full error details in response
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.status(upstream.status).json({
        _debug: {
          upstreamStatus: upstream.status,
          upstreamUrl: url,
          appId: APP_ID.slice(0, 8) + '...',
          siteUrl: SITE_URL
        },
        _rawError: JSON.parse(text)
      });
      return;
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.status(200).send(text);
  } catch (err) {
    console.error('[/api/search] Fetch failed:', err);
    res.status(500).json({
      _debug: { error: err.message, stack: err.stack }
    });
  }
};
