"use client";

import { useState, useCallback } from 'react';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useJobQueue } from '../../context/JobQueueContext';
import { JobType, Page } from '../../types';
import { useApiKeys } from '../../context/ApiKeyContext';
import { fileToBase64 } from '../../util/fileUtils';
import JobProgress from '../../components/JobProgress';
import Toggle from '../../components/ui/Toggle';
import Select from '../../components/ui/Select';

const aspectRatios = ['1:1', '16:9', '3:2', '4:3', '3:4', '2:3', '4:5', '9:16'];
const imageSizes = ['1K', '2K', '4K'];

export default function RemixImagePage() {
  const [prompt, setPrompt] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [remixCount, setRemixCount] = useState<number>(1);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [highQuality, setHighQuality] = useState(false);
  const [imageSize, setImageSize] = useState('1K');
  const { addJobs, jobs } = useJobQueue();
  const { isGeminiKeySet } = useApiKeys();
  const [isLoading, setIsLoading] = useState(false);

  const remixJobs = jobs.filter(job => job.type === JobType.REMIX_IMAGE);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFiles(Array.from(event.target.files));
    }
  };
  
  const handleRemix = useCallback(async () => {
    if (files.length === 0 || !prompt.trim() || remixCount <= 0) return;

    setIsLoading(true);

    if (highQuality) {
        try {
            // @ts-ignore
            const hasKey = await window.aistudio.hasSelectedApiKey();
            if (!hasKey) {
                // @ts-ignore
                await window.aistudio.openSelectKey();
            }
        } catch (e) {
            console.error("API Key selection failed", e);
            alert("Could not verify the required API key. Please ensure you have selected a key from a paid GCP project and try again.");
            setIsLoading(false);
            return;
        }
    }

    try {
        const jobsToCreate = [];
        for (const file of files) {
          const imageData = await fileToBase64(file);
          const jobsForFile = Array.from({ length: remixCount }, () => ({
            type: JobType.REMIX_IMAGE,
            payload: {
              prompt: prompt.trim(),
              imageData,
              originalFilename: file.name,
              aspectRatio,
              highQuality,
              imageSize: highQuality ? imageSize : undefined,
            },
          }));
          jobsToCreate.push(...jobsForFile);
        }

        if (jobsToCreate.length > 0) {
            addJobs(jobsToCreate);
            // Chuyển hướng sang trang queue nếu cần
            // router.push('/queue');
        }
    } catch (error) {
        console.error("Error creating remix jobs:", error);
    } finally {
        setIsLoading(false);
    }
  }, [files, prompt, remixCount, aspectRatio, highQuality, imageSize, addJobs]);

  const isRemixDisabled = files.length === 0 || !prompt.trim() || !isGeminiKeySet || isLoading || remixCount <= 0;

  return (
    <div>
      <Card>
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-white">Image Remix</h2>
          <p className="text-gray-400">Upload one or more images and provide a prompt to remix them.</p>

          <Input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />

          {files.length > 0 && (
              <div className="text-sm text-gray-300">
                  Selected {files.length} file(s): {files.map(f => f.name).join(', ')}
              </div>
          )}

          <Input 
              placeholder="Enter a prompt to apply to the images..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
          />

          <div className="pt-4 border-t border-gray-700/50 flex items-start space-x-6">
              <div className="w-48">
                <Toggle enabled={highQuality} setEnabled={setHighQuality} label="High Quality Mode" />
              </div>
              {highQuality && (
                <div className="w-32">
                  <Select label="Image Size" value={imageSize} onChange={(e) => setImageSize(e.target.value)}>
                    {imageSizes.map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </Select>
                </div>
              )}
              {highQuality && (
                <p className="text-xs text-gray-400 flex-1 pt-7">
                  Uses a more powerful model. This requires a paid Google Cloud project API key, which will be requested in a popup. 
                  <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline ml-1">Learn more</a>.
                </p>
              )}
          </div>
          
          <div className="flex items-end justify-end space-x-4">
              {!isGeminiKeySet && <p className="text-yellow-400 text-sm self-center">Gemini API key is required.</p>}
              <div className="w-28">
                <Input
                  label="Count per image"
                  id="remix-count"
                  type="number"
                  min="1"
                  max="10"
                  value={remixCount}
                  onChange={(e) => setRemixCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                />
              </div>
               <div className="w-32">
                 <Select
                    id="aspect-ratio-select"
                    label="Aspect Ratio"
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                >
                    {aspectRatios.map(ratio => (
                    <option key={ratio} value={ratio}>{ratio}</option>
                    ))}
                </Select>
              </div>
              <Button onClick={handleRemix} disabled={isRemixDisabled} isLoading={isLoading}>
                  Remix Images
              </Button>
          </div>
        </div>
      </Card>
      <JobProgress title="Image Remix Progress" jobs={remixJobs} />
    </div>
  );
}
