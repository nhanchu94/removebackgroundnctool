
import { fileToBase64 } from '../util/fileUtils';

// Helper function to convert a base64 data URL to a Blob
const base64ToBlob = (dataUrl: string): Blob => {
  const parts = dataUrl.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], { type: contentType });
};

export const removeBackground = async (apiKey: string, imageBase64: string): Promise<string> => {
  
  // Convert base64 straight to blob without compression
  const blob = base64ToBlob(imageBase64);
  const formData = new FormData();
  formData.append('image_file', blob);

  // Use Vercel Rewrite Proxy (Edge Network) to bypass 4.5MB Serverless Function Body Limit
  // The rewrite in next.config.ts maps /api/proxy-remove-bg -> https://sdk.photoroom.com/v1/segment
  // This happens at the edge, before any serverless function limitation kicks in.
  const response = await fetch('/api/proxy-remove-bg', {
    method: 'POST',
    headers: {
      'X-Api-Key': apiKey, // Send Key directly (Proxy forwards it)
    },
    body: formData, // Send as Multipart FormData
  });

  if (!response.ok) {
    let message = `PhotoRoom error (${response.status})`;
    try {
      const errorData = await response.json();
      message = errorData.detail || errorData.message || message;
    } catch (e) {
      // ignore parse error
    }
    throw new Error(message);
  }

  // PhotoRoom returns the raw binary image
  const responseBlob = await response.blob();
  
  // Convert response blob back to Base64 to display
  return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(responseBlob);
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
  });
};
