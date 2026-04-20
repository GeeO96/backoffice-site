const https = require('https');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const { input } = req.body;
  if (!input) return res.status(400).json({ error: 'No input provided' });

  const body = JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system: `You are the matching engine for Back Office, a personal assistance agency based in Lagos, Nigeria. Given a description of someone's day, project, or problem, determine which VA type fits best.

Available VA types: Executive VA, Creative Ops VA, Event & Project VA, Research VA, Personal Life VA, Tech Enabled VA.

Respond ONLY with a valid JSON object and nothing else — no preamble, no markdown:
{"type": "VA type", "reason": "2-3 direct sentences explaining why this is the right fit and what specific things they would handle."}`,
    messages: [{ role: 'user', content: input }]
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const request = https.request(options, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            res.status(500).json({ error: parsed.error.message || 'Anthropic error' });
            return resolve();
          }
          const text = parsed.content[0].text.replace(/```json|```/g, '').trim();
          const result = JSON.parse(text);
          res.status(200).json(result);
          resolve();
        } catch (e) {
          res.status(500).json({ error: 'Parse failed', raw: data });
          resolve();
        }
      });
    });

    request.on('error', (e) => {
      res.status(500).json({ error: e.message });
      resolve();
    });

    request.write(body);
    request.end();
  });
};
