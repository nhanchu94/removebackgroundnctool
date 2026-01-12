
import React from 'react';
import { Job, JobStatus, JobType } from '../types';
import Card from './ui/Card';
import Spinner from './ui/Spinner';

const statusStyles: { [key in JobStatus]: { text: string, border: string } } = {
  [JobStatus.PENDING]: { text: 'text-gray-300', border: 'border-gray-600' },
  [JobStatus.IN_PROGRESS]: { text: 'text-yellow-300', border: 'border-yellow-700' },
  [JobStatus.COMPLETED]: { text: 'text-green-300', border: 'border-green-700' },
  [JobStatus.FAILED]: { text: 'text-red-300', border: 'border-red-700' },
};

const JobProgressItem: React.FC<{ job: Job }> = ({ job }) => {
    const style = statusStyles[job.status];

    const getJobDescription = () => {
        switch(job.type) {
          case JobType.TEXT_TO_IMAGE:
            return `"${job.payload.prompt?.substring(0, 40)}..."`;
          case JobType.REMIX_IMAGE:
            return `Remixing ${job.payload.originalFilename}`;
          case JobType.REMOVE_BACKGROUND:
            return `Removing background: ${job.payload.originalFilename}`;
          case JobType.GENERATE_VIDEO:
            return `Generating Video: ${job.payload.originalFilename || job.payload.prompt?.substring(0, 20)}`;
          default:
            return 'Processing...';
        }
    }

    return (
        <div className="flex items-center space-x-4 p-3 bg-gray-900/50 rounded-md">
            <div className="flex-shrink-0 w-12 h-12 bg-gray-700 rounded-md flex items-center justify-center">
                {job.status === JobStatus.COMPLETED && job.result ? (
                    job.type === JobType.GENERATE_VIDEO ? (
                        <span className="text-2xl">🎥</span>
                    ) : (
                        <img src={job.result} alt="result" className="w-full h-full object-cover rounded-md" />
                    )
                ) : job.status === JobStatus.IN_PROGRESS ? (
                    <Spinner className="w-6 h-6" />
                ) : job.status === JobStatus.PENDING ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                ) : (
                    <span className="text-red-400 text-2xl font-bold">!</span>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{getJobDescription()}</p>
            </div>
            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${style.border} ${style.text} capitalize`}>
                {job.status}
            </span>
        </div>
    );
};


interface JobProgressProps {
  title: string;
  jobs: Job[];
}

const JobProgress: React.FC<JobProgressProps> = ({ title, jobs }) => {
  const sortedJobs = [...jobs].sort((a, b) => b.createdAt - a.createdAt);

  if (sortedJobs.length === 0) {
    return null;
  }

  return (
    <Card className="mt-8">
      <h3 className="text-xl font-semibold text-white mb-4">{title}</h3>
      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
        {sortedJobs.map(job => <JobProgressItem key={job.id} job={job} />)}
      </div>
    </Card>
  );
};

export default JobProgress;