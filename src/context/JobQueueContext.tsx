
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback, useRef } from 'react';
import { Job, JobStatus, JobType } from '../types';
import { useApiKeys } from './ApiKeyContext';
import { generateTextToImage, remixImage, generateVideo } from '../services/geminiService';
import { generateSeedDreamImage, remixSeedDreamImage } from '../services/seedDreamService';
import { removeBackground } from '../services/photoRoomService';

interface JobQueueContextType {
  jobs: Job[];
  addJob: (type: JobType, payload: Job['payload']) => void;
  addJobs: (jobs: { type: JobType; payload: Job['payload'] }[]) => void;
  clearCompletedJobs: () => void;
  getJobStats: () => { pending: number; inProgress: number; completed: number; failed: number };
}

const JobQueueContext = createContext<JobQueueContextType | undefined>(undefined);

// Limit concurrency to reduce 429 rate-limit responses from Gemini API
const MAX_CONCURRENT_JOBS = 1;
const MAX_RETRIES = 10;
const BASE_BACKOFF_MS = 5000; // 5s base delay to avoid hammering Gemini
const MAX_BACKOFF_MS = 60000; // cap backoff at 60s

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const isRateLimitError = (error: any): boolean => {
  const msg = error?.message?.toLowerCase() || '';
  return (
    msg.includes('429') || 
    msg.includes('resource has been exhausted') || 
    msg.includes('quota') || 
    msg.includes('too many requests') ||
    msg.includes('503') || 
    msg.includes('overloaded')
  );
};

