// Seed Dream 4.5 image generation service with configurable base URL

const defaultBaseUrl = 'https://api.seeddream.ai';

const resolveBaseUrl = (baseUrl?: string) => {
  const trimmed = baseUrl?.trim();
  if (!trimmed) return defaultBaseUrl;
  return trimmed.replace(/\/$/, '');
};

export const generateSeedDreamImage = async (
  apiKey: string,
  prompt: string,
  aspectRatio: string = '1:1',
  baseUrl?: string
): Promise<string> => {
  const url = `${resolveBaseUrl(baseUrl)}/v1/images/generate`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ prompt, aspect_ratio: aspectRatio }),
  });

  if (!response.ok) {
    let message = `Seed Dream error ${response.status}`;
    try {
      const err = await response.json();
      message = err.error || err.message || message;
    } catch (e) {}
    throw new Error(message);
  }

  const data = await response.json();
  if (data?.image?.startsWith('data:')) return data.image;
  if (data?.image) return `data:image/png;base64,${data.image}`;
  throw new Error('Seed Dream: no image returned');
};

export const remixSeedDreamImage = async (
  apiKey: string,
  prompt: string,
  imageBase64: string,
  aspectRatio: string = '1:1',
  baseUrl?: string
): Promise<string> => {
  const url = `${resolveBaseUrl(baseUrl)}/v1/images/remix`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ prompt, image: imageBase64, aspect_ratio: aspectRatio }),
  });

  if (!response.ok) {
    let message = `Seed Dream remix error ${response.status}`;
    try {
      const err = await response.json();
      message = err.error || err.message || message;
    } catch (e) {}
    throw new Error(message);
  }

  const data = await response.json();
  if (data?.image?.startsWith('data:')) return data.image;
  if (data?.image) return `data:image/png;base64,${data.image}`;
  throw new Error('Seed Dream remix: no image returned');
};
