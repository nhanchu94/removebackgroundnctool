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
  const MAX_POLLS = 20; // allow more retries for long-running tasks
  const INTERVAL_MS = 5000; // wait longer between polls
  const endpoints = [
    { path: '/jobs/getResult', allowPost: true, allowGet: true },
    { path: '/jobs/getTaskResult', allowPost: true, allowGet: true },
    { path: '/jobs/taskResult', allowPost: false, allowGet: true },
    // Based on Seedream docs: unified "Get Task Details" endpoint
    { path: '/jobs/getTaskDetail', allowPost: true, allowGet: true },
    { path: '/common/getTaskDetail', allowPost: true, allowGet: true },
  ];

  if (!ids.taskId && !ids.recordId) {
    throw new Error('Seed Dream: missing identifiers to poll');
  }

  for (let i = 0; i < MAX_POLLS; i++) {
    let lastNotFound: string | null = null;

    for (const ep of endpoints) {
      const fullPath = `${baseUrl}${ep.path}`;
      const body: Record<string, string> = {};
      if (ids.taskId) body.taskId = ids.taskId;
      if (ids.recordId) body.recordId = ids.recordId;

      // Try POST first if allowed
      if (ep.allowPost) {
        const resp = await fetch(fullPath, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify(body),
        });

        if (resp.ok) {
          const data = await resp.json();
          const codeVal = typeof data?.code === 'string' ? parseInt(data.code, 10) : data?.code;
          if (typeof codeVal === 'number' && codeVal !== 200) {
            const message = data.message || data.msg || 'Seed Dream polling error';
            throw new Error(`getResult: ${message}`);
          }

          const extracted = tryExtractImage(data);
          if (extracted?.dataUrl) return { result: extracted.dataUrl };
          if (extracted?.url) return { url: extracted.url };

          const status = data?.data?.state || data?.data?.status || data?.state || data?.status;
          if (status === 'fail' || status === 'failed') {
            const errMsg = data?.data?.failMsg || data?.data?.error || data?.error || 'Seed Dream job failed';
            throw new Error(errMsg);
          }

          // No result yet; continue polling loop
          await delay(INTERVAL_MS);
          continue;
        }

        if (resp.status === 404) {
          lastNotFound = `${resp.status} at ${fullPath}`;
        } else {
          let message = `Seed Dream poll error ${resp.status}`;
          try {
            const err = await resp.json();
            message = err.error || err.message || err.msg || message;
          } catch (e) {}
          throw new Error(`getResult: ${message}`);
        }
      }

      // Try GET if allowed
      if (ep.allowGet) {
        const params = new URLSearchParams();
        if (ids.taskId) params.append('taskId', ids.taskId);
        if (ids.recordId) params.append('recordId', ids.recordId);
        const altUrl = `${fullPath}?${params.toString()}`;
        const altResp = await fetch(altUrl, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${key}`,
          },
        });

        if (altResp.ok) {
          const altData = await altResp.json();
          const altCode = typeof altData?.code === 'string' ? parseInt(altData.code, 10) : altData?.code;
          if (typeof altCode === 'number' && altCode !== 200) {
            const altMsg = altData.message || altData.msg || 'Seed Dream polling error';
            throw new Error(`getResult: ${altMsg}`);
          }

          const altExtract = tryExtractImage(altData);
          if (altExtract?.dataUrl) return { result: altExtract.dataUrl };
          if (altExtract?.url) return { url: altExtract.url };

          const altStatus = altData?.data?.state || altData?.data?.status || altData?.state || altData?.status;
          if (altStatus === 'fail' || altStatus === 'failed') {
            const altErrMsg = altData?.data?.failMsg || altData?.data?.error || altData?.error || 'Seed Dream job failed';
            throw new Error(altErrMsg);
          }

          // No result yet; continue polling loop
          await delay(INTERVAL_MS);
          continue;
        }

        if (altResp.status === 404) {
          lastNotFound = `${altResp.status} at ${altUrl}`;
          continue;
        }

        let altMessage = `Seed Dream poll error ${altResp.status}`;
        try {
          const altErr = await altResp.json();
          altMessage = altErr.error || altErr.message || altErr.msg || altMessage;
        } catch (e) {}
        throw new Error(`getResult: ${altMessage}`);
      }
    }

    if (lastNotFound) {
      // Nothing succeeded this round; wait and retry with same endpoints
      await delay(INTERVAL_MS);
      continue;
    }
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

    const targetBaseUrl = resolveBaseUrl(baseUrl);
    const url = `${targetBaseUrl}/jobs/createTask`;
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
      if (response.status === 404) {
        return res
          .status(502)
          .json({ error: `createTask 404 at ${targetBaseUrl}/jobs/createTask. Leave baseUrl empty or set to https://api.kie.ai/api/v1.` });
      }
      return res.status(response.status).json({ error: `createTask: ${message}` });
    }

    const data = await response.json();
    const codeVal = typeof data?.code === 'string' ? parseInt(data.code, 10) : data?.code;
    if (typeof codeVal === 'number' && codeVal !== 200) {
      const message = data.message || data.msg || 'Seed Dream error';
      return res.status(502).json({ error: `createTask: ${message}` });
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

    const pollResult = await pollForResult(targetBaseUrl, key, { taskId, recordId });
    if (pollResult.result) return res.status(200).json({ result: pollResult.result });
    if (pollResult.url) return res.status(200).json({ url: pollResult.url });

    return res.status(500).json({ error: 'Seed Dream: no image returned after polling' });
  } catch (error: any) {
    console.error('Seed Dream handler error', error);
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
}
