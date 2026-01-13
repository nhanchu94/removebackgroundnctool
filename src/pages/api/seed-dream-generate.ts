import type { NextApiRequest, NextApiResponse } from 'next';

// Default to KIE Seedream API host
const DEFAULT_BASE_URL = 'https://api.kie.ai/api/v1';

const resolveBaseUrl = (baseUrl?: string) => {
  const trimmed = baseUrl?.trim();
  if (!trimmed) return DEFAULT_BASE_URL;
  return trimmed.replace(/\/$/, '');
};

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const tryExtractImage = (data: any) => {
  const output = data?.data?.output || data?.output;
  const first = Array.isArray(output) ? output[0] : output;
  const base64 = first?.b64_json || first?.base64 || first?.imageBase64 || data?.image;
  const url = first?.url || data?.url;
  if (base64) {
    const dataUrl = String(base64).startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
    return { dataUrl };
  }
  if (url) return { url };
  return null;
};

const pollForResult = async (baseUrl: string, key: string, recordId: string, taskId?: string) => {
  const url = `${baseUrl}/jobs/getResult`;
  const MAX_POLLS = 10;
  const INTERVAL_MS = 4000;

  for (let i = 0; i < MAX_POLLS; i++) {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ recordId, taskId }),
    });

    if (!resp.ok) {
      let message = `Seed Dream poll error ${resp.status}`;
      try {
        const err = await resp.json();
        message = err.error || err.message || message;
      } catch (e) {}
      throw new Error(message);
    }

    const data = await resp.json();
    const extracted = tryExtractImage(data);
    if (extracted?.dataUrl) return { result: extracted.dataUrl };
    if (extracted?.url) return { url: extracted.url };

    // check status if provided
    const status = data?.data?.status || data?.status;
    if (status === 'failed') {
      const errMsg = data?.data?.error || data?.error || 'Seed Dream job failed';
      throw new Error(errMsg);
    }

    await delay(INTERVAL_MS);
  }

  throw new Error('Seed Dream job created but no result after polling');
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
    const syncExtract = tryExtractImage(data);
    if (syncExtract?.dataUrl) return res.status(200).json({ result: syncExtract.dataUrl });
    if (syncExtract?.url) return res.status(200).json({ url: syncExtract.url });

    // Async job flow: require recordId/taskId to poll
    const recordId = data?.data?.recordId || data?.recordId || data?.data?.taskId;
    const taskId = data?.data?.taskId;
    if (!recordId) {
      return res.status(500).json({ error: 'Seed Dream: job created but no recordId returned' });
    }

    const pollResult = await pollForResult(resolveBaseUrl(baseUrl), key, recordId, taskId);
    if (pollResult.result) return res.status(200).json({ result: pollResult.result });
    if (pollResult.url) return res.status(200).json({ url: pollResult.url });

    return res.status(500).json({ error: 'Seed Dream: no image returned after polling' });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
}
