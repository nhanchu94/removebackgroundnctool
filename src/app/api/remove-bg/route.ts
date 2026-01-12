import { NextResponse } from 'next/server';

const PHOTOROOM_ENDPOINT = 'https://sdk.photoroom.com/v1/edit';

// Utility: extract mime and base64 payload from data URL
const parseBase64 = (dataUrl: string) => {
  const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
  return {
    mime: match?.[1] || 'image/png',
    base64: match?.[2] || dataUrl,
  };
};

export async function POST(req: Request) {
  try {
    const { imageBase64, apiKey } = await req.json();
    if (!imageBase64) {
      return NextResponse.json({ error: 'imageBase64 is required' }, { status: 400 });
    }

    const key = apiKey || process.env.PHOTOROOM_API_KEY;
    if (!key) {
      return NextResponse.json({ error: 'PhotoRoom API key is missing' }, { status: 400 });
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
      } catch (e) {
        // ignore
      }
      return NextResponse.json({ error: message }, { status: response.status });
    }

    const arrayBuffer = await response.arrayBuffer();
    const resultBase64 = Buffer.from(arrayBuffer).toString('base64');
    const outMime = response.headers.get('content-type') || 'image/png';
    const dataUrl = `data:${outMime};base64,${resultBase64}`;

    return NextResponse.json({ result: dataUrl });
  } catch (error: any) {
    const message = error?.message || 'Unexpected server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}
