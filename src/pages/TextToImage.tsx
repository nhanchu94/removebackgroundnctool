
import React, { useState } from 'react';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useJobQueue } from '../context/JobQueueContext';
import { JobType, Page } from '../types';
import { useApiKeys } from '../context/ApiKeyContext';
import JobProgress from '../components/JobProgress';
import Toggle from '../components/ui/Toggle';
import Select from '../components/ui/Select';

interface PromptEntry {
  id: number;
  prompt: string;
  count: number;
}

const aspectRatios = ['1:1', '16:9', '3:2', '4:3', '3:4', '2:3', '4:5', '9:16'];
const imageSizes = ['1K', '2K', '4K'];
const modelOptions = [
  { value: 'gemini', label: 'Gemini Image (mặc định)' },
  { value: 'seed-dream-4.5', label: 'Seed Dream 4.5' },
];

const TextToImage: React.FC<{ setCurrentPage: (page: Page) => void }> = ({ setCurrentPage }) => {
  const [prompts, setPrompts] = useState<PromptEntry[]>([{ id: 1, prompt: '', count: 1 }]);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [highQuality, setHighQuality] = useState(false);
  const [imageSize, setImageSize] = useState('1K');
  const [model, setModel] = useState('gemini');
  const { addJobs, jobs } = useJobQueue();
  const { isGeminiKeySet, isSeedDreamKeySet } = useApiKeys();
  const [isLoading, setIsLoading] = useState(false);

  const textToImageJobs = jobs.filter(job => job.type === JobType.TEXT_TO_IMAGE);

  const updatePrompt = (id: number, field: 'prompt' | 'count', value: string | number) => {
    setPrompts(
      prompts.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const addPromptField = () => {
    setPrompts([...prompts, { id: Date.now(), prompt: '', count: 1 }]);
  };

  const removePromptField = (id: number) => {
    setPrompts(prompts.filter((p) => p.id !== id));
  };
  
  const handleGenerate = async () => {
    setIsLoading(true);
    
    if (model === 'gemini' && highQuality) {
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

    const jobsToCreate = prompts.flatMap(p => {
        if (!p.prompt.trim() || p.count <= 0) return [];
        return Array.from({ length: p.count }, () => ({
            type: JobType.TEXT_TO_IMAGE,
            payload: { 
                prompt: p.prompt.trim(),
                aspectRatio: aspectRatio,
            highQuality: model === 'gemini' ? highQuality : undefined,
            imageSize: model === 'gemini' && highQuality ? imageSize : undefined,
            model,
            }
        }));
    });

    if (jobsToCreate.length > 0) {
        addJobs(jobsToCreate);
        setCurrentPage(Page.QUEUE);
    }
    setIsLoading(false);
  };
  
  const missingKey = model === 'seed-dream-4.5' ? !isSeedDreamKeySet : !isGeminiKeySet;
  const isGenerateDisabled = prompts.every(p => !p.prompt.trim() || p.count <= 0) || missingKey || isLoading;

  return (
    <div>
      <Card>
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-white">Text-to-Image Generator</h2>
          
          <div className="space-y-4">
              {prompts.map((p, index) => (
                  <div key={p.id} className="flex items-start space-x-2 p-3 bg-gray-900/50 rounded-md">
                      <div className="flex-grow">
                          <Input 
                              placeholder={`Enter prompt #${index + 1}`}
                              value={p.prompt}
                              onChange={(e) => updatePrompt(p.id, 'prompt', e.target.value)}
                          />
                      </div>
                      <div className="w-24">
                          <Input 
                              type="number"
                              min="1"
                              max="10"
                              placeholder="Count"
                              value={p.count}
                              onChange={(e) => updatePrompt(p.id, 'count', Math.max(1, parseInt(e.target.value, 10) || 1))}
                          />
                      </div>
                      <Button variant="secondary" onClick={() => removePromptField(p.id)} disabled={prompts.length <= 1} className="h-10">
                          &times;
                      </Button>
                  </div>
              ))}
          </div>

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
          
          <div className="flex items-center justify-between">
              <Button variant="secondary" onClick={addPromptField}>
                  Add Prompt
              </Button>
              <div className="flex items-end space-x-4">
                  {!isGeminiKeySet && <p className="text-yellow-400 text-sm self-center">Gemini API key is required.</p>}
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
                    <div className="w-48">
                      <Select
                        id="model-select"
                        label="Model"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                      >
                        {modelOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </Select>
                    </div>
                  <Button onClick={handleGenerate} disabled={isGenerateDisabled} isLoading={isLoading}>
                      Generate Images
                  </Button>
              </div>
          </div>
        </div>
      </Card>
      <JobProgress title="Text-to-Image Progress" jobs={textToImageJobs} />
    </div>
  );
};

export default TextToImage;