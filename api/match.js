module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { input } = req.body;
  if (!input) return res.status(400).json({ error: 'No input provided' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: `You are the matching engine for Back Office, a personal assistance agency based in Lagos, Nigeria. Given a description of someone's day, project, or problem, determine which VA type fits best.

Available VA types: Executive VA, Creative Ops VA, Event & Project VA, Research VA, Personal Life VA, Tech Enabled VA.

Respond ONLY with a valid JSON object and nothing else — no preamble, no markdown:
{"type": "VA type", "reason": "2–3 direct sentences explaining why this is the right fit and what specific things they would handle."}`,
        messages: [{ role: 'user', content: input }]
      })
    });

    const data = await response.json();
    const raw = data.content[0].text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(raw);
    res.status(200).json(parsed);
  } catch (e) {
    res.status(500).json({ error: 'Match failed' });
  }
}
