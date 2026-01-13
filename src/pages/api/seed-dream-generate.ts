import type { NextApiRequest, NextApiResponse } from 'next';

// Default to KIE Seedream API host
const DEFAULT_BASE_URL = 'https://api.kie.ai/api/v1';

const resolveBaseUrl = (baseUrl?: string) => {
  const trimmed = baseUrl?.trim();
  if (!trimmed) return DEFAULT_BASE_URL;
  return trimmed.replace(/\/$/, '');
};

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const normalizeDataUrl = (value: string) => (value.startsWith('data:') ? value : `data:image/png;base64,${value}`);

const tryExtractImage = (data: any) => {
  const output = data?.data?.output || data?.output;
  const first = Array.isArray(output) ? output[0] : output;
  const base64 = first?.b64_json || first?.base64 || first?.imageBase64 || data?.image;
  const url = first?.url || data?.url;

  const rawResultJson = data?.data?.resultJson || data?.resultJson;
  let parsedResultJson: any;
  if (typeof rawResultJson === 'string') {
    try {
      parsedResultJson = JSON.parse(rawResultJson);
    } catch (e) {}
  } else if (rawResultJson && typeof rawResultJson === 'object') {
    parsedResultJson = rawResultJson;
  }

  const base64FromJson = parsedResultJson?.resultBase64 || parsedResultJson?.base64 || parsedResultJson?.imageBase64;
  const urlsFromJson = parsedResultJson?.resultUrls || parsedResultJson?.urls;
  const directUrls = data?.data?.resultUrls || data?.resultUrls;

  if (base64) {
    return { dataUrl: normalizeDataUrl(String(base64)) };
  }
  if (base64FromJson) {
    return { dataUrl: normalizeDataUrl(String(base64FromJson)) };
  }
  if (url) return { url };
  if (Array.isArray(urlsFromJson) && urlsFromJson.length) return { url: urlsFromJson[0] };
  if (Array.isArray(directUrls) && directUrls.length) return { url: directUrls[0] };
  return null;
};

const pollForResult = async (
  baseUrl: string,
  key: string,
  ids: { taskId?: string; recordId?: string },
) => {
  const url = `${baseUrl}/jobs/getResult`;
  const MAX_POLLS = 10;
  const INTERVAL_MS = 4000;

  if (!ids.taskId && !ids.recordId) {
    throw new Error('Seed Dream: missing identifiers to poll');
  }

  for (let i = 0; i < MAX_POLLS; i++) {
    const body: Record<string, string> = {};
    if (ids.taskId) body.taskId = ids.taskId;
    if (ids.recordId) body.recordId = ids.recordId;

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      let message = `Seed Dream poll error ${resp.status}`;
      try {
        const err = await resp.json();
        message = err.error || err.message || err.msg || message;
      } catch (e) {}
      throw new Error(message);
    }

    const data = await resp.json();
    const codeVal = typeof data?.code === 'string' ? parseInt(data.code, 10) : data?.code;
    if (typeof codeVal === 'number' && codeVal !== 200) {
      const message = data.message || data.msg || 'Seed Dream polling error';
      throw new Error(message);
    }

    const extracted = tryExtractImage(data);
    if (extracted?.dataUrl) return { result: extracted.dataUrl };
    if (extracted?.url) return { url: extracted.url };

    const status = data?.data?.state || data?.data?.status || data?.state || data?.status;
    if (status === 'fail' || status === 'failed') {
      const errMsg = data?.data?.failMsg || data?.data?.error || data?.error || 'Seed Dream job failed';
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
    const { prompt, aspectRatio = '1:1', apiKey, baseUrl, callBackUrl } = req.body || {};
    const promptTrimmed = (prompt || '').trim();
    if (!promptTrimmed) {
      return res.status(400).json({ error: 'prompt is required' });
    }
    const key = (apiKey || process.env.SEED_DREAM_API_KEY || '').trim();
    if (!key) {
      return res.status(400).json({ error: 'Seed Dream API key is missing' });
    }

    const url = `${resolveBaseUrl(baseUrl)}/jobs/createTask`;
    const payload: Record<string, any> = {
      model: 'seedream/4.5-text-to-image',
      input: {
        prompt: promptTrimmed,
        aspect_ratio: aspectRatio,
        quality: 'basic',
      },
    };

    const callbackTrimmed = (callBackUrl || '').trim();
    if (callbackTrimmed) {
      payload.callBackUrl = callbackTrimmed;
    }

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
        message = err.error || err.message || err.msg || message;
      } catch (e) {
        try {
          const text = await response.text();
          if (text) message = `${message}: ${text}`;
        } catch (e2) {}
      }
      return res.status(response.status).json({ error: message });
    }

    const data = await response.json();
    const codeVal = typeof data?.code === 'string' ? parseInt(data.code, 10) : data?.code;
    if (typeof codeVal === 'number' && codeVal !== 200) {
      const message = data.message || data.msg || 'Seed Dream error';
      return res.status(502).json({ error: message });
    }
    const syncExtract = tryExtractImage(data);
    if (syncExtract?.dataUrl) return res.status(200).json({ result: syncExtract.dataUrl });
    if (syncExtract?.url) return res.status(200).json({ url: syncExtract.url });

    // Async job flow: require taskId (or recordId fallback) to poll
    const taskId = data?.data?.taskId || data?.taskId;
    const recordId = data?.data?.recordId || data?.recordId;
    if (!taskId && !recordId) {
      return res.status(500).json({ error: 'Seed Dream: job created but no taskId or recordId returned' });
    }

    const pollResult = await pollForResult(resolveBaseUrl(baseUrl), key, { taskId, recordId });
    if (pollResult.result) return res.status(200).json({ result: pollResult.result });
    if (pollResult.url) return res.status(200).json({ url: pollResult.url });

    return res.status(500).json({ error: 'Seed Dream: no image returned after polling' });
  } catch (error: any) {
    console.error('Seed Dream handler error', error);
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
}
