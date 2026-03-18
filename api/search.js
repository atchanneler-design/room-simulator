// Vercel Serverless Function: /api/search
// Proxies requests to the Rakuten API to avoid CORS issues.
//
// Usage: GET /api/search?keyword=ソファ&hits=12&sort=-reviewCount
//
// Credentials can be moved to Vercel Environment Variables:
//   RAKUTEN_APP_ID, RAKUTEN_ACCESS_KEY

const APP_ID     = process.env.RAKUTEN_APP_ID     || '5263d0de-3e3f-4282-952c-5cf28e5c9bdb';
const ACCESS_KEY = process.env.RAKUTEN_ACCESS_KEY  || 'pk_NuJVZv4rSOjQYaWY8u6n6Qm9CUZ1EKEwCiZGuOcs5q';
const BASE_URL   = 'https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20220601';

module.exports = async function handler(req, res) {
  // CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

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
    const upstream = await fetch(url);
    const text     = await upstream.text();

    console.log('[/api/search] Status:', upstream.status);
    if (!upstream.ok) {
      console.error('[/api/search] Error body:', text);
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.status(upstream.status).send(text);
  } catch (err) {
    console.error('[/api/search] Fetch failed:', err);
    res.status(500).json({ error: err.message });
  }
};
