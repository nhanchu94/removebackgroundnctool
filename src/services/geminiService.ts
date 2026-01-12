
import { GoogleGenAI } from "@google/genai";

const getMimeType = (base64Data: string): string | null => {
  const match = base64Data.match(/^data:(image\/[a-zA-Z]+);base64,/);
  return match ? match[1] : 'image/jpeg'; // Default if not found
}

const stripDataUrlPrefix = (base64Data: string): string => {
  return base64Data.substring(base64Data.indexOf(',') + 1);
}

export const generateTextToImage = async (apiKey: string, prompt: string, aspectRatio: string = '1:1', highQuality?: boolean, imageSize?: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey });

  const modelName = highQuality ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
  const imageConfig: { aspectRatio: string, imageSize?: string } = { aspectRatio };
  if (highQuality && imageSize) {
    imageConfig.imageSize = imageSize;
  }

  const response = await ai.models.generateContent({
    model: modelName,
    contents: {
      parts: [{ text: prompt }],
    },
    config: {
      imageConfig: imageConfig,
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    const data = part.inlineData?.data;
    if (data) {
      const base64EncodeString = data;
      return `data:image/png;base64,${base64EncodeString}`;
    }
  }

  throw new Error('No image was generated. The response may have been blocked.');
};

export const remixImage = async (apiKey: string, prompt: string, imageBase64: string, aspectRatio: string = '1:1', highQuality?: boolean, imageSize?: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey });

  const mimeType = getMimeType(imageBase64);
  const imageData = stripDataUrlPrefix(imageBase64);
  
  const modelName = highQuality ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
  const imageConfig: { aspectRatio: string, imageSize?: string } = { aspectRatio };
  if (highQuality && imageSize) {
    imageConfig.imageSize = imageSize;
  }

  const response = await ai.models.generateContent({
    model: modelName,
    contents: {
      parts: [
        {
          inlineData: {
            data: imageData,
            mimeType: mimeType || 'image/jpeg',
          },
        },
        { text: prompt },
      ],
    },
    config: {
      imageConfig: imageConfig,
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    const data = part.inlineData?.data;
    if (data) {
      const base64EncodeString = data;
      return `data:image/png;base64,${base64EncodeString}`;
    }
  }

  throw new Error('No image was generated for remix. The response may have been blocked.');
};

export const generateVideo = async (apiKey: string, prompt: string, imageBase64: string | undefined, aspectRatio: string = '16:9', resolution: string = '720p'): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey });

  const model = 'veo-3.1-fast-generate-preview';
  
  let operation;
  
  // Cast types to satisfy the strict typing expected by the SDK
  const config = {
    numberOfVideos: 1,
    resolution: resolution as '720p' | '1080p',
    aspectRatio: aspectRatio as '16:9' | '9:16',
  };

  if (imageBase64) {
     const mimeType = getMimeType(imageBase64) || 'image/png';
     const imageBytes = stripDataUrlPrefix(imageBase64);
     
     operation = await ai.models.generateVideos({
        model,
        prompt: prompt || undefined, 
        image: {
            imageBytes,
            mimeType,
        },
        config,
     });
  } else {
     operation = await ai.models.generateVideos({
        model,
        prompt: prompt,
        config,
     });
  }

  // Polling loop
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Polling every 5 seconds
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  if (operation.error) {
      // @ts-ignore
      throw new Error(`Video generation failed: ${operation.error.message || JSON.stringify(operation.error)}`);
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  
  if (!downloadLink) {
      throw new Error('Video generation completed but no download link was found.');
  }

  // Fetch the actual video bytes using the API Key
  const videoResponse = await fetch(`${downloadLink}&key=${apiKey}`);
  
  if (!videoResponse.ok) {
      throw new Error('Failed to download the generated video.');
  }

  const blob = await videoResponse.blob();
  return URL.createObjectURL(blob);
};