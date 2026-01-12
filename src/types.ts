
export enum Page {
  TEXT_TO_IMAGE = 'Text-to-Image',
  REMIX_IMAGE = 'Remix Image',
  REMOVE_BACKGROUND = 'Remove Background',
  GENERATE_VIDEO = 'Image-to-Video',
  QUEUE = 'Queue',
  SETTINGS = 'Settings',
}

export enum JobStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum JobType {
  TEXT_TO_IMAGE = 'text-to-image',
  REMIX_IMAGE = 'remix-image',
  REMOVE_BACKGROUND = 'remove-background',
  GENERATE_VIDEO = 'generate-video',
}

export interface Job {
  id: string;
  type: JobType;
  status: JobStatus;
  payload: {
    prompt?: string;
    imageData?: string; // base64
    originalFilename?: string;
    aspectRatio?: string;
    highQuality?: boolean;
    imageSize?: string;
    resolution?: string; // '720p' | '1080p'
  };
  result?: string | null; // base64 image data URL or Blob URL for video
  error?: string | null;
  createdAt: number;
}

export interface ApiKeys {
  gemini: string;
  photoRoom: string;
}
