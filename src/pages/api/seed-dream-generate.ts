import type { NextApiRequest, NextApiResponse } from 'next';

// Default to KIE Seedream API host
const DEFAULT_BASE_URL = 'https://api.kie.ai/api/v1';

const resolveBaseUrl = (baseUrl?: string) => {
  const trimmed = baseUrl?.trim();
  if (!trimmed) return DEFAULT_BASE_URL;
  return trimmed.replace(/\/$/, '');
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { prompt, aspectRatio = '1:1', apiKey, baseUrl } = req.body || {};
    const promptTrimmed = (prompt || '').trim();
    if (!promptTrimmed) {
      return res.status(400).json({ error: 'prompt is required' });
    }
    const key = (apiKey || process.env.SEED_DREAM_API_KEY || '').trim();
    if (!key) {
      return res.status(400).json({ error: 'Seed Dream API key is missing' });
    }

    const url = `${resolveBaseUrl(baseUrl)}/jobs/createTask`;
    const payload = {
      model: 'seedream/4.5-text-to-image',
      input: {
        prompt: promptTrimmed,
        aspect_ratio: aspectRatio,
        quality: 'basic',
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let message = `Seed Dream error ${response.status}`;
      try {
        const err = await response.json();
        message = err.error || err.message || message;
      } catch (e) {}
      return res.status(response.status).json({ error: message });
    }

    const data = await response.json();
    // Try to extract image result if synchronous; otherwise return job info
    const output = data?.data?.output || data?.output;
    const first = Array.isArray(output) ? output[0] : undefined;
    const base64 = first?.b64_json || first?.base64 || data?.image;
    const urlResult = first?.url || data?.url;

    if (base64) {
      const dataUrl = String(base64).startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
      return res.status(200).json({ result: dataUrl });
    }

    // If asynchronous job response, return job info to caller
    return res.status(200).json({ job: data });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
}