export const JobQueueProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const { apiKeys } = useApiKeys();
  
  const processingRef = useRef<Set<string>>(new Set());
  const geminiApiKeyIndex = useRef(0);

  const processJob = useCallback(async (job: Job) => {
      if (processingRef.current.has(job.id)) return;
      processingRef.current.add(job.id);

      setJobs(prev => prev.map(j => (j.id === job.id ? { ...j, status: JobStatus.IN_PROGRESS } : j)));

      let attempt = 0;
      let success = false;
      let result: string | null = null;
      let finalError: string | null = null;

      while (attempt < MAX_RETRIES && !success) {
        try {
          if (job.type === JobType.TEXT_TO_IMAGE && job.payload.prompt) {
            const model = job.payload.model || 'gemini';
            if (model === 'seed-dream-4.5') {
              if (!apiKeys.seedDream) throw new Error('Seed Dream API key is missing.');
              result = await generateSeedDreamImage(apiKeys.seedDream, job.payload.prompt, job.payload.aspectRatio, apiKeys.seedDreamBaseUrl);
            } else {
              const geminiKeys = apiKeys.gemini.split('\n').map(k => k.trim()).filter(Boolean);
              if (geminiKeys.length === 0) throw new Error('Gemini API key is missing.');
              const selectedKey = geminiKeys[geminiApiKeyIndex.current];
              geminiApiKeyIndex.current = (geminiApiKeyIndex.current + 1) % geminiKeys.length;
              result = await generateTextToImage(selectedKey, job.payload.prompt, job.payload.aspectRatio, job.payload.highQuality, job.payload.imageSize);
            }

          } else if (job.type === JobType.REMIX_IMAGE && job.payload.prompt && job.payload.imageData) {
            const model = job.payload.model || 'gemini';
            if (model === 'seed-dream-4.5') {
              if (!apiKeys.seedDream) throw new Error('Seed Dream API key is missing.');
              result = await remixSeedDreamImage(apiKeys.seedDream, job.payload.prompt, job.payload.imageData, job.payload.aspectRatio, apiKeys.seedDreamBaseUrl);
            } else {
              const geminiKeys = apiKeys.gemini.split('\n').map(k => k.trim()).filter(Boolean);
              if (geminiKeys.length === 0) throw new Error('Gemini API key is missing.');
              const selectedKey = geminiKeys[geminiApiKeyIndex.current];
              geminiApiKeyIndex.current = (geminiApiKeyIndex.current + 1) % geminiKeys.length;
              result = await remixImage(selectedKey, job.payload.prompt, job.payload.imageData, job.payload.aspectRatio, job.payload.highQuality, job.payload.imageSize);
            }

          } else if (job.type === JobType.REMOVE_BACKGROUND && job.payload.imageData) {
            if (!apiKeys.photoRoom) throw new Error('PhotoRoom API key is missing.');
            // No longer passing corsProxy
            result = await removeBackground(apiKeys.photoRoom, job.payload.imageData);
            
          } else if (job.type === JobType.GENERATE_VIDEO) {
             const geminiKeys = apiKeys.gemini.split('\n').map(k => k.trim()).filter(Boolean);
             let selectedKey = process.env.API_KEY;
             if (!selectedKey) {
                 if (geminiKeys.length === 0) throw new Error('Gemini API key is missing.');
                 selectedKey = geminiKeys[0];
             }
             result = await generateVideo(selectedKey, job.payload.prompt || '', job.payload.imageData, job.payload.aspectRatio, job.payload.resolution);
          } else {
              throw new Error('Invalid job type or payload');
          }
          
          success = true;

        } catch (error: any) {
          finalError = error.message;
          if (isRateLimitError(error)) {
             attempt++;
             const keyCount = apiKeys.gemini.split('\n').filter(Boolean).length;
             if (keyCount > 1) {
                geminiApiKeyIndex.current = (geminiApiKeyIndex.current + 1) % keyCount;
             }
             const delay = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * Math.pow(2, attempt)) + (Math.random() * 2000);
             await wait(delay);
          } else {
             break;
          }
        }
      }

      processingRef.current.delete(job.id);

      if (success && result) {
        setJobs(prev => prev.map(j => (j.id === job.id ? { ...j, status: JobStatus.COMPLETED, result, error: null } : j)));
      } else {
        setJobs(prev => prev.map(j => (j.id === job.id ? { ...j, status: JobStatus.FAILED, error: finalError || 'Unknown error' } : j)));
      }

  }, [apiKeys]);


  useEffect(() => {
    const runningJobsCount = jobs.filter(j => j.status === JobStatus.IN_PROGRESS).length;
    const pendingJobs = jobs.filter(j => j.status === JobStatus.PENDING);

    if (runningJobsCount < MAX_CONCURRENT_JOBS && pendingJobs.length > 0) {
      const jobsToStartCount = MAX_CONCURRENT_JOBS - runningJobsCount;
      const jobsToStart = pendingJobs.slice(0, jobsToStartCount);
      
      jobsToStart.forEach((job, index) => {
          setTimeout(() => {
              processJob(job);
          }, index * 300); 
      });
    }
  }, [jobs, processJob]);

  const addJobs = (newJobs: { type: JobType; payload: Job['payload'] }[]) => {
    const jobsToAdd: Job[] = newJobs.map(j => ({
        id: `job-${Date.now()}-${Math.random()}`,
        type: j.type,
        status: JobStatus.PENDING,
        payload: j.payload,
        createdAt: Date.now()
    }));
    setJobs(prev => [...prev, ...jobsToAdd]);
  };

  const addJob = (type: JobType, payload: Job['payload']) => {
    addJobs([{type, payload}]);
  };

  const clearCompletedJobs = () => {
    setJobs(prev => prev.filter(j => j.status !== JobStatus.COMPLETED && j.status !== JobStatus.FAILED));
  };
  
  const getJobStats = () => {
    return jobs.reduce((acc, job) => {
        if(job.status === JobStatus.PENDING) acc.pending++;
        if(job.status === JobStatus.IN_PROGRESS) acc.inProgress++;
        if(job.status === JobStatus.COMPLETED) acc.completed++;
        if(job.status === JobStatus.FAILED) acc.failed++;
        return acc;
    }, { pending: 0, inProgress: 0, completed: 0, failed: 0});
  };

  return (
    <JobQueueContext.Provider value={{ jobs, addJob, addJobs, clearCompletedJobs, getJobStats }}>
      {children}
    </JobQueueContext.Provider>
  );
};

export const useJobQueue = () => {
  const context = useContext(JobQueueContext);
  if (context === undefined) {
    throw new Error('useJobQueue must be used within a JobQueueProvider');
  }
  return context;
};
