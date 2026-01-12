
import React, { useState } from 'react';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useJobQueue } from '../context/JobQueueContext';
import { JobType, Page } from '../types';
import Select from '../components/ui/Select';
import { fileToBase64 } from '../util/fileUtils';

const aspectRatios = ['16:9', '9:16'];
const resolutions = ['720p', '1080p'];

const TextToVideo: React.FC<{ setCurrentPage: (page: Page) => void }> = ({ setCurrentPage }) => {
  const [prompt, setPrompt] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [resolution, setResolution] = useState('720p');
  const { addJobs } = useJobQueue();
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
    } else {
        setFile(null);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && !file) return;
    setIsLoading(true);

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

    let imageData: string | undefined = undefined;
    if (file) {
        try {
            imageData = await fileToBase64(file);
        } catch (e) {
            console.error("Failed to read file", e);
            alert("Failed to read image file.");
            setIsLoading(false);
            return;
        }
    }

    addJobs([{
        type: JobType.GENERATE_VIDEO,
        payload: {
            prompt: prompt.trim(),
            imageData,
            aspectRatio,
            resolution,
            originalFilename: file?.name || 'video-generation'
        }
    }]);

    setCurrentPage(Page.QUEUE);
    setIsLoading(false);
  };

  const isGenerateDisabled = (!prompt.trim() && !file) || isLoading;

  return (
    <Card>
      <div className="space-y-6">Text
        <h2 className="text-xl font-semibold text-white">Image-to-Video (Veo)</h2>
        <p className="text-gray-400">
            Generate high-quality videos using Google's Veo 3 model. You can provide a text prompt, or an image to animate.
        </p>
        
        <Input
            label="Image (Optional)"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />

        {file && (
             <div className="text-sm text-gray-300">
                Selected: {file.name}
            </div>
        )}

        <Input 
            label="Prompt"
            placeholder="Describe the video you want to generate..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
        />
        
        <div className="flex items-end space-x-4">
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
            <div className="w-32">
                <Select
                    id="resolution-select"
                    label="Resolution"
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                >
                    {resolutions.map(res => (
                    <option key={res} value={res}>{res}</option>
                    ))}
                </Select>
            </div>
             <div className="flex-grow"></div>
            <div className="flex flex-col items-end">
                 <p className="text-xs text-gray-400 mb-2">Requires a paid Google Cloud API key.</p>
                <Button onClick={handleGenerate} disabled={isGenerateDisabled} isLoading={isLoading}>
                    Generate Video
                </Button>
            </div>
        </div>
      </div>
    </Card>
  );
};

export default TextToVideo;