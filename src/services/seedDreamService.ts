// Seed Dream 4.5 image generation service (via server proxy to avoid CORS)
// Default base URL now handled server-side; client always calls the proxy.


export const generateSeedDreamImage = async (
  apiKey: string,
  prompt: string,
  aspectRatio: string = '1:1',
  baseUrl?: string
): Promise<string> => {

  const response = await fetch('/api/seed-dream-generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, aspectRatio, apiKey, baseUrl }),
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
  if (data?.result) return data.result;
  if (data?.job) throw new Error('Seed Dream job created but no immediate image returned; async flow not implemented');
  throw new Error('Seed Dream: no image returned');
};

// Currently unsupported without official remix endpoint; surface clear error
export const remixSeedDreamImage = async (): Promise<string> => {
  throw new Error('Seed Dream remix is not supported by the current integration');
};
