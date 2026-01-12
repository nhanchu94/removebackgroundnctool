import type { NextApiRequest, NextApiResponse } from 'next';

// PhotoRoom remove background endpoint
const PHOTOROOM_ENDPOINT = 'https://sdk.photoroom.com/v1/segment';

const parseBase64 = (dataUrl: string) => {
  const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
  return {
    mime: match?.[1] || 'image/png',
    base64: match?.[2] || dataUrl,
  };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { imageBase64, apiKey } = req.body || {};
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    const key = apiKey || process.env.PHOTOROOM_API_KEY;
    if (!key) {
      return res.status(400).json({ error: 'PhotoRoom API key is missing' });
    }

    const { mime, base64 } = parseBase64(imageBase64);
    const buffer = Buffer.from(base64, 'base64');
    const formData = new FormData();
    const blob = new Blob([buffer], { type: mime });
    formData.append('image_file', blob, 'upload');

    const response = await fetch(PHOTOROOM_ENDPOINT, {
      method: 'POST',
      headers: {
        'X-Api-Key': key,
      },
      body: formData,
    });

    if (!response.ok) {
      let message = `PhotoRoom error ${response.status}`;
      try {
        const err = await response.json();
        message = err.detail || message;
      } catch (e) {}
      return res.status(response.status).json({ error: message });
    }

    const arrayBuffer = await response.arrayBuffer();
    const resultBase64 = Buffer.from(arrayBuffer).toString('base64');
    const outMime = response.headers.get('content-type') || 'image/png';
    const dataUrl = `data:${outMime};base64,${resultBase64}`;

    return res.status(200).json({ result: dataUrl });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
}
