
import React, { useState } from 'react';
import { useJobQueue } from '../context/JobQueueContext';
import { Job, JobStatus, JobType } from '../types';
import Spinner from '../components/ui/Spinner';
import Button from '../components/ui/Button';
import JSZip from 'jszip';

const statusStyles: { [key in JobStatus]: { bg: string, text: string, border: string } } = {
  [JobStatus.PENDING]: { bg: 'bg-gray-700', text: 'text-gray-300', border: 'border-gray-600' },
  [JobStatus.IN_PROGRESS]: { bg: 'bg-yellow-900/50', text: 'text-yellow-300', border: 'border-yellow-700' },
  [JobStatus.COMPLETED]: { bg: 'bg-green-900/50', text: 'text-green-300', border: 'border-green-700' },
  [JobStatus.FAILED]: { bg: 'bg-red-900/50', text: 'text-red-300', border: 'border-red-700' },
};

const JobCard: React.FC<{ 
    job: Job;
    isSelected: boolean;
    onSelect: (jobId: string) => void;
    onPreview: (imageUrl: string) => void;
}> = ({ job, isSelected, onSelect, onPreview }) => {
  const style = statusStyles[job.status];

  const getJobTitle = () => {
    switch(job.type) {
      case JobType.TEXT_TO_IMAGE:
        return `Text-to-Image: "${job.payload.prompt?.substring(0, 30)}..."`;
      case JobType.REMIX_IMAGE:
        return `Remix: ${job.payload.originalFilename}`;
      case JobType.REMOVE_BACKGROUND:
        return `Remove Background: ${job.payload.originalFilename}`;
      case JobType.GENERATE_VIDEO:
        return `Video: "${job.payload.prompt?.substring(0, 30) || 'Image to Video'}..."`;
      default:
        return 'Unknown Job';
    }
  }

  const renderMedia = () => {
      if (job.status !== 'completed' || !job.result) {
          return (
            <div className={`w-32 h-32 bg-gray-700 rounded-md flex items-center justify-center ${job.status === 'completed' ? 'ml-8' : ''}`}>
                {job.status === 'in-progress' && <Spinner />}
                {job.status === 'pending' && <span className="text-gray-400 text-sm">Waiting...</span>}
                {job.status === 'failed' && <span className="text-red-400 text-2xl font-bold">!</span>}
            </div>
          );
      }

      if (job.type === JobType.GENERATE_VIDEO) {
          return (
             <video 
                src={job.result} 
                className="w-48 h-32 object-cover rounded-md bg-black cursor-pointer hover:opacity-80 transition-opacity" 
                controls
             />
          );
      } else {
          return (
             <img 
                src={job.result} 
                alt="Generated result" 
                className="w-32 h-32 object-cover rounded-md bg-gray-700 cursor-pointer hover:opacity-80 transition-opacity" 
                onClick={() => onPreview(job.result!)} 
             />
          );
      }
  };

  return (
    <div className={`p-4 rounded-lg border ${style.border} ${style.bg} flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-4`}>
        <div className="flex-shrink-0 w-auto flex items-center space-x-3">
            {job.status === 'completed' && job.result && (
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onSelect(job.id)}
                    className="h-5 w-5 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-600 focus:ring-offset-gray-800 self-center"
                />
            )}
            {renderMedia()}
        </div>
        <div className="flex-1 space-y-1">
            <p className="font-semibold text-white break-all">{getJobTitle()}</p>
            <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${style.bg} ${style.text} border ${style.border}`}>
                    {job.status}
                </span>
            </div>
            {job.status === 'failed' && <p className="text-red-400 text-sm break-all">{job.error}</p>}
            {(job.status === 'completed' && job.result) && (
                <a 
                    href={job.result} 
                    download={`result-${job.id}.${job.type === JobType.GENERATE_VIDEO ? 'mp4' : 'png'}`} 
                    className="text-blue-400 hover:underline text-sm"
                >
                    Download {job.type === JobType.GENERATE_VIDEO ? 'Video' : 'Image'}
                </a>
            )}
        </div>
    </div>
  )
};

const Queue: React.FC = () => {
  const { jobs, clearCompletedJobs, getJobStats } = useJobQueue();
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const stats = getJobStats();

  const sortedJobs = [...jobs].sort((a, b) => b.createdAt - a.createdAt);
  const completedJobs = sortedJobs.filter(j => j.status === JobStatus.COMPLETED && j.result);

  const toggleSelection = (jobId: string) => {
    setSelectedJobs(prev => {
        const newSet = new Set(prev);
        if (newSet.has(jobId)) {
            newSet.delete(jobId);
        } else {
            newSet.add(jobId);
        }
        return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedJobs.size === completedJobs.length && completedJobs.length > 0) {
        setSelectedJobs(new Set());
    } else {
        setSelectedJobs(new Set(completedJobs.map(j => j.id)));
    }
  };

  const handleDownloadSelected = async () => {
    if (selectedJobs.size === 0) return;
    setIsDownloading(true);

    const jobsToDownload = jobs.filter(j => selectedJobs.has(j.id));
    const zip = new JSZip();

    for (const job of jobsToDownload) {
        if (job.result) {
             if (job.type === JobType.GENERATE_VIDEO) {
                // Fetch blob for video
                try {
                    const response = await fetch(job.result);
                    const blob = await response.blob();
                    zip.file(`${job.type}-${job.id}.mp4`, blob);
                } catch (e) {
                    console.error("Failed to download video blob for zip", e);
                }
            } else {
                const base64Data = job.result.split(',')[1];
                zip.file(`${job.type}-${job.id}.png`, base64Data, { base64: true });
            }
        }
    }

    try {
        const content = await zip.generateAsync({ type: "blob" });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `NC-Tool-Export-${new Date().toISOString().slice(0,10)}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    } catch (error) {
        console.error("Failed to generate zip file", error);
    } finally {
        setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center space-x-4">
            <Button
                onClick={toggleSelectAll}
                variant="secondary"
                disabled={completedJobs.length === 0}
            >
                {selectedJobs.size === completedJobs.length && completedJobs.length > 0 ? 'Deselect All' : 'Select All Completed'}
            </Button>
            <Button
                onClick={handleDownloadSelected}
                disabled={selectedJobs.size === 0 || isDownloading}
                isLoading={isDownloading}
            >
                Download Selected ({selectedJobs.size})
            </Button>
        </div>
        <div className="flex items-center space-x-4">
            <div className="flex space-x-4 text-sm text-gray-400">
                <span>Pending: {stats.pending}</span>
                <span>In Progress: {stats.inProgress}</span>
                <span>Completed: {stats.completed}</span>
                <span>Failed: {stats.failed}</span>
            </div>
            <Button onClick={clearCompletedJobs} variant="secondary" disabled={jobs.length === 0}>
              Clear Finished
            </Button>
        </div>
      </div>

      {sortedJobs.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p>The job queue is empty.</p>
          <p>Create a new job from one of the tool pages.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedJobs.map((job) => (
            <JobCard 
                key={job.id} 
                job={job} 
                isSelected={selectedJobs.has(job.id)}
                onSelect={toggleSelection}
                onPreview={setPreviewImage}
            />
          ))}
        </div>
      )}

      {previewImage && (
        <div 
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 cursor-pointer" 
            onClick={() => setPreviewImage(null)}
            role="dialog"
            aria-modal="true"
        >
          <img 
            src={previewImage} 
            alt="Preview" 
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl cursor-default" 
            onClick={(e) => e.stopPropagation()} 
          />
          <button 
            className="absolute top-4 right-4 text-white text-4xl font-bold hover:text-gray-300 transition-colors"
            aria-label="Close preview"
            onClick={() => setPreviewImage(null)}
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
};

export default Queue;