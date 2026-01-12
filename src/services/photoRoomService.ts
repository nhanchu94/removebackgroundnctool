
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
  // THỬ NGHIỆM: Gọi qua Vercel Serverless Function Proxy trước (Giải pháp tối ưu cho Vercel)
  try {
    const vercelProxyResponse = await fetch('/api/remove-bg', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, apiKey })
    });

    if (vercelProxyResponse.ok) {
      const data = await vercelProxyResponse.json();
      return data.result;
    }
    
    // Nếu status là 404, nghĩa là không chạy trên Vercel, chúng ta sẽ tiếp tục logic fallback.
    if (vercelProxyResponse.status !== 404) {
       const errorData = await vercelProxyResponse.json();
       throw new Error(errorData.error || 'Vercel Proxy error');
    }
  } catch (e: any) {
    if (e.message !== 'Vercel Proxy error' && !e.message.includes('404')) {
        throw e;
    }
  }

  // FALLBACK: Gọi trực tiếp (chỉ hoạt động nếu có extension "Allow CORS" hoặc chạy ở môi trường không chặn)
  const PHOTOROOM_API_ENDPOINT = 'https://sdk.photoroom.com/v1/edit';

  const imageBlob = base64ToBlob(imageBase64);
  const formData = new FormData();
  formData.append('image_file', imageBlob);

  try {
    const response = await fetch(PHOTOROOM_API_ENDPOINT, {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey },
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = `API Error: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorMessage;
      } catch (e) {}
      throw new Error(errorMessage);
    }

    const resultBlob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(resultBlob);
    });

  } catch (error: any) {
    if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
        throw new Error('LỖI BẢO MẬT (CORS): Trình duyệt chặn yêu cầu. Hãy Deploy lên Vercel để sử dụng Auto-Proxy hoặc cài extension "Allow CORS".');
    }
    throw error;
  }
};
